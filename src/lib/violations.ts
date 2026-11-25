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

export interface SanctionThresholds {
  PEMBINAAN_LISAN: number;
  SP_1: number;
  SP_2: number;
  SP_3: number;
}

export const THRESHOLDS_CONFIG_CODE = "__SANCTION_THRESHOLDS__";

/**
 * Ambang batas sanksi default yang fleksibel (dapat diubah oleh Admin).
 */
export const SANCTION_THRESHOLDS: SanctionThresholds = {
  PEMBINAAN_LISAN: 30,
  SP_1: 50,
  SP_2: 75,
  SP_3: 100,
};

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
 * Evaluasi ambang batas sanksi berdasarkan akumulasi poin aktif dan ambang batas sekolah
 */
export function evaluateSanctionTier(
  totalPoints: number,
  thresholds: SanctionThresholds = SANCTION_THRESHOLDS
): SanctionTier {
  if (totalPoints <= 0) {
    return {
      status: "Disiplin Baik",
      level: "aman",
      badgeColor: "text-emerald-700",
      badgeBg: "bg-emerald-50",
      badgeBorder: "border-emerald-200",
      recommendedSp: null,
      nextThreshold: thresholds.PEMBINAAN_LISAN,
      actionRequired: "Pertahankan ketertiban dan kedisiplinan siswa",
    };
  }
  if (totalPoints < thresholds.PEMBINAAN_LISAN) {
    return {
      status: "Catatan Ringan",
      level: "ringan",
      badgeColor: "text-blue-700",
      badgeBg: "bg-blue-50",
      badgeBorder: "border-blue-200",
      recommendedSp: null,
      nextThreshold: thresholds.PEMBINAAN_LISAN,
      actionRequired: "Teguran dan pembinaan preventif guru kelas",
    };
  }
  if (totalPoints < thresholds.SP_1) {
    return {
      status: "Peringatan Lisan",
      level: "pembinaan",
      badgeColor: "text-amber-700",
      badgeBg: "bg-amber-50",
      badgeBorder: "border-amber-200",
      recommendedSp: null,
      nextThreshold: thresholds.SP_1,
      actionRequired: "Pembinaan berkala oleh Wali Kelas dan Guru Piket",
    };
  }
  if (totalPoints < thresholds.SP_2) {
    return {
      status: "Surat Peringatan I",
      level: "sp1",
      badgeColor: "text-orange-700",
      badgeBg: "bg-orange-50",
      badgeBorder: "border-orange-200",
      recommendedSp: 1,
      nextThreshold: thresholds.SP_2,
      actionRequired: "Terbitkan SP 1 dan Pemanggilan Orang Tua Pertama",
    };
  }
  if (totalPoints < thresholds.SP_3) {
    return {
      status: "Surat Peringatan II",
      level: "sp2",
      badgeColor: "text-rose-700",
      badgeBg: "bg-rose-50",
      badgeBorder: "border-rose-200",
      recommendedSp: 2,
      nextThreshold: thresholds.SP_3,
      actionRequired: "Terbitkan SP 2, Skorsing Akademik, dan Mediasi Orang Tua",
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
    actionRequired: "Konferensi Kasus Dewan Guru dan Evaluasi Status Siswa",
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
 * Membersihkan input angka bobot poin agar tidak memunculkan angka 0 di awal
 * (mis. "015" -> "15", "" -> "") dan dibatasi maksimal 100.
 */
export function sanitizePoinInput(raw: string): string {
  const digitsOnly = String(raw ?? "").replace(/[^0-9]/g, "");
  if (digitsOnly === "") return "";
  const trimmed = digitsOnly.replace(/^0+(?=\d)/, "");
  const numeric = Number(trimmed);
  if (numeric > 100) return "100";
  return trimmed;
}

/**
 * Label lengkap tingkat Surat Peringatan (SP) untuk SelectValue Base UI.
 */
export function getSpTingkatLabel(tingkat: number | string): string {
  const num = Number(tingkat);
  if (num === 2) return "Surat Peringatan II (SP 2)";
  if (num === 3) return "Surat Peringatan III (SP 3 atau Terakhir)";
  return "Surat Peringatan I (SP 1)";
}

/**
 * Menghitung total poin aktif siswa.
 * Catatan pelanggaran yang sudah berstatus "Selesai Dibina" tetap disimpan sebagai riwayat,
 * tetapi poinnya otomatis dikurangi (tidak lagi dihitung dalam akumulasi poin aktif).
 */
export function calculateActiveViolationPoints(
  violations: Array<{ poin?: number | null; status?: string | null }>
): number {
  return violations.reduce((sum, v) => {
    if (v.status === "Selesai Dibina") return sum;
    return sum + (Number(v.poin) || 0);
  }, 0);
}

/**
 * Membersihkan input ambang batas meter poin (1 sampai 1000, bebas leading zero).
 */
export function sanitizeThresholdInput(raw: string): string {
  const digitsOnly = String(raw ?? "").replace(/[^0-9]/g, "");
  if (digitsOnly === "") return "";
  const trimmed = digitsOnly.replace(/^0+(?=\d)/, "");
  const numeric = Number(trimmed);
  if (numeric > 1000) return "1000";
  return trimmed;
}

/**
 * Memvalidasi urutan ambang batas meter poin:
 * 1 <= PEMBINAAN_LISAN < SP_1 < SP_2 < SP_3 <= 1000
 */
export function validateSanctionThresholds(
  input: Partial<SanctionThresholds>
): { valid: true; data: SanctionThresholds } | { valid: false; error: string } {
  const pembinaan = Number(input.PEMBINAAN_LISAN);
  const sp1 = Number(input.SP_1);
  const sp2 = Number(input.SP_2);
  const sp3 = Number(input.SP_3);

  const values = [pembinaan, sp1, sp2, sp3];
  if (values.some((v) => !Number.isInteger(v) || v < 1 || v > 1000)) {
    return {
      valid: false,
      error: "Semua nilai ambang batas harus berupa bilangan bulat antara 1 sampai 1000.",
    };
  }

  if (!(pembinaan < sp1 && sp1 < sp2 && sp2 < sp3)) {
    return {
      valid: false,
      error:
        "Urutan ambang batas harus meningkat: Pembinaan Lisan < SP 1 < SP 2 < SP 3.",
    };
  }

  return {
    valid: true,
    data: {
      PEMBINAAN_LISAN: pembinaan,
      SP_1: sp1,
      SP_2: sp2,
      SP_3: sp3,
    },
  };
}
