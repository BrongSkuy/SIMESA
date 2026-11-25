"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  ShieldAlert,
  Award,
  Clock,
  CheckCircle2,
  Loader2,
  BookOpen,
} from "lucide-react";
import { SANCTION_THRESHOLDS, type SanctionThresholds } from "@/lib/violations";

function formatShortDateId(dateStr: string): string {
  if (!dateStr) return "-";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface ViolationHistoryItem {
  id: string;
  tanggal: string;
  namaPelanggaran: string;
  kategori: string;
  poin: number;
  lokasi?: string;
  keterangan?: string;
  status: string;
  tindakLanjut?: string;
}

interface StudentProfileData {
  student: {
    id: string;
    nis: string;
    namaLengkap: string;
    kelas: string;
  };
  totalPoints: number;
  thresholds?: SanctionThresholds;
  tier: {
    status: string;
    level: string;
    badgeColor: string;
    badgeBg: string;
    badgeBorder: string;
    actionRequired: string;
  };
  breakdown: {
    ringan: number;
    sedang: number;
    berat: number;
    selesaiDibina: number;
  };
  violations: ViolationHistoryItem[];
}

export function StudentViolationView() {
  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [headerBgLoaded, setHeaderBgLoaded] = useState(true);

  useEffect(() => {
    async function fetchMyDiscipline() {
      try {
        const resDiscipline = await fetch("/api/violations/student/me", {
          cache: "no-store",
        });
        if (resDiscipline.ok) {
          const d = await resDiscipline.json();
          setProfile(d);
        }
      } catch (err) {
        console.error("Failed to load student discipline profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMyDiscipline();
  }, []);

  const totalPoints = profile?.totalPoints ?? 0;
  const thresholds = profile?.thresholds ?? SANCTION_THRESHOLDS;
  const maxScale = Math.max(1, thresholds.SP_3);
  const progressPct = Math.min(100, Math.max(0, (totalPoints / maxScale) * 100));
  const pembinaanTickPct = Math.min(95, (thresholds.PEMBINAAN_LISAN / maxScale) * 100);
  const sp1TickPct = Math.min(97, (thresholds.SP_1 / maxScale) * 100);
  const sp2TickPct = Math.min(99, (thresholds.SP_2 / maxScale) * 100);

  const getMeterBarColor = (pts: number) => {
    if (pts === 0) return "bg-emerald-400";
    if (pts < thresholds.PEMBINAAN_LISAN) return "bg-sky-400";
    if (pts < thresholds.SP_1) return "bg-amber-400";
    if (pts < thresholds.SP_2) return "bg-orange-400";
    return "bg-rose-500";
  };

  return (
    <div className="space-y-6">
      {/* Header Banner Bertema Deep Navy (Gaya Halaman Login, less red) */}
      <section className="relative overflow-hidden -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10 pt-7 pb-8 bg-gradient-to-b from-[#091424] via-[#0d1e38] to-[#0a1526] border-b border-white/10 text-white shadow-xs">
        {headerBgLoaded && (
          <Image
            src="/bg-buku-poin.jpg"
            alt=""
            fill
            sizes="100vw"
            unoptimized
            priority
            className="object-cover object-center opacity-25 mix-blend-luminosity filter contrast-125 brightness-95 pointer-events-none select-none"
            onError={() => setHeaderBgLoaded(false)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#091424]/75 via-[#0d1e38]/75 to-[#0a1526]/92 pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 border border-white/15 text-amber-200">
              <BookOpen className="w-3 h-3" />
              Portal Siswa
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Buku Saku Kedisiplinan Siswa
            </h1>
            <p className="text-xs sm:text-sm text-blue-200/80 max-w-xl">
              Pantauan akumulasi poin tata tertib dan riwayat pembinaan karakter
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1F4E78]" />
            Memuat buku saku kedisiplinan Anda...
          </div>
        ) : !profile ? (
          <div className="p-8 text-center text-xs text-slate-500 rounded-xl border border-slate-200 bg-white">
            Data profil siswa belum ditemukan.
          </div>
        ) : (
          <>
            {/* Alternatif 4: Kartu Buku Saku Poin (Modern Passbook Card) */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0c1527] via-[#17213b] to-[#1e1526] border border-white/10 text-white shadow-md">
              {/* Punggung kiri kartu buku saku */}
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-b from-amber-400 via-rose-600 to-rose-800"
              />
              <div className="p-5 sm:p-6 pl-7 sm:pl-8 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-amber-300/90">
                      {totalPoints === 0 ? (
                        <Award className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                      )}
                      <span>Kartu Buku Saku Poin</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      {profile.student.namaLengkap}
                    </h2>
                    <p className="text-xs text-slate-300 font-mono">
                      NIS {profile.student.nis} • Kelas {profile.student.kelas}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 sm:text-right">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        Akumulasi Poin
                      </p>
                      <p className="text-3xl font-extrabold font-mono tabular-nums text-white leading-none mt-1">
                        {totalPoints}{" "}
                        <span className="text-xs font-semibold text-slate-400">
                          Poin
                        </span>
                      </p>
                    </div>
                    <div className="h-10 w-px bg-white/10 hidden sm:block" />
                    <div className="space-y-1">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          totalPoints === 0
                            ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/30"
                            : totalPoints < thresholds.SP_1
                            ? "bg-amber-500/15 text-amber-200 border-amber-400/30"
                            : "bg-rose-500/20 text-rose-200 border-rose-400/40"
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {profile.tier.status}
                      </span>
                      <p className="text-[11px] text-slate-300">
                        {profile.violations.length} catatan •{" "}
                        {profile.breakdown.selesaiDibina} selesai dibina
                      </p>
                    </div>
                  </div>
                </div>

                {/* Meteran Ambang Batas Poin Dinamis */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>Skala Kedisiplinan</span>
                    <span className="text-slate-400">
                      {profile.tier.actionRequired}
                    </span>
                  </div>
                  <div className="relative h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getMeterBarColor(
                        totalPoints
                      )}`}
                      style={{ width: `${totalPoints === 0 ? 4 : progressPct}%` }}
                    />
                    <div
                      className="absolute inset-y-0 w-px bg-white/35"
                      style={{ left: `${pembinaanTickPct}%` }}
                    />
                    <div
                      className="absolute inset-y-0 w-px bg-white/40"
                      style={{ left: `${sp1TickPct}%` }}
                    />
                    <div
                      className="absolute inset-y-0 w-px bg-white/40"
                      style={{ left: `${sp2TickPct}%` }}
                    />
                  </div>
                  <div className="relative h-7 text-[11px] font-mono text-slate-300/90 select-none">
                    <span className="absolute left-0 top-0.5 whitespace-nowrap">0 Aman</span>
                    <span
                      className="absolute top-0.5 -translate-x-1/2 hidden sm:inline whitespace-nowrap"
                      style={{ left: `${pembinaanTickPct}%` }}
                    >
                      {thresholds.PEMBINAAN_LISAN} Pembinaan
                    </span>
                    <span
                      className="absolute top-0.5 -translate-x-1/2 text-amber-300 whitespace-nowrap"
                      style={{ left: `${sp1TickPct}%` }}
                    >
                      {thresholds.SP_1} SP 1
                    </span>
                    <span
                      className="absolute top-0.5 -translate-x-1/2 text-orange-300 whitespace-nowrap"
                      style={{ left: `${sp2TickPct}%` }}
                    >
                      {thresholds.SP_2} SP 2
                    </span>
                    <span className="absolute right-0 top-0.5 text-rose-300 whitespace-nowrap">
                      {thresholds.SP_3} SP 3
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Riwayat Pelanggaran */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">
                  Riwayat Catatan Pelanggaran Tata Tertib
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar kejadian yang dicatat oleh guru piket, wali kelas, atau guru bimbingan konseling
                </p>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/75">
                      <TableHead className="w-12 text-center text-xs">No</TableHead>
                      <TableHead className="text-xs">Tanggal</TableHead>
                      <TableHead className="text-xs">Pelanggaran</TableHead>
                      <TableHead className="text-center text-xs">Kategori</TableHead>
                      <TableHead className="text-center text-xs">Poin</TableHead>
                      <TableHead className="text-xs">Status Pembinaan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profile.violations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center text-slate-500">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                            <p className="text-xs font-semibold text-slate-800">
                              Tidak Ada Catatan Pelanggaran
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Siswa menjaga kedisiplinan dan tata tertib sekolah dengan sangat baik.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      profile.violations.map((v, i) => (
                        <TableRow
                          key={v.id}
                          className="transition-colors hover:bg-slate-50/70 border-b border-slate-100 last:border-0"
                        >
                          <TableCell className="text-center text-xs text-slate-500">
                            {i + 1}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-slate-600 whitespace-nowrap">
                            {formatShortDateId(v.tanggal)}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-semibold text-slate-800 block">
                              {v.namaPelanggaran}
                            </span>
                            {v.keterangan && (
                              <span className="block text-[11px] text-slate-500 italic mt-0.5">
                                &ldquo;{v.keterangan}&rdquo;
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] font-semibold ${
                                v.kategori === "Ringan"
                                  ? "bg-blue-50 text-blue-700"
                                  : v.kategori === "Sedang"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {v.kategori}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={`text-center font-bold font-mono text-xs ${
                              v.status === "Selesai Dibina"
                                ? "text-slate-400 line-through"
                                : "text-red-600"
                            }`}
                          >
                            +{v.poin}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                                v.status === "Selesai Dibina"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {v.status === "Selesai Dibina" ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Clock className="w-3 h-3 text-amber-600" />
                              )}
                              {v.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
