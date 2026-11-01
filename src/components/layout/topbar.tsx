"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  ChevronDown,
  LayoutDashboard,
  Layers,
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  ClipboardCheck,
  PenLine,
  FileText,
  BarChart3,
  Trophy,
  Settings,
  Database,
  UserCog,
  CalendarCheck,
  User as UserIcon,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole } from "@/lib/mock-data";
import { authClient } from "@/lib/auth-client";

export interface TopbarUser {
  id: string;
  nama: string;
  username: string;
  email?: string;
  role: UserRole;
}

interface DropdownNavLink {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  dividerBefore?: boolean;
}

interface NavDropdownGroup {
  label: string;
  sectionTitle: string;
  icon: LucideIcon;
  items: DropdownNavLink[];
}

export const ADMIN_DROPDOWN_GROUPS: NavDropdownGroup[] = [
  {
    label: "Data Master",
    sectionTitle: "Master Data Sekolah",
    icon: Layers,
    items: [
      {
        label: "Data Siswa",
        description: "Daftar siswa, biodata dan NIS",
        href: "/admin/siswa",
        icon: Users,
      },
      {
        label: "Data Guru",
        description: "Daftar guru dan tenaga pendidik",
        href: "/admin/guru",
        icon: GraduationCap,
      },
      {
        label: "Data Kelas",
        description: "Rombongan belajar dan wali kelas",
        href: "/admin/kelas",
        icon: Building2,
      },
      {
        label: "Mata Pelajaran",
        description: "Kurikulum dan alokasi pengajar",
        href: "/admin/mapel",
        icon: BookOpen,
      },
    ],
  },
  {
    label: "Operasional",
    sectionTitle: "Presensi & Nilai",
    icon: ClipboardCheck,
    items: [
      {
        label: "Absensi",
        description: "Pencatatan presensi harian siswa",
        href: "/admin/absensi",
        icon: ClipboardCheck,
      },
      {
        label: "Input Nilai",
        description: "Pengisian nilai tugas, UTS, dan UAS",
        href: "/admin/nilai",
        icon: PenLine,
      },
      {
        label: "Nilai Saya",
        description: "Rekap transkrip nilai individu",
        href: "/admin/nilai-saya",
        icon: FileText,
      },
      {
        label: "Rekap Kelas",
        description: "Ringkasan perbandingan nilai antar kelas",
        href: "/admin/rekap",
        icon: BarChart3,
      },
      {
        label: "Leaderboard",
        description: "Peringkat prestasi siswa",
        href: "/admin/leaderboard",
        icon: Trophy,
        dividerBefore: true,
      },
    ],
  },
  {
    label: "Sistem & SPK",
    sectionTitle: "Konfigurasi & Pengaturan",
    icon: Settings,
    items: [
      {
        label: "Konfigurasi SPK",
        description: "Kriteria dan pembobotan metode SAW",
        href: "/admin/spk",
        icon: Settings,
      },
      {
        label: "Manajemen Data",
        description: "Tahun ajaran dan pencadangan data",
        href: "/admin/manajemen-data",
        icon: Database,
      },
      {
        label: "Manajemen Akun",
        description: "Kelola akun pengguna dan hak akses",
        href: "/admin/akun",
        icon: UserCog,
      },
    ],
  },
];

export const GURU_NAV_ITEMS = [
  { label: "Beranda", href: "/guru", icon: LayoutDashboard },
  { label: "Absensi", href: "/guru/absensi", icon: ClipboardCheck },
  { label: "Input Nilai", href: "/guru/nilai", icon: PenLine },
  { label: "Rekap Kelas", href: "/guru/rekap", icon: BarChart3 },
  { label: "Leaderboard", href: "/guru/leaderboard", icon: Trophy },
];

export const SISWA_NAV_ITEMS = [
  { label: "Beranda", href: "/siswa", icon: LayoutDashboard },
  { label: "Riwayat Absensi", href: "/siswa/absensi", icon: CalendarCheck },
  { label: "Nilai Saya", href: "/siswa/nilai", icon: FileText },
  { label: "Leaderboard", href: "/siswa/leaderboard", icon: Trophy },
];

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "U"
  );
}

function getRoleMeta(role: UserRole) {
  switch (role) {
    case "ADMIN":
      return {
        label: "Administrator",
        subtitle: "Sistem Administrasi Sekolah",
      };
    case "GURU":
      return {
        label: "Guru Pengajar",
        subtitle: "Portal Akademik Guru",
      };
    case "SISWA":
      return {
        label: "Siswa",
        subtitle: "Portal Akademik Siswa",
      };
  }
}

interface TopbarProps {
  user: TopbarUser;
  onMenuClick: () => void;
}

export function Topbar({ user, onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const roleMeta = getRoleMeta(user.role);
  const homeHref = `/${user.role.toLowerCase()}`;

  const isRouteActive = (href: string) => {
    if (href === homeHref) return pathname === homeHref;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-[#0a192f] via-[#1e3a8a] to-[#0f172a] border-b border-blue-900/80 text-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Sisi Kiri: Tombol Menu Mobile & Brand Sekolah */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onMenuClick}
              className="lg:hidden p-2 -ml-2 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href={homeHref} className="flex items-center space-x-3 group">
              <div className="relative h-9 w-9 flex items-center justify-center shrink-0">
                <Image
                  src="/logo.png?v=2"
                  alt="Logo SMK Penerbangan Dirgantara"
                  fill
                  sizes="36px"
                  unoptimized
                  className="object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-extrabold tracking-wide text-white uppercase">
                    SIMESA
                  </span>
                  <span className="hidden sm:inline-block text-[11px] font-medium text-amber-300/90 border border-amber-400/30 px-1.5 py-0.5 rounded-sm">
                    SMK Penerbangan Dirgantara
                  </span>
                </div>
                <p className="text-[11px] text-blue-200/80 mt-0.5 leading-none">
                  {roleMeta.subtitle}
                </p>
              </div>
            </Link>
          </div>

          {/* Sisi Tengah: Menu Navigasi Horizontal */}
          <nav className="hidden lg:flex items-center space-x-1">
            {user.role === "ADMIN" ? (
              <>
                <Link
                  href="/admin"
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors",
                    pathname === "/admin"
                      ? "text-white bg-white/15 font-semibold"
                      : "text-blue-100/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  <LayoutDashboard className="w-4 h-4 text-blue-200" />
                  Beranda
                </Link>

                {ADMIN_DROPDOWN_GROUPS.map((group) => {
                  const groupActive = group.items.some((item) =>
                    isRouteActive(item.href)
                  );
                  const GroupIcon = group.icon;

                  return (
                    <div key={group.label} className="relative group">
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors focus:outline-none",
                          groupActive
                            ? "text-white bg-white/15 font-semibold"
                            : "text-blue-100/80 hover:text-white hover:bg-white/10"
                        )}
                      >
                        <GroupIcon className="w-4 h-4 text-blue-200" />
                        {group.label}
                        <ChevronDown className="w-3.5 h-3.5 text-blue-200 group-hover:text-white transition-transform duration-150" />
                      </button>

                      <div className="absolute left-0 top-full pt-1.5 w-72 invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-150 z-50">
                        <div className="rounded-lg bg-white p-2 shadow-lg border border-slate-200 text-slate-800">
                          <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                            {group.sectionTitle}
                          </div>
                          {group.items.map((item) => {
                            const ItemIcon = item.icon;
                            const active = isRouteActive(item.href);
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                  "flex items-start gap-3 p-2 rounded-md transition-colors",
                                  item.dividerBefore &&
                                    "border-t border-slate-100 mt-1 pt-2",
                                  active
                                    ? "bg-blue-50 text-[#1e3a8a]"
                                    : "hover:bg-slate-50 text-slate-700"
                                )}
                              >
                                <div className="p-1.5 rounded bg-blue-50 text-[#1e3a8a] shrink-0 mt-0.5">
                                  <ItemIcon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={cn(
                                      "text-xs font-semibold",
                                      active ? "text-[#1e3a8a]" : "text-slate-900"
                                    )}
                                  >
                                    {item.label}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {item.description}
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              (user.role === "GURU" ? GURU_NAV_ITEMS : SISWA_NAV_ITEMS).map(
                (item) => {
                  const ItemIcon = item.icon;
                  const active = isRouteActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors",
                        active
                          ? "text-white bg-white/15 font-semibold"
                          : "text-blue-100/80 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <ItemIcon className="w-4 h-4 text-blue-200" />
                      <span>{item.label}</span>
                    </Link>
                  );
                }
              )
            )}
          </nav>

          {/* Sisi Kanan: Profil Pengguna */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="flex items-center space-x-2.5 px-2 py-1.5 rounded-md hover:bg-white/10 transition-colors focus:outline-none"
                  />
                }
              >
                <div className="w-8 h-8 rounded-md bg-white/10 text-white border border-white/20 flex items-center justify-center font-bold text-xs shrink-0">
                  {getInitials(user.nama)}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <div className="text-xs font-semibold text-white max-w-[150px] truncate">
                    {user.nama}
                  </div>
                  <div className="text-xs text-blue-200 mt-0.5">
                    {roleMeta.label}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-blue-200" />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-56 p-1 rounded-lg border-slate-200 shadow-lg text-slate-800"
              >
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {user.nama}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {user.username || user.email}
                  </p>
                </div>
                <DropdownMenuItem
                  className="cursor-pointer text-xs rounded-md py-2 gap-2"
                  onClick={() => router.push(`${homeHref}/profil`)}
                >
                  <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                  Profil Akun
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem
                  className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer text-xs rounded-md py-2 gap-2"
                  onClick={async () => {
                    await authClient.signOut();
                    router.push("/login");
                  }}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
