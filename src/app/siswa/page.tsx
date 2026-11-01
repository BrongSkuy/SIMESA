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
      <div className="flex h-64 flex-col items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl shadow-xs text-slate-500">
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
      <PageHeader
        title="Ringkasan Akademik Siswa"
        badge="Portal Siswa"
        description={`Selamat datang, ${profile.namaLengkap} · Pantau presensi dan capaian evaluasi semester Anda`}
        icon={LayoutDashboard}
      >
        <Link href="/siswa/absensi">
          <Button variant="outline" size="sm" className="gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5 text-slate-500" /> Riwayat
            Absensi
          </Button>
        </Link>
        <Link href="/siswa/nilai">
          <Button size="sm" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> Transkrip Nilai
          </Button>
        </Link>
      </PageHeader>

      {/* Student Profile Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 text-base font-bold shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Siswa Aktif
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200">
                NIS: {profile.nis}
              </span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 mt-1">
              {profile.namaLengkap}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Kelas {profile.kelas}
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Angkatan {profile.angkatan}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Persentase Kehadiran"
          value={stats ? `${stats.persentaseKehadiran}%` : "0%"}
          icon={CalendarCheck}
          color="emerald"
          footerLeft="Akumulasi semester aktif"
          footerRight="Presensi"
        />
        <StatCard
          title="Total Pertemuan Hadir"
          value={stats?.totalHadir ?? 0}
          icon={Trophy}
          color="blue"
          footerLeft={`Dari ${stats?.totalRecords ?? 0} total catatan sesi`}
          footerRight="Tercatat"
        />
        <StatCard
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Attendance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Tren Riwayat Kehadiran Harian
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {chartData.length > 0
                ? `Visualisasi frekuensi hadir dari ${chartData.length} tanggal pencatatan`
                : "Belum ada rekaman kehadiran semester ini"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
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
          </CardContent>
        </Card>

        {/* Mini leaderboard kelas */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top 5 Kelas {profile.kelas}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Peringkat skor SPK resmi di kelas Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
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
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
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
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-600 text-white">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
