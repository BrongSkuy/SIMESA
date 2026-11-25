"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookMarked,
  Printer,
  Loader2,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  ArrowLeft,
  CalendarCheck,
  TrendingUp,
  Lock,
  Eye,
  LayoutList,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ReportCardPrintView,
  printReportCards,
} from "@/components/erapor/report-card-print-view";
import type { StudentReportCardData } from "@/lib/erapor";
import {
  DEFAULT_KKM_FALLBACK,
  getKkmAverageColorInfo,
  getStudentEraporGateInfo,
  type EraporStatus,
} from "@/lib/erapor-utils";
import { cn } from "@/lib/utils";

interface LockedEraporResponse {
  locked: true;
  statusRapor: EraporStatus;
  periode: string;
  periodeDisplay: string;
  defaultKkm: number;
  waliKelas: { nama: string; nip: string };
  student: { namaLengkap: string; kelas: string; nis: string };
  totalMapel: number;
  jumlahMapelTerisi: number;
}

type StudentEraporApiResponse =
  | LockedEraporResponse
  | ({ locked: false } & StudentReportCardData);

export default function SiswaEraporPage() {
  const [response, setResponse] = useState<StudentEraporApiResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"summary" | "preview">("summary");

  useEffect(() => {
    let cancelled = false;

    async function loadStudentReport() {
      try {
        const profileRes = await fetch("/api/students/me");
        if (!profileRes.ok) {
          throw new Error("Gagal memuat profil siswa");
        }
        const profile = await profileRes.json();
        if (!profile?.id) {
          throw new Error("Data profil siswa tidak lengkap");
        }

        const reportRes = await fetch(`/api/erapor/student/${profile.id}`);
        if (!reportRes.ok) {
          const errJson = await reportRes.json().catch(() => null);
          throw new Error(errJson?.error || "Gagal memuat rapor semester");
        }
        const reportData: StudentEraporApiResponse = await reportRes.json();

        if (!cancelled) {
          setResponse(reportData);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
          setError(msg);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStudentReport();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
        <p className="text-xs text-slate-500 font-medium">
          Memuat E-Rapor Siswa...
        </p>
      </div>
    );
  }

  if (error || !response) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white border border-slate-200 rounded-2xl text-center space-y-3 shadow-xs">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-sm font-bold text-slate-900">
          Gagal Memuat E-Rapor
        </h3>
        <p className="text-xs text-slate-500">
          {error || "Data rapor belum tersedia."}
        </p>
        <div className="pt-1">
          <Link href="/siswa/nilai">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Nilai Saya
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Kondisi 1: Rapor belum diterbitkan (Draf atau Disahkan)
  if (response.locked) {
    const gate = getStudentEraporGateInfo(response.statusRapor);
    return (
      <div className="space-y-6">
        <PageHeader
          title="E-Rapor Siswa"
          badge="Portal Siswa"
          description={`Periode ${response.periodeDisplay}`}
          icon={BookMarked}
        >
          <Link href="/siswa/nilai">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali ke Nilai Saya
            </Button>
          </Link>
        </PageHeader>

        <div className="max-w-lg mx-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              Status: {response.statusRapor}
            </span>
            <h2 className="text-base font-bold text-slate-900">
              E-Rapor Belum Diterbitkan
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {gate.message}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1 text-left">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
              <p className="text-[11px] text-slate-500">Progres Nilai</p>
              <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                {response.jumlahMapelTerisi} dari {response.totalMapel} Mapel
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
              <p className="text-[11px] text-slate-500">Wali Kelas</p>
              <p className="text-sm font-bold text-slate-900 truncate mt-0.5">
                {response.waliKelas.nama}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Link href="/siswa/nilai">
              <Button size="sm" className="gap-1.5 text-xs cursor-pointer">
                <ArrowLeft className="w-3.5 h-3.5" />
                Pantau Nilai Sementara
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Kondisi 2: Rapor sudah Diterbitkan
  const data = response;
  const activeKkm = data.defaultKkm ?? DEFAULT_KKM_FALLBACK;

  const handlePrint = () => {
    printReportCards(
      [data],
      `E-Rapor - ${data.student.namaLengkap} (${data.student.nis})`
    );
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="E-Rapor Siswa"
          badge={data.statusRapor}
          description={`Laporan hasil belajar resmi periode ${data.periodeDisplay}`}
          icon={BookMarked}
        >
          <Link href="/siswa/nilai">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              Nilai Saya
            </Button>
          </Link>

          <Button
            onClick={handlePrint}
            size="sm"
            className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            Cetak Rapor (A4)
          </Button>
        </PageHeader>
      </div>

      {/* KPI Ringkas */}
      <div className="print:hidden rounded-2xl border border-slate-200 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid sm:grid-cols-4 bg-white overflow-hidden shadow-xs">
        <StatCard
          title="Rata-rata Rapor"
          value={data.rekapNilai.rataRata.toFixed(2)}
          icon={TrendingUp}
          color="blue"
          footerLeft={`Predikat: ${data.rekapNilai.predikatUmum}`}
          footerRight="Bagi Rata"
        />
        <StatCard
          title="Ketuntasan KKM"
          value={`${data.rekapNilai.jumlahTuntas} dari ${data.rekapNilai.jumlahMapel}`}
          icon={CheckCircle2}
          color="emerald"
          footerLeft={
            data.rekapNilai.jumlahBelumTuntas === 0
              ? "Semua Mapel Tuntas"
              : `${data.rekapNilai.jumlahBelumTuntas} Perlu Perbaikan`
          }
          footerRight={`KKM ${activeKkm}`}
        />
        <StatCard
          title="Presensi Semester"
          value={`${data.presensi.persentase}%`}
          icon={CalendarCheck}
          color="navy"
          footerLeft={`H:${data.presensi.hadir} S:${data.presensi.sakit} I:${data.presensi.izin} A:${data.presensi.alfa}`}
          footerRight="Kehadiran"
        />
        <StatCard
          title="Status Rapor"
          value={data.statusRapor}
          icon={GraduationCap}
          color="amber"
          footerLeft={`Wali: ${data.waliKelas.nama}`}
          footerRight="Resmi"
        />
      </div>

      {/* Switch Ringkasan vs Pratinjau A4 */}
      <div className="print:hidden flex items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Mode tampilan rapor siswa"
          className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "summary"}
            onClick={() => setViewMode("summary")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              viewMode === "summary"
                ? "bg-[#0d1e38] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Ringkasan Rapor
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "preview"}
            onClick={() => setViewMode("preview")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              viewMode === "preview"
                ? "bg-[#0d1e38] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            Pratinjau Lembar A4
          </button>
        </div>
      </div>

      {viewMode === "summary" ? (
        <div className="space-y-5">
          {/* Tabel Capaian Mata Pelajaran */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75">
                    <TableHead className="w-12 text-center text-xs">No</TableHead>
                    <TableHead className="text-xs">Mata Pelajaran</TableHead>
                    <TableHead className="w-20 text-center text-xs">KKM</TableHead>
                    <TableHead className="w-24 text-center text-xs">Nilai</TableHead>
                    <TableHead className="w-24 text-center text-xs">Predikat</TableHead>
                    <TableHead className="text-xs">Capaian Pembelajaran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.subjects.map((sub, idx) => {
                    const colorInfo = getKkmAverageColorInfo(
                      sub.nilaiAkhir,
                      sub.kkm
                    );
                    return (
                      <TableRow
                        key={`${sub.mapel}-${idx}`}
                        className="group/row transition-colors hover:bg-slate-50/90 border-b border-slate-100 last:border-0"
                      >
                        <TableCell className="text-center font-mono text-xs text-slate-400">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-semibold text-slate-900 block">
                            {sub.mapel}
                          </span>
                          <span className="text-[11px] text-slate-500 ">
                            {sub.guruPengampu}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-slate-600 ">
                          {sub.kkm}
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm font-bold tabular-nums">
                          {sub.nilaiAkhir !== null ? (
                            <span className={colorInfo.textClass}>
                              {sub.nilaiAkhir.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs text-slate-800 ">
                          {sub.predikat}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 max-w-md leading-relaxed">
                          {sub.deskripsi}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Catatan Wali Kelas & Ekstrakurikuler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Catatan Wali Kelas
              </h3>
              {data.catatanWaliKelas?.trim() ? (
                <p className="text-xs text-slate-700 leading-relaxed italic">
                  &ldquo;{data.catatanWaliKelas.trim()}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  Belum ada catatan wali kelas.
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ekstrakurikuler
              </h3>
              {data.ekskul?.nama?.trim() ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {data.ekskul.nama.trim()}
                    </span>
                    {data.ekskul.nilai?.trim() && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {data.ekskul.nilai.trim()}
                      </span>
                    )}
                  </div>
                  {data.ekskul.keterangan?.trim() && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {data.ekskul.keterangan.trim()}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400">
                  Belum ada data ekstrakurikuler.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <ReportCardPrintView data={data} />
      )}
    </div>
  );
}
