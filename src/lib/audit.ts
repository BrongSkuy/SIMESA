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
  superadmin: "Super Administrator",
  super_admin: "Super Administrator",
  admin: "Administrator",
  kepala_sekolah: "Kepala Sekolah",
  guru: "Guru Mapel",
  wali_kelas: "Wali Kelas",
  guru_bk: "Guru BK",
  siswa: "Siswa",
};

export function formatRoleLabel(role?: string | null): string {
  if (!role) return "Pengguna";
  const normalized = role.toLowerCase().trim();
  return ROLE_LABELS[normalized] || role;
}

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
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
      };
    case "LOGOUT":
      return {
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-200",
      };
    case "CREATE":
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
      };
    case "UPDATE":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
      };
    case "DELETE":
      return {
        bg: "bg-rose-50",
        text: "text-rose-700",
        border: "border-rose-200",
      };
    case "APPROVE":
      return {
        bg: "bg-teal-50",
        text: "text-teal-700",
        border: "border-teal-200",
      };
    case "PRINT":
      return {
        bg: "bg-indigo-50",
        text: "text-indigo-700",
        border: "border-indigo-200",
      };
    case "EXPORT":
      return {
        bg: "bg-cyan-50",
        text: "text-cyan-700",
        border: "border-cyan-200",
      };
    default:
      return {
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-200",
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
        bg: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-200",
      };
    case "AKADEMIK_NILAI":
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
      };
    case "PRESENSI":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
      };
    case "BUKU_POIN":
      return {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
      };
    case "KONSELING_BK":
      return {
        bg: "bg-rose-50",
        text: "text-rose-700",
        border: "border-rose-200",
      };
    case "E_RAPOR":
      return {
        bg: "bg-indigo-50",
        text: "text-indigo-700",
        border: "border-indigo-200",
      };
    case "MANAJEMEN_PENGGUNA":
      return {
        bg: "bg-sky-50",
        text: "text-sky-700",
        border: "border-sky-200",
      };
    case "SISTEM":
    default:
      return {
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-200",
      };
  }
}
