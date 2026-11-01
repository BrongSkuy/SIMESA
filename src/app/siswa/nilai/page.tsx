"use client";

import { useState, useEffect } from "react";
import {
  ClipboardList,
  Loader2,
  TrendingUp,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  CardDescription,
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

interface CriteriaScore {
  id: string;
  namaKriteria: string;
  bobot: number;
  tipe: string;
  deskripsi: string | null;
  nilaiRataRata: number;
  detailMapel: Record<string, number>;
  nilaiTerbobot: number;
}

interface KehadiranData {
  hadir: number;
  izin: number;
  sakit: number;
  alfa: number;
  total: number;
  persentase: number;
}

interface ScoreData {
  student: {
    id: string;
    nis: string;
    namaLengkap: string;
    kelas: string;
  };
  periode: string | null;
  criteria: CriteriaScore[];
  kehadiran: KehadiranData | null;
  totalSkorSPK: number;
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

export default function SiswaNilaiPage() {
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/students/me/scores")
      .then((res) => res.json())
      .then((result) => {
        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Gagal memuat data nilai");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-2 text-slate-500 bg-white border border-slate-200">
        <AlertCircle className="h-8 w-8 text-rose-500" />
        <p className="text-sm font-semibold text-slate-800">
          Gagal Memuat Transkrip Nilai
        </p>
        <p className="text-xs">{error || "Data penilaian belum tersedia"}</p>
      </div>
    );
  }

  const getScoreTone = (score: number) => {
    if (score >= 85)
      return {
        text: "text-emerald-700",
        pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "Sangat Baik",
      };
    if (score >= 70)
      return {
        text: "text-blue-700",
        pill: "bg-blue-50 text-blue-700 border-blue-200",
        label: "Baik",
      };
    if (score >= 50)
      return {
        text: "text-amber-700",
        pill: "bg-amber-50 text-amber-700 border-amber-200",
        label: "Cukup",
      };
    return {
      text: "text-rose-700",
      pill: "bg-rose-50 text-rose-700 border-rose-200",
      label: "Perlu Perbaikan",
    };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transkrip Nilai & Skor SPK Saya"
        badge="Portal Siswa"
        description="Rincian perolehan nilai akademik, non-akademik, dan akumulasi skor evaluasi SPK SAW"
        icon={ClipboardList}
      />

      {/* Score Summary Banner - Executive Dark Hero */}
      <div className="rounded-xl bg-[#091524] border border-slate-800/80 p-5 sm:p-6 overflow-hidden shadow-sm text-white bg-gradient-to-r from-[#091524] via-[#0E1E34] to-[#091524] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold text-lg flex items-center justify-center shrink-0 shadow-inner border border-blue-400/30">
            {getInitials(data.student.namaLengkap)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
                Periode: {data.periode || "Aktif"}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs tabular-nums bg-slate-800/80 text-slate-300 border border-slate-700/60">
                NIS {data.student.nis}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                Kelas {data.student.kelas}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1.5">
              {data.student.namaLengkap}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3.5 bg-slate-900/90 backdrop-blur-xs px-4 py-3 rounded-lg border border-slate-700/80 w-full sm:w-auto justify-between sm:justify-start shadow-inner">
          <div className="p-2.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Skor SPK
            </p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-white">
                {data.totalSkorSPK}
              </p>
              <span className="text-xs text-blue-400 font-semibold">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Summary */}
      {data.kehadiran && (
        <div className="border-y border-slate-200 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-2 sm:grid-cols-5 bg-white">
          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Hadir
            </p>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 mt-1">
              {data.kehadiran.hadir}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Izin
            </p>
            <p className="text-2xl font-bold tabular-nums text-amber-600 mt-1">
              {data.kehadiran.izin}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sakit
            </p>
            <p className="text-2xl font-bold tabular-nums text-blue-600 mt-1">
              {data.kehadiran.sakit}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Alfa
            </p>
            <p className="text-2xl font-bold tabular-nums text-rose-600 mt-1">
              {data.kehadiran.alfa}
            </p>
          </div>
          <div className="p-4 col-span-2 sm:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              % Kehadiran
            </p>
            <p
              className={`text-2xl font-bold tabular-nums mt-1 ${
                getScoreTone(data.kehadiran.persentase).text
              }`}
            >
              {data.kehadiran.persentase}%
            </p>
          </div>
        </div>
      )}

      {/* Criteria Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.criteria.map((c) => {
          const tone = getScoreTone(c.nilaiRataRata);
          const pct = Math.min(100, Math.max(0, c.nilaiRataRata));
          return (
            <div
              key={c.id}
              className="rounded-xl border border-slate-200/90 bg-white p-5 hover:border-slate-300 hover:shadow-2xs transition-all flex flex-col justify-between"
            >
              <div className="pb-3 border-b border-slate-100">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      {c.tipe === "Otomatis" ? (
                        <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                      ) : (
                        <BookOpen className="h-4 w-4 text-indigo-600 shrink-0" />
                      )}
                      <span className="truncate">{c.namaKriteria}</span>
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500">
                      {c.deskripsi || `Bobot evaluasi ${c.bobot}%`}
                    </CardDescription>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                    {c.bobot}%
                  </span>
                </div>
              </div>
              <div className="pt-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">
                      Nilai Rata-Rata
                    </p>
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-2xl font-bold font-mono tabular-nums ${tone.text}`}
                      >
                        {c.nilaiRataRata}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${tone.pill}`}
                      >
                        {tone.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-0.5">
                      Skor Terbobot
                    </p>
                    <p className="text-base font-bold tabular-nums text-slate-900">
                      {c.nilaiTerbobot}
                    </p>
                    <p className="text-xs tabular-nums text-slate-400">
                      ({c.nilaiRataRata} × {c.bobot}%)
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-xs overflow-hidden">
                  <div
                    className="bg-[#1e3a8a] h-full rounded-xs transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Per-Mapel detail if any */}
                {Object.keys(c.detailMapel).length > 0 &&
                  c.tipe === "Manual" && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Rincian Per Mata Pelajaran
                      </p>
                      <div className="space-y-1.5">
                        {Object.entries(c.detailMapel).map(([mapel, nilai]) => (
                          <div
                            key={mapel}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-slate-600 truncate mr-2">
                              {mapel}
                            </span>
                            <span
                              className={`font-mono font-semibold tabular-nums ${
                                getScoreTone(nilai).text
                              }`}
                            >
                              {nilai}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Table Summary */}
      <div className="pt-2 space-y-3">
        <div className="pb-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Ringkasan Perhitungan Skor SPK SAW
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Rumus agregasi: Skor Akhir = Σ (Nilai Rata-Rata × Bobot%)
          </p>
        </div>
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6 text-white font-semibold">Kriteria Evaluasi</TableHead>
                <TableHead className="text-center text-slate-200 font-semibold">Tipe Input</TableHead>
                <TableHead className="text-center text-slate-200 font-semibold">Bobot</TableHead>
                <TableHead className="text-center text-slate-200 font-semibold">Nilai</TableHead>
                <TableHead className="text-right pr-6 text-white font-semibold">Skor Terbobot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.criteria.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-6 font-semibold text-slate-800">
                    {c.namaKriteria}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
                        c.tipe === "Otomatis"
                          ? "border-blue-200 text-[#1e3a8a] bg-blue-50"
                          : "border-indigo-200 text-indigo-700 bg-indigo-50"
                      }`}
                    >
                      {c.tipe}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-mono text-slate-600">
                    {c.bobot}%
                  </TableCell>
                  <TableCell
                    className={`text-center font-mono font-bold ${
                      getScoreTone(c.nilaiRataRata).text
                    }`}
                  >
                    {c.nilaiRataRata}
                  </TableCell>
                  <TableCell className="text-right pr-6 font-mono font-bold text-slate-900">
                    {c.nilaiTerbobot}
                  </TableCell>
                </TableRow>
              ))}
              {/* Total Row - Dark Anchor */}
              <TableRow className="bg-[#091524] bg-gradient-to-r from-[#091524] via-[#0E1E34] to-[#091524] hover:bg-[#0E1E34] border-t-2 border-slate-800/80 text-white">
                <TableCell
                  colSpan={4}
                  className="pl-6 font-bold text-white text-sm"
                >
                  Total Akumulasi Skor SPK
                </TableCell>
                <TableCell className="text-right pr-6 font-mono font-extrabold text-base text-blue-400">
                  {data.totalSkorSPK}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
