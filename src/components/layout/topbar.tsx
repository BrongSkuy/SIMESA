"use client";

import { useState } from "react";
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
  ShieldCheck,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
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
  image?: string | null;
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
        label: "Transkrip Siswa",
        description: "Pratinjau transkrip & skor per siswa",
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
        subtitle:
          "Sistem Informasi Manajemen Elektronik Sekolah dan Administrasi",
      };
    case "GURU":
      return {
        label: "Guru Pengajar",
        subtitle:
          "Sistem Informasi Manajemen Elektronik Sekolah dan Administrasi",
      };
    case "SISWA":
      return {
        label: "Siswa",
        subtitle:
          "Sistem Informasi Manajemen Elektronik Sekolah dan Administrasi",
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const roleMeta = getRoleMeta(user.role);
  const homeHref = `/${user.role.toLowerCase()}`;

  const isRouteActive = (href: string) => {
    if (href === homeHref) return pathname === homeHref;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    toast.loading("Mengakhiri sesi...", { id: "logout-toast" });
    try {
      await authClient.signOut();
      toast.success("Berhasil keluar dari sistem", { id: "logout-toast" });
      router.push("/login");
    } catch {
      toast.error("Gagal keluar", { id: "logout-toast" });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-[#091424] via-[#0d1e38] to-[#0a1526] border-b border-white/10 text-white shadow-xs backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between h-16 sm:h-[68px] gap-4">
          {/* Sisi Kiri: Tombol Menu Mobile & Brand Sekolah */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onMenuClick}
              className="lg:hidden p-2 -ml-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href={homeHref} className="flex items-center space-x-3 group py-1">
              <div className="relative h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center shrink-0 drop-shadow-xs ring-1 ring-white/10 rounded-xl p-0.5 bg-white/[0.04]">
                <Image
                  src="/logo.png?v=2"
                  alt="Logo SMK Penerbangan Dirgantara"
                  fill
                  sizes="44px"
                  unoptimized
                  className="object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-extrabold tracking-wider text-white uppercase">
                    SIMESA
                  </span>
                  <span className="hidden sm:inline-flex items-center text-[10px] sm:text-[11px] font-semibold text-amber-300 bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded-md tracking-wide">
                    SMK Penerbangan Dirgantara
                  </span>
                </div>
                <p className="text-[11px] text-blue-200/70 mt-0.5 font-medium leading-none hidden md:block">
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
                    "inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl transition-all",
                    pathname === "/admin"
                      ? "text-amber-300 bg-white/[0.06] border border-amber-400/35 font-semibold shadow-xs"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent"
                  )}
                >
                  <LayoutDashboard className={cn("w-4 h-4", pathname === "/admin" ? "text-amber-400" : "text-slate-400")} />
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
                          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl transition-all focus:outline-none cursor-pointer",
                          groupActive
                            ? "text-amber-300 bg-white/[0.06] border border-amber-400/35 font-semibold shadow-xs"
                            : "text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent"
                        )}
                      >
                        <GroupIcon className={cn("w-4 h-4", groupActive ? "text-amber-400" : "text-slate-400")} />
                        {group.label}
                        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-180", groupActive ? "text-amber-400" : "text-slate-400 group-hover:text-white")} />
                      </button>

                      {/* Dropdown Container dengan Invisible Bridge */}
                      <div className="absolute left-0 top-full pt-2 w-72 invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-150 z-50">
                        <div className="rounded-2xl bg-white/98 backdrop-blur-lg p-2 shadow-2xl border border-slate-200/90 text-slate-800">
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
                                  "flex items-start gap-3 p-2 rounded-xl transition-colors",
                                  item.dividerBefore &&
                                    "border-t border-slate-100 mt-1 pt-2",
                                  active
                                    ? "bg-blue-50 text-[#1e3a8a]"
                                    : "hover:bg-slate-50 text-slate-700"
                                )}
                              >
                                <div className="p-1.5 rounded-lg bg-blue-50 text-[#1e3a8a] shrink-0 mt-0.5">
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
                        "inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl transition-all",
                        active
                          ? "text-amber-300 bg-white/[0.06] border border-amber-400/35 font-semibold shadow-xs"
                          : "text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent"
                      )}
                    >
                      <ItemIcon className={cn("w-4 h-4", active ? "text-amber-400" : "text-slate-400")} />
                      <span>{item.label}</span>
                    </Link>
                  );
                }
              )
            )}
          </nav>

          {/* Sisi Kanan: Tahun Ajaran & Profil Pengguna */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Badge Konteks Tahun Ajaran */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-amber-300/90 font-medium transition-colors shadow-xs">
              <CalendarCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>T.A. 2024/2025 • Ganjil</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-amber-400/40 transition-all focus:outline-none cursor-pointer shadow-xs group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/25 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden relative shadow-xs">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.nama}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(user.nama)
                  )}
                </div>
                <div className="hidden sm:block text-left leading-tight min-w-0 pr-1">
                  <div className="text-xs sm:text-sm font-semibold text-white group-hover:text-amber-100 truncate max-w-[130px] transition-colors">
                    {user.nama}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="truncate">{roleMeta.label}</span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-300 shrink-0 transition-colors" />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-64 p-2 rounded-2xl border border-slate-200/80 shadow-2xl bg-white/98 backdrop-blur-xl text-slate-800 animate-in fade-in-50 zoom-in-95 duration-150"
              >
                {/* Header Identitas Pengguna */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/80 mb-1 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center font-bold text-sm text-[#1e3a8a] shrink-0 overflow-hidden">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.nama}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getInitials(user.nama)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-snug">
                      {user.nama}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 truncate leading-tight">
                      {user.username || user.email}
                    </p>
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                        {user.role === "ADMIN" && <ShieldCheck className="w-3 h-3 text-blue-600" />}
                        {user.role === "GURU" && <GraduationCap className="w-3 h-3 text-blue-600" />}
                        {user.role === "SISWA" && <UserIcon className="w-3 h-3 text-blue-600" />}
                        {roleMeta.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu Item: Profil & Keamanan */}
                <DropdownMenuItem
                  className="cursor-pointer text-xs rounded-xl p-2 gap-2.5 hover:bg-slate-50 focus:bg-slate-50 transition-colors"
                  onClick={() => router.push(`${homeHref}/profil`)}
                >
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900">
                      Profil &amp; Keamanan
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Ubah foto profil &amp; kata sandi
                    </p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-slate-100 my-1" />

                {/* Menu Item: Keluar Sistem */}
                <DropdownMenuItem
                  className="cursor-pointer text-xs rounded-xl p-2 gap-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50/80 focus:text-rose-700 focus:bg-rose-50/80 transition-colors disabled:opacity-50"
                  disabled={isLoggingOut}
                  onClick={handleLogout}
                >
                  <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 shrink-0">
                    {isLoggingOut ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-rose-600">
                      Keluar Sistem
                    </p>
                    <p className="text-[11px] text-rose-400">
                      Akhiri sesi otentikasi akun
                    </p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
