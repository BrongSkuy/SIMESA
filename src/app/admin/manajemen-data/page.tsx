"use client";

import { useState, useEffect } from "react";
import {
  Database,
  Download,
  Trash2,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  FileSpreadsheet,
  CalendarRange,
  Plus,
  CheckCircle2,
  CalendarPlus,
  RefreshCw,
  Pencil,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AcademicYear {
  id: string;
  tahunAjaran: string;
  semester: "Ganjil" | "Genap";
  isActive: boolean;
}

export default function ManajemenDataPage() {
  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Multi-step reset dialog
  const [resetStep, setResetStep] = useState(0);
  const [confirmText, setConfirmText] = useState("");

  // Academic years state
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [isAddingYear, setIsAddingYear] = useState(false);
  const [newTahunAjaran, setNewTahunAjaran] = useState("");
  const [newSemester, setNewSemester] = useState<"Ganjil" | "Genap">("Ganjil");
  const [newIsActive, setNewIsActive] = useState(false);
  const [submittingYear, setSubmittingYear] = useState(false);

  // Controlled delete & edit dialog state
  const [yearToDelete, setYearToDelete] = useState<AcademicYear | null>(null);
  const [yearToEdit, setYearToEdit] = useState<AcademicYear | null>(null);
  const [editTahunAjaran, setEditTahunAjaran] = useState("");
  const [editSemester, setEditSemester] = useState<"Ganjil" | "Genap">(
    "Ganjil"
  );
  const [editIsActive, setEditIsActive] = useState(false);
  const [submittingEditYear, setSubmittingEditYear] = useState(false);

  const fetchAcademicYears = async () => {
    setLoadingYears(true);
    try {
      const res = await fetch("/api/system/academic-years");
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      setAcademicYears(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Gagal memuat data tahun ajaran.");
    } finally {
      setLoadingYears(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const handleSetActive = async (id: string) => {
    try {
      const res = await fetch("/api/system/academic-years", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mengubah periode aktif");
      }
      toast.success("Periode aktif berhasil diperbarui!");
      fetchAcademicYears();
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Gagal memperbarui periode aktif.";
      toast.error(msg);
    }
  };

  const handleDeleteYear = async (id: string) => {
    try {
      const res = await fetch(`/api/system/academic-years?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus periode");
      }
      toast.success("Periode tahun ajaran berhasil dihapus!");
      fetchAcademicYears();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Gagal menghapus periode.";
      toast.error(msg);
    }
  };

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTahunAjaran) {
      toast.error("Tahun ajaran wajib diisi (contoh: 2025/2026)");
      return;
    }

    const yearPattern = /^\d{4}\/\d{4}$/;
    if (!yearPattern.test(newTahunAjaran)) {
      toast.error("Format Tahun Ajaran harus YYYY/YYYY (contoh: 2025/2026)");
      return;
    }

    setSubmittingYear(true);
    try {
      const res = await fetch("/api/system/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tahunAjaran: newTahunAjaran,
          semester: newSemester,
          isActive: newIsActive,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menambah periode");
      }
      toast.success("Periode tahun ajaran baru berhasil ditambahkan!");
      setIsAddingYear(false);
      setNewTahunAjaran("");
      setNewSemester("Ganjil");
      setNewIsActive(false);
      fetchAcademicYears();
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Gagal menambahkan periode baru.";
      toast.error(msg);
    } finally {
      setSubmittingYear(false);
    }
  };

  const handleOpenEditModal = (year: AcademicYear) => {
    setYearToEdit(year);
    setEditTahunAjaran(year.tahunAjaran);
    setEditSemester(year.semester);
    setEditIsActive(year.isActive);
  };

  const handleEditYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearToEdit) return;

    if (!editTahunAjaran) {
      toast.error("Tahun ajaran wajib diisi (contoh: 2025/2026)");
      return;
    }

    const yearPattern = /^\d{4}\/\d{4}$/;
    if (!yearPattern.test(editTahunAjaran)) {
      toast.error("Format Tahun Ajaran harus YYYY/YYYY (contoh: 2025/2026)");
      return;
    }

    setSubmittingEditYear(true);
    try {
      const res = await fetch("/api/system/academic-years", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: yearToEdit.id,
          tahunAjaran: editTahunAjaran,
          semester: editSemester,
          isActive: editIsActive,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mengedit periode");
      }
      toast.success("Periode tahun ajaran berhasil diperbarui!");
      setYearToEdit(null);
      fetchAcademicYears();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Gagal memperbarui periode.";
      toast.error(msg);
    } finally {
      setSubmittingEditYear(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/system/export-all");
      if (!res.ok) throw new Error("Gagal export");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Export_Seluruh_Data_${getTodayWIB()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("File Excel berhasil diunduh!");
    } catch {
      toast.error("Gagal mengekspor data.");
    } finally {
      setExporting(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/system/reset", { method: "POST" });
      if (!res.ok) throw new Error("Gagal reset");
      const data = await res.json();
      toast.success(data.message || "Data berhasil direset!");
      setResetStep(0);
      setConfirmText("");
      fetchAcademicYears();
    } catch {
      toast.error("Gagal mereset data.");
    } finally {
      setResetting(false);
    }
  };

  const activePeriod = academicYears.find((y) => y.isActive);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Data & Periode Akademik"
        badge="Administrasi Sistem"
        description="Kelola siklus tahun ajaran aktif, ekspor cadangan basis data Excel, dan pemeliharaan sistem"
        icon={Database}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Academic Years Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <CalendarRange className="h-4 w-4 text-blue-600" />
                  Manajemen Periode Tahun Ajaran
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Isolasi pencatatan absensi dan perhitungan SPK berdasarkan
                  semester aktif
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsAddingYear(true)}
                className="gap-1.5 shrink-0"
                size="sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Periode
              </Button>
            </div>
            <div className="space-y-4">
              {/* Dark Enterprise Active Period Banner */}
              {activePeriod ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-emerald-100 border border-emerald-200 p-2 text-emerald-700">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">
                        Periode Aktif Saat Ini
                      </p>
                      <h3 className="text-base font-bold tracking-tight text-slate-900 mt-0.5">
                        Tahun Ajaran {activePeriod.tahunAjaran} — Semester{" "}
                        {activePeriod.semester}
                      </h3>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 w-fit">
                    <span className="w-1.5 h-1.5 rounded-xs bg-emerald-600" />
                    Semester Aktif
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-amber-100 border border-amber-200 p-2 text-amber-700">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-800 font-semibold uppercase tracking-wider">
                        Peringatan Konfigurasi
                      </p>
                      <h3 className="text-sm font-bold text-slate-900">
                        Belum Ada Periode Tahun Ajaran Aktif
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              {/* Table of periods */}
              <div className="border-b border-slate-200 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Tahun Ajaran</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right pr-5 min-w-[150px]">
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingYears ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <span>Memuat data periode...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : academicYears.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-24 text-center text-slate-500 text-xs"
                        >
                          Belum ada periode tahun ajaran terdaftar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      academicYears.map((year) => {
                        const isSoleActive =
                          year.isActive &&
                          academicYears.filter((y) => y.isActive).length === 1;
                        return (
                          <TableRow
                            key={year.id}
                            className={
                              year.isActive ? "bg-blue-50/30" : undefined
                            }
                          >
                            <TableCell className="pl-5 font-mono font-semibold text-slate-900">
                              {year.tahunAjaran}
                            </TableCell>
                            <TableCell className="font-medium text-slate-700">
                              {year.semester}
                            </TableCell>
                            <TableCell className="text-center">
                              {year.isActive ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  Arsip
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-5">
                              <div className="flex justify-end items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => handleSetActive(year.id)}
                                  disabled={isSoleActive}
                                  title={
                                    isSoleActive
                                      ? "Periode ini sedang aktif"
                                      : "Jadikan Aktif"
                                  }
                                  className="gap-1"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  {year.isActive ? "Aktif" : "Set Aktif"}
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => handleOpenEditModal(year)}
                                  title="Edit Periode"
                                  className="text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => setYearToDelete(year)}
                                  disabled={isSoleActive}
                                  title={
                                    isSoleActive
                                      ? "Periode aktif utama tidak dapat dihapus"
                                      : "Hapus Periode"
                                  }
                                  className={
                                    isSoleActive
                                      ? "opacity-30 cursor-not-allowed"
                                      : "text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Export and Reset Cards */}
        <div className="space-y-6">
          {/* Export Card */}
          <div className="space-y-3">
            <div className="pb-3 border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Cadangan & Ekspor Basis Data
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Unduh seluruh tabel sistem dalam satu berkas Excel (.xlsx)
                multi-sheet
              </CardDescription>
            </div>
            <div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 mb-4">
                <ul className="text-xs text-slate-600 space-y-1.5">
                  <li>• Master Siswa, Guru, Kelas & Mata Pelajaran</li>
                  <li>• Riwayat Lengkap Presensi & Absensi</li>
                  <li>• Rincian Nilai & Bobot Kriteria SPK</li>
                  <li>• Relasi Pengajaran Guru-Kelas-Mapel</li>
                  <li>• Peringkat Leaderboard SPK SAW</li>
                </ul>
              </div>
              <Button
                variant="dark"
                className="w-full gap-2"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 text-emerald-400" />
                )}
                {exporting ? "Menyiapkan Berkas..." : "Unduh Backup Excel"}
              </Button>
            </div>
          </div>

          {/* Reset Card (Danger Zone) */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="pb-3 border-b border-rose-200">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-rose-900">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                Zona Bahaya — Reset Operasional
              </CardTitle>
              <CardDescription className="text-xs text-rose-700/80">
                Bersihkan seluruh data transaksi operasional dengan tetap
                mempertahankan akun & bobot SPK
              </CardDescription>
            </div>
            <div>
              <div className="rounded-lg border border-rose-200 bg-white/80 p-3.5 mb-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-rose-800 leading-relaxed">
                    <strong>Tindakan Permanen:</strong> Pastikan Anda telah
                    mengunduh berkas Backup Excel di atas sebelum melakukan
                    reset data sistem.
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={() => setResetStep(1)}
              >
                <Trash2 className="h-4 w-4" />
                Reset Seluruh Data Operasional
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Academic Year Dialog */}
      <Dialog open={isAddingYear} onOpenChange={setIsAddingYear}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddYear}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <CalendarPlus className="h-5 w-5 text-blue-600" />
                Tambah Periode Tahun Ajaran
              </DialogTitle>
              <DialogDescription className="text-xs">
                Buat periode tahun ajaran dan semester baru untuk pencatatan
                absensi dan SPK.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="tahunAjaran" className="text-xs font-medium">
                  Tahun Ajaran
                </Label>
                <Input
                  id="tahunAjaran"
                  placeholder="Contoh: 2025/2026"
                  value={newTahunAjaran}
                  onChange={(e) => setNewTahunAjaran(e.target.value)}
                  className="font-mono"
                  maxLength={9}
                />
                <span className="text-xs text-slate-500">
                  Gunakan format YYYY/YYYY (contoh: 2025/2026)
                </span>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="semester" className="text-xs font-medium">
                  Semester
                </Label>
                <Select
                  value={newSemester}
                  onValueChange={(val) => {
                    if (val === "Ganjil" || val === "Genap") {
                      setNewSemester(val);
                    }
                  }}
                >
                  <SelectTrigger id="semester">
                    <SelectValue placeholder="Pilih Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ganjil">Ganjil</SelectItem>
                    <SelectItem value="Genap">Genap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newIsActive}
                  onChange={(e) => setNewIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <Label
                  htmlFor="isActive"
                  className="text-xs font-normal text-slate-700 cursor-pointer"
                >
                  Jadikan periode aktif saat ini
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddingYear(false)}
                disabled={submittingYear}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submittingYear}>
                {submittingYear ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                ) : null}
                Simpan Periode
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Academic Year Dialog */}
      <Dialog
        open={!!yearToEdit}
        onOpenChange={(open) => {
          if (!open) setYearToEdit(null);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditYear}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <Pencil className="h-4 w-4 text-blue-600" />
                Edit Periode Tahun Ajaran
              </DialogTitle>
              <DialogDescription className="text-xs">
                Perbarui informasi tahun ajaran dan semester.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label
                  htmlFor="editTahunAjaran"
                  className="text-xs font-medium"
                >
                  Tahun Ajaran
                </Label>
                <Input
                  id="editTahunAjaran"
                  placeholder="Contoh: 2025/2026"
                  value={editTahunAjaran}
                  onChange={(e) => setEditTahunAjaran(e.target.value)}
                  className="font-mono"
                  maxLength={9}
                />
                <span className="text-xs text-slate-500">
                  Gunakan format YYYY/YYYY (contoh: 2025/2026)
                </span>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="editSemester" className="text-xs font-medium">
                  Semester
                </Label>
                <Select
                  value={editSemester}
                  onValueChange={(val) => {
                    if (val === "Ganjil" || val === "Genap") {
                      setEditSemester(val);
                    }
                  }}
                >
                  <SelectTrigger id="editSemester">
                    <SelectValue placeholder="Pilih Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ganjil">Ganjil</SelectItem>
                    <SelectItem value="Genap">Genap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <Label
                  htmlFor="editIsActive"
                  className="text-xs font-normal text-slate-700 cursor-pointer"
                >
                  Jadikan periode aktif saat ini
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setYearToEdit(null)}
                disabled={submittingEditYear}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submittingEditYear}>
                {submittingEditYear ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                ) : null}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={!!yearToDelete}
        onOpenChange={(open) => {
          if (!open) setYearToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Periode Tahun Ajaran?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Apakah Anda yakin ingin menghapus periode tahun ajaran{" "}
              <strong className="text-slate-900">
                {yearToDelete?.tahunAjaran} ({yearToDelete?.semester})
              </strong>
              ? Tindakan ini tidak menghapus data absensi/SPK yang sudah
              berelasi, namun periode ini akan dihapus dari daftar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setYearToDelete(null)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => {
                if (yearToDelete) {
                  handleDeleteYear(yearToDelete.id);
                  setYearToDelete(null);
                }
              }}
            >
              Hapus Periode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset System Dialog */}
      <AlertDialog
        open={resetStep === 1}
        onOpenChange={(open) => {
          if (!open) {
            setResetStep(0);
            setConfirmText("");
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              Konfirmasi Reset Data Operasional
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tindakan ini akan menghapus seluruh data operasional sistem.
              Sangat disarankan untuk mengunduh <strong>Backup Excel</strong>{" "}
              terlebih dahulu.
            </AlertDialogDescription>
            <div className="mt-3 text-xs">
              <span className="block font-semibold text-rose-800 bg-rose-50 border border-rose-200 p-3 rounded-lg">
                Data yang dihapus: Siswa, Guru, Kelas, Mapel, Absensi, Nilai,
                dan Leaderboard SPK.
                <br />
                <span className="font-normal text-rose-600">
                  (Konfigurasi bobot SPK dan akun administrator tetap tersimpan)
                </span>
              </span>
            </div>
          </AlertDialogHeader>

          <div className="py-2">
            <Label
              htmlFor="confirm-reset"
              className="text-xs font-medium text-slate-700"
            >
              Ketik <strong className="text-rose-600 font-mono">RESET</strong>{" "}
              untuk melanjutkan penghapusan:
            </Label>
            <Input
              id="confirm-reset"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Ketik RESET di sini..."
              className="mt-1.5 font-mono border-rose-200 focus-visible:ring-rose-500"
            />
          </div>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between items-center sm:items-stretch w-full mt-2">
            <div className="flex w-full sm:w-auto gap-2">
              <AlertDialogCancel
                onClick={() => {
                  setResetStep(0);
                  setConfirmText("");
                }}
                disabled={resetting}
                className="w-full sm:w-auto"
              >
                Batal
              </AlertDialogCancel>
              <Button
                variant="outline"
                className="w-full sm:w-auto gap-1.5"
                onClick={() => handleExport()}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                )}
                Backup Dulu
              </Button>
            </div>

            <Button
              className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white"
              disabled={confirmText !== "RESET" || resetting}
              onClick={(e) => {
                e.preventDefault();
                handleReset();
              }}
            >
              {resetting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              )}
              {resetting ? "Menghapus..." : "Hapus Semua"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
