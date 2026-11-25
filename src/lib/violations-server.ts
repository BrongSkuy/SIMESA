import { db } from "@/db";
import {
  studentViolations,
  violationTypes,
  warningLetters,
  students,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  SANCTION_THRESHOLDS,
  THRESHOLDS_CONFIG_CODE,
  evaluateSanctionTier,
  calculateActiveViolationPoints,
  validateSanctionThresholds,
  type SanctionThresholds,
} from "./violations";

/**
 * Membaca konfigurasi ambang batas meter poin dari database (fallback ke default 30/50/75/100).
 */
export async function getSanctionThresholds(): Promise<SanctionThresholds> {
  try {
    const [configRow] = await db
      .select({ deskripsiSanksi: violationTypes.deskripsiSanksi })
      .from(violationTypes)
      .where(eq(violationTypes.kode, THRESHOLDS_CONFIG_CODE))
      .limit(1);

    if (configRow?.deskripsiSanksi) {
      const parsed = JSON.parse(configRow.deskripsiSanksi);
      const checked = validateSanctionThresholds(parsed);
      if (checked.valid) {
        return checked.data;
      }
    }
  } catch {
    // fallback ke default jika belum dikonfigurasi
  }
  return { ...SANCTION_THRESHOLDS };
}

/**
 * Mengambil profil kedisiplinan dan riwayat lengkap buku poin siswa (Server Only)
 */
export async function getStudentDisciplinaryProfile(studentId: string) {
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  if (!student) return null;

  const [rawViolations, letters, thresholds] = await Promise.all([
    db
      .select({
        id: studentViolations.id,
        studentId: studentViolations.studentId,
        violationTypeId: studentViolations.violationTypeId,
        reportedBy: studentViolations.reportedBy,
        tanggal: studentViolations.tanggal,
        poin: studentViolations.poin,
        lokasi: studentViolations.lokasi,
        keterangan: studentViolations.keterangan,
        status: studentViolations.status,
        tindakLanjut: studentViolations.tindakLanjut,
        createdAt: studentViolations.createdAt,
        namaPelanggaran: violationTypes.namaPelanggaran,
        kodePelanggaran: violationTypes.kode,
        kategori: violationTypes.kategori,
        deskripsiSanksi: violationTypes.deskripsiSanksi,
      })
      .from(studentViolations)
      .leftJoin(violationTypes, eq(studentViolations.violationTypeId, violationTypes.id))
      .where(eq(studentViolations.studentId, studentId))
      .orderBy(desc(studentViolations.tanggal), desc(studentViolations.createdAt)),
    db
      .select()
      .from(warningLetters)
      .where(eq(warningLetters.studentId, studentId))
      .orderBy(desc(warningLetters.tingkatSp), desc(warningLetters.tanggalTerbit)),
    getSanctionThresholds(),
  ]);

  // Hanya pelanggaran aktif (belum Selesai Dibina) yang dihitung ke totalPoints
  const totalPoints = calculateActiveViolationPoints(rawViolations);
  const tier = evaluateSanctionTier(totalPoints, thresholds);

  const breakdown = {
    ringan: rawViolations.filter((v) => v.kategori === "Ringan").length,
    sedang: rawViolations.filter((v) => v.kategori === "Sedang").length,
    berat: rawViolations.filter((v) => v.kategori === "Berat").length,
    selesaiDibina: rawViolations.filter((v) => v.status === "Selesai Dibina").length,
  };

  return {
    student: {
      id: student.id,
      nis: student.nis,
      namaLengkap: student.namaLengkap,
      kelas: student.kelas,
      angkatan: student.angkatan,
      jenisKelamin: student.jenisKelamin,
      foto: student.foto,
    },
    totalPoints,
    thresholds,
    tier,
    breakdown,
    violations: rawViolations,
    warningLetters: letters,
  };
}

/**
 * Ringkasan kedisiplinan dan buku poin per kelas (Server Only)
 */
export async function getClassDisciplineSummary(kelas?: string) {
  let query = db.select().from(students);
  if (kelas && kelas !== "all") {
    // @ts-expect-error drizzle query builder condition
    query = query.where(eq(students.kelas, kelas));
  }

  const [classStudents, allViolations, allLetters, thresholds] = await Promise.all([
    query,
    db
      .select({
        id: studentViolations.id,
        studentId: studentViolations.studentId,
        poin: studentViolations.poin,
        kategori: violationTypes.kategori,
        status: studentViolations.status,
      })
      .from(studentViolations)
      .leftJoin(violationTypes, eq(studentViolations.violationTypeId, violationTypes.id)),
    db.select().from(warningLetters),
    getSanctionThresholds(),
  ]);

  // Petakan poin AKTIF (status !== "Selesai Dibina") dan jumlah kasus ke tiap siswa
  const pointsMap = new Map<string, number>();
  const violationsCountMap = new Map<string, number>();

  for (const v of allViolations) {
    violationsCountMap.set(v.studentId, (violationsCountMap.get(v.studentId) || 0) + 1);
    if (v.status !== "Selesai Dibina") {
      pointsMap.set(v.studentId, (pointsMap.get(v.studentId) || 0) + (v.poin || 0));
    }
  }

  const latestLetterMap = new Map<string, typeof allLetters[0]>();
  for (const l of allLetters) {
    const existing = latestLetterMap.get(l.studentId);
    if (!existing || l.tingkatSp > existing.tingkatSp) {
      latestLetterMap.set(l.studentId, l);
    }
  }

  const studentRows = classStudents.map((s) => {
    const totalPoints = pointsMap.get(s.id) || 0;
    const totalViolations = violationsCountMap.get(s.id) || 0;
    const tier = evaluateSanctionTier(totalPoints, thresholds);
    const latestLetter = latestLetterMap.get(s.id) || null;

    return {
      studentId: s.id,
      nis: s.nis,
      namaLengkap: s.namaLengkap,
      kelas: s.kelas,
      jenisKelamin: s.jenisKelamin,
      totalPoints,
      totalViolations,
      tier,
      latestLetter,
    };
  });

  // Urutkan siswa dari poin pelanggaran aktif tertinggi ke terendah
  studentRows.sort((a, b) => b.totalPoints - a.totalPoints || a.namaLengkap.localeCompare(b.namaLengkap));

  // Statistik kelas berdasarkan ambang batas dinamis sekolah
  const totalStudents = studentRows.length;
  const studentsWithPoints = studentRows.filter((s) => s.totalPoints > 0).length;
  const studentsNeedIntervention = studentRows.filter(
    (s) => s.totalPoints >= thresholds.PEMBINAAN_LISAN
  ).length;
  const spRecommendedCount = studentRows.filter(
    (s) => s.totalPoints >= thresholds.SP_1
  ).length;

  return {
    kelas: kelas || "Semua Kelas",
    thresholds,
    totalStudents,
    studentsWithPoints,
    studentsNeedIntervention,
    spRecommendedCount,
    students: studentRows,
  };
}

