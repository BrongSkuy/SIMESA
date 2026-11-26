"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  Printer,
  Edit3,
  CheckCircle2,
  Search,
  Users,
  Loader2,
  Eye,
  RotateCcw,
  Filter,
  ArrowUpDown,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ReportCardPrintView,
  printReportCards,
} from "@/components/erapor/report-card-print-view";
import {
  EraporBulkPrintModal,
  EraporNoteModal,
  EraporPublishClassModal,
} from "@/components/erapor/erapor-modals";
import type {
  StudentReportCardData,
  ClassReportSummaryItem,
} from "@/lib/erapor";
import {
  DEFAULT_KKM_FALLBACK,
  getKkmAverageColorInfo,
} from "@/lib/erapor-utils";

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

interface KelasOption {
  id: string;
  namaKelas: string;
  tingkat: string;
  waliKelas?: string | null;
}

interface EraporManagementViewProps {
  portal?: "admin" | "guru";
}

export function EraporManagementView({
  portal = "guru",
}: EraporManagementViewProps) {
  const [kelasList, setKelasList] = useState<KelasOption[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string>("");
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [summaryData, setSummaryData] = useState<{
    kelas: string;
    waliKelas: string;
    periode: string;
    defaultKkm?: number;
    students: ClassReportSummaryItem[];
  } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Expanded Table Filters & Sort
  const [searchQuery, setSearchQuery] = useState("");
  const [ketuntasanFilter, setKetuntasanFilter] = useState<string>("all");
  const [statusRaporFilter, setStatusRaporFilter] = useState<string>("all");
  const [catatanFilter, setCatatanFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("nama_asc");

  // Single Print Preview Mode State
  const [activeReportData, setActiveReportData] =
    useState<StudentReportCardData | null>(null);
  const [loadingPrint, setLoadingPrint] = useState(false);

  // Modal Cetak Semua (Massal) State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkScope, setBulkScope] = useState<"current" | "selected" | "all">(
    "current"
  );
  const [bulkSelectedClasses, setBulkSelectedClasses] = useState<string[]>([]);
  const [bulkStatusRapor, setBulkStatusRapor] = useState<string>("all");
  const [bulkKetuntasan, setBulkKetuntasan] = useState<string>("all");
  const [bulkSortBy, setBulkSortBy] = useState<string>("nama_asc");
  const [loadingBulkPrint, setLoadingBulkPrint] = useState(false);

  // Modal Terbitkan Rapor Kelas State
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishingClass, setPublishingClass] = useState(false);

  // Modal Catatan Wali Kelas State
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [selectedStudentForNote, setSelectedStudentForNote] =
    useState<ClassReportSummaryItem | null>(null);
  const [noteForm, setNoteForm] = useState({
    catatanWaliKelas: "",
    ekskulNama: "",
    ekskulNilai: "",
    ekskulKeterangan: "",
    statusRapor: "Draf" as "Draf" | "Disahkan" | "Diterbitkan",
  });
  const [savingNote, setSavingNote] = useState(false);

  const activeDefaultKkm = summaryData?.defaultKkm ?? DEFAULT_KKM_FALLBACK;

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
            setBulkSelectedClasses([data[0].namaKelas]);
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
      const res = await fetch(
        `/api/erapor/class/${encodeURIComponent(kelasName)}`
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Gagal memuat rekap rapor kelas");
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

  const hasActiveFilter =
    Boolean(searchQuery.trim()) ||
    ketuntasanFilter !== "all" ||
    statusRaporFilter !== "all" ||
    catatanFilter !== "all" ||
    genderFilter !== "all" ||
    sortBy !== "nama_asc";

  const resetAllFilters = () => {
    setSearchQuery("");
    setKetuntasanFilter("all");
    setStatusRaporFilter("all");
    setCatatanFilter("all");
    setGenderFilter("all");
    setSortBy("nama_asc");
  };

  // Filter & Sort siswa
  const filteredStudents = useMemo(() => {
    if (!summaryData?.students) return [];
    const q = searchQuery.trim().toLowerCase();

    const filtered = summaryData.students.filter((s) => {
      const matchQuery =
        !q ||
        s.namaLengkap.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q);

      const matchKetuntasan =
        ketuntasanFilter === "all" || s.statusKetuntasan === ketuntasanFilter;

      const matchStatusRapor =
        statusRaporFilter === "all" || s.statusRapor === statusRaporFilter;

      const matchCatatan =
        catatanFilter === "all" ||
        (catatanFilter === "terisi" && s.hasCatatan) ||
        (catatanFilter === "belum" && !s.hasCatatan);

      const matchGender =
        genderFilter === "all" || s.jenisKelamin === genderFilter;

      return (
        matchQuery &&
        matchKetuntasan &&
        matchStatusRapor &&
        matchCatatan &&
        matchGender
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "rata_desc") {
        return (b.rataRata ?? -1) - (a.rataRata ?? -1);
      }
      if (sortBy === "rata_asc") {
        return (a.rataRata ?? 999) - (b.rataRata ?? 999);
      }
      if (sortBy === "nis_asc") {
        return a.nis.localeCompare(b.nis);
      }
      return a.namaLengkap.localeCompare(b.namaLengkap);
    });
  }, [
    summaryData,
    searchQuery,
    ketuntasanFilter,
    statusRaporFilter,
    catatanFilter,
    genderFilter,
    sortBy,
  ]);

  // Statistik Kelas
  const stats = useMemo(() => {
    const list = summaryData?.students || [];
    const total = list.length;
    const tuntas = list.filter(
      (s) => s.statusKetuntasan === "Semua Tuntas"
    ).length;
    const remidi = list.filter(
      (s) => s.statusKetuntasan === "Perlu Perbaikan"
    ).length;
    const disahkan = list.filter(
      (s) => s.statusRapor === "Disahkan" || s.statusRapor === "Diterbitkan"
    ).length;
    const diterbitkan = list.filter(
      (s) => s.statusRapor === "Diterbitkan"
    ).length;
    const siapTerbit = list.filter((s) => s.jumlahMapelTerisi > 0).length;
    const adaCatatan = list.filter((s) => s.hasCatatan).length;
    return { total, tuntas, remidi, disahkan, diterbitkan, siapTerbit, adaCatatan };
  }, [summaryData]);

  // Handler Terbitkan / Tarik Status Rapor Satu Kelas
  const handlePublishClass = async (targetStatus: "Diterbitkan" | "Draf") => {
    if (!selectedKelas) return;
    setPublishingClass(true);
    try {
      const res = await fetch("/api/erapor/publish-class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kelas: selectedKelas,
          targetStatus,
          periode: summaryData?.periode,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal memperbarui status rapor kelas");
      }
      toast.success(json.message);
      setPublishModalOpen(false);
      loadClassSummary(selectedKelas);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui status kelas"
      );
    } finally {
      setPublishingClass(false);
    }
  };

  // Handler Pratinjau / Cetak Rapor Satu Siswa
  const handlePreviewReport = async (studentId: string) => {
    setLoadingPrint(true);
    try {
      const res = await fetch(`/api/erapor/student/${studentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat rapor siswa");
      setActiveReportData(data);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memuat data cetak"
      );
    } finally {
      setLoadingPrint(false);
    }
  };

  // Handler Buka Modal Cetak Semua
  const openBulkPrintModal = () => {
    setBulkScope("current");
    setBulkSelectedClasses(selectedKelas ? [selectedKelas] : []);
    setBulkStatusRapor("all");
    setBulkKetuntasan("all");
    setBulkSortBy("nama_asc");
    setBulkModalOpen(true);
  };

  // Handler Eksekusi Cetak Massal
  const handleExecuteBulkPrint = async () => {
    let kelasParam = "all";
    if (bulkScope === "current") {
      if (!selectedKelas) {
        toast.error("Pilih kelas terlebih dahulu");
        return;
      }
      kelasParam = selectedKelas;
    } else if (bulkScope === "selected") {
      if (bulkSelectedClasses.length === 0) {
        toast.error("Pilih minimal satu kelas yang ingin dicetak");
        return;
      }
      kelasParam = bulkSelectedClasses.join(",");
    }

    setLoadingBulkPrint(true);
    try {
      const params = new URLSearchParams({
        kelas: kelasParam,
        statusRapor: bulkStatusRapor,
        ketuntasan: bulkKetuntasan,
        sortBy: bulkSortBy,
      });

      const res = await fetch(`/api/erapor/bulk?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menyiapkan dokumen cetak massal");
      }

      const reports: StudentReportCardData[] = Array.isArray(json.reports)
        ? json.reports
        : [];

      if (reports.length === 0) {
        toast.info(
          "Tidak ada data rapor siswa yang cocok dengan filter cetak yang dipilih."
        );
        return;
      }

      const titleLabel =
        bulkScope === "all"
          ? "E-Rapor Seluruh Kelas"
          : `E-Rapor Kelas ${kelasParam}`;

      toast.success(
        `Menyiapkan cetak massal untuk ${reports.length} lembar rapor A4...`
      );
      setBulkModalOpen(false);
      printReportCards(reports, titleLabel);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyiapkan cetak massal"
      );
    } finally {
      setLoadingBulkPrint(false);
    }
  };

  // Handler Buka Form Catatan Wali Kelas
  const handleOpenNoteModal = async (student: ClassReportSummaryItem) => {
    setSelectedStudentForNote(student);
    setNoteForm({
      catatanWaliKelas: "",
      ekskulNama: "",
      ekskulNilai: "",
      ekskulKeterangan: "",
      statusRapor: student.statusRapor || "Draf",
    });
    try {
      const params = new URLSearchParams({ studentId: student.studentId });
      if (summaryData?.periode) params.set("periode", summaryData.periode);
      const res = await fetch(`/api/erapor/notes?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        setNoteForm({
          catatanWaliKelas: json.data.catatanWaliKelas || "",
          ekskulNama: json.data.ekskulNama || "",
          ekskulNilai: json.data.ekskulNilai || "",
          ekskulKeterangan: json.data.ekskulKeterangan || "",
          statusRapor: json.data.statusRapor || student.statusRapor || "Draf",
        });
      }
    } catch {
      toast.error("Gagal memuat catatan siswa");
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

  return (
    <ModulePageShell
      title="Laporan Hasil Belajar Siswa (E-Rapor)"
      eyebrow={`Laporan Hasil Belajar | ${portal === "admin" ? "Portal Admin" : "Portal Guru"}`}
      description="Rekap nilai akhir, catatan wali kelas, dan pencetakan rapor resmi semester."
      icon={FileSpreadsheet}
      theme="emerald"
      tabsLabel="Pilih kelas E-Rapor"
      tabs={kelasList.map((c) => ({
        key: c.namaKelas,
        label: `Kelas ${c.namaKelas}`,
      }))}
      activeTab={selectedKelas}
      onTabChange={setSelectedKelas}
      stats={[
        {
          label: "Total Siswa",
          value: stats.total,
          sublabel: selectedKelas ? `Kelas ${selectedKelas}` : "Kelas terpilih",
          onClick: resetAllFilters,
          active: !hasActiveFilter,
        },
        {
          label: "Tuntas KKM",
          value: stats.tuntas,
          sublabel: `Standar KKM ${activeDefaultKkm}`,
          tone: "emerald",
          onClick: () => {
            setKetuntasanFilter("Semua Tuntas");
            setStatusRaporFilter("all");
          },
          active: ketuntasanFilter === "Semua Tuntas",
        },
        {
          label: "Perlu Perbaikan",
          value: stats.remidi,
          sublabel: "Nilai di bawah KKM",
          tone: stats.remidi > 0 ? "amber" : "default",
          onClick: () => {
            setKetuntasanFilter("Perlu Perbaikan");
            setStatusRaporFilter("all");
          },
          active: ketuntasanFilter === "Perlu Perbaikan",
        },
        {
          label: "Rapor Disahkan",
          value: `${stats.disahkan}/${stats.total}`,
          sublabel: `${stats.adaCatatan} siswa bercatatan`,
          tone: "blue",
          onClick: () => {
            setStatusRaporFilter("Disahkan");
            setKetuntasanFilter("all");
          },
          active: statusRaporFilter === "Disahkan",
        },
      ]}
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              if (filteredStudents.length > 0) {
                handlePreviewReport(filteredStudents[0].studentId);
              } else {
                toast.info("Belum ada data siswa untuk pratinjau rapor");
              }
            }}
            disabled={
              loadingPrint || !summaryData || filteredStudents.length === 0
            }
            className="inline-flex items-center gap-1.5 bg-white/[0.08] hover:bg-white/15 border border-white/20 rounded-xl px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {loadingPrint ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-300" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-emerald-300" />
            )}
            Pratinjau Contoh
          </button>

          <button
            type="button"
            onClick={openBulkPrintModal}
            disabled={loadingClasses || kelasList.length === 0}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 border border-blue-400/25 rounded-xl px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Massal
          </button>

          <button
            type="button"
            onClick={() => setPublishModalOpen(true)}
            disabled={!selectedKelas || loadingSummary || stats.total === 0}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/30 rounded-xl px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            Terbitkan Rapor
          </button>
        </>
      }
      afterSheet={
        <>
          {/* MODAL CETAK SEMUA (MASSAL) */}
          <EraporBulkPrintModal
            open={bulkModalOpen}
            onOpenChange={setBulkModalOpen}
            selectedKelas={selectedKelas}
            kelasList={kelasList}
            bulkScope={bulkScope}
            onBulkScopeChange={setBulkScope}
            bulkSelectedClasses={bulkSelectedClasses}
            onBulkSelectedClassesChange={setBulkSelectedClasses}
            bulkStatusRapor={bulkStatusRapor}
            onBulkStatusRaporChange={setBulkStatusRapor}
            bulkKetuntasan={bulkKetuntasan}
            onBulkKetuntasanChange={setBulkKetuntasan}
            bulkSortBy={bulkSortBy}
            onBulkSortByChange={setBulkSortBy}
            loadingBulkPrint={loadingBulkPrint}
            onExecuteBulkPrint={handleExecuteBulkPrint}
          />

          {/* MODAL TERBITKAN RAPOR KELAS */}
          <EraporPublishClassModal
            open={publishModalOpen}
            onOpenChange={setPublishModalOpen}
            selectedKelas={selectedKelas}
            stats={stats}
            publishingClass={publishingClass}
            onPublishClass={handlePublishClass}
          />

          {/* MODAL INPUT CATATAN WALI KELAS DAN EKSKUL */}
          <EraporNoteModal
            open={noteModalOpen}
            onOpenChange={setNoteModalOpen}
            selectedKelas={selectedKelas}
            selectedStudent={selectedStudentForNote}
            noteForm={noteForm}
            onNoteFormChange={setNoteForm}
            savingNote={savingNote}
            onSaveNote={handleSaveNote}
          />

          {/* MODAL PRATINJAU CETAK E-RAPOR INTERNAL (SERAGAM DENGAN SP DAN DISPENSASI) */}
          <Dialog
            open={Boolean(activeReportData)}
            onOpenChange={(open) => {
              if (!open) setActiveReportData(null);
            }}
          >
            <DialogContent
              showCloseButton={false}
              className="sm:max-w-5xl gap-0 p-0 overflow-hidden bg-slate-100 border border-slate-200"
            >
              <DialogTitle className="sr-only">
                Pratinjau E-Rapor Internal
              </DialogTitle>
              {activeReportData && (
                <ReportCardPrintView
                  data={activeReportData}
                  onBack={() => setActiveReportData(null)}
                  inModal
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      }
    >
      {/* Container Konten Utama di dalam White Sheet */}
      {kelasList.length === 0 ? (
        <div className="p-10 text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-400">
            <Users className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-slate-700">
            Belum Ada Data Kelas Terdaftar
          </p>
        </div>
      ) : (
        <div className="p-5 sm:p-6 space-y-4">
          <div className="space-y-3 pb-3 border-b border-slate-100">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                    Rekapitulasi Rapor Siswa Kelas {selectedKelas}
                  </CardTitle>
                  {summaryData && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-0.5 text-slate-600">
                      <span>Wali Kelas: <strong className="text-slate-900">{summaryData.waliKelas}</strong></span>
                      <span className="text-slate-300">|</span>
                      <strong className="text-emerald-700">{summaryData.periode.replace("-", " ")}</strong>
                    </span>
                  )}
                </div>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Menampilkan {filteredStudents.length} dari{" "}
                  {summaryData?.students.length || 0} siswa | Nilai akhir
                  dihitung dengan metode bagi rata murni
                </CardDescription>
              </div>

              {/* Legend Warna Penanda KKM (Opsi A - 3 Warna Dinamis) */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5">
                <span className="text-slate-500 font-semibold">
                  Penanda KKM ({activeDefaultKkm}):
                </span>
                <span className="inline-flex items-center gap-1 text-rose-600 ">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  &lt; {activeDefaultKkm}
                </span>
                <span className="inline-flex items-center gap-1 text-amber-600 ">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {activeDefaultKkm === 100
                    ? "100 (Batas)"
                    : `${activeDefaultKkm}–${Math.min(100, activeDefaultKkm + 4)} (Batas)`}
                </span>
                {activeDefaultKkm + 5 <= 100 && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 ">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    &ge; {activeDefaultKkm + 5}
                  </span>
                )}
              </div>
            </div>

            {/* Baris Parameter Filter Lengkap */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Cari nama siswa atau NIS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-white border-slate-200"
                />
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-400 ml-0.5">
                <Filter className="w-3.5 h-3.5" />
              </div>

              <Select
                value={ketuntasanFilter}
                onValueChange={(val) => {
                  if (val) setKetuntasanFilter(val);
                }}
              >
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue placeholder="Ketuntasan Nilai">
                    {(val) =>
                      !val || val === "all" ? "Semua Ketuntasan" : val
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Ketuntasan</SelectItem>
                  <SelectItem value="Semua Tuntas">Semua Tuntas</SelectItem>
                  <SelectItem value="Perlu Perbaikan">
                    Perlu Perbaikan
                  </SelectItem>
                  <SelectItem value="Belum Lengkap">Belum Lengkap</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusRaporFilter}
                onValueChange={(val) => {
                  if (val) setStatusRaporFilter(val);
                }}
              >
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue placeholder="Status Rapor">
                    {(val) =>
                      !val || val === "all" ? "Semua Status Rapor" : val
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status Rapor</SelectItem>
                  <SelectItem value="Draf">Draf</SelectItem>
                  <SelectItem value="Disahkan">Disahkan</SelectItem>
                  <SelectItem value="Diterbitkan">Diterbitkan</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={catatanFilter}
                onValueChange={(val) => {
                  if (val) setCatatanFilter(val);
                }}
              >
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Catatan Wali">
                    {(val) => {
                      if (val === "terisi") return "Catatan Terisi";
                      if (val === "belum") return "Belum Diisi";
                      return "Semua Catatan";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Catatan</SelectItem>
                  <SelectItem value="terisi">Catatan Terisi</SelectItem>
                  <SelectItem value="belum">Belum Diisi</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={genderFilter}
                onValueChange={(val) => {
                  if (val) setGenderFilter(val);
                }}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Jenis Kelamin">
                    {(val) => {
                      if (val === "L") return "Siswa (L)";
                      if (val === "P") return "Siswi (P)";
                      return "Semua Siswa";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Siswa</SelectItem>
                  <SelectItem value="L">Siswa (L)</SelectItem>
                  <SelectItem value="P">Siswi (P)</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sortBy}
                onValueChange={(val) => {
                  if (val) setSortBy(val);
                }}
              >
                <SelectTrigger className="w-44 h-8 text-xs">
                  <ArrowUpDown className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                  <SelectValue placeholder="Urutkan">
                    {(val) => {
                      if (val === "rata_desc") return "Rata-rata Tertinggi";
                      if (val === "rata_asc") return "Rata-rata Terendah";
                      if (val === "nis_asc") return "Nomor Induk (NIS)";
                      return "Nama (A ke Z)";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nama_asc">Nama (A ke Z)</SelectItem>
                  <SelectItem value="rata_desc">Rata-rata Tertinggi</SelectItem>
                  <SelectItem value="rata_asc">Rata-rata Terendah</SelectItem>
                  <SelectItem value="nis_asc">Nomor Induk (NIS)</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilter && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetAllFilters}
                  className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {loadingSummary ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-900" />
              <p className="text-xs text-slate-500">
                Memuat data nilai dan catatan kelas...
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-slate-700 ">
                Tidak ada data siswa
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Pilih kelas lain atau sesuaikan parameter filter pencarian.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75 ">
                    <TableHead className="pl-6 text-center w-12 whitespace-nowrap text-xs">
                      No
                    </TableHead>
                    <TableHead className="whitespace-nowrap w-28 text-xs">
                      NIS
                    </TableHead>
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
                  {filteredStudents.map((s, idx) => {
                    const avgColor = getKkmAverageColorInfo(
                      s.rataRata,
                      activeDefaultKkm
                    );
                    return (
                      <TableRow
                        key={`${s.studentId}-${idx}`}
                        className="group/row transition-all duration-200 hover:bg-slate-50/90 cursor-pointer border-b border-slate-100 last:border-0"
                      >
                        <TableCell className="pl-6 text-center font-mono text-xs text-slate-500 whitespace-nowrap">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                          {s.nis}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs border border-slate-200 shrink-0 transition-colors">
                              {getInitials(s.namaLengkap || "")}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 transition-colors block">
                                {s.namaLengkap}
                              </span>
                              <span className="text-[11px] text-slate-500 transition-colors">
                                {s.jenisKelamin === "L" ? "Siswa" : "Siswi"} | Hadir:{" "}
                                {s.presensi.hadir}, Sakit: {s.presensi.sakit}, Izin:{" "}
                                {s.presensi.izin}, Alfa: {s.presensi.alfa}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-sm tabular-nums whitespace-nowrap">
                          {s.rataRata !== null ? (
                            <span
                              className={avgColor.textClass}
                              title={`${avgColor.label} (KKM ${activeDefaultKkm})`}
                            >
                              {s.rataRata.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs font-medium text-slate-700 whitespace-nowrap tabular-nums">
                          {s.jumlahMapelTerisi} dari {s.totalMapel} Mapel
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors ${
                              s.statusKetuntasan === "Semua Tuntas"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : s.statusKetuntasan === "Perlu Perbaikan"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {s.statusKetuntasan}
                          </span>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {s.hasCatatan ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Terisi
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              Belum Diisi
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                              s.statusRapor === "Disahkan" ||
                              s.statusRapor === "Diterbitkan"
                                ? "bg-blue-50 text-[#1e3a8a] border-blue-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
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
                              className="h-7 px-2 text-xs gap-1"
                              title="Input Catatan Wali Kelas dan Ekstrakurikuler"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-blue-500 " />
                              Catatan
                            </Button>
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handlePreviewReport(s.studentId)}
                              disabled={loadingPrint}
                              className="h-7 px-2 text-xs gap-1"
                              title="Pratinjau dan Cetak Rapor"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500 " />
                              Rapor
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </ModulePageShell>
  );
}
