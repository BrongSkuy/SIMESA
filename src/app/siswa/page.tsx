"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  CalendarCheck,
  Trophy,
  Medal,
  TrendingUp,
  Loader2,
  ClipboardList,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StudentProfile {
  id: string;
  nis: string;
  namaLengkap: string;
  kelas: string;
  angkatan: string;
  jenisKelamin: string;
  status: string;
}

interface AttendanceStats {
  totalHadir: number;
  totalIzin: number;
  totalSakit: number;
  totalAlfa: number;
  totalRecords: number;
  persentaseKehadiran: number;
  dailyData: Array<{
    tanggal: string;
    hadir: number;
    izin: number;
    sakit: number;
    alfa: number;
  }>;
}

interface LeaderboardData {
  rank: number;
  studentId: string;
  namaLengkap: string;
  kelas: string;
  skorSPK: number;
}

export default function SiswaDashboard() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, statsRes, leaderboardRes] = await Promise.all([
          fetch("/api/students/me"),
          fetch("/api/students/me/attendance-stats"),
          fetch("/api/students/me/class-leaderboard"),
        ]);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
        }
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
        if (leaderboardRes.ok) {
          const lbData = await leaderboardRes.json();
          if (Array.isArray(lbData)) {
            setLeaderboard(lbData);
          }
        }
      } catch (err) {
        console.error("Failed to fetch student data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 bg-white border border-slate-200 text-slate-500">
        <p className="text-sm font-semibold text-slate-800">
          Profil siswa tidak ditemukan
        </p>
        <p className="text-xs">
          Silakan hubungi Administrator Sekolah apabila terjadi kendala akun.
        </p>
      </div>
    );
  }

  const initials =
    profile.namaLengkap
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "S";

  const kelasLeaderboard = leaderboard.filter(
    (e) => e.kelas === profile.kelas
  );

  const chartData = stats?.dailyData || [];

  return (
    <div className="space-y-6">
      {/* Unified Aero Masthead: Menyatu mulus secara visual dengan Topbar */}
      <section className="relative overflow-hidden -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10 pt-7 pb-10 bg-gradient-to-r from-[#091424] via-[#0d1e38] to-[#0a1526] border-b border-white/10 text-white shadow-xs space-y-6">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-44 bg-blue-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 space-y-6">
          {/* Header Info Row - Centered Executive Layout */}
          <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2.5 drop-shadow-xs">
                  <LayoutDashboard className="w-6 h-6 text-blue-400 shrink-0" />
                  <span>Ringkasan Akademik Siswa</span>
                </h1>
                <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-blue-300 border border-white/10 shadow-xs">
                  Portal Siswa
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-200/75 max-w-2xl leading-relaxed">
                Selamat datang, <strong className="text-white">{profile.namaLengkap}</strong> · Pantau presensi dan capaian evaluasi semester Anda
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Link href="/siswa/absensi">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:border-amber-400/40 hover:text-white transition-all cursor-pointer"
                >
                  <CalendarCheck className="h-3.5 w-3.5 text-amber-300" /> Riwayat Absensi
                </Button>
              </Link>
              <Link href="/siswa/nilai">
                <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/30 shadow-xs hover:shadow-md transition-all cursor-pointer">
                  <ClipboardList className="h-3.5 w-3.5 text-blue-100" /> Transkrip Nilai
                </Button>
              </Link>
            </div>
          </div>

          {/* Student Profile Info Card - Sleek Glassmorphism */}
          <div className="p-4 sm:p-5 rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-amber-400/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-400/10 border border-amber-400/30 ring-1 ring-amber-400/20 flex items-center justify-center text-amber-300 text-sm font-bold shrink-0 shadow-xs">
                {initials}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Siswa Aktif
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-white/5 text-slate-300 border border-white/10">
                    NIS: {profile.nis}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white mt-1">
                  {profile.namaLengkap}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-white/5 text-blue-300 border border-white/10">
                Kelas {profile.kelas}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-white/5 text-slate-300 border border-white/10">
                Angkatan {profile.angkatan}
              </span>
            </div>
          </div>

          {/* 3 KPI Cards - Sleek Glassmorphism Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-amber-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(251,191,36,0.06)] transition-all duration-200 cursor-pointer shadow-xs"
              title="Persentase Kehadiran"
              value={stats ? `${stats.persentaseKehadiran}%` : "0%"}
              icon={CalendarCheck}
              color="emerald"
              footerLeft="Akumulasi semester aktif"
              footerRight="Presensi"
            />
            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-amber-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(251,191,36,0.06)] transition-all duration-200 cursor-pointer shadow-xs"
              title="Total Pertemuan Hadir"
              value={stats?.totalHadir ?? 0}
              icon={Trophy}
              color="blue"
              footerLeft={`Dari ${stats?.totalRecords ?? 0} total catatan sesi`}
              footerRight="Tercatat"
            />
            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-amber-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(251,191,36,0.06)] transition-all duration-200 cursor-pointer shadow-xs"
              title="Ketidakhadiran"
              value={
                stats
                  ? stats.totalIzin + stats.totalSakit + stats.totalAlfa
                  : 0
              }
              icon={Medal}
              color="amber"
              footerLeft={`${stats?.totalIzin ?? 0} Izin · ${stats?.totalSakit ?? 0} Sakit · ${stats?.totalAlfa ?? 0} Alfa`}
              footerRight="Rincian"
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Attendance Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl group flex flex-col justify-between">
          <div>
            <div className="pb-3.5 border-b border-slate-100 group-hover:border-slate-800/80 transition-colors">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 group-hover:text-white tracking-tight transition-colors">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Tren Riwayat Kehadiran Harian
              </h3>
              <p className="text-xs text-slate-500 group-hover:text-slate-400 mt-0.5 transition-colors">
                {chartData.length > 0
                  ? `Visualisasi frekuensi hadir dari ${chartData.length} tanggal pencatatan`
                  : "Belum ada rekaman kehadiran semester ini"}
              </p>
            </div>
            <div className="pt-4">
              <div className="h-[260px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient
                          id="fillHadir"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#2563EB"
                            stopOpacity={0.28}
                          />
                          <stop
                            offset="100%"
                            stopColor="#2563EB"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#E2E8F0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="tanggal"
                        tick={{ fontSize: 11, fill: "#64748B" }}
                        axisLine={false}
                        tickLine={false}
                        interval={
                          chartData.length > 8
                            ? Math.floor(chartData.length / 6)
                            : 0
                        }
                        angle={chartData.length > 5 ? -45 : 0}
                        textAnchor={chartData.length > 5 ? "end" : "middle"}
                        height={chartData.length > 5 ? 60 : 30}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748B" }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          color: "#F8FAFC",
                          borderRadius: "8px",
                          border: "1px solid #1E293B",
                          fontSize: "12px",
                        }}
                        itemStyle={{ color: "#F8FAFC" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="hadir"
                        name="Sesi Hadir"
                        stroke="#2563EB"
                        strokeWidth={2.5}
                        fill="url(#fillHadir)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400 group-hover:text-slate-500 transition-colors">
                    <p className="text-xs">Belum ada data untuk ditampilkan</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mini leaderboard kelas */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3.5 border-b border-slate-100">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 tracking-tight">
                <Trophy className="h-4 w-4 text-amber-500" />
                Top 5 Kelas {profile.kelas}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Peringkat skor SPK resmi di kelas Anda
              </p>
            </div>
            <div className="pt-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 bg-slate-50/60 hover:bg-slate-50/60">
                    <TableHead className="w-14 pl-2 font-semibold text-slate-600">#</TableHead>
                    <TableHead className="font-semibold text-slate-600">Siswa</TableHead>
                    <TableHead className="text-right pr-2 font-semibold text-slate-600">Skor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kelasLeaderboard.length > 0 ? (
                    kelasLeaderboard.slice(0, 5).map((entry) => {
                      const isMe = entry.studentId === profile.id;
                      return (
                        <TableRow
                          key={entry.studentId}
                          className={cn(
                            "group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 last:border-0",
                            isMe && "bg-blue-50/50 hover:bg-[#091524]"
                          )}
                        >
                          <TableCell className="pl-2">
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold ${
                                entry.rank === 1
                                  ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300 group-hover/row:bg-amber-500/20 group-hover/row:text-amber-300"
                                  : entry.rank === 2
                                    ? "bg-slate-200 text-slate-700 ring-1 ring-slate-300 group-hover/row:bg-slate-800 group-hover/row:text-slate-300"
                                    : entry.rank === 3
                                      ? "bg-orange-100 text-orange-800 ring-1 ring-orange-300 group-hover/row:bg-orange-500/20 group-hover/row:text-orange-300"
                                      : "bg-slate-50 text-slate-600 border border-slate-200 group-hover/row:bg-slate-800 group-hover/row:text-slate-300"
                              }`}
                            >
                              #{entry.rank}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-slate-800 group-hover/row:text-white transition-colors">
                            <span>{entry.namaLengkap}</span>
                            {isMe && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-[#1e3a8a] text-white">
                                Kamu
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-blue-600 group-hover/row:text-blue-300 pr-2 transition-colors">
                            {entry.skorSPK}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-10 text-center text-xs text-slate-500"
                      >
                        Leaderboard semester ini belum dirilis.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
