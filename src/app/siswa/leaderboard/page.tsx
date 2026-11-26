"use client";

import { useState, useEffect, useRef } from "react";
import {
  Medal,
  Loader2,
  Lock,
  Calendar,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import LeaderboardCard, {
  LeaderboardPagination,
  LEADERBOARD_ITEMS_PER_PAGE,
} from "@/components/LeaderboardCard";
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

interface MyStudentProfile {
  nama: string;
  kelas: string;
  studentId: string;
}

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "S"
  );
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

export default function SiswaLeaderboardPage() {
  const [data, setData] = useState<SpkResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"umum" | "kelas">("umum");
  const [currentPage, setCurrentPage] = useState(1);
  const [myData, setMyData] = useState<MyStudentProfile | null>(null);
  const myProfileRef = useRef<MyStudentProfile | null>(null);

  const [isPublished, setIsPublished] = useState<boolean | null>(null);
  const [activePeriodeName, setActivePeriodeName] =
    useState<string>("Memuat periode...");

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        let profile = myProfileRef.current;

        if (!profile) {
          const pRes = await fetch("/api/students/me");
          const pData = await pRes.json().catch(() => null);
          if (!cancelled && pRes.ok && pData && !pData.error) {
            profile = {
              nama: pData.namaLengkap,
              kelas: pData.kelas,
              studentId: pData.id,
            };
            myProfileRef.current = profile;
            setMyData(profile);
          }
        }

        const targetKelas =
          filterType === "umum" ? "umum" : profile?.kelas || "umum";

        const spkRes = await fetch(
          `/api/spk/calculate?kelas=${encodeURIComponent(targetKelas)}`
        );
        const spkData = await spkRes.json().catch(() => null);
        if (!spkRes.ok) {
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
            err instanceof Error ? err.message : "Gagal memuat data leaderboard"
          );
          setData([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [filterType]);

  const handleFilterChange = (val: string) => {
    const nextFilter = val as "umum" | "kelas";
    if (nextFilter === filterType) return;
    setCurrentPage(1);
    setLoading(true);
    setFilterType(nextFilter);
  };

  const visibleRows = data.slice(
    (currentPage - 1) * LEADERBOARD_ITEMS_PER_PAGE,
    currentPage * LEADERBOARD_ITEMS_PER_PAGE
  );

  const myRankEntry = myData
    ? data.find((d) => d.studentId === myData.studentId)
    : undefined;

  return (
    <ModulePageShell
      theme="royal"
      eyebrow="SPK SAW | Portal Siswa"
      title="Peringkat Siswa Berprestasi"
      description="Daftar resmi siswa berprestasi berdasarkan rekap penilaian semester aktif."
      stats={[
        { label: "Periode Aktif", value: activePeriodeName },
        {
          label: "Status Rilis",
          value:
            isPublished === false
              ? "Belum Dirilis"
              : isPublished
                ? "Terpublikasi"
                : "Memuat...",
          tone: isPublished ? "emerald" : "amber",
        },
        ...(isPublished ? [{ label: "Total Peserta", value: data.length }] : []),
        ...(myRankEntry
          ? [
              {
                label: "Peringkat Kamu",
                value: `#${myRankEntry.rank}`,
                sublabel: `${myRankEntry.persentase}%`,
                tone: "amber" as const,
              },
            ]
          : []),
      ]}
      tabs={
        isPublished
          ? [
              { key: "umum", label: "Peringkat Umum" },
              ...(myData?.kelas
                ? [{ key: "kelas", label: `Kelas Saya (${myData.kelas})` }]
                : []),
            ]
          : undefined
      }
      activeTab={filterType}
      onTabChange={handleFilterChange}
      sheetClassName="p-5 sm:p-6 space-y-6"
    >

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
                  Peringkat Belum Dirilis
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1 transition-colors">
                  Leaderboard Semester Aktif Sedang Diproses
                </h2>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-xs text-slate-600 leading-relaxed transition-colors">
                Hasil pemeringkatan siswa berprestasi masih dalam tahap
                rekapitulasi akhir oleh pihak sekolah. Peringkat resmi akan
                dipublikasikan secara serentak.
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
                    Rekapitulasi Absensi Harian (Sistem Otomatis)
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-5 w-5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs transition-colors">
                    ✓
                  </span>
                  <span className="text-slate-700 font-medium transition-colors">
                    Input Kriteria Penilaian oleh Dewan Guru &amp; Wali Kelas
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-5 w-5 rounded-md bg-blue-50 border border-blue-200 text-[#1e3a8a] flex items-center justify-center font-bold text-xs transition-colors">
                    ●
                  </span>
                  <span className="text-slate-900 font-semibold transition-colors">
                    Sidang Validasi &amp; Publikasi Resmi Sekolah
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {data.slice(0, 3).map((student, i) => {
                const isMe = myData && student.studentId === myData.studentId;
                return (
                  <div
                    key={student.studentId}
                    className={`rounded-2xl border border-slate-200/80 bg-white p-5 hover:border-slate-300/90  hover:shadow-sm transition-all duration-300 group cursor-pointer flex flex-col justify-between ${
                      isMe ? "ring-2 ring-blue-500/30" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border transition-colors ${
                              i === 0
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : i === 1
                                  ? "bg-slate-100 text-slate-700 border-slate-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            Peringkat #{student.rank}
                          </span>
                          {isMe && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-600 text-white">
                              Kamu
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-2 transition-colors">
                          {student.namaLengkap}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 transition-colors">
                          Kelas {student.kelas}
                        </p>
                      </div>
                      <div
                        className={`p-2.5 rounded-xl border shrink-0 transition-colors ${
                          i === 0
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
                      <span className="tabular-nums font-bold text-slate-900 transition-colors">
                        {student.rawScore.toFixed(4)} ({student.persentase}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Championship Gold Masthead & Table */}
          <div className="rounded-2xl border-2 border-amber-300/80 bg-white shadow-[0_4px_30px_rgba(245,158,11,0.09)] overflow-hidden">
            {/* Top Championship Gold Ribbon Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-yellow-300 via-amber-400 to-amber-500" />

            <div className="p-5 sm:p-6 space-y-5">
              <LeaderboardCard
                title={
                  filterType === "umum"
                    ? "Tabel Peringkat Siswa Berprestasi"
                    : `Peringkat Siswa Kelas ${myData?.kelas || ""}`
                }
                subtitle="Hasil resmi pemeringkatan siswa berprestasi semester aktif"
                period={activePeriodeName}
                showTabs={false}
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
                          Predikat
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleRows.length > 0 ? (
                        visibleRows.map((entry) => {
                          const isMe =
                            myData && entry.studentId === myData.studentId;
                          const predikat = getPredikatBadge(entry.rawScore);
                          const pct = Math.min(
                            100,
                            Math.max(0, Math.round(entry.rawScore * 100))
                          );
                          const rowAccent = isMe
                            ? "bg-blue-50/60"
                            : entry.rank === 1
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
                                <div className="flex items-center gap-2.5">
                                  <div className="h-7 w-7 rounded-md bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs border border-slate-200 shrink-0 transition-colors">
                                    {getInitials(entry.namaLengkap)}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-semibold text-slate-900 text-sm transition-colors">
                                      {entry.namaLengkap}
                                    </span>
                                    {entry.rank === 1 && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-amber-100 text-amber-800 border border-amber-300/80 transition-colors">
                                        Top 1
                                      </span>
                                    )}
                                    {isMe && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-[#1e3a8a] text-white transition-colors">
                                        Kamu
                                      </span>
                                    )}
                                  </div>
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
                                      className={`h-full rounded-full transition-all ${
                                        entry.rank === 1
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
                            className="text-center py-10 text-xs text-slate-500"
                          >
                            Belum ada data peringkat untuk kategori ini.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>

              {!loading && data.length > 0 && (
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
