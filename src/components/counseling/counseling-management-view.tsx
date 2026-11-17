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
      {/* Header Halaman Utama */}
      <PageHeader
        title="Bimbingan Konseling dan Kesiswaan"
        description="Pencatatan sesi bimbingan siswa, pemantauan karakter kepribadian, dan penerbitan surat dispensasi kelas resmi"
        icon={HeartHandshake}
      >
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          <Button
            onClick={openNewDispensation}
            variant="outline"
            className="gap-2 text-xs sm:text-sm bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <FileText className="w-4 h-4 text-blue-300" />
            Buat Surat Dispensasi
          </Button>
          <Button
            onClick={openNewCounseling}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs sm:text-sm shadow-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            Catat Konseling Baru
          </Button>
        </div>
      </PageHeader>

      {/* 4 StatCard Esensial SIMESA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Sesi Bulan Ini"
          value={loading ? "..." : `${summary.totalSesiBulanIni} Sesi`}
          subtitle="Total bimbingan tercatat bulan ini"
          icon={HeartHandshake}
          color="navy"
        />
        <StatCard
          title="Dalam Pantauan"
          value={loading ? "..." : `${summary.totalDalamPemantauan} Siswa`}
          subtitle="Kasus yang sedang didampingi"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Kasus Selesai"
          value={loading ? "..." : `${summary.totalSelesai} Kasus`}
          subtitle="Telah tuntas dibina dengan baik"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Dispensasi Hari Ini"
          value={loading ? "..." : `${summary.totalDispensasiHariIni} Surat`}
          subtitle="Izin aktif meninggalkan ruang kelas"
          icon={FileText}
          color="blue"
        />
      </div>

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
                      <TableRow key={item.id} className="hover:bg-muted/40 transition">
                        <TableCell className="text-xs align-top">
                          <span className="font-semibold">{formatTanggalIndonesia(item.tanggal)}</span>
                          <span className="block text-[11px] text-muted-foreground mt-0.5">
                            {item.waktuMulai} - {item.waktuSelesai}
                          </span>
                        </TableCell>

                        <TableCell className="align-top">
                          <span className="text-xs font-bold text-foreground block">
                            {item.studentName}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            NIS {item.studentNis} • Kelas {item.studentKelas}
                          </span>
                        </TableCell>

                        <TableCell className="align-top text-xs">
                          <span className="font-medium text-foreground block">{item.kategori}</span>
                          <span className="text-[11px] text-muted-foreground">{item.jenisLayanan}</span>
                        </TableCell>

                        <TableCell className="align-top text-xs max-w-xs">
                          <p className="line-clamp-2 text-foreground">{item.pokokMasalah}</p>
                          {item.tindakLanjut && (
                            <span className="block text-[11px] text-muted-foreground mt-1 italic">
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
                            className="h-7 px-2 text-xs text-blue-800 dark:text-blue-300"
                            title="Lihat Detail Bimbingan"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Detail
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSession(item.id)}
                            className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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
                    <TableRow key={log.id} className="hover:bg-muted/40 transition">
                      <TableCell className="text-xs align-top font-medium">
                        {formatTanggalIndonesia(log.tanggal)}
                      </TableCell>
                      <TableCell className="align-top">
                        <span className="text-xs font-bold block text-foreground">
                          {log.studentName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          NIS {log.studentNis} • Kelas {log.studentKelas}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs align-top text-foreground">
                        {log.recorderName}
                      </TableCell>
                      <TableCell className="text-xs align-top font-semibold text-blue-900 dark:text-blue-300">
                        {log.aspekPengamatan}
                      </TableCell>
                      <TableCell className="text-xs align-top max-w-sm text-foreground">
                        {log.catatanPerkembangan}
                      </TableCell>
                      <TableCell className="text-xs align-top text-muted-foreground italic">
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
                      <TableRow key={disp.id} className="hover:bg-muted/40 transition">
                        <TableCell className="align-top font-mono text-xs font-semibold text-blue-950 dark:text-blue-200">
                          {disp.nomorSurat}
                        </TableCell>

                        <TableCell className="align-top">
                          <span className="text-xs font-bold block text-foreground">
                            {disp.studentName}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            NIS {disp.studentNis} • Kelas {disp.studentKelas}
                          </span>
                        </TableCell>

                        <TableCell className="align-top text-xs">
                          <span className="font-medium text-foreground block">
                            {formatTanggalIndonesia(disp.tanggal)}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatRentangWaktu(disp.jamMulai, disp.jamSelesai)}
                          </span>
                        </TableCell>

                        <TableCell className="align-top text-xs max-w-xs">
                          <span className="font-semibold text-foreground block">{disp.keperluan}</span>
                          {disp.keterangan && (
                            <span className="text-[11px] text-muted-foreground italic">
                              {disp.keterangan}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="align-top text-xs text-foreground">
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
                            className="h-7 px-2 text-xs gap-1 border-blue-200 text-blue-900 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-200"
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
                              className="h-7 px-2 text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
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
