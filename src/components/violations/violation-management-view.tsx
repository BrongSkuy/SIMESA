"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
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
  FileCheck2,
  Search,
  Plus,
  Printer,
  FileText,
  Settings,
  Trash2,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  MapPin,
  BookOpen,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { QuickViolationModal } from "./quick-violation-modal";
import {
  WarningLetterPrintModal,
  WarningLetterData,
} from "./warning-letter-print-modal";
import {
  SANCTION_THRESHOLDS,
  sanitizePoinInput,
  sanitizeThresholdInput,
  validateSanctionThresholds,
  getSpTingkatLabel,
  type SanctionThresholds,
} from "@/lib/violations";
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

function getStampStyle(level: string): string {
  if (level === "sp3" || level === "sp2") {
    return "border-rose-800/85 text-rose-800 bg-rose-50/40";
  }
  if (level === "sp1") {
    return "border-orange-700/85 text-orange-800 bg-orange-50/40";
  }
  if (level === "pembinaan") {
    return "border-amber-700/85 text-amber-800 bg-amber-50/40";
  }
  if (level === "ringan") {
    return "border-sky-700/80 text-sky-800 bg-sky-50/40";
  }
  return "border-emerald-700/80 text-emerald-800 bg-emerald-50/40";
}

function getPointPillStyle(
  points: number,
  thresholds: SanctionThresholds = SANCTION_THRESHOLDS
): string {
  if (points === 0) {
    return "bg-emerald-100/90 text-emerald-800 border-emerald-200";
  }
  if (points < thresholds.PEMBINAAN_LISAN) {
    return "bg-sky-100/90 text-sky-800 border-sky-200";
  }
  if (points < thresholds.SP_1) {
    return "bg-amber-200/85 text-amber-900 border-amber-300";
  }
  if (points < thresholds.SP_2) {
    return "bg-amber-400/90 text-slate-950 border-amber-500/60";
  }
  return "bg-rose-700 text-white border-rose-800";
}

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

type BookTabKey = "students" | "logs" | "letters" | "rules";

const BOOK_TABS: Array<{
  key: BookTabKey;
  label: string;
  inactiveBg: string;
}> = [
  {
    key: "students",
    label: "Rekap Siswa",
    inactiveBg: "bg-slate-200/95 text-slate-800 hover:bg-slate-100",
  },
  {
    key: "logs",
    label: "Riwayat",
    inactiveBg: "bg-[#e5a852] text-slate-950 hover:bg-[#ebb568]",
  },
  {
    key: "letters",
    label: "Arsip SP",
    inactiveBg: "bg-[#65a9d6] text-slate-950 hover:bg-[#7bb7df]",
  },
  {
    key: "rules",
    label: "Aturan",
    inactiveBg: "bg-[#b97797] text-white hover:bg-[#c58aa6]",
  },
];

export function ViolationManagementView({ portal }: ViolationManagementViewProps) {
  const [activeTab, setActiveTab] = useState<BookTabKey>("students");
  const [selectedClass, setSelectedClass] = useState("all");
  const [pointSegment, setPointSegment] = useState<"all" | "berpoin" | "sp">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [studentsSummary, setStudentsSummary] = useState<StudentSummaryItem[]>([]);
  const [violationsList, setViolationsList] = useState<ViolationItem[]>([]);
  const [violationTypesList, setViolationTypesList] = useState<ViolationTypeItem[]>([]);
  const [warningLettersList, setWarningLettersList] = useState<WarningLetterRow[]>([]);
  const [classesList, setClassesList] = useState<string[]>(["X-A", "X-B", "XI-A"]);
  const [thresholds, setThresholds] = useState<SanctionThresholds>(SANCTION_THRESHOLDS);
  const [canManageThresholds, setCanManageThresholds] = useState(false);

  // Threshold settings modal (Admin only)
  const [thresholdModalOpen, setThresholdModalOpen] = useState(false);
  const [thresholdForm, setThresholdForm] = useState({
    PEMBINAAN_LISAN: String(SANCTION_THRESHOLDS.PEMBINAAN_LISAN),
    SP_1: String(SANCTION_THRESHOLDS.SP_1),
    SP_2: String(SANCTION_THRESHOLDS.SP_2),
    SP_3: String(SANCTION_THRESHOLDS.SP_3),
  });
  const [savingThresholds, setSavingThresholds] = useState(false);

  // Modal states
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [preselectedStudentId, setPreselectedStudentId] = useState<string | undefined>();
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [currentPrintLetter, setCurrentPrintLetter] = useState<WarningLetterData | null>(null);

  // Master Rule CRUD modal
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<ViolationTypeItem> | null>(null);
  const [rulePoinInput, setRulePoinInput] = useState<string>("10");
  const [ruleSubmitting, setRuleSubmitting] = useState(false);

  // Header photo fallback state
  const [headerBgLoaded, setHeaderBgLoaded] = useState(true);

  // Issue SP modal
  const [spModalOpen, setSpModalOpen] = useState(false);
  const [targetStudentForSp, setTargetStudentForSp] = useState<StudentSummaryItem | null>(null);
  const [spTingkat, setSpTingkat] = useState<number>(1);
  const [spCatatan, setSpCatatan] = useState("");
  const [spSubmitting, setSpSubmitting] = useState(false);
  const [busyViolationId, setBusyViolationId] = useState<string | null>(null);

  // Request sequence guard untuk mencegah race condition saat ganti filter kelas cepat
  const loadReqIdRef = useRef(0);

  // Fetch all initial data
  const loadData = useCallback(async () => {
    const reqId = ++loadReqIdRef.current;
    setLoading(true);
    try {
      const [resSummary, resViolations, resTypes, resLetters, resClasses, resRoles] = await Promise.all([
        fetch(`/api/violations?mode=summary&kelas=${encodeURIComponent(selectedClass)}`, { cache: "no-store" }),
        fetch(`/api/violations?kelas=${encodeURIComponent(selectedClass)}`, { cache: "no-store" }),
        fetch("/api/violations/types", { cache: "no-store" }),
        fetch("/api/violations/warning-letters", { cache: "no-store" }),
        fetch("/api/classes", { cache: "no-store" }),
        fetch("/api/user/roles", { cache: "no-store" }),
      ]);

      if (reqId !== loadReqIdRef.current) return;

      if (resSummary.ok) {
        const data = await resSummary.json();
        setStudentsSummary(data.students || []);
        if (data.thresholds) {
          setThresholds(data.thresholds);
        }
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
          setClassesList(
            clsData
              .map((c: { namaKelas?: string; kelas?: string }) => c.namaKelas || c.kelas || "")
              .filter(Boolean)
          );
        }
      }
      if (resRoles.ok) {
        const roleData = await resRoles.json();
        const allRoles: string[] = Array.isArray(roleData.allRoles) ? roleData.allRoles : [];
        const isAdmin = allRoles.some(
          (r) => r.toUpperCase() === "SUPERADMIN" || r.toUpperCase() === "ADMIN"
        );
        setCanManageThresholds(portal === "admin" && isAdmin);
      }
    } catch (err) {
      console.error("Failed to load violation data:", err);
    } finally {
      if (reqId === loadReqIdRef.current) {
        setLoading(false);
      }
    }
  }, [selectedClass, portal]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Surat peringatan tersaring mengikuti filter kelas aktif
  const filteredWarningLetters = useMemo(() => {
    if (selectedClass === "all") return warningLettersList;
    return warningLettersList.filter((l) => l.kelas === selectedClass);
  }, [warningLettersList, selectedClass]);

  // KPI Calculations (100% sinkron dengan kelas terpilih & poin aktif)
  const stats = useMemo(() => {
    const totalCases = violationsList.filter((v) => v.status !== "Selesai Dibina").length;
    const studentsWithPoints = studentsSummary.filter((s) => s.totalPoints > 0).length;
    const studentsNeedIntervention = studentsSummary.filter(
      (s) => s.totalPoints >= thresholds.PEMBINAAN_LISAN
    ).length;
    const spCount = filteredWarningLetters.length;

    return { totalCases, studentsWithPoints, studentsNeedIntervention, spCount };
  }, [violationsList, studentsSummary, filteredWarningLetters, thresholds]);

  // Filtered & Priority-Sorted Students (poin tertinggi di atas agar cepat terpantau)
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return studentsSummary
      .filter((s) => {
        const matchesSearch =
          !q ||
          s.namaLengkap.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.kelas.toLowerCase().includes(q);
        const matchesSegment =
          pointSegment === "all" ||
          (pointSegment === "berpoin" && s.totalPoints > 0) ||
          (pointSegment === "sp" && s.totalPoints >= thresholds.SP_1);
        return matchesSearch && matchesSegment;
      })
      .sort(
        (a, b) =>
          b.totalPoints - a.totalPoints ||
          a.namaLengkap.localeCompare(b.namaLengkap)
      );
  }, [studentsSummary, searchQuery, pointSegment, thresholds]);

  // Siswa aktif di halaman kanan buku saku
  const activeStudent = useMemo(() => {
    if (filteredStudents.length === 0) return null;
    if (selectedStudentId) {
      const found = filteredStudents.find((s) => s.studentId === selectedStudentId);
      if (found) return found;
    }
    return filteredStudents[0];
  }, [filteredStudents, selectedStudentId]);

  const activeStudentViolations = useMemo(() => {
    if (!activeStudent) return [];
    return violationsList.filter((v) => v.studentId === activeStudent.studentId);
  }, [violationsList, activeStudent]);

  const activeStudentLetter = useMemo(() => {
    if (!activeStudent) return null;
    if (activeStudent.latestLetter) {
      const exact = warningLettersList.find(
        (l) => l.id === activeStudent.latestLetter?.id
      );
      if (exact) return exact;
    }
    const studentLetters = warningLettersList
      .filter((l) => l.studentId === activeStudent.studentId)
      .sort((a, b) => b.tingkatSp - a.tingkatSp);
    return studentLetters[0] || null;
  }, [warningLettersList, activeStudent]);

  // Actions
  const handleOpenQuickModal = (studentId?: string) => {
    setPreselectedStudentId(studentId);
    setQuickModalOpen(true);
  };

  const handleOpenPrintPreview = (letter: WarningLetterRow) => {
    const allStudentViolations = violationsList.filter(
      (v) => v.studentId === letter.studentId
    );
    const activeOnly = allStudentViolations.filter(
      (v) => v.status !== "Selesai Dibina"
    );
    const selectedForLetter = (activeOnly.length > 0 ? activeOnly : allStudentViolations).slice(0, 5);

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
      violationsList: selectedForLetter.map((v) => ({
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
      toast.success(`Surat Peringatan ${spTingkat} berhasil diterbitkan`);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan saat menerbitkan SP");
    } finally {
      setSpSubmitting(false);
    }
  };

  const handleUpdateViolationStatus = async (
    violationId: string,
    newStatus: "Tercatat" | "Diproses BK" | "Selesai Dibina"
  ) => {
    if (busyViolationId === violationId) return;
    setBusyViolationId(violationId);
    try {
      const res = await fetch(`/api/violations/${violationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(
          newStatus === "Selesai Dibina"
            ? "Catatan ditandai selesai dan poin aktif otomatis berkurang"
            : "Catatan diaktifkan kembali ke akumulasi poin"
        );
        await loadData();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Gagal memperbarui status catatan");
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error("Gagal memperbarui status catatan");
    } finally {
      setBusyViolationId(null);
    }
  };

  const openThresholdModal = () => {
    setThresholdForm({
      PEMBINAAN_LISAN: String(thresholds.PEMBINAAN_LISAN),
      SP_1: String(thresholds.SP_1),
      SP_2: String(thresholds.SP_2),
      SP_3: String(thresholds.SP_3),
    });
    setThresholdModalOpen(true);
  };

  const handleSaveThresholds = async (resetToDefault = false) => {
    if (!resetToDefault) {
      const check = validateSanctionThresholds({
        PEMBINAAN_LISAN: Number(thresholdForm.PEMBINAAN_LISAN),
        SP_1: Number(thresholdForm.SP_1),
        SP_2: Number(thresholdForm.SP_2),
        SP_3: Number(thresholdForm.SP_3),
      });
      if (!check.valid) {
        toast.error(check.error);
        return;
      }
    }

    setSavingThresholds(true);
    try {
      const res = await fetch("/api/violations/thresholds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          resetToDefault
            ? { resetToDefault: true }
            : {
                PEMBINAAN_LISAN: Number(thresholdForm.PEMBINAAN_LISAN),
                SP_1: Number(thresholdForm.SP_1),
                SP_2: Number(thresholdForm.SP_2),
                SP_3: Number(thresholdForm.SP_3),
              }
        ),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menyimpan ambang batas poin");
      }
      toast.success(json.message);
      setThresholdModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan ambang batas poin"
      );
    } finally {
      setSavingThresholds(false);
    }
  };

  const handleDeleteViolation = async (violationId: string) => {
    if (busyViolationId === violationId) return;
    if (!confirm("Batalkan dan hapus catatan pelanggaran ini?")) return;
    setBusyViolationId(violationId);
    try {
      const res = await fetch(`/api/violations/${violationId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Catatan pelanggaran dihapus dan poin diperbarui");
        await loadData();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Gagal menghapus catatan pelanggaran");
      }
    } catch (err) {
      console.error("Failed to delete violation:", err);
      toast.error("Gagal menghapus catatan pelanggaran");
    } finally {
      setBusyViolationId(null);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule?.kode || !editingRule?.namaPelanggaran || !editingRule?.kategori) {
      toast.error("Kode, nama, dan kategori wajib diisi");
      return;
    }

    const parsedPoin = Number(rulePoinInput);
    if (!rulePoinInput.trim() || !Number.isInteger(parsedPoin) || parsedPoin < 1 || parsedPoin > 100) {
      toast.error("Bobot poin baku harus berupa bilangan bulat antara 1 sampai 100");
      return;
    }

    setRuleSubmitting(true);
    try {
      const res = await fetch("/api/violations/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editingRule, poinDefault: parsedPoin }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Gagal menyimpan aturan");
      }

      toast.success(
        editingRule.id
          ? "Aturan pelanggaran berhasil diperbarui"
          : "Aturan pelanggaran baru berhasil ditambahkan"
      );
      setRuleModalOpen(false);
      setEditingRule(null);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan aturan");
    } finally {
      setRuleSubmitting(false);
    }
  };

  const maxMeterScale = Math.max(1, thresholds.SP_3);
  const activeMeterPct = activeStudent
    ? Math.min(100, Math.max(0, (activeStudent.totalPoints / maxMeterScale) * 100))
    : 0;
  const pembinaanTickPct = Math.min(95, (thresholds.PEMBINAAN_LISAN / maxMeterScale) * 100);
  const sp1TickPct = Math.min(97, (thresholds.SP_1 / maxMeterScale) * 100);
  const sp2TickPct = Math.min(99, (thresholds.SP_2 / maxMeterScale) * 100);

  return (
    <div className="space-y-0 pb-10">
      {/* 1. COMPACT ASYMMETRIC HERO HEADER (Konsep 1 — Deep Navy + Foto Gaya Login + 1 Strip Metrik) */}
      <section className="relative overflow-hidden -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10 pt-6 pb-16 sm:pb-20 bg-[#091424] border-b border-white/10 text-white">
        {/* Foto Latar Tunggal Gaya Login — Jelas di sisi kanan, melebur halus ke navy di kiri */}
        {headerBgLoaded && (
          <Image
            src="/bg-buku-poin.jpg"
            alt=""
            fill
            sizes="100vw"
            unoptimized
            priority
            className="object-cover object-right opacity-35 mix-blend-luminosity filter contrast-125 brightness-95 pointer-events-none select-none"
            onError={() => setHeaderBgLoaded(false)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#091424] via-[#0b192e]/85 to-[#0d1e38]/45 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#091424]/40 via-transparent to-[#091424]/90 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto space-y-5">
          {/* Baris Atas Split Kiri (Judul) & Kanan (Tombol Aksi) */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Kedisiplinan Siswa • {portal === "admin" ? "Portal Admin" : "Portal Guru"}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Buku Poin dan Kedisiplinan Siswa
              </h1>
              <p className="text-xs sm:text-sm text-blue-100/75 max-w-xl">
                Monitoring poin pelanggaran dan pembinaan kedisiplinan siswa secara terpadu.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingRule({ kategori: "Ringan", poinDefault: 10 });
                  setRulePoinInput("10");
                  setRuleModalOpen(true);
                }}
                className="inline-flex items-center bg-white/[0.08] hover:bg-white/15 active:bg-white/20 border border-white/25 rounded-xl px-4 py-2 text-xs font-semibold text-white backdrop-blur-xs transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 mr-2 text-blue-200" />
                Aturan Pelanggaran
              </button>
              <button
                type="button"
                onClick={() => handleOpenQuickModal(activeStudent?.studentId)}
                className="inline-flex items-center bg-[#ebb04d] hover:bg-[#f2be63] active:bg-[#d99b38] border border-amber-200/40 rounded-xl px-4 py-2 text-xs font-bold text-slate-950 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5 text-slate-950" />
                Catat Pelanggaran
              </button>
            </div>
          </div>

          {/* 1 Strip Ringkasan Metrik Kaca Ramping (4 Angka dalam 1 Bar) */}
          <div className="rounded-xl bg-white/[0.09] backdrop-blur-md border border-white/15 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/15 shadow-xs">
            <div className="px-4 py-2.5 flex items-center justify-center gap-2 text-xs">
              <span className="font-mono font-extrabold text-sm text-white tabular-nums">
                {loading ? "..." : stats.totalCases}
              </span>
              <span className="text-blue-100/80 font-medium">Kasus Aktif</span>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-center gap-2 text-xs">
              <span className="font-mono font-extrabold text-sm text-white tabular-nums">
                {loading ? "..." : stats.studentsWithPoints}
              </span>
              <span className="text-blue-100/80 font-medium">Siswa Berpoin</span>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-center gap-2 text-xs">
              <span className="font-mono font-extrabold text-sm text-amber-300 tabular-nums">
                {loading ? "..." : stats.studentsNeedIntervention}
              </span>
              <span className="text-blue-100/80 font-medium">Perlu Pembinaan</span>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-center gap-2 text-xs">
              <span className="font-mono font-extrabold text-sm text-rose-300 tabular-nums">
                {loading ? "..." : stats.spCount}
              </span>
              <span className="text-blue-100/80 font-medium">SP Terbit</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. BUKU SAKU TERBUKA 2 HALAMAN (OVERLAP KE TEPI BAWAH HEADER NAVY) */}
      <div className="relative z-20 max-w-7xl mx-auto px-0 sm:px-2 lg:px-4 -mt-11 sm:-mt-12">
        {/* Pembatas Indeks Kertas Berwarna di Atas Sisi Kanan Buku */}
        <div className="flex flex-wrap items-end justify-end pr-4 sm:pr-7 gap-1.5">
          {BOOK_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-3.5 sm:px-4 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap select-none",
                  isActive
                    ? "bg-[#FCFBF7] text-slate-900 border-t border-x border-[#dfd6c3] translate-y-[2px] relative z-30 shadow-2xs"
                    : `${tab.inactiveBg} translate-y-[1px] opacity-95 hover:opacity-100 shadow-xs`
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sampul & Kertas Gading Hangat (#FCFBF7) Buku Saku */}
        <div className="relative rounded-2xl border-2 border-[#dfd6c3] bg-[#FCFBF7] shadow-[0_20px_48px_-18px_rgba(9,20,36,0.32)] overflow-hidden">
          {/* ================= TAB 1: REKAP SISWA — BUKU SAKU TERBUKA 2 HALAMAN ================= */}
          {activeTab === "students" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px]">
              {/* HALAMAN KIRI: INDEKS SISWA */}
              <div className="lg:col-span-5 p-5 sm:p-6 lg:pr-8 border-b lg:border-b-0 lg:border-r border-[#e4dac6] lg:bg-[linear-gradient(to_right,transparent_calc(100%-26px),rgba(120,104,78,0.08)_calc(100%-8px),rgba(78,64,44,0.16)_100%)] flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                    Indeks Siswa
                  </h2>
                  <span className="text-[11px] font-semibold text-slate-500 font-mono">
                    {filteredStudents.length} siswa
                  </span>
                </div>

                {/* Pencarian + Segmen Poin Cepat (Semua, Berpoin, Zona SP) */}
                <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Cari nama atau NIS..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8.5 h-9 text-xs bg-white border-[#dfd6c3] focus-visible:border-[#0d1e38]"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {(
                      [
                        { id: "all", label: "Semua" },
                        { id: "berpoin", label: "Berpoin" },
                        { id: "sp", label: "Zona SP" },
                      ] as const
                    ).map((seg) => (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => setPointSegment(seg.id)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap",
                          pointSegment === seg.id
                            ? "bg-[#0d1e38] text-white border-[#0d1e38]"
                            : "bg-white text-slate-600 border-[#dfd6c3] hover:bg-[#f4efe3]"
                        )}
                      >
                        {seg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Kelas Ringkas */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  <span className="text-[11px] font-semibold text-slate-500 shrink-0 mr-0.5">
                    Kelas:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedClass("all")}
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer shrink-0",
                      selectedClass === "all"
                        ? "bg-[#0d1e38] text-white"
                        : "bg-[#efe9dc] text-slate-600 hover:bg-[#e5dcc9]"
                    )}
                  >
                    Semua
                  </button>
                  {classesList.map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setSelectedClass(cls)}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer shrink-0",
                        selectedClass === cls
                          ? "bg-[#0d1e38] text-white"
                          : "bg-[#efe9dc] text-slate-600 hover:bg-[#e5dcc9]"
                      )}
                    >
                      {cls}
                    </button>
                  ))}
                </div>

                {/* Daftar Indeks Siswa */}
                <div className="flex-1 overflow-y-auto max-h-[460px] pr-1 divide-y divide-[#e8e0cf]">
                  {loading ? (
                    <div className="py-16 text-center text-xs text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0d1e38]" />
                      Memuat buku saku siswa...
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="py-14 text-center text-xs text-slate-500">
                      Tidak ada siswa yang cocok dengan filter.
                    </div>
                  ) : (
                    filteredStudents.map((s) => {
                      const isSelected = activeStudent?.studentId === s.studentId;
                      return (
                        <button
                          key={s.studentId}
                          type="button"
                          onClick={() => setSelectedStudentId(s.studentId)}
                          className={cn(
                            "w-full text-left px-3 py-3 flex items-center justify-between gap-3 transition-all cursor-pointer",
                            isSelected
                              ? "bg-[#fef2d3] border border-[#d8a756] rounded-xl my-1 shadow-2xs"
                              : "hover:bg-[#f4efe3]/85 rounded-lg"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border shrink-0",
                                isSelected
                                  ? "bg-[#0d1e38] text-amber-200 border-[#0d1e38]"
                                  : "bg-white text-slate-700 border-[#dfd6c3]"
                              )}
                            >
                              {getInitials(s.namaLengkap)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {s.namaLengkap}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono truncate">
                                {s.kelas} • NIS {s.nis}
                              </p>
                            </div>
                          </div>

                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono border shrink-0 tabular-nums",
                              getPointPillStyle(s.totalPoints, thresholds)
                            )}
                          >
                            {s.totalPoints} Poin
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* HALAMAN KANAN: LEMBAR BUKU SAKU SISWA TERPILIH (LIVE DETAIL) */}
              <div className="lg:col-span-7 p-5 sm:p-6 lg:pl-8 lg:bg-[linear-gradient(to_right,rgba(78,64,44,0.12)_0%,rgba(120,104,78,0.05)_14px,transparent_30px)] flex flex-col gap-5">
                {!activeStudent ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16 text-slate-500 space-y-2">
                    <BookOpen className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">
                      Pilih Siswa di Indeks Kiri
                    </p>
                    <p className="text-xs text-slate-500 max-w-xs">
                      Lembar buku saku kedisiplinan dan riwayat pelanggaran siswa akan langsung terbuka di sini.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Header Lembar Siswa + Stempel Tinta Status */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="text-xl font-extrabold tracking-tight text-slate-900">
                          {activeStudent.namaLengkap}
                        </h3>
                        <p className="text-xs font-mono text-slate-600">
                          NIS {activeStudent.nis} • Kelas {activeStudent.kelas}
                        </p>
                      </div>

                      {/* Stempel Tinta Persegi Miring Halus */}
                      <div
                        className={cn(
                          "self-start sm:self-auto px-3 py-1 rounded-xs border-2 text-[11px] font-black uppercase tracking-wider sm:rotate-[3deg] select-none shadow-2xs",
                          getStampStyle(activeStudent.tier.level)
                        )}
                      >
                        {activeStudent.tier.status}
                      </div>
                    </div>

                    {/* Meter Poin Kedisiplinan (Dinamis sesuai Pengaturan Admin) */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            Meter Poin Kedisiplinan
                          </span>
                          {canManageThresholds && (
                            <button
                              type="button"
                              onClick={openThresholdModal}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-600 bg-[#efe9dc] hover:bg-[#e5dcc9] hover:text-slate-900 transition-colors cursor-pointer"
                              title="Atur batas poin Pembinaan, SP 1, SP 2, dan SP 3"
                            >
                              <SlidersHorizontal className="w-3 h-3" />
                              Atur Meter
                            </button>
                          )}
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-[#0d1e38] text-white font-mono text-xs font-bold tabular-nums">
                          {activeStudent.totalPoints}
                        </span>
                      </div>

                      <div className="relative h-2.5 w-full rounded-full bg-[#e8e0cf] overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            activeStudent.totalPoints === 0
                              ? "bg-emerald-500"
                              : "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-800"
                          )}
                          style={{
                            width: `${activeStudent.totalPoints === 0 ? 4 : activeMeterPct}%`,
                          }}
                        />
                        <div
                          className="absolute inset-y-0 w-px bg-white/80"
                          style={{ left: `${pembinaanTickPct}%` }}
                        />
                        <div
                          className="absolute inset-y-0 w-px bg-white/80"
                          style={{ left: `${sp1TickPct}%` }}
                        />
                        <div
                          className="absolute inset-y-0 w-px bg-white/80"
                          style={{ left: `${sp2TickPct}%` }}
                        />
                      </div>

                      <div className="relative h-8 text-[10px] sm:text-[11px] text-slate-600 leading-tight pt-0.5 select-none">
                        <div className="absolute left-0 top-0.5 text-left whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-800 block">0</span>
                          <span>Aman</span>
                        </div>
                        <div
                          className="absolute top-0.5 -translate-x-1/2 text-center whitespace-nowrap"
                          style={{ left: `${pembinaanTickPct}%` }}
                        >
                          <span className="font-mono font-bold text-slate-800 block">
                            {thresholds.PEMBINAAN_LISAN}
                          </span>
                          <span className="hidden sm:inline">Pembinaan</span>
                        </div>
                        <div
                          className="absolute top-0.5 -translate-x-1/2 text-center whitespace-nowrap"
                          style={{ left: `${sp1TickPct}%` }}
                        >
                          <span className="font-mono font-bold text-slate-800 block">
                            {thresholds.SP_1}
                          </span>
                          <span>SP 1</span>
                        </div>
                        <div
                          className="absolute top-0.5 -translate-x-1/2 text-center whitespace-nowrap"
                          style={{ left: `${sp2TickPct}%` }}
                        >
                          <span className="font-mono font-bold text-slate-800 block">
                            {thresholds.SP_2}
                          </span>
                          <span>SP 2</span>
                        </div>
                        <div className="absolute right-0 top-0.5 text-right whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-800 block">
                            {thresholds.SP_3}
                          </span>
                          <span>SP 3</span>
                        </div>
                      </div>
                    </div>

                    {/* Tombol Aksi Cepat Langsung di Lembar Siswa */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleOpenQuickModal(activeStudent.studentId)}
                        className="h-8 px-3.5 text-xs font-bold bg-[#ebb04d] hover:bg-[#f2be63] text-slate-950 gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Catat Pelanggaran
                      </Button>

                      {activeStudent.totalPoints >= thresholds.SP_1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenSpIssueModal(activeStudent)}
                          className="h-8 px-3.5 text-xs font-semibold bg-white border-slate-300 text-slate-800 hover:bg-rose-600 hover:text-white hover:border-rose-600 gap-1.5 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Terbitkan SP
                        </Button>
                      )}

                      {activeStudentLetter && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPrintPreview(activeStudentLetter)}
                          className="h-8 px-3 text-xs font-semibold bg-white border-blue-200 text-[#1F4E78] hover:bg-[#1F4E78] hover:text-white hover:border-[#1F4E78] gap-1.5 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Cetak SP {activeStudentLetter.tingkatSp}
                        </Button>
                      )}
                    </div>

                    {/* Garis Buku Tulis: Catatan Pelanggaran Siswa */}
                    <div className="flex-1 flex flex-col pt-1">
                      <div className="flex items-center justify-between pb-2 border-b-2 border-[#dfd6c3]">
                        <h4 className="text-sm font-extrabold text-slate-900">
                          Catatan Pelanggaran
                        </h4>
                        <span className="text-[11px] font-mono text-slate-500">
                          {(() => {
                            const activeCount = activeStudentViolations.filter(
                              (v) => v.status !== "Selesai Dibina"
                            ).length;
                            if (
                              activeStudentViolations.length > 0 &&
                              activeCount < activeStudentViolations.length
                            ) {
                              return `${activeCount} aktif dari ${activeStudentViolations.length} catatan`;
                            }
                            return `${activeStudentViolations.length} catatan`;
                          })()}
                        </span>
                      </div>

                      {activeStudentViolations.length === 0 ? (
                        <div className="py-10 text-center space-y-1.5">
                          <ShieldCheck className="w-7 h-7 text-emerald-600 mx-auto" />
                          <p className="text-xs font-bold text-slate-800">
                            Disiplin Bersih
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Siswa belum memiliki catatan pelanggaran pada tahun ajaran aktif.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-[#e6decb] overflow-y-auto max-h-[290px] pr-1">
                          {activeStudentViolations.map((v) => (
                            <div
                              key={v.id}
                              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                            >
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <p className="text-xs text-slate-800 leading-snug">
                                  <span className="font-mono font-semibold text-slate-600 mr-1.5">
                                    {formatShortDateId(v.tanggal)} —
                                  </span>
                                  <span className="font-bold text-slate-900">
                                    {v.namaPelanggaran}
                                  </span>
                                </p>
                                {(v.keterangan || v.lokasi) && (
                                  <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    {v.keterangan && (
                                      <span className="italic">&ldquo;{v.keterangan}&rdquo;</span>
                                    )}
                                    {v.lokasi && (
                                      <span className="inline-flex items-center gap-0.5 text-slate-400">
                                        <MapPin className="w-3 h-3" />
                                        {v.lokasi}
                                      </span>
                                    )}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[11px] font-bold font-mono border",
                                    v.status === "Selesai Dibina"
                                      ? "bg-slate-100 text-slate-400 border-slate-200 line-through"
                                      : "bg-rose-100/90 text-rose-800 border-rose-200"
                                  )}
                                  title={
                                    v.status === "Selesai Dibina"
                                      ? "Poin sudah dikurangi karena selesai dibina"
                                      : "Poin pelanggaran aktif"
                                  }
                                >
                                  +{v.poin} Poin
                                </span>

                                {v.status === "Selesai Dibina" ? (
                                  <button
                                    type="button"
                                    disabled={busyViolationId === v.id}
                                    onClick={() =>
                                      handleUpdateViolationStatus(v.id, "Tercatat")
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 disabled:opacity-50 transition-colors cursor-pointer"
                                    title="Selesai dibina (klik untuk aktifkan kembali poin)"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    Selesai
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={busyViolationId === v.id}
                                    onClick={() =>
                                      handleUpdateViolationStatus(v.id, "Selesai Dibina")
                                    }
                                    className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 disabled:opacity-50 transition-colors cursor-pointer"
                                    title="Tandai Selesai Dibina dan kurangi poin aktif"
                                  >
                                    Selesai
                                  </button>
                                )}

                                <button
                                  type="button"
                                  disabled={busyViolationId === v.id}
                                  onClick={() => handleDeleteViolation(v.id)}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors cursor-pointer"
                                  title="Hapus Catatan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 2: RIWAYAT PELANGGARAN GLOBAL ================= */}
          {activeTab === "logs" && (
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e5dcc9]">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Riwayat Seluruh Pelanggaran
                  </h2>
                  <p className="text-xs text-slate-500">
                    Catatan kronologis tata tertib siswa pada tahun ajaran aktif
                  </p>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <span className="text-xs font-semibold text-slate-500 mr-1">Kelas:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedClass("all")}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-full font-semibold transition-colors cursor-pointer",
                      selectedClass === "all"
                        ? "bg-[#0d1e38] text-white"
                        : "bg-[#efe9dc] text-slate-600 hover:bg-[#e5dcc9]"
                    )}
                  >
                    Semua
                  </button>
                  {classesList.map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setSelectedClass(cls)}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded-full font-semibold transition-colors cursor-pointer",
                        selectedClass === cls
                          ? "bg-[#0d1e38] text-white"
                          : "bg-[#efe9dc] text-slate-600 hover:bg-[#e5dcc9]"
                      )}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#e5dcc9] bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f6f1e6]">
                        <TableHead className="w-12 text-center text-xs">No</TableHead>
                        <TableHead className="text-xs">Tanggal</TableHead>
                        <TableHead className="text-xs">Siswa</TableHead>
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
                          <TableRow
                            key={v.id}
                            className="group/row transition-all duration-200 hover:bg-[#091524] border-b border-slate-100 last:border-0"
                          >
                            <TableCell className="text-center text-xs text-slate-500 group-hover/row:text-slate-400">
                              {i + 1}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-slate-600 group-hover/row:text-slate-300 whitespace-nowrap">
                              {formatShortDateId(v.tanggal)}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-md bg-slate-100 group-hover/row:bg-slate-800 text-slate-700 group-hover/row:text-slate-200 font-semibold flex items-center justify-center text-[11px] border border-slate-200 group-hover/row:border-slate-700 shrink-0 transition-colors">
                                  {getInitials(v.namaSiswa || "")}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 group-hover/row:text-white block transition-colors">
                                    {v.namaSiswa}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    NIS: {v.nis}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-700 group-hover/row:text-slate-200">
                              {v.kelas}
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className="font-semibold text-slate-800 group-hover/row:text-white block transition-colors">
                                {v.namaPelanggaran}
                              </span>
                              {v.keterangan && (
                                <span className="block text-[11px] text-slate-500 group-hover/row:text-slate-400 italic mt-0.5">
                                  &ldquo;{v.keterangan}&rdquo;
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              <Badge
                                variant="secondary"
                                className={`text-[10px] font-semibold transition-colors ${
                                  v.kategori === "Ringan"
                                    ? "bg-blue-50 text-blue-700 group-hover/row:bg-blue-500/20 group-hover/row:text-blue-200"
                                    : v.kategori === "Sedang"
                                    ? "bg-amber-50 text-amber-700 group-hover/row:bg-amber-500/20 group-hover/row:text-amber-200"
                                    : "bg-red-50 text-red-700 group-hover/row:bg-rose-500/25 group-hover/row:text-rose-200"
                                }`}
                              >
                                {v.kategori}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className={cn(
                                "text-center font-bold text-xs font-mono",
                                v.status === "Selesai Dibina"
                                  ? "text-slate-400 line-through"
                                  : "text-red-600 group-hover/row:text-red-400"
                              )}
                            >
                              +{v.poin}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 group-hover/row:text-slate-300">
                              {v.lokasi || "-"}
                            </TableCell>
                            <TableCell className="text-xs">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded transition-colors ${
                                  v.status === "Selesai Dibina"
                                    ? "bg-emerald-50 text-emerald-700 group-hover/row:bg-emerald-500/20 group-hover/row:text-emerald-200"
                                    : v.status === "Diproses BK"
                                    ? "bg-amber-50 text-amber-700 group-hover/row:bg-amber-500/20 group-hover/row:text-amber-200"
                                    : "bg-slate-100 text-slate-700 group-hover/row:bg-slate-800 group-hover/row:text-slate-200"
                                }`}
                              >
                                {v.status === "Selesai Dibina" ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 group-hover/row:text-emerald-300" />
                                ) : (
                                  <Clock className="w-3 h-3 text-amber-600 group-hover/row:text-amber-300" />
                                )}
                                {v.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right pr-4 space-x-1 whitespace-nowrap">
                              {v.status === "Selesai Dibina" ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={busyViolationId === v.id}
                                  onClick={() => handleUpdateViolationStatus(v.id, "Tercatat")}
                                  className="h-7 px-2 text-xs text-amber-700 group-hover/row:text-amber-300 group-hover/row:hover:bg-amber-500/25 group-hover/row:hover:text-amber-100 transition-colors cursor-pointer"
                                  title="Aktifkan kembali catatan ke akumulasi poin"
                                >
                                  <Clock className="w-3.5 h-3.5 mr-1" />
                                  Aktifkan
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={busyViolationId === v.id}
                                  onClick={() => handleUpdateViolationStatus(v.id, "Selesai Dibina")}
                                  className="h-7 px-2 text-xs text-emerald-600 group-hover/row:text-emerald-300 group-hover/row:hover:bg-emerald-500/25 group-hover/row:hover:text-emerald-100 transition-colors cursor-pointer"
                                  title="Tandai Selesai Dibina dan kurangi poin aktif"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  Selesai
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={busyViolationId === v.id}
                                onClick={() => handleDeleteViolation(v.id)}
                                className="h-7 px-2 text-xs text-red-600 group-hover/row:text-rose-300 group-hover/row:hover:bg-rose-500/25 group-hover/row:hover:text-rose-100 transition-colors cursor-pointer"
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
              </div>
            </div>
          )}

          {/* ================= TAB 3: ARSIP SURAT PERINGATAN (SP) ================= */}
          {activeTab === "letters" && (
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e5dcc9]">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Arsip Surat Peringatan (SP)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Daftar surat peringatan resmi yang telah diterbitkan dan siap dicetak
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500 mr-1">Kelas:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedClass("all")}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-full font-semibold transition-colors cursor-pointer",
                      selectedClass === "all"
                        ? "bg-[#0d1e38] text-white"
                        : "bg-[#efe9dc] text-slate-600 hover:bg-[#e5dcc9]"
                    )}
                  >
                    Semua
                  </button>
                  {classesList.map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setSelectedClass(cls)}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded-full font-semibold transition-colors cursor-pointer",
                        selectedClass === cls
                          ? "bg-[#0d1e38] text-white"
                          : "bg-[#efe9dc] text-slate-600 hover:bg-[#e5dcc9]"
                      )}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#e5dcc9] bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f6f1e6]">
                        <TableHead className="w-12 text-center text-xs">No</TableHead>
                        <TableHead className="text-xs">Nomor Surat SP</TableHead>
                        <TableHead className="text-center text-xs">Tingkat</TableHead>
                        <TableHead className="text-xs">Siswa</TableHead>
                        <TableHead className="text-xs">Kelas</TableHead>
                        <TableHead className="text-center text-xs">Akumulasi Poin</TableHead>
                        <TableHead className="text-xs">Tanggal Terbit</TableHead>
                        <TableHead className="text-xs">Diterbitkan Oleh</TableHead>
                        <TableHead className="text-xs">Status Panggilan</TableHead>
                        <TableHead className="text-right text-xs pr-4">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWarningLetters.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-10 text-xs text-slate-500">
                            Belum ada Surat Peringatan (SP) yang diterbitkan.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredWarningLetters.map((l, i) => (
                          <TableRow
                            key={l.id}
                            className="group/row transition-all duration-200 hover:bg-[#091524] border-b border-slate-100 last:border-0"
                          >
                            <TableCell className="text-center text-xs text-slate-500 group-hover/row:text-slate-400">
                              {i + 1}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-semibold text-slate-800 group-hover/row:text-white">
                              {l.nomorSurat}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 group-hover/row:bg-rose-500/25 group-hover/row:text-rose-200 transition-colors">
                                SP {l.tingkatSp}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-md bg-slate-100 group-hover/row:bg-slate-800 text-slate-700 group-hover/row:text-slate-200 font-semibold flex items-center justify-center text-[11px] border border-slate-200 group-hover/row:border-slate-700 shrink-0 transition-colors">
                                  {getInitials(l.namaSiswa || "")}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 group-hover/row:text-white block transition-colors">
                                    {l.namaSiswa}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    NIS: {l.nis}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-700 group-hover/row:text-slate-200">
                              {l.kelas}
                            </TableCell>
                            <TableCell className="text-center text-xs font-bold font-mono text-red-600 group-hover/row:text-red-400">
                              {l.totalPoinSaatSp} Poin
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 group-hover/row:text-slate-300 font-mono">
                              {formatShortDateId(l.tanggalTerbit)}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 group-hover/row:text-slate-300">
                              {l.diterbitkanOleh}
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className="text-[11px] font-medium text-slate-700 group-hover/row:text-slate-200">
                                {l.statusPanggilan}
                              </span>
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenPrintPreview(l)}
                                className="h-7 px-2.5 text-xs bg-blue-50/70 text-[#1F4E78] border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 inline-flex items-center gap-1 group-hover/row:bg-blue-500/20 group-hover/row:border-blue-400/60 group-hover/row:text-blue-100 group-hover/row:hover:bg-blue-600 group-hover/row:hover:text-white group-hover/row:hover:border-blue-500 transition-colors cursor-pointer"
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
              </div>
            </div>
          )}

          {/* ================= TAB 4: KATALOG & ATURAN SANKSI ================= */}
          {activeTab === "rules" && (
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e5dcc9]">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Katalog Jenis Pelanggaran dan Bobot Poin Baku
                  </h2>
                  <p className="text-xs text-slate-500">
                    Dapat disesuaikan sewaktu-waktu sesuai buku tata tertib resmi sekolah
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingRule({ kategori: "Ringan", poinDefault: 10 });
                    setRulePoinInput("10");
                    setRuleModalOpen(true);
                  }}
                  className="bg-[#0d1e38] hover:bg-[#162f54] text-white text-xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Aturan Baru</span>
                </Button>
              </div>

              <div className="rounded-xl border border-[#e5dcc9] bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#f6f1e6]">
                        <TableHead className="w-24 text-xs">Kode</TableHead>
                        <TableHead className="text-xs">Pelanggaran Disiplin</TableHead>
                        <TableHead className="w-28 text-center text-xs">Kategori</TableHead>
                        <TableHead className="w-28 text-center text-xs">Poin Default</TableHead>
                        <TableHead className="text-xs">Arahan Tindakan Sanksi</TableHead>
                        <TableHead className="w-20 text-right text-xs pr-4">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {violationTypesList.map((t) => (
                        <TableRow
                          key={t.id}
                          className="group/row transition-all duration-200 hover:bg-[#091524] border-b border-slate-100 last:border-0"
                        >
                          <TableCell className="font-mono text-xs font-bold text-slate-700 group-hover/row:text-slate-200">
                            {t.kode}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-slate-900 group-hover/row:text-white">
                            {t.namaPelanggaran}
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] font-semibold transition-colors ${
                                t.kategori === "Ringan"
                                  ? "bg-blue-50 text-blue-700 group-hover/row:bg-blue-500/20 group-hover/row:text-blue-200"
                                  : t.kategori === "Sedang"
                                  ? "bg-amber-50 text-amber-700 group-hover/row:bg-amber-500/20 group-hover/row:text-amber-200"
                                  : "bg-red-50 text-red-700 group-hover/row:bg-rose-500/25 group-hover/row:text-rose-200"
                              }`}
                            >
                              {t.kategori}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs font-bold font-mono text-red-600 group-hover/row:text-red-400">
                            +{t.poinDefault} Poin
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 group-hover/row:text-slate-300">
                            {t.deskripsiSanksi || "-"}
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingRule(t);
                                setRulePoinInput(String(t.poinDefault));
                                setRuleModalOpen(true);
                              }}
                              className="h-7 px-2 text-xs text-blue-600 group-hover/row:text-sky-300 group-hover/row:hover:bg-sky-500/25 group-hover/row:hover:text-sky-100 transition-colors cursor-pointer"
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Catat Pelanggaran Cepat */}
      <QuickViolationModal
        open={quickModalOpen}
        onOpenChange={setQuickModalOpen}
        onSuccess={(recordedStudentId) => {
          if (recordedStudentId) {
            setSelectedStudentId(recordedStudentId);
          }
          toast.success("Catatan pelanggaran disimpan dan poin aktif diperbarui");
          loadData();
        }}
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

      {/* MODAL 3: Form Tambah dan Edit Aturan Pelanggaran */}
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
                  onValueChange={(val) =>
                    setEditingRule({
                      ...editingRule,
                      kategori: (val as "Ringan" | "Sedang" | "Berat") || "Ringan",
                    })
                  }
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue>{(val) => val || "Ringan"}</SelectValue>
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
                onChange={(e) =>
                  setEditingRule({ ...editingRule, namaPelanggaran: e.target.value })
                }
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Bobot Poin Baku</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="1 sampai 100"
                value={rulePoinInput}
                onChange={(e) => setRulePoinInput(sanitizePoinInput(e.target.value))}
                className="text-xs font-mono font-bold"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Arahan Tindakan Sanksi atau Pembinaan</Label>
              <Input
                placeholder="Contoh: Teguran lisan & pemanggilan orang tua"
                value={editingRule?.deskripsiSanksi || ""}
                onChange={(e) =>
                  setEditingRule({ ...editingRule, deskripsiSanksi: e.target.value })
                }
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setRuleModalOpen(false)}
                className="cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={ruleSubmitting}
                className="bg-[#0d1e38] hover:bg-[#162f54] text-white cursor-pointer"
              >
                {ruleSubmitting ? "Menyimpan..." : "Simpan Aturan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Terbitkan Surat Peringatan (SP) Baru */}
      <Dialog open={spModalOpen} onOpenChange={setSpModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-red-600" />
              <span>Terbitkan Surat Peringatan (SP)</span>
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Siswa: <strong>{targetStudentForSp?.namaLengkap}</strong> ({targetStudentForSp?.kelas}) • Akumulasi:{" "}
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
                  <SelectValue>{(val) => getSpTingkatLabel(val || 1)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" className="text-xs">Surat Peringatan I (SP 1)</SelectItem>
                  <SelectItem value="2" className="text-xs">Surat Peringatan II (SP 2)</SelectItem>
                  <SelectItem value="3" className="text-xs">
                    Surat Peringatan III (SP 3 atau Terakhir)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Catatan Mediasi atau Jadwal Pemanggilan Orang Tua</Label>
              <Input
                placeholder="Contoh: Pemanggilan wali murid hari Senin jam 09.00 WIB"
                value={spCatatan}
                onChange={(e) => setSpCatatan(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSpModalOpen(false)}
                className="cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={spSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                {spSubmitting ? "Menerbitkan..." : "Terbitkan SP Resmi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: Pengaturan Ambang Batas Meter Poin (Khusus Admin) */}
      <Dialog open={thresholdModalOpen} onOpenChange={setThresholdModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#0d1e38]" />
              <span>Atur Ambang Batas Meter Poin</span>
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Sesuaikan batas akumulasi poin untuk pembinaan lisan dan penerbitan SP 1, SP 2, serta SP 3.
            </p>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Pembinaan Lisan</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={thresholdForm.PEMBINAAN_LISAN}
                onChange={(e) =>
                  setThresholdForm((prev) => ({
                    ...prev,
                    PEMBINAAN_LISAN: sanitizeThresholdInput(e.target.value),
                  }))
                }
                className="h-9 text-xs font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Batas SP 1</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={thresholdForm.SP_1}
                onChange={(e) =>
                  setThresholdForm((prev) => ({
                    ...prev,
                    SP_1: sanitizeThresholdInput(e.target.value),
                  }))
                }
                className="h-9 text-xs font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Batas SP 2</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={thresholdForm.SP_2}
                onChange={(e) =>
                  setThresholdForm((prev) => ({
                    ...prev,
                    SP_2: sanitizeThresholdInput(e.target.value),
                  }))
                }
                className="h-9 text-xs font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Batas SP 3 (Maks. Meter)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={thresholdForm.SP_3}
                onChange={(e) =>
                  setThresholdForm((prev) => ({
                    ...prev,
                    SP_3: sanitizeThresholdInput(e.target.value),
                  }))
                }
                className="h-9 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={savingThresholds}
              onClick={() => handleSaveThresholds(true)}
              className="text-xs text-slate-600 hover:text-slate-900 gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Default (30-50-75-100)
            </Button>
            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={savingThresholds}
                onClick={() => setThresholdModalOpen(false)}
                className="cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={savingThresholds}
                onClick={() => handleSaveThresholds(false)}
                className="bg-[#0d1e38] hover:bg-[#162f54] text-white cursor-pointer"
              >
                {savingThresholds ? "Menyimpan..." : "Simpan Ambang"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
