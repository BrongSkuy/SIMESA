"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  CheckCircle2,
  ArrowRight,
  Loader2,
  BookOpen,
  PenLine,
  Trophy,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

interface KelasRow {
  id: string;
  namaKelas: string;
  tingkat: string;
  waliKelas: string | null;
  subjects?: string[];
  statusAbsensiHariIni: "Sudah Diabsen" | "Belum Diabsen";
}

interface DashboardData {
  totalKelasDiampu: number;
  sudahDiabsenHariIni: number;
  rataRataKehadiran: string;
  classes: KelasRow[];
}

export default function GuruDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: session } = authClient.useSession();

  const teacherName = session?.user?.name || "Guru Pengajar";

  useEffect(() => {
    fetch("/api/teachers/me/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
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

  const classes = data?.classes || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ringkasan Pengajaran Guru"
        badge="Portal Guru"
        description={`Selamat bertugas, ${teacherName} · Kelola presensi harian dan penilaian akademik kelas Anda`}
        icon={LayoutDashboard}
      >
        <Link href="/guru/nilai">
          <Button variant="outline" size="sm" className="gap-1.5">
            <PenLine className="h-3.5 w-3.5 text-slate-500" /> Input Nilai
          </Button>
        </Link>
        <Link href="/guru/absensi">
          <Button size="sm" className="gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" /> Buka Presensi
          </Button>
        </Link>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Kelas Diampu"
          value={data?.totalKelasDiampu ?? 0}
          icon={Users}
          color="blue"
          footerLeft="Rombongan belajar aktif"
          footerRight="Terjadwal"
        />
        <StatCard
          title="Presensi Hari Ini"
          value={`${data?.sudahDiabsenHariIni ?? 0} / ${data?.totalKelasDiampu ?? 0}`}
          icon={ClipboardCheck}
          color="amber"
          footerLeft="Kelas telah diabsen hari ini"
          footerRight="Harian"
        />
        <StatCard
          title="Rata-rata Kehadiran"
          value={data?.rataRataKehadiran ?? "-"}
          icon={CheckCircle2}
          color="emerald"
          footerLeft="Akumulasi seluruh kelas diampu"
          footerRight="Optimal"
        />
      </div>

      {/* Main Content Split: Assigned Classes + Dark Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Daftar Kelas yang Diampu
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Status presensi harian dan alokasi mata pelajaran per rombel
              </p>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              {classes.length} Rombel
            </span>
          </div>

          {classes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-xs text-slate-500">
                Akun Anda belum ditugaskan ke kelas atau mata pelajaran manapun.
                Hubungi Administrator Sekolah.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {classes.map((kelas) => {
                const isDone = kelas.statusAbsensiHariIni === "Sudah Diabsen";
                return (
                  <Card
                    key={kelas.id}
                    className="group transition-colors hover:border-slate-300 flex flex-col justify-between"
                  >
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base font-bold text-slate-900">
                          Kelas {kelas.namaKelas}
                        </CardTitle>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            isDone
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isDone ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {kelas.statusAbsensiHariIni}
                        </span>
                      </div>
                      <CardDescription className="text-xs text-slate-500 mt-1">
                        Tingkat {kelas.tingkat} · Wali Kelas:{" "}
                        <span className="font-medium text-slate-700">
                          {kelas.waliKelas || "-"}
                        </span>
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-4">
                      {kelas.subjects && kelas.subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {kelas.subjects.map((subj) => (
                            <span
                              key={subj}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                            >
                              <BookOpen className="h-3 w-3 text-blue-600" />
                              {subj}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          Penugasan Wali Kelas
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <Link
                          href={`/guru/absensi?kelas=${encodeURIComponent(kelas.namaKelas)}`}
                          className="flex-1"
                        >
                          <Button className="w-full gap-1.5" size="sm">
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            Mulai Absensi
                          </Button>
                        </Link>
                        <Link
                          href={`/guru/rekap?kelas=${encodeURIComponent(kelas.namaKelas)}`}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                          >
                            Rekap <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Quick Shortcuts */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Navigasi Cepat Guru
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Pintasan modul operasional pengajaran harian
            </p>
            <div className="space-y-2.5">
              <Link
                href="/guru/absensi"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    <ClipboardCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                      Presensi Per Mapel
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Input & impor absensi Excel
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
              </Link>

              <Link
                href="/guru/nilai"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                    <PenLine className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-amber-700 transition-colors">
                      Input Nilai Kriteria SPK
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tugas, UTS, UAS & kriteria
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
              </Link>

              <Link
                href="/guru/leaderboard"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">
                      Peringkat Siswa
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Hasil pemeringkatan resmi SAW
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
