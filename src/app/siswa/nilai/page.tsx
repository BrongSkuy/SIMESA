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
import { CardDescription, CardTitle } from "@/components/ui/card";
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
        text: "text-emerald-700 group-hover:text-emerald-400 group-hover/row:text-emerald-400",
        pill: "bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-emerald-500/15 group-hover:text-emerald-300 group-hover:border-emerald-500/30",
        label: "Sangat Baik",
      };
    if (score >= 70)
      return {
        text: "text-blue-700 group-hover:text-blue-400 group-hover/row:text-blue-400",
        pill: "bg-blue-50 text-blue-700 border-blue-200 group-hover:bg-blue-500/15 group-hover:text-blue-300 group-hover:border-blue-500/30",
        label: "Baik",
      };
    if (score >= 50)
      return {
        text: "text-amber-700 group-hover:text-amber-400 group-hover/row:text-amber-400",
        pill: "bg-amber-50 text-amber-700 border-amber-200 group-hover:bg-amber-500/15 group-hover:text-amber-300 group-hover:border-amber-500/30",
        label: "Cukup",
      };
    return {
      text: "text-rose-700 group-hover:text-rose-400 group-hover/row:text-rose-400",
      pill: "bg-rose-50 text-rose-700 border-rose-200 group-hover:bg-rose-500/15 group-hover:text-rose-300 group-hover:border-rose-500/30",
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

      {/* Score Summary Banner - Fokus pada Skor SPK & Periode tanpa duplikasi profil */}
      <div className="rounded-2xl bg-gradient-to-r from-[#091524] via-[#0E1E34] to-[#091524] p-5 sm:p-6 border border-slate-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Periode: {data.periode || "Aktif"}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
              Kelas {data.student.kelas}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono bg-white/5 text-slate-300 border border-white/10">
              {data.criteria.length} Kriteria SPK
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
            Akumulasi Evaluasi Multi-Kriteria (SAW)
          </h2>
          <p className="text-xs text-slate-400">
            Nilai akhir diperoleh dari penjumlahan skor terbobot seluruh kriteria akademik & kehadiran
          </p>
        </div>

        <div className="flex items-center gap-3.5 rounded-xl bg-white/[0.04] px-4 py-3 border border-white/10 w-full sm:w-auto justify-between sm:justify-start shrink-0">
          <div className="p-2 rounded-lg bg-amber-400/15 text-amber-300 border border-amber-400/30">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Skor SPK
            </p>
            <p className="text-2xl font-bold tabular-nums text-white">
              {data.totalSkorSPK}
            </p>
          </div>
        </div>
      </div>

      {/* Attendance Summary - 5 Interactive Dark Hover Cards */}
      {data.kehadiran && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl group cursor-pointer">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
              Hadir
            </p>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 group-hover:text-emerald-400 mt-1 transition-colors">
              {data.kehadiran.hadir}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl group cursor-pointer">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
              Izin
            </p>
            <p className="text-2xl font-bold tabular-nums text-amber-600 group-hover:text-amber-400 mt-1 transition-colors">
              {data.kehadiran.izin}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl group cursor-pointer">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
              Sakit
            </p>
            <p className="text-2xl font-bold tabular-nums text-blue-600 group-hover:text-blue-400 mt-1 transition-colors">
              {data.kehadiran.sakit}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl group cursor-pointer">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
              Alfa
            </p>
            <p className="text-2xl font-bold tabular-nums text-rose-600 group-hover:text-rose-400 mt-1 transition-colors">
              {data.kehadiran.alfa}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl group cursor-pointer col-span-2 sm:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
              % Kehadiran
            </p>
            <p
              className={`text-2xl font-bold tabular-nums mt-1 transition-colors ${
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
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between cursor-pointer"
            >
              <div className="pb-3 border-b border-slate-100 group-hover:border-slate-800 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold text-slate-900 group-hover:text-white flex items-center gap-2 transition-colors">
                      {c.tipe === "Otomatis" ? (
                        <CheckCircle2 className="h-4 w-4 text-blue-600 group-hover:text-blue-400 shrink-0" />
                      ) : (
                        <BookOpen className="h-4 w-4 text-indigo-600 group-hover:text-indigo-400 shrink-0" />
                      )}
                      <span className="truncate">{c.namaKriteria}</span>
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                      {c.deskripsi || `Bobot evaluasi ${c.bobot}%`}
                    </CardDescription>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 group-hover:bg-slate-800 text-slate-700 group-hover:text-slate-200 border border-slate-200 group-hover:border-slate-700 shrink-0 transition-colors">
                    {c.bobot}%
                  </span>
                </div>
              </div>
              <div className="pt-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-500 group-hover:text-slate-400 mb-0.5 transition-colors">
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
                    <p className="text-xs text-slate-500 group-hover:text-slate-400 mb-0.5 transition-colors">
                      Skor Terbobot
                    </p>
                    <p className="text-base font-bold tabular-nums text-slate-900 group-hover:text-white transition-colors">
                      {c.nilaiTerbobot}
                    </p>
                    <p className="text-xs tabular-nums text-slate-400 group-hover:text-slate-500 transition-colors">
                      ({c.nilaiRataRata} × {c.bobot}%)
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 w-full bg-slate-100 group-hover:bg-slate-800 h-1.5 rounded-xs overflow-hidden transition-colors">
                  <div
                    className="bg-[#1e3a8a] group-hover:bg-blue-500 h-full rounded-xs transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Per-Mapel detail if any */}
                {Object.keys(c.detailMapel).length > 0 &&
                  c.tipe === "Manual" && (
                    <div className="mt-4 pt-3 border-t border-slate-100 group-hover:border-slate-800 transition-colors">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 mb-2 transition-colors">
                        Rincian Per Mata Pelajaran
                      </p>
                      <div className="space-y-1.5">
                        {Object.entries(c.detailMapel).map(([mapel, nilai]) => (
                          <div
                            key={mapel}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-slate-600 group-hover:text-slate-300 truncate mr-2 transition-colors">
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
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-3">
        <div className="pb-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Ringkasan Perhitungan Skor SPK SAW
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Rumus agregasi: Skor Akhir = Σ (Nilai Rata-Rata × Bobot%)
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Kriteria Evaluasi</TableHead>
                <TableHead className="text-center">Tipe Input</TableHead>
                <TableHead className="text-center">Bobot</TableHead>
                <TableHead className="text-center">Nilai</TableHead>
                <TableHead className="text-right pr-6">Skor Terbobot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.criteria.map((c) => (
                <TableRow
                  key={c.id}
                  className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 last:border-0"
                >
                  <TableCell className="pl-6 font-semibold text-slate-800 group-hover/row:text-white transition-colors">
                    {c.namaKriteria}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border transition-colors ${
                        c.tipe === "Otomatis"
                          ? "border-blue-200 text-[#1e3a8a] bg-blue-50 group-hover/row:bg-blue-500/15 group-hover/row:text-blue-300 group-hover/row:border-blue-500/30"
                          : "border-indigo-200 text-indigo-700 bg-indigo-50 group-hover/row:bg-indigo-500/15 group-hover/row:text-indigo-300 group-hover/row:border-indigo-500/30"
                      }`}
                    >
                      {c.tipe}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-mono text-slate-600 group-hover/row:text-slate-400 transition-colors">
                    {c.bobot}%
                  </TableCell>
                  <TableCell
                    className={`text-center font-mono font-bold transition-colors ${
                      getScoreTone(c.nilaiRataRata).text
                    }`}
                  >
                    {c.nilaiRataRata}
                  </TableCell>
                  <TableCell className="text-right pr-6 font-mono font-bold text-slate-900 group-hover/row:text-white transition-colors">
                    {c.nilaiTerbobot}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-slate-50 border-t-2 border-slate-200">
                <TableCell
                  colSpan={4}
                  className="pl-6 font-bold text-slate-900"
                >
                  Total Akumulasi Skor SPK
                </TableCell>
                <TableCell className="text-right pr-6 font-mono font-extrabold text-base text-blue-600">
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
