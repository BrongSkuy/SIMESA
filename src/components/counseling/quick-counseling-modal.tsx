"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  UserCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  COUNSELING_CATEGORIES,
  COUNSELING_SERVICES,
  MONITORING_ASPECTS,
  DISPENSATION_REASONS,
  getKerahasiaanOptionLabel,
  CounselingCategory,
  CounselingService,
  ConfidentialityLevel,
  MonitoringAspect,
  DispensationReason,
} from "@/lib/counseling";

function getLocalIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface StudentOption {
  id: string;
  namaLengkap: string;
  nis: string;
  kelas: string;
}

interface QuickCounselingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "counseling" | "monitoring" | "dispensation";
  studentsList: StudentOption[];
  defaultStudentId?: string;
  onSuccess: () => void;
}

export function QuickCounselingModal({
  open,
  onOpenChange,
  mode,
  studentsList,
  defaultStudentId,
  onSuccess,
}: QuickCounselingModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [tanggal, setTanggal] = useState(getLocalIsoDate);
  const [waktuMulai, setWaktuMulai] = useState("09:00");
  const [waktuSelesai, setWaktuSelesai] = useState("09:45");
  const [kategori, setKategori] = useState<CounselingCategory>("Akademik dan Belajar");
  const [jenisLayanan, setJenisLayanan] = useState<CounselingService>("Konseling Perorangan");
  const [tingkatKerahasiaan, setTingkatKerahasiaan] = useState<ConfidentialityLevel>("Umum");
  const [pokokMasalah, setPokokMasalah] = useState("");
  const [pendekatanKonseling, setPendekatanKonseling] = useState("");
  const [hasilKonseling, setHasilKonseling] = useState("");
  const [tindakLanjut, setTindakLanjut] = useState("");
  const [createDispensation, setCreateDispensation] = useState(false);

  // Monitoring log states
  const [aspekPengamatan, setAspekPengamatan] = useState<MonitoringAspect>("Kedisiplinan dan Sikap");
  const [catatanPerkembangan, setCatatanPerkembangan] = useState("");
  const [rekomendasi, setRekomendasi] = useState("");

  // Dispensasi states
  const [keperluan, setKeperluan] = useState<DispensationReason>("Bimbingan Konseling");
  const [keteranganDispensasi, setKeteranganDispensasi] = useState("");

  // Reset form when opened or mode changed
  useEffect(() => {
    if (open) {
      setErrorMessage(null);
      setTanggal(getLocalIsoDate());
      setSelectedStudentId(defaultStudentId || "");
      if (mode === "counseling") {
        setPokokMasalah("");
        setPendekatanKonseling("");
        setHasilKonseling("");
        setTindakLanjut("");
        setCreateDispensation(false);
      } else if (mode === "monitoring") {
        setCatatanPerkembangan("");
        setRekomendasi("");
      } else if (mode === "dispensation") {
        setKeteranganDispensasi("");
      }
    }
  }, [open, mode, defaultStudentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedStudentId) {
      setErrorMessage("Silakan pilih siswa terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "counseling") {
        if (!pokokMasalah.trim()) {
          setErrorMessage("Pokok masalah yang dibahas wajib diisi.");
          setSubmitting(false);
          return;
        }

        const res = await fetch("/api/counseling/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: selectedStudentId,
            tanggal,
            waktuMulai,
            waktuSelesai,
            kategori,
            jenisLayanan,
            tingkatKerahasiaan,
            pokokMasalah,
            pendekatanKonseling,
            hasilKonseling,
            tindakLanjut,
            createDispensation,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Gagal mencatat sesi konseling");
        }
        toast.success(
          createDispensation
            ? "Sesi konseling dicatat dan surat dispensasi otomatis diterbitkan"
            : "Sesi bimbingan konseling berhasil disimpan"
        );
      } else if (mode === "monitoring") {
        if (!catatanPerkembangan.trim()) {
          setErrorMessage("Catatan perkembangan perilaku siswa wajib diisi.");
          setSubmitting(false);
          return;
        }

        const res = await fetch("/api/counseling/monitoring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: selectedStudentId,
            tanggal,
            aspekPengamatan,
            catatanPerkembangan,
            rekomendasi,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Gagal menyimpan catatan pemantauan");
        }
        toast.success("Catatan pantauan karakter siswa berhasil disimpan");
      } else if (mode === "dispensation") {
        const res = await fetch("/api/counseling/dispensation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: selectedStudentId,
            tanggal,
            jamMulai: waktuMulai,
            jamSelesai: waktuSelesai,
            keperluan,
            keterangan: keteranganDispensasi,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Gagal menerbitkan surat dispensasi");
        }
        toast.success("Surat dispensasi kelas resmi berhasil diterbitkan");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Terjadi kesalahan sistem saat menyimpan data.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 bg-white dark:bg-slate-900">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            {mode === "counseling" && (
              <>
                <HeartHandshake className="w-5 h-5 text-teal-600" />
                Catat Sesi Bimbingan Konseling Baru
              </>
            )}
            {mode === "monitoring" && (
              <>
                <UserCheck className="w-5 h-5 text-teal-600" />
                Tambah Catatan Pemantauan Karakter Siswa
              </>
            )}
            {mode === "dispensation" && (
              <>
                <FileText className="w-5 h-5 text-emerald-600" />
                Terbitkan Surat Dispensasi Kelas
              </>
            )}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === "counseling" &&
              "Data bimbingan tersimpan aman dan terkelola sesuai asas kerahasiaan BK sekolah."}
            {mode === "monitoring" &&
              "Catatan pemantauan berkala untuk mengamati perkembangan kepribadian siswa."}
            {mode === "dispensation" &&
              "Surat resmi izin meninggalkan ruang kelas agar absensi siswa tetap terverifikasi sah."}
          </p>
        </DialogHeader>

        {errorMessage && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 p-3 rounded-md text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* Kolom 1: Siswa */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Pilih Siswa yang Bersangkutan <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={selectedStudentId}
              onValueChange={(val) => {
                if (val) setSelectedStudentId(val);
              }}
            >
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Pilih nama siswa atau nomor induk siswa...">
                  {(val) => {
                    if (!val) return "Pilih nama siswa atau nomor induk siswa...";
                    const student = studentsList.find((s) => s.id === val);
                    return student
                      ? `${student.namaLengkap} • NIS ${student.nis} • Kelas ${student.kelas}`
                      : "Pilih nama siswa atau nomor induk siswa...";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {studentsList.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.namaLengkap} • NIS {s.nis} • Kelas {s.kelas}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Pilih siswa dari daftar untuk menghubungkan riwayat pembinaan secara terpadu.
            </p>
          </div>

          {/* Kolom Waktu & Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Tanggal Pelaksanaan <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
              />
            </div>
            {mode !== "monitoring" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Jam Mulai <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="time"
                    value={waktuMulai}
                    onChange={(e) => setWaktuMulai(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Jam Selesai <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="time"
                    value={waktuSelesai}
                    onChange={(e) => setWaktuSelesai(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
          </div>

          {/* FORM KHUSUS SESI KONSELING */}
          {mode === "counseling" && (
            <>
              {/* Kategori Bimbingan */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  Kategori Masalah Bimbingan <span className="text-rose-500">*</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {COUNSELING_CATEGORIES.map((cat) => (
                    <label
                      key={cat}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition text-xs ${
                        kategori === cat
                          ? "border-teal-600 bg-teal-50/80 dark:bg-teal-950/40 font-semibold text-teal-900 dark:text-teal-200"
                          : "border-border hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <input
                        type="radio"
                        name="counseling-category"
                        checked={kategori === cat}
                        onChange={() => setKategori(cat)}
                        className="accent-teal-600"
                      />
                      <span>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Jenis Layanan & Kerahasiaan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Bentuk Layanan Bimbingan <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={jenisLayanan}
                    onValueChange={(val) => {
                      if (val) setJenisLayanan(val as CounselingService);
                    }}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue>
                        {(val) => val || "Pilih bentuk layanan..."}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {COUNSELING_SERVICES.map((srv) => (
                        <SelectItem key={srv} value={srv} className="text-xs">
                          {srv}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Sifat Kerahasiaan Catatan <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={tingkatKerahasiaan}
                    onValueChange={(val) => {
                      if (val) setTingkatKerahasiaan(val as ConfidentialityLevel);
                    }}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue>
                        {(val) => getKerahasiaanOptionLabel(val)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Umum" className="text-xs">
                        Umum (Wali kelas dapat ikut membaca catatan)
                      </SelectItem>
                      <SelectItem value="Rahasia" className="text-xs">
                        Rahasia (Khusus Guru BK dan Kepala Sekolah)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pokok Masalah */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Pokok Masalah yang Dibahas <span className="text-rose-500">*</span>
                </Label>
                <textarea
                  className="w-full min-h-[70px] p-2.5 text-xs rounded-md border border-input bg-background focus:ring-2 focus:ring-teal-500/40 focus:outline-none"
                  placeholder="Contoh: Siswa merasa kesulitan konsentrasi belajar mandiri dan memiliki kecemasan menjelang ujian kejuruan..."
                  value={pokokMasalah}
                  onChange={(e) => setPokokMasalah(e.target.value)}
                  required
                />
              </div>

              {/* Pendekatan & Solusi */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Solusi dan Pendekatan Konseling
                </Label>
                <textarea
                  className="w-full min-h-[60px] p-2.5 text-xs rounded-md border border-input bg-background focus:ring-2 focus:ring-teal-500/40 focus:outline-none"
                  placeholder="Contoh: Memberikan bimbingan manajemen waktu dan teknik relaksasi belajar terarah..."
                  value={pendekatanKonseling}
                  onChange={(e) => setPendekatanKonseling(e.target.value)}
                />
              </div>

              {/* Rencana Tindak Lanjut */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Rencana Tindak Lanjut
                </Label>
                <textarea
                  className="w-full min-h-[50px] p-2.5 text-xs rounded-md border border-input bg-background focus:ring-2 focus:ring-teal-500/40 focus:outline-none"
                  placeholder="Contoh: Evaluasi sesi kedua dijadwalkan hari Selasa pekan depan jam istirahat pertama..."
                  value={tindakLanjut}
                  onChange={(e) => setTindakLanjut(e.target.value)}
                />
              </div>

              {/* Checkbox Dispensasi Otomatis */}
              <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-900/50 rounded-lg">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createDispensation}
                    onChange={(e) => setCreateDispensation(e.target.checked)}
                    className="mt-0.5 rounded accent-teal-600"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-foreground">
                      Terbitkan Surat Dispensasi Kelas Otomatis
                    </span>
                    <p className="text-muted-foreground mt-0.5">
                      Centang opsi ini jika sesi konseling dilaksanakan pada jam kegiatan belajar mengajar (KBM) agar siswa tidak tercatat meninggalkan kelas tanpa izin.
                    </p>
                  </div>
                </label>
              </div>
            </>
          )}

          {/* FORM KHUSUS LOG PEMANTAUAN SISWA */}
          {mode === "monitoring" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Aspek Pengamatan Karakter <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={aspekPengamatan}
                  onValueChange={(val) => {
                    if (val) setAspekPengamatan(val as MonitoringAspect);
                  }}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue>
                      {(val) => val || "Pilih aspek pengamatan..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {MONITORING_ASPECTS.map((asp) => (
                      <SelectItem key={asp} value={asp} className="text-xs">
                        {asp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Catatan Pengamatan Perkembangan <span className="text-rose-500">*</span>
                </Label>
                <textarea
                  className="w-full min-h-[80px] p-2.5 text-xs rounded-md border border-input bg-background focus:ring-2 focus:ring-teal-500/40 focus:outline-none"
                  placeholder="Tuliskan catatan konkret terkait kemajuan atau perubahan perilaku siswa saat di lingkungan sekolah..."
                  value={catatanPerkembangan}
                  onChange={(e) => setCatatanPerkembangan(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Rekomendasi Pembinaan atau Tindakan
                </Label>
                <textarea
                  className="w-full min-h-[60px] p-2.5 text-xs rounded-md border border-input bg-background focus:ring-2 focus:ring-teal-500/40 focus:outline-none"
                  placeholder="Contoh: Berikan apresiasi positif atas kedisiplinan dan tugaskan pendampingan teman sebaya..."
                  value={rekomendasi}
                  onChange={(e) => setRekomendasi(e.target.value)}
                />
              </div>
            </>
          )}

          {/* FORM KHUSUS DISPENSASI KELAS */}
          {mode === "dispensation" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Keperluan Izin Meninggalkan Kelas <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={keperluan}
                  onValueChange={(val) => {
                    if (val) setKeperluan(val as DispensationReason);
                  }}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue>
                      {(val) => val || "Pilih keperluan izin..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DISPENSATION_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason} className="text-xs">
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Keterangan Tambahan Keperluan Izin
                </Label>
                <textarea
                  className="w-full min-h-[70px] p-2.5 text-xs rounded-md border border-input bg-background focus:ring-2 focus:ring-teal-500/40 focus:outline-none"
                  placeholder="Contoh: Beristirahat sementara di ruang UKS karena mengalami pusing saat praktikum kejuruan..."
                  value={keteranganDispensasi}
                  onChange={(e) => setKeteranganDispensasi(e.target.value)}
                />
              </div>
            </>
          )}

          <DialogFooter className="border-t pt-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="cursor-pointer"
            >
              Batalkan
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-teal-700 hover:bg-teal-800 text-white min-w-[120px] cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Data"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
