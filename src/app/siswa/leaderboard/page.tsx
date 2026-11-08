"use client";

import { useState, useEffect, useRef } from "react";
import {
  Trophy,
  Medal,
  Loader2,
  Users,
  School,
  Lock,
  Calendar,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 group-hover/row:bg-slate-800 text-slate-600 group-hover/row:text-slate-300 font-semibold text-xs border border-slate-200/80 group-hover/row:border-slate-700 transition-colors">
      {rank}
    </span>
  );
}

function getPredikatBadge(rawScore: number) {
  if (rawScore >= 0.9) {
    return {
      label: "Sangat Baik",
      className:
        "bg-emerald-50 group-hover/row:bg-emerald-500/15 text-emerald-700 group-hover/row:text-emerald-300 border-emerald-200 group-hover/row:border-emerald-500/30",
    };
  }
  if (rawScore >= 0.8) {
    return {
      label: "Baik",
      className:
        "bg-blue-50 group-hover/row:bg-blue-500/15 text-blue-700 group-hover/row:text-blue-300 border-blue-200 group-hover/row:border-blue-500/30",
    };
  }
  return {
    label: "Cukup",
    className:
      "bg-slate-100 group-hover/row:bg-slate-800 text-slate-700 group-hover/row:text-slate-300 border-slate-200 group-hover/row:border-slate-700",
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Peringkat Siswa Berprestasi (SPK SAW)"
        badge="Portal Siswa"
        description="Hasil resmi pemeringkatan siswa terbaik berdasarkan kalkulasi Simple Additive Weighting semester aktif"
        icon={Trophy}
      />

      {isPublished === null && loading ? (
        <div className="flex py-20 justify-center">
          <Loader2 className="animate-spin h-7 w-7 text-blue-600" />
        </div>
      ) : isPublished === false ? (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="max-w-xl w-full rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl group cursor-pointer">
            <div className="bg-slate-50/80 group-hover:bg-white/[0.03] p-6 border-b border-slate-200 group-hover:border-slate-800/80 flex items-center gap-4 transition-colors">
              <div className="h-12 w-12 rounded-xl bg-amber-50 group-hover:bg-amber-500/15 border border-amber-200 group-hover:border-amber-500/30 flex items-center justify-center text-amber-600 group-hover:text-amber-300 shrink-0 transition-colors">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 group-hover:bg-amber-500/15 text-amber-700 group-hover:text-amber-300 border border-amber-200 group-hover:border-amber-500/30 transition-colors">
                  Peringkat Belum Dirilis
                </span>
                <h2 className="text-base font-bold text-slate-900 group-hover:text-white mt-1 transition-colors">
                  Leaderboard Semester Aktif Sedang Diproses
                </h2>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-xs text-slate-600 group-hover:text-slate-300 leading-relaxed transition-colors">
                Hasil Sistem Pendukung Keputusan (SPK) SAW penentuan siswa
                berprestasi masih dalam tahap rekapitulasi akhir oleh pihak
                sekolah. Peringkat resmi akan dipublikasikan secara serentak.
              </p>

              <div className="rounded-xl border border-slate-200 group-hover:border-slate-800 bg-slate-50 group-hover:bg-white/[0.03] p-4 space-y-3 transition-colors">
                <h4 className="text-xs font-semibold text-slate-500 group-hover:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 transition-colors">
                  <Clock className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" />{" "}
                  Tahapan Validasi Akademik
                </h4>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-5 w-5 rounded-md bg-emerald-50 group-hover:bg-emerald-500/20 border border-emerald-200 group-hover:border-emerald-500/30 text-emerald-700 group-hover:text-emerald-300 flex items-center justify-center font-bold text-xs transition-colors">
                    ✓
                  </span>
                  <span className="text-slate-700 group-hover:text-slate-300 font-medium transition-colors">
                    Rekapitulasi Absensi Harian (Sistem Otomatis)
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-5 w-5 rounded-md bg-emerald-50 group-hover:bg-emerald-500/20 border border-emerald-200 group-hover:border-emerald-500/30 text-emerald-700 group-hover:text-emerald-300 flex items-center justify-center font-bold text-xs transition-colors">
                    ✓
                  </span>
                  <span className="text-slate-700 group-hover:text-slate-300 font-medium transition-colors">
                    Input Kriteria Penilaian oleh Dewan Guru &amp; Wali Kelas
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-5 w-5 rounded-md bg-blue-50 group-hover:bg-blue-500/20 border border-blue-200 group-hover:border-blue-500/30 text-[#1e3a8a] group-hover:text-blue-300 flex items-center justify-center font-bold text-xs transition-colors">
                    ●
                  </span>
                  <span className="text-slate-900 group-hover:text-white font-semibold transition-colors">
                    Sidang Validasi &amp; Publikasi Resmi Sekolah
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 group-hover:text-slate-400 flex items-center justify-between pt-2 border-t border-slate-100 group-hover:border-slate-800/80 transition-colors">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                  Periode Aktif:
                </span>
                <span className="tabular-nums font-semibold text-slate-700 group-hover:text-white transition-colors">
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
                    className={`rounded-2xl border border-slate-200/80 bg-white p-5 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col justify-between ${
                      isMe ? "ring-2 ring-blue-500/30" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border transition-colors ${
                              i === 0
                                ? "bg-amber-50 group-hover:bg-amber-500/15 text-amber-800 group-hover:text-amber-300 border-amber-200 group-hover:border-amber-500/30"
                                : i === 1
                                  ? "bg-slate-100 group-hover:bg-slate-800 text-slate-700 group-hover:text-slate-300 border-slate-200 group-hover:border-slate-700"
                                  : "bg-amber-50 group-hover:bg-amber-500/15 text-amber-700 group-hover:text-amber-300 border-amber-200 group-hover:border-amber-500/30"
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
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-white mt-2 transition-colors">
                          {student.namaLengkap}
                        </h3>
                        <p className="text-xs text-slate-500 group-hover:text-slate-400 mt-0.5 transition-colors">
                          Kelas {student.kelas}
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
                      <span className="text-slate-500 group-hover:text-slate-400 transition-colors">
                        Nilai Akhir SAW
                      </span>
                      <span className="tabular-nums font-bold text-slate-900 group-hover:text-white transition-colors">
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
                subtitle="Hasil resmi pemeringkatan multi-kriteria periode aktif metode SAW"
                period={activePeriodeName}
                showTabs={false}
              >
                <div className="relative w-full pt-2 flex justify-center">
                  <Tabs
                    value={filterType}
                    onValueChange={handleFilterChange}
                    className="w-auto"
                  >
                    <TabsList className="flex flex-wrap items-center justify-center h-auto p-1 bg-white/90 backdrop-blur-xs rounded-full border border-amber-200/80 shadow-2xs gap-1">
                      <TabsTrigger
                        value="umum"
                        className="rounded-full text-xs font-medium px-3.5 py-1.5 gap-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer"
                      >
                        <School className="h-3.5 w-3.5" /> Peringkat Umum
                      </TabsTrigger>
                      <TabsTrigger
                        value="kelas"
                        disabled={!myData?.kelas}
                        className="rounded-full text-xs font-medium px-3.5 py-1.5 gap-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all cursor-pointer"
                      >
                        <Users className="h-3.5 w-3.5" /> Kelas Saya{" "}
                        {myData?.kelas ? `(${myData.kelas})` : ""}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </LeaderboardCard>

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
                          Indeks SAW
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
                              className={`group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 last:border-0 ${rowAccent}`}
                            >
                              <TableCell className="pl-6">
                                <RankBadge rank={entry.rank} />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  <div className="h-7 w-7 rounded-md bg-slate-100 group-hover/row:bg-slate-800 text-slate-700 group-hover/row:text-slate-200 font-semibold flex items-center justify-center text-xs border border-slate-200 group-hover/row:border-slate-700 shrink-0 transition-colors">
                                    {getInitials(entry.namaLengkap)}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-semibold text-slate-900 group-hover/row:text-white text-sm transition-colors">
                                      {entry.namaLengkap}
                                    </span>
                                    {entry.rank === 1 && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-sm bg-amber-100 text-amber-800 group-hover/row:bg-amber-500/20 group-hover/row:text-amber-300 border border-amber-300/80 transition-colors">
                                        Top 1
                                      </span>
                                    )}
                                    {isMe && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-[#1e3a8a] group-hover/row:bg-blue-600 text-white transition-colors">
                                        Kamu
                                      </span>
                                    )}
                                  </div>
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
                            className="text-center py-10 text-xs text-slate-500"
                          >
                            Belum ada data perhitungan SPK untuk kategori ini.
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
    </div>
  );
}
