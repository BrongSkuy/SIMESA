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
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      {/* Dark Executive Hero & KPI Command Strip */}
      <section className="rounded-xl bg-[#091524] border border-slate-800/80 overflow-hidden shadow-sm text-white">
        {/* Header Info Row */}
        <div className="p-5 sm:p-6 lg:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 bg-gradient-to-r from-[#091524] via-[#0E1E34] to-[#091524]">
          <div className="space-y-1.5 border-l-4 border-blue-500 pl-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <LayoutDashboard className="w-5 h-5 text-blue-400 shrink-0" />
                <span>Ringkasan Akademik Siswa</span>
              </h1>
              <span className="inline-flex items-center rounded-sm bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-300 border border-blue-500/30">
                Portal Siswa
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Selamat datang, <strong className="text-slate-200">{profile.namaLengkap}</strong> · Pantau presensi dan capaian evaluasi semester Anda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/siswa/absensi">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 bg-slate-900/90 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <CalendarCheck className="h-3.5 w-3.5 text-slate-400" /> Riwayat Absensi
              </Button>
            </Link>
            <Link href="/siswa/nilai">
              <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 shadow-xs">
                <ClipboardList className="h-3.5 w-3.5" /> Transkrip Nilai
              </Button>
            </Link>
          </div>
        </div>

        {/* Student Profile Info Banner inside Dark Hero */}
        <div className="px-5 py-4 sm:px-7 border-b border-slate-800/80 bg-[#0B182B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300 text-sm font-bold shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Siswa Aktif
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-slate-900/90 text-slate-300 border border-slate-700">
                  NIS: {profile.nis}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white mt-1">
                {profile.namaLengkap}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
              Kelas {profile.kelas}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-slate-900/90 text-slate-300 border border-slate-700">
              Angkatan {profile.angkatan}
            </span>
          </div>
        </div>

        {/* 3 KPI Cards - Dark Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80 bg-[#091524]">
          <StatCard
            variant="dark"
            title="Persentase Kehadiran"
            value={stats ? `${stats.persentaseKehadiran}%` : "0%"}
            icon={CalendarCheck}
            color="emerald"
            footerLeft="Akumulasi semester aktif"
            footerRight="Presensi"
          />
          <StatCard
            variant="dark"
            title="Total Pertemuan Hadir"
            value={stats?.totalHadir ?? 0}
            icon={Trophy}
            color="blue"
            footerLeft={`Dari ${stats?.totalRecords ?? 0} total catatan sesi`}
            footerRight="Tercatat"
          />
          <StatCard
            variant="dark"
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
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
        {/* Attendance Chart */}
        <div className="lg:col-span-2 lg:border-r border-slate-200 lg:pr-8 space-y-3">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Tren Riwayat Kehadiran Harian
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {chartData.length > 0
                ? `Visualisasi frekuensi hadir dari ${chartData.length} tanggal pencatatan`
                : "Belum ada rekaman kehadiran semester ini"}
            </p>
          </div>
          <div className="pt-2">
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
                <div className="flex h-full items-center justify-center text-slate-400">
                  <p className="text-xs">Belum ada data untuk ditampilkan</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mini leaderboard kelas */}
        <div className="space-y-3">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top 5 Kelas {profile.kelas}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Peringkat skor SPK resmi di kelas Anda
            </p>
          </div>
          <div className="border-b border-slate-200 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 pl-5">#</TableHead>
                  <TableHead>Siswa</TableHead>
                  <TableHead className="text-right pr-5">Skor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kelasLeaderboard.length > 0 ? (
                  kelasLeaderboard.slice(0, 5).map((entry) => {
                    const isMe = entry.studentId === profile.id;
                    return (
                      <TableRow
                        key={entry.studentId}
                        className={isMe ? "bg-blue-50/50" : undefined}
                      >
                        <TableCell className="pl-5">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold ${
                              entry.rank === 1
                                ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
                                : entry.rank === 2
                                  ? "bg-slate-200 text-slate-700 ring-1 ring-slate-300"
                                  : entry.rank === 3
                                    ? "bg-orange-100 text-orange-800 ring-1 ring-orange-300"
                                    : "bg-slate-50 text-slate-600 border border-slate-200"
                            }`}
                          >
                            #{entry.rank}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-slate-800">
                          <span>{entry.namaLengkap}</span>
                          {isMe && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-[#1e3a8a] text-white">
                              Kamu
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-blue-600 pr-5">
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
  );
}
