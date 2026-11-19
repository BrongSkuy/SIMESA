"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { StatCard } from "@/components/shared/stat-card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  GraduationCap,
  ShieldCheck,
  KeyRound,
  Search,
  Filter,
  RotateCcw,
  Eye,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Layers,
  Sparkles,
  Info,
  Trash2,
  AlertTriangle,
  Download,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import {
  ActivityLogItem,
  AuditSummaryStats,
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  MODULE_LABELS,
  ACTION_LABELS,
  ROLE_LABELS,
  formatRoleLabel,
  formatAuditTimestamp,
  getInitials,
  getActionBadgeStyle,
  getModuleBadgeStyle,
  AuditAction,
  AuditModule,
} from "@/lib/audit";

export function ActivityLogView() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [summary, setSummary] = useState<AuditSummaryStats>({
    totalHariIni: 0,
    akademikNilaiCount: 0,
    kesiswaanDisiplinCount: 0,
    keamananAkunCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 15;

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null);

  // Superadmin Purge / Retensi Data State
  const { data: session } = authClient.useSession();
  const rawRole = (((session?.user as any)?.appRole || "") as string).toUpperCase();
  const isSuperadmin = rawRole === "SUPERADMIN";
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgeStep, setPurgeStep] = useState<1 | 2>(1);
  const [purgeDays, setPurgeDays] = useState("180");
  const [isPurging, setIsPurging] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [hasDownloadedExcel, setHasDownloadedExcel] = useState(false);
  const [confirmWithoutDownload, setConfirmWithoutDownload] = useState(false);

  const openPurgeModal = () => {
    setPurgeStep(1);
    setHasDownloadedExcel(false);
    setConfirmWithoutDownload(false);
    setPurgeModalOpen(true);
  };

  const handleDownloadExcel = async () => {
    setIsDownloadingExcel(true);
    try {
      const res = await fetch("/api/audit-logs?limit=50000");
      if (!res.ok) throw new Error("Gagal mengambil data riwayat aktivitas");
      const json = await res.json();
      const data: ActivityLogItem[] = json.logs || [];

      if (data.length === 0) {
        toast.info("Belum ada data riwayat aktivitas untuk diunduh");
        return;
      }

      const excelRows = data.map((item, idx) => ({
        "No": idx + 1,
        "Waktu Pencatatan": formatAuditTimestamp(item.createdAt),
        "Nama Aktor": item.userName,
        "Peran Pengguna": formatRoleLabel(item.userRole),
        "Modul Sistem": MODULE_LABELS[item.module] || item.module,
        "Jenis Aksi": ACTION_LABELS[item.action] || item.action,
        "Target Objek": item.targetName || "-",
        "Uraian Kegiatan": item.description,
        "Alamat IP": item.ipAddress || "127.0.0.1",
        "Snapshot Metadata": item.details || "-",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelRows);
      ws["!cols"] = [
        { wch: 6 },
        { wch: 28 },
        { wch: 26 },
        { wch: 18 },
        { wch: 24 },
        { wch: 20 },
        { wch: 25 },
        { wch: 55 },
        { wch: 16 },
        { wch: 40 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Riwayat Aktivitas");
      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `Cadangan_Riwayat_Aktivitas_SIMESA_${dateStr}.xlsx`);

      setHasDownloadedExcel(true);
      toast.success("Berkas cadangan Excel (.xlsx) berhasil diunduh");
    } catch (err) {
      console.error("Gagal mengunduh Excel:", err);
      toast.error("Gagal mengunduh berkas cadangan Excel");
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  const handlePurgeLogs = async () => {
    setIsPurging(true);
    try {
      const res = await fetch(`/api/audit-logs?days=${purgeDays}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Log aktivitas lama berhasil dibersihkan");
        setPurgeModalOpen(false);
        fetchSummary();
        fetchLogs(1);
      } else {
        toast.error(data.error || "Gagal membersihkan log lama");
      }
    } catch {
      toast.error("Terjadi kesalahan saat membersihkan log lama");
    } finally {
      setIsPurging(false);
    }
  };

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/audit-logs/overview");
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Gagal mengambil ringkasan audit:", err);
    }
  }, []);

  // Fetch logs with filters and pagination
  const fetchLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(pageSize));

        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        }
        if (selectedModule !== "all") {
          params.set("module", selectedModule);
        }
        if (selectedAction !== "all") {
          params.set("action", selectedAction);
        }
        if (selectedRole !== "all") {
          params.set("userRole", selectedRole);
        }

        const res = await fetch(`/api/audit-logs?${params.toString()}`);
        if (res.ok) {
          const result = await res.json();
          setLogs(result.logs || []);
          setTotalRecords(result.total || 0);
          setCurrentPage(result.page || 1);
          setTotalPages(result.totalPages || 1);
        }
      } catch (err) {
        console.error("Gagal mengambil data log:", err);
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, selectedModule, selectedAction, selectedRole]
  );

  // Initial load
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Load logs on filter change
  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedModule("all");
    setSelectedAction("all");
    setSelectedRole("all");
  };

  // Export logs to CSV (mengunduh seluruh catatan yang sesuai filter)
  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedModule !== "all") params.set("module", selectedModule);
      if (selectedAction !== "all") params.set("action", selectedAction);
      if (selectedRole !== "all") params.set("userRole", selectedRole);
      params.set("limit", "50000");

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data ekspor");
      const json = await res.json();
      const exportData: ActivityLogItem[] = json.logs || [];

      if (exportData.length === 0) {
        toast.info("Tidak ada data riwayat aktivitas untuk diekspor");
        return;
      }

      const headers = [
        "Waktu Pencatatan",
        "Nama Aktor",
        "Peran Pengguna",
        "Modul Sistem",
        "Jenis Aksi",
        "Target Objek",
        "Uraian Kegiatan",
        "Alamat IP",
      ];

      const rows = exportData.map((log) => [
        `"${formatAuditTimestamp(log.createdAt)}"`,
        `"${log.userName.replace(/"/g, '""')}"`,
        `"${formatRoleLabel(log.userRole).replace(/"/g, '""')}"`,
        `"${(MODULE_LABELS[log.module] || log.module).replace(/"/g, '""')}"`,
        `"${(ACTION_LABELS[log.action] || log.action).replace(/"/g, '""')}"`,
        `"${(log.targetName || "-").replace(/"/g, '""')}"`,
        `"${(log.description || "").replace(/"/g, '""')}"`,
        `"${log.ipAddress || "127.0.0.1"}"`,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8,\uFEFF" +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `Riwayat_Aktivitas_SIMESA_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`${exportData.length} catatan riwayat berhasil diekspor ke CSV`);
    } catch (err) {
      console.error("Gagal mengekspor CSV:", err);
      toast.error("Gagal mengekspor berkas CSV");
    } finally {
      setIsExportingCSV(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Cockpit Banner Menyatu - Persis Beranda & Konseling BK */}
      <section className="relative overflow-hidden -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10 pt-7 pb-8 bg-gradient-to-b from-[#091424] via-[#0d1e38] to-[#0a1526] border-b border-white/10 text-white shadow-xs">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-44 bg-blue-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Header Title, Subtitle & Action Pills */}
          <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto pb-8 space-y-3.5">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">
                Riwayat Aktivitas dan Audit Trail
              </h1>
              <p className="text-xs sm:text-sm text-blue-200/75 max-w-2xl leading-relaxed">
                Pemantauan jejak digital operasional sekolah, integritas data akademik siswa, dan kepatuhan sistem keamanan
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                disabled={isExportingCSV}
                onClick={handleExportCSV}
                className="inline-flex items-center bg-white/[0.06] hover:bg-white/10 active:bg-white/15 border border-white/15 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-emerald-300" />
                {isExportingCSV ? "Mengekspor CSV..." : "Ekspor Laporan CSV"}
              </button>

              <button
                type="button"
                onClick={() => {
                  fetchSummary();
                  fetchLogs(1);
                }}
                className="inline-flex items-center bg-blue-600 hover:bg-blue-500 active:bg-blue-700 border border-blue-400/40 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-2 text-blue-100" />
                Segarkan Data
              </button>

              {isSuperadmin && (
                <button
                  type="button"
                  onClick={openPurgeModal}
                  className="inline-flex items-center bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/35 border border-rose-400/30 rounded-xl px-4 py-2 text-xs font-semibold text-rose-200 shadow-xs transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-300" />
                  Pembersihan Log Usang
                </button>
              )}
            </div>
          </div>

          {/* 4 Kartu Metrik Utama - Sleek Semi-Transparent Glass Cards (Persis Dashboard) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-blue-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(37,99,235,0.15)] transition-all duration-200 cursor-pointer shadow-xs"
              title="AKTIVITAS HARI INI"
              value={loading ? "..." : summary.totalHariIni}
              icon={Activity}
              color="blue"
              footerLeft="Aktivitas Terkini"
              footerRight="Tanggal Berjalan"
            />

            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-blue-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all duration-200 cursor-pointer shadow-xs"
              title="AKADEMIK DAN NILAI"
              value={loading ? "..." : summary.akademikNilaiCount}
              icon={GraduationCap}
              color="blue"
              footerLeft="Capaian Belajar"
              footerRight="Nilai dan Rapor"
            />

            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-amber-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(251,191,36,0.15)] transition-all duration-200 cursor-pointer shadow-xs"
              title="KESISWAAN DAN DISIPLIN"
              value={loading ? "..." : summary.kesiswaanDisiplinCount}
              icon={ShieldCheck}
              color="amber"
              footerLeft="Buku Poin Siswa"
              footerRight="Layanan BK"
            />

            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-slate-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(148,163,184,0.15)] transition-all duration-200 cursor-pointer shadow-xs"
              title="KEAMANAN DAN AKSES"
              value={loading ? "..." : summary.keamananAkunCount}
              icon={KeyRound}
              color="slate"
              footerLeft="Sesi Pengguna"
              footerRight="Proteksi Akun"
            />
          </div>
        </div>
      </section>

      {/* 2. Filter Bar Interaktif */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center justify-between">
          {/* Kolom Pencarian Cerdas */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari nama aktor, target objek, atau uraian kegiatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            {/* Filter Modul */}
            <Select
              value={selectedModule}
              onValueChange={(val) => setSelectedModule(val || "all")}
            >
              <SelectTrigger className="h-10 text-xs w-[170px] rounded-xl bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="Semua Modul" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Modul</SelectItem>
                {AUDIT_MODULES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {MODULE_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Jenis Aksi */}
            <Select
              value={selectedAction}
              onValueChange={(val) => setSelectedAction(val || "all")}
            >
              <SelectTrigger className="h-10 text-xs w-[160px] rounded-xl bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="Semua Jenis Aksi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis Aksi</SelectItem>
                {AUDIT_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {ACTION_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Peran Pengguna */}
            <Select
              value={selectedRole}
              onValueChange={(val) => setSelectedRole(val || "all")}
            >
              <SelectTrigger className="h-10 text-xs w-[150px] rounded-xl bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800">
                <SelectValue placeholder="Semua Peran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Peran</SelectItem>
                <SelectItem value="superadmin">Super Administrator</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="kepala_sekolah">Kepala Sekolah</SelectItem>
                <SelectItem value="guru">Guru Mapel</SelectItem>
                <SelectItem value="wali_kelas">Wali Kelas</SelectItem>
                <SelectItem value="guru_bk">Guru BK</SelectItem>
                <SelectItem value="siswa">Siswa</SelectItem>
              </SelectContent>
            </Select>

            {/* Reset Filter Button */}
            {(searchQuery ||
              selectedModule !== "all" ||
              selectedAction !== "all" ||
              selectedRole !== "all") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-10 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Informasi Status Filter */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
          <div>
            Menampilkan <span className="font-semibold text-slate-800 dark:text-slate-200">{logs.length}</span> dari{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalRecords}</span> catatan aktivitas
          </div>
          <div>
            Halaman <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPage}</span> dari{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
          </div>
        </div>
      </div>

      {/* 3. Tabel Interaktif SIMESA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200/80 dark:border-slate-800">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px] text-xs font-bold text-slate-700 dark:text-slate-300 py-3.5 pl-5">
                  WAKTU PENCATATAN
                </TableHead>
                <TableHead className="w-[200px] text-xs font-bold text-slate-700 dark:text-slate-300 py-3.5">
                  AKTOR PENGGUNA
                </TableHead>
                <TableHead className="w-[160px] text-xs font-bold text-slate-700 dark:text-slate-300 py-3.5">
                  MODUL SISTEM
                </TableHead>
                <TableHead className="w-[140px] text-xs font-bold text-slate-700 dark:text-slate-300 py-3.5">
                  JENIS AKSI
                </TableHead>
                <TableHead className="w-[160px] text-xs font-bold text-slate-700 dark:text-slate-300 py-3.5">
                  TARGET OBJEK
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300 py-3.5">
                  URAIAN KEGIATAN
                </TableHead>
                <TableHead className="w-[80px] text-right text-xs font-bold text-slate-700 dark:text-slate-300 py-3.5 pr-5">
                  AKSI
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium">Memuat riwayat aktivitas...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                      <Info className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600" />
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Belum ada catatan aktivitas yang sesuai
                      </span>
                      <span className="text-xs text-slate-400">
                        Coba sesuaikan kata kunci pencarian atau reset filter
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const actionStyle = getActionBadgeStyle(log.action);
                  const moduleStyle = getModuleBadgeStyle(log.module);

                  return (
                    <TableRow
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      {/* Waktu */}
                      <TableCell className="py-3.5 pl-5 text-xs font-mono text-slate-500 dark:text-slate-400 group-hover/row:text-slate-300 whitespace-nowrap">
                        {formatAuditTimestamp(log.createdAt)}
                      </TableCell>

                      {/* Aktor Pengguna */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/50 group-hover/row:bg-blue-950 group-hover/row:border-blue-700/60 flex items-center justify-center font-bold text-xs text-blue-700 dark:text-blue-300 group-hover/row:text-blue-200 shrink-0 transition-colors">
                            {getInitials(log.userName)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate group-hover/row:text-white transition-colors">
                              {log.userName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 group-hover/row:text-slate-300">
                              {formatRoleLabel(log.userRole)}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Modul Sistem */}
                      <TableCell className="py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${moduleStyle.bg} ${moduleStyle.text} ${moduleStyle.border}`}
                        >
                          {MODULE_LABELS[log.module] || log.module}
                        </span>
                      </TableCell>

                      {/* Jenis Aksi */}
                      <TableCell className="py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${actionStyle.bg} ${actionStyle.text} ${actionStyle.border}`}
                        >
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </TableCell>

                      {/* Target Objek */}
                      <TableCell className="py-3.5 text-xs font-medium text-slate-700 dark:text-slate-300 group-hover/row:text-slate-200 truncate max-w-[160px]">
                        {log.targetName || "-"}
                      </TableCell>

                      {/* Uraian Kegiatan */}
                      <TableCell className="py-3.5 text-xs text-slate-600 dark:text-slate-300 group-hover/row:text-slate-100 leading-relaxed">
                        {log.description}
                      </TableCell>

                      {/* Tombol Aksi */}
                      <TableCell className="py-3.5 pr-5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50 group-hover/row:text-blue-400 transition-colors"
                          title="Lihat Detail Log"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginasi Modern */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan halaman {currentPage} dari {totalPages}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => fetchLogs(currentPage - 1)}
                className="h-8 px-2.5 text-xs rounded-lg"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Sebelumnya
              </Button>
              <div className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                {currentPage}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => fetchLogs(currentPage + 1)}
                className="h-8 px-2.5 text-xs rounded-lg"
              >
                Selanjutnya
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Modal Detail Aktivitas & Payload Snapshot */}
      <Dialog
        open={Boolean(selectedLog)}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null);
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <DialogHeader className="space-y-1.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Detail Riwayat Aktivitas Sistem
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-2 text-xs">
              {/* Ringkasan Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">Waktu Presisi</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    {formatAuditTimestamp(selectedLog.createdAt)}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">Alamat IP Klien</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    {selectedLog.ipAddress || "127.0.0.1"}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">Aktor Pelaksana</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedLog.userName} ({formatRoleLabel(selectedLog.userRole)})
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">Target Objek</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedLog.targetName || "-"}
                  </p>
                </div>
              </div>

              {/* Modul & Aksi Badges */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-slate-500 font-medium">Klasifikasi:</span>
                <span
                  className={`px-2 py-0.5 rounded-md font-semibold border ${
                    getModuleBadgeStyle(selectedLog.module).bg
                  } ${getModuleBadgeStyle(selectedLog.module).text} ${
                    getModuleBadgeStyle(selectedLog.module).border
                  }`}
                >
                  {MODULE_LABELS[selectedLog.module] || selectedLog.module}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md font-semibold border ${
                    getActionBadgeStyle(selectedLog.action).bg
                  } ${getActionBadgeStyle(selectedLog.action).text} ${
                    getActionBadgeStyle(selectedLog.action).border
                  }`}
                >
                  {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                </span>
              </div>

              {/* Uraian Lengkap */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Uraian Lengkap Kegiatan
                </label>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {selectedLog.description}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedLog(null)}
              className="rounded-xl text-xs"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Modal Pembersihan Log Usang & Pengingat Unduh Cadangan Excel */}
      <Dialog open={purgeModalOpen} onOpenChange={setPurgeModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          {purgeStep === 1 ? (
            /* ======================================================== */
            /* LANGKAH 1: Pengingat Wajib Unduh Cadangan Excel          */
            /* ======================================================== */
            <>
              <DialogHeader className="space-y-1.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Langkah 1 dari 2: Cadangan Data
                  </span>
                </div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 pt-1">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Pengingat Cadangan: Unduh Berkas Excel Riwayat
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs leading-relaxed">
                    <span className="font-semibold">Pemberitahuan: </span>
                    Unduh cadangan berkas <strong>Excel (.xlsx)</strong> sebagai arsip resmi sebelum menghapus riwayat aktivitas secara permanen.
                  </p>
                </div>

                {/* Kartu Tombol Unduh Excel */}
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        Cadangan Riwayat Aktivitas (.xlsx)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {hasDownloadedExcel ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Berkas cadangan telah berhasil diunduh
                          </span>
                        ) : (
                          "Format standar tabel Microsoft Excel lengkap"
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    disabled={isDownloadingExcel}
                    onClick={handleDownloadExcel}
                    className={cn(
                      "rounded-xl text-xs font-semibold px-4 cursor-pointer shrink-0 transition-all",
                      hasDownloadedExcel
                        ? "bg-slate-700 hover:bg-slate-800 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    )}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    {isDownloadingExcel
                      ? "Menyiapkan Berkas..."
                      : hasDownloadedExcel
                      ? "Unduh Ulang Excel"
                      : "Unduh Cadangan Excel"}
                  </Button>
                </div>

                {!hasDownloadedExcel && (
                  <label className="flex items-start gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmWithoutDownload}
                      onChange={(e) => setConfirmWithoutDownload(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      Saya memahami risikonya dan ingin melanjutkan ke tahap pembersihan data tanpa mengunduh berkas cadangan Excel saat ini.
                    </span>
                  </label>
                )}
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPurgeModalOpen(false)}
                  className="rounded-xl text-xs"
                >
                  Batal
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={!hasDownloadedExcel && !confirmWithoutDownload}
                  onClick={() => setPurgeStep(2)}
                  className="rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
                >
                  Lanjutkan ke Pembersihan
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </DialogFooter>
            </>
          ) : (
            /* ======================================================== */
            /* LANGKAH 2: Konfirmasi Penghapusan Log                    */
            /* ======================================================== */
            <>
              <DialogHeader className="space-y-1.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    Langkah 2 dari 2: Eksekusi Pembersihan
                  </span>
                </div>
                <DialogTitle className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 pt-1">
                  <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  Konfirmasi Pembersihan Catatan Aktivitas
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-rose-800 dark:text-rose-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div className="space-y-1 text-xs leading-relaxed">
                    <p className="font-semibold">Tindakan Permanen</p>
                    <p>
                      Seluruh catatan aktivitas yang lebih lama dari rentang waktu yang Anda tentukan di bawah ini akan dihapus secara permanen dari basis data SIMESA.
                    </p>
                    {hasDownloadedExcel && (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                        ✓ Berkas cadangan Excel telah tersimpan di perangkat Anda.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Pilih Batas Waktu Retensi Data
                  </label>
                  <Select value={purgeDays} onValueChange={(val) => setPurgeDays(val || "180")}>
                    <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Pilih batas waktu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">Lebih dari 30 Hari (1 Bulan)</SelectItem>
                      <SelectItem value="90">Lebih dari 90 Hari (3 Bulan)</SelectItem>
                      <SelectItem value="180">Lebih dari 180 Hari (6 Bulan - Disarankan)</SelectItem>
                      <SelectItem value="365">Lebih dari 365 Hari (1 Tahun)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPurging}
                  onClick={() => setPurgeStep(1)}
                  className="rounded-xl text-xs cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                  Kembali
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isPurging}
                  onClick={handlePurgeLogs}
                  className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
                >
                  {isPurging ? "Membersihkan Data..." : "Hapus Log Usang Sekarang"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
