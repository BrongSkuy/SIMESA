"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
  ClipboardCheck,
  Save,
  Download,
  Upload,
  CheckCheck,
  Calendar as CalendarIcon,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { getTodayWIB } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    "bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-500/20",
  Alfa:
    "bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20",
};

const statusHistoryBadge: Record<string, string> = {
  Hadir: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Izin: "bg-amber-50 text-amber-700 border-amber-200",
  Sakit: "bg-blue-50 text-blue-700 border-blue-200",
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
  const [isWaliKelas, setIsWaliKelas] = useState(false);
  const [waliClasses, setWaliClasses] = useState<string[]>([]);
  const [historyData, setHistoryData] = useState<{
    dates: string[];
    records: HistoryRecord[];
  }>({ dates: [], records: [] });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

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
      setHistoryData({
        dates: Array.isArray(data?.dates) ? data.dates : [],
        records: Array.isArray(data?.records) ? data.records : [],
      });
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
      setShowGrid(true);

      await fetchHistory();
    } catch {
      toast.error("Gagal memuat data absensi");
    } finally {
      setLoading(false);
    }
  }, [selectedKelas, tanggal, selectedMapel, fetchHistory]);

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

      if (!res.ok) throw new Error("Gagal menyimpan");

      const result = await res.json();
      toast.success(`Absensi berhasil disimpan! (${result.count} siswa)`);
      handleLoadGrid();
    } catch {
      toast.error("Gagal menyimpan absensi");
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presensi & Absensi Siswa"
        badge="Portal Guru"
        description="Input kehadiran siswa spesifik pada jam pelajaran atau rombel perwalian yang Anda ampu"
        icon={ClipboardCheck}
      >
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
      </PageHeader>

      {/* Step 1: Select class, mapel, & date */}
      <div className="pb-5 border-b border-slate-200">
        <div className="pb-3 mb-4 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900">
            Pengaturan Sesi Absensi
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Pilih kelas penugasan, mata pelajaran, dan tanggal pertemuan
          </CardDescription>
        </div>
        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs font-medium text-slate-700">
                Kelas Diampu
              </Label>
              <Select
                value={selectedKelas}
                onValueChange={(val) => setSelectedKelas(val as string)}
              >
                <SelectTrigger className="h-9 text-xs">
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

            <div className="space-y-1.5 flex-1 sm:min-w-[240px]">
              <Label className="text-xs font-medium text-slate-700">
                Mata Pelajaran
              </Label>
              <Select
                value={selectedMapel}
                onValueChange={(val) => setSelectedMapel(val as string)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih Mapel" />
                </SelectTrigger>
                <SelectContent>
                  {isWaliKelas && waliClasses.includes(selectedKelas) && (
                    <SelectItem value="Umum">
                      Absen Pagi (Wali Kelas)
                    </SelectItem>
                  )}
                  {subjects
                    .filter((s) => s.kelas?.includes(selectedKelas))
                    .map((s, i) => (
                      <SelectItem key={i} value={s.namaMapel}>
                        {s.namaMapel}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 flex-1">
              <Label className="text-xs font-medium text-slate-700">
                Tanggal Pertemuan
              </Label>
              <Input
                type="date"
                className="h-9 text-xs"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </div>

            <Button
              className="gap-1.5 shrink-0 h-9"
              onClick={handleLoadGrid}
              disabled={loading || !selectedKelas || !selectedMapel}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CalendarIcon className="h-3.5 w-3.5" />
              )}
              Muat Absensi
            </Button>
          </div>
        </div>
      </div>

      {/* Step 2: Attendance Grid */}
      {showGrid && (
        <>
          {/* Session Summary Bar */}
          <div className="py-3.5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                Kelas {selectedKelas} ·{" "}
                {selectedMapel === "Umum" ? "Wali Kelas" : selectedMapel}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 tabular-nums">
                <span className="w-1.5 h-1.5 rounded-xs bg-emerald-600" />
                Hadir: {summary.hadir}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 tabular-nums">
                <span className="w-1.5 h-1.5 rounded-xs bg-amber-600" />
                Izin: {summary.izin}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 tabular-nums">
                <span className="w-1.5 h-1.5 rounded-xs bg-[#1e3a8a]" />
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
                      className="border-rose-200 text-rose-700 hover:bg-rose-50"
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
                className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white gap-1.5"
                onClick={handleMarkAllPresent}
              >
                <CheckCheck className="h-3.5 w-3.5 text-emerald-400" /> Tandai
                Hadir Semua
              </Button>
            </div>
          </div>

          {/* Grid Table */}
          <div className="pt-2 space-y-3">
            <div>
              <div className="overflow-x-auto">
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
                            className="transition-colors hover:bg-slate-50/80"
                          >
                            <td className="px-5 py-3 text-slate-500 font-mono">
                              {i + 1}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-600">
                              {siswa.nis}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-md bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs border border-slate-200 shrink-0">
                                  {getInitials(siswa.namaLengkap)}
                                </div>
                                <span className="font-semibold text-slate-800">
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
            </div>
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
          <div className="pt-2 space-y-3">
            <div className="pb-3 mb-4 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                Matriks Riwayat Kehadiran (
                {selectedMapel === "Umum" ? "Umum / Wali Kelas" : selectedMapel}
                )
                {loadingHistory && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                )}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Rekam jejak seluruh pertemuan yang telah tersimpan untuk mata
                pelajaran ini
              </CardDescription>
            </div>
            <div>
              {historyData.dates.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500">
                  Belum ada riwayat absensi yang disimpan untuk mata pelajaran
                  ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max text-left border-collapse">
                    <thead className="bg-slate-50/75 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold w-12 text-center">
                          No
                        </th>
                        <th className="px-4 py-3 font-semibold text-center">
                          NIS
                        </th>
                        <th className="px-4 py-3 font-semibold min-w-[200px]">
                          Nama Siswa
                        </th>
                        {historyData.dates.map((date) => (
                          <th
                            key={date}
                            className="px-3 py-3 text-center font-semibold whitespace-nowrap"
                          >
                            {new Date(date).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {historyData.records.map((siswa, index) => (
                        <tr
                          key={siswa.id}
                          className="transition-colors hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-2.5 text-slate-500 font-mono text-center">
                            {index + 1}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-600 text-center">
                            {siswa.nis}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-slate-800">
                            {siswa.nama}
                          </td>
                          {historyData.dates.map((date) => {
                            const status = siswa.history[date];
                            const pillStyle =
                              statusHistoryBadge[status] ||
                              "bg-slate-50 text-slate-400 border-slate-200";
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
                                className="px-3 py-2.5 text-center"
                              >
                                <span
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs font-bold ${pillStyle}`}
                                >
                                  {shortCode}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
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
