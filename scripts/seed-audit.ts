import { db } from "../src/db";
import { activityLogs } from "../src/db/schema";
import { logActivity } from "../src/lib/audit-server";
import * as dotenv from "dotenv";
dotenv.config();

async function seedAuditLogs() {
  console.log("Checking activity_logs...");
  const existing = await db.select().from(activityLogs).limit(5);
  if (existing.length > 0) {
    console.log(`Already has ${existing.length} or more logs. Skipping seed.`);
    return;
  }

  console.log("Seeding initial authentic activity logs...");

  const sampleLogs = [
    {
      userId: "usr-admin-01",
      userName: "Administrator Utama",
      userRole: "admin",
      action: "LOGIN" as const,
      module: "AUTENTIKASI" as const,
      targetId: "usr-admin-01",
      targetName: "Administrator Utama",
      description: "Pengguna Administrator Utama berhasil masuk ke sistem",
      ipAddress: "192.168.1.10",
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      userId: "usr-guru-01",
      userName: "Budi Santoso, S.Pd.",
      userRole: "guru",
      action: "UPDATE" as const,
      module: "AKADEMIK_NILAI" as const,
      targetId: "cls-xi-a",
      targetName: "Kelas XI-A",
      description: "Memperbarui nilai harian Matematika Kelas XI-A Semester Genap",
      details: { mapel: "Matematika", kelas: "XI-A", jumlahSiswa: 32 },
      ipAddress: "192.168.1.15",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      userId: "usr-bk-01",
      userName: "Dra. Siti Rahayu, M.Pd.",
      userRole: "guru_bk",
      action: "CREATE" as const,
      module: "BUKU_POIN" as const,
      targetId: "std-001",
      targetName: "Dimas Arya Pratama",
      description: "Mencatat pelanggaran tata tertib (Keterlambatan Hadir, 5 poin) untuk siswa Dimas Arya Pratama",
      details: { kode: "PEL-01", poin: 5, lokasi: "Gerbang Utama" },
      ipAddress: "192.168.1.22",
      createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    },
    {
      userId: "usr-bk-01",
      userName: "Dra. Siti Rahayu, M.Pd.",
      userRole: "guru_bk",
      action: "CREATE" as const,
      module: "KONSELING_BK" as const,
      targetId: "std-001",
      targetName: "Dimas Arya Pratama",
      description: "Mencatat sesi konseling perorangan bidang kedisiplinan dan sikap untuk siswa Dimas Arya Pratama",
      details: { jenisLayanan: "Konseling Perorangan", kategori: "Kedisiplinan dan Sikap" },
      ipAddress: "192.168.1.22",
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
    {
      userId: "usr-wali-01",
      userName: "Ahmad Dahlan, M.Pd.",
      userRole: "wali_kelas",
      action: "UPDATE" as const,
      module: "E_RAPOR" as const,
      targetId: "std-001",
      targetName: "Dimas Arya Pratama",
      description: "Menyimpan catatan wali kelas dan status rapor (Draf) untuk siswa Dimas Arya Pratama",
      details: { periode: "2025/2026-Genap", statusRapor: "Draf" },
      ipAddress: "192.168.1.18",
      createdAt: new Date(Date.now() - 3600000 * 0.5).toISOString(),
    },
  ];

  for (const log of sampleLogs) {
    await logActivity(log);
  }

  console.log("✅ Seed completed successfully!");
}

seedAuditLogs().catch(console.error);
