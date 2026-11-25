"use client";

import { useState, useEffect, useCallback } from "react";
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
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
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
  const [error, setError] = useState<string | null>(null);
  const { data: session } = authClient.useSession();

  const teacherName = session?.user?.name || "Guru Pengajar";

  const fetchDashboard = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setLoading(true);
      setError(null);
    }
    try {
      const r = await fetch("/api/teachers/me/dashboard");
      const json = await r.json().catch(() => null);
      if (!r.ok) {
        throw new Error(json?.error || "Gagal memuat ringkasan pengajaran.");
      }
      setData(json);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat data dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

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
        icon={LayoutDashboard}
        description={`Selamat bertugas, ${teacherName}. Kelola presensi harian dan penilaian kelas Anda.`}
        bottomContent={
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              variant="dark"
              className="rounded-xl border border-white/10"
              title="Kelas Diampu"
              value={data?.totalKelasDiampu ?? 0}
              icon={Users}
              color="blue"
              footerLeft="Kelas aktif mengajar & perwalian"
              footerRight="Terjadwal"
            />
            <StatCard
              variant="dark"
              className="rounded-xl border border-white/10"
              title="Presensi Hari Ini"
              value={`${data?.sudahDiabsenHariIni ?? 0} / ${data?.totalKelasDiampu ?? 0}`}
              icon={ClipboardCheck}
              color="amber"
              footerLeft="Seluruh mapel kelas tercatat"
              footerRight="Harian"
            />
            <StatCard
              variant="dark"
              className="rounded-xl border border-white/10"
              title="Rata-rata Kehadiran"
              value={data?.rataRataKehadiran ?? "-"}
              icon={CheckCircle2}
              color="emerald"
              footerLeft="Akumulasi mapel yang diampu"
              footerRight="Optimal"
            />
          </div>
        }
      >
        <Link href="/guru/nilai">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 cursor-pointer"
          >
            <PenLine className="h-3.5 w-3.5" /> Input Nilai
          </Button>
        </Link>
        <Link href="/guru/absensi">
          <Button
            size="sm"
            className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/25 cursor-pointer"
          >
            <ClipboardCheck className="h-3.5 w-3.5" /> Buka Presensi
          </Button>
        </Link>
      </PageHeader>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchDashboard(true)}
            className="gap-1.5 border-rose-300 bg-white text-rose-700 hover:bg-rose-100 self-start sm:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Muat Ulang
          </Button>
        </div>
      )}

      {/* Main Content Split: Assigned Classes + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
        <div className="lg:col-span-2 lg:border-r lg:border-slate-200 lg:pr-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Daftar Kelas yang Diampu
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Status presensi harian dan alokasi mata pelajaran per kelas
              </p>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              {classes.length} Kelas
            </span>
          </div>

          {classes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-400">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                Belum Ada Penugasan Kelas atau Mata Pelajaran
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Akun Anda belum ditugaskan ke kelas atau mata pelajaran manapun.
                Hubungi Administrator Sekolah untuk mengatur penugasan jadwal.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classes.map((kelas) => {
                const isDone = kelas.statusAbsensiHariIni === "Sudah Diabsen";
                const hasTeachingSubjects =
                  Boolean(kelas.subjects) && kelas.subjects!.length > 0;
                return (
                  <div
                    key={kelas.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 hover:border-slate-300/90 hover:shadow-sm transition-all duration-300 group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-3 transition-colors">
                        <h3 className="text-sm font-bold text-slate-900 transition-colors">
                          Kelas {kelas.namaKelas}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-xs font-semibold border transition-colors ${
                            isDone
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-xs ${
                              isDone ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {kelas.statusAbsensiHariIni}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3 transition-colors">
                        Tingkat {kelas.tingkat} · Wali Kelas:{" "}
                        <span className="font-medium text-slate-700 transition-colors">
                          {kelas.waliKelas || "-"}
                        </span>
                      </p>

                      {hasTeachingSubjects ? (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {kelas.subjects!.map((subj) => (
                            <span
                              key={subj}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 transition-colors"
                            >
                              <BookOpen className="h-3 w-3 text-blue-600 transition-colors" />
                              {subj}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic mb-4 transition-colors">
                          Penugasan Wali Kelas (Pantau Rekapitulasi)
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 transition-colors">
                      {hasTeachingSubjects ? (
                        <>
                          <Link
                            href={`/guru/absensi?kelas=${encodeURIComponent(kelas.namaKelas)}`}
                            className="flex-1"
                          >
                            <Button
                              className="w-full gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-xs"
                              size="sm"
                            >
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
                              className="gap-1 transition-colors"
                            >
                              Rekap <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </>
                      ) : (
                        <Link
                          href={`/guru/rekap?kelas=${encodeURIComponent(kelas.namaKelas)}`}
                          className="w-full"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-1.5 transition-colors"
                          >
                            Lihat Rekap Kelas <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Quick Shortcuts */}
        <div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-300 hover:border-slate-300/90 hover:shadow-sm group space-y-4">
            <div className="pb-3 border-b border-slate-100 transition-colors">
              <h3 className="text-sm font-semibold text-slate-900 transition-colors">
                Navigasi Cepat Guru
              </h3>
              <p className="text-xs text-slate-500 transition-colors">
                Pintasan modul operasional pengajaran harian
              </p>
            </div>
            <div className="space-y-2">
              <Link
                href="/guru/absensi"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 transition-colors">
                    <ClipboardCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 transition-colors">
                      Presensi Per Mapel
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 transition-colors">
                      Input & impor absensi Excel
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-colors" />
              </Link>

              <Link
                href="/guru/nilai"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 transition-colors">
                    <PenLine className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 transition-colors">
                      Input Nilai Kriteria SPK
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 transition-colors">
                      Tugas, UTS, UAS & kriteria
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-colors" />
              </Link>

              <Link
                href="/guru/leaderboard"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 transition-colors">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 transition-colors">
                      Peringkat Siswa
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 transition-colors">
                      Hasil pemeringkatan resmi SAW
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
