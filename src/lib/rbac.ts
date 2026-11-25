export const APP_ROLES = [
  "SUPERADMIN",
  "ADMIN",
  "KEPALA_SEKOLAH",
  "GURU",
  "WALI_KELAS",
  "GURU_PIKET",
  "GURU_BK",
  "PEMBINA_EKSKUL",
  "SISWA",
  "STAF_PERPUS",
  "STAF_SARPRAS",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type Permission =
  | "manage:system"
  | "manage:users"
  | "view:analytics"
  | "manage:master_data"
  | "record:attendance_guru"
  | "record:attendance_siswa"
  | "manage:academic_grades"
  | "manage:counseling_bk"
  | "manage:violation_points"
  | "manage:extracurricular"
  | "manage:library"
  | "manage:sarpras"
  | "view:student_portal";

export interface RoleConfig {
  code: AppRole;
  label: string;
  category: "Manajemen" | "Akademik" | "Layanan" | "Siswa";
  portal: "/admin" | "/guru" | "/siswa";
  description: string;
  badgeColor: string;
}

export const ROLE_CONFIGS: Record<AppRole, RoleConfig> = {
  SUPERADMIN: {
    code: "SUPERADMIN",
    label: "Superadmin",
    category: "Manajemen",
    portal: "/admin",
    description: "Akses penuh konfigurasi sistem, database, dan seluruh modul sekolah.",
    badgeColor: "bg-red-500/10 text-red-500 border-red-500/20",
  },
  ADMIN: {
    code: "ADMIN",
    label: "Admin",
    category: "Manajemen",
    portal: "/admin",
    description: "Pengelolaan data master, jadwal, kurikulum, dan administrasi sekolah.",
    badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  KEPALA_SEKOLAH: {
    code: "KEPALA_SEKOLAH",
    label: "Kepala Sekolah",
    category: "Manajemen",
    portal: "/admin",
    description: "Monitoring eksekutif, rekapitulasi kehadiran, hasil SPK, dan laporan evaluasi.",
    badgeColor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  GURU: {
    code: "GURU",
    label: "Guru Mapel",
    category: "Akademik",
    portal: "/guru",
    description: "Input absensi mata pelajaran yang diampu dan pengisian nilai siswa.",
    badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  WALI_KELAS: {
    code: "WALI_KELAS",
    label: "Wali Kelas",
    category: "Akademik",
    portal: "/guru",
    description: "Monitoring kelas binaan, approval izin siswa, dan pengesahan rapor.",
    badgeColor: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  },
  GURU_PIKET: {
    code: "GURU_PIKET",
    label: "Guru Piket",
    category: "Akademik",
    portal: "/guru",
    description: "Pencatatan kedatangan gerbang harian dan perizinan meninggalkan kelas.",
    badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  GURU_BK: {
    code: "GURU_BK",
    label: "Guru BK",
    category: "Akademik",
    portal: "/guru",
    description: "Layanan konseling privat kesiswaan dan pencatatan buku poin pelanggaran.",
    badgeColor: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  },
  PEMBINA_EKSKUL: {
    code: "PEMBINA_EKSKUL",
    label: "Pembina Ekskul",
    category: "Akademik",
    portal: "/guru",
    description: "Pengelolaan kegiatan, presensi, dan penilaian anggota ekstrakurikuler.",
    badgeColor: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  },
  SISWA: {
    code: "SISWA",
    label: "Siswa & Orang Tua",
    category: "Siswa",
    portal: "/siswa",
    description: "Portal pantau kehadiran, riwayat nilai pelajaran, e-rapor, dan mading.",
    badgeColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  },
  STAF_PERPUS: {
    code: "STAF_PERPUS",
    label: "Staf Perpustakaan",
    category: "Layanan",
    portal: "/admin",
    description: "Katalog buku, peminjaman, pengembalian, cetak barcode, dan denda.",
    badgeColor: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  },
  STAF_SARPRAS: {
    code: "STAF_SARPRAS",
    label: "Staf Sarpras",
    category: "Layanan",
    portal: "/admin",
    description: "Manajemen fasilitas, inventaris alat praktik, dan peminjaman ruangan.",
    badgeColor: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
};

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  SUPERADMIN: [
    "manage:system",
    "manage:users",
    "view:analytics",
    "manage:master_data",
    "record:attendance_guru",
    "record:attendance_siswa",
    "manage:academic_grades",
    "manage:counseling_bk",
    "manage:violation_points",
    "manage:extracurricular",
    "manage:library",
    "manage:sarpras",
  ],
  ADMIN: [
    "manage:users",
    "view:analytics",
    "manage:master_data",
    "record:attendance_guru",
    "record:attendance_siswa",
    "manage:academic_grades",
    "manage:counseling_bk",
    "manage:violation_points",
    "manage:library",
    "manage:sarpras",
  ],
  KEPALA_SEKOLAH: ["view:analytics"],
  GURU: ["record:attendance_siswa", "manage:academic_grades"],
  WALI_KELAS: [
    "record:attendance_siswa",
    "manage:academic_grades",
    "manage:violation_points",
  ],
  GURU_PIKET: [
    "record:attendance_guru",
    "record:attendance_siswa",
    "manage:violation_points",
  ],
  GURU_BK: ["manage:counseling_bk", "manage:violation_points"],
  PEMBINA_EKSKUL: ["manage:extracurricular"],
  SISWA: ["view:student_portal"],
  STAF_PERPUS: ["manage:library"],
  STAF_SARPRAS: ["manage:sarpras"],
};

/**
 * Mendapatkan portal utama tujuan login berdasarkan peran (Client-safe)
 */
export function getPortalForRole(role: string): string {
  const normalized = role?.toUpperCase() as AppRole;
  const config = ROLE_CONFIGS[normalized];
  return config ? config.portal : "/siswa";
}

/**
 * Cek apakah peran pengguna memiliki akses ke peran target (Client-safe)
 */
export function hasRole(
  primaryRole: string,
  additionalRoles: string[] = [],
  targetRole: AppRole
): boolean {
  if (primaryRole === "SUPERADMIN") return true;
  if (primaryRole === targetRole) return true;
  return additionalRoles.includes(targetRole);
}

/**
 * Cek apakah salah satu peran cocok (Client-safe)
 */
export function hasAnyRole(
  primaryRole: string,
  additionalRoles: string[] = [],
  targetRoles: AppRole[]
): boolean {
  if (primaryRole === "SUPERADMIN") return true;
  if (targetRoles.includes(primaryRole as AppRole)) return true;
  return additionalRoles.some((r) => targetRoles.includes(r as AppRole));
}

/**
 * Peran utama kategori guru yang dapat diberikan peran tambahan (multi-role)
 */
export const TEACHER_CATEGORY_ROLES: AppRole[] = [
  "GURU",
  "WALI_KELAS",
  "GURU_PIKET",
  "GURU_BK",
  "PEMBINA_EKSKUL",
];

/**
 * Daftar peran tambahan yang dapat dirangkap oleh guru
 */
export const ADDITIONAL_TEACHER_ROLES: AppRole[] = [
  "WALI_KELAS",
  "GURU_BK",
  "GURU_PIKET",
  "PEMBINA_EKSKUL",
];

/**
 * Daftar peran yang dapat dibuat langsung dari halaman Manajemen Akun
 * (Akun siswa dibuat melalui menu Data Siswa agar data kelas dan angkatan lengkap)
 */
export const STAFF_CREATABLE_ROLES: AppRole[] = APP_ROLES.filter(
  (r) => r !== "SISWA"
);

export function isTeacherCategoryRole(role?: string | null): boolean {
  if (!role) return false;
  return TEACHER_CATEGORY_ROLES.includes(role.toUpperCase() as AppRole);
}

export function parseRoleMetadata(metadata?: string | null): {
  kelas?: string;
  ekskul?: string;
} {
  if (!metadata) return {};
  try {
    const parsed = JSON.parse(metadata);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export interface ExtraRoleInput {
  role: string;
  kelas?: string | null;
  ekskul?: string | null;
  metadata?: string | null;
}

export interface SanitizedExtraRole {
  role: AppRole;
  metadata: string | null;
  kelas?: string;
}

/**
 * Validasi dan format peran tambahan guru beserta metadata kelas atau ekskul
 */
export function sanitizeAdditionalTeacherRoles(
  primaryRole: AppRole,
  rawRoles: unknown
): SanitizedExtraRole[] {
  if (!isTeacherCategoryRole(primaryRole) || !Array.isArray(rawRoles)) {
    return [];
  }
  const seen = new Set<AppRole>();
  const result: SanitizedExtraRole[] = [];

  for (const item of rawRoles) {
    if (!item || typeof item !== "object") continue;
    const rec = item as ExtraRoleInput;
    const roleCode = String(rec.role || "").toUpperCase().trim() as AppRole;
    if (
      !ADDITIONAL_TEACHER_ROLES.includes(roleCode) ||
      roleCode === primaryRole ||
      seen.has(roleCode)
    ) {
      continue;
    }

    const existingMeta = parseRoleMetadata(rec.metadata);
    let metadataStr: string | null = null;
    let waliKelasTarget: string | undefined;

    if (roleCode === "WALI_KELAS") {
      const kelas = (rec.kelas ?? existingMeta.kelas ?? "").trim();
      if (kelas) {
        metadataStr = JSON.stringify({ kelas });
        waliKelasTarget = kelas;
      }
    } else if (roleCode === "PEMBINA_EKSKUL") {
      const ekskul = (rec.ekskul ?? existingMeta.ekskul ?? "").trim();
      if (ekskul) {
        metadataStr = JSON.stringify({ ekskul });
      }
    }

    seen.add(roleCode);
    result.push({
      role: roleCode,
      metadata: metadataStr,
      ...(waliKelasTarget ? { kelas: waliKelasTarget } : {}),
    });
  }

  return result;
}
