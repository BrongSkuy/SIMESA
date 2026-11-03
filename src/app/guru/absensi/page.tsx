"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  ClipboardCheck,
  Save,
  Download,
  Upload,
  CheckCheck,
  Loader2,
  Trash2,
  AlertCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { getTodayWIB, cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import {
  SessionSetup,
  formatTanggalID,
} from "@/components/shared/session-setup";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Status = "Hadir" | "Izin" | "Sakit" | "Alfa";

interface KelasRow {
  id: string;
  namaKelas: string;
  tingkat: string;
}

interface MapelRow {
  namaMapel: string;
  kelas?: string[];
}

interface AttendanceStudent {
  studentId: string;
  nis: string;
  namaLengkap: string;
  status: Status | null;
  attendanceId: string | null;
}

const statusActiveStyles: Record<Status, string> = {
  Hadir:
    "bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20",
  Izin:
    "bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-500/20",
  Sakit:
    "bg-indigo-50 text-indigo-700 border-indigo-300 ring-2 ring-indigo-500/20",
  Alfa:
    "bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20",
};

const statusHistoryBadge: Record<string, string> = {
  Hadir: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Izin: "bg-amber-50 text-amber-700 border-amber-200",
  Sakit: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Alfa: "bg-rose-50 text-rose-700 border-rose-200",
};

const statusList: Status[] = ["Hadir", "Izin", "Sakit", "Alfa"];

interface HistoryRecord {
  id: string;
  nis: string;
  nama: string;
  history: Record<string, string>;
}

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "S"
  );
}

export default function GuruAbsensiPage() {
  const [classes, setClasses] = useState<KelasRow[]>([]);
  const [subjects, setSubjects] = useState<MapelRow[]>([]);
  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedMapel, setSelectedMapel] = useState("Umum");
  const [tanggal, setTanggal] = useState(getTodayWIB());
  const [showGrid, setShowGrid] = useState(false);
  const [siswaList, setSiswaList] = useState<AttendanceStudent[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, Status>>(
    {}
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const isSunday = tanggal
    ? new Date(`${tanggal}T00:00:00`).getDay() === 0
    : false;
  const [isWaliKelas, setIsWaliKelas] = useState(false);
  const [waliClasses, setWaliClasses] = useState<string[]>([]);

  const mapelOptions = useMemo(() => {
    const list: { value: string; label: string; sublabel?: string }[] = [];
    if (isWaliKelas && waliClasses.includes(selectedKelas)) {
      list.push({
        value: "Umum",
        label: "Absen Pagi (Wali Kelas)",
        sublabel: "Wali Kelas",
      });
    }
    subjects
      .filter((s) => s.kelas?.includes(selectedKelas))
      .forEach((s) => {
        list.push({
          value: s.namaMapel,
          label: s.namaMapel,
          sublabel: "Mata Pelajaran Diampu",
        });
      });
    return list;
  }, [isWaliKelas, waliClasses, selectedKelas, subjects]);

  const [historyData, setHistoryData] = useState<{
    dates: string[];
    records: HistoryRecord[];
  }>({ dates: [], records: [] });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [dateWindowIndex, setDateWindowIndex] = useState(0);
  const [viewAllDates, setViewAllDates] = useState(false);
  const WINDOW_SIZE = 5;
  const importRef = useRef<HTMLInputElement>(null);
  const loadedSnapshotRef = useRef<string>("");

  // Fetch classes and subjects on mount
  useEffect(() => {
    const queryKelas =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("kelas")
        : null;

    Promise.all([
      fetch("/api/classes").then((r) => r.json()),
      fetch("/api/teachers/me/subjects")
        .then((r) => r.json())
        .catch(() => ({
          isWaliKelas: false,
          waliClasses: [],
          classes: [],
          subjects: [],
        })),
    ])
      .then(([classesData, subjectsRes]) => {
        const isWali = subjectsRes.isWaliKelas || false;
        const wClasses = subjectsRes.waliClasses || [];
        const assignedClasses = subjectsRes.classes || [];

        setIsWaliKelas(isWali);
        setWaliClasses(wClasses);

        const filteredClasses = (
          Array.isArray(classesData) ? classesData : []
        ).filter((c: KelasRow) => assignedClasses.includes(c.namaKelas));
        setClasses(filteredClasses);

        const matchedQueryClass =
          queryKelas &&
          filteredClasses.some((c: KelasRow) => c.namaKelas === queryKelas)
            ? queryKelas
            : null;
        const firstClass =
          matchedQueryClass ||
          (filteredClasses.length > 0 ? filteredClasses[0].namaKelas : "");
        if (firstClass) setSelectedKelas(firstClass);

        const subjectsData = subjectsRes.subjects || [];
        if (Array.isArray(subjectsData) && subjectsData.length > 0) {
          setSubjects(subjectsData);
          if (!isWali || !wClasses.includes(firstClass)) {
            setSelectedMapel(subjectsData[0].namaMapel);
          } else {
            setSelectedMapel("Umum");
          }
        } else if (!isWali || !wClasses.includes(firstClass)) {
          setSelectedMapel("");
        }
      })
      .catch(() => toast.error("Gagal memuat data awal"));
  }, []);

  // Handle Mapel Reset when Class changes
  useEffect(() => {
    if (
      selectedKelas &&
      selectedMapel === "Umum" &&
      !waliClasses.includes(selectedKelas)
    ) {
      if (subjects.length > 0) {
        setSelectedMapel(subjects[0].namaMapel);
      } else {
        setSelectedMapel("");
      }
    }
  }, [selectedKelas, selectedMapel, waliClasses, subjects]);

  const fetchHistory = useCallback(async () => {
    if (!selectedKelas) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(
        `/api/attendance/history?kelas=${encodeURIComponent(selectedKelas)}&mapel=${encodeURIComponent(selectedMapel)}`
      );
      const data = await res.json();
      const fetchedDates = Array.isArray(data?.dates) ? data.dates : [];
      const fetchedRecords = Array.isArray(data?.records) ? data.records : [];
      setHistoryData({
        dates: fetchedDates,
        records: fetchedRecords,
      });
      if (fetchedDates.length > WINDOW_SIZE) {
        setDateWindowIndex(fetchedDates.length - WINDOW_SIZE);
      } else {
        setDateWindowIndex(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedKelas, selectedMapel]);

  const handleLoadGrid = useCallback(async () => {
    if (!selectedKelas) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attendance?kelas=${encodeURIComponent(selectedKelas)}&tanggal=${tanggal}&mapel=${encodeURIComponent(selectedMapel)}`
      );
      const data: AttendanceStudent[] = await res.json();
      setSiswaList(data);

      const init: Record<string, Status> = {};
      data.forEach((s) => {
        init[s.studentId] = s.status || "Hadir";
      });
      setAttendanceData(init);
      loadedSnapshotRef.current = JSON.stringify(init);
      setShowGrid(true);

      await fetchHistory();
    } catch {
      toast.error("Gagal memuat data absensi");
    } finally {
      setLoading(false);
    }
  }, [selectedKelas, tanggal, selectedMapel, fetchHistory]);

  const handleChangeSession = () => {
    const isDirty =
      loadedSnapshotRef.current !== JSON.stringify(attendanceData);
    if (
      isDirty &&
      !confirm(
        "Perubahan presensi pada sesi ini belum disimpan. Tetap ganti sesi?"
      )
    ) {
      return;
    }
    setShowGrid(false);
  };

  const handleStatusChange = (studentId: string, status: Status) => {
    setAttendanceData((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAllPresent = () => {
    const all: Record<string, Status> = {};
    siswaList.forEach((s) => {
      all[s.studentId] = "Hadir";
    });
    setAttendanceData(all);
  };

  const handleSave = async () => {
    if (tanggal > getTodayWIB()) {
      toast.error(
        "Tanggal presensi tidak boleh di masa depan (maksimal hari ini)."
      );
      return;
    }
    setSaving(true);
    try {
      const records = Object.entries(attendanceData).map(
        ([studentId, status]) => ({
          studentId,
          status,
        })
      );

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tanggal, mapel: selectedMapel, records }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || "Gagal menyimpan");
      }

      const result = await res.json();
      toast.success(`Absensi berhasil disimpan! (${result.count} siswa)`);
      handleLoadGrid();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal menyimpan absensi";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/attendance?kelas=${encodeURIComponent(selectedKelas)}&tanggal=${tanggal}&mapel=${encodeURIComponent(selectedMapel)}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Gagal menghapus absensi");

      toast.success("Data absensi berhasil dihapus!");
      handleLoadGrid();
      setDeleteOpen(false);
    } catch {
      toast.error("Gagal menghapus absensi");
    } finally {
      setDeleting(false);
    }
  };

  const summary = {
    hadir: Object.values(attendanceData).filter((s) => s === "Hadir").length,
    izin: Object.values(attendanceData).filter((s) => s === "Izin").length,
    sakit: Object.values(attendanceData).filter((s) => s === "Sakit").length,
    alfa: Object.values(attendanceData).filter((s) => s === "Alfa").length,
  };

  const handleDownloadTemplate = () => {
    if (!showGrid || siswaList.length === 0) {
      toast.error("Muat absensi terlebih dahulu untuk men-download template");
      return;
    }
    const templateData = siswaList.map((s, i) => ({
      No: i + 1,
      NIS: s.nis,
      NamaLengkap: s.namaLengkap,
      StatusKehadiran: "",
    }));
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Absensi");
    XLSX.writeFile(
      wb,
      `template_absensi_${selectedKelas}_${selectedMapel}_${tanggal}.xlsx`
    );
    toast.success("Template absensi berhasil diunduh!");
  };

  const handleExportData = () => {
    if (!showGrid || siswaList.length === 0) {
      toast.error("Muat absensi terlebih dahulu untuk mengekspor data");
      return;
    }
    const exportData = siswaList.map((s, i) => ({
      No: i + 1,
      NIS: s.nis,
      NamaLengkap: s.namaLengkap,
      StatusKehadiran: attendanceData[s.studentId] || "Hadir",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Absensi");
    XLSX.writeFile(
      wb,
      `data_absensi_${selectedKelas}_${selectedMapel}_${tanggal}.xlsx`
    );
    toast.success("Data absensi berhasil diekspor!");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!showGrid || siswaList.length === 0) {
      toast.error("Muat absensi terlebih dahulu sebelum import");
      if (importRef.current) importRef.current.value = "";
      return;
    }
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

      if (rows.length === 0) {
        toast.error("File kosong atau format tidak sesuai");
        return;
      }

      const statusMap: Record<string, Status> = {};
      const validStatuses = ["Hadir", "Izin", "Sakit", "Alfa"];

      for (const row of rows) {
        const nis = String(row.NIS || row.nis || "")
          .replace(/['"]/g, "")
          .trim();
        const rawStatus = String(
          row.StatusKehadiran ||
            row.Status ||
            row.statusKehadiran ||
            row.status ||
            row.Keterangan ||
            row.keterangan ||
            ""
        ).trim();

        let status: Status = "Hadir";
        if (
          rawStatus.toUpperCase() === "H" ||
          rawStatus === "Hadir" ||
          rawStatus.toUpperCase() === "HADIR"
        )
          status = "Hadir";
        else if (
          rawStatus.toUpperCase() === "I" ||
          rawStatus === "Izin" ||
          rawStatus.toUpperCase() === "IZIN"
        )
          status = "Izin";
        else if (
          rawStatus.toUpperCase() === "S" ||
          rawStatus === "Sakit" ||
          rawStatus.toUpperCase() === "SAKIT"
        )
          status = "Sakit";
        else if (
          rawStatus.toUpperCase() === "A" ||
          rawStatus === "Alfa" ||
          rawStatus.toUpperCase() === "ALFA"
        )
          status = "Alfa";
        else if (validStatuses.includes(rawStatus))
          status = rawStatus as Status;

        const matched = siswaList.find((s) => s.nis === nis);
        if (matched) {
          statusMap[matched.studentId] = status;
        }
      }

      if (Object.keys(statusMap).length === 0) {
        toast.error("Tidak ada NIS yang cocok dengan data siswa di kelas ini");
        return;
      }

      setAttendanceData((prev) => ({ ...prev, ...statusMap }));
      toast.success(
        `${Object.keys(statusMap).length} status kehadiran diimport dari file!`
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal import";
      toast.error(msg);
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  const handleExportMatrix = () => {
    if (historyData.dates.length === 0 || historyData.records.length === 0) {
      toast.error("Belum ada riwayat absensi untuk diekspor");
      return;
    }
    const rows = historyData.records.map((siswa, idx) => {
      const counts = historyData.dates.reduce(
        (acc, d) => {
          const st = siswa.history[d];
          if (st === "Hadir") acc.h++;
          else if (st === "Izin") acc.i++;
          else if (st === "Sakit") acc.s++;
          else if (st === "Alfa") acc.a++;
          return acc;
        },
        { h: 0, i: 0, s: 0, a: 0 }
      );
      const totalM = counts.h + counts.i + counts.s + counts.a;
      const pct = totalM > 0 ? Math.round((counts.h / totalM) * 100) : 0;

      const rowObj: Record<string, string | number> = {
        No: idx + 1,
        NIS: siswa.nis,
        Nama: siswa.nama,
      };
      historyData.dates.forEach((d) => {
        const code =
          siswa.history[d] === "Hadir"
            ? "H"
            : siswa.history[d] === "Izin"
            ? "I"
            : siswa.history[d] === "Sakit"
            ? "S"
            : siswa.history[d] === "Alfa"
            ? "A"
            : "-";
        rowObj[d] = code;
      });
      rowObj["Total Hadir"] = counts.h;
      rowObj["Total Izin"] = counts.i;
      rowObj["Total Sakit"] = counts.s;
      rowObj["Total Alfa"] = counts.a;
      rowObj["% Kehadiran"] = `${pct}%`;
      return rowObj;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Matriks");
    XLSX.writeFile(
      wb,
      `rekap_matriks_${selectedKelas}_${selectedMapel}.xlsx`
    );
    toast.success("Rekap matriks absensi berhasil diekspor!");
  };

  const totalDatesCount = historyData.dates.length;
  const maxStartIndex = Math.max(0, totalDatesCount - WINDOW_SIZE);
  const safeStartIndex = Math.min(Math.max(0, dateWindowIndex), maxStartIndex);

  const visibleDates = viewAllDates
    ? historyData.dates
    : historyData.dates.slice(safeStartIndex, safeStartIndex + WINDOW_SIZE);

  const currentStartNum = totalDatesCount === 0 ? 0 : safeStartIndex + 1;
  const currentEndNum = viewAllDates
    ? totalDatesCount
    : Math.min(safeStartIndex + WINDOW_SIZE, totalDatesCount);

  const canPrev = !viewAllDates && safeStartIndex > 0;
  const canNext = !viewAllDates && safeStartIndex < maxStartIndex;

  const handlePrevDates = () => {
    setDateWindowIndex((prev) => Math.max(0, prev - WINDOW_SIZE));
  };

  const handleNextDates = () => {
    setDateWindowIndex((prev) => Math.min(maxStartIndex, prev + WINDOW_SIZE));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presensi & Absensi Siswa"
        badge="Portal Guru"
        description="Input kehadiran siswa spesifik pada jam pelajaran atau kelas perwalian yang Anda ampu"
        icon={ClipboardCheck}
      >
        {showGrid && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleDownloadTemplate}
            >
              <Download className="h-3.5 w-3.5 text-slate-500" /> Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleExportData}
            >
              <Save className="h-3.5 w-3.5 text-slate-500" /> Ekspor Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => importRef.current?.click()}
              disabled={importing}
            >
              {importing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5 text-slate-500" />
              )}
              Impor Excel
            </Button>
            <input
              ref={importRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImport}
            />
          </>
        )}
      </PageHeader>

      {/* Step 1: Select class, mapel, & date */}
      <SessionSetup
        active={showGrid}
        icon={ClipboardCheck}
        eyebrow="Langkah 1 dari 2"
        title="Mulai Sesi Presensi Siswa"
        description="Pilih kelas penugasan, mata pelajaran, dan tanggal pertemuan untuk membuka lembar pencatatan kehadiran."
        submitLabel="Buka Lembar Presensi"
        onSubmit={handleLoadGrid}
        loading={loading}
        disabled={!selectedKelas || !selectedMapel}
        onChangeSession={handleChangeSession}
        chips={[
          { label: "Kelas", value: selectedKelas },
          {
            label: "Mapel",
            value:
              selectedMapel === "Umum"
                ? "Absen Pagi (Wali Kelas)"
                : selectedMapel,
          },
          { label: "Tanggal", value: formatTanggalID(tanggal) },
        ]}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Kelas Diampu
            </Label>
            <Select
              value={selectedKelas}
              onValueChange={(val) => setSelectedKelas(val as string)}
            >
              <SelectTrigger className="h-9 w-full text-xs">
                <SelectValue placeholder="Pilih Kelas" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((k) => (
                  <SelectItem key={k.id} value={k.namaKelas}>
                    {k.namaKelas}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Mata Pelajaran
            </Label>
            <SearchableSelect
              value={selectedMapel}
              onValueChange={(val) => setSelectedMapel(val || "Umum")}
              options={mapelOptions}
              placeholder="Pilih atau cari mata pelajaran..."
              searchPlaceholder="Ketik nama mapel (mis. Matematika, Fisika)..."
              emptyMessage="Mata pelajaran tidak ditemukan"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-700">
              Tanggal Pertemuan
            </Label>
            {isSunday && (
              <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                Hari Minggu
              </span>
            )}
          </div>
          <Input
            type="date"
            max={getTodayWIB()}
            className={`h-9 w-full bg-white text-xs ${
              isSunday
                ? "border-amber-400 focus-visible:ring-amber-400"
                : "border-slate-200"
            }`}
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
          {isSunday && (
            <p className="flex items-center gap-1 text-[11px] font-normal text-amber-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Tanggal terpilih adalah hari libur (Minggu).
            </p>
          )}
        </div>
      </SessionSetup>

      {/* Step 2: Attendance Grid */}
      {showGrid && (
        <>
          {/* Session Summary Bar */}
          <div className="py-3 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500 mr-1">
                Ringkasan ({siswaList.length} siswa):
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 tabular-nums">
                <span className="w-1.5 h-1.5 rounded-xs bg-emerald-600" />
                Hadir: {summary.hadir}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 tabular-nums">
                <span className="w-1.5 h-1.5 rounded-xs bg-amber-600" />
                Izin: {summary.izin}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 tabular-nums">
                <span className="w-1.5 h-1.5 rounded-xs bg-indigo-600" />
                Sakit: {summary.sakit}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 tabular-nums">
                <span className="w-1.5 h-1.5 rounded-xs bg-rose-600" />
                Alfa: {summary.alfa}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Hapus Sesi
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus Data Absensi?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Anda yakin ingin menghapus data absensi{" "}
                      <b>{selectedKelas}</b> untuk mapel <b>{selectedMapel}</b>{" "}
                      pada tanggal <b>{tanggal}</b>? Tindakan ini tidak dapat
                      dibatalkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>
                      Batal
                    </AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleting}
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete();
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      {deleting ? "Menghapus..." : "Ya, Hapus"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleMarkAllPresent}
              >
                <CheckCheck className="h-3.5 w-3.5 text-emerald-600" /> Tandai
                Hadir Semua
              </Button>
            </div>
          </div>

          {/* Grid Table */}
          <div className="border-b border-slate-200 overflow-x-auto">
                <table className="w-full min-w-max border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 uppercase tracking-wider text-xs">
                      <th className="px-5 py-3 font-semibold w-14">No</th>
                      <th className="px-4 py-3 font-semibold w-28">NIS</th>
                      <th className="px-4 py-3 font-semibold min-w-[220px] whitespace-nowrap">
                        Nama Siswa
                      </th>
                      <th className="px-5 py-3 text-center font-semibold">
                        Status Kehadiran
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {siswaList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-10 text-center text-slate-500"
                        >
                          Tidak ada siswa terdaftar di kelas ini.
                        </td>
                      </tr>
                    ) : (
                      siswaList.map((siswa, i) => {
                        const currentStatus =
                          attendanceData[siswa.studentId] || "Hadir";
                        return (
                          <tr
                            key={siswa.studentId}
                            className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer"
                          >
                            <td className="px-5 py-3 text-slate-500 group-hover/row:text-slate-400 font-mono transition-colors">
                              {i + 1}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-600 group-hover/row:text-slate-400 transition-colors">
                              {siswa.nis}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-md bg-slate-100 group-hover/row:bg-slate-800 text-slate-700 group-hover/row:text-white font-semibold flex items-center justify-center text-xs border border-slate-200 group-hover/row:border-slate-700 shrink-0 transition-colors">
                                  {getInitials(siswa.namaLengkap)}
                                </div>
                                <span className="font-semibold text-slate-800 group-hover/row:text-white transition-colors">
                                  {siswa.namaLengkap}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-2.5">
                              <div className="flex items-center justify-center gap-1.5">
                                {statusList.map((status) => {
                                  const isActive = currentStatus === status;
                                  return (
                                    <button
                                      key={status}
                                      type="button"
                                      onClick={() =>
                                        handleStatusChange(
                                          siswa.studentId,
                                          status
                                        )
                                      }
                                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                                        isActive
                                          ? statusActiveStyles[status]
                                          : "border-slate-200 bg-white group-hover/row:bg-slate-900/80 group-hover/row:border-slate-700 text-slate-500 group-hover/row:text-slate-300 hover:bg-slate-50 hover:text-slate-700 group-hover/row:hover:bg-slate-800 group-hover/row:hover:text-white"
                                      }`}
                                      aria-label={`Tandai ${siswa.namaLengkap} ${status}`}
                                    >
                                      {status}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              size="lg"
              className="gap-2 w-full sm:w-auto"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Menyimpan..." : "Simpan Semua Absensi"}
            </Button>
          </div>

          {/* History Table */}
          <div className="pt-2 space-y-4">
            <div className="pb-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  Matriks Riwayat Kehadiran (
                  {selectedMapel === "Umum" ? "Umum / Wali Kelas" : selectedMapel}
                  )
                  {loadingHistory && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  Rekam jejak presensi seluruh pertemuan yang telah tersimpan untuk mata pelajaran ini
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {historyData.dates.length > WINDOW_SIZE && (
                  <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setViewAllDates(false)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                        !viewAllDates
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      5 Hari
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewAllDates(true)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                        viewAllDates
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Semua ({historyData.dates.length})
                    </button>
                  </div>
                )}

                {historyData.dates.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportMatrix}
                    className="h-8 gap-1.5 text-xs font-semibold bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs self-start md:self-auto"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    Ekspor Rekap Matriks
                  </Button>
                )}
              </div>
            </div>

            {/* Legend & Pagination Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-slate-700">Keterangan:</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded border bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                    H
                  </span>
                  <span className="text-slate-600 font-medium">Hadir</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded border bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                    I
                  </span>
                  <span className="text-slate-600 font-medium">Izin</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded border bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                    S
                  </span>
                  <span className="text-slate-600 font-medium">Sakit</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded border bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                    A
                  </span>
                  <span className="text-slate-600 font-medium">Alfa</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-400">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded border bg-slate-100 text-slate-400 border-slate-200 text-[10px] font-bold">
                    -
                  </span>
                  <span>Belum Tercatat</span>
                </span>
              </div>

              {historyData.dates.length > WINDOW_SIZE && !viewAllDates ? (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-[11px] font-medium text-slate-600 tabular-nums">
                    Pertemuan <span className="font-bold text-slate-900">{currentStartNum}–{currentEndNum}</span> dari{" "}
                    <span className="font-bold text-slate-900">{totalDatesCount}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 bg-white border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-40"
                      onClick={handlePrevDates}
                      disabled={!canPrev}
                      title="5 Pertemuan Sebelumnya"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 bg-white border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-40"
                      onClick={handleNextDates}
                      disabled={!canNext}
                      title="5 Pertemuan Berikutnya"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 italic">
                  * Kolom No, NIS, & Nama Siswa terkunci (sticky) saat digulir
                </span>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
              {historyData.dates.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500">
                  Belum ada riwayat absensi yang disimpan untuk mata pelajaran ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                      <tr>
                        {/* Sticky Left Columns */}
                        <th className="sticky left-0 z-20 bg-slate-50 px-3 py-3 font-semibold w-12 min-w-[48px] text-center border-r border-slate-200">
                          No
                        </th>
                        <th className="sticky left-12 z-20 bg-slate-50 px-3 py-3 font-semibold w-24 min-w-[96px] text-center border-r border-slate-200">
                          NIS
                        </th>
                        <th className="sticky left-[144px] z-20 bg-slate-50 px-4 py-3 font-semibold min-w-[200px] border-r-2 border-slate-300 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.06)]">
                          Nama Siswa
                        </th>

                        {/* Visible Dates */}
                        {visibleDates.map((date) => {
                          const dateObj = new Date(`${date}T00:00:00`);
                          const dayName = dateObj.toLocaleDateString("id-ID", {
                            weekday: "short",
                          });
                          const dayMonth = dateObj.toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                          });
                          const isWeekend =
                            dateObj.getDay() === 0 || dateObj.getDay() === 6;
                          return (
                            <th
                              key={date}
                              className={`px-3 py-2.5 text-center font-semibold whitespace-nowrap border-r border-slate-100 ${
                                isWeekend
                                  ? "bg-amber-50/60 text-amber-900"
                                  : ""
                              }`}
                            >
                              <div className="text-[10px] text-slate-400 font-normal uppercase">
                                {dayName}
                              </div>
                              <div className="text-xs text-slate-700 font-semibold">
                                {dayMonth}
                              </div>
                            </th>
                          );
                        })}

                        {/* Summary Columns */}
                        <th
                          className="px-3 py-2.5 text-center font-bold text-emerald-700 bg-emerald-50/60 border-l-2 border-slate-300 w-12 min-w-[48px]"
                          title="Total Hadir"
                        >
                          H
                        </th>
                        <th
                          className="px-3 py-2.5 text-center font-bold text-amber-700 bg-amber-50/60 border-l border-slate-200 w-12 min-w-[48px]"
                          title="Total Izin"
                        >
                          I
                        </th>
                        <th
                          className="px-3 py-2.5 text-center font-bold text-indigo-700 bg-indigo-50/60 border-l border-slate-200 w-12 min-w-[48px]"
                          title="Total Sakit"
                        >
                          S
                        </th>
                        <th
                          className="px-3 py-2.5 text-center font-bold text-rose-700 bg-rose-50/60 border-l border-slate-200 w-12 min-w-[48px]"
                          title="Total Alfa"
                        >
                          A
                        </th>
                        <th
                          className="px-3.5 py-2.5 text-center font-bold text-slate-700 bg-slate-100/80 border-l border-slate-200 min-w-[76px]"
                          title="Persentase Kehadiran"
                        >
                          % Hadir
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {historyData.records.map((siswa, index) => {
                        const counts = historyData.dates.reduce(
                          (acc, d) => {
                            const st = siswa.history[d];
                            if (st === "Hadir") acc.h++;
                            else if (st === "Izin") acc.i++;
                            else if (st === "Sakit") acc.s++;
                            else if (st === "Alfa") acc.a++;
                            return acc;
                          },
                          { h: 0, i: 0, s: 0, a: 0 }
                        );
                        const totalM =
                          counts.h + counts.i + counts.s + counts.a;
                        const pct =
                          totalM > 0
                            ? Math.round((counts.h / totalM) * 100)
                            : 0;
                        const pctBadgeClass =
                          pct >= 85
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : pct >= 70
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200";

                        return (
                          <tr
                            key={siswa.id}
                            className="group/matrix transition-all duration-200 hover:bg-[#091524] cursor-pointer"
                          >
                            {/* Sticky Left Body Cells */}
                            <td className="sticky left-0 z-10 bg-white group-hover/matrix:bg-[#091524] px-3 py-2.5 text-slate-500 group-hover/matrix:text-slate-400 tabular-nums text-center border-r border-slate-200 group-hover/matrix:border-slate-800 font-mono transition-colors">
                              {index + 1}
                            </td>
                            <td className="sticky left-12 z-10 bg-white group-hover/matrix:bg-[#091524] px-3 py-2.5 tabular-nums text-slate-600 group-hover/matrix:text-slate-400 text-center border-r border-slate-200 group-hover/matrix:border-slate-800 font-mono transition-colors">
                              {siswa.nis}
                            </td>
                            <td className="sticky left-[144px] z-10 bg-white group-hover/matrix:bg-[#091524] px-4 py-2.5 font-semibold text-slate-800 group-hover/matrix:text-white border-r-2 border-slate-300 group-hover/matrix:border-slate-700 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.06)] transition-colors">
                              {siswa.nama}
                            </td>

                            {/* Visible Date Badges */}
                            {visibleDates.map((date) => {
                              const status = siswa.history[date];
                              const pillStyle =
                                statusHistoryBadge[status] ||
                                "bg-slate-50 text-slate-400 border-slate-200 group-hover/matrix:bg-slate-900 group-hover/matrix:border-slate-700";
                              const shortCode =
                                status === "Hadir"
                                  ? "H"
                                  : status === "Izin"
                                  ? "I"
                                  : status === "Sakit"
                                  ? "S"
                                  : status === "Alfa"
                                  ? "A"
                                  : "-";
                              return (
                                <td
                                  key={date}
                                  className="px-2.5 py-2 text-center border-r border-slate-100 group-hover/matrix:border-slate-800/80 transition-colors"
                                >
                                  <span
                                    className={`inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs font-bold ${pillStyle}`}
                                  >
                                    {shortCode}
                                  </span>
                                </td>
                              );
                            })}

                            {/* Summary Columns Data (Calculated Across Full Semester) */}
                            <td className="px-3 py-2 text-center font-bold text-emerald-700 group-hover/matrix:text-emerald-400 bg-emerald-50/30 group-hover/matrix:bg-emerald-950/20 border-l-2 border-slate-300 group-hover/matrix:border-slate-700 tabular-nums transition-colors">
                              {counts.h}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-amber-700 group-hover/matrix:text-amber-400 bg-amber-50/30 group-hover/matrix:bg-amber-950/20 border-l border-slate-200 group-hover/matrix:border-slate-800 tabular-nums transition-colors">
                              {counts.i}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-indigo-700 group-hover/matrix:text-indigo-400 bg-indigo-50/30 group-hover/matrix:bg-indigo-950/20 border-l border-slate-200 group-hover/matrix:border-slate-800 tabular-nums transition-colors">
                              {counts.s}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-rose-700 group-hover/matrix:text-rose-400 bg-rose-50/30 group-hover/matrix:bg-rose-950/20 border-l border-slate-200 group-hover/matrix:border-slate-800 tabular-nums transition-colors">
                              {counts.a}
                            </td>
                            <td className="px-3 py-2 text-center border-l border-slate-200 group-hover/matrix:border-slate-800 transition-colors">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-xs font-bold border tabular-nums ${pctBadgeClass}`}
                              >
                                {pct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Footer Row (Daily for Visible Dates & Cumulative Totals) */}
                    {(() => {
                      const grandTotals = historyData.dates.reduce(
                        (acc, date) => {
                          historyData.records.forEach((s) => {
                            const st = s.history[date];
                            if (st === "Hadir") acc.h++;
                            else if (st === "Izin") acc.i++;
                            else if (st === "Sakit") acc.s++;
                            else if (st === "Alfa") acc.a++;
                          });
                          return acc;
                        },
                        { h: 0, i: 0, s: 0, a: 0 }
                      );
                      const grandTotalAll =
                        grandTotals.h +
                        grandTotals.i +
                        grandTotals.s +
                        grandTotals.a;
                      const grandTotalPct =
                        grandTotalAll > 0
                          ? Math.round((grandTotals.h / grandTotalAll) * 100)
                          : 0;

                      return (
                        <tfoot className="bg-slate-50 font-semibold text-xs border-t-2 border-slate-300">
                          <tr>
                            <td
                              colSpan={3}
                              className="sticky left-0 z-20 bg-slate-100 px-4 py-2.5 text-slate-700 border-r-2 border-slate-300 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.06)]"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold">Total Hadir Harian</span>
                                <span className="text-[11px] text-slate-500 font-normal">
                                  ({historyData.records.length} Siswa)
                                </span>
                              </div>
                            </td>

                            {visibleDates.map((date) => {
                              const dailyHadir = historyData.records.filter(
                                (r) => r.history[date] === "Hadir"
                              ).length;
                              return (
                                <td
                                  key={date}
                                  className="px-2 py-2 text-center border-r border-slate-100"
                                >
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                    {dailyHadir}
                                  </span>
                                </td>
                              );
                            })}

                            <td className="px-3 py-2 text-center font-bold text-emerald-800 bg-emerald-100/70 border-l-2 border-slate-300 tabular-nums">
                              {grandTotals.h}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-amber-800 bg-amber-100/70 border-l border-slate-200 tabular-nums">
                              {grandTotals.i}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-indigo-800 bg-indigo-100/70 border-l border-slate-200 tabular-nums">
                              {grandTotals.s}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-rose-800 bg-rose-100/70 border-l border-slate-200 tabular-nums">
                              {grandTotals.a}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-slate-800 bg-slate-200/80 border-l border-slate-200 tabular-nums">
                              {grandTotalPct}%
                            </td>
                          </tr>
                        </tfoot>
                      );
                    })()}
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
