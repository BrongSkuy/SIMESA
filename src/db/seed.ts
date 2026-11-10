/**
 * Seed script — populates the database with default admin, teachers, students,
 * classes, subjects, and SPK criteria.
 *
 * Run: npx tsx src/db/seed.ts
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username, admin } from "better-auth/plugins";
import * as schema from "./schema";
import * as authSchema from "./auth-schema";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// --- Setup Turso DB + Auth instance for seeding ---
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client, { schema: { ...schema, ...authSchema } });

const auth = betterAuth({
  baseURL: "http://localhost:3000",
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true, minPasswordLength: 4 },
  plugins: [username(), admin({ defaultRole: "user" })],
  user: {
    additionalFields: {
      appRole: {
        type: "string",
        required: false,
        defaultValue: "SISWA",
        input: true,
      },
    },
  },
});

async function seed() {
  console.log("🌱 Seeding database...\n");

  // ==========================================
  // ==========================================
  // 1. Create Core System & Admin Users
  // ==========================================
  console.log("👤 Creating Core System & Admin users...");

  // A. Superadmin
  try {
    const superUser = await auth.api.signUpEmail({
      body: {
        email: "superadmin@sekolah.id",
        password: "admin123",
        name: "Super Administrator SIMESA",
        username: "superadmin",
        appRole: "SUPERADMIN",
      },
    });
    await client.execute({
      sql: "UPDATE user SET role = ? WHERE id = ?",
      args: ["admin", superUser.user.id],
    });
    console.log(`   ✅ Superadmin : superadmin / admin123`);
  } catch {
    console.log(`   ⏭️ Superadmin already exists, skipping...`);
  }

  // B. Admin Sekolah
  try {
    const adminUser = await auth.api.signUpEmail({
      body: {
        email: "admin@sekolah.id",
        password: "admin123",
        name: "Administrator Sekolah",
        username: "admin001",
        appRole: "ADMIN",
      },
    });
    await client.execute({
      sql: "UPDATE user SET role = ? WHERE id = ?",
      args: ["admin", adminUser.user.id],
    });
    console.log(`   ✅ Admin       : admin001 / admin123`);
  } catch {
    console.log(`   ⏭️ Admin already exists, skipping...`);
  }

  // C. Kepala Sekolah
  try {
    await auth.api.signUpEmail({
      body: {
        email: "kepsek@sekolah.id",
        password: "kepsek123",
        name: "Drs. H. Mulyadi, M.M.",
        username: "kepsek01",
        appRole: "KEPALA_SEKOLAH",
      },
    });
    console.log(`   ✅ Kepsek      : kepsek01 / kepsek123 — Drs. H. Mulyadi, M.M.`);
  } catch {
    console.log(`   ⏭️ Kepsek already exists, skipping...`);
  }

  // D. Staf Perpustakaan
  try {
    await auth.api.signUpEmail({
      body: {
        email: "perpus@sekolah.id",
        password: "perpus123",
        name: "Nurul Hidayah, A.Md.",
        username: "perpus01",
        appRole: "STAF_PERPUS",
      },
    });
    console.log(`   ✅ Staf Perpus : perpus01 / perpus123 — Nurul Hidayah, A.Md.`);
  } catch {
    console.log(`   ⏭️ Staf Perpus already exists, skipping...`);
  }

  // E. Staf Sarpras
  try {
    await auth.api.signUpEmail({
      body: {
        email: "sarpras@sekolah.id",
        password: "sarpras123",
        name: "Bambang Irawan, S.T.",
        username: "sarpras01",
        appRole: "STAF_SARPRAS",
      },
    });
    console.log(`   ✅ Staf Sarpras: sarpras01 / sarpras123 — Bambang Irawan, S.T.`);
  } catch {
    console.log(`   ⏭️ Staf Sarpras already exists, skipping...`);
  }

  // F. Guru BK Murni
  try {
    const bkUser = await auth.api.signUpEmail({
      body: {
        email: "bk@sekolah.id",
        password: "198507102010",
        name: "Dra. Endang Lestari, S.Psi.",
        username: "198507102010",
        appRole: "GURU_BK",
      },
    });
    await db.insert(schema.teachers).values({
      userId: bkUser.user.id,
      nip: "198507102010",
      namaLengkap: "Dra. Endang Lestari, S.Psi.",
      status: "aktif",
    });
    console.log(`   ✅ Guru BK     : 198507102010 / 198507102010 — Dra. Endang Lestari, S.Psi.`);
  } catch {
    console.log(`   ⏭️ Guru BK already exists, skipping...`);
  }

  // ==========================================
  // 2. Create Teacher users + profiles + roles
  // ==========================================
  console.log("\n👨‍🏫 Creating Teacher users...");
  const teacherData = [
    {
      nip: "197601012005",
      nama: "Budi Santoso, S.Pd.",
      additionalRoles: [{ role: "WALI_KELAS", metadata: JSON.stringify({ kelas: "X-A" }) }],
    },
    {
      nip: "198203152008",
      nama: "Siti Rahayu, M.Pd.",
      additionalRoles: [
        { role: "WALI_KELAS", metadata: JSON.stringify({ kelas: "X-B" }) },
        { role: "GURU_BK" },
      ],
    },
    {
      nip: "199005202012",
      nama: "Ahmad Fauzi, S.Pd.",
      additionalRoles: [
        { role: "WALI_KELAS", metadata: JSON.stringify({ kelas: "XI-A" }) },
        { role: "PEMBINA_EKSKUL", metadata: JSON.stringify({ ekskul: "Pramuka" }) },
        { role: "GURU_PIKET" },
      ],
    },
  ];

  for (const t of teacherData) {
    let currentUserId: string | null = null;
    try {
      const user = await auth.api.signUpEmail({
        body: {
          email: `${t.nip}@sekolah.id`,
          password: t.nip,
          name: t.nama,
          username: t.nip,
          appRole: "GURU",
        },
      });
      currentUserId = user.user.id;

      await db.insert(schema.teachers).values({
        userId: currentUserId,
        nip: t.nip,
        namaLengkap: t.nama,
        status: "aktif",
      });

      console.log(`   ✅ Guru: ${t.nip} / ${t.nip} — ${t.nama}`);
    } catch {
      console.log(`   ⏭️ Guru ${t.nip} already exists, checking role assignments...`);
      const existing = await client.execute({
        sql: "SELECT id FROM user WHERE username = ?",
        args: [t.nip],
      });
      if (existing.rows.length > 0) {
        currentUserId = existing.rows[0].id as string;
      }
    }

    // Insert additional multi-roles if present
    if (currentUserId && t.additionalRoles) {
      for (const ar of t.additionalRoles) {
        const roleExists = await client.execute({
          sql: "SELECT id FROM user_roles WHERE user_id = ? AND role = ?",
          args: [currentUserId, ar.role],
        });
        if (roleExists.rows.length === 0) {
          await client.execute({
            sql: "INSERT INTO user_roles (id, user_id, role, metadata, created_at) VALUES (?, ?, ?, ?, ?)",
            args: [
              crypto.randomUUID(),
              currentUserId,
              ar.role,
              ar.metadata || null,
              Date.now(),
            ],
          });
          console.log(`      ↳ Ditambahkan peran: ${ar.role}`);
        }
      }
    }
  }

  // ==========================================
  // 3. Create Classes
  // ==========================================
  console.log("\n🏫 Creating Classes...");
  const kelasData = [
    { namaKelas: "X-A", tingkat: "X", waliKelas: "Budi Santoso, S.Pd." },
    { namaKelas: "X-B", tingkat: "X", waliKelas: "Siti Rahayu, M.Pd." },
    { namaKelas: "XI-A", tingkat: "XI", waliKelas: "Ahmad Fauzi, S.Pd." },
  ];

  for (const k of kelasData) {
    try {
      await db.insert(schema.classes).values(k);
      console.log(`   ✅ Kelas: ${k.namaKelas} — Wali: ${k.waliKelas}`);
    } catch {
      console.log(`   ⏭️ Kelas ${k.namaKelas} already exists, skipping...`);
    }
  }

  // ==========================================
  // 4. Subjects & Teacher Assignments
  // ==========================================
  console.log("\n📚 Creating Subjects & Assignments...");
  const allTeachers = await db.select().from(schema.teachers);
  
  const mapelData = [
    { namaMapel: "Matematika", nip: "197601012005", kelas: "X-A, XI-A" },
    { namaMapel: "Fisika", nip: "197601012005", kelas: "X-A, XI-A" },
    { namaMapel: "Bahasa Indonesia", nip: "198203152008", kelas: "X-B, XI-A" },
    { namaMapel: "Bahasa Inggris", nip: "198203152008", kelas: "X-B, XI-A" },
    { namaMapel: "IPA", nip: "199005202012", kelas: "X-A, X-B" },
  ];

  for (const m of mapelData) {
    const teacher = allTeachers.find((t) => t.nip === m.nip);
    try {
      await db.insert(schema.subjects).values({
        namaMapel: m.namaMapel,
        teacherId: teacher?.id || null,
        kelasDiampu: m.kelas,
      });
      console.log(`   ✅ Mapel: ${m.namaMapel} — ${teacher?.namaLengkap || "Unknown"} (${m.kelas})`);
    } catch {
      console.log(`   ⏭️ Mapel ${m.namaMapel} already exists, skipping...`);
    }
  }

  // ==========================================
  // 5. Create Student users + profiles
  // ==========================================
  console.log("\n🎓 Creating Student users...");
  const studentData = [
    // Kelas X-A
    { nis: "2024001", nama: "Andi Prasetyo", kelas: "X-A", jk: "L" as const },
    { nis: "2024002", nama: "Dewi Lestari", kelas: "X-A", jk: "P" as const },
    { nis: "2024003", nama: "Rizki Ramadhan", kelas: "X-A", jk: "L" as const },
    { nis: "2024004", nama: "Siti Nurhaliza", kelas: "X-A", jk: "P" as const },
    { nis: "2024005", nama: "Fajar Nugroho", kelas: "X-A", jk: "L" as const },
    // Kelas X-B
    { nis: "2024006", nama: "Putri Ayu Wulandari", kelas: "X-B", jk: "P" as const },
    { nis: "2024007", nama: "Muhammad Ilham", kelas: "X-B", jk: "L" as const },
    { nis: "2024008", nama: "Nadia Safitri", kelas: "X-B", jk: "P" as const },
    { nis: "2024009", nama: "Bima Sakti", kelas: "X-B", jk: "L" as const },
    { nis: "2024010", nama: "Anisa Rahma", kelas: "X-B", jk: "P" as const },
    // Kelas XI-A
    { nis: "2024011", nama: "Dimas Arya Pratama", kelas: "XI-A", jk: "L" as const },
    { nis: "2024012", nama: "Ratna Sari Dewi", kelas: "XI-A", jk: "P" as const },
    { nis: "2024013", nama: "Hendra Wijaya", kelas: "XI-A", jk: "L" as const },
    { nis: "2024014", nama: "Mega Puspita", kelas: "XI-A", jk: "P" as const },
    { nis: "2024015", nama: "Yoga Permana", kelas: "XI-A", jk: "L" as const },
  ];

  const createdStudentIds: { nis: string; studentId: string }[] = [];

  for (const s of studentData) {
    try {
      const user = await auth.api.signUpEmail({
        body: {
          email: `${s.nis}@siswa.sekolah.id`,
          password: s.nis, // default password = NIS
          name: s.nama,
          username: s.nis,
          appRole: "SISWA",
        },
      });

      const result = await db.insert(schema.students).values({
        userId: user.user.id,
        nis: s.nis,
        namaLengkap: s.nama,
        kelas: s.kelas,
        angkatan: "2024",
        jenisKelamin: s.jk,
        status: "aktif",
      }).returning();

      if (result[0]) {
        createdStudentIds.push({ nis: s.nis, studentId: result[0].id });
      }
      console.log(`   ✅ Siswa: ${s.nis} / ${s.nis} — ${s.nama} (${s.kelas})`);
    } catch {
      console.log(`   ⏭️ Siswa ${s.nis} already exists, skipping...`);
    }
  }

  // ==========================================
  // 6. SPK Criteria
  // ==========================================
  console.log("\n⚖️ Creating SPK Criteria...");
  const kriteria = [
    { namaKriteria: "Kehadiran", bobot: 30, tipe: "Otomatis" as const, deskripsi: "Persentase kehadiran siswa (otomatis dari data absensi)" },
    { namaKriteria: "Nilai Akademik", bobot: 25, tipe: "Manual" as const, deskripsi: "Rata-rata nilai akademik siswa" },
    { namaKriteria: "Kedisiplinan", bobot: 20, tipe: "Manual" as const, deskripsi: "Penilaian kedisiplinan oleh guru" },
    { namaKriteria: "Sikap & Perilaku", bobot: 15, tipe: "Manual" as const, deskripsi: "Penilaian sikap dan perilaku di sekolah" },
    { namaKriteria: "Keaktifan", bobot: 10, tipe: "Manual" as const, deskripsi: "Keaktifan dalam kegiatan sekolah" },
  ];

  for (const k of kriteria) {
    try {
      await db.insert(schema.spkCriteria).values(k);
      console.log(`   ✅ Kriteria: ${k.namaKriteria} (${k.bobot}%)`);
    } catch {
      console.log(`   ⏭️ Kriteria ${k.namaKriteria} already exists, skipping...`);
    }
  }

  // ==========================================
  // 7. Academic Year
  // ==========================================
  console.log("\n📅 Creating Academic Year...");
  try {
    await db.insert(schema.academicYears).values({
      tahunAjaran: "2025/2026",
      semester: "Genap",
      isActive: true,
    });
    console.log("   ✅ 2025/2026 Genap (Active)");
  } catch {
    console.log("   ⏭️ Academic Year already exists, skipping...");
  }

  // ==========================================
  // 8. Grading Categories (Tugas, UTS, UAS)
  // ==========================================
  console.log("\n📦 Creating SPK Grading Categories...");
  const allDBCriteria = await db.select().from(schema.spkCriteria);
  const dbAcadCrit = allDBCriteria.find((c) => c.namaKriteria === "Nilai Akademik");

  if (dbAcadCrit) {
    const allClasses = await db.select().from(schema.classes);
    const allSubjectsList = await db.select().from(schema.subjects);

    for (const cls of allClasses) {
      const classSubjects = allSubjectsList.filter((s) => {
        const assigned = (s.kelasDiampu || "")
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean);
        return assigned.includes(cls.namaKelas);
      });

      for (const subj of classSubjects) {
        try {
          await db.insert(schema.spkGradingCategories).values({
            kelas: cls.namaKelas,
            criteriaId: dbAcadCrit.id,
            mapel: subj.namaMapel,
            categories: JSON.stringify(["Tugas", "UTS", "UAS"]),
            periode: "2025/2026-Genap",
          });
          console.log(`   ✅ Kategori Penilaian: ${cls.namaKelas} - ${subj.namaMapel} (Tugas, UTS, UAS)`);
        } catch {
          // skip duplicates
        }
      }
    }
  }

  // ==========================================
  // 9. Demo Attendance Data (Curriculum & Umum)
  // ==========================================
  console.log("\n📊 Creating demo attendance data...");
  const allStudentsList = await db.select().from(schema.students);
  const allSubjectsList = await db.select().from(schema.subjects);

  if (allStudentsList.length > 0) {
    // Generate attendance for last 10 school days
    const today = new Date();
    const schoolDays: string[] = [];
    const d = new Date(today.getTime());
    while (schoolDays.length < 10) {
      d.setDate(d.getDate() - 1);
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
        schoolDays.push(d.toISOString().split("T")[0]);
      }
    }
    schoolDays.sort();

    for (const student of allStudentsList) {
      const classSubjects = allSubjectsList.filter((s) => {
        const assigned = (s.kelasDiampu || "")
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean);
        return assigned.includes(student.kelas);
      });

      // Mapels to record: curriculum subjects
      const mapelsToRecord = classSubjects.map((s) => s.namaMapel);

      for (const mapel of mapelsToRecord) {
        for (const tanggal of schoolDays) {
          const rand = Math.random();
          const status = rand < 0.82 ? "Hadir" : rand < 0.89 ? "Izin" : rand < 0.95 ? "Sakit" : "Alfa";
          try {
            await db.insert(schema.attendance).values({
              studentId: student.id,
              tanggal,
              mapel,
              status,
              periode: "2025/2026-Genap",
            });
          } catch {
            // skip duplicates
          }
        }
      }
    }
    console.log(`   ✅ Generated attendance for ${allStudentsList.length} students across curriculum subjects`);
  }

  // ==========================================
  // 10. Demo SPK Scores (Per-Subject)
  // ==========================================
  console.log("\n🏆 Creating demo SPK scores with Tugas, UTS, UAS details...");
  if (allStudentsList.length > 0) {
    const allCriteria = await db.select().from(schema.spkCriteria);
    const academicCritRow = allCriteria.find((c) => c.namaKriteria === "Nilai Akademik");
    const nonAcadCritRows = allCriteria.filter((c) => c.tipe === "Manual" && c.namaKriteria !== "Nilai Akademik");

    for (const student of allStudentsList) {
      const classSubjects = allSubjectsList.filter((s) => {
        const assigned = (s.kelasDiampu || "")
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean);
        return assigned.includes(student.kelas);
      });

      const baseRankFactor = (parseInt(student.nis.slice(-2), 10) || 5) % 15;
      const studentBase = 88 - (baseRankFactor * 1.2);

      // Per-subject scores
      for (const subj of classSubjects) {
        // Academic (Tugas, UTS, UAS)
        if (academicCritRow) {
          const tugas = Math.min(99, Math.max(68, Math.round(studentBase + (Math.random() * 14 - 6))));
          const uts = Math.min(98, Math.max(65, Math.round(studentBase + (Math.random() * 12 - 6))));
          const uas = Math.min(100, Math.max(68, Math.round(studentBase + (Math.random() * 14 - 5))));
          const avg = Number(((tugas + uts + uas) / 3).toFixed(2));

          try {
            await db.insert(schema.spkScores).values({
              studentId: student.id,
              criteriaId: academicCritRow.id,
              mapel: subj.namaMapel,
              nilai: avg,
              details: JSON.stringify({ Tugas: tugas, UTS: uts, UAS: uas }),
              periode: "2025/2026-Genap",
            });
          } catch {
            // skip duplicates
          }
        }

        // Non-academic per subject
        for (const nac of nonAcadCritRows) {
          const val = Math.min(98, Math.max(70, Math.round(studentBase + (Math.random() * 12 - 5))));
          try {
            await db.insert(schema.spkScores).values({
              studentId: student.id,
              criteriaId: nac.id,
              mapel: subj.namaMapel,
              nilai: val,
              details: JSON.stringify({ Nilai: val }),
              periode: "2025/2026-Genap",
            });
          } catch {
            // skip duplicates
          }
        }
      }
    }
    console.log(`   ✅ Generated per-subject SPK scores for ${allStudentsList.length} students`);
  }

  // ==========================================
  // Done
  // ==========================================
  console.log("\n✨ Seeding complete!\n");
  console.log("=== LOGIN CREDENTIALS ===");
  console.log("Superadmin   : superadmin / admin123");
  console.log("Admin        : admin001 / admin123");
  console.log("Kepala Sekolah : kepsek01 / kepsek123");
  console.log("Guru (Wali)  : 197601012005 / 197601012005 (Budi Santoso, S.Pd.)");
  console.log("Guru (+BK)   : 198203152008 / 198203152008 (Siti Rahayu, M.Pd.)");
  console.log("Guru (+Ekskul/Piket) : 199005202012 / 199005202012 (Ahmad Fauzi, S.Pd.)");
  console.log("Guru BK Murni: 198507102010 / 198507102010 (Dra. Endang Lestari)");
  console.log("Staf Perpus  : perpus01 / perpus123");
  console.log("Staf Sarpras : sarpras01 / sarpras123");
  console.log("Siswa & Ortu : 2024001 / 2024001 (Andi Prasetyo, X-A)");
  console.log("Siswa & Ortu : 2024002 / 2024002 (Dewi Lestari, X-A)");
  console.log("...dan 13 siswa lainnya (NIS = password)");
  console.log("=========================\n");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
