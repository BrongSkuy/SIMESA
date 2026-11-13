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
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">
          Menyiapkan Lembar E-Rapor Siswa...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-card border rounded-xl text-center space-y-4 shadow-sm">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h3 className="text-base font-bold text-foreground">
          Gagal Memuat E-Rapor
        </h3>
        <p className="text-xs text-muted-foreground">{error || "Data rapor belum tersedia"}</p>
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
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* HEADER & QUICK STATS (Di luar print area) */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader
            title="E-Rapor Internal Siswa"
            description="Laporan Hasil Belajar Siswa resmi SMK Penerbangan Dirgantara dengan perhitungan nilai bagi rata"
          />

          <div className="flex items-center gap-2">
            <Link href="/siswa/nilai">
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Transkrip Nilai
              </Button>
            </Link>

            <Button
              onClick={() => window.print()}
              size="sm"
              className="gap-2 text-xs bg-primary text-primary-foreground shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Cetak Rapor (A4)
            </Button>
          </div>
        </div>

        {/* Ringkasan Capaian */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] text-muted-foreground font-medium">Rata-rata Rapor</span>
            <div className="text-xl font-black text-foreground mt-0.5">
              {data.rekapNilai.rataRata.toFixed(2)}
            </div>
            <p className="text-[10px] text-muted-foreground">Predikat: {data.rekapNilai.predikatUmum}</p>
          </div>

          <div className="bg-card border rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] text-muted-foreground font-medium">Ketuntasan KKM</span>
            <div className="text-xl font-black text-emerald-600 mt-0.5">
              {data.rekapNilai.jumlahTuntas} <span className="text-xs text-muted-foreground font-normal">/ {data.rekapNilai.jumlahMapel} Mapel</span>
            </div>
            <p className="text-[10px] text-emerald-600 font-medium">
              {data.rekapNilai.jumlahBelumTuntas === 0 ? "Semua Mapel Tuntas" : `${data.rekapNilai.jumlahBelumTuntas} Perlu Remidi`}
            </p>
          </div>

          <div className="bg-card border rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] text-muted-foreground font-medium">Presensi Semester</span>
            <div className="text-xl font-black text-blue-600 mt-0.5">
              {data.presensi.persentase}%
            </div>
            <p className="text-[10px] text-muted-foreground">
              H:{data.presensi.hadir} S:{data.presensi.sakit} I:{data.presensi.izin} A:{data.presensi.alfa}
            </p>
          </div>

          <div className="bg-card border rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] text-muted-foreground font-medium">Status Pengesahan</span>
            <div className="text-base font-bold text-foreground mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{data.statusRapor}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Wali Kelas: {data.waliKelas.nama}</p>
          </div>
        </div>
      </div>

      {/* LEMBAR RAPOR PRINT VIEW */}
      <ReportCardPrintView data={data} />
    </div>
  );
}
