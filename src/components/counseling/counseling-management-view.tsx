"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HeartHandshake,
  Clock,
  CheckCircle2,
  FileText,
  Search,
  Plus,
  Printer,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  UserCheck,
  Shield,
  RotateCcw,
} from "lucide-react";
import {
  CounselingSessionItem,
  StudentMonitoringLogItem,
  DispensationLetterItem,
  CounselingOverviewSummary,
  formatTanggalIndonesia,
  formatRentangWaktu,
  getStatusKasusBadge,
  getKerahasiaanBadge,
  getDispensasiStatusBadge,
  COUNSELING_CATEGORIES,
  CASE_STATUSES,
  MONITORING_ASPECTS,
} from "@/lib/counseling";
import {
  QuickCounselingModal,
  StudentOption,
} from "./quick-counseling-modal";
import { DispensationPrintModal } from "./dispensation-print-modal";

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

export function CounselingManagementView() {
  const [activeTab, setActiveTab] = useState("sessions");
  const [loading, setLoading] = useState(true);

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

  // Filter states for sessions
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKategori, setFilterKategori] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterKelas, setFilterKelas] = useState("all");

  // Filter states for monitoring
  const [filterAspect, setFilterAspect] = useState("all");
  const [filterMonitoringKelas, setFilterMonitoringKelas] = useState("all");

  // Filter states for dispensations
  const [filterDispStatus, setFilterDispStatus] = useState("all");

  // Modal controls
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"counseling" | "monitoring" | "dispensation">("counseling");
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedDispensation, setSelectedDispensation] = useState<DispensationLetterItem | null>(null);

  // Detail session modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<CounselingSessionItem | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, sessRes, logRes, dispRes, studRes] = await Promise.all([
        fetch("/api/counseling/overview"),
        fetch("/api/counseling/sessions"),
        fetch("/api/counseling/monitoring"),
        fetch("/api/counseling/dispensation"),
        fetch("/api/students"),
      ]);

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Unique classes for filter
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    studentsList.forEach((s) => {
      if (s.kelas) set.add(s.kelas);
    });
    return Array.from(set).sort();
  }, [studentsList]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (filterKategori !== "all" && s.kategori !== filterKategori) return false;
      if (filterStatus !== "all" && s.statusKasus !== filterStatus) return false;
      if (filterKelas !== "all" && s.studentKelas !== filterKelas) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.studentName?.toLowerCase().includes(q);
        const matchNis = s.studentNis?.toLowerCase().includes(q);
        const matchIssue = s.pokokMasalah?.toLowerCase().includes(q);
        if (!matchName && !matchNis && !matchIssue) return false;
      }
      return true;
    });
  }, [sessions, filterKategori, filterStatus, filterKelas, searchQuery]);

  // Filtered monitoring logs
  const filteredLogs = useMemo(() => {
    return monitoringLogs.filter((l) => {
      if (filterAspect !== "all" && l.aspekPengamatan !== filterAspect) return false;
      if (filterMonitoringKelas !== "all" && l.studentKelas !== filterMonitoringKelas) return false;
      return true;
    });
  }, [monitoringLogs, filterAspect, filterMonitoringKelas]);

  // Filtered dispensations
  const filteredDispensations = useMemo(() => {
    return dispensations.filter((d) => {
      if (filterDispStatus !== "all" && d.statusDispensasi !== filterDispStatus) return false;
      return true;
    });
  }, [dispensations, filterDispStatus]);

  // Quick Action handlers
  const openNewCounseling = () => {
    setModalMode("counseling");
    setModalOpen(true);
  };

  const openNewMonitoring = () => {
    setModalMode("monitoring");
    setModalOpen(true);
  };

  const openNewDispensation = () => {
    setModalMode("dispensation");
    setModalOpen(true);
  };

  const handlePrintDispensation = (item: DispensationLetterItem) => {
    setSelectedDispensation(item);
    setPrintModalOpen(true);
  };

  const handleOpenDetailSession = (item: CounselingSessionItem) => {
    setSelectedSessionDetail(item);
    setDetailModalOpen(true);
  };

  const handleUpdateSessionStatus = async (sessionId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/counseling/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusKasus: newStatus }),
      });
      if (res.ok) {
        fetchData();
        if (selectedSessionDetail?.id === sessionId) {
          setSelectedSessionDetail((prev) => (prev ? { ...prev, statusKasus: newStatus as any } : null));
        }
      }
    } catch (err) {
      console.error("Error updating session status:", err);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data sesi konseling ini?")) return;
    try {
      const res = await fetch(`/api/counseling/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  const handleUpdateDispensationStatus = async (dispId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/counseling/dispensation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dispId, statusDispensasi: newStatus }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Error updating dispensation status:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Cockpit Banner Menyatu - Persis Beranda Dashboard */}
      <section className="relative overflow-hidden -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10 pt-7 pb-8 bg-gradient-to-b from-[#091424] via-[#0d1e38] to-[#0a1526] border-b border-white/10 text-white shadow-xs">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-44 bg-blue-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Header Title, Subtitle & Action Pills */}
          <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto pb-8 space-y-3.5">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">
                Bimbingan Konseling dan Kesiswaan
              </h1>
              <p className="text-xs sm:text-sm text-blue-200/75 max-w-2xl leading-relaxed">
                Pencatatan sesi bimbingan siswa, pemantauan karakter kepribadian, dan penerbitan dispensasi kelas
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={openNewDispensation}
                className="inline-flex items-center bg-white/[0.06] hover:bg-white/10 active:bg-white/15 border border-white/15 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 mr-2 text-blue-300" />
                Buat Surat Dispensasi
              </button>
              <button
                type="button"
                onClick={openNewCounseling}
                className="inline-flex items-center bg-blue-600 hover:bg-blue-500 active:bg-blue-700 border border-blue-400/40 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs hover:shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-2 text-blue-100" />
                Catat Konseling Baru
              </button>
            </div>
          </div>

          {/* 4 Kartu Metrik Utama - Sleek Semi-Transparent Glass Cards (Persis Dashboard) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-blue-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(37,99,235,0.15)] transition-all duration-200 cursor-pointer shadow-xs"
              title="TOTAL SESI BULAN INI"
              value={loading ? "..." : summary.totalSesiBulanIni}
              icon={HeartHandshake}
              color="blue"
              footerLeft="Bimbingan Terdaftar"
              footerRight="Bulan Berjalan"
            />

            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-amber-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(251,191,36,0.15)] transition-all duration-200 cursor-pointer shadow-xs"
              title="DALAM PANTAUAN"
              value={loading ? "..." : summary.totalDalamPemantauan}
              icon={Clock}
              color="amber"
              footerLeft="Kasus Aktif"
              footerRight="Perlu Pendampingan"
            />

            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-emerald-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-200 cursor-pointer shadow-xs"
              title="KASUS SELESAI"
              value={loading ? "..." : summary.totalSelesai}
              icon={CheckCircle2}
              color="emerald"
              footerLeft="Telah Tuntas Dibina"
              footerRight="Perilaku Positif"
            />

            <StatCard
              variant="dark"
              className="rounded-xl bg-white/[0.035] backdrop-blur-xs border border-white/10 hover:border-blue-400/50 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all duration-200 cursor-pointer shadow-xs"
              title="DISPENSASI HARI INI"
              value={loading ? "..." : summary.totalDispensasiHariIni}
              icon={FileText}
              color="blue"
              footerLeft="Izin Aktif Kelas"
              footerRight="KBM Berlangsung"
            />
          </div>
        </div>
      </section>

      {/* Navigasi Tab Terpadu */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted p-1 rounded-lg">
          <TabsTrigger value="sessions" className="text-xs sm:text-sm gap-2">
            <HeartHandshake className="w-4 h-4" />
            Daftar Sesi Konseling
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="text-xs sm:text-sm gap-2">
            <UserCheck className="w-4 h-4" />
            Catatan Pantauan Siswa
          </TabsTrigger>
          <TabsTrigger value="dispensations" className="text-xs sm:text-sm gap-2">
            <FileText className="w-4 h-4" />
            Surat Dispensasi Kelas
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* TAB 1: DAFTAR SESI KONSELING */}
        {/* ============================================================ */}
        <TabsContent value="sessions" className="space-y-4">
          {/* Baris Filter */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-3 rounded-lg border">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Ketik nama siswa, nomor induk siswa, atau pokok masalah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Kategori */}
              <Select value={filterKategori} onValueChange={(val) => { if (val) setFilterKategori(val); }}>
                <SelectTrigger className="w-[180px] text-xs">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {COUNSELING_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filter Status Kasus */}
              <Select value={filterStatus} onValueChange={(val) => { if (val) setFilterStatus(val); }}>
                <SelectTrigger className="w-[160px] text-xs">
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {CASE_STATUSES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filter Kelas */}
              <Select value={filterKelas} onValueChange={(val) => { if (val) setFilterKelas(val); }}>
                <SelectTrigger className="w-[130px] text-xs">
                  <SelectValue placeholder="Pilih Kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {uniqueClasses.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(filterKategori !== "all" || filterStatus !== "all" || filterKelas !== "all" || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterKategori("all");
                    setFilterStatus("all");
                    setFilterKelas("all");
                    setSearchQuery("");
                  }}
                  className="text-xs text-muted-foreground"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Atur Ulang
                </Button>
              )}
            </div>
          </div>

          {/* Tabel Sesi Konseling */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[120px] text-xs font-semibold">Tanggal</TableHead>
                  <TableHead className="text-xs font-semibold">Siswa</TableHead>
                  <TableHead className="text-xs font-semibold">Kategori dan Layanan</TableHead>
                  <TableHead className="text-xs font-semibold">Pokok Masalah</TableHead>
                  <TableHead className="text-xs font-semibold">Kerahasiaan</TableHead>
                  <TableHead className="text-xs font-semibold">Status Kasus</TableHead>
                  <TableHead className="text-right text-xs font-semibold w-[140px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-900" />
                      Memuat data sesi bimbingan konseling...
                    </TableCell>
                  </TableRow>
                ) : filteredSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-40 text-amber-600" />
                      Tidak ada catatan sesi konseling yang cocok dengan penyaringan data.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSessions.map((item) => {
                    const statusBadge = getStatusKasusBadge(item.statusKasus);
                    const kerahasiaanBadge = getKerahasiaanBadge(item.tingkatKerahasiaan);

                    return (
                      <TableRow
                        key={item.id}
                        className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <TableCell className="text-xs align-top">
                          <span className="font-semibold text-slate-900 dark:text-white group-hover/row:text-white transition-colors block">
                            {formatTanggalIndonesia(item.tanggal)}
                          </span>
                          <span className="block text-[11px] text-slate-500 group-hover/row:text-slate-400 transition-colors mt-0.5">
                            {item.waktuMulai} - {item.waktuSelesai}
                          </span>
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 group-hover/row:bg-slate-800 text-slate-700 group-hover/row:text-slate-200 font-semibold flex items-center justify-center text-xs border border-slate-200 dark:border-slate-700 group-hover/row:border-slate-700 shrink-0 transition-colors">
                              {getInitials(item.studentName || "")}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 dark:text-white group-hover/row:text-white transition-colors block">
                                {item.studentName}
                              </span>
                              <span className="text-[11px] text-slate-500 group-hover/row:text-slate-400 transition-colors">
                                NIS: {item.studentNis} • Kelas {item.studentKelas}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="align-top text-xs">
                          <span className="font-semibold text-slate-900 dark:text-white group-hover/row:text-white transition-colors block">
                            {item.kategori}
                          </span>
                          <span className="text-[11px] text-slate-500 group-hover/row:text-slate-400 transition-colors">
                            {item.jenisLayanan}
                          </span>
                        </TableCell>

                        <TableCell className="align-top text-xs max-w-xs">
                          <p className="line-clamp-2 text-slate-800 dark:text-slate-200 group-hover/row:text-slate-200 transition-colors">
                            {item.pokokMasalah}
                          </p>
                          {item.tindakLanjut && (
                            <span className="block text-[11px] text-slate-500 group-hover/row:text-slate-400 italic transition-colors mt-1">
                              Tindak lanjut: {item.tindakLanjut}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="align-top">
                          <Badge variant="outline" className={`text-[10px] ${kerahasiaanBadge.badgeClass}`}>
                            {kerahasiaanBadge.label}
                          </Badge>
                        </TableCell>

                        <TableCell className="align-top">
                          <Badge variant="outline" className={`text-[10px] ${statusBadge.badgeClass}`}>
                            {statusBadge.label}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right align-top space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetailSession(item)}
                            className="h-7 px-2 text-xs text-slate-600 dark:text-slate-400 group-hover/row:text-slate-300 hover:text-blue-400 hover:bg-slate-800 border border-transparent transition-colors cursor-pointer"
                            title="Lihat Detail Bimbingan"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Detail
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSession(item.id)}
                            className="h-7 px-2 text-xs text-slate-500 dark:text-slate-400 group-hover/row:text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-transparent transition-colors cursor-pointer"
                            title="Hapus Sesi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="text-xs text-muted-foreground">
            Menampilkan {filteredSessions.length} dari {sessions.length} data sesi konseling
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 2: CATATAN PANTAUAN SISWA */}
        {/* ============================================================ */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-3 rounded-lg border">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterAspect} onValueChange={(val) => { if (val) setFilterAspect(val); }}>
                <SelectTrigger className="w-[190px] text-xs">
                  <SelectValue placeholder="Pilih Aspek Pengamatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Aspek Pengamatan</SelectItem>
                  {MONITORING_ASPECTS.map((asp) => (
                    <SelectItem key={asp} value={asp}>
                      {asp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterMonitoringKelas} onValueChange={(val) => { if (val) setFilterMonitoringKelas(val); }}>
                <SelectTrigger className="w-[130px] text-xs">
                  <SelectValue placeholder="Pilih Kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {uniqueClasses.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={openNewMonitoring}
              className="bg-blue-900 hover:bg-blue-800 text-white text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Tambah Catatan Pantauan
            </Button>
          </div>

          <div className="bg-card rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[120px] text-xs font-semibold">Tanggal</TableHead>
                  <TableHead className="text-xs font-semibold">Siswa</TableHead>
                  <TableHead className="text-xs font-semibold">Guru Pengamat</TableHead>
                  <TableHead className="text-xs font-semibold">Aspek Karakter</TableHead>
                  <TableHead className="text-xs font-semibold">Catatan Pengamatan</TableHead>
                  <TableHead className="text-xs font-semibold">Rekomendasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-900" />
                      Memuat catatan pantauan karakter siswa...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                      <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-40 text-blue-600" />
                      Belum ada catatan pemantauan yang sesuai.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <TableCell className="text-xs align-top font-semibold text-slate-900 dark:text-white group-hover/row:text-white transition-colors">
                        {formatTanggalIndonesia(log.tanggal)}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 group-hover/row:bg-slate-800 text-slate-700 group-hover/row:text-slate-200 font-semibold flex items-center justify-center text-xs border border-slate-200 dark:border-slate-700 group-hover/row:border-slate-700 shrink-0 transition-colors">
                            {getInitials(log.studentName || "")}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white group-hover/row:text-white transition-colors block">
                              {log.studentName}
                            </span>
                            <span className="text-[11px] text-slate-500 group-hover/row:text-slate-400 transition-colors">
                              NIS: {log.studentNis} • Kelas {log.studentKelas}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs align-top text-slate-700 dark:text-slate-300 group-hover/row:text-slate-300 transition-colors">
                        {log.recorderName}
                      </TableCell>
                      <TableCell className="text-xs align-top font-semibold text-blue-900 dark:text-blue-300 group-hover/row:text-blue-300 transition-colors">
                        {log.aspekPengamatan}
                      </TableCell>
                      <TableCell className="text-xs align-top max-w-sm text-slate-800 dark:text-slate-200 group-hover/row:text-slate-200 transition-colors">
                        {log.catatanPerkembangan}
                      </TableCell>
                      <TableCell className="text-xs align-top text-slate-500 group-hover/row:text-slate-400 italic transition-colors">
                        {log.rekomendasi || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="text-xs text-muted-foreground">
            Menampilkan {filteredLogs.length} dari {monitoringLogs.length} catatan pantauan
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* TAB 3: SURAT DISPENSASI KELAS */}
        {/* ============================================================ */}
        <TabsContent value="dispensations" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <Select value={filterDispStatus} onValueChange={(val) => { if (val) setFilterDispStatus(val); }}>
                <SelectTrigger className="w-[170px] text-xs">
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status Dispensasi</SelectItem>
                  <SelectItem value="Aktif">Aktif</SelectItem>
                  <SelectItem value="Selesai">Selesai</SelectItem>
                  <SelectItem value="Dibatalkan">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={openNewDispensation}
              className="bg-blue-900 hover:bg-blue-800 text-white text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Terbitkan Surat Dispensasi
            </Button>
          </div>

          <div className="bg-card rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Nomor Dokumen</TableHead>
                  <TableHead className="text-xs font-semibold">Siswa</TableHead>
                  <TableHead className="text-xs font-semibold">Tanggal dan Jam</TableHead>
                  <TableHead className="text-xs font-semibold">Keperluan Izin</TableHead>
                  <TableHead className="text-xs font-semibold">Penerbit</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold w-[190px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-900" />
                      Memuat daftar surat dispensasi kelas...
                    </TableCell>
                  </TableRow>
                ) : filteredDispensations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                      <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-40 text-blue-600" />
                      Tidak ada surat dispensasi yang tercatat.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDispensations.map((disp) => {
                    const statusBadge = getDispensasiStatusBadge(disp.statusDispensasi);

                    return (
                      <TableRow
                        key={disp.id}
                        className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <TableCell className="align-top font-mono text-xs font-bold text-blue-900 dark:text-blue-300 group-hover/row:text-blue-300 transition-colors">
                          {disp.nomorSurat}
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 group-hover/row:bg-slate-800 text-slate-700 group-hover/row:text-slate-200 font-semibold flex items-center justify-center text-xs border border-slate-200 dark:border-slate-700 group-hover/row:border-slate-700 shrink-0 transition-colors">
                              {getInitials(disp.studentName || "")}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 dark:text-white group-hover/row:text-white transition-colors block">
                                {disp.studentName}
                              </span>
                              <span className="text-[11px] text-slate-500 group-hover/row:text-slate-400 transition-colors">
                                NIS: {disp.studentNis} • Kelas {disp.studentKelas}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="align-top text-xs">
                          <span className="font-semibold text-slate-900 dark:text-white group-hover/row:text-white transition-colors block">
                            {formatTanggalIndonesia(disp.tanggal)}
                          </span>
                          <span className="text-[11px] text-slate-500 group-hover/row:text-slate-400 transition-colors">
                            {formatRentangWaktu(disp.jamMulai, disp.jamSelesai)}
                          </span>
                        </TableCell>

                        <TableCell className="align-top text-xs max-w-xs">
                          <span className="font-semibold text-slate-900 dark:text-white group-hover/row:text-white transition-colors block">
                            {disp.keperluan}
                          </span>
                          {disp.keterangan && (
                            <span className="text-[11px] text-slate-500 group-hover/row:text-slate-400 italic transition-colors">
                              {disp.keterangan}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="align-top text-xs text-slate-700 dark:text-slate-300 group-hover/row:text-slate-300 transition-colors">
                          {disp.issuerName}
                        </TableCell>

                        <TableCell className="align-top">
                          <Badge variant="outline" className={`text-[10px] ${statusBadge.badgeClass}`}>
                            {statusBadge.label}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right align-top space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrintDispensation(disp)}
                            className="h-7 px-2 text-xs gap-1 border-slate-200 dark:border-slate-700 group-hover/row:border-slate-700 text-slate-700 dark:text-slate-300 group-hover/row:text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Cetak Surat Izin"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Cetak
                          </Button>
                          {disp.statusDispensasi === "Aktif" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateDispensationStatus(disp.id, "Selesai")}
                              className="h-7 px-2 text-xs text-emerald-600 group-hover/row:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Tandai Selesai"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Tuntas
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="text-xs text-muted-foreground">
            Menampilkan {filteredDispensations.length} dari {dispensations.length} surat dispensasi
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Input Cepat */}
      <QuickCounselingModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        studentsList={studentsList}
        onSuccess={fetchData}
      />

      {/* Modal Cetak Dispensasi */}
      <DispensationPrintModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        data={selectedDispensation}
      />

      {/* Modal Rincian Sesi Konseling */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 text-sm">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <HeartHandshake className="w-5 h-5 text-amber-600" />
              Detail Sesi Bimbingan Konseling
            </DialogTitle>
          </DialogHeader>

          {selectedSessionDetail && (
            <div className="space-y-4 pt-1">
              {/* Profil Singkat Siswa */}
              <div className="bg-muted/40 p-3 rounded-md border text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-foreground">
                    {selectedSessionDetail.studentName}
                  </span>
                  <Badge variant="outline" className={getStatusKasusBadge(selectedSessionDetail.statusKasus).badgeClass}>
                    {selectedSessionDetail.statusKasus}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Nomor Induk Siswa: {selectedSessionDetail.studentNis} • Kelas: {selectedSessionDetail.studentKelas}
                </p>
                <p className="text-muted-foreground">
                  Waktu Pelaksanaan: {formatTanggalIndonesia(selectedSessionDetail.tanggal)} ({selectedSessionDetail.waktuMulai} - {selectedSessionDetail.waktuSelesai})
                </p>
                <p className="text-muted-foreground">
                  Guru Pembimbing BK: {selectedSessionDetail.counselorName}
                </p>
              </div>

              {/* Rincian Kategori & Kerahasiaan */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-card rounded border">
                  <span className="text-muted-foreground block text-[11px]">Kategori Bimbingan:</span>
                  <span className="font-semibold text-foreground">{selectedSessionDetail.kategori}</span>
                </div>
                <div className="p-2.5 bg-card rounded border">
                  <span className="text-muted-foreground block text-[11px]">Bentuk Layanan:</span>
                  <span className="font-semibold text-foreground">{selectedSessionDetail.jenisLayanan}</span>
                </div>
              </div>

              {/* Pokok Masalah */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-foreground">Pokok Masalah yang Dibahas:</span>
                <p className="p-3 bg-card border rounded-md text-xs text-foreground leading-relaxed">
                  {selectedSessionDetail.pokokMasalah}
                </p>
              </div>

              {/* Pendekatan & Solusi */}
              {selectedSessionDetail.pendekatanKonseling && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-foreground">Pendekatan dan Solusi yang Diterapkan:</span>
                  <p className="p-3 bg-card border rounded-md text-xs text-foreground leading-relaxed">
                    {selectedSessionDetail.pendekatanKonseling}
                  </p>
                </div>
              )}

              {/* Rencana Tindak Lanjut */}
              {selectedSessionDetail.tindakLanjut && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-foreground">Rencana Tindak Lanjut:</span>
                  <p className="p-3 bg-card border rounded-md text-xs text-foreground leading-relaxed">
                    {selectedSessionDetail.tindakLanjut}
                  </p>
                </div>
              )}

              {/* Ubah Status Kasus */}
              <div className="pt-2 border-t flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">Ubah Status Penanganan:</span>
                <div className="flex items-center gap-1.5">
                  {selectedSessionDetail.statusKasus !== "Dalam Pemantauan" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateSessionStatus(selectedSessionDetail.id, "Dalam Pemantauan")}
                      className="text-xs h-7 border-amber-300 text-amber-800"
                    >
                      Pantau
                    </Button>
                  )}
                  {selectedSessionDetail.statusKasus !== "Selesai" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateSessionStatus(selectedSessionDetail.id, "Selesai")}
                      className="text-xs h-7 border-emerald-300 text-emerald-800"
                    >
                      Tandai Selesai
                    </Button>
                  )}
                  {selectedSessionDetail.statusKasus !== "Rujukan Kasus" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateSessionStatus(selectedSessionDetail.id, "Rujukan Kasus")}
                      className="text-xs h-7 border-purple-300 text-purple-800"
                    >
                      Rujukan Ahli
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
