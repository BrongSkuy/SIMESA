/**
 * Client-safe constants, types, and utility functions for Riwayat Aktivitas & Audit Trail (Fitur 15).
 *
 * PENTING: Sesuai standar UI dan UX SIMESA:
 * 1. Tidak menggunakan simbol garis miring ('/') pada seluruh teks tampilan, label, dan opsi.
 * 2. Hanya menggunakan istilah resmi 'siswa' dan 'siswi' (tidak menggunakan 'taruna' atau 'taruni').
 */

export const AUDIT_ACTIONS = [
  "LOGIN",
  "LOGOUT",
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "PRINT",
  "EXPORT",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_MODULES = [
  "AUTENTIKASI",
  "AKADEMIK_NILAI",
  "PRESENSI",
  "BUKU_POIN",
  "KONSELING_BK",
  "E_RAPOR",
  "MANAJEMEN_PENGGUNA",
  "SISTEM",
] as const;

export type AuditModule = (typeof AUDIT_MODULES)[number];

export const MODULE_LABELS: Record<AuditModule, string> = {
  AUTENTIKASI: "Autentikasi dan Akun",
  AKADEMIK_NILAI: "Akademik dan Nilai",
  PRESENSI: "Presensi Siswa",
  BUKU_POIN: "Buku Poin dan Disiplin",
  KONSELING_BK: "Konseling BK",
  E_RAPOR: "E-Rapor Siswa",
  MANAJEMEN_PENGGUNA: "Manajemen Pengguna",
  SISTEM: "Sistem dan Pengaturan",
};

export const ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN: "Masuk Sistem",
  LOGOUT: "Keluar Sistem",
  CREATE: "Tambah Data",
  UPDATE: "Ubah Data",
  DELETE: "Hapus Data",
  APPROVE: "Persetujuan Dokumen",
  PRINT: "Cetak Dokumen",
  EXPORT: "Ekspor Laporan",
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  guru: "Guru Mapel",
  wali_kelas: "Wali Kelas",
  guru_bk: "Guru BK",
  siswa: "Siswa",
};

export interface ActivityLogItem {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  module: AuditModule;
  targetId?: string | null;
  targetName?: string | null;
  description: string;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface AuditSummaryStats {
  totalHariIni: number;
  akademikNilaiCount: number;
  kesiswaanDisiplinCount: number;
  keamananAkunCount: number;
}

export interface AuditFilterParams {
  search?: string;
  module?: string;
  action?: string;
  userRole?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

const BULAN_INDONESIA = [
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

/**
 * Format tanggal Indonesia yang ramah pengguna dan bebas garis miring.
 * Contoh output: "17 November 2026, 20:30 WIB"
 */
export function formatAuditTimestamp(isoString: string): string {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      // Fallback if raw date string without timezone
      return isoString;
    }
    const day = date.getDate();
    const month = BULAN_INDONESIA[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds} WIB`;
  } catch {
    return isoString;
  }
}

/**
 * Mendapatkan inisial nama aktor untuk avatar box.
 */
export function getInitials(name: string): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Style badge untuk jenis aksi.
 */
export function getActionBadgeStyle(action: AuditAction): {
  bg: string;
  text: string;
  border: string;
} {
  switch (action) {
    case "LOGIN":
      return {
        bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
        text: "text-emerald-700 dark:text-emerald-400",
        border: "border-emerald-200 dark:border-emerald-800/40",
      };
    case "LOGOUT":
      return {
        bg: "bg-slate-500/10 dark:bg-slate-500/15",
        text: "text-slate-700 dark:text-slate-400",
        border: "border-slate-200 dark:border-slate-700",
      };
    case "CREATE":
      return {
        bg: "bg-blue-500/10 dark:bg-blue-500/15",
        text: "text-blue-700 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-800/40",
      };
    case "UPDATE":
      return {
        bg: "bg-amber-500/10 dark:bg-amber-500/15",
        text: "text-amber-700 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-800/40",
      };
    case "DELETE":
      return {
        bg: "bg-rose-500/10 dark:bg-rose-500/15",
        text: "text-rose-700 dark:text-rose-400",
        border: "border-rose-200 dark:border-rose-800/40",
      };
    case "APPROVE":
      return {
        bg: "bg-teal-500/10 dark:bg-teal-500/15",
        text: "text-teal-700 dark:text-teal-400",
        border: "border-teal-200 dark:border-teal-800/40",
      };
    case "PRINT":
      return {
        bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
        text: "text-indigo-700 dark:text-indigo-400",
        border: "border-indigo-200 dark:border-indigo-800/40",
      };
    case "EXPORT":
      return {
        bg: "bg-cyan-500/10 dark:bg-cyan-500/15",
        text: "text-cyan-700 dark:text-cyan-400",
        border: "border-cyan-200 dark:border-cyan-800/40",
      };
    default:
      return {
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-700 dark:text-slate-300",
        border: "border-slate-200 dark:border-slate-700",
      };
  }
}

/**
 * Style badge untuk modul sistem.
 */
export function getModuleBadgeStyle(module: AuditModule): {
  bg: string;
  text: string;
  border: string;
} {
  switch (module) {
    case "AUTENTIKASI":
      return {
        bg: "bg-purple-500/10 dark:bg-purple-500/15",
        text: "text-purple-700 dark:text-purple-300",
        border: "border-purple-200 dark:border-purple-800/40",
      };
    case "AKADEMIK_NILAI":
      return {
        bg: "bg-blue-500/10 dark:bg-blue-500/15",
        text: "text-blue-700 dark:text-blue-300",
        border: "border-blue-200 dark:border-blue-800/40",
      };
    case "PRESENSI":
      return {
        bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
        text: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-200 dark:border-emerald-800/40",
      };
    case "BUKU_POIN":
      return {
        bg: "bg-amber-500/10 dark:bg-amber-500/15",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-200 dark:border-amber-800/40",
      };
    case "KONSELING_BK":
      return {
        bg: "bg-rose-500/10 dark:bg-rose-500/15",
        text: "text-rose-700 dark:text-rose-300",
        border: "border-rose-200 dark:border-rose-800/40",
      };
    case "E_RAPOR":
      return {
        bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
        text: "text-indigo-700 dark:text-indigo-300",
        border: "border-indigo-200 dark:border-indigo-800/40",
      };
    case "MANAJEMEN_PENGGUNA":
      return {
        bg: "bg-sky-500/10 dark:bg-sky-500/15",
        text: "text-sky-700 dark:text-sky-300",
        border: "border-sky-200 dark:border-sky-800/40",
      };
    case "SISTEM":
    default:
      return {
        bg: "bg-slate-500/10 dark:bg-slate-500/15",
        text: "text-slate-700 dark:text-slate-300",
        border: "border-slate-200 dark:border-slate-700",
      };
  }
}
