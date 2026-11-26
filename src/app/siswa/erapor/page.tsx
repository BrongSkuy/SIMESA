"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Printer,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { ModulePageShell } from "@/components/shared/module-page-shell";
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
      <ModulePageShell
        theme="emerald"
        eyebrow="Laporan Hasil Belajar | Portal Siswa"
        title="E-Rapor Siswa"
        description={`Laporan hasil belajar periode ${response.periodeDisplay}.`}
        stats={[
          { label: "Status Rapor", value: response.statusRapor, tone: "amber" },
          {
            label: "Progres Nilai",
            value: `${response.jumlahMapelTerisi}/${response.totalMapel} Mapel`,
          },
          { label: "Wali Kelas", value: response.waliKelas.nama },
        ]}
        actions={
          <Link href="/siswa/nilai">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali ke Nilai Saya
            </Button>
          </Link>
        }
        sheetClassName="p-6 sm:p-10"
      >
        <div className="max-w-lg mx-auto text-center space-y-4">
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
      </ModulePageShell>
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
    <ModulePageShell
      theme="emerald"
      eyebrow="Laporan Hasil Belajar | Portal Siswa"
      title="E-Rapor Siswa"
      description={`Laporan hasil belajar resmi periode ${data.periodeDisplay}.`}
      stats={[
        {
          label: "Rata-rata Rapor",
          value: data.rekapNilai.rataRata.toFixed(2),
          sublabel: `Predikat ${data.rekapNilai.predikatUmum}`,
          tone: "blue",
        },
        {
          label: "Ketuntasan KKM",
          value: `${data.rekapNilai.jumlahTuntas}/${data.rekapNilai.jumlahMapel}`,
          sublabel: `KKM ${activeKkm}`,
          tone:
            data.rekapNilai.jumlahBelumTuntas === 0 ? "emerald" : "amber",
        },
        {
          label: "Presensi Semester",
          value: `${data.presensi.persentase}%`,
          sublabel: `H:${data.presensi.hadir} S:${data.presensi.sakit} I:${data.presensi.izin} A:${data.presensi.alfa}`,
        },
        {
          label: "Status Rapor",
          value: data.statusRapor,
          sublabel: data.waliKelas.nama,
          tone: "emerald",
        },
      ]}
      actions={
        <>
          <Link href="/siswa/nilai">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              Nilai Saya
            </Button>
          </Link>

          <Button
            onClick={handlePrint}
            size="sm"
            className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            Cetak Rapor (A4)
          </Button>
        </>
      }
      tabs={[
        { key: "summary", label: "Ringkasan Rapor" },
        { key: "preview", label: "Pratinjau Lembar A4" },
      ]}
      activeTab={viewMode}
      onTabChange={(key) => setViewMode(key as "summary" | "preview")}
      sheetClassName="p-5 sm:p-6 print:p-0 print:border-0 print:shadow-none"
    >
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
        <ReportCardPrintView data={data} hideToolbar />
      )}
    </ModulePageShell>
  );
}
