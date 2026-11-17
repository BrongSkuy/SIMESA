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
} from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "S"
  );
}
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardDescription, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface EraporManagementViewProps {
  portal?: "admin" | "guru";
}

export function EraporManagementView({ portal = "guru" }: EraporManagementViewProps) {
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
    ekskulKeterangan: "Aktif mengikuti latihan rutin dan kegiatan kedisiplinan siswa.",
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
    const disahkan = list.filter(
      (s) => s.statusRapor === "Disahkan" || s.statusRapor === "Diterbitkan"
    ).length;
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
            "Pertahankan kedisiplinan dan semangat belajar siswa atau siswi. Terus tingkatkan prestasi akademik dan keterampilan kejuruan.",
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

  const badgeText = portal === "admin" ? "Portal Admin" : "Portal Guru";

  return (
    <div className="space-y-6">
      {/* 1. Header Cockpit Banner Menyatu - Persis Beranda Dashboard & Konseling BK */}
      <section className="relative overflow-hidden -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10 pt-7 pb-8 bg-gradient-to-b from-[#091424] via-[#0d1e38] to-[#0a1526] border-b border-white/10 text-white shadow-xs">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-44 bg-blue-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Header Title, Subtitle & Action Pills */}
          <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto pb-8 space-y-3.5">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">
                Laporan Hasil Belajar Siswa (E-Rapor)
              </h1>
              <p className="text-xs sm:text-sm text-blue-200/75 max-w-2xl leading-relaxed">
                Rekapitulasi capaian nilai akhir bagi rata murni, catatan wali kelas, dan pencetakan dokumen rapor resmi
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleOpenKkmModal}
                className="inline-flex items-center bg-white/[0.06] hover:bg-white/10 active:bg-white/15 border border-white/15 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 mr-2 text-blue-300" />
                Target KKM Mapel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (filteredStudents.length > 0) {
                    handlePreviewReport(filteredStudents[0].studentId);
                  } else {
                    toast.info("Pilih siswa terlebih dahulu");
                  }
                }}
                disabled={loadingPrint || !summaryData || filteredStudents.length === 0}
                className="inline-flex items-center bg-blue-600 hover:bg-blue-500 active:bg-blue-700 border border-blue-400/40 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all cursor-pointer disabled:opacity-50"
              >
                {loadingPrint ? (
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-blue-100" />
                ) : (
                  <Printer className="w-3.5 h-3.5 mr-2 text-blue-100" />
                )}
                Pratinjau Contoh Rapor
              </button>
            </div>
          </div>

          {/* 4 Kartu Metrik Utama - Sleek Semi-Transparent Glass Cards (Persis Dashboard & Konseling) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-blue-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(37,99,235,0.15)] transition-all duration-200 cursor-pointer shadow-xs"
              title="TOTAL SISWA"
              value={stats.total}
              icon={Users}
              color="blue"
              footerLeft="Siswa atau Siswi Aktif"
              footerRight="Kelas Terpilih"
            />
            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-emerald-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-200 cursor-pointer shadow-xs"
              title="TUNTAS KKM"
              value={stats.tuntas}
              icon={CheckCircle2}
              color="emerald"
              footerLeft="Semua Mapel ≥ KKM"
              footerRight="KKM Tercapai"
            />
            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-amber-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(251,191,36,0.15)] transition-all duration-200 cursor-pointer shadow-xs"
              title="PERLU PERBAIKAN"
              value={stats.remidi}
              icon={AlertCircle}
              color="amber"
              footerLeft="Nilai di Bawah Target"
              footerRight="Perlu Remidi"
            />
            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-blue-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all duration-200 cursor-pointer shadow-xs"
              title="RAPOR DISAHKAN"
              value={`${stats.disahkan} dari ${stats.total}`}
              icon={GraduationCap}
              color="blue"
              footerLeft={`${stats.adaCatatan} Siswa Ber-catatan`}
              footerRight="Status Terverifikasi"
            />
          </div>
        </div>
      </section>

      {/* 2. Container Konten Utama */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Class Selection & Homeroom Info */}
        {kelasList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-10 text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Belum Ada Data Kelas Terdaftar
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 shrink-0">
                Pilih Kelas:
              </span>
              {kelasList.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedKelas(c.namaKelas)}
                  className={`px-3 py-1.5 text-xs rounded-full font-semibold transition-all cursor-pointer ${
                    selectedKelas === c.namaKelas
                      ? "bg-[#1F4E78] text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  Kelas {c.namaKelas}
                </button>
              ))}
            </div>

            {summaryData && (
              <div className="flex items-center gap-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 shadow-xs shrink-0">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Wali Kelas:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {summaryData.waliKelas}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">Periode:</span>
                <span className="font-semibold text-blue-700 dark:text-blue-400">
                  {summaryData.periode.replace("-", " ")}
                </span>
              </div>
            )}
          </div>
        )}

      {/* 3. DETAIL MATRIKS RAPOR SISWA TABLE (Standard SIMESA styling) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Rekapitulasi Rapor Siswa Kelas {selectedKelas}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Nilai akhir dihitung otomatis dengan metode bagi rata murni seluruh komponen
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari nama atau NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(val) => {
                if (val) setStatusFilter(val);
              }}
            >
              <SelectTrigger className="w-36 h-8 text-xs">
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

        {loadingSummary ? (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-900" />
            <p className="text-xs text-slate-500">Memuat data nilai dan catatan kelas...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tidak ada data siswa</p>
            <p className="text-xs text-slate-500 mt-1">
              Pilih kelas lain atau sesuaikan kata kunci pencarian.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/75 dark:bg-slate-800/50">
                  <TableHead className="pl-6 text-center w-12 whitespace-nowrap text-xs">
                    No
                  </TableHead>
                  <TableHead className="whitespace-nowrap w-28 text-xs">NIS</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[220px] text-xs">
                    Nama Siswa
                  </TableHead>
                  <TableHead className="text-center whitespace-nowrap w-28 text-xs">
                    Rata-rata
                  </TableHead>
                  <TableHead className="text-center whitespace-nowrap w-32 text-xs">
                    Mapel Terisi
                  </TableHead>
                  <TableHead className="text-center whitespace-nowrap w-32 text-xs">
                    Status Nilai
                  </TableHead>
                  <TableHead className="text-center whitespace-nowrap w-32 text-xs">
                    Catatan Wali
                  </TableHead>
                  <TableHead className="text-center whitespace-nowrap w-28 text-xs">
                    Status Rapor
                  </TableHead>
                  <TableHead className="text-right pr-6 whitespace-nowrap w-36 text-xs">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((s, idx) => (
                  <TableRow
                    key={`${s.studentId}-${idx}`}
                    className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <TableCell className="pl-6 text-center font-mono text-xs text-slate-500 group-hover/row:text-slate-400 whitespace-nowrap">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover/row:text-slate-200 tabular-nums whitespace-nowrap">
                      {s.nis}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 group-hover/row:bg-slate-800 text-slate-700 group-hover/row:text-slate-200 font-semibold flex items-center justify-center text-xs border border-slate-200 dark:border-slate-700 group-hover/row:border-slate-700 shrink-0 transition-colors">
                          {getInitials(s.namaLengkap || "")}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover/row:text-white transition-colors block">
                            {s.namaLengkap}
                          </span>
                          <span className="text-[11px] text-slate-500 group-hover/row:text-slate-400 transition-colors">
                            {s.jenisKelamin === "L" ? "Siswa" : "Siswi"} • Hadir: {s.presensi.hadir} • Sakit: {s.presensi.sakit} • Izin: {s.presensi.izin} • Alfa: {s.presensi.alfa}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-sm tabular-nums whitespace-nowrap">
                      {s.rataRata !== null ? (
                        <span
                          className={
                            s.rataRata >= 90
                              ? "text-emerald-600 group-hover/row:text-emerald-300"
                              : s.rataRata >= 80
                              ? "text-blue-600 group-hover/row:text-blue-300"
                              : s.rataRata >= 75
                              ? "text-amber-600 group-hover/row:text-amber-300"
                              : "text-rose-600 group-hover/row:text-rose-300"
                          }
                        >
                          {s.rataRata.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs font-medium text-slate-700 dark:text-slate-300 group-hover/row:text-slate-200 whitespace-nowrap tabular-nums">
                      {s.jumlahMapelTerisi} dari {s.totalMapel} Mapel
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                          s.statusKetuntasan === "Semua Tuntas"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 group-hover/row:bg-emerald-500/15 group-hover/row:text-emerald-300 group-hover/row:border-emerald-500/30"
                            : s.statusKetuntasan === "Perlu Perbaikan"
                            ? "bg-amber-50 text-amber-700 border-amber-200 group-hover/row:bg-amber-500/15 group-hover/row:text-amber-300 group-hover/row:border-amber-500/30"
                            : "bg-slate-100 text-slate-700 border-slate-200 group-hover/row:bg-slate-800 group-hover/row:text-slate-300 group-hover/row:border-slate-700"
                        }`}
                      >
                        {s.statusKetuntasan}
                      </span>
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {s.hasCatatan ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 group-hover/row:text-emerald-300 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Terisi
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 group-hover/row:text-slate-400 italic">
                          Belum Diisi
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                          s.statusRapor === "Disahkan" || s.statusRapor === "Diterbitkan"
                            ? "bg-blue-50 text-[#1e3a8a] border-blue-200 group-hover/row:bg-blue-500/15 group-hover/row:text-blue-300 group-hover/row:border-blue-500/30"
                            : "bg-slate-100 text-slate-700 border-slate-200 group-hover/row:bg-slate-800 group-hover/row:text-slate-300 group-hover/row:border-slate-700"
                        }`}
                      >
                        {s.statusRapor}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleOpenNoteModal(s)}
                          className="h-7 px-2 text-xs gap-1 group-hover/row:text-blue-300 group-hover/row:hover:bg-blue-900/50"
                          title="Input Catatan Wali Kelas dan Ekstrakurikuler"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-500 group-hover/row:text-blue-300" />
                          Catatan
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handlePreviewReport(s.studentId)}
                          disabled={loadingPrint}
                          className="h-7 px-2 text-xs gap-1 group-hover/row:bg-blue-900/40 group-hover/row:border-blue-500/40 group-hover/row:text-white"
                          title="Pratinjau dan Cetak Rapor"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500 group-hover/row:text-slate-300" />
                          Rapor
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>

      {/* MODAL INPUT CATATAN WALI KELAS DAN EKSKUL */}
      <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Catatan Wali Kelas dan Ekstrakurikuler</DialogTitle>
            <DialogDescription>
              {selectedStudentForNote
                ? `${selectedStudentForNote.namaLengkap} (${selectedStudentForNote.nis}) — Kelas ${selectedKelas}`
                : "Pengisian catatan evaluasi siswa"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Catatan Perkembangan Karakter dan Kedisiplinan:
              </Label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Tuliskan catatan motivasi, kedisiplinan, dan perkembangan sikap siswa atau siswi..."
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
              {savingNote ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
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
                Perbarui atau Tambah Target KKM Mapel:
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
                  {savingKkm ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
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

