"use client";

import { useState, useEffect, useRef } from "react";
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
  ScrollText,
  BookMarked,
  BarChart3,
  Trophy,
  Settings,
  Database,
  UserCog,
  CalendarCheck,
  User as UserIcon,
  LogOut,
  ShieldAlert,
  HeartHandshake,
  Loader2,
  Activity,
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
import { authClient, setSigningOut } from "@/lib/auth-client";
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
        icon: ScrollText,
      },
      {
        label: "E-Rapor Internal",
        description: "Evaluasi rapor dan pencetakan lembar hasil belajar",
        href: "/admin/erapor",
        icon: BookMarked,
      },
      {
        label: "Rekap Kelas",
        description: "Ringkasan perbandingan nilai antar kelas",
        href: "/admin/rekap",
        icon: BarChart3,
      },
      {
        label: "Buku Poin & Sanksi",
        description: "Catatan pelanggaran siswa & draf SP",
        href: "/admin/pelanggaran",
        icon: ShieldAlert,
      },
      {
        label: "Konseling BK",
        description: "Sesi bimbingan, pantauan karakter, dan dispensasi",
        href: "/admin/konseling",
        icon: HeartHandshake,
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
      {
        label: "Riwayat Aktivitas",
        description: "Audit trail dan rekam jejak sistem",
        href: "/admin/riwayat-aktivitas",
        icon: Activity,
      },
    ],
  },
];

export const GURU_DROPDOWN_GROUPS: NavDropdownGroup[] = [
  {
    label: "Akademik",
    sectionTitle: "Pembelajaran dan Penilaian",
    icon: GraduationCap,
    items: [
      {
        label: "Absensi Siswa",
        description: "Pencatatan presensi harian kelas",
        href: "/guru/absensi",
        icon: ClipboardCheck,
      },
      {
        label: "Input Nilai",
        description: "Pengisian nilai tugas, UTS, dan UAS",
        href: "/guru/nilai",
        icon: PenLine,
      },
      {
        label: "E-Rapor Siswa",
        description: "Pengesahan catatan dan cetak lembar rapor",
        href: "/guru/erapor",
        icon: BookMarked,
      },
      {
        label: "Rekap Kelas",
        description: "Ringkasan capaian dan nilai kelas",
        href: "/guru/rekap",
        icon: BarChart3,
      },
      {
        label: "Mata Pelajaran",
        description: "Daftar mata pelajaran dan standar KKM",
        href: "/guru/mapel",
        icon: BookOpen,
      },
    ],
  },
  {
    label: "Kesiswaan",
    sectionTitle: "Bimbingan dan Kedisiplinan",
    icon: HeartHandshake,
    items: [
      {
        label: "Buku Poin",
        description: "Catatan pelanggaran dan sanksi siswa",
        href: "/guru/pelanggaran",
        icon: ShieldAlert,
      },
      {
        label: "Konseling BK",
        description: "Sesi bimbingan konseling dan dispensasi",
        href: "/guru/konseling",
        icon: HeartHandshake,
      },
    ],
  },
];

export const GURU_NAV_ITEMS = [
  { label: "Beranda", href: "/guru", icon: LayoutDashboard },
  { label: "Absensi", href: "/guru/absensi", icon: ClipboardCheck },
  { label: "Input Nilai", href: "/guru/nilai", icon: PenLine },
  { label: "E-Rapor", href: "/guru/erapor", icon: BookMarked },
  { label: "Rekap Kelas", href: "/guru/rekap", icon: BarChart3 },
  { label: "Mata Pelajaran", href: "/guru/mapel", icon: BookOpen },
  { label: "Buku Poin", href: "/guru/pelanggaran", icon: ShieldAlert },
  { label: "Konseling BK", href: "/guru/konseling", icon: HeartHandshake },
  { label: "Leaderboard", href: "/guru/leaderboard", icon: Trophy },
];

export const SISWA_DROPDOWN_GROUPS: NavDropdownGroup[] = [
  {
    label: "Akademik",
    sectionTitle: "Pembelajaran dan Nilai",
    icon: GraduationCap,
    items: [
      {
        label: "Riwayat Absensi",
        description: "Rekap kehadiran dan status presensi harian",
        href: "/siswa/absensi",
        icon: CalendarCheck,
      },
      {
        label: "Nilai Saya",
        description: "Daftar nilai tugas, UTS, dan UAS tiap mata pelajaran",
        href: "/siswa/nilai",
        icon: ScrollText,
      },
      {
        label: "E-Rapor",
        description: "Ringkasan capaian rapor dan cetak hasil belajar",
        href: "/siswa/erapor",
        icon: BookMarked,
      },
    ],
  },
  {
    label: "Kesiswaan",
    sectionTitle: "Kedisiplinan dan Pendampingan",
    icon: HeartHandshake,
    items: [
      {
        label: "Buku Poin",
        description: "Akumulasi poin tata tertib dan riwayat pembinaan",
        href: "/siswa/pelanggaran",
        icon: ShieldAlert,
      },
      {
        label: "Konseling BK",
        description: "Jadwal bimbingan konseling dan izin dispensasi",
        href: "/siswa/konseling",
        icon: HeartHandshake,
      },
    ],
  },
];

export const SISWA_NAV_ITEMS = [
  { label: "Beranda", href: "/siswa", icon: LayoutDashboard },
  { label: "Riwayat Absensi", href: "/siswa/absensi", icon: CalendarCheck },
  { label: "Nilai Saya", href: "/siswa/nilai", icon: ScrollText },
  { label: "Buku Poin", href: "/siswa/pelanggaran", icon: ShieldAlert },
  { label: "Konseling BK", href: "/siswa/konseling", icon: HeartHandshake },
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
  const [academicYearDisplay, setAcademicYearDisplay] = useState("T.A. 2025/2026 - Genap");
  const [isNavbarHidden, setIsNavbarHidden] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const lastScrollYRef = useRef(0);
  const anchorYRef = useRef(0);
  const hiddenRef = useRef(false);
  const profileMenuOpenRef = useRef(false);

  useEffect(() => {
    hiddenRef.current = false;
    profileMenuOpenRef.current = false;
    setIsNavbarHidden(false);
    const y = typeof window !== "undefined" ? Math.max(0, window.scrollY) : 0;
    lastScrollYRef.current = y;
    anchorYRef.current = y;
  }, [pathname]);

  useEffect(() => {
    const initialY = Math.max(0, window.scrollY);
    lastScrollYRef.current = initialY;
    anchorYRef.current = initialY;
    let rafId: number | null = null;

    const HIDE_DISTANCE = 48;
    const SHOW_DISTANCE = 16;

    const updateVisibility = () => {
      rafId = null;
      const currentY = Math.max(0, window.scrollY);
      const stepDelta = currentY - lastScrollYRef.current;
      lastScrollYRef.current = currentY;

      if (stepDelta === 0) return;

      // Selalu tampil saat di bagian atas halaman atau dropdown profil sedang terbuka
      if (currentY <= 80 || profileMenuOpenRef.current) {
        if (hiddenRef.current) {
          hiddenRef.current = false;
          setIsNavbarHidden(false);
        }
        anchorYRef.current = currentY;
        return;
      }

      if (stepDelta > 0) {
        // Sedang scroll ke bawah
        if (hiddenRef.current) {
          // Geser titik acuan ke posisi terbawah agar tarikan ke atas selalu responsif
          anchorYRef.current = currentY;
        } else if (
          !headerRef.current?.matches(":hover") &&
          currentY > 120 &&
          currentY - anchorYRef.current >= HIDE_DISTANCE
        ) {
          hiddenRef.current = true;
          setIsNavbarHidden(true);
          anchorYRef.current = currentY;
        }
      } else {
        // Sedang scroll ke atas (abaikan pantulan di paling bawah halaman)
        const maxScrollY =
          document.documentElement.scrollHeight - window.innerHeight;
        const isAtBottomBounce = maxScrollY > 0 && currentY >= maxScrollY - 8;

        if (!hiddenRef.current) {
          anchorYRef.current = currentY;
        } else if (
          !isAtBottomBounce &&
          anchorYRef.current - currentY >= SHOW_DISTANCE
        ) {
          hiddenRef.current = false;
          setIsNavbarHidden(false);
          anchorYRef.current = currentY;
        }
      }
    };

    const handleScroll = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(updateVisibility);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/system/academic-years")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return;
        const active = (data as AcademicYearItem[]).find((y) => y.isActive);
        if (active) {
          setAcademicYearDisplay(`T.A. ${active.tahunAjaran} - ${active.semester}`);
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
    setSigningOut(true);
    toast.loading("Mengakhiri sesi...", { id: "logout-toast" });
    try {
      await authClient.signOut();
      toast.success("Berhasil keluar dari sistem", { id: "logout-toast" });
      // Gunakan navigasi penuh agar seluruh cache sesi dan RSC stream dibersihkan tuntas
      window.location.replace("/login");
    } catch {
      setSigningOut(false);
      setIsLoggingOut(false);
      toast.error("Gagal keluar", { id: "logout-toast" });
    }
  };

  const renderDropdownGroup = (group: NavDropdownGroup) => {
    const groupActive = group.items.some((item) =>
      isRouteActive(item.href)
    );
    const GroupIcon = group.icon;

    return (
      <div key={group.label} className="relative group">
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1.5 xl:px-3 xl:py-1.5 text-xs xl:text-[13px] font-medium rounded-lg transition-colors focus:outline-none cursor-pointer whitespace-nowrap",
            groupActive
              ? "bg-white/12 text-white font-semibold"
              : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
          )}
        >
          <GroupIcon className={cn("w-3.5 h-3.5 xl:w-4 xl:h-4", groupActive ? "text-amber-300" : "text-slate-400")} />
          {group.label}
          <ChevronDown className={cn("w-3 h-3 xl:w-3.5 xl:h-3.5 transition-transform duration-200 group-hover:rotate-180", groupActive ? "text-slate-200" : "text-slate-400 group-hover:text-white")} />
        </button>

        {/* Dropdown Container dengan Invisible Bridge */}
        <div className="absolute left-0 top-full pt-2 w-72 invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-150 z-50">
          <div className="rounded-xl bg-white p-1.5 shadow-lg border border-slate-200 text-slate-800">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
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
                    "flex items-start gap-2.5 p-2 rounded-lg transition-colors",
                    item.dividerBefore &&
                      "border-t border-slate-100 mt-1 pt-2",
                    active
                      ? "bg-blue-50/90 text-[#1e3a8a]"
                      : "hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <div className="p-1.5 rounded-md bg-slate-100 text-[#1e3a8a] shrink-0 mt-0.5">
                    <ItemIcon className="w-3.5 h-3.5" />
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
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
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
  };

  return (
    <header
      ref={headerRef}
      onFocus={() => {
        if (hiddenRef.current) {
          hiddenRef.current = false;
          setIsNavbarHidden(false);
        }
      }}
      className={cn(
        "sticky top-0 z-50 bg-[#0F172A] border-b border-slate-800 text-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
        isNavbarHidden
          ? "-translate-y-full shadow-none pointer-events-none"
          : "translate-y-0 shadow-md"
      )}
    >
      <div className="w-full px-3 sm:px-5 lg:px-6 xl:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Sisi Kiri: Tombol Menu Mobile & Brand Sekolah */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
            <button
              type="button"
              onClick={onMenuClick}
              className="lg:hidden p-2 -ml-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href={homeHref} className="flex items-center gap-2.5 py-1 min-w-0">
              <div className="relative h-9 w-9 flex items-center justify-center shrink-0 rounded-lg bg-white/[0.06] border border-white/10 p-1">
                <Image
                  src="/logo.png?v=2"
                  alt="Logo SMK Penerbangan Dirgantara"
                  fill
                  sizes="36px"
                  unoptimized
                  className="object-contain"
                />
              </div>
              <div className="min-w-0 leading-tight">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-bold tracking-tight text-white">
                    SIMESA
                  </span>
                  <span className="hidden xl:inline-block h-3.5 w-px bg-slate-700" />
                  <span className="hidden xl:inline text-xs font-medium text-slate-400 whitespace-nowrap">
                    SMK Penerbangan Dirgantara
                  </span>
                </div>
                <p className="hidden sm:block xl:hidden text-[11px] text-slate-400 font-medium truncate max-w-[180px]">
                  SMK Penerbangan Dirgantara
                </p>
              </div>
            </Link>
          </div>

          {/* Sisi Tengah: Menu Navigasi Horizontal */}
          <nav className="hidden lg:flex items-center gap-1 shrink-0">
            {isPortalAdmin ? (
              <>
                <Link
                  href="/admin"
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 xl:px-3 xl:py-1.5 text-xs xl:text-[13px] font-medium rounded-lg transition-colors whitespace-nowrap",
                    pathname === "/admin"
                      ? "bg-white/12 text-white font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                  )}
                >
                  <LayoutDashboard className={cn("w-3.5 h-3.5 xl:w-4 xl:h-4", pathname === "/admin" ? "text-amber-300" : "text-slate-400")} />
                  Beranda
                </Link>

                {ADMIN_DROPDOWN_GROUPS.map(renderDropdownGroup)}
              </>
            ) : isPortalGuru ? (
              <>
                <Link
                  href="/guru"
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 xl:px-3 xl:py-1.5 text-xs xl:text-[13px] font-medium rounded-lg transition-colors whitespace-nowrap",
                    pathname === "/guru"
                      ? "bg-white/12 text-white font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                  )}
                >
                  <LayoutDashboard className={cn("w-3.5 h-3.5 xl:w-4 xl:h-4", pathname === "/guru" ? "text-amber-300" : "text-slate-400")} />
                  Beranda
                </Link>

                {GURU_DROPDOWN_GROUPS.map(renderDropdownGroup)}

                <Link
                  href="/guru/leaderboard"
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 xl:px-3 xl:py-1.5 text-xs xl:text-[13px] font-medium rounded-lg transition-colors whitespace-nowrap",
                    pathname === "/guru/leaderboard"
                      ? "bg-white/12 text-white font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                  )}
                >
                  <Trophy className={cn("w-3.5 h-3.5 xl:w-4 xl:h-4", pathname === "/guru/leaderboard" ? "text-amber-300" : "text-slate-400")} />
                  Leaderboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/siswa"
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 xl:px-3 xl:py-1.5 text-xs xl:text-[13px] font-medium rounded-lg transition-colors whitespace-nowrap",
                    pathname === "/siswa"
                      ? "bg-white/12 text-white font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                  )}
                >
                  <LayoutDashboard className={cn("w-3.5 h-3.5 xl:w-4 xl:h-4", pathname === "/siswa" ? "text-amber-300" : "text-slate-400")} />
                  Beranda
                </Link>

                {SISWA_DROPDOWN_GROUPS.map(renderDropdownGroup)}

                <Link
                  href="/siswa/leaderboard"
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 xl:px-3 xl:py-1.5 text-xs xl:text-[13px] font-medium rounded-lg transition-colors whitespace-nowrap",
                    pathname === "/siswa/leaderboard"
                      ? "bg-white/12 text-white font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                  )}
                >
                  <Trophy className={cn("w-3.5 h-3.5 xl:w-4 xl:h-4", pathname === "/siswa/leaderboard" ? "text-amber-300" : "text-slate-400")} />
                  Leaderboard
                </Link>
              </>
            )}
          </nav>

          {/* Sisi Kanan: Tahun Ajaran & Profil Pengguna */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Badge Konteks Tahun Ajaran */}
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-xs text-slate-300 font-medium whitespace-nowrap shrink-0">
              <CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>{academicYearDisplay}</span>
            </div>

            <DropdownMenu
              onOpenChange={(open) => {
                profileMenuOpenRef.current = open;
                if (open && hiddenRef.current) {
                  hiddenRef.current = false;
                  setIsNavbarHidden(false);
                }
              }}
            >
              <DropdownMenuTrigger
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 transition-colors focus:outline-none cursor-pointer max-w-[180px] sm:max-w-[230px] shrink-0"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-slate-800 text-slate-100 border border-slate-700 flex items-center justify-center font-semibold text-xs shrink-0 overflow-hidden relative">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.nama}
                        fill
                        sizes="32px"
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      getInitials(user.nama)
                    )}
                  </div>
                  <div className="block text-left leading-tight min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate max-w-[90px] sm:max-w-[130px]">
                      {user.nama}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium truncate">
                      {roleMeta.label}
                    </div>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-56 p-1.5 rounded-xl border border-slate-200/80 shadow-xl bg-white text-slate-800 animate-in fade-in-50 zoom-in-95 duration-150"
              >
                {/* Identitas Ringkas */}
                <div className="px-2.5 py-2 space-y-0.5">
                  <p className="text-xs font-semibold text-slate-900 leading-snug break-words">
                    {user.nama}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 truncate">
                    {user.username ? `@${user.username}` : user.email}
                  </p>
                  {extraRoles.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1">
                      {extraRoles.map((r) => {
                        const cfg = ROLE_CONFIGS[r];
                        return (
                          <span
                            key={r}
                            className={cn(
                              "inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border",
                              cfg
                                ? cfg.badgeColor
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            )}
                          >
                            +{cfg ? cfg.label : r}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <DropdownMenuSeparator className="bg-slate-100 my-1" />

                <DropdownMenuItem
                  className="cursor-pointer text-xs font-medium text-slate-700 rounded-lg px-2.5 py-2 gap-2.5 hover:bg-slate-50 hover:text-slate-900 focus:bg-slate-50 transition-colors"
                  onClick={() => router.push(`${homeHref}/profil`)}
                >
                  <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Profil &amp; Keamanan</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="cursor-pointer text-xs font-medium text-rose-600 rounded-lg px-2.5 py-2 gap-2.5 hover:bg-rose-50/80 hover:text-rose-700 focus:bg-rose-50/80 focus:text-rose-700 transition-colors disabled:opacity-50"
                  disabled={isLoggingOut}
                  onClick={handleLogout}
                >
                  {isLoggingOut ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <LogOut className="w-4 h-4 shrink-0" />
                  )}
                  <span>Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
