"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  Users,
  GraduationCap,
  CheckCircle2,
  BarChart3,
  Calendar,
  Download,
  Upload,
  SlidersHorizontal,
  Trophy,
  ChevronRight,
  Info,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Panel } from "@/components/shared/panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AttendancePoint {
  tanggal?: string;
  hari: string;
  hadir: number;
  izin: number;
  sakit: number;
  alfa: number;
}

interface DashboardStats {
  totalSiswa: number;
  totalGuru: number;
  totalKelas?: number;
  totalCriteria?: number;
  kehadiranHariIni: number;
  activeDayHadir?: number;
  activeDayTotal?: number;
  activeDayIzinSakit?: number;
  activeDayAlfa?: number;
  isTodayData?: boolean;
  avgAttendance?: number;
  tahunAjaran: string;
  semesterDisplay?: string;
  periodeRangeLabel?: string;
  monthYearLabel?: string;
  isSpkPublished?: boolean;
  weeklyAttendance?: AttendancePoint[];
}

interface SpkLeaderboardEntry {
  rank: number;
  studentId: string;
  nis: string;
  namaLengkap: string;
  kelas: string;
  rawScore: number;
  persentase: number;
  detailRaw?: Record<string, number>;
  detailNormalisasi?: Record<string, number>;
}

interface SpkCriteriaItem {
  id: string;
  namaKriteria: string;
  bobot: number;
  tipe: "Otomatis" | "Manual";
}

type ChartMode = "harian" | "mingguan" | "bulanan";

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSiswa: 0,
    totalGuru: 0,
    totalKelas: 0,
    totalCriteria: 5,
    kehadiranHariIni: 0,
    tahunAjaran: "2025/2026-Genap",
    semesterDisplay: "Semester Genap 2025/2026",
  });

  const [leaderboard, setLeaderboard] = useState<SpkLeaderboardEntry[]>([]);
  const [criteriaList, setCriteriaList] = useState<SpkCriteriaItem[]>([]);
  const [spkValid, setSpkValid] = useState<boolean>(true);
  const [chartMode, setChartMode] = useState<ChartMode>("harian");
  const [selectedStudent, setSelectedStudent] =
    useState<SpkLeaderboardEntry | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setStats(d);
      })
      .catch(() => {});

    fetch("/api/spk/criteria")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setCriteriaList(d);
      })
      .catch(() => {});

    fetch("/api/spk/calculate?kelas=umum")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLeaderboard(data);
        } else if (data && Array.isArray(data.results)) {
          setLeaderboard(data.results);
          if (data.validation) setSpkValid(Boolean(data.validation.isValid));
        }
      })
      .catch(() => {});
  }, []);

  const kehadiranCriteriaId = useMemo(() => {
    const found = criteriaList.find(
      (c) =>
        c.tipe === "Otomatis" ||
        c.namaKriteria.toLowerCase().includes("kehadiran")
    );
    return found?.id;
  }, [criteriaList]);

  const getStudentAttendancePct = (entry: SpkLeaderboardEntry): string => {
    if (kehadiranCriteriaId && entry.detailRaw?.[kehadiranCriteriaId] != null) {
      return `${Number(entry.detailRaw[kehadiranCriteriaId]).toFixed(1)}%`;
    }
    if (entry.detailNormalisasi?.["Kehadiran"] != null) {
      return `${(entry.detailNormalisasi["Kehadiran"] * 100).toFixed(1)}%`;
    }
    return `${entry.persentase.toFixed(1)}%`;
  };

  // Persiapan data grafik untuk Recharts
  const chartSeries = useMemo(() => {
    const raw = stats.weeklyAttendance || [];
    if (raw.length === 0) return [];

    if (chartMode === "harian") {
      return raw.slice(-10).map((d) => ({
        label: d.hari,
        hadir: d.hadir,
        izin: d.izin,
        sakit: d.sakit,
        alfa: d.alfa,
      }));
    }

    if (chartMode === "mingguan") {
      const buckets: Record<
        string,
        { label: string; hadir: number; izin: number; sakit: number; alfa: number }
      > = {};
      raw.forEach((d, idx) => {
        const weekNum = Math.floor(idx / 5) + 1;
        const key = `Minggu ${weekNum}`;
        if (!buckets[key]) {
          buckets[key] = { label: key, hadir: 0, izin: 0, sakit: 0, alfa: 0 };
        }
        buckets[key].hadir += d.hadir;
        buckets[key].izin += d.izin;
        buckets[key].sakit += d.sakit;
        buckets[key].alfa += d.alfa;
      });
      return Object.values(buckets);
    }

    // Bulanan
    const monthBuckets: Record<
      string,
      { label: string; hadir: number; izin: number; sakit: number; alfa: number }
    > = {};
    raw.forEach((d) => {
      const dateObj = d.tanggal ? new Date(d.tanggal + "T00:00:00") : null;
      const key =
        dateObj && !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString("id-ID", {
              month: "short",
              year: "numeric",
            })
          : d.hari.split(" ")[1] || "Bulan Berjalan";
      if (!monthBuckets[key]) {
        monthBuckets[key] = { label: key, hadir: 0, izin: 0, sakit: 0, alfa: 0 };
      }
      monthBuckets[key].hadir += d.hadir;
      monthBuckets[key].izin += d.izin;
      monthBuckets[key].sakit += d.sakit;
      monthBuckets[key].alfa += d.alfa;
    });
    return Object.values(monthBuckets);
  }, [stats.weeklyAttendance, chartMode]);

  const handleExportReport = () => {
    try {
      const wb = XLSX.utils.book_new();

      const summaryRows = [
        { Metrik: "Periode Akademik", Nilai: stats.semesterDisplay || stats.tahunAjaran },
        { Metrik: "Total Siswa Aktif", Nilai: stats.totalSiswa },
        { Metrik: "Total Guru Pengajar", Nilai: stats.totalGuru },
        { Metrik: "Total Rombel Kelas", Nilai: stats.totalKelas ?? 0 },
        { Metrik: "Kehadiran Terkini (%)", Nilai: `${stats.kehadiranHariIni}%` },
        { Metrik: "Rata-rata Kehadiran Semester (%)", Nilai: `${stats.avgAttendance ?? 0}%` },
      ];
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(summaryRows),
        "Ringkasan"
      );

      if ((stats.weeklyAttendance || []).length > 0) {
        const attRows = (stats.weeklyAttendance || []).map((a) => ({
          Tanggal: a.tanggal || a.hari,
          Hari: a.hari,
          Hadir: a.hadir,
          Izin: a.izin,
          Sakit: a.sakit,
          Alfa: a.alfa,
        }));
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(attRows),
          "Presensi"
        );
      }

      if (leaderboard.length > 0) {
        const spkRows = leaderboard.map((s) => ({
          Peringkat: s.rank,
          NIS: s.nis,
          "Nama Siswa": s.namaLengkap,
          Kelas: s.kelas,
          "Skor SAW": Number(s.rawScore.toFixed(4)),
          "Persentase (%)": s.persentase,
        }));
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(spkRows),
          "Peringkat SPK"
        );
      }

      XLSX.writeFile(
        wb,
        `Laporan_Akademik_SMK_${stats.tahunAjaran.replace("/", "-")}.xlsx`
      );
      toast.success("Laporan berhasil diekspor (.xlsx)");
    } catch {
      toast.error("Gagal mengekspor laporan");
    }
  };

  const todayDiff = Number(
    (stats.kehadiranHariIni - (stats.avgAttendance || stats.kehadiranHariIni)).toFixed(1)
  );

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <PageHeader
        title="Beranda Administrator"
        badge={stats.semesterDisplay || "Semester Genap 2025/2026"}
        description="Ringkasan data presensi harian siswa, tenaga pendidik, dan evaluasi SPK metode SAW."
      >
        <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 shadow-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400 mr-2" />
          <span>Periode: {stats.periodeRangeLabel || "Semester Aktif"}</span>
        </div>
        <button
          type="button"
          onClick={handleExportReport}
          className="inline-flex items-center bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
          Ekspor Laporan
        </button>
      </PageHeader>

      {/* 4 Kartu Metrik Utama */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Siswa"
          value={stats.totalSiswa}
          icon={Users}
          color="blue"
          footerLeft={
            stats.totalKelas ? `${stats.totalKelas} Rombongan Belajar` : "Siswa Terdaftar"
          }
          footerRight={
            stats.totalSiswa > 0 && stats.totalKelas
              ? `~${Math.round(stats.totalSiswa / stats.totalKelas)} siswa/kelas`
              : undefined
          }
        />

        <StatCard
          title="Total Guru"
          value={stats.totalGuru}
          icon={GraduationCap}
          color="slate"
          footerLeft="Tenaga Pendidik & Pengampu"
          footerRight="Aktif Mengajar"
        />

        <StatCard
          title={
            stats.isTodayData === false
              ? "Kehadiran Terakhir"
              : "Kehadiran Hari Ini"
          }
          value={`${stats.kehadiranHariIni}%`}
          icon={CheckCircle2}
          color="emerald"
          trend={
            todayDiff !== 0
              ? { value: Math.abs(todayDiff), isPositive: todayDiff >= 0 }
              : undefined
          }
          footerLeft={`${stats.activeDayHadir ?? 0} dari ${stats.activeDayTotal ?? stats.totalSiswa} siswa hadir`}
          footerRight={
            (stats.activeDayIzinSakit ?? 0) + (stats.activeDayAlfa ?? 0) > 0
              ? `${(stats.activeDayIzinSakit ?? 0) + (stats.activeDayAlfa ?? 0)} tidak hadir`
              : "Lengkap"
          }
        />

        <StatCard
          title="Status Evaluasi SPK"
          value={
            stats.isSpkPublished
              ? "Terpublikasi"
              : leaderboard.length > 0 && spkValid
                ? "Siap Dihitung"
                : leaderboard.length > 0
                  ? "Draf Perhitungan"
                  : "Belum Dihitung"
          }
          icon={BarChart3}
          color="amber"
          footerLeft="Parameter Penilaian"
          footerRight={`${stats.totalCriteria ?? (criteriaList.length || 5)} Kriteria SAW`}
        />
      </section>

      {/* Baris Grafik & Pintasan (2/3 + 1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Visualisasi Grafik Presensi Recharts */}
        <Panel
          title="Grafik Presensi Siswa"
          description="Rekapitulasi jumlah siswa hadir, izin, sakit, dan alfa"
          action={
            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium">
              {(["harian", "mingguan", "bulanan"] as ChartMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setChartMode(mode)}
                  className={cn(
                    "px-3 py-1 rounded-md capitalize transition-colors",
                    chartMode === mode
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          }
          className="lg:col-span-2 flex flex-col justify-between"
          bodyClassName="p-5 flex-1 flex flex-col justify-between"
        >
          <div className="h-72 w-full pt-2">
            {chartSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartSeries}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: "8px",
                      border: "1px solid #E2E8F0",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: "12px", paddingBottom: "12px" }}
                  />
                  <Bar dataKey="hadir" name="Hadir" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="izin" name="Izin" fill="#D97706" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sakit" name="Sakit" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="alfa" name="Alfa" fill="#DC2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">
                Belum ada data presensi yang dicatat pada rentang periode ini.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-1">
            <span>
              Rata-rata presensi semester:{" "}
              <strong className="text-slate-800 font-semibold tabular-nums">
                {stats.avgAttendance ?? stats.kehadiranHariIni}%
              </strong>
            </span>
            <span className="text-slate-400">
              Pembaruan data otomatis berdasarkan catatan guru
            </span>
          </div>
        </Panel>

        {/* Kolom Kanan: Pintasan Aksi & Status Kesiapan SPK */}
        <div className="space-y-6">
          <Panel
            title="Pintasan Menu"
            description="Akses cepat pengelolaan data harian"
          >
            <div className="space-y-2.5">
              <Link
                href="/admin/siswa"
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                      Kelola Data Siswa
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Input biodata dan impor berkas Excel
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </Link>

              <Link
                href="/admin/spk"
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                      Atur Kriteria SPK
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bobot parameter metode SAW
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </Link>

              <Link
                href="/admin/leaderboard"
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      Peringkat Siswa
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Hasil evaluasi prestasi akademik
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </Link>
            </div>
          </Panel>

          {/* Panel Status Validasi SPK Nyata */}
          <Panel
            title={
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-900">
                  Status Kesiapan Data SPK
                </span>
              </div>
            }
          >
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2 text-slate-600">
                <div className="mt-0.5">
                  {spkValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    {spkValid
                      ? "Parameter Pembobotan Valid"
                      : "Verifikasi Pembobotan Dibutuhkan"}
                  </p>
                  <p className="text-slate-500 mt-0.5 leading-relaxed">
                    {spkValid
                      ? "Total bobot seluruh kriteria bernilai 1.0 (100%). Perhitungan SAW dapat diandalkan."
                      : "Pastikan total bobot kriteria berjumlah 1.0 agar hasil perhitungan normalisasi akurat."}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-slate-500">
                  {stats.isSpkPublished ? "Hasil telah dipublikasikan" : "Status draf internal"}
                </span>
                <Link
                  href="/admin/spk"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Konfigurasi kriteria →
                </Link>
              </div>
            </div>
          </Panel>
        </div>
      </section>

      {/* Tabel 5 Siswa Peringkat Teratas (SPK SAW) */}
      <Panel
        title="5 Siswa Peringkat Teratas (Evaluasi SPK SAW)"
        description="Hasil pembobotan gabungan antara presensi kehadiran, nilai mata pelajaran, dan kriteria evaluasi"
        action={
          <Link
            href="/admin/leaderboard"
            className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            Lihat Semua Peringkat
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        }
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-slate-600 w-16 text-center">
                  Peringkat
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-slate-600">
                  Nama Siswa
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-slate-600">
                  Kelas
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-slate-600">
                  Presensi Kehadiran
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-slate-600">
                  Skor Akhir SAW
                </th>
                <th scope="col" className="py-3 px-4 text-xs font-semibold text-slate-600 text-right">
                  Rincian
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {leaderboard.length > 0 ? (
                leaderboard.slice(0, 5).map((entry) => {
                  return (
                    <tr key={entry.studentId} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3 px-4 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-semibold",
                            entry.rank === 1
                              ? "bg-amber-100 text-amber-800 font-bold"
                              : entry.rank === 2
                                ? "bg-slate-200 text-slate-800 font-bold"
                                : entry.rank === 3
                                  ? "bg-amber-50 text-amber-700 font-bold"
                                  : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {entry.rank}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {entry.namaLengkap}
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums">
                          NIS: {entry.nis}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {entry.kelas}
                      </td>

                      <td className="py-3 px-4 tabular-nums">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {getStudentAttendancePct(entry)}
                        </span>
                      </td>

                      <td className="py-3 px-4 tabular-nums">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-900 w-12">
                            {Number(entry.rawScore).toFixed(4)}
                          </span>
                          <div className="w-28 bg-slate-100 h-2 rounded-xs overflow-hidden border border-slate-200">
                            <div
                              className="bg-[#1e3a8a] h-full rounded-xs transition-all duration-300"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, Number(entry.persentase) || entry.rawScore * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(entry)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs px-2.5 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          Lihat Nilai
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    Belum ada hasil kalkulasi SPK. Pastikan data nilai dan absensi telah terisi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Modal Detail Perhitungan Kriteria Siswa */}
      <Dialog
        open={Boolean(selectedStudent)}
        onOpenChange={(open) => {
          if (!open) setSelectedStudent(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Rincian Penilaian Siswa
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Nilai mentah dan hasil normalisasi matriks SPK metode Simple Additive Weighting (SAW).
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    {selectedStudent.namaLengkap}
                  </h4>
                  <p className="text-xs text-slate-500 tabular-nums">
                    NIS: {selectedStudent.nis} · Kelas {selectedStudent.kelas}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Peringkat</span>
                  <span className="text-lg font-bold text-slate-900 tabular-nums">
                    #{selectedStudent.rank}
                  </span>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Daftar Kriteria Penilaian
                </h5>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="py-2 px-3 font-semibold text-slate-600">Kriteria</th>
                        <th className="py-2 px-3 font-semibold text-slate-600 text-right">Nilai Input</th>
                        <th className="py-2 px-3 font-semibold text-slate-600 text-right">Normalisasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {criteriaList.map((crit) => {
                        const rawVal =
                          selectedStudent.detailRaw?.[crit.id] ??
                          selectedStudent.detailRaw?.[crit.namaKriteria] ??
                          "-";
                        const normVal =
                          selectedStudent.detailNormalisasi?.[crit.id] ??
                          selectedStudent.detailNormalisasi?.[crit.namaKriteria] ??
                          "-";

                        return (
                          <tr key={crit.id}>
                            <td className="py-2 px-3 text-slate-800">
                              <span className="font-medium">{crit.namaKriteria}</span>
                              <span className="text-slate-400 text-xs block">
                                Bobot: {crit.bobot} ({crit.tipe})
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-slate-700 tabular-nums">
                              {typeof rawVal === "number" ? rawVal.toFixed(1) : rawVal}
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-blue-700 tabular-nums">
                              {typeof normVal === "number" ? normVal.toFixed(4) : normVal}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200/60 flex items-center justify-between text-xs">
                <span className="text-blue-900 font-medium">Nilai Preferensi Akhir (V):</span>
                <span className="text-sm font-bold text-blue-900 tabular-nums">
                  {Number(selectedStudent.rawScore).toFixed(4)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
