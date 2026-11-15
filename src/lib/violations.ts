import { db } from "../db";
import {
  studentViolations,
  violationTypes,
  warningLetters,
  students,
} from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface SanctionTier {
  status: string;
  level: "aman" | "ringan" | "pembinaan" | "sp1" | "sp2" | "sp3";
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  recommendedSp: number | null; // 1, 2, 3 or null
  nextThreshold: number | null;
  actionRequired: string;
}

/**
 * Ambang batas sanksi default yang fleksibel.
 */
export const SANCTION_THRESHOLDS = {
  PEMBINAAN_LISAN: 30,
  SP_1: 50,
  SP_2: 75,
  SP_3: 100,
} as const;

/**
 * Mengonversi angka ke romawi untuk penomoran surat kedinasan
 */
export function toRomanNumeral(num: number): string {
  const romanMap: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let res = "";
  let n = num;
  for (const [val, rom] of romanMap) {
    while (n >= val) {
      res += rom;
      n -= val;
    }
  }
  return res || "I";
}

/**
 * Evaluasi ambang batas sanksi berdasarkan akumulasi poin
 */
export function evaluateSanctionTier(totalPoints: number): SanctionTier {
  if (totalPoints <= 0) {
    return {
      status: "Disiplin Baik",
      level: "aman",
      badgeColor: "text-emerald-700 dark:text-emerald-400",
      badgeBg: "bg-emerald-50 dark:bg-emerald-500/10",
      badgeBorder: "border-emerald-200 dark:border-emerald-500/20",
      recommendedSp: null,
      nextThreshold: SANCTION_THRESHOLDS.PEMBINAAN_LISAN,
      actionRequired: "Pertahankan ketertiban & disiplin taruna",
    };
  }
  if (totalPoints < SANCTION_THRESHOLDS.PEMBINAAN_LISAN) {
    return {
      status: "Catatan Ringan",
      level: "ringan",
      badgeColor: "text-blue-700 dark:text-blue-400",
      badgeBg: "bg-blue-50 dark:bg-blue-500/10",
      badgeBorder: "border-blue-200 dark:border-blue-500/20",
      recommendedSp: null,
      nextThreshold: SANCTION_THRESHOLDS.PEMBINAAN_LISAN,
      actionRequired: "Teguran & pembinaan preventif guru kelas",
    };
  }
  if (totalPoints < SANCTION_THRESHOLDS.SP_1) {
    return {
      status: "Peringatan Lisan",
      level: "pembinaan",
      badgeColor: "text-amber-700 dark:text-amber-400",
      badgeBg: "bg-amber-50 dark:bg-amber-500/10",
      badgeBorder: "border-amber-200 dark:border-amber-500/20",
      recommendedSp: null,
      nextThreshold: SANCTION_THRESHOLDS.SP_1,
      actionRequired: "Pembinaan berkala oleh Wali Kelas & Guru Piket",
    };
  }
  if (totalPoints < SANCTION_THRESHOLDS.SP_2) {
    return {
      status: "Surat Peringatan I",
      level: "sp1",
      badgeColor: "text-orange-700 dark:text-orange-400",
      badgeBg: "bg-orange-50 dark:bg-orange-500/10",
      badgeBorder: "border-orange-200 dark:border-orange-500/20",
      recommendedSp: 1,
      nextThreshold: SANCTION_THRESHOLDS.SP_2,
      actionRequired: "Terbitkan SP 1 & Pemanggilan Orang Tua Pertama",
    };
  }
  if (totalPoints < SANCTION_THRESHOLDS.SP_3) {
    return {
      status: "Surat Peringatan II",
      level: "sp2",
      badgeColor: "text-rose-700 dark:text-rose-400",
      badgeBg: "bg-rose-50 dark:bg-rose-500/10",
      badgeBorder: "border-rose-200 dark:border-rose-500/20",
      recommendedSp: 2,
      nextThreshold: SANCTION_THRESHOLDS.SP_3,
      actionRequired: "Terbitkan SP 2, Skorsing Akademik & Mediasi Orang Tua",
    };
  }
  return {
    status: "Surat Peringatan III (Terakhir)",
    level: "sp3",
    badgeColor: "text-red-700 dark:text-red-400",
    badgeBg: "bg-red-50 dark:bg-red-500/10",
    badgeBorder: "border-red-200 dark:border-red-500/20",
    recommendedSp: 3,
    nextThreshold: null,
    actionRequired: "Konferensi Kasus Dewan Guru & Evaluasi Status Siswa",
  };
}

/**
 * Generator nomor surat resmi dinas SMK Penerbangan Dirgantara
 * Format: [URUT]/SP-[TINGKAT]/SMK-DIRGANTARA/[BULAN_ROMAWI]/[TAHUN]
 */
export function generateWarningLetterNumber(
  tingkatSp: number,
  sequenceNumber = 1,
  date = new Date()
): string {
  const romanSp = toRomanNumeral(tingkatSp);
  const romanMonth = toRomanNumeral(date.getMonth() + 1);
  const year = date.getFullYear();
  const seqStr = String(sequenceNumber).padStart(3, "0");

  return `${seqStr}/SP-${romanSp}/SMK-DIRGANTARA/${romanMonth}/${year}`;
}

/**
 * Mengambil profil kedisiplinan dan riwayat lengkap buku poin siswa
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
 * Ringkasan kedisiplinan dan buku poin per kelas
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
