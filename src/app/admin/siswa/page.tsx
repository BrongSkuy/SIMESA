"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Users,
  Plus,
  Upload,
  Search,
  Edit,
  Trash2,
  Download,
  Filter,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StudentRow {
  id: string;
  userId: string;
  nis: string;
  namaLengkap: string;
  kelas: string;
  angkatan: string;
  jenisKelamin: "L" | "P";
  status: "aktif" | "nonaktif";
}

interface KelasRow {
  id: string;
  namaKelas: string;
  tingkat: string;
  waliKelas: string | null;
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

export default function AdminSiswaPage() {
  const [search, setSearch] = useState("");
  const [filterKelas, setFilterKelas] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<KelasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formNis, setFormNis] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formKelas, setFormKelas] = useState("");
  const [formAngkatan, setFormAngkatan] = useState("2024");
  const [formJk, setFormJk] = useState("");
  const [formStatus, setFormStatus] = useState("aktif");

  const fetchData = useCallback(async () => {
    try {
      const [studentsRes, classesRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/classes"),
      ]);
      const studentsData = await studentsRes.json();
      const classesData = await classesRes.json();
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setClasses(Array.isArray(classesData) ? classesData : []);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = students.filter((s) => {
    const matchSearch =
      s.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
      s.nis.includes(search);
    const matchKelas = filterKelas === "all" || s.kelas === filterKelas;
    return matchSearch && matchKelas;
  });

  const resetForm = () => {
    setFormNis("");
    setFormNama("");
    setFormKelas("");
    setFormAngkatan("2024");
    setFormJk("");
    setFormStatus("aktif");
    setEditId(null);
  };

  const handleCreate = async () => {
    if (!formNis || !formNama || !formKelas || !formJk) {
      toast.error("Semua field wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nis: formNis,
          namaLengkap: formNama,
          kelas: formKelas,
          angkatan: formAngkatan,
          jenisKelamin: formJk,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success("Data siswa berhasil ditambahkan!");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Gagal menambahkan siswa";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (siswa: StudentRow) => {
    setEditId(siswa.id);
    setFormNis(siswa.nis);
    setFormNama(siswa.namaLengkap);
    setFormKelas(siswa.kelas);
    setFormAngkatan(siswa.angkatan);
    setFormJk(siswa.jenisKelamin);
    setFormStatus(siswa.status);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editId || !formNama || !formKelas || !formJk) {
      toast.error("Semua field wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/students/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nis: formNis,
          namaLengkap: formNama,
          kelas: formKelas,
          angkatan: formAngkatan,
          jenisKelamin: formJk,
          status: formStatus,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengupdate");
      }

      toast.success("Data siswa berhasil diperbarui!");
      setEditOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Gagal mengupdate siswa";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student: StudentRow) => {
    if (!confirm(`Yakin ingin menghapus data ${student.namaLengkap}?`)) return;

    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Gagal menghapus");

      toast.success(`Data ${student.namaLengkap} berhasil dihapus!`);
      fetchData();
    } catch {
      toast.error("Gagal menghapus data siswa");
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        NIS: "2024001",
        NamaLengkap: "Contoh Nama Siswa",
        Kelas: "X-A",
        Angkatan: "2024",
        JenisKelamin: "L",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
    XLSX.writeFile(wb, "template_data_siswa.xlsx");
    toast.success("Template berhasil diunduh!");
  };

  const handleExportData = () => {
    if (filtered.length === 0) {
      toast.error("Tidak ada data siswa untuk diekspor");
      return;
    }
    const templateData = filtered.map((s, i) => ({
      No: i + 1,
      NIS: s.nis,
      "Nama Lengkap": s.namaLengkap,
      Kelas: s.kelas,
      Angkatan: s.angkatan,
      "Jenis Kelamin": s.jenisKelamin,
      Status: s.status,
    }));
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
    XLSX.writeFile(wb, `Data_Siswa_Export.xlsx`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

      const studentsToImport = rows.map((row) => ({
        nis: String(row.NIS || row.nis || "").trim(),
        namaLengkap: String(
          row.NamaLengkap || row.namaLengkap || row["Nama Lengkap"] || ""
        ).trim(),
        kelas: String(row.Kelas || row.kelas || "").trim(),
        angkatan: String(row.Angkatan || row.angkatan || "").trim(),
        jenisKelamin: String(
          row.JenisKelamin || row.jenisKelamin || row["Jenis Kelamin"] || ""
        ).trim(),
      }));

      const res = await fetch("/api/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: studentsToImport }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.details && result.details.length > 0) {
          toast.error(result.error, {
            description: result.details.join(" | "),
            duration: 10000,
          });
          return;
        }
        throw new Error(result.error);
      }

      toast.success(
        `${result.imported} data siswa berhasil diimport (Dibuat & Diperbarui)!`
      );
      fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal import data";
      toast.error(msg);
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Siswa"
        badge={`${students.length} Terdaftar`}
        description="Profil lengkap, biodata, NIS, dan alokasi kelas seluruh siswa."
        icon={Users}
      >
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
          <Download className="h-3.5 w-3.5 text-slate-500" />
          Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => importRef.current?.click()}
          disabled={importing}
        >
          {importing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5 text-blue-600" />
          )}
          Import Excel
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportData}>
          <Download className="h-3.5 w-3.5 text-emerald-600" />
          Export Data
        </Button>
        <input
          ref={importRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleImport}
        />

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger
            render={
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" />
                Tambah Siswa
              </Button>
            }
          />
          <DialogContent className="max-w-lg rounded-lg border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Tambah Siswa Baru
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Isi data siswa yang akan didaftarkan ke dalam sistem.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nis" className="text-xs font-semibold">
                    NIS
                  </Label>
                  <Input
                    id="nis"
                    placeholder="Contoh: 2024016"
                    value={formNis}
                    onChange={(e) => setFormNis(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jk" className="text-xs font-semibold">
                    Jenis Kelamin
                  </Label>
                  <Select
                    value={formJk}
                    onValueChange={(val) => setFormJk(val || "")}
                  >
                    <SelectTrigger id="jk" className="h-9 text-xs">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nama" className="text-xs font-semibold">
                  Nama Lengkap
                </Label>
                <Input
                  id="nama"
                  placeholder="Masukkan nama lengkap"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="kelas" className="text-xs font-semibold">
                    Kelas
                  </Label>
                  <Select
                    value={formKelas}
                    onValueChange={(val) => setFormKelas(val || "")}
                  >
                    <SelectTrigger id="kelas" className="h-9 text-xs">
                      <SelectValue placeholder="Pilih kelas" />
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
                  <Label htmlFor="angkatan" className="text-xs font-semibold">
                    Angkatan
                  </Label>
                  <Input
                    id="angkatan"
                    placeholder="2024"
                    value={formAngkatan}
                    onChange={(e) => setFormAngkatan(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
              >
                Batal
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Simpan Siswa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Edit Siswa */}
        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="max-w-lg rounded-lg border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Edit Data Siswa
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Perbarui informasi biodata dan status keaktifan siswa.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-nis" className="text-xs font-semibold">
                    NIS
                  </Label>
                  <Input
                    id="edit-nis"
                    value={formNis}
                    onChange={(e) => setFormNis(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-xs text-amber-600">
                    Mengubah NIS akan mengubah Username login siswa.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-jk" className="text-xs font-semibold">
                    Jenis Kelamin
                  </Label>
                  <Select
                    value={formJk}
                    onValueChange={(val) => setFormJk(val || "")}
                  >
                    <SelectTrigger id="edit-jk" className="h-9 text-xs">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-nama" className="text-xs font-semibold">
                  Nama Lengkap
                </Label>
                <Input
                  id="edit-nama"
                  placeholder="Masukkan nama lengkap"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-kelas" className="text-xs font-semibold">
                    Kelas
                  </Label>
                  <Select
                    value={formKelas}
                    onValueChange={(val) => setFormKelas(val || "")}
                  >
                    <SelectTrigger id="edit-kelas" className="h-9 text-xs">
                      <SelectValue placeholder="Pilih kelas" />
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
                  <Label
                    htmlFor="edit-angkatan"
                    className="text-xs font-semibold"
                  >
                    Angkatan
                  </Label>
                  <Input
                    id="edit-angkatan"
                    placeholder="2024"
                    value={formAngkatan}
                    onChange={(e) => setFormAngkatan(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="edit-status"
                    className="text-xs font-semibold"
                  >
                    Status
                  </Label>
                  <Select
                    value={formStatus}
                    onValueChange={(v) => setFormStatus(v || "aktif")}
                  >
                    <SelectTrigger id="edit-status" className="h-9 text-xs">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aktif">Aktif</SelectItem>
                      <SelectItem value="nonaktif">Nonaktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditOpen(false);
                  resetForm();
                }}
              >
                Batal
              </Button>
              <Button size="sm" onClick={handleEdit} disabled={saving}>
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Enterprise Filter Toolbar */}
      <div className="py-3.5 border-y border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Cari nama siswa atau nomor induk (NIS)..."
            className="pl-8.5 h-9 text-xs border-slate-200 bg-slate-50/50 focus:bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span>Filter Kelas:</span>
          </div>
          <Select
            value={filterKelas}
            onValueChange={(val) => setFilterKelas(val || "all")}
          >
            <SelectTrigger className="w-[150px] h-9 text-xs border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {classes.map((k) => (
                <SelectItem key={k.id} value={k.namaKelas}>
                  {k.namaKelas}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 text-center">No</TableHead>
              <TableHead>Siswa &amp; NIS</TableHead>
              <TableHead>Kelas</TableHead>
              <TableHead>Angkatan</TableHead>
              <TableHead>Jenis Kelamin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-5">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-xs text-slate-500"
                >
                  {search || filterKelas !== "all"
                    ? "Tidak ada data siswa yang cocok dengan kriteria pencarian."
                    : "Belum ada data siswa yang terdaftar."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((siswa, i) => (
                <TableRow key={siswa.id}>
                  <TableCell className="text-center font-mono text-slate-400">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs border border-slate-200 shrink-0">
                        {getInitials(siswa.namaLengkap)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {siswa.namaLengkap}
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums">
                          NIS: {siswa.nis}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {siswa.kelas}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums text-slate-600">
                    {siswa.angkatan}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        siswa.jenisKelamin === "L"
                          ? "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                          : "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                      }
                    >
                      {siswa.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        siswa.status === "aktif"
                          ? "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
                      }
                    >
                      <span
                        className={
                          siswa.status === "aktif"
                            ? "w-1.5 h-1.5 rounded-xs bg-emerald-500"
                            : "w-1.5 h-1.5 rounded-xs bg-slate-400"
                        }
                      />
                      {siswa.status === "aktif" ? "Aktif" : "Nonaktif"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${siswa.namaLengkap}`}
                        onClick={() => openEdit(siswa)}
                        className="inline-flex items-center justify-center h-7.5 w-7.5 rounded-md text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors cursor-pointer"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Hapus ${siswa.namaLengkap}`}
                        onClick={() => handleDelete(siswa)}
                        className="inline-flex items-center justify-center h-7.5 w-7.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
