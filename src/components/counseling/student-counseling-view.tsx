"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  Calendar,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  DispensationLetterItem,
  CounselingSessionItem,
  formatTanggalIndonesia,
  formatRentangWaktu,
  getDispensasiStatusBadge,
  getStatusKasusBadge,
  COUNSELING_CATEGORIES,
  CounselingCategory,
} from "@/lib/counseling";
import { DispensationPrintModal } from "./dispensation-print-modal";

interface StudentCounselingProfileData {
  student: {
    id: string;
    namaLengkap: string;
    nis: string;
    kelas: string;
  };
  sessions: CounselingSessionItem[];
  dispensations: DispensationLetterItem[];
}

export function StudentCounselingView() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentCounselingProfileData | null>(null);

  // Print modal state
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedDispensation, setSelectedDispensation] = useState<DispensationLetterItem | null>(null);

  // Permohonan Konseling Mandiri form state
  const [submitting, setSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [kategori, setKategori] = useState<CounselingCategory>("Karir dan Masa Depan");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [waktu, setWaktu] = useState("10:00");
  const [pokokMasalah, setPokokMasalah] = useState("");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      // Ambil user session untuk identifikasi student id
      const sessionRes = await fetch("/api/auth/get-session");
      if (!sessionRes.ok) return;
      const sessionData = await sessionRes.json();
      const user = sessionData?.user;

      // Cari data siswa berdasarkan user id
      const studentsRes = await fetch("/api/students");
      if (!studentsRes.ok) return;
      const studentsData = await studentsRes.json();
      const allStudents = Array.isArray(studentsData) ? studentsData : studentsData.data || [];
      const currentStudent = allStudents.find(
        (s: { userId?: string; nis?: string }) => s.userId === user?.id || s.nis === user?.username
      );

      if (currentStudent) {
        const res = await fetch(`/api/counseling/student/${currentStudent.id}`);
        if (res.ok) {
          setProfile(await res.json());
        }
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
      fetchProfile();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setRequestError(err.message);
      } else {
        setRequestError("Gagal mengirimkan permohonan bimbingan");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
        <p className="text-xs text-muted-foreground">Memuat layanan bimbingan konseling...</p>
      </div>
    );
  }

  const activeDispensations = profile?.dispensations || [];
  const sessionList = profile?.sessions || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Layanan Bimbingan Konseling Siswa"
        description="Portal pendampingan akademik, eksplorasi masa depan karir, dan akses surat izin dispensasi kelas Anda"
        icon={HeartHandshake}
      />

      {/* Bagian 1: Surat Dispensasi Kelas */}
      <Card className="border shadow-xs">
        <CardHeader className="border-b bg-muted/30 pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <FileText className="w-4 h-4 text-blue-600" />
            Surat Dispensasi Izin Meninggalkan Kelas
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Tunjukkan surat dispensasi ini kepada Bapak dan Ibu Guru mata pelajaran sebagai bukti izin resmi yang sah.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          {activeDispensations.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-600 opacity-50" />
              Anda tidak memiliki surat izin dispensasi kelas yang tercatat saat ini.
            </div>
          ) : (
            <div className="space-y-3">
              {activeDispensations.map((disp) => {
                const statusBadge = getDispensasiStatusBadge(disp.statusDispensasi);

                return (
                  <div
                    key={disp.id}
                    className="p-3.5 rounded-lg border bg-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-blue-300 transition"
                  >
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-950 dark:text-blue-200">
                          {disp.nomorSurat}
                        </span>
                        <Badge variant="outline" className={`text-[10px] ${statusBadge.badgeClass}`}>
                          {statusBadge.label}
                        </Badge>
                      </div>
                      <p className="font-semibold text-foreground">{disp.keperluan}</p>
                      <p className="text-muted-foreground">
                        {formatTanggalIndonesia(disp.tanggal)} • {formatRentangWaktu(disp.jamMulai, disp.jamSelesai)}
                      </p>
                      {disp.keterangan && (
                        <p className="text-muted-foreground italic text-[11px]">{disp.keterangan}</p>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrint(disp)}
                      className="text-xs gap-1.5 shrink-0 border-blue-200 text-blue-900 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-200"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Lihat Lembar Dispensasi
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bagian 2: Formulir Permohonan Bimbingan Konseling Mandiri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border shadow-xs">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Send className="w-4 h-4 text-amber-600" />
              Ajukan Permohonan Bimbingan Konseling
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Ingin berkonsultasi mengenai karir, penjurusan, atau kesulitan belajar? Ajukan jadwal bimbingan dengan Guru BK.
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            {requestSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Permohonan bimbingan berhasil dikirim. Guru BK akan menghubungi Anda sesuai jadwal.</span>
              </div>
            )}

            {requestError && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-md text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{requestError}</span>
              </div>
            )}

            <form onSubmit={handleRequestCounseling} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Pilih Topik Bimbingan</Label>
                <Select value={kategori} onValueChange={(val) => { if (val) setKategori(val as CounselingCategory); }}>
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNSELING_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
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
                  className="w-full min-h-[80px] p-2.5 rounded-md border border-input bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                  placeholder="Ceritakan secara singkat hal yang ingin Anda bicarakan bersama Guru BK..."
                  value={pokokMasalah}
                  onChange={(e) => setPokokMasalah(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white text-xs gap-1.5"
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
          </CardContent>
        </Card>

        {/* Bagian 3: Riwayat Pertemuan Bimbingan Konseling */}
        <Card className="border shadow-xs">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <HeartHandshake className="w-4 h-4 text-emerald-600" />
              Riwayat Pertemuan Bimbingan
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Daftar sesi bimbingan yang pernah Anda ikuti bersama Guru Pembimbing BK sekolah.
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            {sessionList.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-600" />
                Belum ada riwayat sesi bimbingan yang tercatat.
              </div>
            ) : (
              <div className="space-y-3">
                {sessionList.map((item) => {
                  const statusBadge = getStatusKasusBadge(item.statusKasus);

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border bg-card text-xs space-y-1.5 hover:border-border/80 transition"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground">{item.kategori}</span>
                        <Badge variant="outline" className={`text-[10px] ${statusBadge.badgeClass}`}>
                          {statusBadge.label}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        {formatTanggalIndonesia(item.tanggal)} • Pukul {item.waktuMulai} - {item.waktuSelesai}
                      </p>
                      <p className="text-foreground line-clamp-2">{item.pokokMasalah}</p>
                      {item.tindakLanjut && (
                        <p className="text-muted-foreground italic text-[11px]">
                          Tindak lanjut: {item.tindakLanjut}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
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
