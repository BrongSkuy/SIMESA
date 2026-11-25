import { db } from "@/db";
import {
  counselingSessions,
  studentMonitoringLogs,
  dispensationLetters,
  students,
  studentViolations,
  warningLetters,
} from "@/db/schema";
import { eq, desc, and, or, like, sql } from "drizzle-orm";
import {
  generateDispensationDocNumber,
  CounselingSessionItem,
  StudentMonitoringLogItem,
  DispensationLetterItem,
  CounselingOverviewSummary,
  CounselingCategory,
  CaseStatus,
  MonitoringAspect,
  DispensationReason,
  DispensationStatus,
  ConfidentialityLevel,
  CounselingService,
} from "./counseling";
import { calculateActiveViolationPoints } from "./violations";

/**
 * Mengambil ringkasan statistik layanan konseling untuk StatCard
 */
export async function getCounselingOverviewSummary(): Promise<CounselingOverviewSummary> {
  const allSessions = await db.select().from(counselingSessions);
  const allDispensations = await db.select().from(dispensationLetters);

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const totalSesiBulanIni = allSessions.filter((s) => s.tanggal.startsWith(currentMonthStr)).length;
  const totalDalamPemantauan = allSessions.filter((s) => s.statusKasus === "Dalam Pemantauan").length;
  const totalSelesai = allSessions.filter((s) => s.statusKasus === "Selesai").length;
  const totalDispensasiHariIni = allDispensations.filter(
    (d) => d.tanggal === todayStr && d.statusDispensasi === "Aktif"
  ).length;

  return {
    totalSesiBulanIni,
    totalDalamPemantauan,
    totalSelesai,
    totalDispensasiHariIni,
  };
}

/**
 * Mengambil daftar sesi konseling dengan filter dan relasi siswa
 */
export async function getCounselingSessions(filters: {
  search?: string;
  kategori?: string;
  statusKasus?: string;
  kelas?: string;
  studentId?: string;
  canViewConfidential?: boolean;
}): Promise<CounselingSessionItem[]> {
  const query = db
    .select({
      id: counselingSessions.id,
      studentId: counselingSessions.studentId,
      counselorId: counselingSessions.counselorId,
      tanggal: counselingSessions.tanggal,
      waktuMulai: counselingSessions.waktuMulai,
      waktuSelesai: counselingSessions.waktuSelesai,
      kategori: counselingSessions.kategori,
      jenisLayanan: counselingSessions.jenisLayanan,
      tingkatKerahasiaan: counselingSessions.tingkatKerahasiaan,
      pokokMasalah: counselingSessions.pokokMasalah,
      pendekatanKonseling: counselingSessions.pendekatanKonseling,
      hasilKonseling: counselingSessions.hasilKonseling,
      tindakLanjut: counselingSessions.tindakLanjut,
      statusKasus: counselingSessions.statusKasus,
      createdAt: counselingSessions.createdAt,
      studentName: students.namaLengkap,
      studentNis: students.nis,
      studentKelas: students.kelas,
    })
    .from(counselingSessions)
    .innerJoin(students, eq(counselingSessions.studentId, students.id))
    .orderBy(desc(counselingSessions.tanggal), desc(counselingSessions.createdAt));

  const rows = await query;

  return rows
    .filter((row) => {
      // Pembatasan asas kerahasiaan: jika bukan Guru BK / Kepsek / Admin, jangan tampilkan catatan rahasia
      if (!filters.canViewConfidential && row.tingkatKerahasiaan === "Rahasia") {
        return false;
      }

      if (filters.studentId && row.studentId !== filters.studentId) {
        return false;
      }

      if (filters.kelas && filters.kelas !== "all" && row.studentKelas !== filters.kelas) {
        return false;
      }

      if (filters.kategori && filters.kategori !== "all" && row.kategori !== filters.kategori) {
        return false;
      }

      if (filters.statusKasus && filters.statusKasus !== "all" && row.statusKasus !== filters.statusKasus) {
        return false;
      }

      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchName = row.studentName?.toLowerCase().includes(q);
        const matchNis = row.studentNis?.toLowerCase().includes(q);
        const matchIssue = row.pokokMasalah?.toLowerCase().includes(q);
        if (!matchName && !matchNis && !matchIssue) {
          return false;
        }
      }

      return true;
    })
    .map((row) => ({
      ...row,
      kategori: row.kategori as CounselingCategory,
      jenisLayanan: row.jenisLayanan as CounselingService,
      tingkatKerahasiaan: row.tingkatKerahasiaan as ConfidentialityLevel,
      statusKasus: row.statusKasus as CaseStatus,
      counselorName: row.counselorId,
    }));
}

/**
 * Mengambil detail satu sesi konseling
 */
export async function getCounselingSessionById(id: string) {
  const [row] = await db
    .select({
      id: counselingSessions.id,
      studentId: counselingSessions.studentId,
      counselorId: counselingSessions.counselorId,
      tanggal: counselingSessions.tanggal,
      waktuMulai: counselingSessions.waktuMulai,
      waktuSelesai: counselingSessions.waktuSelesai,
      kategori: counselingSessions.kategori,
      jenisLayanan: counselingSessions.jenisLayanan,
      tingkatKerahasiaan: counselingSessions.tingkatKerahasiaan,
      pokokMasalah: counselingSessions.pokokMasalah,
      pendekatanKonseling: counselingSessions.pendekatanKonseling,
      hasilKonseling: counselingSessions.hasilKonseling,
      tindakLanjut: counselingSessions.tindakLanjut,
      statusKasus: counselingSessions.statusKasus,
      createdAt: counselingSessions.createdAt,
      studentName: students.namaLengkap,
      studentNis: students.nis,
      studentKelas: students.kelas,
    })
    .from(counselingSessions)
    .innerJoin(students, eq(counselingSessions.studentId, students.id))
    .where(eq(counselingSessions.id, id))
    .limit(1);

  return row || null;
}

/**
 * Mencatat sesi konseling baru (dengan opsi otomatis terbitkan dispensasi)
 */
export async function createCounselingSession(data: {
  studentId: string;
  counselorId: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  kategori: CounselingCategory;
  jenisLayanan: CounselingService;
  tingkatKerahasiaan?: ConfidentialityLevel;
  pokokMasalah: string;
  pendekatanKonseling?: string;
  hasilKonseling?: string;
  tindakLanjut?: string;
  statusKasus?: CaseStatus;
  createDispensation?: boolean;
}) {
  const [created] = await db
    .insert(counselingSessions)
    .values({
      studentId: data.studentId,
      counselorId: data.counselorId,
      tanggal: data.tanggal,
      waktuMulai: data.waktuMulai,
      waktuSelesai: data.waktuSelesai,
      kategori: data.kategori,
      jenisLayanan: data.jenisLayanan,
      tingkatKerahasiaan: data.tingkatKerahasiaan || "Umum",
      pokokMasalah: data.pokokMasalah,
      pendekatanKonseling: data.pendekatanKonseling || null,
      hasilKonseling: data.hasilKonseling || null,
      tindakLanjut: data.tindakLanjut || null,
      statusKasus: data.statusKasus || "Dalam Pemantauan",
    })
    .returning();

  let createdDispensation = null;
  if (data.createDispensation && created) {
    createdDispensation = await createDispensationLetter({
      studentId: data.studentId,
      tanggal: data.tanggal,
      jamMulai: data.waktuMulai,
      jamSelesai: data.waktuSelesai,
      keperluan: "Bimbingan Konseling",
      keterangan: `Mengikuti sesi bimbingan konseling di Ruang BK (${data.kategori})`,
      diterbitkanOleh: data.counselorId,
    });
  }

  return {
    session: created,
    dispensation: createdDispensation,
  };
}

/**
 * Memperbarui sesi konseling
 */
export async function updateCounselingSession(
  id: string,
  data: Partial<{
    kategori: CounselingCategory;
    jenisLayanan: CounselingService;
    tingkatKerahasiaan: ConfidentialityLevel;
    pokokMasalah: string;
    pendekatanKonseling: string;
    hasilKonseling: string;
    tindakLanjut: string;
    statusKasus: CaseStatus;
  }>
) {
  const [updated] = await db
    .update(counselingSessions)
    .set(data)
    .where(eq(counselingSessions.id, id))
    .returning();

  return updated;
}

/**
 * Menghapus sesi konseling
 */
export async function deleteCounselingSession(id: string) {
  await db.delete(counselingSessions).where(eq(counselingSessions.id, id));
  return true;
}

/**
 * Mengambil catatan log pemantauan perkembangan siswa
 */
export async function getStudentMonitoringLogs(filters: {
  studentId?: string;
  kelas?: string;
  aspekPengamatan?: string;
}): Promise<StudentMonitoringLogItem[]> {
  const rows = await db
    .select({
      id: studentMonitoringLogs.id,
      studentId: studentMonitoringLogs.studentId,
      recordedBy: studentMonitoringLogs.recordedBy,
      tanggal: studentMonitoringLogs.tanggal,
      aspekPengamatan: studentMonitoringLogs.aspekPengamatan,
      catatanPerkembangan: studentMonitoringLogs.catatanPerkembangan,
      rekomendasi: studentMonitoringLogs.rekomendasi,
      createdAt: studentMonitoringLogs.createdAt,
      studentName: students.namaLengkap,
      studentNis: students.nis,
      studentKelas: students.kelas,
    })
    .from(studentMonitoringLogs)
    .innerJoin(students, eq(studentMonitoringLogs.studentId, students.id))
    .orderBy(desc(studentMonitoringLogs.tanggal), desc(studentMonitoringLogs.createdAt));

  return rows
    .filter((row) => {
      if (filters.studentId && row.studentId !== filters.studentId) return false;
      if (filters.kelas && filters.kelas !== "all" && row.studentKelas !== filters.kelas) return false;
      if (filters.aspekPengamatan && filters.aspekPengamatan !== "all" && row.aspekPengamatan !== filters.aspekPengamatan) return false;
      return true;
    })
    .map((row) => ({
      ...row,
      aspekPengamatan: row.aspekPengamatan as MonitoringAspect,
      recorderName: row.recordedBy,
    }));
}

/**
 * Menambahkan catatan log pemantauan perkembangan siswa
 */
export async function createStudentMonitoringLog(data: {
  studentId: string;
  recordedBy: string;
  tanggal: string;
  aspekPengamatan: MonitoringAspect;
  catatanPerkembangan: string;
  rekomendasi?: string;
}) {
  const [created] = await db
    .insert(studentMonitoringLogs)
    .values({
      studentId: data.studentId,
      recordedBy: data.recordedBy,
      tanggal: data.tanggal,
      aspekPengamatan: data.aspekPengamatan,
      catatanPerkembangan: data.catatanPerkembangan,
      rekomendasi: data.rekomendasi || null,
    })
    .returning();

  return created;
}

/**
 * Mengambil daftar surat dispensasi kelas
 */
export async function getDispensationLetters(filters: {
  studentId?: string;
  kelas?: string;
  statusDispensasi?: string;
  tanggal?: string;
}): Promise<DispensationLetterItem[]> {
  const rows = await db
    .select({
      id: dispensationLetters.id,
      studentId: dispensationLetters.studentId,
      nomorSurat: dispensationLetters.nomorSurat,
      tanggal: dispensationLetters.tanggal,
      jamMulai: dispensationLetters.jamMulai,
      jamSelesai: dispensationLetters.jamSelesai,
      keperluan: dispensationLetters.keperluan,
      keterangan: dispensationLetters.keterangan,
      diterbitkanOleh: dispensationLetters.diterbitkanOleh,
      statusDispensasi: dispensationLetters.statusDispensasi,
      createdAt: dispensationLetters.createdAt,
      studentName: students.namaLengkap,
      studentNis: students.nis,
      studentKelas: students.kelas,
    })
    .from(dispensationLetters)
    .innerJoin(students, eq(dispensationLetters.studentId, students.id))
    .orderBy(desc(dispensationLetters.tanggal), desc(dispensationLetters.createdAt));

  return rows
    .filter((row) => {
      if (filters.studentId && row.studentId !== filters.studentId) return false;
      if (filters.kelas && filters.kelas !== "all" && row.studentKelas !== filters.kelas) return false;
      if (filters.statusDispensasi && filters.statusDispensasi !== "all" && row.statusDispensasi !== filters.statusDispensasi) return false;
      if (filters.tanggal && row.tanggal !== filters.tanggal) return false;
      return true;
    })
    .map((row) => ({
      ...row,
      keperluan: row.keperluan as DispensationReason,
      statusDispensasi: row.statusDispensasi as DispensationStatus,
      issuerName: row.diterbitkanOleh,
    }));
}

/**
 * Menerbitkan surat dispensasi resmi baru
 */
export async function createDispensationLetter(data: {
  studentId: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  keperluan: DispensationReason;
  keterangan?: string;
  diterbitkanOleh: string;
  statusDispensasi?: DispensationStatus;
  nomorSurat?: string;
}) {
  let docNumber = data.nomorSurat;
  if (!docNumber) {
    const totalCount = (await db.select().from(dispensationLetters)).length;
    docNumber = generateDispensationDocNumber(totalCount + 1, new Date());
  }

  const [created] = await db
    .insert(dispensationLetters)
    .values({
      studentId: data.studentId,
      nomorSurat: docNumber,
      tanggal: data.tanggal,
      jamMulai: data.jamMulai,
      jamSelesai: data.jamSelesai,
      keperluan: data.keperluan,
      keterangan: data.keterangan || null,
      diterbitkanOleh: data.diterbitkanOleh,
      statusDispensasi: data.statusDispensasi || "Aktif",
    })
    .returning();

  return created;
}

/**
 * Memperbarui status surat dispensasi
 */
export async function updateDispensationLetter(
  id: string,
  data: Partial<{
    statusDispensasi: DispensationStatus;
    keterangan: string;
  }>
) {
  const [updated] = await db
    .update(dispensationLetters)
    .set(data)
    .where(eq(dispensationLetters.id, id))
    .returning();

  return updated;
}

/**
 * Profil pembinaan bimbingan konseling dan kesiswaan per siswa
 */
export async function getStudentCounselingProfile(studentId: string, canViewConfidential: boolean = false) {
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  if (!student) return null;

  const sessions = await getCounselingSessions({ studentId, canViewConfidential });
  const logs = await getStudentMonitoringLogs({ studentId });
  const dispensations = await getDispensationLetters({ studentId });

  // Tarik riwayat buku poin kedisiplinan siswa (keterpaduan sistem)
  const rawViolations = await db
    .select({
      id: studentViolations.id,
      tanggal: studentViolations.tanggal,
      poin: studentViolations.poin,
      keterangan: studentViolations.keterangan,
      status: studentViolations.status,
    })
    .from(studentViolations)
    .where(eq(studentViolations.studentId, studentId))
    .orderBy(desc(studentViolations.tanggal));

  const totalPoinPelanggaran = calculateActiveViolationPoints(rawViolations);

  const letters = await db
    .select()
    .from(warningLetters)
    .where(eq(warningLetters.studentId, studentId))
    .orderBy(desc(warningLetters.tingkatSp));

  return {
    student,
    sessions,
    logs,
    dispensations,
    disciplinaryOverview: {
      totalPoinPelanggaran,
      totalPelanggaran: rawViolations.length,
      warningLetters: letters,
    },
  };
}
