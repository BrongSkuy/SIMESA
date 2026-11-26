"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HeartHandshake,
  FileText,
  Printer,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  User,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  DispensationLetterItem,
  CounselingSessionItem,
  StudentMonitoringLogItem,
  formatTanggalIndonesia,
  formatRentangWaktu,
  COUNSELING_CATEGORIES,
  CounselingCategory,
} from "@/lib/counseling";
import { DispensationPrintModal } from "./dispensation-print-modal";
import { cn } from "@/lib/utils";

function getLocalIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface StudentCounselingProfileData {
  student: {
    id: string;
    namaLengkap: string;
    nis: string;
    kelas: string;
  };
  sessions: CounselingSessionItem[];
  logs?: StudentMonitoringLogItem[];
  dispensations: DispensationLetterItem[];
}

export function StudentCounselingView() {
  const [loading, setLoading] = useState(true);
  const [headerBgLoaded, setHeaderBgLoaded] = useState(true);
  const [profile, setProfile] = useState<StudentCounselingProfileData | null>(null);

  // Print modal state
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedDispensation, setSelectedDispensation] = useState<DispensationLetterItem | null>(null);

  // Permohonan Konseling Mandiri form state
  const [submitting, setSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [kategori, setKategori] = useState<CounselingCategory>("Karir dan Masa Depan");
  const [tanggal, setTanggal] = useState(getLocalIsoDate);
  const [waktu, setWaktu] = useState("10:00");
  const [pokokMasalah, setPokokMasalah] = useState("");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/counseling/student/me", {
        cache: "no-store",
      });
      if (res.ok) {
        setProfile(await res.json());
      }
    } catch (err) {
      console.error("Error fetching student counseling profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handlePrint = (disp: DispensationLetterItem) => {
    setSelectedDispensation(disp);
    setPrintModalOpen(true);
  };

  const handleRequestCounseling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.student) return;

    setSubmitting(true);
    setRequestSuccess(false);
    setRequestError(null);

    try {
      const res = await fetch("/api/counseling/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: profile.student.id,
          tanggal,
          waktuMulai: waktu,
          waktuSelesai: "Selesai",
          kategori,
          jenisLayanan: "Konseling Perorangan",
          tingkatKerahasiaan: "Umum",
          pokokMasalah: `[Permohonan Mandiri Siswa] ${pokokMasalah}`,
          statusKasus: "Dalam Pemantauan",
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal mengirimkan permohonan");
      }

      setRequestSuccess(true);
      setPokokMasalah("");
      toast.success("Permohonan konseling berhasil dikirim ke Guru BK");
      await fetchProfile();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Gagal mengirimkan permohonan bimbingan";
      setRequestError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const allDispensations = profile?.dispensations || [];
  const activeDispensations = allDispensations.filter(
    (d) => d.statusDispensasi === "Aktif"
  );
  const featuredDispensation = activeDispensations[0] || allDispensations[0] || null;
  const sessionList = profile?.sessions || [];
  const monitoringList = profile?.logs || [];

  const counselorName =
    sessionList[0]?.counselorName ||
    featuredDispensation?.issuerName ||
    "Tim Guru BK Sekolah";

  return (
    <div className="space-y-6 pb-8">
      {/* 1. HEADER BANNER PORTAL SISWA (Deep Navy-Teal + Foto Tunggal Tenang) */}
      <section className="relative overflow-hidden -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10 pt-7 pb-8 bg-[#081a24] border-b border-teal-400/15 text-white shadow-xs">
        {headerBgLoaded && (
          <Image
            src="/bg-konseling-bk.jpg"
            alt=""
            fill
            sizes="100vw"
            unoptimized
            priority
            className="object-cover object-right opacity-35 mix-blend-luminosity filter contrast-125 brightness-95 pointer-events-none select-none"
            onError={() => setHeaderBgLoaded(false)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#081a24] via-[#0c2937]/85 to-[#0f3443]/45 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#081a24]/50 via-transparent to-[#091c26]/92 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 border border-teal-300/25 text-teal-200">
              <HeartHandshake className="w-3 h-3 text-teal-300" />
              Portal Siswa
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Bimbingan Konseling dan Layanan Siswa
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/80 max-w-xl">
              Ruang aman pendampingan akademik, eksplorasi masa depan karir, dan akses surat izin dispensasi kelas
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
            <Loader2 className="w-7 h-7 animate-spin text-teal-700" />
            <p className="text-xs text-slate-500">Memuat layanan bimbingan konseling...</p>
          </div>
        ) : !profile ? (
          <div className="p-8 text-center text-xs text-slate-500 rounded-2xl border border-slate-200 bg-white">
            Data profil layanan konseling siswa belum ditemukan.
          </div>
        ) : (
          <>
            {/* 2. ALTERNATIF BK-4: 2 KARTU UTAMA BERDAMPINGAN (Dispensasi Aktif + Ruang Aman BK) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Kartu Kiri: Kartu Izin Dispensasi Aktif */}
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#09242e] via-[#0e4552] to-[#12665c] border border-teal-400/25 text-white shadow-md p-5 sm:p-6 flex flex-col justify-between gap-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-200" />
                      <h2 className="text-base font-bold tracking-tight text-white">
                        Kartu Izin Dispensasi Aktif
                      </h2>
                    </div>
                    {featuredDispensation && featuredDispensation.statusDispensasi === "Aktif" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-300/35 whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3" />
                        Aktif | Sah
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-teal-100 border border-white/15 whitespace-nowrap">
                        {featuredDispensation ? featuredDispensation.statusDispensasi : "Tidak Ada Izin"}
                      </span>
                    )}
                  </div>

                  {featuredDispensation ? (
                    <div className="space-y-2.5 pt-2 border-t border-white/15 text-xs">
                      <p className="font-mono text-sm font-bold text-teal-100 tracking-wide">
                        {featuredDispensation.nomorSurat}
                      </p>
                      <div className="space-y-1.5 text-teal-50/90">
                        <p className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-teal-200 shrink-0" />
                          <span>
                            {profile.student.namaLengkap} | Kelas {profile.student.kelas}
                          </span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-teal-200 shrink-0" />
                          <span>
                            {formatTanggalIndonesia(featuredDispensation.tanggal)} |{" "}
                            {formatRentangWaktu(
                              featuredDispensation.jamMulai,
                              featuredDispensation.jamSelesai
                            )}
                          </span>
                        </p>
                        <p className="flex items-center gap-2">
                          <HeartHandshake className="w-3.5 h-3.5 text-teal-200 shrink-0" />
                          <span className="font-semibold text-white">
                            {featuredDispensation.keperluan}
                          </span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-5 text-xs text-teal-100/80 border-t border-white/15 leading-relaxed">
                      Anda tidak memiliki surat izin dispensasi kelas yang aktif saat ini. Surat izin resmi yang diterbitkan Guru BK akan muncul di kartu ini agar mudah ditunjukkan ke guru mata pelajaran.
                    </div>
                  )}
                </div>

                {featuredDispensation ? (
                  <Button
                    type="button"
                    onClick={() => handlePrint(featuredDispensation)}
                    className="w-full bg-white hover:bg-teal-50 text-[#09242e] font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Tampilkan Surat Dispensasi
                  </Button>
                ) : (
                  <div className="text-[11px] text-teal-200/80 bg-white/10 rounded-xl px-3.5 py-2.5 border border-white/10">
                    Butuh izin konseling pada jam pelajaran? Ajukan jadwal melalui formulir di bawah ini.
                  </div>
                )}
              </div>

              {/* Kartu Kanan: Ruang Aman BK */}
              <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-br from-[#fffdf8] via-[#f6fbf9] to-[#edf7f4] p-5 sm:p-6 shadow-xs flex flex-col justify-between gap-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100/90 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Ruang Aman BK
                      </h2>
                      <p className="text-xs text-slate-500">
                        {profile.student.namaLengkap} | NIS {profile.student.nis}
                      </p>
                    </div>
                  </div>

                  {/* 2 Mini Metric Tiles */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white border border-teal-100 p-3.5 text-center shadow-2xs">
                      <p className="text-2xl font-extrabold font-mono text-slate-900 tabular-nums">
                        {sessionList.length}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                        Sesi Bimbingan
                      </p>
                    </div>
                    <div className="rounded-xl bg-white border border-teal-100 p-3.5 text-center shadow-2xs">
                      <p className="text-2xl font-extrabold font-mono text-teal-800 tabular-nums">
                        {monitoringList.length}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                        Catatan Pantauan
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700">
                    Guru BK Pendamping:{" "}
                    <strong className="text-slate-900">{counselorName}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-200/80 px-3.5 py-2.5 text-[11px] text-slate-600">
                  <Lock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>
                    Catatan konseling pribadi Anda dijaga aman dan bersifat rahasia sesuai kode etik BK.
                  </span>
                </div>
              </div>
            </div>

            {/* 3. FORMULIR PERMOHONAN MANDIRI + RIWAYAT SESI & DISPENSASI */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Kiri (5 cols): Formulir Permohonan Bimbingan Konseling Mandiri */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs self-start">
                <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900">
                    <Send className="w-4 h-4 text-teal-600" />
                    Ajukan Permohonan Bimbingan
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ingin berkonsultasi mengenai karir, penjurusan, atau kesulitan belajar? Ajukan jadwal dengan Guru BK.
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  {requestSuccess && (
                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        Permohonan bimbingan berhasil dikirim. Guru BK akan menghubungi Anda sesuai jadwal.
                      </span>
                    </div>
                  )}

                  {requestError && (
                    <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{requestError}</span>
                    </div>
                  )}

                  <form onSubmit={handleRequestCounseling} className="space-y-3.5 text-xs">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Pilih Topik Bimbingan</Label>
                      <Select
                        value={kategori}
                        onValueChange={(val) => {
                          if (val) setKategori(val as CounselingCategory);
                        }}
                      >
                        <SelectTrigger className="w-full text-xs cursor-pointer">
                          <SelectValue>
                            {(val) => val || "Pilih topik bimbingan..."}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {COUNSELING_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat} className="text-xs">
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Rencana Tanggal</Label>
                        <Input
                          type="date"
                          value={tanggal}
                          onChange={(e) => setTanggal(e.target.value)}
                          required
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Pilihan Jam Temu</Label>
                        <Input
                          type="time"
                          value={waktu}
                          onChange={(e) => setWaktu(e.target.value)}
                          required
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Hal yang Ingin Dikonsultasikan</Label>
                      <textarea
                        className="w-full min-h-[84px] p-2.5 rounded-lg border border-input bg-background focus:ring-2 focus:ring-teal-500/40 focus:outline-none text-xs"
                        placeholder="Ceritakan secara singkat hal yang ingin Anda bicarakan bersama Guru BK..."
                        value={pokokMasalah}
                        onChange={(e) => setPokokMasalah(e.target.value)}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold gap-1.5 h-9 rounded-xl cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Mengirim Permohonan...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Kirim Permohonan Konseling
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </div>

              {/* Kanan (7 cols): Riwayat Sesi & Arsip Surat Dispensasi */}
              <div className="lg:col-span-7 space-y-5">
                {/* Riwayat Sesi & Pembinaan */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                  <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900">
                        <HeartHandshake className="w-4 h-4 text-teal-600" />
                        Riwayat Sesi dan Pembinaan
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Daftar sesi bimbingan umum yang pernah diikuti bersama Guru BK
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {sessionList.length} sesi
                    </span>
                  </div>
                  <div className="p-4 sm:p-5">
                    {sessionList.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500">
                        <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-teal-600" />
                        Belum ada riwayat sesi bimbingan yang tercatat.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {sessionList.map((item) => (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-xl border border-slate-200/80 bg-white text-xs space-y-1.5 transition-colors hover:bg-slate-50/90 hover:border-slate-300"
                          >
                            <div className="flex flex-wrap justify-between items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {item.kategori}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                                  Umum
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] font-semibold",
                                    item.statusKasus === "Selesai"
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      : item.statusKasus === "Rujukan Kasus"
                                      ? "bg-purple-50 text-purple-800 border-purple-200"
                                      : "bg-amber-50 text-amber-800 border-amber-200"
                                  )}
                                >
                                  {item.statusKasus}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-slate-500 text-[11px] font-mono">
                              {formatTanggalIndonesia(item.tanggal)} | Pukul {item.waktuMulai} - {item.waktuSelesai} | {item.counselorName}
                            </p>
                            <p className="text-slate-800 line-clamp-2">
                              {item.pokokMasalah}
                            </p>
                            {item.tindakLanjut && (
                              <p className="text-slate-500 italic text-[11px]">
                                Tindak lanjut: {item.tindakLanjut}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Daftar Semua Surat Dispensasi Siswa (bila lebih dari 1 atau arsip) */}
                {allDispensations.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                    <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900">
                        <FileText className="w-4 h-4 text-teal-600" />
                        Arsip Surat Dispensasi Anda
                      </h3>
                      <span className="text-[11px] font-mono text-slate-500">
                        {allDispensations.length} surat
                      </span>
                    </div>
                    <div className="p-4 sm:p-5 space-y-2.5">
                      {allDispensations.map((disp) => (
                        <div
                          key={disp.id}
                          className="p-3.5 rounded-xl border border-slate-200/80 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors hover:bg-slate-50/90 hover:border-slate-300"
                        >
                          <div className="space-y-1 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-teal-900">
                                {disp.nomorSurat}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-semibold",
                                  disp.statusDispensasi === "Aktif"
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : disp.statusDispensasi === "Selesai"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                )}
                              >
                                {disp.statusDispensasi}
                              </Badge>
                            </div>
                            <p className="font-semibold text-slate-900">
                              {disp.keperluan}
                            </p>
                            <p className="text-slate-500 text-[11px]">
                              {formatTanggalIndonesia(disp.tanggal)} |{" "}
                              {formatRentangWaktu(disp.jamMulai, disp.jamSelesai)}
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(disp)}
                            className="h-8 px-3 text-xs gap-1.5 shrink-0 bg-blue-50/70 text-[#1F4E78] border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Lihat Surat
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Cetak Lembar Dispensasi */}
      <DispensationPrintModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        data={selectedDispensation}
      />
    </div>
  );
}
