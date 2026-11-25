"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  Printer,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Search,
  Users,
  GraduationCap,
  Loader2,
  Save,
  Eye,
  RotateCcw,
  Filter,
  ArrowUpDown,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
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
import {
  ReportCardPrintView,
  printReportCards,
} from "@/components/erapor/report-card-print-view";
import type {
  StudentReportCardData,
  ClassReportSummaryItem,
} from "@/lib/erapor";
import {
  DEFAULT_KKM_FALLBACK,
  getKkmAverageColorInfo,
} from "@/lib/erapor-utils";
import { cn } from "@/lib/utils";

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

  // Jika sedang membuka pratinjau cetak rapor seorang siswa:
  if (activeReportData) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <ReportCardPrintView
          data={activeReportData}
          onBack={() => setActiveReportData(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Hasil Belajar Siswa (E-Rapor)"
        badge={portal === "admin" ? "Portal Admin" : "Portal Guru"}
        description="Rekap nilai akhir, catatan wali kelas, dan pencetakan rapor resmi semester"
        icon={FileSpreadsheet}
      >
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
          className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
        >
          {loadingPrint ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1e3a8a]" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-[#1e3a8a]" />
          )}
          Pratinjau Contoh
        </button>

        <button
          type="button"
          onClick={openBulkPrintModal}
          disabled={loadingClasses || kelasList.length === 0}
          className="inline-flex items-center gap-1.5 bg-[#1e3a8a] hover:bg-[#172554] rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <Printer className="w-3.5 h-3.5" />
          Cetak Massal
        </button>

        <button
          type="button"
          onClick={() => setPublishModalOpen(true)}
          disabled={!selectedKelas || loadingSummary || stats.total === 0}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          Terbitkan Rapor
        </button>
      </PageHeader>

      {/* 4 Kartu Metrik Utama */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          className="rounded-xl border border-slate-200/90 shadow-2xs"
          title="Total Siswa"
          value={stats.total}
          icon={Users}
          color="blue"
          footerLeft="Siswa aktif"
          footerRight="Kelas terpilih"
        />
        <StatCard
          className="rounded-xl border border-slate-200/90 shadow-2xs"
          title="Tuntas KKM"
          value={stats.tuntas}
          icon={CheckCircle2}
          color="emerald"
          footerLeft={`Standar KKM ${activeDefaultKkm}`}
          footerRight="KKM tercapai"
        />
        <StatCard
          className="rounded-xl border border-slate-200/90 shadow-2xs"
          title="Perlu Perbaikan"
          value={stats.remidi}
          icon={AlertCircle}
          color="amber"
          footerLeft="Nilai di bawah KKM"
          footerRight="Perlu remidi"
        />
        <StatCard
          className="rounded-xl border border-slate-200/90 shadow-2xs"
          title="Rapor Disahkan"
          value={`${stats.disahkan} dari ${stats.total}`}
          icon={GraduationCap}
          color="blue"
          footerLeft={`${stats.adaCatatan} siswa bercatatan`}
          footerRight="Terverifikasi"
        />
      </section>

      {/* 2. Container Konten Utama */}
      <div className="space-y-6">
        {/* Class Selection & Homeroom Info */}
        {kelasList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-400">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700 ">
              Belum Ada Data Kelas Terdaftar
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-semibold text-slate-500 mr-1 shrink-0">
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
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Kelas {c.namaKelas}
                </button>
              ))}
            </div>

            {summaryData && (
              <div className="flex items-center gap-2 text-xs bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-xs shrink-0">
                <span className="text-slate-500 font-medium">
                  Wali Kelas:
                </span>
                <span className="font-semibold text-slate-900 ">
                  {summaryData.waliKelas}
                </span>
                <span className="text-slate-300 ">•</span>
                <span className="text-slate-500 font-medium">
                  Periode:
                </span>
                <span className="font-semibold text-blue-700 ">
                  {summaryData.periode.replace("-", " ")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 3. DETAIL MATRIKS RAPOR SISWA TABLE */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="space-y-3 pb-3 border-b border-slate-100 ">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                  Rekapitulasi Rapor Siswa Kelas {selectedKelas}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Menampilkan {filteredStudents.length} dari{" "}
                  {summaryData?.students.length || 0} siswa • Nilai akhir
                  dihitung dengan metode bagi rata murni
                </CardDescription>
              </div>

              {/* Legend Warna Penanda KKM (Opsi A — 3 Warna Dinamis) */}
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
                                {s.jenisKelamin === "L" ? "Siswa" : "Siswi"} •
                                Hadir: {s.presensi.hadir} • Sakit:{" "}
                                {s.presensi.sakit} • Izin: {s.presensi.izin} •
                                Alfa: {s.presensi.alfa}
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
      </div>

      {/* MODAL CETAK SEMUA (MASSAL) */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-600" />
              Cetak Semua E-Rapor (Massal A4)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pilih cakupan kelas dan filter siswa yang lembar rapornya akan
              dicetak berurutan dalam satu dokumen A4.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Cakupan Kelas */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold block">
                Cakupan Kelas yang Dicetak
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBulkScope("current")}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                    bulkScope === "current"
                      ? "bg-blue-50 border-blue-500 text-blue-900 font-semibold"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <p className="text-xs font-semibold">Kelas Terpilih</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hanya Kelas {selectedKelas || "-"}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBulkScope("selected")}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                    bulkScope === "selected"
                      ? "bg-blue-50 border-blue-500 text-blue-900 font-semibold"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <p className="text-xs font-semibold">Pilih Kelas</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Pilih beberapa kelas
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBulkScope("all")}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                    bulkScope === "all"
                      ? "bg-blue-50 border-blue-500 text-blue-900 font-semibold"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <p className="text-xs font-semibold">Seluruh Kelas</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Semua ({kelasList.length} kelas)
                  </p>
                </button>
              </div>

              {bulkScope === "selected" && (
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                  <p className="text-[11px] font-medium text-slate-600">
                    Centang kelas yang ingin dicetak:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {kelasList.map((cls) => {
                      const checked = bulkSelectedClasses.includes(
                        cls.namaKelas
                      );
                      return (
                        <label
                          key={cls.id}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer select-none transition-colors",
                            checked
                              ? "bg-blue-600 border-blue-600 text-white font-semibold"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => {
                              if (checked) {
                                setBulkSelectedClasses(
                                  bulkSelectedClasses.filter(
                                    (k) => k !== cls.namaKelas
                                  )
                                );
                              } else {
                                setBulkSelectedClasses([
                                  ...bulkSelectedClasses,
                                  cls.namaKelas,
                                ]);
                              }
                            }}
                          />
                          Kelas {cls.namaKelas}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Filter Tambahan Cetak Massal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold block">
                  Filter Status Rapor
                </Label>
                <Select
                  value={bulkStatusRapor}
                  onValueChange={(val) => {
                    if (val) setBulkStatusRapor(val);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue>
                      {(val) => {
                        if (val === "disahkan_diterbitkan")
                          return "Disahkan dan Diterbitkan";
                        if (val === "Diterbitkan") return "Hanya Diterbitkan";
                        if (val === "Disahkan") return "Hanya Disahkan";
                        if (val === "Draf") return "Hanya Draf";
                        return "Semua Status Rapor";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status Rapor</SelectItem>
                    <SelectItem value="disahkan_diterbitkan">
                      Disahkan dan Diterbitkan
                    </SelectItem>
                    <SelectItem value="Diterbitkan">
                      Hanya Diterbitkan
                    </SelectItem>
                    <SelectItem value="Disahkan">Hanya Disahkan</SelectItem>
                    <SelectItem value="Draf">Hanya Draf</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold block">
                  Filter Ketuntasan Nilai
                </Label>
                <Select
                  value={bulkKetuntasan}
                  onValueChange={(val) => {
                    if (val) setBulkKetuntasan(val);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue>
                      {(val) => {
                        if (val === "Semua Tuntas") return "Hanya Semua Tuntas";
                        if (val === "Perlu Perbaikan")
                          return "Hanya Perlu Perbaikan";
                        return "Semua Siswa";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Siswa</SelectItem>
                    <SelectItem value="Semua Tuntas">
                      Hanya Semua Tuntas
                    </SelectItem>
                    <SelectItem value="Perlu Perbaikan">
                      Hanya Perlu Perbaikan
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold block">
                Urutan Lembar Cetak
              </Label>
              <Select
                value={bulkSortBy}
                onValueChange={(val) => {
                  if (val) setBulkSortBy(val);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue>
                    {(val) => {
                      if (val === "nis_asc") return "Nomor Induk Siswa (NIS)";
                      if (val === "rata_desc")
                        return "Nilai Rata-rata Tertinggi";
                      return "Nama Siswa (A ke Z)";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nama_asc">
                    Nama Siswa (A ke Z)
                  </SelectItem>
                  <SelectItem value="nis_asc">
                    Nomor Induk Siswa (NIS)
                  </SelectItem>
                  <SelectItem value="rata_desc">
                    Nilai Rata-rata Tertinggi
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkModalOpen(false)}
              disabled={loadingBulkPrint}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteBulkPrint}
              disabled={loadingBulkPrint}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loadingBulkPrint ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              {loadingBulkPrint
                ? "Menyiapkan Dokumen..."
                : "Cetak Massal Sekarang (A4)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL TERBITKAN RAPOR KELAS */}
      <Dialog open={publishModalOpen} onOpenChange={setPublishModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Send className="w-4 h-4 text-emerald-600" />
              Penerbitan Rapor Kelas {selectedKelas}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Rapor berstatus Diterbitkan akan langsung dapat dibuka dan dicetak
              oleh siswa.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2 py-2 text-center">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-[11px] text-slate-500">Total Siswa</p>
              <p className="text-base font-bold font-mono text-slate-900">
                {stats.total}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
              <p className="text-[11px] text-emerald-700">Siap Terbit</p>
              <p className="text-base font-bold font-mono text-emerald-700">
                {stats.siapTerbit}
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-2.5">
              <p className="text-[11px] text-blue-700">Sudah Terbit</p>
              <p className="text-base font-bold font-mono text-blue-700">
                {stats.diterbitkan}
              </p>
            </div>
          </div>

          {stats.total - stats.siapTerbit > 0 && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {stats.total - stats.siapTerbit} siswa belum memiliki nilai mapel
              dan akan dilewati otomatis.
            </p>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
            <div>
              {stats.diterbitkan > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePublishClass("Draf")}
                  disabled={publishingClass}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  Tarik ke Draf
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPublishModalOpen(false)}
                disabled={publishingClass}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => handlePublishClass("Diterbitkan")}
                disabled={publishingClass || stats.siapTerbit === 0}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {publishingClass ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Terbitkan Sekarang
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  value={noteForm.ekskulNilai || "none"}
                  onValueChange={(val) => {
                    setNoteForm({
                      ...noteForm,
                      ekskulNilai: !val || val === "none" ? "" : val,
                    });
                  }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Pilih Nilai">
                      {(val) => {
                        if (val === "Sangat Baik") return "Sangat Baik (A)";
                        if (val === "Baik") return "Baik (B)";
                        if (val === "Cukup") return "Cukup (C)";
                        return "Belum diisi";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Belum diisi</SelectItem>
                    <SelectItem value="Sangat Baik">
                      Sangat Baik (A)
                    </SelectItem>
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
                  setNoteForm({
                    ...noteForm,
                    ekskulKeterangan: e.target.value,
                  })
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
                  <SelectValue placeholder="Pilih Status">
                    {(val) => {
                      if (val === "Disahkan") return "Disahkan Wali Kelas";
                      if (val === "Diterbitkan") return "Diterbitkan (Resmi)";
                      return "Draf (Masih Dapat Diubah)";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draf">
                    Draf (Masih Dapat Diubah)
                  </SelectItem>
                  <SelectItem value="Disahkan">Disahkan Wali Kelas</SelectItem>
                  <SelectItem value="Diterbitkan">
                    Diterbitkan (Resmi)
                  </SelectItem>
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
    </div>
  );
}
