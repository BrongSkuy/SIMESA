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
import { ModulePageShell } from "@/components/shared/module-page-shell";
import LeaderboardCard, {
  LeaderboardPagination,
  LEADERBOARD_ITEMS_PER_PAGE,
} from "@/components/LeaderboardCard";
import { Button } from "@/components/ui/button";
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
        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-xs shadow-2xs ring-2 ring-amber-200"
      >
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        title="Juara 2 (Perak)"
        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-400 text-white font-bold text-xs shadow-2xs ring-2 ring-slate-200"
      >
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        title="Juara 3 (Perunggu)"
        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-white font-bold text-xs shadow-2xs ring-2 ring-amber-200/80"
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
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (rawScore >= 0.8) {
    return {
      label: "Baik",
      className:
        "bg-blue-50 text-blue-700 border-blue-200",
    };
  }
  return {
    label: "Cukup",
    className:
      "bg-slate-100 text-slate-700 border-slate-200",
  };
}

export default function GuruLeaderboardPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [activeTab, setActiveTab] = useState("umum");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SpkResult[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);

  const [isPublished, setIsPublished] = useState<boolean | null>(null);
  const [activePeriodeName, setActivePeriodeName] =
    useState<string>("Memuat periode...");

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => setClasses(Array.isArray(d) ? d : []))
      .catch(() => { });
  }, []);

  useEffect(() => {
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadCalculation = async () => {
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
        const spkData = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(spkData?.error || "Gagal memuat data leaderboard");
        }
        if (cancelled) return;

        if (spkData?.activePeriode) {
          setActivePeriodeName(spkData.activePeriode.replace("-", " · "));
        }

        if (spkData?.isPublished === false) {
          setIsPublished(false);
          setData([]);
        } else {
          setIsPublished(true);
          if (spkData?.data && Array.isArray(spkData.data)) {
            setData(spkData.data);
          } else {
            setData([]);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Gagal memuat data peringkat"
          );
          setData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCalculation();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const handleTabChange = (nextTab: string) => {
    if (nextTab === activeTab) return;
    setCurrentPage(1);
    setLoading(true);
    setActiveTab(nextTab);
  };

  const handleExport = () => {
    if (data.length === 0) return;
    const templateData = data.map((d) => ({
      Rank: d.rank,
      NIS: d.nis,
      NamaSiswa: d.namaLengkap,
      Kelas: d.kelas,
      SkorPrestasi_Persen: d.persentase,
      RawScore: d.rawScore,
    }));
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Peringkat " + activeTab);
    XLSX.writeFile(wb, `Peringkat_Siswa_${activeTab}.xlsx`);
    toast.success("Data peringkat siswa berhasil diekspor");
  };

  const handleExportPDF = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const visibleRows = isPrinting
    ? data
    : data.slice(
      (currentPage - 1) * LEADERBOARD_ITEMS_PER_PAGE,
      currentPage * LEADERBOARD_ITEMS_PER_PAGE
    );

  return (
    <ModulePageShell
      title="Peringkat Siswa Berprestasi"
      eyebrow="SPK SAW | Portal Guru"
      description="Daftar peringkat resmi siswa berprestasi berdasarkan rekap penilaian semester aktif."
      icon={Trophy}
      theme="royal"
      tabsLabel="Filter peringkat per kelas"
      tabs={
        isPublished === true
          ? [
            { key: "umum", label: "Peringkat Umum" },
            ...classes.map((c) => ({
              key: c.namaKelas,
              label: `Kelas ${c.namaKelas}`,
            })),
          ]
          : undefined
      }
      activeTab={activeTab}
      onTabChange={handleTabChange}
      stats={[
        {
          label: "Periode Aktif",
          value: activePeriodeName || "Aktif",
          sublabel: "Semester berjalan",
        },
        {
          label: "Status Publikasi",
          value:
            isPublished === true
              ? "Terpublikasi"
              : isPublished === false
                ? "Menunggu Rilis"
                : "Memuat...",
          sublabel: isPublished ? "Peringkat resmi" : "Validasi admin",
          tone: isPublished ? "emerald" : "amber",
        },
        {
          label: "Siswa Terperingkat",
          value: loading ? "..." : data.length,
          sublabel: activeTab === "umum" ? "Semua kelas" : `Kelas ${activeTab}`,
          tone: "blue",
        },
      ]}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 hide-on-print"
            onClick={handleExport}
            disabled={data.length === 0 || isPublished !== true}
          >
            <Download className="h-3.5 w-3.5" /> Ekspor Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 hide-on-print"
            onClick={handleExportPDF}
            disabled={data.length === 0 || isPublished !== true}
          >
            <Printer className="h-3.5 w-3.5" /> Cetak PDF
          </Button>
        </>
      }
      sheetClassName="p-5 sm:p-6 space-y-6"
    >

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          header, nav, footer, .hide-on-print { display: none !important; }
          .print-area {
            position: static !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `,
        }}
      />

      {isPublished === null && loading ? (
        <div className="flex py-20 justify-center">
          <Loader2 className="animate-spin h-7 w-7 text-blue-600" />
        </div>
      ) : isPublished === false ? (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="max-w-xl w-full rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-300 hover:border-slate-300/90 hover:shadow-sm group cursor-pointer">
            <div className="bg-slate-50/80 p-6 border-b border-slate-200 flex items-center gap-4 transition-colors">
              <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 transition-colors">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 transition-colors">
                  Menunggu Rilis Resmi
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1 transition-colors">
                  Leaderboard Semester Aktif Belum Dipublikasikan
                </h2>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-xs text-slate-600 leading-relaxed transition-colors">
                Hasil pemeringkatan siswa berprestasi saat ini masih dalam tahap
                verifikasi kelengkapan nilai oleh Administrator. Peringkat resmi
                akan terbuka otomatis segera setelah dipublikasikan.
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 transition-colors">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 transition-colors">
                  <Clock className="h-3.5 w-3.5 text-slate-400 transition-colors" />{" "}
                  Tahapan Validasi Akademik
                </h4>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-5 w-5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs transition-colors">
                    ✓
                  </span>
                  <span className="text-slate-700 font-medium transition-colors">
                    Rekapitulasi Presensi Harian (Otomatis)
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-5 w-5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs transition-colors">
                    ✓
                  </span>
                  <span className="text-slate-700 font-medium transition-colors">
                    Input Nilai Kriteria oleh Dewan Guru Mata Pelajaran
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-5 w-5 rounded-md bg-blue-50 border border-blue-200 text-[#1e3a8a] flex items-center justify-center font-bold text-xs transition-colors">
                    ●
                  </span>
                  <span className="text-slate-900 font-semibold transition-colors">
                    Verifikasi &amp; Rilis Resmi oleh Administrator Sekolah
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 transition-colors">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 transition-colors" />
                  Periode Aktif:
                </span>
                <span className="tabular-nums font-semibold text-slate-700 transition-colors">
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
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 hover:border-slate-300/90 hover:shadow-sm transition-all duration-300 group cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border transition-colors ${i === 0
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : i === 1
                              ? "bg-slate-100 text-slate-700 border-slate-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                      >
                        Peringkat #{student.rank}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-2 transition-colors">
                        {student.namaLengkap}
                      </h3>
                      <p className="text-xs text-slate-500 tabular-nums mt-0.5 transition-colors">
                        NIS {student.nis} · Kelas {student.kelas}
                      </p>
                    </div>
                    <div
                      className={`p-2.5 rounded-xl border shrink-0 transition-colors ${i === 0
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : "bg-slate-50 border-slate-200 text-slate-600 "
                        }`}
                    >
                      <Medal className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs transition-colors">
                    <span className="text-slate-500 transition-colors">
                      Skor Prestasi
                    </span>
                    <span className="font-bold tabular-nums text-slate-900 transition-colors">
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
              <LeaderboardCard
                title={
                  activeTab === "umum"
                    ? "Tabel Peringkat Siswa Berprestasi"
                    : `Peringkat Siswa Kelas ${activeTab}`
                }
                subtitle="Hasil resmi pemeringkatan siswa berprestasi semester aktif"
                period={activePeriodeName}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                classes={classes}
              />
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex py-16 justify-center">
                    <Loader2 className="animate-spin h-7 w-7 text-blue-600" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-100 bg-slate-50/60 hover:bg-slate-50/60">
                        <TableHead className="w-20 pl-6 font-semibold text-slate-600">
                          Peringkat
                        </TableHead>
                        <TableHead className="font-semibold text-slate-600">
                          Siswa
                        </TableHead>
                        <TableHead className="font-semibold text-slate-600">
                          Kelas
                        </TableHead>
                        <TableHead className="font-semibold text-slate-600">
                          Skor Akhir
                        </TableHead>
                        <TableHead className="text-center font-semibold text-slate-600">
                          Skor (%)
                        </TableHead>
                        <TableHead className="text-right pr-6 font-semibold text-slate-600">
                          Status Kelayakan
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleRows.length > 0 ? (
                        visibleRows.map((entry) => {
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
                              className={`group/row transition-all duration-200 hover:bg-slate-50/90 cursor-pointer border-b border-slate-100 last:border-0 ${rowAccent}`}
                            >
                              <TableCell className="pl-6">
                                <RankBadge rank={entry.rank} />
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-semibold text-slate-900 text-sm transition-colors">
                                      {entry.namaLengkap}
                                    </p>
                                    {entry.rank === 1 && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-amber-100 text-amber-800 border border-amber-300/80 transition-colors">
                                        Top 1
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 tabular-nums transition-colors">
                                    NIS: {entry.nis}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 transition-colors">
                                  {entry.kelas}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 tabular-nums transition-colors">
                                    {entry.rawScore.toFixed(4)}
                                  </span>
                                  <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block transition-colors">
                                    <div
                                      className={`h-full rounded-full transition-all ${entry.rank === 1
                                          ? "bg-gradient-to-r from-amber-400 to-amber-600"
                                          : entry.rank <= 3
                                            ? "bg-gradient-to-r from-blue-600 to-amber-500"
                                            : "bg-[#1e3a8a] "
                                        }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-semibold text-blue-700 tabular-nums transition-colors">
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
                            className="text-center py-10 text-slate-500"
                          >
                            Tidak ada data leaderboard untuk kelas ini.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
              {!loading && !isPrinting && data.length > 0 && (
                <LeaderboardPagination
                  currentPage={currentPage}
                  totalItems={data.length}
                  itemsPerPage={LEADERBOARD_ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </ModulePageShell>
  );
}
