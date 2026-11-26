import { NextResponse } from "next/server";
import { z } from "zod";
import { AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/audit";
import { APP_ROLES } from "@/lib/rbac";
import {
  CASE_STATUSES,
  CONFIDENTIALITY_LEVELS,
  COUNSELING_CATEGORIES,
  COUNSELING_SERVICES,
  DISPENSATION_REASONS,
  DISPENSATION_STATUSES,
  MONITORING_ASPECTS,
} from "@/lib/counseling";

const nonEmptyTrimmed = (message: string, maxLen = 255) =>
  z
    .string({ error: message })
    .trim()
    .min(1, message)
    .max(maxLen, `Maksimal ${maxLen} karakter`);

const optionalTrimmed = (maxLen = 1000) =>
  z
    .string()
    .trim()
    .max(maxLen)
    .nullish()
    .transform((v) =>
      v === null || v === undefined || v === "" ? undefined : v
    );

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

/**
 * Mem-parse dan memvalidasi JSON body menggunakan schema Zod.
 * Mengembalikan NextResponse 400 terstruktur bila payload rusak atau tidak memenuhi skema.
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Format payload JSON tidak valid" },
        { status: 400 }
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    const firstMessage = issues[0]?.message || "Data yang dikirim tidak valid";
    return {
      success: false,
      response: NextResponse.json(
        { error: firstMessage, details: issues },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: parsed.data };
}

// ============================================================
// 1. Attendance & Presensi
// ============================================================
export const attendanceStatusSchema = z.enum(["Hadir", "Izin", "Sakit", "Alfa"], {
  error: "Terdapat ID siswa atau status kehadiran yang tidak valid.",
});

export const attendancePostSchema = z.object({
  tanggal: z
    .string({ error: "Tanggal presensi wajib diisi" })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  mapel: optionalTrimmed(120),
  records: z
    .array(
      z.object({
        studentId: nonEmptyTrimmed(
          "Terdapat ID siswa atau status kehadiran yang tidak valid.",
          100
        ),
        status: attendanceStatusSchema,
      }),
      { error: "Data absensi tidak valid" }
    )
    .min(1, "Data absensi tidak valid"),
});

// ============================================================
// 2. Audit Logs & Login Security
// ============================================================
export const auditLogPostSchema = z.object({
  action: z.enum(AUDIT_ACTIONS, {
    error: "Nilai action atau module tidak valid",
  }),
  module: z.enum(AUDIT_MODULES, {
    error: "Nilai action atau module tidak valid",
  }),
  targetId: optionalTrimmed(120),
  targetName: optionalTrimmed(200),
  description: nonEmptyTrimmed(
    "Parameter action, module, dan description wajib diisi",
    1000
  ),
  details: z.union([z.string(), z.record(z.string(), z.unknown())]).nullish(),
});

export const loginSecurityPostSchema = z.object({
  action: z.enum(["failed", "reset"], {
    error: "Aksi tidak dikenali. Gunakan 'failed' atau 'reset'.",
  }),
  identifier: nonEmptyTrimmed("Identifier wajib disertakan", 160),
});

// ============================================================
// 3. Auth Accounts & User Profile
// ============================================================
export const authAccountCreateSchema = z.object({
  name: nonEmptyTrimmed("Nama lengkap wajib diisi", 120),
  username: z
    .string({ error: "Username login minimal harus 4 karakter" })
    .trim()
    .min(4, "Username login minimal harus 4 karakter")
    .max(80, "Username login maksimal 80 karakter"),
  password: z
    .string({ error: "Kata sandi awal minimal harus 4 karakter" })
    .trim()
    .min(4, "Kata sandi awal minimal harus 4 karakter")
    .max(128, "Kata sandi maksimal 128 karakter"),
  appRole: z
    .string({ error: "Peran utama yang dipilih tidak valid" })
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(
      z.enum(APP_ROLES, {
        error: "Peran utama yang dipilih tidak valid",
      })
    ),
  additionalRoles: z.array(z.string()).optional(),
  email: z.string().trim().max(160).nullish(),
  jenisKelamin: z.enum(["L", "P"]).optional(),
  waliKelasTarget: optionalTrimmed(80),
});

export const authAccountEditSchema = z.object({
  name: nonEmptyTrimmed("Nama wajib diisi", 120),
  username: z.string().trim().max(80).nullish(),
  appRole: z.string().trim().max(40).optional(),
  additionalRoles: z.array(z.string()).optional(),
  waliKelasTarget: optionalTrimmed(80),
});

export const authAccountResetPasswordSchema = z.object({
  newPassword: z
    .string({ error: "Password baru wajib diisi minimal 4 karakter" })
    .trim()
    .min(4, "Password baru wajib diisi minimal 4 karakter")
    .max(128, "Password baru maksimal 128 karakter"),
});

export const authAccountStatusSchema = z.object({
  banned: z.boolean({ error: "Status penangguhan harus berupa boolean" }),
});

export const userProfilePatchSchema = z.object({
  name: z.string().trim().min(1, "Nama lengkap tidak boleh kosong").max(120, "Nama lengkap maksimal 120 karakter").optional(),
  image: z.union([z.string(), z.null()]).optional(),
});

// ============================================================
// 4. Classes, Subjects, Students, Teachers, Academic Years
// ============================================================
export const classCreateSchema = z.object({
  namaKelas: nonEmptyTrimmed("Nama kelas dan tingkat wajib diisi", 80),
  tingkat: nonEmptyTrimmed("Nama kelas dan tingkat wajib diisi", 40),
  waliKelas: optionalTrimmed(120),
});

export const classUpdateSchema = classCreateSchema;

export const subjectCreateSchema = z.object({
  namaMapel: nonEmptyTrimmed("Nama pelajaran wajib diisi", 120),
  teacherId: optionalTrimmed(100),
  kelasDiampu: optionalTrimmed(500),
});

export const subjectUpdateSchema = z.object({
  namaMapel: nonEmptyTrimmed("Nama mata pelajaran wajib diisi", 120),
  teacherId: optionalTrimmed(100),
  kelasDiampu: optionalTrimmed(500),
});

export const studentCreateSchema = z.object({
  nis: z
    .string({ error: "Semua field wajib diisi" })
    .trim()
    .min(4, "NIS minimal 4 karakter (digunakan sebagai kata sandi default)")
    .max(40, "NIS maksimal 40 karakter"),
  namaLengkap: nonEmptyTrimmed("Semua field wajib diisi", 120),
  kelas: nonEmptyTrimmed("Semua field wajib diisi", 80),
  angkatan: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).pipe(z.string().min(1, "Semua field wajib diisi").max(20)),
  jenisKelamin: z.enum(["L", "P"], { error: "Jenis kelamin harus 'L' atau 'P'" }),
  foto: z.string().nullish(),
});

export const studentUpdateSchema = z.object({
  nis: z.string().trim().min(4, "NIS minimal 4 karakter").max(40).optional(),
  namaLengkap: nonEmptyTrimmed("Nama lengkap wajib diisi", 120),
  kelas: nonEmptyTrimmed("Kelas wajib diisi", 80),
  angkatan: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).pipe(z.string().min(1, "Angkatan wajib diisi").max(20)),
  jenisKelamin: z.enum(["L", "P"], { error: "Jenis kelamin harus 'L' atau 'P'" }),
  status: optionalTrimmed(30),
  foto: z.string().nullish(),
});

export const studentBulkSchema = z.object({
  students: z
    .array(
      z.object({
        nis: z.union([z.string(), z.number()]).transform((v) => String(v ?? "")),
        namaLengkap: z.union([z.string(), z.number()]).transform((v) => String(v ?? "")),
        kelas: z.union([z.string(), z.number()]).transform((v) => String(v ?? "")),
        angkatan: z.union([z.string(), z.number()]).transform((v) => String(v ?? "")),
        jenisKelamin: z.union([z.string(), z.number()]).transform((v) => String(v ?? "")),
      }),
      { error: "Data siswa kosong" }
    )
    .min(1, "Data siswa kosong")
    .max(2000, "Maksimal 2000 data siswa per impor"),
});

export const teacherCreateSchema = z.object({
  nip: z
    .string({ error: "NIP dan nama wajib diisi" })
    .trim()
    .min(4, "NIP minimal harus 4 karakter (untuk keamanan password)")
    .max(50, "NIP maksimal 50 karakter"),
  namaLengkap: nonEmptyTrimmed("NIP dan nama wajib diisi", 120),
  jenisKelamin: z.enum(["L", "P"]).optional(),
  foto: z.string().nullish(),
});

export const teacherUpdateSchema = z.object({
  nip: z.string().trim().min(4, "NIP minimal 4 karakter").max(50).optional(),
  namaLengkap: nonEmptyTrimmed("Nama lengkap wajib diisi", 120),
  jenisKelamin: z.enum(["L", "P"]).optional(),
  status: optionalTrimmed(30),
  foto: z.string().nullish(),
});

export const academicYearCreateSchema = z.object({
  tahunAjaran: nonEmptyTrimmed("Tahun ajaran dan semester wajib diisi", 30),
  semester: z.enum(["Ganjil", "Genap"], {
    error: "Semester harus bernilai 'Ganjil' atau 'Genap'",
  }),
  isActive: z.boolean().optional(),
});

export const academicYearUpdateSchema = z.object({
  id: nonEmptyTrimmed("ID wajib diisi", 100),
  tahunAjaran: z.string().trim().min(1).max(30).optional(),
  semester: z.enum(["Ganjil", "Genap"]).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================
// 5. SPK, Nilai & E-Rapor / Curriculum
// ============================================================
export const spkCriteriaPutSchema = z
  .array(
    z.object({
      id: nonEmptyTrimmed("ID kriteria wajib diisi", 100),
      bobot: z
        .number({ error: "Setiap bobot kriteria harus bernilai antara 0% hingga 100%" })
        .finite("Setiap bobot kriteria harus bernilai antara 0% hingga 100%")
        .min(0, "Setiap bobot kriteria harus bernilai antara 0% hingga 100%")
        .max(100, "Setiap bobot kriteria harus bernilai antara 0% hingga 100%"),
    }),
    { error: "Data bobot kriteria tidak valid" }
  )
  .min(1, "Data bobot kriteria tidak valid");

export const spkScoresPostSchema = z.object({
  kelas: nonEmptyTrimmed("Data nilai tidak valid", 80),
  criteriaId: nonEmptyTrimmed("Data nilai tidak valid", 100),
  mapel: optionalTrimmed(120),
  categories: z.array(z.string().trim().max(80)).optional(),
  records: z.array(
    z.object({
      studentId: nonEmptyTrimmed("ID siswa wajib diisi", 100),
      details: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
    }),
    { error: "Data nilai tidak valid" }
  ),
});

export const spkPublishPostSchema = z.object({
  periode: nonEmptyTrimmed("Parameter periode wajib", 60),
  bypassValidation: z.boolean().optional(),
});

export const spkArchivePostSchema = z.object({
  namaFile: nonEmptyTrimmed("Nama file dan konten file wajib diisi", 255),
  pathFile: nonEmptyTrimmed("Nama file dan konten file wajib diisi", 20_000_000),
  periode: optionalTrimmed(60),
});

export const eraporStatusSchema = z.enum(["Draf", "Disahkan", "Diterbitkan"], {
  error: "Status rapor tujuan tidak valid",
});

export const eraporNotePostSchema = z.object({
  studentId: nonEmptyTrimmed("ID Siswa wajib diisi", 100),
  periode: optionalTrimmed(60),
  catatanWaliKelas: optionalTrimmed(2000),
  ekskulNama: optionalTrimmed(200),
  ekskulNilai: optionalTrimmed(60),
  ekskulKeterangan: optionalTrimmed(1000),
  statusRapor: eraporStatusSchema.optional(),
});

export const eraporPublishClassSchema = z.object({
  kelas: nonEmptyTrimmed("Nama kelas wajib dipilih", 80),
  targetStatus: eraporStatusSchema,
  periode: optionalTrimmed(60),
});

export const curriculumPostSchema = z.object({
  type: z.enum(["default", "subject"]).optional(),
  mapel: optionalTrimmed(120),
  kkm: z.union([z.number(), z.string()]).nullish(),
  resetToDefault: z.boolean().optional(),
  tingkat: optionalTrimmed(40),
  capaianKompetensi: optionalTrimmed(1000),
});

// ============================================================
// 6. Counseling BK & Dispensations
// ============================================================
export const counselingSessionCreateSchema = z.object({
  studentId: nonEmptyTrimmed("Semua kolom bertanda bintang wajib diisi", 100),
  tanggal: nonEmptyTrimmed("Semua kolom bertanda bintang wajib diisi", 30),
  waktuMulai: nonEmptyTrimmed("Semua kolom bertanda bintang wajib diisi", 20),
  waktuSelesai: nonEmptyTrimmed("Semua kolom bertanda bintang wajib diisi", 20),
  kategori: z.enum(COUNSELING_CATEGORIES, {
    error: "Kategori konseling tidak valid",
  }),
  jenisLayanan: z.enum(COUNSELING_SERVICES, {
    error: "Jenis layanan konseling tidak valid",
  }),
  tingkatKerahasiaan: z.enum(CONFIDENTIALITY_LEVELS).optional(),
  pokokMasalah: nonEmptyTrimmed("Semua kolom bertanda bintang wajib diisi", 2000),
  pendekatanKonseling: optionalTrimmed(2000),
  hasilKonseling: optionalTrimmed(2000),
  tindakLanjut: optionalTrimmed(2000),
  statusKasus: z.enum(CASE_STATUSES).optional(),
  counselorNameCustom: optionalTrimmed(120),
  createDispensation: z.boolean().optional(),
});

export const counselingSessionPatchSchema = z.object({
  tanggal: z.string().trim().min(1).max(30).optional(),
  waktuMulai: z.string().trim().min(1).max(20).optional(),
  waktuSelesai: z.string().trim().min(1).max(20).optional(),
  kategori: z.enum(COUNSELING_CATEGORIES).optional(),
  jenisLayanan: z.enum(COUNSELING_SERVICES).optional(),
  tingkatKerahasiaan: z.enum(CONFIDENTIALITY_LEVELS).optional(),
  pokokMasalah: z.string().trim().min(1).max(2000).optional(),
  pendekatanKonseling: optionalTrimmed(2000),
  hasilKonseling: optionalTrimmed(2000),
  tindakLanjut: optionalTrimmed(2000),
  statusKasus: z.enum(CASE_STATUSES).optional(),
});

export const monitoringCreateSchema = z.object({
  studentId: nonEmptyTrimmed(
    "Siswa, aspek pengamatan, dan catatan perkembangan wajib diisi",
    100
  ),
  tanggal: optionalTrimmed(30),
  aspekPengamatan: z.enum(MONITORING_ASPECTS, {
    error: "Aspek pengamatan tidak valid",
  }),
  catatanPerkembangan: nonEmptyTrimmed(
    "Siswa, aspek pengamatan, dan catatan perkembangan wajib diisi",
    2000
  ),
  rekomendasi: optionalTrimmed(2000),
  recordedByCustom: optionalTrimmed(120),
});

export const dispensationCreateSchema = z.object({
  studentId: nonEmptyTrimmed("Semua kolom bertanda bintang wajib diisi", 100),
  tanggal: optionalTrimmed(30),
  jamMulai: nonEmptyTrimmed("Semua kolom bertanda bintang wajib diisi", 20),
  jamSelesai: nonEmptyTrimmed("Semua kolom bertanda bintang wajib diisi", 20),
  keperluan: z.enum(DISPENSATION_REASONS, {
    error: "Keperluan dispensasi tidak valid",
  }),
  keterangan: optionalTrimmed(1000),
  diterbitkanOlehCustom: optionalTrimmed(120),
});

export const dispensationPatchSchema = z.object({
  id: nonEmptyTrimmed("ID surat dan status baru wajib ditentukan", 100),
  statusDispensasi: z.enum(DISPENSATION_STATUSES, {
    error: "Status dispensasi tidak valid",
  }),
  keterangan: optionalTrimmed(1000),
});

// ============================================================
// 7. Violations & Warning Letters
// ============================================================
export const violationCreateSchema = z.object({
  studentId: nonEmptyTrimmed("Siswa dan jenis pelanggaran wajib diisi", 100),
  violationTypeId: nonEmptyTrimmed("Siswa dan jenis pelanggaran wajib diisi", 100),
  tanggal: optionalTrimmed(30),
  poin: z
    .number()
    .int("Poin pelanggaran harus berupa bilangan bulat")
    .min(0, "Poin pelanggaran minimal 0")
    .max(500, "Poin pelanggaran maksimal 500")
    .nullish(),
  lokasi: optionalTrimmed(200),
  keterangan: optionalTrimmed(2000),
  reportedByCustom: optionalTrimmed(120),
});

export const violationPatchSchema = z.object({
  status: z.enum(["Tercatat", "Diproses BK", "Selesai Dibina"]).optional(),
  tindakLanjut: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v ?? undefined),
  poin: z
    .number()
    .int("Bobot poin harus berupa bilangan bulat antara 1 sampai 100")
    .min(1, "Bobot poin harus berupa bilangan bulat antara 1 sampai 100")
    .max(100, "Bobot poin harus berupa bilangan bulat antara 1 sampai 100")
    .optional(),
  keterangan: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v ?? undefined),
  lokasi: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v ?? undefined),
});

export const violationTypePostSchema = z.object({
  id: optionalTrimmed(100),
  kode: nonEmptyTrimmed("Kode, nama pelanggaran, dan kategori wajib diisi", 40),
  namaPelanggaran: nonEmptyTrimmed(
    "Kode, nama pelanggaran, dan kategori wajib diisi",
    200
  ),
  kategori: z.enum(["Ringan", "Sedang", "Berat"], {
    error: "Kategori pelanggaran harus Ringan, Sedang, atau Berat",
  }),
  poinDefault: z
    .union([z.number(), z.string()], {
      error: "Bobot poin baku harus berupa bilangan bulat antara 1 sampai 100",
    })
    .transform((v) => Number(v))
    .pipe(
      z
        .number({
          error: "Bobot poin baku harus berupa bilangan bulat antara 1 sampai 100",
        })
        .int("Bobot poin baku harus berupa bilangan bulat antara 1 sampai 100")
        .min(1, "Bobot poin baku harus berupa bilangan bulat antara 1 sampai 100")
        .max(100, "Bobot poin baku harus berupa bilangan bulat antara 1 sampai 100")
    ),
  deskripsiSanksi: optionalTrimmed(1000),
});

const thresholdNumberSchema = z
  .union([z.number(), z.string()], {
    error: "Nilai ambang batas harus berupa bilangan bulat",
  })
  .transform((v) => Number(v))
  .pipe(
    z
      .number({ error: "Nilai ambang batas harus berupa bilangan bulat" })
      .int("Nilai ambang batas harus berupa bilangan bulat")
      .min(1, "Nilai ambang batas minimal 1")
      .max(1000, "Nilai ambang batas maksimal 1000")
  );

export const violationThresholdsPostSchema = z.union([
  z.object({
    resetToDefault: z.literal(true),
  }),
  z.object({
    resetToDefault: z.literal(false).optional(),
    PEMBINAAN_LISAN: thresholdNumberSchema,
    SP_1: thresholdNumberSchema,
    SP_2: thresholdNumberSchema,
    SP_3: thresholdNumberSchema,
  }),
]);

export const warningLetterPostSchema = z.object({
  studentId: nonEmptyTrimmed("Siswa dan tingkat SP wajib ditentukan", 100),
  tingkatSp: z
    .union([z.number(), z.string()])
    .transform((v) => Number(v))
    .pipe(z.number().int().min(1, "Tingkat SP harus 1, 2, atau 3").max(3, "Tingkat SP harus 1, 2, atau 3")),
  tanggalTerbit: optionalTrimmed(30),
  nomorSuratCustom: optionalTrimmed(120),
  statusPanggilan: z
    .enum(["Menunggu Panggilan", "Hadir", "Tidak Hadir"])
    .optional(),
  catatanMediasi: optionalTrimmed(2000),
});
