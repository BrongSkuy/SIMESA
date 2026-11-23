/**
 * Client-safe constants, types, and utility functions for Riwayat Aktivitas Sistem (Fitur 15).
 *
 * PENTING: Sesuai standar UI dan UX SIMESA:
 * 1. Tidak menggunakan simbol garis miring ('/'), bullet, maupun em-dash pada seluruh teks tampilan.
 * 2. Hanya menggunakan istilah resmi 'siswa' dan 'siswi' (tidak menggunakan 'taruna' atau 'taruni').
 * 3. Menggunakan bahasa Indonesia yang ramah pengguna tanpa istilah teknis seperti 'audit trail' atau 'log usang'.
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
  AUTENTIKASI: "Akses dan Akun",
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
        bg: "bg-emerald-500/10 dark:bg-emerald-500/15 group-hover/row:bg-emerald-500/25",
        text: "text-emerald-700 dark:text-emerald-400 group-hover/row:text-emerald-300",
        border: "border-emerald-200 dark:border-emerald-800/40 group-hover/row:border-emerald-400/50",
      };
    case "LOGOUT":
      return {
        bg: "bg-slate-500/10 dark:bg-slate-500/15 group-hover/row:bg-slate-700/50",
        text: "text-slate-700 dark:text-slate-400 group-hover/row:text-slate-200",
        border: "border-slate-200 dark:border-slate-700 group-hover/row:border-slate-500/50",
      };
    case "CREATE":
      return {
        bg: "bg-blue-500/10 dark:bg-blue-500/15 group-hover/row:bg-blue-500/25",
        text: "text-blue-700 dark:text-blue-400 group-hover/row:text-blue-300",
        border: "border-blue-200 dark:border-blue-800/40 group-hover/row:border-blue-400/50",
      };
    case "UPDATE":
      return {
        bg: "bg-amber-500/10 dark:bg-amber-500/15 group-hover/row:bg-amber-500/25",
        text: "text-amber-700 dark:text-amber-400 group-hover/row:text-amber-300",
        border: "border-amber-200 dark:border-amber-800/40 group-hover/row:border-amber-400/50",
      };
    case "DELETE":
      return {
        bg: "bg-rose-500/10 dark:bg-rose-500/15 group-hover/row:bg-rose-500/25",
        text: "text-rose-700 dark:text-rose-400 group-hover/row:text-rose-300",
        border: "border-rose-200 dark:border-rose-800/40 group-hover/row:border-rose-400/50",
      };
    case "APPROVE":
      return {
        bg: "bg-teal-500/10 dark:bg-teal-500/15 group-hover/row:bg-teal-500/25",
        text: "text-teal-700 dark:text-teal-400 group-hover/row:text-teal-300",
        border: "border-teal-200 dark:border-teal-800/40 group-hover/row:border-teal-400/50",
      };
    case "PRINT":
      return {
        bg: "bg-indigo-500/10 dark:bg-indigo-500/15 group-hover/row:bg-indigo-500/25",
        text: "text-indigo-700 dark:text-indigo-400 group-hover/row:text-indigo-300",
        border: "border-indigo-200 dark:border-indigo-800/40 group-hover/row:border-indigo-400/50",
      };
    case "EXPORT":
      return {
        bg: "bg-cyan-500/10 dark:bg-cyan-500/15 group-hover/row:bg-cyan-500/25",
        text: "text-cyan-700 dark:text-cyan-400 group-hover/row:text-cyan-300",
        border: "border-cyan-200 dark:border-cyan-800/40 group-hover/row:border-cyan-400/50",
      };
    default:
      return {
        bg: "bg-slate-100 dark:bg-slate-800 group-hover/row:bg-slate-800",
        text: "text-slate-700 dark:text-slate-300 group-hover/row:text-slate-200",
        border: "border-slate-200 dark:border-slate-700 group-hover/row:border-slate-600",
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
        bg: "bg-purple-500/10 dark:bg-purple-500/15 group-hover/row:bg-purple-500/25",
        text: "text-purple-700 dark:text-purple-300 group-hover/row:text-purple-200",
        border: "border-purple-200 dark:border-purple-800/40 group-hover/row:border-purple-400/50",
      };
    case "AKADEMIK_NILAI":
      return {
        bg: "bg-blue-500/10 dark:bg-blue-500/15 group-hover/row:bg-blue-500/25",
        text: "text-blue-700 dark:text-blue-300 group-hover/row:text-blue-200",
        border: "border-blue-200 dark:border-blue-800/40 group-hover/row:border-blue-400/50",
      };
    case "PRESENSI":
      return {
        bg: "bg-emerald-500/10 dark:bg-emerald-500/15 group-hover/row:bg-emerald-500/25",
        text: "text-emerald-700 dark:text-emerald-300 group-hover/row:text-emerald-200",
        border: "border-emerald-200 dark:border-emerald-800/40 group-hover/row:border-emerald-400/50",
      };
    case "BUKU_POIN":
      return {
        bg: "bg-amber-500/10 dark:bg-amber-500/15 group-hover/row:bg-amber-500/25",
        text: "text-amber-700 dark:text-amber-300 group-hover/row:text-amber-200",
        border: "border-amber-200 dark:border-amber-800/40 group-hover/row:border-amber-400/50",
      };
    case "KONSELING_BK":
      return {
        bg: "bg-rose-500/10 dark:bg-rose-500/15 group-hover/row:bg-rose-500/25",
        text: "text-rose-700 dark:text-rose-300 group-hover/row:text-rose-200",
        border: "border-rose-200 dark:border-rose-800/40 group-hover/row:border-rose-400/50",
      };
    case "E_RAPOR":
      return {
        bg: "bg-indigo-500/10 dark:bg-indigo-500/15 group-hover/row:bg-indigo-500/25",
        text: "text-indigo-700 dark:text-indigo-300 group-hover/row:text-indigo-200",
        border: "border-indigo-200 dark:border-indigo-800/40 group-hover/row:border-indigo-400/50",
      };
    case "MANAJEMEN_PENGGUNA":
      return {
        bg: "bg-sky-500/10 dark:bg-sky-500/15 group-hover/row:bg-sky-500/25",
        text: "text-sky-700 dark:text-sky-300 group-hover/row:text-sky-200",
        border: "border-sky-200 dark:border-sky-800/40 group-hover/row:border-sky-400/50",
      };
    case "SISTEM":
    default:
      return {
        bg: "bg-slate-500/10 dark:bg-slate-500/15 group-hover/row:bg-slate-700/50",
        text: "text-slate-700 dark:text-slate-300 group-hover/row:text-slate-200",
        border: "border-slate-200 dark:border-slate-700 group-hover/row:border-slate-500/50",
      };
  }
}

export type AuditKpiKey =
  | "hari_ini"
  | "akademik_nilai"
  | "kesiswaan_disiplin"
  | "keamanan_akses";

export interface AuditKpiPageScope {
  halaman: string;
  lokasiMenu: string;
  aktivitas: string;
}

export interface AuditKpiCardInfo {
  key: AuditKpiKey;
  judul: string;
  ringkasan: string;
  catatan?: string;
  halamanTercakup: AuditKpiPageScope[];
}

/**
 * Informasi cakupan halaman untuk popup tanda seru (!) pada 4 kartu ringkasan Riwayat Aktivitas.
 * Diselaraskan langsung dengan agregasi getAuditSummary() di server.
 */
export const AUDIT_KPI_CARD_INFO: Record<AuditKpiKey, AuditKpiCardInfo> = {
  hari_ini: {
    key: "hari_ini",
    judul: "Aktivitas Hari Ini",
    ringkasan:
      "Menghitung seluruh aktivitas pengguna dari semua modul yang terekam pada tanggal berjalan (WIB).",
    halamanTercakup: [
      {
        halaman: "Halaman Masuk dan Keluar",
        lokasiMenu: "Akses Akun Semua Peran",
        aktivitas: "Masuk sistem dan keluar sistem dari seluruh akun pengguna.",
      },
      {
        halaman: "Input Nilai dan E-Rapor",
        lokasiMenu: "Portal Admin dan Guru",
        aktivitas: "Pengisian nilai komponen, catatan wali kelas, dan pengesahan rapor.",
      },
      {
        halaman: "Presensi Harian",
        lokasiMenu: "Portal Admin dan Guru",
        aktivitas: "Pencatatan dan pembaruan kehadiran siswa per mata pelajaran.",
      },
      {
        halaman: "Buku Poin dan Konseling BK",
        lokasiMenu: "Portal Admin dan Guru",
        aktivitas: "Pencatatan pelanggaran, Surat Peringatan, sesi konseling, dan surat dispensasi.",
      },
      {
        halaman: "Data Master, Akun, dan Pengaturan",
        lokasiMenu: "Portal Admin",
        aktivitas: "Perubahan data siswa, reset kata sandi, pengaturan tahun ajaran, dan pembersihan riwayat.",
      },
    ],
  },
  akademik_nilai: {
    key: "akademik_nilai",
    judul: "Akademik dan Nilai",
    ringkasan:
      "Menghitung seluruh catatan perubahan pada modul Akademik dan Nilai serta modul E-Rapor Siswa.",
    catatan:
      "Aktivitas kehadiran harian dicatat terpisah pada modul Presensi Siswa agar angka capaian akademik tetap fokus pada nilai dan rapor.",
    halamanTercakup: [
      {
        halaman: "Input Nilai Siswa",
        lokasiMenu: "Menu Operasional - Input Nilai",
        aktivitas: "Penyimpanan dan pembaruan nilai Tugas, UTS, UAS, Praktik, dan aspek penilaian.",
      },
      {
        halaman: "E-Rapor Internal",
        lokasiMenu: "Menu Operasional - E-Rapor",
        aktivitas: "Pengisian catatan wali kelas, ekstrakurikuler, status pengesahan, dan cetak rapor.",
      },
      {
        halaman: "Data Siswa",
        lokasiMenu: "Menu Data Master - Data Siswa",
        aktivitas: "Pembaruan profil siswa, perubahan kelas, dan penghapusan data siswa.",
      },
    ],
  },
  kesiswaan_disiplin: {
    key: "kesiswaan_disiplin",
    judul: "Kesiswaan dan Disiplin",
    ringkasan:
      "Menghitung seluruh catatan pembinaan karakter dari modul Buku Poin dan Disiplin serta modul Konseling BK.",
    halamanTercakup: [
      {
        halaman: "Buku Poin dan Pelanggaran",
        lokasiMenu: "Menu Operasional - Buku Poin",
        aktivitas: "Pencatatan pelanggaran tata tertib, status pembinaan, dan penerbitan Surat Peringatan (SP).",
      },
      {
        halaman: "Bimbingan Konseling (BK)",
        lokasiMenu: "Menu Operasional - Konseling BK",
        aktivitas: "Pencatatan sesi konseling, catatan pantauan perkembangan, dan penerbitan Surat Dispensasi kelas.",
      },
    ],
  },
  keamanan_akses: {
    key: "keamanan_akses",
    judul: "Keamanan dan Akses",
    ringkasan:
      "Menghitung aktivitas keluar masuk akun serta pengelolaan hak akses pengguna dari modul Akses dan Akun maupun Manajemen Pengguna.",
    halamanTercakup: [
      {
        halaman: "Halaman Masuk dan Keluar Sistem",
        lokasiMenu: "Gerbang Login SIMESA",
        aktivitas: "Riwayat masuk dan keluar sistem untuk seluruh peran (Admin, Guru, dan Siswa).",
      },
      {
        halaman: "Manajemen Akun Pengguna",
        lokasiMenu: "Menu Sistem - Manajemen Akun",
        aktivitas: "Reset kata sandi akun, aktivasi atau penonaktifan status akun, dan pembaruan peran akses.",
      },
    ],
  },
};

export interface ActivityLogExportOptions {
  filterSummary: string;
  includeIpAddress?: boolean;
  summary?: AuditSummaryStats;
  exportedAt?: string;
}

export interface ActivityLogExportDataset {
  mainSheetRows: (string | number)[][];
  mainColWidths: { wch: number }[];
  mainHeaderRowIndex: number;
  mainLastColIndex: number;
  summarySheetRows: (string | number)[][];
  summaryColWidths: { wch: number }[];
}

function computeAutoColWidths(
  rows: (string | number)[][],
  minWidths: number[],
  maxWidths: number[]
): { wch: number }[] {
  return minWidths.map((minW, colIdx) => {
    let maxLen = minW;
    for (let r = 0; r < rows.length; r++) {
      const cell = rows[r]?.[colIdx];
      if (cell === undefined || cell === null) continue;
      const strLen = String(cell).length + 3;
      if (strLen > maxLen) maxLen = strLen;
    }
    const maxW = maxWidths[colIdx] ?? 50;
    return { wch: Math.min(maxLen, maxW) };
  });
}

/**
 * Menyusun data multi-sheet Excel (.xlsx) yang rapi, terstruktur per kolom,
 * dilengkapi kop judul resmi, filter info, dan sheet ringkasan kategori.
 */
export function buildActivityLogExportData(
  logs: ActivityLogItem[],
  options: ActivityLogExportOptions
): ActivityLogExportDataset {
  const includeIp = Boolean(options.includeIpAddress);
  const exportedAt =
    options.exportedAt ||
    formatAuditTimestamp(new Date().toISOString());

  const headers = [
    "No",
    "Waktu Pencatatan",
    "Nama Pengguna",
    "Peran",
    "Modul",
    "Jenis Aksi",
    "Data Terkait",
    "Uraian Aktivitas",
  ];
  if (includeIp) {
    headers.push("Alamat IP");
  }

  const mainSheetRows: (string | number)[][] = [
    ["LAPORAN RIWAYAT AKTIVITAS SISTEM - SIMESA"],
    ["SMK PENERBANGAN DIRGANTARA"],
    [
      `Waktu Ekspor: ${exportedAt} | Cakupan: ${options.filterSummary} | Total Catatan: ${logs.length}`,
    ],
    [],
    headers,
  ];

  logs.forEach((item, idx) => {
    const row: (string | number)[] = [
      idx + 1,
      formatAuditTimestamp(item.createdAt),
      item.userName || "-",
      formatRoleLabel(item.userRole),
      MODULE_LABELS[item.module] || item.module,
      ACTION_LABELS[item.action] || item.action,
      item.targetName || "-",
      item.description || "-",
    ];
    if (includeIp) {
      row.push(item.ipAddress || "127.0.0.1");
    }
    mainSheetRows.push(row);
  });

  const dataRowsForWidth = mainSheetRows.slice(4);
  const minWidths = includeIp
    ? [6, 26, 22, 16, 20, 16, 20, 36, 15]
    : [6, 26, 22, 16, 20, 16, 20, 36];
  const maxWidths = includeIp
    ? [8, 32, 32, 22, 28, 24, 32, 65, 22]
    : [8, 32, 32, 22, 28, 24, 32, 65];

  const mainColWidths = computeAutoColWidths(
    dataRowsForWidth,
    minWidths,
    maxWidths
  );

  // Sheet 2: Ringkasan Statistik & Rekap Per Modul
  const moduleCounts: Record<string, number> = {};
  logs.forEach((item) => {
    const label = MODULE_LABELS[item.module] || item.module;
    moduleCounts[label] = (moduleCounts[label] || 0) + 1;
  });

  const summarySheetRows: (string | number)[][] = [
    ["RINGKASAN RIWAYAT AKTIVITAS - SIMESA"],
    ["SMK PENERBANGAN DIRGANTARA"],
    [`Waktu Ekspor: ${exportedAt}`],
    [],
    ["Kategori Ringkasan", "Jumlah Catatan"],
    ["Total Data dalam Berkas Ini", logs.length],
  ];

  if (options.summary) {
    summarySheetRows.push(
      ["Aktivitas Hari Ini", options.summary.totalHariIni],
      ["Akademik dan Nilai", options.summary.akademikNilaiCount],
      ["Kesiswaan dan Disiplin", options.summary.kesiswaanDisiplinCount],
      ["Keamanan dan Akses", options.summary.keamananAkunCount]
    );
  }

  summarySheetRows.push([], ["Rekap Berdasarkan Modul", "Jumlah Catatan"]);

  AUDIT_MODULES.forEach((mod) => {
    const label = MODULE_LABELS[mod];
    summarySheetRows.push([label, moduleCounts[label] || 0]);
  });

  const summaryColWidths = computeAutoColWidths(
    summarySheetRows.slice(4),
    [32, 18],
    [45, 22]
  );

  return {
    mainSheetRows,
    mainColWidths,
    mainHeaderRowIndex: 4,
    mainLastColIndex: headers.length - 1,
    summarySheetRows,
    summaryColWidths,
  };
}
