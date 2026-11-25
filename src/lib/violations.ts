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
      badgeColor: "text-emerald-700",
      badgeBg: "bg-emerald-50",
      badgeBorder: "border-emerald-200",
      recommendedSp: null,
      nextThreshold: SANCTION_THRESHOLDS.PEMBINAAN_LISAN,
      actionRequired: "Pertahankan ketertiban & kedisiplinan siswa",
    };
  }
  if (totalPoints < SANCTION_THRESHOLDS.PEMBINAAN_LISAN) {
    return {
      status: "Catatan Ringan",
      level: "ringan",
      badgeColor: "text-blue-700",
      badgeBg: "bg-blue-50",
      badgeBorder: "border-blue-200",
      recommendedSp: null,
      nextThreshold: SANCTION_THRESHOLDS.PEMBINAAN_LISAN,
      actionRequired: "Teguran & pembinaan preventif guru kelas",
    };
  }
  if (totalPoints < SANCTION_THRESHOLDS.SP_1) {
    return {
      status: "Peringatan Lisan",
      level: "pembinaan",
      badgeColor: "text-amber-700",
      badgeBg: "bg-amber-50",
      badgeBorder: "border-amber-200",
      recommendedSp: null,
      nextThreshold: SANCTION_THRESHOLDS.SP_1,
      actionRequired: "Pembinaan berkala oleh Wali Kelas & Guru Piket",
    };
  }
  if (totalPoints < SANCTION_THRESHOLDS.SP_2) {
    return {
      status: "Surat Peringatan I",
      level: "sp1",
      badgeColor: "text-orange-700",
      badgeBg: "bg-orange-50",
      badgeBorder: "border-orange-200",
      recommendedSp: 1,
      nextThreshold: SANCTION_THRESHOLDS.SP_2,
      actionRequired: "Terbitkan SP 1 & Pemanggilan Orang Tua Pertama",
    };
  }
  if (totalPoints < SANCTION_THRESHOLDS.SP_3) {
    return {
      status: "Surat Peringatan II",
      level: "sp2",
      badgeColor: "text-rose-700",
      badgeBg: "bg-rose-50",
      badgeBorder: "border-rose-200",
      recommendedSp: 2,
      nextThreshold: SANCTION_THRESHOLDS.SP_3,
      actionRequired: "Terbitkan SP 2, Skorsing Akademik & Mediasi Orang Tua",
    };
  }
  return {
    status: "Surat Peringatan III (Terakhir)",
    level: "sp3",
    badgeColor: "text-red-700",
    badgeBg: "bg-red-50",
    badgeBorder: "border-red-200",
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
