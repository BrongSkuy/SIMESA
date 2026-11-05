import { db } from "./index";
import * as schema from "./schema";
import { eq, and, isNull } from "drizzle-orm";
import Database from "better-sqlite3";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

const PERIODE = "2025/2026-Genap";

// Deterministic pseudo-random number generator for consistent repeatable demo data
function createPseudoRandom(seedStr: string) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  return function () {
    hash = (hash * 9301 + 49297) % 233280;
    return Math.abs(hash / 233280);
  };
}

async function enrich() {
  console.log("🚀 Starting database synchronization & enrichment for per-subject transcript...\n");

  // 1. Fetch current data from active DB
  const [students, classes, subjects, criteria] = await Promise.all([
    db.select().from(schema.students).all(),
    db.select().from(schema.classes).all(),
    db.select().from(schema.subjects).all(),
    db.select().from(schema.spkCriteria).all(),
  ]);

  console.log(`Found: ${students.length} students, ${classes.length} classes, ${subjects.length} subjects, ${criteria.length} criteria.`);

  const academicCrit = criteria.find(
    (c) => c.tipe === "Manual" && c.namaKriteria.toLowerCase().includes("akademik")
  );
  if (!academicCrit) {
    throw new Error("Kriteria Nilai Akademik not found!");
  }

  const nonAcademicManualCrit = criteria.filter(
    (c) => c.tipe === "Manual" && !c.namaKriteria.toLowerCase().includes("akademik")
  );

  // 2. Setup spkGradingCategories for all classes & their curriculum subjects
  console.log("\n📦 Setting up spk_grading_categories for all curriculum subjects...");
  const currentCategories = await db.select().from(schema.spkGradingCategories).all();

  for (const cls of classes) {
    const classSubjects = subjects.filter((s) => {
      const assigned = (s.kelasDiampu || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      return assigned.includes(cls.namaKelas);
    });

    for (const subj of classSubjects) {
      const exists = currentCategories.some(
        (c) =>
          c.kelas === cls.namaKelas &&
          c.criteriaId === academicCrit.id &&
          c.mapel === subj.namaMapel &&
          c.periode === PERIODE
      );

      if (!exists) {
        await db.insert(schema.spkGradingCategories).values({
          kelas: cls.namaKelas,
          criteriaId: academicCrit.id,
          mapel: subj.namaMapel,
          categories: JSON.stringify(["Tugas", "UTS", "UAS"]),
          periode: PERIODE,
        });
        console.log(`   ✅ Category created: ${cls.namaKelas} - ${subj.namaMapel} (Tugas, UTS, UAS)`);
      }
    }
  }

  // 3. School days for attendance (last 10 weekdays)
  const today = new Date();
  const schoolDays: string[] = [];
  const curDate = new Date(today.getTime());
  while (schoolDays.length < 10) {
    curDate.setDate(curDate.getDate() - 1);
    const day = curDate.getDay();
    if (day !== 0 && day !== 6) {
      schoolDays.push(curDate.toISOString().split("T")[0]);
    }
  }
  schoolDays.sort();

  // 4. Fetch existing scores & attendance to avoid duplicates
  const existingScores = await db
    .select()
    .from(schema.spkScores)
    .where(eq(schema.spkScores.periode, PERIODE))
    .all();

  const existingAttendance = await db
    .select()
    .from(schema.attendance)
    .where(eq(schema.attendance.periode, PERIODE))
    .all();

  // Map existing scores: `${studentId}:${criteriaId}:${mapel || "Umum"}`
  const scoreMap = new Map<string, typeof existingScores[0]>();
  existingScores.forEach((s) => {
    scoreMap.set(`${s.studentId}:${s.criteriaId}:${s.mapel || "Umum"}`, s);
  });

  // Map existing attendance: `${studentId}:${mapel || "Umum"}:${tanggal}`
  const attMap = new Set<string>();
  existingAttendance.forEach((a) => {
    attMap.add(`${a.studentId}:${a.mapel || "Umum"}:${a.tanggal}`);
  });

  // 5. Update existing mapel: null rows to mapel: "Umum" with valid JSON details
  console.log("\n🔄 Normalizing existing general scores (mapel: null -> mapel: 'Umum')...");
  for (const s of existingScores) {
    if (!s.mapel) {
      let details = s.details;
      if (!details) {
        details = JSON.stringify({ Nilai: s.nilai });
      }
      await db
        .update(schema.spkScores)
        .set({ mapel: "Umum", details })
        .where(eq(schema.spkScores.id, s.id));
    }
  }

  // 6. Enrich per student: Per-subject scores & attendance
  console.log("\n🎯 Generating realistic per-subject scores & attendance for all students...");

  for (const student of students) {
    const rng = createPseudoRandom(student.nis + PERIODE);

    const classSubjects = subjects.filter((s) => {
      const assigned = (s.kelasDiampu || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      return assigned.includes(student.kelas);
    });

    // Base performance level for this student
    const baseRankFactor = (parseInt(student.nis.slice(-2), 10) || 5) % 15;
    const studentBase = 88 - (baseRankFactor * 1.2); // Range ~70 to 88

    // A. Attendance for each curriculum subject
    for (const subj of classSubjects) {
      for (const tgl of schoolDays) {
        const attKey = `${student.id}:${subj.namaMapel}:${tgl}`;
        if (!attMap.has(attKey)) {
          const r = rng();
          const status = r < 0.82 ? "Hadir" : r < 0.89 ? "Izin" : r < 0.95 ? "Sakit" : "Alfa";
          await db.insert(schema.attendance).values({
            studentId: student.id,
            mapel: subj.namaMapel,
            tanggal: tgl,
            status,
            periode: PERIODE,
          });
          attMap.add(attKey);
        }
      }
    }

    // B. Scores for each curriculum subject
    for (const subj of classSubjects) {
      // 1. Academic Criteria with Tugas, UTS, UAS
      const acadKey = `${student.id}:${academicCrit.id}:${subj.namaMapel}`;
      if (!scoreMap.has(acadKey)) {
        const tugas = Math.min(99, Math.max(68, Math.round(studentBase + (rng() * 14 - 6))));
        const uts = Math.min(98, Math.max(65, Math.round(studentBase + (rng() * 12 - 6))));
        const uas = Math.min(100, Math.max(68, Math.round(studentBase + (rng() * 14 - 5))));
        const avg = Number(((tugas + uts + uas) / 3).toFixed(2));

        await db.insert(schema.spkScores).values({
          studentId: student.id,
          criteriaId: academicCrit.id,
          mapel: subj.namaMapel,
          nilai: avg,
          details: JSON.stringify({ Tugas: tugas, UTS: uts, UAS: uas }),
          periode: PERIODE,
        });
      }

      // 2. Non-academic criteria evaluated in this subject
      for (const nac of nonAcademicManualCrit) {
        const nacKey = `${student.id}:${nac.id}:${subj.namaMapel}`;
        if (!scoreMap.has(nacKey)) {
          const val = Math.min(98, Math.max(70, Math.round(studentBase + (rng() * 12 - 5))));
          await db.insert(schema.spkScores).values({
            studentId: student.id,
            criteriaId: nac.id,
            mapel: subj.namaMapel,
            nilai: val,
            details: JSON.stringify({ Nilai: val }),
            periode: PERIODE,
          });
        }
      }
    }

    // C. Non-academic criteria for Wali Kelas ("Umum")
    for (const nac of nonAcademicManualCrit) {
      const umumKey = `${student.id}:${nac.id}:Umum`;
      if (!scoreMap.has(umumKey)) {
        const val = Math.min(98, Math.max(70, Math.round(studentBase + (rng() * 10 - 4))));
        await db.insert(schema.spkScores).values({
          studentId: student.id,
          criteriaId: nac.id,
          mapel: "Umum",
          nilai: val,
          details: JSON.stringify({ Nilai: val }),
          periode: PERIODE,
        });
      }
    }

    console.log(`   ✅ Enriched: ${student.nis} - ${student.namaLengkap} (${student.kelas}) with ${classSubjects.length} subjects`);
  }

  // 7. Sync to local sqlite.db if exists
  const localDbPath = path.resolve(process.cwd(), "sqlite.db");
  try {
    const rawSqlite = new Database(localDbPath);
    console.log("\n💾 Syncing directly to local sqlite.db file...");

    // Read latest from db and insert/replace into sqlite.db
    const [latestCategories, latestScores, latestAtt] = await Promise.all([
      db.select().from(schema.spkGradingCategories).all(),
      db.select().from(schema.spkScores).all(),
      db.select().from(schema.attendance).all(),
    ]);

    const insertCat = rawSqlite.prepare(`
      INSERT OR REPLACE INTO spk_grading_categories (id, kelas, criteria_id, mapel, categories, periode)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertScore = rawSqlite.prepare(`
      INSERT OR REPLACE INTO spk_scores (id, student_id, criteria_id, mapel, nilai, details, periode)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertAtt = rawSqlite.prepare(`
      INSERT OR REPLACE INTO attendance (id, student_id, tanggal, status, mapel, periode)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    rawSqlite.transaction(() => {
      latestCategories.forEach((c) => {
        insertCat.run(c.id, c.kelas, c.criteriaId, c.mapel, c.categories, c.periode);
      });
      latestScores.forEach((s) => {
        insertScore.run(s.id, s.studentId, s.criteriaId, s.mapel, s.nilai, s.details, s.periode);
      });
      latestAtt.forEach((a) => {
        insertAtt.run(a.id, a.studentId, a.tanggal, a.status, a.mapel, a.periode);
      });
    })();

    rawSqlite.close();
    console.log(`   ✅ Local sqlite.db successfully synchronized (${latestScores.length} scores, ${latestAtt.length} attendance records)`);
  } catch (err: any) {
    console.log("   ℹ️ Local sqlite.db sync skipped or failed:", err.message);
  }

  console.log("\n🎉 Database enrichment & synchronization completed successfully!");
}

enrich().catch((err) => {
  console.error("❌ Enrichment failed:", err);
  process.exit(1);
});

