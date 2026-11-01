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
      <div className="flex h-56 flex-col items-center justify-center gap-2 text-slate-500 bg-white border border-slate-200 rounded-xl shadow-xs">
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

      {/* Score Summary Card */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-base shrink-0">
            {getInitials(data.student.namaLengkap)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Periode: {data.periode || "Aktif"}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200">
                NIS {data.student.nis}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Kelas {data.student.kelas}
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-1.5">
              {data.student.namaLengkap}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3.5 bg-slate-50 rounded-xl px-5 py-3.5 border border-slate-200 w-full sm:w-auto justify-between sm:justify-start">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-700 border border-blue-200">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Skor SPK
            </p>
            <p className="text-2xl font-bold tabular-nums text-slate-900">
              {data.totalSkorSPK}
            </p>
          </div>
        </div>
      </div>

      {/* Attendance Summary */}
      {data.kehadiran && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Hadir
            </p>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 mt-1">
              {data.kehadiran.hadir}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Izin
            </p>
            <p className="text-2xl font-bold tabular-nums text-amber-600 mt-1">
              {data.kehadiran.izin}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sakit
            </p>
            <p className="text-2xl font-bold tabular-nums text-blue-600 mt-1">
              {data.kehadiran.sakit}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Alfa
            </p>
            <p className="text-2xl font-bold tabular-nums text-rose-600 mt-1">
              {data.kehadiran.alfa}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs col-span-2 sm:col-span-1">
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.criteria.map((c) => {
          const tone = getScoreTone(c.nilaiRataRata);
          const pct = Math.min(100, Math.max(0, c.nilaiRataRata));
          return (
            <Card
              key={c.id}
              className="hover:border-slate-300 transition-colors"
            >
              <CardHeader className="pb-3 border-b border-slate-100">
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
              </CardHeader>
              <CardContent className="pt-4">
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
                <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Full Table Summary */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Ringkasan Perhitungan Skor SPK SAW
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Rumus agregasi: Skor Akhir = Σ (Nilai Rata-Rata × Bobot%)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
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
                <TableRow key={c.id}>
                  <TableCell className="pl-6 font-semibold text-slate-800">
                    {c.namaKriteria}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        c.tipe === "Otomatis"
                          ? "border-blue-200 text-blue-700 bg-blue-50"
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
        </CardContent>
      </Card>
    </div>
  );
}
