import { APP_ROLES, type AppRole } from "@/db/auth-schema";
import { db } from "@/db";
import { user, userRoles } from "@/db/auth-schema";
import { eq } from "drizzle-orm";

export { APP_ROLES, type AppRole };

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
    "manage:library",
    "manage:sarpras",
  ],
  KEPALA_SEKOLAH: [
    "view:analytics",
  ],
  GURU: [
    "record:attendance_siswa",
    "manage:academic_grades",
  ],
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
  GURU_BK: [
    "manage:counseling_bk",
    "manage:violation_points",
  ],
  PEMBINA_EKSKUL: [
    "manage:extracurricular",
  ],
  SISWA: [
    "view:student_portal",
  ],
  STAF_PERPUS: [
    "manage:library",
  ],
  STAF_SARPRAS: [
    "manage:sarpras",
  ],
};

/**
 * Mendapatkan portal utama tujuan login berdasarkan peran
 */
export function getPortalForRole(role: string): string {
  const normalized = role?.toUpperCase() as AppRole;
  const config = ROLE_CONFIGS[normalized];
  return config ? config.portal : "/siswa";
}

/**
 * Cek apakah peran pengguna memiliki akses ke peran target
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
 * Cek apakah salah satu peran cocok
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
 * Mengambil daftar peran lengkap milik seorang user dari database
 */
export async function getUserFullRoles(userId: string): Promise<{
  primaryRole: AppRole;
  additionalRoles: AppRole[];
  allRoles: AppRole[];
}> {
  const [userRecord] = await db
    .select({ appRole: user.appRole })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const primaryRole = (userRecord?.appRole?.toUpperCase() as AppRole) || "SISWA";

  const additionalRows = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  const additionalRoles = additionalRows.map(
    (row) => row.role.toUpperCase() as AppRole
  );

  const allRolesSet = new Set<AppRole>([primaryRole, ...additionalRoles]);
  const allRoles = Array.from(allRolesSet);

  return { primaryRole, additionalRoles, allRoles };
}

