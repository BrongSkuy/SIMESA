"use client";

import { useState, useEffect } from "react";
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
import { PageHeader } from "@/components/shared/page-header";
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
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-100 text-amber-800 font-bold text-xs ring-1 ring-amber-300">
        #1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-200 text-slate-700 font-bold text-xs ring-1 ring-slate-300">
        #2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-orange-100 text-orange-800 font-bold text-xs ring-1 ring-orange-300">
        #3
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-50 text-slate-600 font-semibold text-xs border border-slate-200">
      #{rank}
    </span>
  );
}

export default function SiswaLeaderboardPage() {
  const [data, setData] = useState<SpkResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"umum" | "kelas">("umum");
  const [myData, setMyData] = useState<{
    nama: string;
    kelas: string;
    studentId: string;
  } | null>(null);

  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [activePeriodeName, setActivePeriodeName] =
    useState<string>("Memuat periode...");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let profile = myData;

        if (!profile) {
          const pRes = await fetch("/api/students/me");
          const pData = await pRes.json();
          if (!pData.error) {
            profile = {
              nama: pData.namaLengkap,
              kelas: pData.kelas,
              studentId: pData.id,
            };
            setMyData(profile);
          }
        }

        const targetKelas =
          filterType === "umum" ? "umum" : profile?.kelas || "umum";

        const spkRes = await fetch(
          `/api/spk/calculate?kelas=${encodeURIComponent(targetKelas)}`
        );
        const spkData = await spkRes.json();

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
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);

  if (loading && !myData) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-7 w-7 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Peringkat Siswa Berprestasi (Leaderboard)"
        badge="Portal Siswa"
        description="Hasil resmi pemeringkatan siswa terbaik berdasarkan perhitungan SPK SAW semester aktif"
        icon={Trophy}
      />

      {!isPublished ? (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="max-w-xl w-full bg-white border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-slate-200 flex items-center gap-4">
              <div className="h-12 w-12 bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  Peringkat Belum Dirilis
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  Leaderboard Semester Aktif Sedang Diproses
                </h2>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Hasil Sistem Pendukung Keputusan (SPK) SAW penentuan siswa
                berprestasi masih dalam tahap rekapitulasi akhir oleh pihak
                sekolah. Peringkat resmi akan dipublikasikan secara serentak.
              </p>

              <div className="border border-slate-200 bg-slate-50 p-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" /> Tahapan
                  Validasi Akademik
                </h4>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-5 w-5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    ✓
                  </span>
                  <span className="text-slate-700 font-medium">
                    Rekapitulasi Absensi Harian (Sistem Otomatis)
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-5 w-5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    ✓
                  </span>
                  <span className="text-slate-700 font-medium">
                    Input Kriteria Penilaian oleh Dewan Guru & Wali Kelas
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="h-5 w-5 rounded-md bg-blue-50 border border-blue-200 text-[#1e3a8a] flex items-center justify-center font-bold text-xs">
                    ●
                  </span>
                  <span className="text-slate-900 font-semibold">
                    Sidang Validasi & Publikasi Resmi Sekolah
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Periode Aktif:
                </span>
                <span className="tabular-nums font-semibold text-slate-700">
                  {activePeriodeName}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-center sm:justify-start">
            <Tabs
              value={filterType}
              onValueChange={(val) => setFilterType(val as "umum" | "kelas")}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full sm:w-[380px] grid-cols-2">
                <TabsTrigger value="umum" className="gap-1.5">
                  <School className="h-3.5 w-3.5" /> Peringkat Umum
                </TabsTrigger>
                <TabsTrigger
                  value="kelas"
                  className="gap-1.5"
                  disabled={!myData?.kelas}
                >
                  <Users className="h-3.5 w-3.5" /> Kelas Saya{" "}
                  {myData?.kelas ? `(${myData.kelas})` : ""}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {loading ? (
            <div className="flex py-16 justify-center">
              <Loader2 className="animate-spin h-7 w-7 text-blue-600" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top 3 Podium Cards */}
              {data.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {data.slice(0, 3).map((student, i) => {
                    const isMe =
                      myData && student.studentId === myData.studentId;
                    return (
                      <div
                        key={student.studentId}
                        className={`rounded-2xl border border-slate-200/80 bg-white p-5 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between ${
                          isMe ? "ring-2 ring-blue-500/30" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border transition-colors ${
                                  i === 0
                                    ? "bg-amber-50 group-hover:bg-amber-500/15 text-amber-700 group-hover:text-amber-300 border-amber-200 group-hover:border-amber-500/30"
                                    : i === 1
                                      ? "bg-slate-100 group-hover:bg-slate-800 text-slate-700 group-hover:text-slate-300 border-slate-200 group-hover:border-slate-700"
                                      : "bg-orange-50 group-hover:bg-orange-500/15 text-orange-700 group-hover:text-orange-300 border-orange-200 group-hover:border-orange-500/30"
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
                                ? "bg-amber-50 group-hover:bg-amber-500/15 border-amber-200 group-hover:border-amber-500/30 text-amber-600 group-hover:text-amber-300"
                                : "bg-slate-50 group-hover:bg-slate-800 border-slate-200 group-hover:border-slate-700 text-slate-600 group-hover:text-slate-300"
                            }`}
                          >
                            <Medal className="h-5 w-5" />
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 group-hover:border-slate-800/80 flex items-center justify-between text-xs transition-colors">
                          <span className="text-slate-500 group-hover:text-slate-400 transition-colors">Skor Akhir SPK</span>
                          <span className="tabular-nums font-bold text-slate-900 group-hover:text-white transition-colors">
                            {student.persentase}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Full Table */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl group space-y-4">
                <div className="pb-3 border-b border-slate-100 group-hover:border-slate-800/80 transition-colors">
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-white transition-colors">
                    {filterType === "umum"
                      ? "Peringkat Keseluruhan (Semua Kelas)"
                      : `Peringkat Kelas ${myData?.kelas}`}
                  </h3>
                  <p className="text-xs text-slate-500 group-hover:text-slate-400 mt-0.5 transition-colors">
                    Periode {activePeriodeName}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-100 group-hover:border-slate-800/80 hover:bg-transparent">
                        <TableHead className="w-20 pl-6 group-hover:text-slate-400">Peringkat</TableHead>
                        <TableHead className="group-hover:text-slate-400">Nama Siswa</TableHead>
                        <TableHead className="group-hover:text-slate-400">Kelas</TableHead>
                        <TableHead className="text-right pr-6 group-hover:text-slate-400">
                          Skor SPK
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.length > 0 ? (
                        data.map((entry) => {
                          const isMe =
                            myData && entry.studentId === myData.studentId;
                          const pct = Math.min(
                            100,
                            Math.max(0, Math.round(entry.rawScore * 100))
                          );
                          return (
                            <TableRow
                              key={entry.studentId}
                              className={`group/row transition-all duration-200 hover:bg-[#0d1d31] hover:shadow-md cursor-pointer border-b border-slate-100 group-hover:border-slate-800/60 last:border-0 ${
                                isMe ? "bg-blue-50/50 group-hover:bg-blue-950/30" : ""
                              }`}
                            >
                              <TableCell className="pl-6">
                                <RankBadge rank={entry.rank} />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  <div className="h-7 w-7 rounded-md bg-slate-100 group-hover:bg-slate-800 text-slate-700 group-hover:text-slate-200 font-semibold flex items-center justify-center text-xs border border-slate-200 group-hover:border-slate-700 shrink-0 transition-colors">
                                    {getInitials(entry.namaLengkap)}
                                  </div>
                                  <span className="font-semibold text-slate-800 group-hover/row:text-white group-hover:text-slate-100 transition-colors">
                                    {entry.namaLengkap}
                                  </span>
                                  {isMe && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-[#1e3a8a] text-white">
                                      Kamu
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 group-hover:bg-slate-800 group-hover:text-slate-200 border border-slate-200 group-hover:border-slate-700 transition-colors">
                                  {entry.kelas}
                                </span>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="inline-flex items-center justify-end gap-2">
                                  <div className="w-16 bg-slate-100 group-hover:bg-slate-800 h-1.5 rounded-xs overflow-hidden hidden sm:block transition-colors">
                                    <div
                                      className="bg-[#1e3a8a] group-hover:bg-blue-500 h-full rounded-xs transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="font-bold tabular-nums text-[#1e3a8a] group-hover/row:text-blue-400 group-hover:text-blue-300 transition-colors">
                                    {entry.persentase}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-10 text-xs text-slate-500 group-hover:text-slate-400"
                          >
                            Belum ada data perhitungan SPK untuk kategori ini.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
