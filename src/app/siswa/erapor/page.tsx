"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Printer,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  ArrowLeft,
  CalendarCheck,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { ReportCardPrintView } from "@/components/erapor/report-card-print-view";
import { StudentReportCardData } from "@/lib/erapor";

export default function SiswaEraporPage() {
  const [data, setData] = useState<StudentReportCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStudentReport() {
      try {
        // 1. Ambil profil siswa yang sedang login
        const profileRes = await fetch("/api/students/me");
        if (!profileRes.ok) {
          throw new Error("Gagal mengidentifikasi data profil siswa");
        }
        const profile = await profileRes.json();
        if (!profile?.id) {
          throw new Error("Data profil siswa tidak lengkap");
        }

        // 2. Ambil data terpadu E-Rapor
        const reportRes = await fetch(`/api/erapor/student/${profile.id}`);
        if (!reportRes.ok) {
          const errJson = await reportRes.json().catch(() => null);
          throw new Error(errJson?.error || "Gagal memuat rapor semester");
        }
        const reportData = await reportRes.json();

        if (!cancelled) {
          setData(reportData);
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500 font-medium">
          Menyiapkan Lembar E-Rapor Siswa...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-xs">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">
          Gagal Memuat E-Rapor
        </h3>
        <p className="text-xs text-slate-500">{error || "Data rapor belum tersedia"}</p>
        <div className="pt-2">
          <Link href="/siswa/nilai">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Transkrip Nilai
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. SEAMLESS HERO PAGE HEADER (Flush with topbar, matches Portal Siswa) */}
      <div className="print:hidden">
        <PageHeader
          title="E-Rapor Internal Siswa"
          badge="Portal Siswa"
          description="Laporan Hasil Belajar Siswa resmi SMK Penerbangan Dirgantara dengan perhitungan nilai bagi rata"
          icon={FileSpreadsheet}
        >
          <Link href="/siswa/nilai">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5 text-slate-400" /> Transkrip Nilai
            </Button>
          </Link>

          <Button
            onClick={() => window.print()}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
          >
            <Printer className="h-3.5 w-3.5 text-slate-400" /> Cetak Rapor (A4)
          </Button>
        </PageHeader>
      </div>

      {/* 2. KPI STAT CARDS (Standard SIMESA StatCard row) */}
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
          value={`${data.rekapNilai.jumlahTuntas} / ${data.rekapNilai.jumlahMapel}`}
          icon={CheckCircle2}
          color="emerald"
          footerLeft={
            data.rekapNilai.jumlahBelumTuntas === 0
              ? "Semua Mapel Tuntas"
              : `${data.rekapNilai.jumlahBelumTuntas} Perlu Remidi`
          }
          footerRight="Target 75"
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
          title="Status Pengesahan"
          value={data.statusRapor}
          icon={GraduationCap}
          color="amber"
          footerLeft={`Wali: ${data.waliKelas.nama}`}
          footerRight="Dokumen Internal"
        />
      </div>

      {/* 3. LEMBAR RAPOR PRINT VIEW */}
      <ReportCardPrintView data={data} />
    </div>
  );
}
