/**
 * Client-safe constants, types, and utility functions for BK Counseling & Kesiswaan (Fitur 12).
 *
 * PENTING: Sesuai standar UI/UX SIMESA, seluruh teks tampilan, label,
 * dan konstanta di modul ini TIDAK MENGGUNAKAN SIMBOL GARIS MIRING ('/').
 * Sebagai gantinya, digunakan kata hubung alami seperti 'dan', 'atau', '-', atau '•'.
 */

export const COUNSELING_CATEGORIES = [
  "Akademik dan Belajar",
  "Pribadi dan Sosial",
  "Karir dan Masa Depan",
  "Kedisiplinan dan Sikap",
] as const;

export type CounselingCategory = (typeof COUNSELING_CATEGORIES)[number];

export const COUNSELING_SERVICES = [
  "Konseling Perorangan",
  "Konseling Kelompok",
  "Mediasi Antar Teman",
  "Konsultasi Temu Orang Tua",
] as const;

export type CounselingService = (typeof COUNSELING_SERVICES)[number];

export const CONFIDENTIALITY_LEVELS = [
  "Umum",
  "Rahasia",
] as const;

export type ConfidentialityLevel = (typeof CONFIDENTIALITY_LEVELS)[number];

export const CASE_STATUSES = [
  "Dalam Pemantauan",
  "Selesai",
  "Rujukan Kasus",
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

export const MONITORING_ASPECTS = [
  "Kedisiplinan dan Sikap",
  "Motivasi Belajar",
  "Interaksi Sosial",
  "Keluarga dan Lingkungan",
] as const;

export type MonitoringAspect = (typeof MONITORING_ASPECTS)[number];

export const DISPENSATION_REASONS = [
  "Bimbingan Konseling",
  "Pemeriksaan Kesehatan di UKS",
  "Tugas Sekolah atau Perlombaan",
  "Urusan Keluarga Mendesak",
] as const;

export type DispensationReason = (typeof DISPENSATION_REASONS)[number];

export const DISPENSATION_STATUSES = [
  "Aktif",
  "Selesai",
  "Dibatalkan",
] as const;

export type DispensationStatus = (typeof DISPENSATION_STATUSES)[number];

export interface CounselingSessionItem {
  id: string;
  studentId: string;
  counselorId: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  kategori: CounselingCategory;
  jenisLayanan: CounselingService;
  tingkatKerahasiaan: ConfidentialityLevel;
  pokokMasalah: string;
  pendekatanKonseling?: string | null;
  hasilKonseling?: string | null;
  tindakLanjut?: string | null;
  statusKasus: CaseStatus;
  createdAt?: number | null;
  // Relational data
  studentName?: string;
  studentNis?: string;
  studentKelas?: string;
  counselorName?: string;
}

export interface StudentMonitoringLogItem {
  id: string;
  studentId: string;
  recordedBy: string;
  tanggal: string;
  aspekPengamatan: MonitoringAspect;
  catatanPerkembangan: string;
  rekomendasi?: string | null;
  createdAt?: number | null;
  // Relational data
  studentName?: string;
  studentNis?: string;
  studentKelas?: string;
  recorderName?: string;
}

export interface DispensationLetterItem {
  id: string;
  studentId: string;
  nomorSurat: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  keperluan: DispensationReason;
  keterangan?: string | null;
  diterbitkanOleh: string;
  statusDispensasi: DispensationStatus;
  createdAt?: number | null;
  // Relational data
  studentName?: string;
  studentNis?: string;
  studentKelas?: string;
  issuerName?: string;
}

export interface CounselingOverviewSummary {
  totalSesiBulanIni: number;
  totalDalamPemantauan: number;
  totalSelesai: number;
  totalDispensasiHariIni: number;
}

/**
 * Format tanggal Indonesia yang ramah pengguna dan bebas garis miring.
 * Contoh: 17 November 2026
 */
export function formatTanggalIndonesia(dateString: string): string {
  if (!dateString) return "-";
  try {
    const [year, month, day] = dateString.split("-").map(Number);
    if (!year || !month || !day) return dateString;
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    return `${day} ${months[month - 1]} ${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Konversi angka bulan ke format romawi standar dokumen dinas.
 */
function getRomanMonth(monthIndex: number): string {
  const romanMonths = [
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
    "XII",
  ];
  return romanMonths[monthIndex] || "I";
}

/**
 * Membuat nomor surat dispensasi resmi format dinas tanpa garis miring.
 * Format: 001-DSP-SMK-DIRGANTARA-XI-2026
 */
export function generateDispensationDocNumber(sequenceNumber: number, dateObj: Date = new Date()): string {
  const paddedSeq = String(sequenceNumber).padStart(3, "0");
  const romanMonth = getRomanMonth(dateObj.getMonth());
  const year = dateObj.getFullYear();
  return `${paddedSeq}-DSP-SMK-DIRGANTARA-${romanMonth}-${year}`;
}

/**
 * Helper untuk format waktu ramah pengguna tanpa garis miring.
 * Contoh: Pukul 09:00 sampai 10:30 WIB
 */
export function formatRentangWaktu(jamMulai: string, jamSelesai: string): string {
  if (!jamMulai && !jamSelesai) return "-";
  if (!jamSelesai || jamSelesai === jamMulai) return `Pukul ${jamMulai} WIB`;
  return `Pukul ${jamMulai} sampai ${jamSelesai} WIB`;
}

/**
 * Badge style status kasus konseling
 */
export function getStatusKasusBadge(status: CaseStatus) {
  switch (status) {
    case "Dalam Pemantauan":
      return {
        label: "Dalam Pemantauan",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      };
    case "Selesai":
      return {
        label: "Selesai",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    case "Rujukan Kasus":
      return {
        label: "Rujukan Kasus",
        badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
      };
    default:
      return {
        label: status,
        badgeClass: "bg-muted text-muted-foreground border-border",
      };
  }
}

/**
 * Badge style tingkat kerahasiaan
 */
export function getKerahasiaanBadge(tingkat: ConfidentialityLevel) {
  if (tingkat === "Rahasia") {
    return {
      label: "Rahasia",
      badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
    };
  }
  return {
    label: "Umum",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
  };
}

/**
 * Badge style status dispensasi
 */
export function getDispensasiStatusBadge(status: DispensationStatus) {
  switch (status) {
    case "Aktif":
      return {
        label: "Aktif",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      };
    case "Selesai":
      return {
        label: "Selesai",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    case "Dibatalkan":
      return {
        label: "Dibatalkan",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      };
    default:
      return {
        label: status,
        badgeClass: "bg-muted text-muted-foreground border-border",
      };
  }
}
