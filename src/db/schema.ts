import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

// ============================================================
// App-specific tables (Better Auth manages its own tables)
// ============================================================

// --- Students (profil siswa, linked to Better Auth user) ---
export const students = sqliteTable("students", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(), // FK to Better Auth 'user' table
  nis: text("nis").notNull().unique(),
  namaLengkap: text("nama_lengkap").notNull(),
  kelas: text("kelas").notNull(),
  angkatan: text("angkatan").notNull(),
  jenisKelamin: text("jenis_kelamin", { enum: ["L", "P"] }).notNull(),
  foto: text("foto"),
  status: text("status", { enum: ["aktif", "nonaktif"] }).notNull().default("aktif"),
}, (table) => [
  index("students_user_idx").on(table.userId),
  index("students_kelas_idx").on(table.kelas),
]);

// --- Teachers (profil guru, linked to Better Auth user) ---
export const teachers = sqliteTable("teachers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(), // FK to Better Auth 'user' table
  nip: text("nip").notNull().unique(),
  namaLengkap: text("nama_lengkap").notNull(),
  jenisKelamin: text("jenis_kelamin", { enum: ["L", "P"] }).notNull().default("L"),
  foto: text("foto"),
  status: text("status", { enum: ["aktif", "nonaktif"] }).notNull().default("aktif"),
}, (table) => [
  index("teachers_user_idx").on(table.userId),
]);

// --- Kelas (daftar kelas) ---
export const classes = sqliteTable("classes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  namaKelas: text("nama_kelas").notNull().unique(),
  tingkat: text("tingkat").notNull(),
  waliKelas: text("wali_kelas"),
});

// --- Mata Pelajaran ---
export const subjects = sqliteTable("subjects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  namaMapel: text("nama_mapel").notNull(),
  teacherId: text("teacher_id"),
  kelasDiampu: text("kelas_diampu"),
});

// --- Attendance (absensi harian) ---
export const attendance = sqliteTable("attendance", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id").notNull(),
  tanggal: text("tanggal").notNull(), // ISO date string YYYY-MM-DD
  mapel: text("mapel").default("Umum"), // "Umum" if not mapped to specific subject
  status: text("status", { enum: ["Hadir", "Izin", "Sakit", "Alfa"] }).notNull(),
  recordedBy: text("recorded_by"), // userId of teacher who recorded
  periode: text("periode").notNull().default("2025/2026-Genap"), // Isolation tag
}, (table) => [
  index("att_student_idx").on(table.studentId),
  index("att_tanggal_idx").on(table.tanggal),
  index("att_periode_idx").on(table.periode),
]);

// --- SPK Criteria (kriteria + bobot) ---
export const spkCriteria = sqliteTable("spk_criteria", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  namaKriteria: text("nama_kriteria").notNull().unique(),
  bobot: real("bobot").notNull(), // percentage weight
  tipe: text("tipe", { enum: ["Otomatis", "Manual"] }).notNull(),
  deskripsi: text("deskripsi"),
});

// --- SPK Scores (nilai per kriteria per siswa) ---
export const spkScores = sqliteTable("spk_scores", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id").notNull(),
  criteriaId: text("criteria_id").notNull(),
  mapel: text("mapel"), // Null if it's a general criteria like Kedisiplinan
  nilai: real("nilai").notNull().default(0), // The calculated average
  details: text("details"), // JSON string e.g. '{"Tugas": 80, "UTS": 90}'
  periode: text("periode").notNull(), // e.g. "2025/2026-Genap"
}, (table) => [
  index("spk_scores_student_idx").on(table.studentId),
  index("spk_scores_periode_idx").on(table.periode),
]);

// --- Leaderboard Archives (arsip historis) ---
export const leaderboardArchives = sqliteTable("leaderboard_archives", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  namaFile: text("nama_file").notNull(),
  pathFile: text("path_file").notNull(),
  periode: text("periode").notNull(),
  uploadedAt: text("uploaded_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// --- Academic Years (tahun ajaran) ---
export const academicYears = sqliteTable("academic_years", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tahunAjaran: text("tahun_ajaran").notNull(), // e.g. "2025/2026"
  semester: text("semester", { enum: ["Ganjil", "Genap"] }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
});

// --- SPK Grading Categories (kategori nilai dinamis per mapel/kriteria) ---
export const spkGradingCategories = sqliteTable("spk_grading_categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  kelas: text("kelas").notNull(),
  mapel: text("mapel").notNull(),
  criteriaId: text("criteria_id").notNull(),
  periode: text("periode").notNull(),
  categories: text("categories").notNull(), // JSON string array, e.g., '["Tugas", "UTS", "Praktek"]'
});

// --- SPK Publish Status ---
export const spkPublishStatus = sqliteTable("spk_publish_status", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  periode: text("periode").notNull().unique(),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
  publishedAt: text("published_at"),
  publishedBy: text("published_by"),
});

// --- SPK Results (Cached Leaderboard) ---
export const spkResults = sqliteTable("spk_results", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id").notNull(),
  periode: text("periode").notNull(),
  kelas: text("kelas").notNull(),
  rank: integer("rank").notNull(),
  rawScore: real("raw_score").notNull(),
  persentase: real("persentase").notNull(),
  details: text("details"),
}, (table) => [
  index("spk_results_student_idx").on(table.studentId),
  index("spk_results_periode_idx").on(table.periode),
]);

// --- Master Jenis Pelanggaran (Katalog Poin & Sanksi) ---
export const violationTypes = sqliteTable("violation_types", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  kode: text("kode").notNull().unique(), // e.g. "TATIB-01", "KBM-02", "KDR-01"
  namaPelanggaran: text("nama_pelanggaran").notNull(),
  kategori: text("kategori", { enum: ["Ringan", "Sedang", "Berat"] }).notNull(),
  poinDefault: integer("poin_default").notNull().default(10),
  deskripsiSanksi: text("deskripsi_sanksi"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
}, (table) => [
  index("violation_types_kategori_idx").on(table.kategori),
  index("violation_types_kode_idx").on(table.kode),
]);

// --- Buku Catatan Pelanggaran Siswa ---
export const studentViolations = sqliteTable("student_violations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id").notNull(),
  violationTypeId: text("violation_type_id").notNull(),
  reportedBy: text("reported_by").notNull(), // User ID / Nama Guru Piket / BK
  tanggal: text("tanggal").notNull(), // YYYY-MM-DD
  poin: integer("poin").notNull(),
  lokasi: text("lokasi"),
  keterangan: text("keterangan"),
  status: text("status", { enum: ["Tercatat", "Diproses BK", "Selesai Dibina"] }).notNull().default("Tercatat"),
  tindakLanjut: text("tindak_lanjut"),
  createdAt: integer("created_at").$defaultFn(() => Date.now()),
}, (table) => [
  index("student_violations_student_idx").on(table.studentId),
  index("student_violations_type_idx").on(table.violationTypeId),
  index("student_violations_tanggal_idx").on(table.tanggal),
  index("student_violations_status_idx").on(table.status),
]);

// --- Surat Peringatan (SP 1, SP 2, SP 3) ---
export const warningLetters = sqliteTable("warning_letters", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id").notNull(),
  nomorSurat: text("nomor_surat").notNull().unique(), // e.g. "042/SP-I/SMK-DIRGANTARA/XI/2026"
  tingkatSp: integer("tingkat_sp").notNull(), // 1, 2, or 3
  totalPoinSaatSp: integer("total_poin_saat_sp").notNull(),
  tanggalTerbit: text("tanggal_terbit").notNull(), // YYYY-MM-DD
  diterbitkanOleh: text("diterbitkan_oleh").notNull(), // User ID / Nama Penerbit (Guru BK / Kepala Sekolah)
  statusPanggilan: text("status_panggilan", { enum: ["Menunggu Panggilan", "Hadir", "Tidak Hadir"] }).notNull().default("Menunggu Panggilan"),
  catatanMediasi: text("catatan_mediasi"),
  createdAt: integer("created_at").$defaultFn(() => Date.now()),
}, (table) => [
  index("warning_letters_student_idx").on(table.studentId),
  index("warning_letters_tingkat_idx").on(table.tingkatSp),
]);

// --- Sesi Bimbingan Konseling (BK) Siswa ---
export const counselingSessions = sqliteTable("counseling_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id").notNull(),
  counselorId: text("counselor_id").notNull(), // User ID atau nama Guru BK
  tanggal: text("tanggal").notNull(), // YYYY-MM-DD
  waktuMulai: text("waktu_mulai").notNull(), // HH:MM
  waktuSelesai: text("waktu_selesai").notNull(), // HH:MM
  kategori: text("kategori", {
    enum: ["Akademik dan Belajar", "Pribadi dan Sosial", "Karir dan Masa Depan", "Kedisiplinan dan Sikap"],
  }).notNull(),
  jenisLayanan: text("jenis_layanan", {
    enum: ["Konseling Perorangan", "Konseling Kelompok", "Mediasi Antar Teman", "Konsultasi Temu Orang Tua"],
  }).notNull(),
  tingkatKerahasiaan: text("tingkat_kerahasiaan", {
    enum: ["Umum", "Rahasia"],
  }).notNull().default("Umum"),
  pokokMasalah: text("pokok_masalah").notNull(),
  pendekatanKonseling: text("pendekatan_konseling"),
  hasilKonseling: text("hasil_konseling"),
  tindakLanjut: text("tindak_lanjut"),
  statusKasus: text("status_kasus", {
    enum: ["Dalam Pemantauan", "Selesai", "Rujukan Kasus"],
  }).notNull().default("Dalam Pemantauan"),
  createdAt: integer("created_at").$defaultFn(() => Date.now()),
}, (table) => [
  index("counseling_sessions_student_idx").on(table.studentId),
  index("counseling_sessions_counselor_idx").on(table.counselorId),
  index("counseling_sessions_tanggal_idx").on(table.tanggal),
  index("counseling_sessions_status_idx").on(table.statusKasus),
  index("counseling_sessions_kategori_idx").on(table.kategori),
]);

// --- Log Pemantauan Perkembangan Siswa ---
export const studentMonitoringLogs = sqliteTable("student_monitoring_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id").notNull(),
  recordedBy: text("recorded_by").notNull(), // User ID atau nama Guru BK atau Wali Kelas
  tanggal: text("tanggal").notNull(), // YYYY-MM-DD
  aspekPengamatan: text("aspek_pengamatan", {
    enum: ["Kedisiplinan dan Sikap", "Motivasi Belajar", "Interaksi Sosial", "Keluarga dan Lingkungan"],
  }).notNull(),
  catatanPerkembangan: text("catatan_perkembangan").notNull(),
  rekomendasi: text("rekomendasi"),
  createdAt: integer("created_at").$defaultFn(() => Date.now()),
}, (table) => [
  index("monitoring_logs_student_idx").on(table.studentId),
  index("monitoring_logs_recorder_idx").on(table.recordedBy),
  index("monitoring_logs_tanggal_idx").on(table.tanggal),
]);

// --- Surat Dispensasi Izin Meninggalkan Kelas ---
export const dispensationLetters = sqliteTable("dispensation_letters", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id").notNull(),
  nomorSurat: text("nomor_surat").notNull().unique(), // e.g. "018-DSP-SMK-DIRGANTARA-XI-2026"
  tanggal: text("tanggal").notNull(), // YYYY-MM-DD
  jamMulai: text("jam_mulai").notNull(), // e.g. "09:00"
  jamSelesai: text("jam_selesai").notNull(), // e.g. "10:30" atau "Selesai KBM"
  keperluan: text("keperluan", {
    enum: ["Bimbingan Konseling", "Pemeriksaan Kesehatan di UKS", "Tugas Sekolah atau Perlombaan", "Urusan Keluarga Mendesak"],
  }).notNull(),
  keterangan: text("keterangan"),
  diterbitkanOleh: text("diterbitkan_oleh").notNull(), // User ID atau nama Guru BK atau Guru Piket
  statusDispensasi: text("status_dispensasi", {
    enum: ["Aktif", "Selesai", "Dibatalkan"],
  }).notNull().default("Aktif"),
  createdAt: integer("created_at").$defaultFn(() => Date.now()),
}, (table) => [
  index("dispensation_letters_student_idx").on(table.studentId),
  index("dispensation_letters_nomor_idx").on(table.nomorSurat),
  index("dispensation_letters_tanggal_idx").on(table.tanggal),
  index("dispensation_letters_status_idx").on(table.statusDispensasi),
]);

// --- Curriculum Targets (KKM & Capaian Materi per Mapel) ---
export const curriculumTargets = sqliteTable("curriculum_targets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  mapel: text("mapel").notNull(),
  tingkat: text("tingkat").notNull().default("Semua"), // "X", "XI", "XII", atau "Semua"
  kkm: integer("kkm").notNull().default(75),
  capaianKompetensi: text("capaian_kompetensi"),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("curriculum_mapel_idx").on(table.mapel),
]);

// --- Student Report Notes (Catatan Rapor Wali Kelas & Ekstrakurikuler) ---
export const studentReportNotes = sqliteTable("student_report_notes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id").notNull(),
  periode: text("periode").notNull(), // e.g. "2025/2026-Genap"
  catatanWaliKelas: text("catatan_wali_kelas"),
  ekskulNama: text("ekskul_nama"),
  ekskulNilai: text("ekskul_nilai"), // "Sangat Baik" | "Baik" | "Cukup"
  ekskulKeterangan: text("ekskul_keterangan"),
  statusRapor: text("status_rapor", { enum: ["Draf", "Disahkan", "Diterbitkan"] }).notNull().default("Draf"),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("report_notes_student_idx").on(table.studentId),
  index("report_notes_periode_idx").on(table.periode),
]);

// --- Activity Logs (Riwayat Aktivitas & Audit Trail) ---
export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  action: text("action", {
    enum: ["LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "APPROVE", "PRINT", "EXPORT"],
  }).notNull(),
  module: text("module", {
    enum: [
      "AUTENTIKASI",
      "AKADEMIK_NILAI",
      "PRESENSI",
      "BUKU_POIN",
      "KONSELING_BK",
      "E_RAPOR",
      "MANAJEMEN_PENGGUNA",
      "SISTEM",
    ],
  }).notNull(),
  targetId: text("target_id"),
  targetName: text("target_name"),
  description: text("description").notNull(),
  details: text("details"), // JSON payload snapshot (before/after/metadata)
  ipAddress: text("ip_address"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("activity_logs_user_idx").on(table.userId),
  index("activity_logs_module_idx").on(table.module),
  index("activity_logs_action_idx").on(table.action),
  index("activity_logs_created_at_idx").on(table.createdAt),
]);

// ============================================================
// Type exports
// ============================================================
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;
export type AttendanceRecord = typeof attendance.$inferSelect;
export type NewAttendanceRecord = typeof attendance.$inferInsert;
export type SpkCriteriaRow = typeof spkCriteria.$inferSelect;
export type SpkScoreRow = typeof spkScores.$inferSelect;
export type SpkGradingCategoryRow = typeof spkGradingCategories.$inferSelect;
export type SpkPublishStatusRow = typeof spkPublishStatus.$inferSelect;
export type SpkResultRow = typeof spkResults.$inferSelect;
export type ViolationType = typeof violationTypes.$inferSelect;
export type NewViolationType = typeof violationTypes.$inferInsert;
export type StudentViolation = typeof studentViolations.$inferSelect;
export type NewStudentViolation = typeof studentViolations.$inferInsert;
export type WarningLetter = typeof warningLetters.$inferSelect;
export type NewWarningLetter = typeof warningLetters.$inferInsert;
export type CounselingSession = typeof counselingSessions.$inferSelect;
export type NewCounselingSession = typeof counselingSessions.$inferInsert;
export type StudentMonitoringLog = typeof studentMonitoringLogs.$inferSelect;
export type NewStudentMonitoringLog = typeof studentMonitoringLogs.$inferInsert;
export type DispensationLetter = typeof dispensationLetters.$inferSelect;
export type NewDispensationLetter = typeof dispensationLetters.$inferInsert;
export type CurriculumTarget = typeof curriculumTargets.$inferSelect;
export type NewCurriculumTarget = typeof curriculumTargets.$inferInsert;
export type StudentReportNote = typeof studentReportNotes.$inferSelect;
export type NewStudentReportNote = typeof studentReportNotes.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
