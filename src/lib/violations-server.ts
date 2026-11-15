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
  evaluateSanctionTier,
} from "./violations";

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

  // Catatan pelanggaran siswa
  const rawViolations = await db
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
    .orderBy(desc(studentViolations.tanggal), desc(studentViolations.createdAt));

  // Surat peringatan siswa
  const letters = await db
    .select()
    .from(warningLetters)
    .where(eq(warningLetters.studentId, studentId))
    .orderBy(desc(warningLetters.tingkatSp), desc(warningLetters.tanggalTerbit));

  const totalPoints = rawViolations.reduce((sum, v) => sum + (v.poin || 0), 0);
  const tier = evaluateSanctionTier(totalPoints);

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
  const classStudents = await query;

  // Tarik seluruh pelanggaran aktif
  const allViolations = await db
    .select({
      id: studentViolations.id,
      studentId: studentViolations.studentId,
      poin: studentViolations.poin,
      kategori: violationTypes.kategori,
      status: studentViolations.status,
    })
    .from(studentViolations)
    .leftJoin(violationTypes, eq(studentViolations.violationTypeId, violationTypes.id));

  // Tarik seluruh surat peringatan
  const allLetters = await db.select().from(warningLetters);

  // Petakan poin dan SP ke tiap siswa
  const pointsMap = new Map<string, number>();
  const violationsCountMap = new Map<string, number>();

  for (const v of allViolations) {
    pointsMap.set(v.studentId, (pointsMap.get(v.studentId) || 0) + (v.poin || 0));
    violationsCountMap.set(v.studentId, (violationsCountMap.get(v.studentId) || 0) + 1);
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
    const tier = evaluateSanctionTier(totalPoints);
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

  // Urutkan siswa dari poin pelanggaran tertinggi ke terendah
  studentRows.sort((a, b) => b.totalPoints - a.totalPoints || a.namaLengkap.localeCompare(b.namaLengkap));

  // Statistik kelas
  const totalStudents = studentRows.length;
  const studentsWithPoints = studentRows.filter((s) => s.totalPoints > 0).length;
  const studentsNeedIntervention = studentRows.filter((s) => s.totalPoints >= SANCTION_THRESHOLDS.PEMBINAAN_LISAN).length;
  const spRecommendedCount = studentRows.filter((s) => s.totalPoints >= SANCTION_THRESHOLDS.SP_1).length;

  return {
    kelas: kelas || "Semua Kelas",
    totalStudents,
    studentsWithPoints,
    studentsNeedIntervention,
    spRecommendedCount,
    students: studentRows,
  };
}

