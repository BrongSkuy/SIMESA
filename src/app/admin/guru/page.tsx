"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GraduationCap, Plus, Search, Edit, Trash2, Loader2, Camera } from "lucide-react";
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

interface TeacherRow {
  id: string;
  nip: string;
  namaLengkap: string;
  jenisKelamin: "L" | "P";
  status: "aktif" | "nonaktif";
  foto?: string | null;
}

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0].replace(/[^A-Za-z]/g, ""))
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "G"
  );
}

export default function AdminGuruPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formNip, setFormNip] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formJK, setFormJK] = useState("L");
  const [formStatus, setFormStatus] = useState("aktif");
  const [formFoto, setFormFoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/teachers");
      const data = await res.json();
      setTeachers(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Gagal memuat data guru");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = teachers.filter(
    (t) =>
      t.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
      t.nip.includes(search)
  );

  const resetForm = () => {
    setFormNip("");
    setFormNama("");
    setFormJK("L");
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
    if (!formNip || !formNama) {
      toast.error("NIP dan Nama wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nip: formNip,
          namaLengkap: formNama,
          jenisKelamin: formJK,
          foto: formFoto,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success("Data guru berhasil ditambahkan!");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Gagal menambahkan guru";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (guru: TeacherRow) => {
    setEditId(guru.id);
    setFormNip(guru.nip);
    setFormNama(guru.namaLengkap);
    setFormJK(guru.jenisKelamin || "L");
    setFormStatus(guru.status);
    setFormFoto(guru.foto || null);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editId || !formNama) {
      toast.error("Nama wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/teachers/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nip: formNip,
          namaLengkap: formNama,
          jenisKelamin: formJK,
          status: formStatus,
          foto: formFoto,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengupdate");
      }

      toast.success("Data guru berhasil diperbarui!");
      setEditOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Gagal mengupdate guru";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (teacher: TeacherRow) => {
    if (!confirm(`Yakin ingin menghapus data ${teacher.namaLengkap}?`)) return;

    try {
      const res = await fetch(`/api/teachers/${teacher.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Gagal menghapus");

      toast.success(`Data ${teacher.namaLengkap} berhasil dihapus!`);
      fetchData();
    } catch {
      toast.error("Gagal menghapus data guru");
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
        title="Data Guru"
        badge={`${teachers.length} Pengajar`}
        description="Daftar dewan guru, nomor induk pegawai (NIP), dan status keaktifan staf pengajar."
        icon={GraduationCap}
      >
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
                Tambah Guru
              </Button>
            }
          />
          <DialogContent className="max-w-lg rounded-lg border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Tambah Guru Baru
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Isi data guru atau staf pengajar yang akan didaftarkan.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              {/* Foto Profil Input */}
              <div className="flex items-center gap-3.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white flex items-center justify-center font-bold text-slate-400 text-sm overflow-hidden shrink-0 shadow-xs">
                  {formFoto ? (
                    <img src={formFoto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <GraduationCap className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3 text-blue-600" />}
                      {formFoto ? "Ganti Foto" : "Unggah Foto Profil"}
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
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nip" className="text-xs font-semibold">
                  NIP
                </Label>
                <Input
                  id="nip"
                  placeholder="Contoh: 199012012012"
                  value={formNip}
                  onChange={(e) => setFormNip(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nama-guru" className="text-xs font-semibold">
                  Nama Lengkap &amp; Gelar
                </Label>
                <Input
                  id="nama-guru"
                  placeholder="Masukkan nama lengkap beserta gelar"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="jenis-kelamin"
                  className="text-xs font-semibold"
                >
                  Jenis Kelamin
                </Label>
                <Select
                  value={formJK}
                  onValueChange={(val) => setFormJK(val || "L")}
                >
                  <SelectTrigger id="jenis-kelamin" className="h-9 text-xs">
                    <SelectValue placeholder="Pilih jenis kelamin">
                      {(value) => {
                        if (value === "L") return "Laki-laki";
                        if (value === "P") return "Perempuan";
                        return "Pilih jenis kelamin";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
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
                Simpan Guru
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Edit Guru */}
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
                Edit Data Guru
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Perbarui informasi identitas dan status guru.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              {/* Foto Profil Input */}
              <div className="flex items-center gap-3.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white flex items-center justify-center font-bold text-slate-400 text-sm overflow-hidden shrink-0 shadow-xs">
                  {formFoto ? (
                    <img src={formFoto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <GraduationCap className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3 text-blue-600" />}
                      {formFoto ? "Ganti Foto" : "Unggah Foto Profil"}
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
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-nip" className="text-xs font-semibold">
                  NIP
                </Label>
                <Input
                  id="edit-nip"
                  value={formNip}
                  onChange={(e) => setFormNip(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
                <p className="text-xs text-amber-600">
                  Mengubah NIP akan mengubah Username login guru.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-nama-guru"
                  className="text-xs font-semibold"
                >
                  Nama Lengkap &amp; Gelar
                </Label>
                <Input
                  id="edit-nama-guru"
                  placeholder="Masukkan nama lengkap"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="edit-jenis-kelamin"
                    className="text-xs font-semibold"
                  >
                    Jenis Kelamin
                  </Label>
                  <Select
                    value={formJK}
                    onValueChange={(val) => setFormJK(val || "L")}
                  >
                    <SelectTrigger
                      id="edit-jenis-kelamin"
                      className="h-9 text-xs"
                    >
                      <SelectValue placeholder="Pilih jenis kelamin">
                        {(value) => {
                          if (value === "L") return "Laki-laki";
                          if (value === "P") return "Perempuan";
                          return "Pilih jenis kelamin";
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
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
                    onValueChange={(val) => setFormStatus(val || "aktif")}
                  >
                    <SelectTrigger id="edit-status" className="h-9 text-xs">
                      <SelectValue placeholder="Pilih status">
                        {(value) => {
                          if (value === "aktif") return "Aktif";
                          if (value === "nonaktif") return "Nonaktif";
                          return "Pilih status";
                        }}
                      </SelectValue>
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

      {/* Search Toolbar */}
      <div className="py-3.5 border-y border-slate-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Cari nama guru atau NIP..."
            className="pl-8.5 h-9 text-xs border-slate-200 bg-slate-50/50 focus:bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 text-center">No</TableHead>
              <TableHead>Nama Guru &amp; NIP</TableHead>
              <TableHead>Jenis Kelamin</TableHead>
              <TableHead>Status Kepegawaian</TableHead>
              <TableHead className="text-right pr-5">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-xs text-slate-500"
                >
                  Tidak ada data guru yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((guru, i) => (
                <TableRow
                  key={guru.id}
                  className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 last:border-0"
                >
                  <TableCell className="text-center font-mono text-slate-400 group-hover/row:text-slate-500">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-slate-100 group-hover/row:bg-slate-800 text-slate-700 group-hover/row:text-slate-200 border border-slate-200 group-hover/row:border-slate-700 font-semibold flex items-center justify-center text-xs shrink-0 overflow-hidden transition-colors">
                        {guru.foto ? (
                          <img
                            src={guru.foto}
                            alt={guru.namaLengkap}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getInitials(guru.namaLengkap)
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 group-hover/row:text-white transition-colors">
                          {guru.namaLengkap}
                        </div>
                        <div className="text-xs text-slate-500 group-hover/row:text-slate-400 tabular-nums transition-colors">
                          NIP: {guru.nip}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        guru.jenisKelamin === "L"
                          ? "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 group-hover/row:bg-blue-500/15 text-blue-700 group-hover/row:text-blue-300 border border-blue-200 group-hover/row:border-blue-500/30 transition-colors"
                          : "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 group-hover/row:bg-indigo-500/15 text-indigo-700 group-hover/row:text-indigo-300 border border-indigo-200 group-hover/row:border-indigo-500/30 transition-colors"
                      }
                    >
                      {guru.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        guru.status === "aktif"
                          ? "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 group-hover/row:bg-emerald-500/15 text-emerald-700 group-hover/row:text-emerald-300 border border-emerald-200 group-hover/row:border-emerald-500/30 transition-colors"
                          : "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 group-hover/row:bg-slate-800 text-slate-600 group-hover/row:text-slate-400 border border-slate-200 group-hover/row:border-slate-700 transition-colors"
                      }
                    >
                      <span
                        className={
                          guru.status === "aktif"
                            ? "w-1.5 h-1.5 rounded-xs bg-emerald-500"
                            : "w-1.5 h-1.5 rounded-xs bg-slate-400"
                        }
                      />
                      {guru.status === "aktif" ? "Aktif" : "Nonaktif"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${guru.namaLengkap}`}
                        onClick={() => openEdit(guru)}
                        className="inline-flex items-center justify-center h-7.5 w-7.5 rounded-md text-slate-600 group-hover/row:text-slate-300 hover:text-blue-400 hover:bg-slate-800 border border-transparent transition-colors cursor-pointer"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Hapus ${guru.namaLengkap}`}
                        onClick={() => handleDelete(guru)}
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
    </div>
  );
}
