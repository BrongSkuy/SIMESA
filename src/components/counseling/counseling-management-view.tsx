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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HeartHandshake,
  CheckCircle2,
  FileText,
  Search,
  Plus,
  Printer,
  Trash2,
  Loader2,
  AlertCircle,
  Lock,
  GraduationCap,
  Calendar,
  Clock,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  CounselingSessionItem,
  StudentMonitoringLogItem,
  DispensationLetterItem,
  CounselingOverviewSummary,
  CaseStatus,
  DispensationStatus,
  formatTanggalIndonesia,
  formatRentangWaktu,
  resolveFilterSelectLabel,
  MONITORING_ASPECTS,
} from "@/lib/counseling";
import {
  QuickCounselingModal,
  StudentOption,
} from "./quick-counseling-modal";
import { DispensationPrintModal } from "./dispensation-print-modal";
import { cn } from "@/lib/utils";

function formatShortDateId(dateStr: string): string {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  return `${String(d).padStart(2, "0")} ${months[m - 1] || ""} ${y}`;
}

function getStatusDotMeta(status: CaseStatus): {
  dot: string;
  text: string;
  label: string;
} {
  switch (status) {
    case "Selesai":
      return {
        dot: "bg-emerald-500",
        text: "text-emerald-700",
        label: "Selesai",
      };
    case "Rujukan Kasus":
      return {
        dot: "bg-indigo-500",
        text: "text-indigo-700",
        label: "Rujukan",
      };
    default:
      return {
        dot: "bg-amber-500",
        text: "text-amber-700",
        label: "Dipantau",
      };
  }
}

function getDispStatusBadgeClass(status: DispensationStatus): string {
  switch (status) {
    case "Aktif":
      return "bg-amber-50 text-amber-800 border-amber-200 group-hover/row:bg-amber-500/20 group-hover/row:text-amber-200 group-hover/row:border-amber-400/40";
    case "Selesai":
      return "bg-emerald-50 text-emerald-800 border-emerald-200 group-hover/row:bg-emerald-500/20 group-hover/row:text-emerald-200 group-hover/row:border-emerald-400/40";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200 group-hover/row:bg-slate-700 group-hover/row:text-slate-200 group-hover/row:border-slate-600";
  }
}

type BkTabKey = "sessions" | "monitoring" | "dispensations";

const BK_TABS: Array<{ key: BkTabKey; label: string }> = [
  { key: "sessions", label: "Sesi Konseling" },
  { key: "monitoring", label: "Catatan Pantauan" },
  { key: "dispensations", label: "Surat Dispensasi" },
];

const STATUS_SWITCH_OPTIONS: Array<{
  value: CaseStatus;
  label: string;
  dot: string;
  activeText: string;
}> = [
    {
      value: "Dalam Pemantauan",
      label: "Dipantau",
      dot: "bg-amber-500",
      activeText: "text-amber-800",
    },
    {
      value: "Rujukan Kasus",
      label: "Rujukan",
      dot: "bg-indigo-500",
      activeText: "text-indigo-800",
    },
    {
      value: "Selesai",
      label: "Selesai",
      dot: "bg-emerald-500",
      activeText: "text-emerald-800",
    },
  ];

export function CounselingManagementView() {
  const [activeTab, setActiveTab] = useState<BkTabKey>("sessions");
  const [loading, setLoading] = useState(true);
  const [headerBgLoaded, setHeaderBgLoaded] = useState(true);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const fetchReqIdRef = useRef(0);

  // Data states
  const [summary, setSummary] = useState<CounselingOverviewSummary>({
    totalSesiBulanIni: 0,
    totalDalamPemantauan: 0,
    totalSelesai: 0,
    totalDispensasiHariIni: 0,
  });
  const [sessions, setSessions] = useState<CounselingSessionItem[]>([]);
  const [monitoringLogs, setMonitoringLogs] = useState<StudentMonitoringLogItem[]>([]);
  const [dispensations, setDispensations] = useState<DispensationLetterItem[]>([]);
  const [studentsList, setStudentsList] = useState<StudentOption[]>([]);

  // Minimalist filters & active selection for Tab 1
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionQuickFilter, setSessionQuickFilter] = useState<"all" | "dipantau" | "rahasia">("all");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Filters for Tab 2 & Tab 3
  const [searchMonitoring, setSearchMonitoring] = useState("");
  const [filterAspect, setFilterAspect] = useState("all");
  const [filterMonitoringKelas, setFilterMonitoringKelas] = useState("all");

  const [searchDispensation, setSearchDispensation] = useState("");
  const [filterDispStatus, setFilterDispStatus] = useState("all");

  // Modal controls
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"counseling" | "monitoring" | "dispensation">("counseling");
  const [modalDefaultStudentId, setModalDefaultStudentId] = useState<string | undefined>();
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedDispensation, setSelectedDispensation] = useState<DispensationLetterItem | null>(null);

  // Fetch all data with no-store & race guard
  const fetchData = useCallback(async () => {
    const reqId = ++fetchReqIdRef.current;
    setLoading(true);
    try {
      const [sumRes, sessRes, logRes, dispRes, studRes] = await Promise.all([
        fetch("/api/counseling/overview", { cache: "no-store" }),
        fetch("/api/counseling/sessions", { cache: "no-store" }),
        fetch("/api/counseling/monitoring", { cache: "no-store" }),
        fetch("/api/counseling/dispensation", { cache: "no-store" }),
        fetch("/api/students", { cache: "no-store" }),
      ]);

      if (reqId !== fetchReqIdRef.current) return;

      if (sumRes.ok) setSummary(await sumRes.json());
      if (sessRes.ok) setSessions(await sessRes.json());
      if (logRes.ok) setMonitoringLogs(await logRes.json());
      if (dispRes.ok) setDispensations(await dispRes.json());
      if (studRes.ok) {
        const rawStud = await studRes.json();
        const mapped = (Array.isArray(rawStud) ? rawStud : rawStud.data || []).map(
          (s: { id: string; namaLengkap?: string; nama?: string; nis: string; kelas: string }) => ({
            id: s.id,
            namaLengkap: s.namaLengkap || s.nama || "Siswa",
            nis: s.nis,
            kelas: s.kelas,
          })
        );
        setStudentsList(mapped);
      }
    } catch (err) {
      console.error("Error loading counseling data:", err);
      toast.error("Gagal memuat data layanan konseling BK");
    } finally {
      if (reqId === fetchReqIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    studentsList.forEach((s) => {
      if (s.kelas) set.add(s.kelas);
    });
    return Array.from(set).sort();
  }, [studentsList]);

  // Filtered sessions for Left Panel
  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sessions.filter((s) => {
      if (sessionQuickFilter === "dipantau" && s.statusKasus !== "Dalam Pemantauan") {
        return false;
      }
      if (sessionQuickFilter === "rahasia" && s.tingkatKerahasiaan !== "Rahasia") {
        return false;
      }
      if (q) {
        const hay = `${s.studentName || ""} ${s.studentNis || ""} ${s.studentKelas || ""} ${s.kategori} ${s.pokokMasalah}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sessions, sessionQuickFilter, searchQuery]);

  // Active session displayed on Right Panel
  const activeSession = useMemo(() => {
    if (filteredSessions.length === 0) return null;
    if (selectedSessionId) {
      const found = filteredSessions.find((s) => s.id === selectedSessionId);
      if (found) return found;
    }
    return filteredSessions[0];
  }, [filteredSessions, selectedSessionId]);

  // Filtered monitoring logs
  const filteredLogs = useMemo(() => {
    const q = searchMonitoring.trim().toLowerCase();
    return monitoringLogs.filter((l) => {
      if (filterAspect !== "all" && l.aspekPengamatan !== filterAspect) return false;
      if (filterMonitoringKelas !== "all" && l.studentKelas !== filterMonitoringKelas) return false;
      if (q) {
        const hay = `${l.studentName || ""} ${l.studentNis || ""} ${l.catatanPerkembangan}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [monitoringLogs, filterAspect, filterMonitoringKelas, searchMonitoring]);

  // Filtered dispensations
  const filteredDispensations = useMemo(() => {
    const q = searchDispensation.trim().toLowerCase();
    return dispensations.filter((d) => {
      if (filterDispStatus !== "all" && d.statusDispensasi !== filterDispStatus) return false;
      if (q) {
        const hay = `${d.nomorSurat} ${d.studentName || ""} ${d.studentNis || ""} ${d.keperluan}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dispensations, filterDispStatus, searchDispensation]);

  const openModal = (
    mode: "counseling" | "monitoring" | "dispensation",
    studentId?: string
  ) => {
    setModalMode(mode);
    setModalDefaultStudentId(studentId);
    setModalOpen(true);
  };

  const handlePrintDispensation = (item: DispensationLetterItem) => {
    setSelectedDispensation(item);
    setPrintModalOpen(true);
  };

  const handleUpdateSessionStatus = async (sessionId: string, newStatus: CaseStatus) => {
    if (busyActionId === sessionId) return;
    setBusyActionId(sessionId);
    try {
      const res = await fetch(`/api/counseling/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusKasus: newStatus }),
      });
      if (res.ok) {
        toast.success(`Status diperbarui menjadi ${newStatus}`);
        await fetchData();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Gagal memperbarui status sesi");
      }
    } catch (err) {
      console.error("Error updating session status:", err);
      toast.error("Gagal memperbarui status sesi");
    } finally {
      setBusyActionId(null);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (busyActionId === sessionId) return;
    if (!confirm("Hapus catatan sesi konseling ini?")) return;
    setBusyActionId(sessionId);
    try {
      const res = await fetch(`/api/counseling/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Catatan sesi konseling dihapus");
        if (selectedSessionId === sessionId) {
          setSelectedSessionId(null);
        }
        await fetchData();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Gagal menghapus sesi konseling");
      }
    } catch (err) {
      console.error("Error deleting session:", err);
      toast.error("Gagal menghapus sesi konseling");
    } finally {
      setBusyActionId(null);
    }
  };

  const handleUpdateDispensationStatus = async (
    dispId: string,
    newStatus: DispensationStatus
  ) => {
    if (busyActionId === dispId) return;
    setBusyActionId(dispId);
    try {
      const res = await fetch("/api/counseling/dispensation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dispId, statusDispensasi: newStatus }),
      });
      if (res.ok) {
        toast.success(`Status dispensasi diperbarui menjadi ${newStatus}`);
        await fetchData();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Gagal memperbarui status dispensasi");
      }
    } catch (err) {
      console.error("Error updating dispensation status:", err);
      toast.error("Gagal memperbarui status dispensasi");
    } finally {
      setBusyActionId(null);
    }
  };

  return (
    <div className="space-y-0 pb-10">
      {/* 1. HEADER TENANG & MINIMALIS (Deep Forest-Teal + 1 Foto Ruang Konseling + 1 Strip Metrik Putih) */}
      <section className="relative overflow-hidden -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10 pt-6 pb-16 sm:pb-20 bg-[#071b20] border-b border-white/10 text-white">
        {headerBgLoaded && (
          <Image
            src="/bg-konseling-bk.jpg"
            alt=""
            fill
            sizes="100vw"
            unoptimized
            priority
            className="object-cover object-right opacity-30 mix-blend-luminosity filter contrast-125 brightness-95 pointer-events-none select-none"
            onError={() => setHeaderBgLoaded(false)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#071b20] via-[#0a242b]/88 to-[#0e323c]/45 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#071b20]/40 via-transparent to-[#071b20]/90 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto space-y-5">
          {/* Baris Atas: Judul Ringkas & 2 Aksi Utama */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Bimbingan Konseling
              </h1>
              <p className="text-xs sm:text-sm text-teal-100/75">
                Pendampingan siswa, catatan sesi, dan surat dispensasi kelas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => openModal("dispensation")}
                className="inline-flex items-center bg-white/[0.07] hover:bg-white/15 active:bg-white/20 border border-white/20 rounded-xl px-4 py-2 text-xs font-semibold text-white backdrop-blur-xs transition-all cursor-pointer"
              >
                Buat Dispensasi
              </button>
              <button
                type="button"
                onClick={() => openModal("counseling")}
                className="inline-flex items-center bg-teal-600 hover:bg-teal-500 active:bg-teal-700 border border-teal-400/30 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Catat Konseling
              </button>
            </div>
          </div>

          {/* 1 Strip Metrik Kaca Netral (Angka Putih Seragam, Bebas Warna Pelangi) */}
          <div className="max-w-xl rounded-xl bg-white/[0.07] backdrop-blur-md border border-white/15 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/12">
            <button
              type="button"
              onClick={() => {
                setActiveTab("sessions");
                setSessionQuickFilter("all");
              }}
              className="px-4 py-2.5 text-left hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              <span className="font-mono font-bold text-base text-white tabular-nums block leading-tight">
                {loading ? "..." : summary.totalSesiBulanIni}
              </span>
              <span className="text-[11px] text-teal-100/70">Sesi Bulan Ini</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("sessions");
                setSessionQuickFilter("dipantau");
              }}
              className="px-4 py-2.5 text-left hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              <span className="font-mono font-bold text-base text-white tabular-nums block leading-tight">
                {loading ? "..." : summary.totalDalamPemantauan}
              </span>
              <span className="text-[11px] text-teal-100/70">Dipantau</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("sessions");
                setSessionQuickFilter("all");
              }}
              className="px-4 py-2.5 text-left hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              <span className="font-mono font-bold text-base text-white tabular-nums block leading-tight">
                {loading ? "..." : summary.totalSelesai}
              </span>
              <span className="text-[11px] text-teal-100/70">Selesai</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("dispensations")}
              className="px-4 py-2.5 text-left hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              <span className="font-mono font-bold text-base text-white tabular-nums block leading-tight">
                {loading ? "..." : summary.totalDispensasiHariIni}
              </span>
              <span className="text-[11px] text-teal-100/70">Dispensasi</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. RUANG KONSELING TERBUKA (TAB SENADA + WADAH SAGE-PUTIH BERSIH) */}
      <div className="relative z-20 max-w-7xl mx-auto px-0 sm:px-2 lg:px-4 -mt-11 sm:-mt-12">
        {/* Tab Senada di Kanan Atas (Transparan Gelap saat Nonaktif, Menyatu Sage-Putih saat Aktif) */}
        <div className="flex flex-wrap items-end justify-end pr-4 sm:pr-7 gap-1.5">
          {BK_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2 rounded-t-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none border-t border-x",
                  isActive
                    ? "bg-[#F6FAF8] text-slate-900 border-[#d6e5df] translate-y-[1px] relative z-30 font-bold"
                    : "bg-white/[0.08] text-teal-100/85 border-white/10 hover:bg-white/15 hover:text-white backdrop-blur-xs"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Wadah Utama */}
        <div className="relative rounded-2xl border border-[#d6e5df] bg-[#F6FAF8] shadow-[0_18px_40px_-22px_rgba(7,27,32,0.25)] overflow-hidden">
          {/* ================= TAB 1: SESI KONSELING (SPLIT-PANE MINIMALIS) ================= */}
          {activeTab === "sessions" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
              {/* PANEL KIRI: DAFTAR SESI */}
              <div className="lg:col-span-5 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-[#e0ede8] flex flex-col gap-3">
                {/* Pencarian + 3 Pil Filter Tanpa Label Berlebih */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Cari siswa atau topik..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8.5 text-xs bg-white border-[#d6e5df] focus-visible:border-teal-700"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(
                      [
                        { id: "all", label: "Semua" },
                        { id: "dipantau", label: "Dipantau" },
                        { id: "rahasia", label: "Rahasia" },
                      ] as const
                    ).map((seg) => (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => setSessionQuickFilter(seg.id)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer",
                          sessionQuickFilter === seg.id
                            ? "bg-[#0c2d34] text-white"
                            : "text-slate-600 hover:bg-[#e5f1ec]"
                        )}
                      >
                        {seg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Daftar Ringkas Tanpa Pil Warna-Warni Berlebihan */}
                <div className="flex-1 overflow-y-auto max-h-[450px] space-y-1.5 pr-0.5">
                  {loading ? (
                    <div className="py-16 text-center text-xs text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-700" />
                      Memuat daftar sesi...
                    </div>
                  ) : filteredSessions.length === 0 ? (
                    <div className="py-14 text-center text-xs text-slate-500">
                      Tidak ada sesi yang sesuai.
                    </div>
                  ) : (
                    filteredSessions.map((item) => {
                      const isSelected = activeSession?.id === item.id;
                      const isSecret = item.tingkatKerahasiaan === "Rahasia";
                      const st = getStatusDotMeta(item.statusKasus);

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedSessionId(item.id)}
                          className={cn(
                            "w-full text-left px-3.5 py-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                            isSelected
                              ? "bg-[#e5f3ee] border-[#c0dfd5] border-l-[3px] border-l-teal-700"
                              : "bg-white/85 border-transparent hover:bg-white hover:border-[#dcebe6]"
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {item.studentName}
                              </p>
                              <span className="text-[11px] font-mono text-slate-400 shrink-0">
                                {item.studentKelas}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {item.kategori}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isSecret && (
                              <span
                                title="Catatan Rahasia BK"
                                className="text-indigo-700"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            )}
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap",
                                st.text
                              )}
                            >
                              <span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
                              {st.label}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* PANEL KANAN: LEMBAR CATATAN SESI (BERSIH, TANPA DUPLIKASI & KOTAK BERSARANG) */}
              <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col">
                {!activeSession ? (
                  <div className="flex-1 rounded-2xl bg-white border border-[#e0ede8] flex flex-col items-center justify-center text-center p-10 text-slate-500 space-y-1.5">
                    <HeartHandshake className="w-7 h-7 text-teal-300" />
                    <p className="text-sm font-semibold text-slate-700">
                      Pilih sesi di sisi kiri
                    </p>
                    <p className="text-xs text-slate-400">
                      Catatan lengkap sesi konseling akan tampil di sini.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 rounded-2xl bg-white border border-[#e0ede8] p-5 sm:p-6 flex flex-col justify-between gap-6">
                    <div className="space-y-5">
                      {/* Header Identitas: Nama + Meta Terstruktur Berikon + Kategori */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-2">
                          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                            {activeSession.studentName}
                          </h2>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <GraduationCap className="w-3.5 h-3.5 text-teal-700/70 shrink-0" />
                              <span>Kelas {activeSession.studentKelas}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-teal-700/70 shrink-0" />
                              <span>{formatShortDateId(activeSession.tanggal)}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px]">
                              <Clock className="w-3.5 h-3.5 text-teal-700/70 shrink-0" />
                              <span>
                                {activeSession.waktuMulai} - {activeSession.waktuSelesai} WIB
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-teal-700/70 shrink-0" />
                              <span>
                                Konselor: {activeSession.counselorName || "Guru BK"}
                              </span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                            {activeSession.kategori}
                          </span>
                          {activeSession.tingkatKerahasiaan === "Rahasia" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-950 text-white">
                              <Lock className="w-3 h-3" />
                              Rahasia
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 1 Kontrol Status Tunggal (Segmented Switch) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                        <span className="text-xs font-medium text-slate-500">
                          Status penanganan
                        </span>
                        <div
                          role="radiogroup"
                          aria-label="Status penanganan sesi"
                          className="inline-grid grid-cols-3 p-1 rounded-xl bg-slate-100/90 gap-1 w-full sm:w-auto"
                        >
                          {STATUS_SWITCH_OPTIONS.map((opt) => {
                            const isCurrent = activeSession.statusKasus === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                role="radio"
                                aria-checked={isCurrent}
                                disabled={busyActionId === activeSession.id || isCurrent}
                                onClick={() =>
                                  handleUpdateSessionStatus(activeSession.id, opt.value)
                                }
                                className={cn(
                                  "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                                  isCurrent
                                    ? `bg-white ${opt.activeText} shadow-2xs cursor-default`
                                    : "text-slate-500 hover:text-slate-800 hover:bg-white/60 cursor-pointer disabled:opacity-60"
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                    isCurrent ? opt.dot : "bg-slate-300"
                                  )}
                                />
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Catatan Konseling Langsung — Tipografi Bersih Tanpa Kotak Bersarang & Tanpa Ikon Dekoratif */}
                      <div className="divide-y divide-slate-100">
                        <div className="pb-4 space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Pokok Masalah
                          </p>
                          <p className="text-[13.5px] text-slate-800 leading-relaxed">
                            {activeSession.pokokMasalah}
                          </p>
                        </div>

                        <div className="py-4 space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Pendekatan dan Solusi
                          </p>
                          <p
                            className={cn(
                              "text-[13.5px] leading-relaxed",
                              activeSession.pendekatanKonseling
                                ? "text-slate-800"
                                : "text-slate-400 italic"
                            )}
                          >
                            {activeSession.pendekatanKonseling || "Belum diisi"}
                          </p>
                        </div>

                        <div className="pt-4 space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Rencana Tindak Lanjut
                          </p>
                          <p
                            className={cn(
                              "text-[13.5px] leading-relaxed",
                              activeSession.tindakLanjut
                                ? "text-slate-800"
                                : "text-slate-400 italic"
                            )}
                          >
                            {activeSession.tindakLanjut || "Belum diisi"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer Lembar: Info Sekunder Kiri + 2 Aksi Non-Duplikat Kanan */}
                    <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                        <span>Layanan: {activeSession.jenisLayanan}</span>
                        <span>•</span>
                        <span className="font-mono">NIS {activeSession.studentNis}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openModal("dispensation", activeSession.studentId)}
                          className="h-8.5 px-3.5 text-xs font-semibold bg-white border-slate-300 text-slate-800 hover:bg-[#0c2d34] hover:text-white hover:border-[#0c2d34] rounded-lg transition-colors cursor-pointer"
                        >
                          Buat Dispensasi
                        </Button>
                        <button
                          type="button"
                          disabled={busyActionId === activeSession.id}
                          onClick={() => handleDeleteSession(activeSession.id)}
                          className="h-8.5 w-8.5 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 disabled:opacity-50 transition-colors cursor-pointer"
                          title="Hapus Sesi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 2: CATATAN PANTAUAN ================= */}
          {activeTab === "monitoring" && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-2.5">
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 flex-1">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Cari siswa atau catatan..."
                      value={searchMonitoring}
                      onChange={(e) => setSearchMonitoring(e.target.value)}
                      className="pl-8.5 h-9 text-xs bg-white border-[#d6e5df]"
                    />
                  </div>

                  <Select
                    value={filterAspect}
                    onValueChange={(val) => {
                      if (val) setFilterAspect(val);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[205px] h-9 text-xs bg-white border-[#d6e5df] whitespace-nowrap cursor-pointer">
                      <SelectValue>
                        {(val) => resolveFilterSelectLabel(val, "Semua Aspek")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Semua Aspek</SelectItem>
                      {MONITORING_ASPECTS.map((asp) => (
                        <SelectItem key={asp} value={asp} className="text-xs">
                          {asp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filterMonitoringKelas}
                    onValueChange={(val) => {
                      if (val) setFilterMonitoringKelas(val);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs bg-white border-[#d6e5df] whitespace-nowrap cursor-pointer">
                      <SelectValue>
                        {(val) => resolveFilterSelectLabel(val, "Semua Kelas")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Semua Kelas</SelectItem>
                      {uniqueClasses.map((k) => (
                        <SelectItem key={k} value={k} className="text-xs">
                          {k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => openModal("monitoring")}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-9 px-3.5 gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Catatan
                </Button>
              </div>

              <div className="rounded-xl border border-[#e0ede8] bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[#f0f7f4]">
                      <TableRow>
                        <TableHead className="w-[120px] text-xs font-semibold">Tanggal</TableHead>
                        <TableHead className="text-xs font-semibold">Siswa</TableHead>
                        <TableHead className="text-xs font-semibold">Aspek</TableHead>
                        <TableHead className="text-xs font-semibold">Catatan Perkembangan</TableHead>
                        <TableHead className="text-xs font-semibold">Rekomendasi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-28 text-center text-xs text-slate-500">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-700" />
                            Memuat catatan pantauan...
                          </TableCell>
                        </TableRow>
                      ) : filteredLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-28 text-center text-xs text-slate-500">
                            <AlertCircle className="w-5 h-5 mx-auto mb-1.5 opacity-40 text-teal-600" />
                            Belum ada catatan pantauan.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLogs.map((log) => (
                          <TableRow
                            key={log.id}
                            className="group/row transition-all duration-200 hover:bg-[#091524] border-b border-slate-100 last:border-0"
                          >
                            <TableCell className="text-xs font-mono text-slate-700 group-hover/row:text-slate-300 whitespace-nowrap align-top">
                              {formatShortDateId(log.tanggal)}
                            </TableCell>
                            <TableCell className="align-top text-xs">
                              <span className="font-bold text-slate-900 group-hover/row:text-white block">
                                {log.studentName}
                              </span>
                              <span className="text-[11px] text-slate-500 group-hover/row:text-slate-400">
                                Kelas {log.studentKelas} • Pengamat: {log.recorderName}
                              </span>
                            </TableCell>
                            <TableCell className="align-top">
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200 group-hover/row:bg-teal-500/20 group-hover/row:text-teal-200 group-hover/row:border-teal-400/40 whitespace-nowrap">
                                {log.aspekPengamatan}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-slate-800 group-hover/row:text-slate-200 max-w-sm whitespace-normal break-words leading-relaxed align-top">
                              {log.catatanPerkembangan}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 group-hover/row:text-slate-400 italic max-w-xs whitespace-normal break-words leading-relaxed align-top">
                              {log.rekomendasi || "-"}
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

          {/* ================= TAB 3: SURAT DISPENSASI ================= */}
          {activeTab === "dispensations" && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Cari nomor surat atau siswa..."
                      value={searchDispensation}
                      onChange={(e) => setSearchDispensation(e.target.value)}
                      className="pl-8.5 h-9 text-xs bg-white border-[#d6e5df]"
                    />
                  </div>

                  <Select
                    value={filterDispStatus}
                    onValueChange={(val) => {
                      if (val) setFilterDispStatus(val);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[175px] h-9 text-xs bg-white border-[#d6e5df] whitespace-nowrap cursor-pointer">
                      <SelectValue>
                        {(val) => resolveFilterSelectLabel(val, "Semua Status")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
                      <SelectItem value="Aktif" className="text-xs">Aktif</SelectItem>
                      <SelectItem value="Selesai" className="text-xs">Selesai</SelectItem>
                      <SelectItem value="Dibatalkan" className="text-xs">Dibatalkan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => openModal("dispensation")}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-9 px-3.5 gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Terbitkan Dispensasi
                </Button>
              </div>

              <div className="rounded-xl border border-[#e0ede8] bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[#f0f7f4]">
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Nomor Surat</TableHead>
                        <TableHead className="text-xs font-semibold">Siswa</TableHead>
                        <TableHead className="text-xs font-semibold">Waktu Izin</TableHead>
                        <TableHead className="text-xs font-semibold">Keperluan</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                        <TableHead className="text-right text-xs font-semibold pr-4 w-[180px]">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-28 text-center text-xs text-slate-500">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-700" />
                            Memuat surat dispensasi...
                          </TableCell>
                        </TableRow>
                      ) : filteredDispensations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-28 text-center text-xs text-slate-500">
                            <FileText className="w-5 h-5 mx-auto mb-1.5 opacity-40 text-teal-600" />
                            Belum ada surat dispensasi.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDispensations.map((disp) => (
                          <TableRow
                            key={disp.id}
                            className="group/row transition-all duration-200 hover:bg-[#091524] border-b border-slate-100 last:border-0"
                          >
                            <TableCell className="font-mono text-xs font-bold text-teal-900 group-hover/row:text-teal-300 whitespace-nowrap align-top">
                              {disp.nomorSurat}
                            </TableCell>
                            <TableCell className="text-xs align-top">
                              <span className="font-bold text-slate-900 group-hover/row:text-white block">
                                {disp.studentName}
                              </span>
                              <span className="text-[11px] font-mono text-slate-500 group-hover/row:text-slate-400">
                                Kelas {disp.studentKelas} • NIS {disp.studentNis}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs align-top whitespace-nowrap">
                              <span className="font-semibold text-slate-900 group-hover/row:text-white block">
                                {formatTanggalIndonesia(disp.tanggal)}
                              </span>
                              <span className="text-[11px] text-slate-500 group-hover/row:text-slate-400">
                                {formatRentangWaktu(disp.jamMulai, disp.jamSelesai)}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs align-top max-w-xs whitespace-normal break-words leading-relaxed">
                              <span className="font-semibold text-slate-900 group-hover/row:text-white block">
                                {disp.keperluan}
                              </span>
                              {disp.keterangan && (
                                <span className="text-[11px] text-slate-500 group-hover/row:text-slate-400 italic block mt-0.5">
                                  {disp.keterangan}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="align-top">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-semibold transition-colors",
                                  getDispStatusBadgeClass(disp.statusDispensasi)
                                )}
                              >
                                {disp.statusDispensasi}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-4 space-x-1 whitespace-nowrap align-top">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handlePrintDispensation(disp)}
                                className="h-7 px-2.5 text-xs gap-1 bg-blue-50/70 text-[#1F4E78] border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 group-hover/row:bg-blue-500/20 group-hover/row:border-blue-400/60 group-hover/row:text-blue-100 group-hover/row:hover:bg-blue-600 group-hover/row:hover:text-white group-hover/row:hover:border-blue-500 transition-colors cursor-pointer"
                                title="Cetak Surat Izin"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Cetak
                              </Button>
                              {disp.statusDispensasi === "Aktif" && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={busyActionId === disp.id}
                                  onClick={() =>
                                    handleUpdateDispensationStatus(disp.id, "Selesai")
                                  }
                                  className="h-7 px-2 text-xs text-emerald-700 group-hover/row:text-emerald-300 group-hover/row:hover:bg-emerald-500/25 group-hover/row:hover:text-emerald-100 transition-colors cursor-pointer"
                                  title="Tandai Selesai"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  Tuntas
                                </Button>
                              )}
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
        </div>
      </div>

      {/* Modal Input Cepat */}
      <QuickCounselingModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        studentsList={studentsList}
        defaultStudentId={modalDefaultStudentId}
        onSuccess={fetchData}
      />

      {/* Modal Cetak Dispensasi */}
      <DispensationPrintModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        data={selectedDispensation}
      />
    </div>
  );
}
