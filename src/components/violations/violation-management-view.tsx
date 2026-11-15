"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldAlert,
  AlertTriangle,
  FileCheck2,
  Users,
  Search,
  Plus,
  Printer,
  History,
  FileText,
  Settings,
  Trash2,
  CheckCircle2,
  Clock,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { QuickViolationModal } from "./quick-violation-modal";
import {
  WarningLetterPrintModal,
  WarningLetterData,
} from "./warning-letter-print-modal";
import { SANCTION_THRESHOLDS } from "@/lib/violations";

interface StudentSummaryItem {
  studentId: string;
  nis: string;
  namaLengkap: string;
  kelas: string;
  totalPoints: number;
  totalViolations: number;
  tier: {
    status: string;
    level: string;
    badgeColor: string;
    badgeBg: string;
    badgeBorder: string;
    recommendedSp: number | null;
  };
  latestLetter: {
    id: string;
    nomorSurat: string;
    tingkatSp: number;
    tanggalTerbit: string;
    totalPoinSaatSp: number;
    statusPanggilan: string;
  } | null;
}

interface ViolationItem {
  id: string;
  studentId: string;
  nis: string;
  namaSiswa: string;
  kelas: string;
  kodePelanggaran: string;
  namaPelanggaran: string;
  kategori: "Ringan" | "Sedang" | "Berat";
  poin: number;
  tanggal: string;
  lokasi?: string;
  keterangan?: string;
  reportedBy: string;
  status: "Tercatat" | "Diproses BK" | "Selesai Dibina";
  tindakLanjut?: string;
}

interface ViolationTypeItem {
  id: string;
  kode: string;
  namaPelanggaran: string;
  kategori: string;
  poinDefault: number;
  deskripsiSanksi?: string;
}

interface WarningLetterRow {
  id: string;
  studentId: string;
  namaSiswa: string;
  nis: string;
  kelas: string;
  nomorSurat: string;
  tingkatSp: number;
  totalPoinSaatSp: number;
  tanggalTerbit: string;
  diterbitkanOleh: string;
  statusPanggilan: string;
  catatanMediasi?: string;
}

interface ViolationManagementViewProps {
  portal: "guru" | "admin";
}

export function ViolationManagementView({ portal }: ViolationManagementViewProps) {
  const [activeTab, setActiveTab] = useState("students");
  const [selectedClass, setSelectedClass] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Data states
  const [studentsSummary, setStudentsSummary] = useState<StudentSummaryItem[]>([]);
  const [violationsList, setViolationsList] = useState<ViolationItem[]>([]);
  const [violationTypesList, setViolationTypesList] = useState<ViolationTypeItem[]>([]);
  const [warningLettersList, setWarningLettersList] = useState<WarningLetterRow[]>([]);
  const [classesList, setClassesList] = useState<string[]>(["X-A", "X-B", "XI-A"]);

  // Modal states
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [preselectedStudentId, setPreselectedStudentId] = useState<string | undefined>();
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [currentPrintLetter, setCurrentPrintLetter] = useState<WarningLetterData | null>(null);

  // Student history modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<StudentSummaryItem | null>(null);

  // Master Rule CRUD modal
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<ViolationTypeItem> | null>(null);
  const [ruleSubmitting, setRuleSubmitting] = useState(false);

  // Issue SP modal
  const [spModalOpen, setSpModalOpen] = useState(false);
  const [targetStudentForSp, setTargetStudentForSp] = useState<StudentSummaryItem | null>(null);
  const [spTingkat, setSpTingkat] = useState<number>(1);
  const [spCatatan, setSpCatatan] = useState("");
  const [spSubmitting, setSpSubmitting] = useState(false);

  // Fetch all initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resSummary, resViolations, resTypes, resLetters, resClasses] = await Promise.all([
        fetch(`/api/violations?mode=summary&kelas=${selectedClass}`),
        fetch(`/api/violations?kelas=${selectedClass}`),
        fetch("/api/violations/types"),
        fetch("/api/violations/warning-letters"),
        fetch("/api/classes"),
      ]);

      if (resSummary.ok) {
        const data = await resSummary.json();
        setStudentsSummary(data.students || []);
      }
      if (resViolations.ok) {
        const data = await resViolations.json();
        setViolationsList(data.violations || []);
      }
      if (resTypes.ok) {
        const data = await resTypes.json();
        setViolationTypesList(data.types || []);
      }
      if (resLetters.ok) {
        const data = await resLetters.json();
        setWarningLettersList(data.letters || []);
      }
      if (resClasses.ok) {
        const clsData = await resClasses.json();
        if (Array.isArray(clsData)) {
          setClassesList(clsData.map((c: { namaKelas?: string; kelas?: string }) => c.namaKelas || c.kelas || ""));
        }
      }
    } catch (err) {
      console.error("Failed to load violation data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // KPI Calculations
  const stats = useMemo(() => {
    const totalCases = violationsList.length;
    const studentsWithPoints = studentsSummary.filter((s) => s.totalPoints > 0).length;
    const studentsNeedIntervention = studentsSummary.filter(
      (s) => s.totalPoints >= SANCTION_THRESHOLDS.PEMBINAAN_LISAN
    ).length;
    const spCount = warningLettersList.length;

    return { totalCases, studentsWithPoints, studentsNeedIntervention, spCount };
  }, [violationsList, studentsSummary, warningLettersList]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return studentsSummary.filter((s) => {
      const matchesSearch =
        s.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nis.includes(searchQuery);
      return matchesSearch;
    });
  }, [studentsSummary, searchQuery]);

  // Actions
  const handleOpenQuickModal = (studentId?: string) => {
    setPreselectedStudentId(studentId);
    setQuickModalOpen(true);
  };

  const handleOpenHistoryModal = (student: StudentSummaryItem) => {
    setSelectedStudentForHistory(student);
    setHistoryModalOpen(true);
  };

  const handleOpenPrintPreview = (letter: WarningLetterRow) => {
    const studentViolations = violationsList.filter((v) => v.studentId === letter.studentId);
    setCurrentPrintLetter({
      id: letter.id,
      nomorSurat: letter.nomorSurat,
      tingkatSp: letter.tingkatSp,
      tanggalTerbit: letter.tanggalTerbit,
      totalPoinSaatSp: letter.totalPoinSaatSp,
      diterbitkanOleh: letter.diterbitkanOleh,
      statusPanggilan: letter.statusPanggilan,
      catatanMediasi: letter.catatanMediasi,
      student: {
        id: letter.studentId,
        namaLengkap: letter.namaSiswa,
        nis: letter.nis,
        kelas: letter.kelas,
      },
      violationsList: studentViolations.slice(0, 5).map((v) => ({
        tanggal: v.tanggal,
        namaPelanggaran: v.namaPelanggaran,
        poin: v.poin,
        keterangan: v.keterangan,
      })),
    });
    setPrintModalOpen(true);
  };

  const handleOpenSpIssueModal = (student: StudentSummaryItem) => {
    setTargetStudentForSp(student);
    setSpTingkat(student.tier.recommendedSp || 1);
    setSpCatatan("");
    setSpModalOpen(true);
  };

  const handleIssueSpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentForSp) return;

    setSpSubmitting(true);
    try {
      const res = await fetch("/api/violations/warning-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: targetStudentForSp.studentId,
          tingkatSp: spTingkat,
          catatanMediasi: spCatatan,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Gagal menerbitkan surat peringatan");
      }

      setSpModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan saat menerbitkan SP");
    } finally {
      setSpSubmitting(false);
    }
  };

  const handleUpdateViolationStatus = async (
    violationId: string,
    newStatus: "Tercatat" | "Diproses BK" | "Selesai Dibina"
  ) => {
    try {
      const res = await fetch(`/api/violations/${violationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDeleteViolation = async (violationId: string) => {
    if (!confirm("Batalkan dan hapus catatan pelanggaran ini?")) return;
    try {
      const res = await fetch(`/api/violations/${violationId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to delete violation:", err);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule?.kode || !editingRule?.namaPelanggaran || !editingRule?.kategori) {
      alert("Kode, nama, dan kategori wajib diisi");
      return;
    }

    setRuleSubmitting(true);
    try {
      const res = await fetch("/api/violations/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRule),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Gagal menyimpan aturan");
      }

      setRuleModalOpen(false);
      setEditingRule(null);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan aturan");
    } finally {
      setRuleSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner Menyatu (Flush Edge-to-Edge) */}
      <PageHeader
        title="Buku Poin & Catatan Kedisiplinan"
        description="Monitoring akumulasi poin pelanggaran tata tertib taruna dan penerbitan surat peringatan (SP) resmi"
        badge={portal === "admin" ? "Portal Admin" : "Portal Guru & BK"}
        icon={ShieldAlert}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleOpenQuickModal()}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pelanggaran</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingRule({ kategori: "Ringan", poinDefault: 10 });
              setRuleModalOpen(true);
            }}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4" />
            <span>Aturan Pelanggaran</span>
          </Button>
        </div>
      </PageHeader>

      {/* 2. Container Konten Utama */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* KPI Stat Cards Standar SIMESA */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Kasus Pelanggaran"
            value={stats.totalCases}
            subtitle="Tercatat dalam sistem"
            icon={AlertTriangle}
            color="navy"
          />
          <StatCard
            title="Taruna Berpoin"
            value={stats.studentsWithPoints}
            subtitle="Memiliki catatan aktif"
            icon={Users}
            color="slate"
          />
          <StatCard
            title="Perlu Pembinaan"
            value={stats.studentsNeedIntervention}
            subtitle="Akumulasi ≥ 30 poin"
            icon={ShieldAlert}
            color="amber"
          />
          <StatCard
            title="Surat Peringatan Terbit"
            value={stats.spCount}
            subtitle="SP 1, SP 2, dan SP 3"
            icon={FileCheck2}
            color="rose"
          />
        </div>

        {/* Tab Navigasi & Filter */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <TabsTrigger value="students" className="text-xs font-semibold rounded-lg">
                Rekap Taruna & Poin
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-xs font-semibold rounded-lg">
                Riwayat Pelanggaran
              </TabsTrigger>
              <TabsTrigger value="letters" className="text-xs font-semibold rounded-lg">
                Arsip Surat Peringatan (SP)
              </TabsTrigger>
              <TabsTrigger value="rules" className="text-xs font-semibold rounded-lg">
                Katalog & Aturan Sanksi
              </TabsTrigger>
            </TabsList>

            {/* Quick Class Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 shrink-0">
                Kelas:
              </span>
              <button
                type="button"
                onClick={() => setSelectedClass("all")}
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                  selectedClass === "all"
                    ? "bg-[#1F4E78] text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Semua
              </button>
              {classesList.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                    selectedClass === cls
                      ? "bg-[#1F4E78] text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: REKAP SISWA & POIN */}
          <TabsContent value="students" className="space-y-4 m-0">
            <div className="flex items-center justify-between gap-3">
              <div className="relative w-full max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Cari nama taruna atau NIS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {filteredStudents.length} taruna terdaftar
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75 dark:bg-slate-800/50">
                    <TableHead className="w-12 text-center text-xs">No</TableHead>
                    <TableHead className="text-xs">NIS</TableHead>
                    <TableHead className="text-xs">Nama Lengkap</TableHead>
                    <TableHead className="text-xs">Kelas</TableHead>
                    <TableHead className="text-center text-xs">Total Poin</TableHead>
                    <TableHead className="text-xs">Status Disiplin</TableHead>
                    <TableHead className="text-xs">Status SP</TableHead>
                    <TableHead className="text-right text-xs pr-4">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-xs text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1F4E78]" />
                        Memuat data buku poin taruna...
                      </TableCell>
                    </TableRow>
                  ) : filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-xs text-slate-500">
                        Tidak ada data taruna yang cocok dengan filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((s, idx) => (
                      <TableRow key={s.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <TableCell className="text-center text-xs text-slate-500">{idx + 1}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {s.nis}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-900 dark:text-white">
                          {s.namaLengkap}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                            {s.kelas}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              s.totalPoints === 0
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : s.totalPoints < 30
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : s.totalPoints < 50
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : s.totalPoints < 75
                                ? "bg-orange-50 text-orange-700 border border-orange-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {s.totalPoints} Poin
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${s.tier.badgeBg} ${s.tier.badgeColor} ${s.tier.badgeBorder}`}
                          >
                            {s.tier.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {s.latestLetter ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                              <FileCheck2 className="w-3.5 h-3.5" />
                              <span>SP {s.latestLetter.tingkatSp} Terbit</span>
                            </span>
                          ) : s.totalPoints >= SANCTION_THRESHOLDS.SP_1 ? (
                            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              Rekomendasi SP {s.tier.recommendedSp}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Belum Ada SP</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-4 space-x-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenQuickModal(s.studentId)}
                            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Catat
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenHistoryModal(s)}
                            className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                          >
                            <History className="w-3.5 h-3.5 mr-1" />
                            Riwayat
                          </Button>
                          {s.totalPoints >= SANCTION_THRESHOLDS.SP_1 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenSpIssueModal(s)}
                              className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1" />
                              Terbitkan SP
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* TAB 2: RIWAYAT PELANGGARAN */}
          <TabsContent value="logs" className="space-y-4 m-0">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75 dark:bg-slate-800/50">
                    <TableHead className="w-12 text-center text-xs">No</TableHead>
                    <TableHead className="text-xs">Tanggal</TableHead>
                    <TableHead className="text-xs">Taruna / Siswa</TableHead>
                    <TableHead className="text-xs">Kelas</TableHead>
                    <TableHead className="text-xs">Pelanggaran Disiplin</TableHead>
                    <TableHead className="text-center text-xs">Kategori</TableHead>
                    <TableHead className="text-center text-xs">Poin</TableHead>
                    <TableHead className="text-xs">Lokasi</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-right text-xs pr-4">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violationsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-10 text-xs text-slate-500">
                        Belum ada riwayat pelanggaran tercatat.
                      </TableCell>
                    </TableRow>
                  ) : (
                    violationsList.map((v, i) => (
                      <TableRow key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <TableCell className="text-center text-xs text-slate-500">{i + 1}</TableCell>
                        <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400">
                          {v.tanggal}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-900 dark:text-white">
                          {v.namaSiswa}
                          <span className="block text-[10px] text-slate-400 font-mono">{v.nis}</span>
                        </TableCell>
                        <TableCell className="text-xs">{v.kelas}</TableCell>
                        <TableCell className="text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
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
                        <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                          {v.lokasi || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                              v.status === "Selesai Dibina"
                                ? "bg-emerald-50 text-emerald-700"
                                : v.status === "Diproses BK"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-700"
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
                        <TableCell className="text-right pr-4 space-x-1">
                          {v.status !== "Selesai Dibina" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdateViolationStatus(v.id, "Selesai Dibina")}
                              className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Tandai Selesai Dibina"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Selesai
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteViolation(v.id)}
                            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Hapus Catatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* TAB 3: ARSIP SURAT PERINGATAN (SP) */}
          <TabsContent value="letters" className="space-y-4 m-0">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75 dark:bg-slate-800/50">
                    <TableHead className="w-12 text-center text-xs">No</TableHead>
                    <TableHead className="text-xs">Nomor Surat SP</TableHead>
                    <TableHead className="text-center text-xs">Tingkat</TableHead>
                    <TableHead className="text-xs">Taruna / Siswa</TableHead>
                    <TableHead className="text-xs">Kelas</TableHead>
                    <TableHead className="text-center text-xs">Akumulasi Poin</TableHead>
                    <TableHead className="text-xs">Tanggal Terbit</TableHead>
                    <TableHead className="text-xs">Diterbitkan Oleh</TableHead>
                    <TableHead className="text-xs">Status Panggilan</TableHead>
                    <TableHead className="text-right text-xs pr-4">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warningLettersList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-10 text-xs text-slate-500">
                        Belum ada Surat Peringatan (SP) yang diterbitkan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    warningLettersList.map((l, i) => (
                      <TableRow key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <TableCell className="text-center text-xs text-slate-500">{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {l.nomorSurat}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                            SP {l.tingkatSp}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-900 dark:text-white">
                          {l.namaSiswa}
                          <span className="block text-[10px] text-slate-400 font-mono">{l.nis}</span>
                        </TableCell>
                        <TableCell className="text-xs">{l.kelas}</TableCell>
                        <TableCell className="text-center text-xs font-bold text-red-600">
                          {l.totalPoinSaatSp} Poin
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                          {l.tanggalTerbit}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                          {l.diterbitkanOleh}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            {l.statusPanggilan}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenPrintPreview(l)}
                            className="h-7 px-2.5 text-xs text-[#1F4E78] hover:bg-blue-50 border-blue-200 flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak Surat</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* TAB 4: KATALOG & ATURAN SANKSI (FLEKSIBEL) */}
          <TabsContent value="rules" className="space-y-4 m-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Katalog Jenis Pelanggaran & Bobot Poin Baku
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dapat disesuaikan sewaktu-waktu saat pihak sekolah menerbitkan buku tata tertib resmi
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingRule({ kategori: "Ringan", poinDefault: 10 });
                  setRuleModalOpen(true);
                }}
                className="bg-[#1F4E78] hover:bg-[#163a5c] text-white text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Aturan Baru</span>
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/75 dark:bg-slate-800/50">
                    <TableHead className="w-20 text-xs">Kode</TableHead>
                    <TableHead className="text-xs">Pelanggaran Disiplin</TableHead>
                    <TableHead className="w-28 text-center text-xs">Kategori</TableHead>
                    <TableHead className="w-24 text-center text-xs">Poin Default</TableHead>
                    <TableHead className="text-xs">Arahan Tindakan Sanksi</TableHead>
                    <TableHead className="w-20 text-right text-xs pr-4">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violationTypesList.map((t) => (
                    <TableRow key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <TableCell className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {t.kode}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900 dark:text-white">
                        {t.namaPelanggaran}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold ${
                            t.kategori === "Ringan"
                              ? "bg-blue-50 text-blue-700"
                              : t.kategori === "Sedang"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {t.kategori}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs font-bold text-red-600">
                        +{t.poinDefault} Poin
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                        {t.deskripsiSanksi || "-"}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingRule(t);
                            setRuleModalOpen(true);
                          }}
                          className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL 1: Catat Pelanggaran Cepat */}
      <QuickViolationModal
        open={quickModalOpen}
        onOpenChange={setQuickModalOpen}
        onSuccess={loadData}
        defaultStudentId={preselectedStudentId}
        studentsList={studentsSummary.map((s) => ({
          id: s.studentId,
          nis: s.nis,
          namaLengkap: s.namaLengkap,
          kelas: s.kelas,
        }))}
        typesList={violationTypesList}
      />

      {/* MODAL 2: Cetak Dokumen Surat Peringatan (SP) */}
      <WarningLetterPrintModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        letterData={currentPrintLetter}
      />

      {/* MODAL 3: Riwayat Pelanggaran Individual Taruna */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              <span>Riwayat Buku Poin: {selectedStudentForHistory?.namaLengkap}</span>
            </DialogTitle>
            <p className="text-xs text-slate-500">
              NIS: {selectedStudentForHistory?.nis} • Kelas: {selectedStudentForHistory?.kelas} • Total:{" "}
              <strong className="text-red-600">{selectedStudentForHistory?.totalPoints} Poin</strong>
            </p>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto space-y-2 pt-2">
            {violationsList.filter((v) => v.studentId === selectedStudentForHistory?.studentId).length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Taruna ini tidak memiliki catatan pelanggaran (Disiplin Bersih).
              </p>
            ) : (
              violationsList
                .filter((v) => v.studentId === selectedStudentForHistory?.studentId)
                .map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] text-slate-500">{v.tanggal}</span>
                        <Badge variant="outline" className="text-[10px] py-0">
                          {v.kategori}
                        </Badge>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {v.namaPelanggaran}
                        </span>
                      </div>
                      {v.keterangan && <p className="text-slate-600 dark:text-slate-400 italic mb-1">&ldquo;{v.keterangan}&rdquo;</p>}
                      <p className="text-[11px] text-slate-400">
                        Lokasi: {v.lokasi || "-"} • Pencatat: {v.reportedBy}
                      </p>
                    </div>
                    <span className="font-bold text-red-600 text-sm shrink-0">+{v.poin}</span>
                  </div>
                ))
            )}
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setHistoryModalOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Form Tambah/Edit Aturan Pelanggaran */}
      <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              {editingRule?.id ? "Edit Aturan Pelanggaran" : "Tambah Jenis Pelanggaran"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveRule} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Kode Aturan</Label>
                <Input
                  placeholder="Contoh: TATIB-08"
                  value={editingRule?.kode || ""}
                  onChange={(e) => setEditingRule({ ...editingRule, kode: e.target.value })}
                  className="text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kategori</Label>
                <Select
                  value={editingRule?.kategori || "Ringan"}
                  onValueChange={(val) => setEditingRule({ ...editingRule, kategori: (val as "Ringan" | "Sedang" | "Berat") || "Ringan" })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ringan" className="text-xs">Ringan</SelectItem>
                    <SelectItem value="Sedang" className="text-xs">Sedang</SelectItem>
                    <SelectItem value="Berat" className="text-xs">Berat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nama Pelanggaran</Label>
              <Input
                placeholder="Contoh: Membawa barang terlarang..."
                value={editingRule?.namaPelanggaran || ""}
                onChange={(e) => setEditingRule({ ...editingRule, namaPelanggaran: e.target.value })}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Bobot Poin Baku</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={editingRule?.poinDefault || 10}
                onChange={(e) => setEditingRule({ ...editingRule, poinDefault: Number(e.target.value) })}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Arahan Tindakan Sanksi / Pembinaan</Label>
              <Input
                placeholder="Contoh: Teguran lisan & pemanggilan orang tua"
                value={editingRule?.deskripsiSanksi || ""}
                onChange={(e) => setEditingRule({ ...editingRule, deskripsiSanksi: e.target.value })}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setRuleModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={ruleSubmitting} className="bg-[#1F4E78] text-white">
                {ruleSubmitting ? "Menyimpan..." : "Simpan Aturan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: Terbitkan Surat Peringatan (SP) Baru */}
      <Dialog open={spModalOpen} onOpenChange={setSpModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-red-600" />
              <span>Terbitkan Surat Peringatan (SP)</span>
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Taruna: <strong>{targetStudentForSp?.namaLengkap}</strong> ({targetStudentForSp?.kelas}) • Akumulasi:{" "}
              <strong className="text-red-600">{targetStudentForSp?.totalPoints} Poin</strong>
            </p>
          </DialogHeader>

          <form onSubmit={handleIssueSpSubmit} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Tingkat Surat Peringatan</Label>
              <Select
                value={String(spTingkat)}
                onValueChange={(val) => setSpTingkat(Number(val) || 1)}
              >
                <SelectTrigger className="text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" className="text-xs">Surat Peringatan I (SP 1)</SelectItem>
                  <SelectItem value="2" className="text-xs">Surat Peringatan II (SP 2)</SelectItem>
                  <SelectItem value="3" className="text-xs">Surat Peringatan III (SP 3 / Terakhir)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Catatan Mediasi / Jadwal Pemanggilan Ortu</Label>
              <Input
                placeholder="Contoh: Pemanggilan wali murid hari Senin jam 09.00 WIB"
                value={spCatatan}
                onChange={(e) => setSpCatatan(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setSpModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={spSubmitting} className="bg-red-600 hover:bg-red-700 text-white">
                {spSubmitting ? "Menerbitkan..." : "Terbitkan SP Resmi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

