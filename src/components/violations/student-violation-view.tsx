"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Award, Clock, CheckCircle2, Loader2 } from "lucide-react";

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

  useEffect(() => {
    async function fetchMyDiscipline() {
      try {
        const resDiscipline = await fetch("/api/violations/student/me");
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catatan Kedisiplinan Siswa"
        description="Transparansi buku poin tata tertib dan riwayat evaluasi pembinaan karakter"
        badge="Portal Siswa & Orang Tua"
        icon={profile?.totalPoints === 0 ? ShieldCheck : ShieldAlert}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1F4E78]" />
            Memuat data catatan kedisiplinan Anda...
          </div>
        ) : !profile ? (
          <div className="p-8 text-center text-xs text-slate-500 rounded-xl border border-slate-200 bg-white">
            Data profil siswa belum ditemukan.
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <StatCard
                title="Akumulasi Poin"
                value={`${profile.totalPoints} Poin`}
                subtitle={profile.totalPoints === 0 ? "Disiplin Bersih" : "Batas SP 1: 50 Poin"}
                icon={profile.totalPoints === 0 ? Award : ShieldAlert}
                color={profile.totalPoints === 0 ? "emerald" : profile.totalPoints < 30 ? "blue" : "rose"}
              />
              <StatCard
                title="Status Kedisiplinan"
                value={profile.tier.status}
                subtitle={profile.tier.actionRequired}
                icon={ShieldCheck}
                color="navy"
              />
              <StatCard
                title="Catatan Pelanggaran"
                value={profile.violations.length}
                subtitle={`${profile.breakdown.selesaiDibina} kasus selesai dibina`}
                icon={Clock}
                color="slate"
              />
            </div>

            {/* Riwayat Pelanggaran */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 ">
                <h3 className="text-sm font-bold text-slate-900 ">
                  Riwayat Catatan Pelanggaran Tata Tertib
                </h3>
                <p className="text-xs text-slate-500 ">
                  Daftar kejadian yang dicatat oleh guru piket, wali kelas, atau guru bimbingan konseling
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75 ">
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
                          <p className="text-xs font-semibold text-slate-800 ">
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
                      <TableRow key={v.id} className="hover:bg-slate-50/50 ">
                        <TableCell className="text-center text-xs text-slate-500">{i + 1}</TableCell>
                        <TableCell className="text-xs font-mono text-slate-600 ">
                          {v.tanggal}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="font-semibold text-slate-800 ">
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
                        <TableCell className="text-center font-bold text-red-600 text-xs">
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
          </>
        )}
      </div>
    </div>
  );
}

