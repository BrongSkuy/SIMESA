"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
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
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { getTodayWIB } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { AttendanceHistoryMatrix } from "@/components/absensi/attendance-history-matrix";
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
  Hadir:
    "bg-emerald-50 text-emerald-700 border-emerald-200",
  Izin:
    "bg-amber-50 text-amber-700 border-amber-200",
  Sakit:
    "bg-indigo-50 text-indigo-700 border-indigo-200",
  Alfa:
    "bg-rose-50 text-rose-700 border-rose-200",
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
  const [waliClasses, setWaliClasses] = useState<string[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedMapel, setSelectedMapel] = useState("");
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
  const [changeSessionOpen, setChangeSessionOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const isSunday = tanggal
    ? new Date(`${tanggal}T00:00:00`).getDay() === 0
    : false;

  const mapelOptions = useMemo(() => {
    return subjects
      .filter(
        (s) => s.namaMapel !== "Umum" && s.kelas?.includes(selectedKelas)
      )
      .map((s) => ({
        value: s.namaMapel,
        label: s.namaMapel,
        sublabel: "Mata Pelajaran Diampu",
      }));
  }, [selectedKelas, subjects]);

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

  // Fetch classes and curriculum subjects on mount
  useEffect(() => {
    const queryKelas =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("kelas")
        : null;

    Promise.all([
      fetch("/api/classes").then((r) => {
        if (!r.ok) throw new Error("Gagal memuat daftar kelas");
        return r.json();
      }),
      fetch("/api/teachers/me/subjects").then((r) => {
        if (!r.ok) throw new Error("Gagal memuat mata pelajaran guru");
        return r.json();
      }),
    ])
      .then(([classesData, subjectsRes]) => {
        const wClasses: string[] = Array.isArray(subjectsRes?.waliClasses)
          ? subjectsRes.waliClasses
          : [];
        setWaliClasses(wClasses);

        const subjectsData: MapelRow[] = Array.isArray(subjectsRes?.subjects)
          ? subjectsRes.subjects.filter(
            (s: MapelRow) => s.namaMapel && s.namaMapel !== "Umum"
          )
          : [];
        setSubjects(subjectsData);

        const teachingClassSet = new Set<string>(
          Array.isArray(subjectsRes?.teachingClasses)
            ? subjectsRes.teachingClasses
            : []
        );
        if (teachingClassSet.size === 0) {
          subjectsData.forEach((s) => {
            s.kelas?.forEach((k) => {
              if (k) teachingClassSet.add(k);
            });
          });
        }

        const filteredClasses = (
          Array.isArray(classesData) ? classesData : []
        ).filter((c: KelasRow) => teachingClassSet.has(c.namaKelas));
        setClasses(filteredClasses);

        const matchedQueryClass =
          queryKelas &&
            filteredClasses.some((c: KelasRow) => c.namaKelas === queryKelas)
            ? queryKelas
            : null;
        const firstClass =
          matchedQueryClass ||
          (filteredClasses.length > 0 ? filteredClasses[0].namaKelas : "");

        if (firstClass) {
          setSelectedKelas(firstClass);
          const firstMapel =
            subjectsData.find((s) => s.kelas?.includes(firstClass))
              ?.namaMapel || "";
          setSelectedMapel(firstMapel);
        }
      })
      .catch((err: unknown) => {
        toast.error(
          err instanceof Error ? err.message : "Gagal memuat data awal"
        );
      })
      .finally(() => {
        setLoadingInitial(false);
      });
  }, []);

  const handleKelasChange = (newKelas: string | null) => {
    if (!newKelas) return;
    setSelectedKelas(newKelas);
    const validForClass = subjects.filter(
      (s) => s.namaMapel !== "Umum" && s.kelas?.includes(newKelas)
    );
    if (!validForClass.some((s) => s.namaMapel === selectedMapel)) {
      setSelectedMapel(validForClass[0]?.namaMapel || "");
    }
  };

  const fetchHistory = useCallback(async () => {
    if (!selectedKelas || !selectedMapel) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(
        `/api/attendance/history?kelas=${encodeURIComponent(selectedKelas)}&mapel=${encodeURIComponent(selectedMapel)}`
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Gagal memuat riwayat absensi");
      }
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
      setHistoryData({ dates: [], records: [] });
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedKelas, selectedMapel]);

  const handleLoadGrid = useCallback(async () => {
    if (!selectedKelas || !selectedMapel) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attendance?kelas=${encodeURIComponent(selectedKelas)}&tanggal=${tanggal}&mapel=${encodeURIComponent(selectedMapel)}`
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data)) {
        throw new Error(data?.error || "Gagal memuat data absensi");
      }
      const rows = data as AttendanceStudent[];
      setSiswaList(rows);

      const init: Record<string, Status> = {};
      rows.forEach((s) => {
        init[s.studentId] = s.status || "Hadir";
      });
      setAttendanceData(init);
      loadedSnapshotRef.current = JSON.stringify(init);
      setShowGrid(true);

      await fetchHistory();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memuat data absensi"
      );
    } finally {
      setLoading(false);
    }
  }, [selectedKelas, tanggal, selectedMapel, fetchHistory]);

  const handleChangeSession = () => {
    const isDirty =
      loadedSnapshotRef.current !== JSON.stringify(attendanceData);
    if (isDirty) {
      setChangeSessionOpen(true);
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

      const result = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(result?.error || "Gagal menyimpan absensi");
      }

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

      const errJson = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(errJson?.error || "Gagal menghapus absensi");
      }

      toast.success("Data absensi berhasil dihapus!");
      handleLoadGrid();
      setDeleteOpen(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus absensi"
      );
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
      let invalidStatusCount = 0;
      let unknownNisCount = 0;

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

        const upperStatus = rawStatus.toUpperCase();
        let status: Status | null = null;
        if (upperStatus === "H" || upperStatus === "HADIR") status = "Hadir";
        else if (upperStatus === "I" || upperStatus === "IZIN") status = "Izin";
        else if (upperStatus === "S" || upperStatus === "SAKIT") status = "Sakit";
        else if (upperStatus === "A" || upperStatus === "ALFA") status = "Alfa";

        const matched = siswaList.find((s) => s.nis === nis);
        if (!matched) {
          if (nis) unknownNisCount++;
          continue;
        }

        if (!status) {
          invalidStatusCount++;
          continue;
        }

        statusMap[matched.studentId] = status;
      }

      const importedCount = Object.keys(statusMap).length;
      if (importedCount === 0) {
        toast.error(
          "Tidak ada baris valid yang diimpor. Pastikan NIS sesuai dan StatusKehadiran berisi Hadir/Izin/Sakit/Alfa (atau H/I/S/A)."
        );
        return;
      }

      setAttendanceData((prev) => ({ ...prev, ...statusMap }));
      toast.success(
        `${importedCount} status kehadiran diimpor dari file. Klik 'Simpan Semua Absensi' untuk menyimpan.`
      );
      if (invalidStatusCount > 0 || unknownNisCount > 0) {
        toast.warning(
          `Sebagian baris dilewati (${invalidStatusCount} status kosong/tidak dikenali, ${unknownNisCount} NIS tidak cocok).`
        );
      }
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
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Kehadiran");
    XLSX.writeFile(
      wb,
      `rekap_kehadiran_${selectedKelas}_${selectedMapel}.xlsx`
    );
    toast.success("Rekap kehadiran berhasil diekspor");
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

  if (loadingInitial) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presensi & Absensi Siswa"
        badge="Portal Guru"
        description="Input kehadiran siswa spesifik pada mata pelajaran dan kelas yang Anda ampu"
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

      {classes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center space-y-3">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">
              Belum Ada Penugasan Mata Pelajaran Aktif
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Pencatatan presensi hanya berlaku untuk mata pelajaran kurikulum
              yang ditugaskan kepada Anda oleh Administrator.
            </p>
          </div>
          {waliClasses.length > 0 && (
            <Link href="/guru/rekap" className="inline-block pt-1">
              <Button variant="outline" size="sm" className="gap-1.5">
                Pantau Rekap Kelas Perwalian <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Confirm Change Session Dialog when unsaved changes exist */}
          <AlertDialog
            open={changeSessionOpen}
            onOpenChange={setChangeSessionOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ganti Sesi Presensi?</AlertDialogTitle>
                <AlertDialogDescription>
                  Perubahan presensi pada sesi ini belum disimpan dan akan
                  hilang jika Anda berpindah sesi. Tetap lanjutkan?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Kembali</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setChangeSessionOpen(false);
                    setShowGrid(false);
                  }}
                >
                  Ya, Ganti Sesi
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
              { label: "Mapel", value: selectedMapel },
              { label: "Tanggal", value: formatTanggalID(tanggal) },
            ]}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Kelas Diampu
                </Label>
                <Select value={selectedKelas} onValueChange={handleKelasChange}>
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
                  onValueChange={(val) => setSelectedMapel(val || "")}
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
                className={`h-9 w-full bg-white text-xs ${isSunday
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
                        <AlertDialogTitle>
                          Hapus Data Absensi?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Anda yakin ingin menghapus data absensi{" "}
                          <b>{selectedKelas}</b> untuk mapel{" "}
                          <b>{selectedMapel}</b> pada tanggal <b>{tanggal}</b>?
                          Tindakan ini tidak dapat dibatalkan.
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
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />{" "}
                    Tandai Hadir Semua
                  </Button>
                </div>
              </div>

              {/* Grid Table Desktop (>= md) */}
              <div className="hidden md:block border-b border-slate-200 overflow-x-auto">
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
                            className="group/row transition-all duration-200 hover:bg-slate-50/90 cursor-pointer"
                          >
                            <td className="px-5 py-3 text-slate-500 font-mono transition-colors">
                              {i + 1}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-600 transition-colors">
                              {siswa.nis}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-md bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs border border-slate-200 shrink-0 transition-colors">
                                  {getInitials(siswa.namaLengkap)}
                                </div>
                                <span className="font-semibold text-slate-800 transition-colors">
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
                                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${isActive
                                        ? statusActiveStyles[status]
                                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
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

              {/* Grid Cards Mobile (< md) */}
              <div className="block md:hidden border-b border-slate-200 divide-y divide-slate-100 bg-white">
                {siswaList.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-xs">
                    Tidak ada siswa terdaftar di kelas ini.
                  </div>
                ) : (
                  siswaList.map((siswa, i) => {
                    const currentStatus =
                      attendanceData[siswa.studentId] || "Hadir";
                    return (
                      <div
                        key={siswa.studentId}
                        className="p-3.5 space-y-2.5 bg-white hover:bg-slate-50/75 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-xs text-slate-400 w-5 shrink-0">
                              #{i + 1}
                            </span>
                            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs border border-slate-200 shrink-0">
                              {getInitials(siswa.namaLengkap)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 text-sm truncate">
                                {siswa.namaLengkap}
                              </p>
                              <p className="font-mono text-[11px] text-slate-500">
                                {siswa.nis}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Status Buttons Grid: Large Touch Targets */}
                        <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                          {statusList.map((status) => {
                            const isActive = currentStatus === status;
                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() =>
                                  handleStatusChange(siswa.studentId, status)
                                }
                                className={`py-2 px-1 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${isActive
                                  ? statusActiveStyles[status] + " shadow-xs font-bold"
                                  : "border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100 active:scale-95"
                                  }`}
                                aria-label={`Tandai ${siswa.namaLengkap} ${status}`}
                              >
                                {status}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Save Button Desktop / In-flow */}
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

              {/* Floating Mobile Sticky Save Bar (Visible only on mobile < md when students are present) */}
              {siswaList.length > 0 && (
                <div className="fixed bottom-0 inset-x-0 z-40 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl md:hidden flex items-center justify-between gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 text-xs gap-1.5 shrink-0 border-slate-300"
                    onClick={handleMarkAllPresent}
                  >
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Semua Hadir
                  </Button>
                  <Button
                    size="sm"
                    className="h-10 text-xs font-semibold gap-1.5 flex-1 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white shadow-xs"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {saving ? "Menyimpan..." : "Simpan Presensi"}
                  </Button>
                </div>
              )}

              {/* History Table */}
              <AttendanceHistoryMatrix
                selectedMapel={selectedMapel}
                loadingHistory={loadingHistory}
                historyData={historyData}
                windowSize={WINDOW_SIZE}
                viewAllDates={viewAllDates}
                onViewAllDatesChange={setViewAllDates}
                visibleDates={visibleDates}
                currentStartNum={currentStartNum}
                currentEndNum={currentEndNum}
                totalDatesCount={totalDatesCount}
                canPrev={canPrev}
                canNext={canNext}
                onPrevDates={handlePrevDates}
                onNextDates={handleNextDates}
                onExportMatrix={handleExportMatrix}
                statusHistoryBadge={statusHistoryBadge}
                titlePrefix="Tabel Riwayat Kehadiran"
                exportButtonLabel="Ekspor Rekap Kehadiran"
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
