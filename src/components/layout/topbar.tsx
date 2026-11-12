"use client";

import { useState, useEffect } from "react";
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
import { ROLE_CONFIGS, type AppRole, getPortalForRole } from "@/lib/rbac";

export interface TopbarUser {
  id: string;
  nama: string;
  username: string;
  email?: string;
  role: UserRole;
  image?: string | null;
  additionalRoles?: string[];
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
        description: "Daftar kelas dan wali kelas",
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
  const cfg = ROLE_CONFIGS[role as AppRole];
  if (cfg) {
    return {
      label: cfg.label,
      subtitle: "Sistem Informasi Manajemen Elektronik Sekolah dan Administrasi",
    };
  }
  return {
    label: role,
    subtitle: "Sistem Informasi Manajemen Elektronik Sekolah dan Administrasi",
  };
}

interface TopbarProps {
  user: TopbarUser;
  onMenuClick: () => void;
}

interface AcademicYearItem {
  id: string;
  tahunAjaran: string;
  semester: string;
  isActive: boolean;
}

export function Topbar({ user, onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [academicYearDisplay, setAcademicYearDisplay] = useState("T.A. 2025/2026 • Genap");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/system/academic-years")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return;
        const active = (data as AcademicYearItem[]).find((y) => y.isActive);
        if (active) {
          setAcademicYearDisplay(`T.A. ${active.tahunAjaran} • ${active.semester}`);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const [extraRoles, setExtraRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/roles")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.additionalRoles)) {
          setExtraRoles(data.additionalRoles);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const roleMeta = getRoleMeta(user.role);
  const homeHref = getPortalForRole(user.role);
  const isPortalAdmin = homeHref === "/admin";
  const isPortalGuru = homeHref === "/guru";

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
    <header className="sticky top-0 z-50 bg-gradient-to-r from-[#091424] via-[#0d1e38] to-[#0a1526] border-b border-white/10 text-white shadow-md backdrop-blur-md">
      <div className="w-full px-3 sm:px-5 lg:px-6 xl:px-8">
        <div className="flex items-center justify-between h-20 gap-2 sm:gap-4">
          {/* Sisi Kiri: Tombol Menu Mobile & Brand Sekolah */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0 min-w-0">
            <button
              type="button"
              onClick={onMenuClick}
              className="lg:hidden p-2.5 -ml-1 sm:-ml-2 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link href={homeHref} className="flex items-center space-x-2.5 sm:space-x-3.5 group py-1 min-w-0">
              <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center shrink-0 drop-shadow-sm ring-1 ring-white/15 rounded-full p-0.5 bg-white/5">
                <Image
                  src="/logo.png?v=2"
                  alt="Logo SMK Penerbangan Dirgantara"
                  fill
                  sizes="48px"
                  unoptimized
                  className="object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <span className="text-base sm:text-lg lg:text-xl font-extrabold tracking-wide text-white uppercase drop-shadow-xs">
                    SIMESA
                  </span>
                  <span className="hidden md:inline-flex items-center text-[10px] sm:text-[11px] font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 sm:px-2.5 py-0.5 rounded-full tracking-wide shadow-xs whitespace-nowrap">
                    SMK Penerbangan Dirgantara
                  </span>
                </div>
                <p className="hidden 2xl:block text-[11px] sm:text-xs text-blue-200/90 mt-0.5 font-medium leading-none truncate max-w-[280px]">
                  {roleMeta.subtitle}
                </p>
              </div>
            </Link>
          </div>

          {/* Sisi Tengah: Menu Navigasi Horizontal */}
          <nav className="hidden lg:flex items-center space-x-1 xl:space-x-1.5 shrink-0">
            {isPortalAdmin ? (
              <>
                <Link
                  href="/admin"
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 xl:px-3.5 xl:py-2 text-xs xl:text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                    pathname === "/admin"
                      ? "text-amber-200 bg-transparent border border-amber-400/40 hover:border-amber-400/70 font-semibold shadow-[0_0_12px_rgba(251,191,36,0.12)]"
                      : "text-blue-100/80 hover:text-white hover:bg-white/5 border border-transparent"
                  )}
                >
                  <LayoutDashboard className={cn("w-3.5 h-3.5 xl:w-4 xl:h-4", pathname === "/admin" ? "text-amber-300" : "text-blue-200")} />
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
                          "inline-flex items-center gap-1 xl:gap-1.5 px-2.5 py-1.5 xl:px-3.5 xl:py-2 text-xs xl:text-sm font-medium rounded-lg transition-all focus:outline-none cursor-pointer whitespace-nowrap",
                          groupActive
                            ? "text-amber-200 bg-transparent border border-amber-400/40 hover:border-amber-400/70 font-semibold shadow-[0_0_12px_rgba(251,191,36,0.12)]"
                            : "text-blue-100/80 hover:text-white hover:bg-white/5 border border-transparent"
                        )}
                      >
                        <GroupIcon className={cn("w-3.5 h-3.5 xl:w-4 xl:h-4", groupActive ? "text-amber-300" : "text-blue-200")} />
                        {group.label}
                        <ChevronDown className={cn("w-3 h-3 xl:w-3.5 xl:h-3.5 transition-transform duration-200 group-hover:rotate-180", groupActive ? "text-amber-300" : "text-blue-200 group-hover:text-white")} />
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
              (isPortalGuru ? GURU_NAV_ITEMS : SISWA_NAV_ITEMS).map(
                (item) => {
                  const ItemIcon = item.icon;
                  const active = isRouteActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1.5 xl:px-3.5 xl:py-2 text-xs xl:text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                        active
                          ? "text-amber-200 bg-transparent border border-amber-400/40 hover:border-amber-400/70 font-semibold shadow-[0_0_12px_rgba(251,191,36,0.12)]"
                          : "text-blue-100/80 hover:text-white hover:bg-white/5 border border-transparent"
                      )}
                    >
                      <ItemIcon className={cn("w-3.5 h-3.5 xl:w-4 xl:h-4", active ? "text-amber-300" : "text-blue-200")} />
                      <span>{item.label}</span>
                    </Link>
                  );
                }
              )
            )}
          </nav>

          {/* Sisi Kanan: Tahun Ajaran & Profil Pengguna */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Badge Konteks Tahun Ajaran */}
            <div className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-transparent border border-amber-400/30 hover:border-amber-400/60 text-xs text-amber-200/90 font-medium transition-colors shadow-xs whitespace-nowrap shrink-0">
              <CalendarCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>{academicYearDisplay}</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex items-center justify-between gap-1.5 sm:gap-2.5 px-2 py-1 sm:px-3 sm:py-2 rounded-2xl bg-transparent hover:bg-amber-400/5 border border-amber-400/40 hover:border-amber-400/80 hover:shadow-[0_0_15px_rgba(251,191,36,0.12)] transition-all focus:outline-none cursor-pointer w-auto max-w-[180px] min-[390px]:max-w-[210px] sm:w-64 sm:max-w-none lg:w-auto lg:max-w-[200px] xl:w-64 xl:max-w-none shadow-xs group shrink-0"
              >
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 xl:w-10 xl:h-10 rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/30 ring-1 ring-amber-400/20 group-hover:bg-amber-400/15 group-hover:border-amber-400/50 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 overflow-hidden relative shadow-xs transition-colors">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.nama}
                        fill
                        sizes="40px"
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      getInitials(user.nama)
                    )}
                  </div>
                  <div className="block text-left leading-tight min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-semibold text-white group-hover:text-amber-100 truncate max-w-[85px] min-[390px]:max-w-[110px] sm:max-w-none lg:max-w-[115px] xl:max-w-none transition-colors">
                      {user.nama}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-emerald-400 font-medium mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="truncate">{roleMeta.label}</span>
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-amber-300/80 group-hover:text-amber-300 shrink-0 transition-colors" />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-64 p-2 rounded-2xl border border-slate-200/80 shadow-2xl bg-white/98 backdrop-blur-xl text-slate-800 animate-in fade-in-50 zoom-in-95 duration-150"
              >
                {/* Header Identitas Pengguna */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/80 mb-1 flex items-center gap-3">
                  <div className="relative w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center font-bold text-sm text-[#1e3a8a] shrink-0 overflow-hidden">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.nama}
                        fill
                        sizes="44px"
                        unoptimized
                        className="object-cover"
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
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                        <ShieldCheck className="w-3 h-3 text-blue-600" />
                        {roleMeta.label}
                      </span>
                      {extraRoles.map((r) => {
                        const cfg = ROLE_CONFIGS[r];
                        return (
                          <span
                            key={r}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                              cfg ? cfg.badgeColor : "bg-amber-50 text-amber-700 border-amber-200"
                            )}
                          >
                            +{cfg ? cfg.label : r}
                          </span>
                        );
                      })}
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
