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
import { StatCard } from "@/components/shared/stat-card";
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
      {/* Unified Aero Masthead: Menyatu mulus secara visual dengan Topbar */}
      <section className="relative overflow-hidden -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10 pt-7 pb-10 bg-gradient-to-r from-[#091424] via-[#0d1e38] to-[#0a1526] border-b border-white/10 text-white shadow-xs">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-44 bg-blue-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10">
          {/* Header Info Row - Centered Executive Layout */}
          <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto pb-8 space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2.5 drop-shadow-xs">
                  <LayoutDashboard className="w-6 h-6 text-blue-400 shrink-0" />
                  <span>Ringkasan Pengajaran Guru</span>
                </h1>
                <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-blue-300 border border-white/10 shadow-xs">
                  Portal Guru
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-200/75 max-w-2xl leading-relaxed">
                Selamat bertugas, <strong className="text-white">{teacherName}</strong> · Kelola presensi harian dan penilaian akademik kelas Anda
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Link href="/guru/nilai">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:border-amber-400/40 hover:text-white transition-all cursor-pointer"
                >
                  <PenLine className="h-3.5 w-3.5 text-amber-300" /> Input Nilai
                </Button>
              </Link>
              <Link href="/guru/absensi">
                <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/30 shadow-xs hover:shadow-md transition-all cursor-pointer">
                  <ClipboardCheck className="h-3.5 w-3.5 text-blue-100" /> Buka Presensi
                </Button>
              </Link>
            </div>
          </div>

          {/* 3 KPI Cards - Sleek Glassmorphism Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-amber-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(251,191,36,0.06)] transition-all duration-200 cursor-pointer shadow-xs"
              title="Kelas Diampu"
              value={data?.totalKelasDiampu ?? 0}
              icon={Users}
              color="blue"
              footerLeft="Kelas aktif mengajar"
              footerRight="Terjadwal"
            />
            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-amber-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(251,191,36,0.06)] transition-all duration-200 cursor-pointer shadow-xs"
              title="Presensi Hari Ini"
              value={`${data?.sudahDiabsenHariIni ?? 0} / ${data?.totalKelasDiampu ?? 0}`}
              icon={ClipboardCheck}
              color="amber"
              footerLeft="Kelas telah diabsen hari ini"
              footerRight="Harian"
            />
            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-amber-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(251,191,36,0.06)] transition-all duration-200 cursor-pointer shadow-xs"
              title="Rata-rata Kehadiran"
              value={data?.rataRataKehadiran ?? "-"}
              icon={CheckCircle2}
              color="emerald"
              footerLeft="Akumulasi seluruh kelas diampu"
              footerRight="Optimal"
            />
          </div>
        </div>
      </section>

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
            <div className="border border-slate-200 py-12 text-center text-xs text-slate-500">
              Akun Anda belum ditugaskan ke kelas atau mata pelajaran manapun.
              Hubungi Administrator Sekolah.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classes.map((kelas) => {
                const isDone = kelas.statusAbsensiHariIni === "Sudah Diabsen";
                return (
                  <div
                    key={kelas.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 group-hover:border-slate-800/80 mb-3 transition-colors">
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-white transition-colors">
                          Kelas {kelas.namaKelas}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-xs font-semibold border transition-colors ${
                            isDone
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 group-hover:bg-emerald-500/15 group-hover:border-emerald-500/30 group-hover:text-emerald-300"
                              : "border-amber-200 bg-amber-50 text-amber-700 group-hover:bg-amber-500/15 group-hover:border-amber-500/30 group-hover:text-amber-300"
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
                      <p className="text-xs text-slate-500 group-hover:text-slate-400 mb-3 transition-colors">
                        Tingkat {kelas.tingkat} · Wali Kelas:{" "}
                        <span className="font-medium text-slate-700 group-hover:text-slate-200 transition-colors">
                          {kelas.waliKelas || "-"}
                        </span>
                      </p>

                      {kelas.subjects && kelas.subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {kelas.subjects.map((subj) => (
                            <span
                              key={subj}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 group-hover:bg-blue-500/15 group-hover:border-blue-500/30 group-hover:text-blue-300 transition-colors"
                            >
                              <BookOpen className="h-3 w-3 text-blue-600 group-hover:text-blue-400 transition-colors" />
                              {subj}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 group-hover:text-slate-500 italic mb-4 transition-colors">
                          Penugasan Wali Kelas
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 group-hover:border-slate-800/80 transition-colors">
                      <Link
                        href={`/guru/absensi?kelas=${encodeURIComponent(kelas.namaKelas)}`}
                        className="flex-1"
                      >
                        <Button className="w-full gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-xs" size="sm">
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
                          className="gap-1 group-hover:border-slate-700 group-hover:text-slate-200 group-hover:hover:bg-slate-800 transition-colors"
                        >
                          Rekap <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Quick Shortcuts */}
        <div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl group space-y-4">
            <div className="pb-3 border-b border-slate-100 group-hover:border-slate-800/80 transition-colors">
              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-white transition-colors">
                Navigasi Cepat Guru
              </h3>
              <p className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                Pintasan modul operasional pengajaran harian
              </p>
            </div>
            <div className="space-y-2">
              <Link
                href="/guru/absensi"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 group-hover:border-slate-800/80 bg-slate-50/50 group-hover:bg-[#0d1d31] hover:bg-slate-100 group-hover:hover:bg-[#12263f] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 group-hover:bg-blue-500/15 text-blue-700 group-hover:text-blue-300 border border-blue-200 group-hover:border-blue-500/30 transition-colors">
                    <ClipboardCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-slate-100 transition-colors">
                      Presensi Per Mapel
                    </p>
                    <p className="text-xs text-slate-500 group-hover:text-slate-400 mt-0.5 transition-colors">
                      Input & impor absensi Excel
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
              </Link>

              <Link
                href="/guru/nilai"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 group-hover:border-slate-800/80 bg-slate-50/50 group-hover:bg-[#0d1d31] hover:bg-slate-100 group-hover:hover:bg-[#12263f] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 group-hover:bg-amber-500/15 text-amber-700 group-hover:text-amber-300 border border-amber-200 group-hover:border-amber-500/30 transition-colors">
                    <PenLine className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-slate-100 transition-colors">
                      Input Nilai Kriteria SPK
                    </p>
                    <p className="text-xs text-slate-500 group-hover:text-slate-400 mt-0.5 transition-colors">
                      Tugas, UTS, UAS & kriteria
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
              </Link>

              <Link
                href="/guru/leaderboard"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 group-hover:border-slate-800/80 bg-slate-50/50 group-hover:bg-[#0d1d31] hover:bg-slate-100 group-hover:hover:bg-[#12263f] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 group-hover:bg-emerald-500/15 text-emerald-700 group-hover:text-emerald-300 border border-emerald-200 group-hover:border-emerald-500/30 transition-colors">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-slate-100 transition-colors">
                      Peringkat Siswa
                    </p>
                    <p className="text-xs text-slate-500 group-hover:text-slate-400 mt-0.5 transition-colors">
                      Hasil pemeringkatan resmi SAW
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
