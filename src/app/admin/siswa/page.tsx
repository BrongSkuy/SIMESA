"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
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
  Camera,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImage } from "@/lib/image-compress";
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
  foto?: string | null;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<StudentRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const ITEMS_PER_PAGE = 15;

  // Form state
  const [formNis, setFormNis] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formKelas, setFormKelas] = useState("");
  const [formAngkatan, setFormAngkatan] = useState("2024");
  const [formJk, setFormJk] = useState("");
  const [formStatus, setFormStatus] = useState("aktif");
  const [formFoto, setFormFoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStudents = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterKelas]);

  const resetForm = () => {
    setFormNis("");
    setFormNama("");
    setFormKelas("");
    setFormAngkatan("2024");
    setFormJk("");
    setFormStatus("aktif");
    setFormFoto(null);
    setEditId(null);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file, 360, 0.85);
      setFormFoto(compressed);
      toast.success("Foto profil siap disimpan");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memproses gambar";
      toast.error(msg);
    } finally {
      setUploadingPhoto(false);
    }
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
          foto: formFoto,
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
    setFormFoto(siswa.foto || null);
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
          foto: formFoto,
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/students/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menghapus");
      }

      toast.success(`Data ${deleteTarget.namaLengkap} berhasil dihapus!`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus data siswa";
      toast.error(msg);
    } finally {
      setDeleting(false);
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
    toast.success("Data siswa berhasil diekspor!");
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
              {/* Foto Profil Input */}
              <div className="flex items-center gap-3.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white flex items-center justify-center font-bold text-slate-400 text-sm overflow-hidden shrink-0 shadow-xs">
                  {formFoto ? (
                    <Image src={formFoto} alt="Preview" width={56} height={56} unoptimized className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3 text-blue-600" />}
                      {formFoto ? "Ganti Foto" : "Unggah Foto Siswa"}
                    </Button>
                    {formFoto && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs"
                        onClick={() => setFormFoto(null)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Opsi tambahan. Format JPG, PNG, atau WebP.
                  </p>
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </div>

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
              {/* Foto Profil Input */}
              <div className="flex items-center gap-3.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white flex items-center justify-center font-bold text-slate-400 text-sm overflow-hidden shrink-0 shadow-xs">
                  {formFoto ? (
                    <Image src={formFoto} alt="Preview" width={56} height={56} unoptimized className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => editPhotoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3 text-blue-600" />}
                      {formFoto ? "Ganti Foto" : "Unggah Foto Siswa"}
                    </Button>
                    {formFoto && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs"
                        onClick={() => setFormFoto(null)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Format JPG, PNG, atau WebP.
                  </p>
                </div>
                <input
                  ref={editPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </div>

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
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
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
              {paginatedStudents.length === 0 ? (
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
                paginatedStudents.map((siswa, i) => (
                  <TableRow
                    key={siswa.id}
                    className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 last:border-0"
                  >
                    <TableCell className="text-center font-mono text-slate-400 group-hover/row:text-slate-500">
                      {(safePage - 1) * ITEMS_PER_PAGE + i + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-slate-100 group-hover/row:bg-slate-800 text-slate-700 group-hover/row:text-slate-200 font-semibold flex items-center justify-center text-xs border border-slate-200 group-hover/row:border-slate-700 shrink-0 overflow-hidden transition-colors">
                          {siswa.foto ? (
                            <Image
                              src={siswa.foto}
                              alt={siswa.namaLengkap}
                              width={32}
                              height={32}
                              unoptimized
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getInitials(siswa.namaLengkap)
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 group-hover/row:text-white transition-colors">
                            {siswa.namaLengkap}
                          </div>
                          <div className="text-xs text-slate-500 group-hover/row:text-slate-400 tabular-nums transition-colors">
                            NIS: {siswa.nis}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 group-hover/row:bg-slate-800 text-slate-700 group-hover/row:text-slate-200 border border-slate-200 group-hover/row:border-slate-700 transition-colors">
                        {siswa.kelas}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-slate-600 group-hover/row:text-slate-300 transition-colors">
                      {siswa.angkatan}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          siswa.jenisKelamin === "L"
                            ? "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 group-hover/row:bg-blue-500/15 text-blue-700 group-hover/row:text-blue-300 border border-blue-200 group-hover/row:border-blue-500/30 transition-colors"
                            : "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 group-hover/row:bg-indigo-500/15 text-indigo-700 group-hover/row:text-indigo-300 border border-indigo-200 group-hover/row:border-indigo-500/30 transition-colors"
                        }
                      >
                        {siswa.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          siswa.status === "aktif"
                            ? "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 group-hover/row:bg-emerald-500/15 text-emerald-700 group-hover/row:text-emerald-300 border border-emerald-200 group-hover/row:border-emerald-500/30 transition-colors"
                            : "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 group-hover/row:bg-slate-800 text-slate-600 group-hover/row:text-slate-400 border border-slate-200 group-hover/row:border-slate-700 transition-colors"
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
                          className="inline-flex items-center justify-center h-7.5 w-7.5 rounded-md text-slate-600 group-hover/row:text-slate-300 hover:text-blue-400 hover:bg-slate-800 border border-transparent transition-colors cursor-pointer"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Hapus ${siswa.namaLengkap}`}
                          onClick={() => setDeleteTarget(siswa)}
                          className="inline-flex items-center justify-center h-7.5 w-7.5 rounded-md text-slate-500 group-hover/row:text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-transparent transition-colors cursor-pointer"
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

        {/* Mobile Student Cards View (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {paginatedStudents.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              {search || filterKelas !== "all"
                ? "Tidak ada siswa yang sesuai dengan filter pencarian."
                : "Belum ada data siswa terdaftar di sistem."}
            </div>
          ) : (
            paginatedStudents.map((siswa, i) => (
              <div
                key={siswa.id}
                className="p-4 space-y-3 bg-white hover:bg-slate-50/75 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-slate-400 w-5 shrink-0">
                      #{(safePage - 1) * ITEMS_PER_PAGE + i + 1}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs border border-slate-200 shrink-0 overflow-hidden">
                      {siswa.foto ? (
                        <Image
                          src={siswa.foto}
                          alt={siswa.namaLengkap}
                          width={40}
                          height={40}
                          unoptimized
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(siswa.namaLengkap)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {siswa.namaLengkap}
                      </p>
                      <p className="font-mono text-xs text-slate-500">
                        NIS: {siswa.nis}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${
                      siswa.status === "aktif"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {siswa.status === "aktif" ? "Aktif" : "Nonaktif"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                      Kelas
                    </span>
                    <span className="font-medium text-slate-700">
                      {siswa.kelas}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                      Angkatan
                    </span>
                    <span className="font-medium text-slate-700">
                      {siswa.angkatan}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                      Kelamin
                    </span>
                    <span className="font-medium text-slate-700">
                      {siswa.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                    </span>
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(siswa)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Edit className="h-3.5 w-3.5 text-blue-600" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteTarget(siswa)}
                    className="h-8 text-xs gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Halaman <strong className="text-slate-800">{safePage}</strong> dari{" "}
              <strong className="text-slate-800">{totalPages}</strong> ({filtered.length} siswa)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                Selanjutnya
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Konfirmasi Hapus Siswa */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-slate-200 p-6">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900">
              Hapus Data Siswa?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Apakah Anda yakin ingin menghapus data siswa{" "}
              <strong className="text-slate-800">{deleteTarget?.namaLengkap}</strong>{" "}
              (NIS: <span className="font-mono">{deleteTarget?.nis}</span>)? Seluruh riwayat presensi, nilai SPK, dan akun login siswa ini juga akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Ya, Hapus Siswa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
