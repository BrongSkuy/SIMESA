"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  Printer,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Settings,
  Search,
  Users,
  GraduationCap,
  Loader2,
  Save,
  BookOpen,
  X,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ReportCardPrintView } from "@/components/erapor/report-card-print-view";
import { StudentReportCardData, ClassReportSummaryItem } from "@/lib/erapor";

interface KelasOption {
  id: string;
  namaKelas: string;
  tingkat: string;
  waliKelas?: string | null;
}

interface CurriculumItem {
  id: string;
  mapel: string;
  kkm: number;
  tingkat: string;
  capaianKompetensi?: string | null;
}

export default function GuruEraporPage() {
  const [kelasList, setKelasList] = useState<KelasOption[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string>("");
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [summaryData, setSummaryData] = useState<{
    kelas: string;
    waliKelas: string;
    periode: string;
    students: ClassReportSummaryItem[];
  } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Print Mode State
  const [activeReportData, setActiveReportData] = useState<StudentReportCardData | null>(null);
  const [loadingPrint, setLoadingPrint] = useState(false);

  // Modal Catatan Wali Kelas State
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [selectedStudentForNote, setSelectedStudentForNote] = useState<ClassReportSummaryItem | null>(null);
  const [noteForm, setNoteForm] = useState({
    catatanWaliKelas: "",
    ekskulNama: "Pramuka Dirgantara",
    ekskulNilai: "Sangat Baik",
    ekskulKeterangan: "Aktif mengikuti latihan rutin dan kegiatan kedisiplinan taruna.",
    statusRapor: "Draf" as "Draf" | "Disahkan" | "Diterbitkan",
  });
  const [savingNote, setSavingNote] = useState(false);

  // Modal Pengaturan Target KKM State
  const [kkmModalOpen, setKkmModalOpen] = useState(false);
  const [curriculumList, setCurriculumList] = useState<CurriculumItem[]>([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [editingKkm, setEditingKkm] = useState<{ mapel: string; kkm: number; capaian: string }>({
    mapel: "",
    kkm: 75,
    capaian: "",
  });
  const [savingKkm, setSavingKkm] = useState(false);

  // 1. Muat daftar kelas saat mount
  useEffect(() => {
    let cancelled = false;
    fetch("/api/classes")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data)) {
          setKelasList(data);
          if (data.length > 0) {
            setSelectedKelas(data[0].namaKelas);
          }
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Gagal memuat daftar kelas");
      })
      .finally(() => {
        if (!cancelled) setLoadingClasses(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Muat ringkasan rapor kelas setiap kali selectedKelas berubah
  const loadClassSummary = async (kelasName: string) => {
    if (!kelasName) return;
    setLoadingSummary(true);
    try {
      const res = await fetch(`/api/erapor/class/${encodeURIComponent(kelasName)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat rekap rapor kelas");
      setSummaryData(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (selectedKelas) {
      loadClassSummary(selectedKelas);
    }
  }, [selectedKelas]);

  // Filter siswa
  const filteredStudents = useMemo(() => {
    if (!summaryData?.students) return [];
    return summaryData.students.filter((s) => {
      const matchQuery =
        !searchQuery ||
        s.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nis.includes(searchQuery);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "tuntas" && s.statusKetuntasan === "Semua Tuntas") ||
        (statusFilter === "remidi" && s.statusKetuntasan === "Perlu Perbaikan") ||
        (statusFilter === "disahkan" && s.statusRapor === "Disahkan");

      return matchQuery && matchStatus;
    });
  }, [summaryData, searchQuery, statusFilter]);

  // Statistik Kelas
  const stats = useMemo(() => {
    const list = summaryData?.students || [];
    const total = list.length;
    const tuntas = list.filter((s) => s.statusKetuntasan === "Semua Tuntas").length;
    const remidi = list.filter((s) => s.statusKetuntasan === "Perlu Perbaikan").length;
    const disahkan = list.filter((s) => s.statusRapor === "Disahkan" || s.statusRapor === "Diterbitkan").length;
    const adaCatatan = list.filter((s) => s.hasCatatan).length;
    return { total, tuntas, remidi, disahkan, adaCatatan };
  }, [summaryData]);

  // Handler Pratinjau / Cetak Rapor Siswa
  const handlePreviewReport = async (studentId: string) => {
    setLoadingPrint(true);
    try {
      const res = await fetch(`/api/erapor/student/${studentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat rapor siswa");
      setActiveReportData(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat data cetak");
    } finally {
      setLoadingPrint(false);
    }
  };

  // Handler Buka Form Catatan Wali Kelas
  const handleOpenNoteModal = async (student: ClassReportSummaryItem) => {
    setSelectedStudentForNote(student);
    try {
      const res = await fetch(`/api/erapor/notes?studentId=${student.studentId}`);
      const json = await res.json();
      if (json.data) {
        setNoteForm({
          catatanWaliKelas: json.data.catatanWaliKelas || "",
          ekskulNama: json.data.ekskulNama || "Pramuka Dirgantara",
          ekskulNilai: json.data.ekskulNilai || "Sangat Baik",
          ekskulKeterangan: json.data.ekskulKeterangan || "",
          statusRapor: json.data.statusRapor || "Draf",
        });
      } else {
        setNoteForm({
          catatanWaliKelas:
            "Pertahankan kedisiplinan dan semangat belajar taruna/taruni. Terus tingkatkan prestasi akademik dan keterampilan kejuruan.",
          ekskulNama: "Pramuka Dirgantara",
          ekskulNilai: "Sangat Baik",
          ekskulKeterangan: "Aktif mengikuti kegiatan pembinaan kedisiplinan.",
          statusRapor: student.statusRapor || "Draf",
        });
      }
    } catch {
      // Default
    }
    setNoteModalOpen(true);
  };

  // Handler Simpan Catatan Wali Kelas
  const handleSaveNote = async () => {
    if (!selectedStudentForNote) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/erapor/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentForNote.studentId,
          periode: summaryData?.periode,
          catatanWaliKelas: noteForm.catatanWaliKelas,
          ekskulNama: noteForm.ekskulNama,
          ekskulNilai: noteForm.ekskulNilai,
          ekskulKeterangan: noteForm.ekskulKeterangan,
          statusRapor: noteForm.statusRapor,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan catatan");

      toast.success(json.message || "Catatan rapor berhasil disimpan");
      setNoteModalOpen(false);
      if (selectedKelas) {
        loadClassSummary(selectedKelas);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSavingNote(false);
    }
  };

  // Handler Buka Modal Kurikulum KKM
  const handleOpenKkmModal = async () => {
    setKkmModalOpen(true);
    setLoadingCurriculum(true);
    try {
      const res = await fetch("/api/academic/curriculum");
      const json = await res.json();
      if (Array.isArray(json.data)) {
        setCurriculumList(json.data);
      }
    } catch {
      toast.error("Gagal memuat kurikulum");
    } finally {
      setLoadingCurriculum(false);
    }
  };

  // Handler Simpan KKM
  const handleSaveKkm = async () => {
    if (!editingKkm.mapel) {
      toast.error("Pilih mata pelajaran");
      return;
    }
    setSavingKkm(true);
    try {
      const res = await fetch("/api/academic/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapel: editingKkm.mapel,
          kkm: editingKkm.kkm,
          capaianKompetensi: editingKkm.capaian,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan target KKM");

      toast.success(json.message);
      // Refresh list
      const updated = await fetch("/api/academic/curriculum").then((r) => r.json());
      if (Array.isArray(updated.data)) setCurriculumList(updated.data);
      if (selectedKelas) loadClassSummary(selectedKelas);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSavingKkm(false);
    }
  };

  // Jika sedang membuka pratinjau cetak rapor seorang siswa:
  if (activeReportData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
        <ReportCardPrintView
          data={activeReportData}
          onBack={() => setActiveReportData(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Manajemen E-Rapor Internal"
        description="Rekapitulasi capaian nilai akhir bagi rata, catatan wali kelas, dan pencetakan dokumen hasil belajar siswa"
      />

      {/* FILTER & SELECTOR KELAS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-card border rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-56">
            <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Pilih Kelas Binaan:
            </Label>
            <Select
              value={selectedKelas}
              onValueChange={(val) => {
                if (val) setSelectedKelas(val);
              }}
              disabled={loadingClasses}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih Kelas" />
              </SelectTrigger>
              <SelectContent>
                {kelasList.map((k) => (
                  <SelectItem key={k.id} value={k.namaKelas}>
                    Kelas {k.namaKelas} {k.waliKelas ? `— ${k.waliKelas}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {summaryData && (
            <div className="border-l pl-3 ml-1 hidden md:block">
              <p className="text-xs font-semibold text-foreground">
                Wali Kelas: <span className="text-primary font-bold">{summaryData.waliKelas}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Periode: {summaryData.periode.replace("-", " ")}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenKkmModal}
            className="gap-2 text-xs"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
            Target KKM Mapel
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => {
              if (filteredStudents.length > 0) {
                handlePreviewReport(filteredStudents[0].studentId);
              } else {
                toast.info("Tidak ada siswa yang dipilih");
              }
            }}
            disabled={loadingPrint || !summaryData || filteredStudents.length === 0}
            className="gap-2 text-xs"
          >
            {loadingPrint ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            Cetak Contoh Rapor
          </Button>
        </div>
      </div>

      {/* STATISTIK KELAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Total Siswa</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground mt-1">
            {stats.total}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Taruna/taruni aktif
          </p>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Tuntas KKM</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {stats.tuntas}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Semua mapel $\ge 75$
          </p>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Perlu Perbaikan</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {stats.remidi}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Ada nilai di bawah 75
          </p>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Rapor Disahkan</span>
            <GraduationCap className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {stats.disahkan} <span className="text-xs font-normal text-muted-foreground">/ {stats.total}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {stats.adaCatatan} siswa ber-catatan
          </p>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau NIS siswa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              if (val) setStatusFilter(val);
            }}
          >
            <SelectTrigger className="w-40 text-xs">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="tuntas">Semua Tuntas</SelectItem>
              <SelectItem value="remidi">Perlu Perbaikan</SelectItem>
              <SelectItem value="disahkan">Sudah Disahkan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TABEL SISWA */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-sm">
              Rekapitulasi Rapor Siswa Kelas {selectedKelas}
            </h3>
            <p className="text-xs text-muted-foreground">
              Nilai akhir dihitung otomatis dengan metode bagi rata murni seluruh komponen
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {filteredStudents.length} siswa ditemukan
          </span>
        </div>

        {loadingSummary ? (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs">Memuat data nilai dan catatan kelas...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Tidak ada data siswa</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pilih kelas lain atau sesuaikan kata kunci pencarian.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-3 py-3 text-center w-10">No</th>
                  <th className="px-3 py-3 w-28">NIS</th>
                  <th className="px-4 py-3">Nama Lengkap</th>
                  <th className="px-3 py-3 text-center w-28">Rata-rata</th>
                  <th className="px-3 py-3 text-center w-32">Mapel Terisi</th>
                  <th className="px-3 py-3 text-center w-32">Status Nilai</th>
                  <th className="px-3 py-3 text-center w-32">Catatan Wali</th>
                  <th className="px-3 py-3 text-center w-28">Status Rapor</th>
                  <th className="px-4 py-3 text-right w-44">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStudents.map((s, idx) => (
                  <tr key={s.studentId} className="hover:bg-muted/40 transition-colors">
                    <td className="px-3 py-3 text-center font-medium text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-3 font-mono font-medium text-foreground">
                      {s.nis}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{s.namaLengkap}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {s.jenisKelamin === "L" ? "Taruna" : "Taruni"} • H:{s.presensi.hadir} S:{s.presensi.sakit} I:{s.presensi.izin} A:{s.presensi.alfa}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-bold">
                      {s.rataRata !== null ? (
                        <span
                          className={
                            s.rataRata >= 90
                              ? "text-emerald-600"
                              : s.rataRata >= 80
                              ? "text-blue-600"
                              : s.rataRata >= 75
                              ? "text-amber-600"
                              : "text-red-600"
                          }
                        >
                          {s.rataRata.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-medium text-foreground">
                      {s.jumlahMapelTerisi} / {s.totalMapel} Mapel
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          s.statusKetuntasan === "Semua Tuntas"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : s.statusKetuntasan === "Perlu Perbaikan"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {s.statusKetuntasan}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {s.hasCatatan ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Terisi
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          Belum Diisi
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          s.statusRapor === "Disahkan" || s.statusRapor === "Diterbitkan"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {s.statusRapor}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenNoteModal(s)}
                          className="h-8 px-2 text-xs gap-1"
                          title="Input Catatan Wali Kelas & Ekskul"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                          Catatan
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewReport(s.studentId)}
                          disabled={loadingPrint}
                          className="h-8 px-2 text-xs gap-1"
                          title="Pratinjau & Cetak Rapor"
                        >
                          <Printer className="w-3.5 h-3.5 text-zinc-600" />
                          Rapor
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL INPUT CATATAN WALI KELAS & EKSKUL */}
      <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Catatan Wali Kelas & Ekstrakurikuler</DialogTitle>
            <DialogDescription>
              {selectedStudentForNote
                ? `${selectedStudentForNote.namaLengkap} (${selectedStudentForNote.nis}) — Kelas ${selectedKelas}`
                : "Pengisian catatan evaluasi siswa"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Catatan Perkembangan Karakter & Kedisiplinan:
              </Label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Tuliskan catatan motivasi, kedisiplinan, dan perkembangan sikap taruna/taruni..."
                value={noteForm.catatanWaliKelas}
                onChange={(e) =>
                  setNoteForm({ ...noteForm, catatanWaliKelas: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Nama Kegiatan Ekstrakurikuler:
                </Label>
                <Input
                  className="text-xs"
                  placeholder="Misal: Pramuka Dirgantara"
                  value={noteForm.ekskulNama}
                  onChange={(e) =>
                    setNoteForm({ ...noteForm, ekskulNama: e.target.value })
                  }
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Predikat Nilai Ekskul:
                </Label>
                <Select
                  value={noteForm.ekskulNilai}
                  onValueChange={(val) => {
                    if (val) setNoteForm({ ...noteForm, ekskulNilai: val });
                  }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Pilih Nilai" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sangat Baik">Sangat Baik (A)</SelectItem>
                    <SelectItem value="Baik">Baik (B)</SelectItem>
                    <SelectItem value="Cukup">Cukup (C)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Keterangan Capaian Ekskul:
              </Label>
              <Input
                className="text-xs"
                placeholder="Misal: Aktif dalam kegiatan baris-berbaris dan upacara bendera."
                value={noteForm.ekskulKeterangan}
                onChange={(e) =>
                  setNoteForm({ ...noteForm, ekskulKeterangan: e.target.value })
                }
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Status Pengesahan Rapor Siswa:
              </Label>
              <Select
                value={noteForm.statusRapor}
                onValueChange={(val) => {
                  if (val) {
                    setNoteForm({
                      ...noteForm,
                      statusRapor: val as "Draf" | "Disahkan" | "Diterbitkan",
                    });
                  }
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draf">Draf (Masih Dapat Diubah)</SelectItem>
                  <SelectItem value="Disahkan">Disahkan Wali Kelas</SelectItem>
                  <SelectItem value="Diterbitkan">Diterbitkan (Resmi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNoteModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSaveNote}
              disabled={savingNote}
              className="gap-2"
            >
              {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Simpan Catatan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL PENGATURAN TARGET KKM */}
      <Dialog open={kkmModalOpen} onOpenChange={setKkmModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Pengaturan Target KKM Mata Pelajaran</DialogTitle>
            <DialogDescription>
              Kriteria Ketuntasan Minimal standar sekolah (default: 75) dan narasi materi kurikulum
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Form Input KKM */}
            <div className="bg-muted/40 p-3 rounded-lg border space-y-3">
              <h4 className="font-semibold text-foreground text-xs">
                Perbarui / Tambah Target KKM Mapel:
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label className="text-[11px] mb-1 block">Nama Mata Pelajaran</Label>
                  <Input
                    className="text-xs"
                    placeholder="Contoh: Matematika"
                    value={editingKkm.mapel}
                    onChange={(e) =>
                      setEditingKkm({ ...editingKkm, mapel: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label className="text-[11px] mb-1 block">KKM (0-100)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="text-xs"
                    value={editingKkm.kkm}
                    onChange={(e) =>
                      setEditingKkm({ ...editingKkm, kkm: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] mb-1 block">
                  Template Materi Capaian Kompetensi (Opsional)
                </Label>
                <Input
                  className="text-xs"
                  placeholder="Contoh: aljabar linier, trigonometri, dan kalkulus terapan"
                  value={editingKkm.capaian}
                  onChange={(e) =>
                    setEditingKkm({ ...editingKkm, capaian: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveKkm}
                  disabled={savingKkm}
                  className="gap-1.5 text-xs h-8"
                >
                  {savingKkm ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Simpan KKM
                </Button>
              </div>
            </div>

            {/* List KKM Terdaftar */}
            <div>
              <h4 className="font-semibold text-foreground text-xs mb-2">
                Daftar KKM Mata Pelajaran Terdaftar:
              </h4>
              {loadingCurriculum ? (
                <div className="py-6 text-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
                  <p className="text-xs">Memuat data kurikulum...</p>
                </div>
              ) : curriculumList.length === 0 ? (
                <p className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded">
                  Belum ada KKM khusus yang disimpan. Seluruh mata pelajaran menggunakan default standar sekolah (KKM = 75).
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                  {curriculumList.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 flex items-center justify-between hover:bg-muted/50 cursor-pointer"
                      onClick={() =>
                        setEditingKkm({
                          mapel: item.mapel,
                          kkm: item.kkm,
                          capaian: item.capaianKompetensi || "",
                        })
                      }
                    >
                      <div>
                        <div className="font-semibold text-foreground">{item.mapel}</div>
                        {item.capaianKompetensi && (
                          <div className="text-[10px] text-muted-foreground line-clamp-1">
                            {item.capaianKompetensi}
                          </div>
                        )}
                      </div>
                      <span className="font-mono font-bold text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        KKM {item.kkm}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setKkmModalOpen(false)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
