"use client";

import React, { useEffect, useState } from "react";
import {
  Trophy,
  PartyPopper,
  Download,
  Loader2,
  Medal,
  Lock,
  Calendar,
  Clock,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SpkResult {
  studentId: string;
  nis: string;
  namaLengkap: string;
  kelas: string;
  rawScore: number;
  persentase: number;
  rank: number;
  detailRaw: Record<string, number>;
}

interface ClassRow {
  id: string;
  namaKelas: string;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span
        title="Juara 1 (Emas)"
        className="relative inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 text-white font-black text-xs shadow-[0_0_12px_rgba(245,158,11,0.45)] ring-2 ring-amber-300"
      >
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        title="Juara 2 (Perak)"
        className="relative inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-b from-slate-200 via-slate-300 to-slate-500 text-white font-bold text-xs shadow-xs ring-2 ring-slate-300"
      >
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        title="Juara 3 (Perunggu)"
        className="relative inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-b from-amber-600 via-amber-700 to-amber-900 text-white font-bold text-xs shadow-xs ring-2 ring-amber-400/80"
      >
        3
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-semibold text-xs border border-slate-200/80">
      {rank}
    </span>
  );
}

function getPredikatBadge(rawScore: number) {
  if (rawScore >= 0.9) {
    return {
      label: "Sangat Baik",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (rawScore >= 0.8) {
    return {
      label: "Baik",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }
  return {
    label: "Cukup",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };
}

export default function GuruLeaderboardPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [activeTab, setActiveTab] = useState("umum");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SpkResult[]>([]);

  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [activePeriodeName, setActivePeriodeName] =
    useState<string>("Memuat periode...");

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => setClasses(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const loadCalculation = async () => {
      setLoading(true);
      try {
        const targetKelas =
          activeTab === "umum" ||
          activeTab === "kelas" ||
          activeTab === "angkatan"
            ? "umum"
            : activeTab;
        const res = await fetch(
          `/api/spk/calculate?kelas=${encodeURIComponent(targetKelas)}`
        );
        const spkData = await res.json();

        if (spkData.activePeriode) {
          const formattedPeriode = spkData.activePeriode.replace("-", " · ");
          setActivePeriodeName(formattedPeriode);
        }

        if (spkData.isPublished === false) {
          setIsPublished(false);
        } else {
          setIsPublished(true);
          if (spkData.data && Array.isArray(spkData.data)) {
            setData(spkData.data);
          } else {
            setData([]);
          }
        }
      } catch {
        toast.error("Gagal memuat SPK");
      } finally {
        setLoading(false);
      }
    };

    loadCalculation();
  }, [activeTab]);

  const handleExport = () => {
    if (data.length === 0) return;
    const templateData = data.map((d) => ({
      Rank: d.rank,
      NIS: d.nis,
      NamaSiswa: d.namaLengkap,
      Kelas: d.kelas,
      SkorSPK_Persen: d.persentase,
      RawScore: d.rawScore,
    }));
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leaderboard " + activeTab);
    XLSX.writeFile(wb, `Leaderboard_${activeTab}_SPK.xlsx`);
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Peringkat Siswa Berprestasi (SPK SAW)"
        badge="Portal Guru"
        description="Daftar pemeringkatan resmi siswa terbaik berdasarkan kalkulasi Simple Additive Weighting"
        icon={Trophy}
      >
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 hide-on-print"
          onClick={handleExport}
          disabled={data.length === 0 || !isPublished}
        >
          <Download className="h-3.5 w-3.5 text-slate-500" /> Ekspor Excel
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 hide-on-print"
          onClick={handleExportPDF}
          disabled={data.length === 0 || !isPublished}
        >
          <Printer className="h-3.5 w-3.5 text-slate-500" /> Cetak / PDF
        </Button>
      </PageHeader>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .hide-on-print { display: none !important; }
        }
      `,
        }}
      />

      {!isPublished ? (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="max-w-xl w-full bg-white border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-6 text-slate-800 flex items-center gap-4 border-b border-slate-200">
              <div className="h-12 w-12 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Menunggu Rilis Resmi
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  Leaderboard Semester Aktif Belum Dipublikasikan
                </h2>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Hasil kalkulasi Sistem Pendukung Keputusan (SPK) SAW saat ini
                masih dalam tahap verifikasi kelengkapan nilai oleh
                Administrator. Peringkat resmi akan terbuka otomatis segera
                setelah dipublikasikan.
              </p>

              <div className="border border-slate-200 rounded-lg bg-slate-50 p-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" /> Tahapan
                  Validasi Akademik
                </h4>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-5 w-5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    ✓
                  </span>
                  <span className="text-slate-700 font-medium">
                    Rekapitulasi Presensi Harian (Otomatis)
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-5 w-5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    ✓
                  </span>
                  <span className="text-slate-700 font-medium">
                    Input Nilai Kriteria oleh Dewan Guru & Wali Kelas
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-5 w-5 rounded-md bg-blue-50 border border-blue-200 text-[#1e3a8a] flex items-center justify-center font-bold text-xs">
                    ●
                  </span>
                  <span className="text-slate-900 font-semibold">
                    Verifikasi & Rilis Resmi oleh Administrator Sekolah
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Periode Aktif:
                </span>
                <span className="font-semibold text-slate-700">
                  {activePeriodeName}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 3 Podium Cards */}
          {data.length > 0 && !loading && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 hide-on-print">
              {data.slice(0, 3).map((student, i) => (
                <div
                  key={student.studentId}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border transition-colors ${
                          i === 0
                            ? "bg-amber-50 group-hover:bg-amber-500/15 text-amber-800 group-hover:text-amber-300 border-amber-200 group-hover:border-amber-500/30"
                            : i === 1
                              ? "bg-slate-100 group-hover:bg-slate-800 text-slate-700 group-hover:text-slate-300 border-slate-200 group-hover:border-slate-700"
                              : "bg-amber-50 group-hover:bg-amber-500/15 text-amber-700 group-hover:text-amber-300 border-amber-200 group-hover:border-amber-500/30"
                        }`}
                      >
                        Peringkat #{student.rank}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-white mt-2 transition-colors">
                        {student.namaLengkap}
                      </h3>
                      <p className="text-xs text-slate-500 group-hover:text-slate-400 tabular-nums mt-0.5 transition-colors">
                        NIS {student.nis} · Kelas {student.kelas}
                      </p>
                    </div>
                    <div
                      className={`p-2.5 rounded-xl border shrink-0 transition-colors ${
                        i === 0
                          ? "bg-amber-50 group-hover:bg-amber-500/15 border-amber-200 group-hover:border-amber-500/30 text-amber-700 group-hover:text-amber-300"
                          : "bg-slate-50 group-hover:bg-slate-800 border-slate-200 group-hover:border-slate-700 text-slate-600 group-hover:text-slate-300"
                      }`}
                    >
                      <Medal className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 group-hover:border-slate-800/80 flex items-center justify-between text-xs transition-colors">
                    <span className="text-slate-500 group-hover:text-slate-400 transition-colors">Nilai Akhir SAW</span>
                    <span className="font-bold tabular-nums text-slate-900 group-hover:text-white transition-colors">
                      {student.rawScore.toFixed(4)} ({student.persentase}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="print-area rounded-2xl border-2 border-amber-300/80 bg-white shadow-[0_4px_30px_rgba(245,158,11,0.09)] overflow-hidden">
            {/* Top Championship Gold Ribbon Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-yellow-300 via-amber-400 to-amber-500" />

            <div className="p-5 sm:p-6 space-y-5">
              {/* Centered Festive Prestigious Masthead */}
              <div className="relative rounded-2xl bg-gradient-to-b from-amber-50/70 via-amber-50/25 to-slate-50/20 border border-amber-200/70 p-5 sm:p-6 pb-6 text-center space-y-4 overflow-hidden">
                {/* Decorative Fireworks & Confetti SVGs (Background) */}
                <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
                  {/* Fireworks Burst - Left Corner */}
                  <svg className="absolute -top-1 -left-1 w-24 h-24 sm:w-28 sm:h-28 opacity-60" viewBox="0 0 100 100" fill="none">
                    <circle cx="50" cy="50" r="2.5" fill="#f59e0b" />
                    <line x1="50" y1="50" x2="18" y2="22" stroke="#ef4444" strokeWidth="1.8" strokeDasharray="3 2" />
                    <line x1="50" y1="50" x2="80" y2="20" stroke="#3b82f6" strokeWidth="1.8" strokeDasharray="3 2" />
                    <line x1="50" y1="50" x2="84" y2="60" stroke="#10b981" strokeWidth="1.8" strokeDasharray="3 2" />
                    <line x1="50" y1="50" x2="22" y2="76" stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="3 2" />
                    <line x1="50" y1="50" x2="50" y2="8" stroke="#ec4899" strokeWidth="1.8" strokeDasharray="3 2" />
                    <circle cx="18" cy="22" r="2" fill="#ef4444" />
                    <circle cx="80" cy="20" r="2" fill="#3b82f6" />
                    <circle cx="84" cy="60" r="2" fill="#10b981" />
                    <circle cx="22" cy="76" r="2" fill="#f59e0b" />
                    <circle cx="50" cy="8" r="2" fill="#ec4899" />
                  </svg>

                  {/* Fireworks Burst - Right Corner */}
                  <svg className="absolute -top-1 -right-1 w-24 h-24 sm:w-28 sm:h-28 opacity-60" viewBox="0 0 100 100" fill="none">
                    <circle cx="50" cy="50" r="2.5" fill="#3b82f6" />
                    <line x1="50" y1="50" x2="22" y2="20" stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="3 2" />
                    <line x1="50" y1="50" x2="82" y2="24" stroke="#ef4444" strokeWidth="1.8" strokeDasharray="3 2" />
                    <line x1="50" y1="50" x2="16" y2="58" stroke="#8b5cf6" strokeWidth="1.8" strokeDasharray="3 2" />
                    <line x1="50" y1="50" x2="74" y2="78" stroke="#10b981" strokeWidth="1.8" strokeDasharray="3 2" />
                    <line x1="50" y1="50" x2="50" y2="8" stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="3 2" />
                    <circle cx="22" cy="20" r="2" fill="#f59e0b" />
                    <circle cx="82" cy="24" r="2" fill="#ef4444" />
                    <circle cx="16" cy="58" r="2" fill="#8b5cf6" />
                    <circle cx="74" cy="78" r="2" fill="#10b981" />
                    <circle cx="50" cy="8" r="2" fill="#f59e0b" />
                  </svg>

                  {/* Confetti Ribbon Streamers & Dots */}
                  <svg className="absolute inset-0 w-full h-full opacity-45" preserveAspectRatio="none" viewBox="0 0 500 140" fill="none">
                    <path d="M 40 10 Q 55 25 45 42 T 52 75" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 460 10 Q 445 25 455 42 T 448 75" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 120 8 Q 135 20 130 36" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 380 8 Q 365 20 370 36" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                    <rect x="85" y="30" width="6" height="3" rx="1" fill="#ef4444" transform="rotate(25 85 30)" />
                    <rect x="160" y="16" width="6" height="3" rx="1" fill="#3b82f6" transform="rotate(-30 160 16)" />
                    <rect x="340" y="16" width="6" height="3" rx="1" fill="#f59e0b" transform="rotate(40 340 16)" />
                    <rect x="415" y="30" width="6" height="3" rx="1" fill="#8b5cf6" transform="rotate(-15 415 30)" />
                    <circle cx="100" cy="50" r="2" fill="#f59e0b" />
                    <circle cx="180" cy="35" r="1.5" fill="#10b981" />
                    <circle cx="320" cy="35" r="1.5" fill="#ef4444" />
                    <circle cx="400" cy="50" r="2" fill="#3b82f6" />
                  </svg>
                </div>

                {/* Central Trophy Medallion Flanked by Party Poppers (PURE GOLDEN TROPHY - NO AI SYMBOL) */}
                <div className="relative flex items-center justify-center gap-3 sm:gap-6 pt-1">
                  {/* Left Party Popper Horn */}
                  <div
                    className="p-2 sm:p-2.5 rounded-full bg-amber-100/90 border border-amber-300/80 text-amber-700 shadow-xs -rotate-12 hover:-rotate-45 transition-transform"
                    title="Perayaan Prestasi!"
                  >
                    <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                  </div>

                  {/* Pure Golden Trophy Medallion */}
                  <div className="relative inline-flex items-center justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 p-0.5 shadow-[0_0_24px_rgba(245,158,11,0.4)] ring-4 ring-amber-100/90">
                      <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-amber-50 via-white to-amber-100 flex items-center justify-center">
                        <Trophy className="w-7 h-7 text-amber-600 drop-shadow-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Right Party Popper Horn (Flipped) */}
                  <div
                    className="p-2 sm:p-2.5 rounded-full bg-amber-100/90 border border-amber-300/80 text-amber-700 shadow-xs rotate-12 scale-x-[-1] hover:rotate-45 transition-transform"
                    title="Perayaan Prestasi!"
                  >
                    <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                  </div>
                </div>

                {/* Title & Subtitle */}
                <div className="relative space-y-1 max-w-xl mx-auto">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                    {activeTab === "umum"
                      ? "Tabel Peringkat Siswa Berprestasi"
                      : `Peringkat Siswa Kelas ${activeTab}`}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Kalkulasi normalisasi matriks multi-kriteria real-time metode SAW
                  </p>
                </div>

                {/* Centered Dual Badges */}
                <div className="relative flex flex-wrap items-center justify-center gap-2 pt-0.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Metode SAW Multi-Kriteria
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-amber-50 text-amber-800 rounded-full border border-amber-300/90 shadow-2xs">
                    <Trophy className="w-3 h-3 text-amber-600" />
                    Periode: {activePeriodeName}
                  </span>
                </div>

                {/* Centered Class Tabs */}
                <div className="relative w-full pt-2 flex justify-center hide-on-print">
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-auto"
                  >
                    <TabsList className="flex flex-wrap items-center justify-center h-auto p-1 bg-white/90 backdrop-blur-xs rounded-full border border-amber-200/80 shadow-2xs gap-1">
                      <TabsTrigger
                        value="umum"
                        className="rounded-full text-xs font-medium px-3.5 py-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all"
                      >
                        Umum (Semua)
                      </TabsTrigger>
                      {classes.map((c) => (
                        <TabsTrigger
                          key={c.id}
                          value={c.namaKelas}
                          className="rounded-full text-xs font-medium px-3.5 py-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all"
                        >
                          {c.namaKelas}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex py-16 justify-center">
                  <Loader2 className="animate-spin h-7 w-7 text-blue-600" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-100 bg-slate-50/60 hover:bg-slate-50/60">
                      <TableHead className="w-20 pl-6 font-semibold text-slate-600">Peringkat</TableHead>
                      <TableHead className="font-semibold text-slate-600">Siswa</TableHead>
                      <TableHead className="font-semibold text-slate-600">Kelas</TableHead>
                      <TableHead className="font-semibold text-slate-600">Indeks SAW</TableHead>
                      <TableHead className="text-center font-semibold text-slate-600">Skor (%)</TableHead>
                      <TableHead className="text-right pr-6 font-semibold text-slate-600">
                        Status Kelayakan
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length > 0 ? (
                      data.map((entry) => {
                        const predikat = getPredikatBadge(entry.rawScore);
                        const pct = Math.min(
                          100,
                          Math.max(0, Math.round(entry.rawScore * 100))
                        );
                        const rowAccent =
                          entry.rank === 1
                            ? "bg-amber-50/40"
                            : entry.rank === 2
                            ? "bg-slate-50/60"
                            : entry.rank === 3
                            ? "bg-amber-50/20"
                            : "";
                        return (
                          <TableRow
                            key={entry.studentId}
                            className={`group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 last:border-0 ${rowAccent}`}
                          >
                            <TableCell className="pl-6">
                              <RankBadge rank={entry.rank} />
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-semibold text-slate-900 group-hover/row:text-white text-sm transition-colors">
                                    {entry.namaLengkap}
                                  </p>
                                  {entry.rank === 1 && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-amber-100 text-amber-800 group-hover/row:bg-amber-500/20 group-hover/row:text-amber-300 border border-amber-300/80 transition-colors">
                                      Top 1
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 group-hover/row:text-slate-400 tabular-nums transition-colors">
                                  NIS: {entry.nis}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 group-hover/row:bg-slate-800 text-slate-700 group-hover/row:text-slate-200 border border-slate-200 group-hover/row:border-slate-700 transition-colors">
                                {entry.kelas}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 group-hover/row:text-white tabular-nums transition-colors">
                                  {entry.rawScore.toFixed(4)}
                                </span>
                                <div className="w-16 bg-slate-100 group-hover/row:bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block transition-colors">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      entry.rank === 1
                                        ? "bg-gradient-to-r from-amber-400 to-amber-600 group-hover/row:from-amber-300 group-hover/row:to-amber-500"
                                        : entry.rank <= 3
                                        ? "bg-gradient-to-r from-blue-600 to-amber-500 group-hover/row:from-blue-400 group-hover/row:to-amber-400"
                                        : "bg-[#1e3a8a] group-hover/row:bg-blue-400"
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-semibold text-blue-700 group-hover/row:text-blue-300 tabular-nums transition-colors">
                              {entry.persentase}%
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border transition-colors ${predikat.className}`}
                              >
                                {predikat.label}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-10 text-slate-500 group-hover:text-slate-400"
                        >
                          Tidak ada data leaderboard untuk kelas ini.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
