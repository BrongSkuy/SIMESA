"use client";

import React, { useEffect, useState } from "react";
import {
  Trophy,
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
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-100 text-amber-800 font-bold text-xs">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-200 text-slate-800 font-bold text-xs">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-50 text-amber-700 font-bold text-xs">
        3
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-600 font-medium text-xs">
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

          <div className="print-area rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl group space-y-4">
            <div className="pb-3 border-b border-slate-100 group-hover:border-slate-800/80 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900 group-hover:text-white transition-colors">
                    {activeTab === "umum"
                      ? "Peringkat Keseluruhan (Semua Kelas)"
                      : `Peringkat Kelas ${activeTab}`}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 group-hover:text-slate-400 mt-0.5 transition-colors">
                    Periode {activePeriodeName}
                  </CardDescription>
                </div>

                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="hide-on-print"
                >
                  <TabsList className="flex-wrap h-auto">
                    <TabsTrigger value="umum">Umum (Semua)</TabsTrigger>
                    {classes.map((c) => (
                      <TabsTrigger key={c.id} value={c.namaKelas}>
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
                    <TableRow className="border-b border-slate-100 group-hover:border-slate-800/80 hover:bg-transparent">
                      <TableHead className="w-20 pl-6 group-hover:text-slate-400">Peringkat</TableHead>
                      <TableHead className="group-hover:text-slate-400">Siswa</TableHead>
                      <TableHead className="group-hover:text-slate-400">Kelas</TableHead>
                      <TableHead className="group-hover:text-slate-400">Indeks SAW</TableHead>
                      <TableHead className="text-center group-hover:text-slate-400">Skor (%)</TableHead>
                      <TableHead className="text-right pr-6 group-hover:text-slate-400">
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
                        return (
                          <TableRow
                            key={entry.studentId}
                            className="group/row transition-all duration-200 hover:bg-[#0d1d31] hover:shadow-md cursor-pointer border-b border-slate-100 group-hover:border-slate-800/60 last:border-0"
                          >
                            <TableCell className="pl-6">
                              <RankBadge rank={entry.rank} />
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-semibold text-slate-900 group-hover/row:text-white group-hover:text-slate-200 text-sm transition-colors">
                                  {entry.namaLengkap}
                                </p>
                                <p className="text-xs text-slate-500 group-hover/row:text-slate-400 tabular-nums transition-colors">
                                  NIS: {entry.nis}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 group-hover:bg-slate-800 group-hover:text-slate-200 border border-slate-200 group-hover:border-slate-700 transition-colors">
                                {entry.kelas}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 group-hover/row:text-white group-hover:text-slate-100 tabular-nums transition-colors">
                                  {entry.rawScore.toFixed(4)}
                                </span>
                                <div className="w-16 bg-slate-100 group-hover:bg-slate-800 h-1.5 rounded-xs overflow-hidden hidden sm:block transition-colors">
                                  <div
                                    className="bg-[#1e3a8a] group-hover:bg-blue-500 h-full rounded-xs transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-semibold text-blue-700 group-hover/row:text-blue-400 tabular-nums transition-colors">
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
      )}
    </div>
  );
}
