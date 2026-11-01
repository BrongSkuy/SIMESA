import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import * as authSchema from "./auth-schema";
import { eq, and } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client, { schema: { ...schema, ...authSchema } });

async function fill() {
  console.log("🌱 Starting leaderboard validation filler script...\n");

  // 1. Get active academic period
  const [activeYear] = await db.select().from(schema.academicYears).where(eq(schema.academicYears.isActive, true));
  const activePeriode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : "2025/2026-Genap";
  console.log(`Active Period: ${activePeriode}`);

  // 2. Fetch students, classes, criteria, subjects
  const allStudents = await db.select().from(schema.students).where(eq(schema.students.status, "aktif")).all();
  const allClassMeta = await db.select().from(schema.classes).all();
  const allCriteria = await db.select().from(schema.spkCriteria).all();
  const allSubjects = await db.select().from(schema.subjects).all();

  console.log(`Found:
  - ${allStudents.length} active students
  - ${allClassMeta.length} classes
  - ${allCriteria.length} criteria
  - ${allSubjects.length} subjects`);

  const academicCriteria = allCriteria.find(c => c.namaKriteria.toLowerCase().includes("akademik"));
  const manualCriteria = allCriteria.filter(c => c.tipe === "Manual");

  if (!academicCriteria) {
    console.error("❌ Academic criteria not found!");
    process.exit(1);
  }

  const classNames = [...new Set(allStudents.map(s => s.kelas))];

  // 3. Create dynamic grading categories if missing
  console.log("\n📦 Ensuring dynamic grading categories exist for all classes and subjects...");
  const categoriesList = ["Tugas", "UTS", "UAS"];
  const categoriesJson = JSON.stringify(categoriesList);

  for (const cName of classNames) {
    const requiredMapels = new Set<string>();
    for (const s of allSubjects) {
      if (s.kelasDiampu) {
        const classesInSubject = s.kelasDiampu.split(",").map(k => k.trim());
        if (classesInSubject.includes(cName)) {
          requiredMapels.add(s.namaMapel);
        }
      }
    }
    // Add "Umum" if class has homeroom (Wali Kelas)
    const classInfo = allClassMeta.find(c => c.namaKelas === cName);
    if (classInfo?.waliKelas) {
      requiredMapels.add("Umum");
    }

    for (const mapel of requiredMapels) {
      // Only academic criteria needs spkGradingCategories
      if (mapel !== "Umum") {
        const existingCategory = await db
          .select()
          .from(schema.spkGradingCategories)
          .where(
            and(
              eq(schema.spkGradingCategories.kelas, cName),
              eq(schema.spkGradingCategories.mapel, mapel),
              eq(schema.spkGradingCategories.criteriaId, academicCriteria.id),
              eq(schema.spkGradingCategories.periode, activePeriode)
            )
          )
          .all();

        if (existingCategory.length === 0) {
          await db.insert(schema.spkGradingCategories).values({
            kelas: cName,
            mapel,
            criteriaId: academicCriteria.id,
            periode: activePeriode,
            categories: categoriesJson,
          });
          console.log(`   ✅ Created categories for Class ${cName} — Mapel: ${mapel}`);
        }
      }
    }
  }

  // 4. Fill attendance and scores for students
  console.log("\n✍️ Filling missing attendance and manual criteria scores...");
  
  // Date generator for demo attendance
  const attendanceDates = ["2026-05-25", "2026-05-26", "2026-05-27", "2026-05-28", "2026-05-29"];

  for (const student of allStudents) {
    const cName = student.kelas;
    const requiredMapels = new Set<string>();
    for (const s of allSubjects) {
      if (s.kelasDiampu) {
        const classesInSubject = s.kelasDiampu.split(",").map(k => k.trim());
        if (classesInSubject.includes(cName)) {
          requiredMapels.add(s.namaMapel);
        }
      }
    }
    const classInfo = allClassMeta.find(c => c.namaKelas === cName);
    if (classInfo?.waliKelas) {
      requiredMapels.add("Umum");
    }

    const mapelList = Array.from(requiredMapels);

    for (const mapel of mapelList) {
      // A. Fill Attendance (Kehadiran)
      const existingAttendance = await db
        .select()
        .from(schema.attendance)
        .where(
          and(
            eq(schema.attendance.studentId, student.id),
            eq(schema.attendance.mapel, mapel),
            eq(schema.attendance.periode, activePeriode)
          )
        )
        .all();

      if (existingAttendance.length === 0) {
        for (const date of attendanceDates) {
          // 90% Present, 10% sick/permit
          const status = Math.random() < 0.9 ? "Hadir" : (Math.random() < 0.5 ? "Izin" : "Sakit");
          await db.insert(schema.attendance).values({
            studentId: student.id,
            tanggal: date,
            mapel,
            status,
            periode: activePeriode,
          });
        }
        console.log(`   ✅ Seeded attendance for Student ${student.namaLengkap} (${cName}) — Mapel: ${mapel}`);
      }

      // B. Fill Manual SPK Scores
      for (const crit of manualCriteria) {
        const isAcademic = crit.namaKriteria.toLowerCase().includes("akademik");

        // Skip academic criteria for "Umum" homeroom
        if (isAcademic && mapel === "Umum") continue;

        const existingScore = await db
          .select()
          .from(schema.spkScores)
          .where(
            and(
              eq(schema.spkScores.studentId, student.id),
              eq(schema.spkScores.criteriaId, crit.id),
              eq(schema.spkScores.mapel, mapel),
              eq(schema.spkScores.periode, activePeriode)
            )
          )
          .all();

        if (existingScore.length === 0) {
          let nilai = 0;
          let details = "";

          if (isAcademic) {
            // Generate details for Tugas, UTS, UAS
            const tugas = Math.floor(Math.random() * 20) + 75; // 75-95
            const uts = Math.floor(Math.random() * 25) + 70;   // 70-95
            const uas = Math.floor(Math.random() * 20) + 78;   // 78-98
            nilai = (tugas + uts + uas) / 3;
            details = JSON.stringify({ Tugas: tugas, UTS: uts, UAS: uas });
          } else {
            // Non-academic e.g. Kedisiplinan, Sikap
            nilai = Math.floor(Math.random() * 20) + 78; // 78-98
            details = JSON.stringify({ Nilai: nilai });
          }

          await db.insert(schema.spkScores).values({
            studentId: student.id,
            criteriaId: crit.id,
            mapel,
            nilai,
            details,
            periode: activePeriode,
          });
          console.log(`   ✅ Seeded score for ${student.namaLengkap} (${cName}) — Criteria: ${crit.namaKriteria} (${mapel})`);
        }
      }
    }
  }

  console.log("\n✨ Filling database validation data complete!");
}

fill().catch(console.error);
