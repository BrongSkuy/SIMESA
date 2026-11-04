"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Building2, Plus, Edit, Trash2, Loader2, Users, UserCheck, Search, Filter, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface ClassRow {
  id: string;
  namaKelas: string;
  tingkat: string;
  waliKelas: string | null;
  jumlahSiswa: number;
}

interface TeacherRow {
  id: string;
  namaLengkap: string;
}

export default function AdminKelasPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter & Search State
  const [search, setSearch] = useState("");
  const [filterTingkat, setFilterTingkat] = useState("all");
  const [filterWali, setFilterWali] = useState("all");

  // Form State
  const [formName, setFormName] = useState("");
  const [formTingkat, setFormTingkat] = useState("");
  const [formWali, setFormWali] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [classRes, teacherRes] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/teachers"),
      ]);
      const classData = await classRes.json();
      const teacherData = await teacherRes.json();
      setClasses(Array.isArray(classData) ? classData : []);
      setTeachers(Array.isArray(teacherData) ? teacherData : []);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredClasses = useMemo(() => {
    const searchLow = search.toLowerCase();
    return classes.filter((k) => {
      const matchSearch =
        !search ||
        k.namaKelas.toLowerCase().includes(searchLow) ||
        (k.waliKelas && k.waliKelas.toLowerCase().includes(searchLow));
      const matchTingkat =
        filterTingkat === "all" || k.tingkat === filterTingkat;
      const matchWali =
        filterWali === "all" ||
        (filterWali === "assigned" && Boolean(k.waliKelas)) ||
        (filterWali === "unassigned" && !k.waliKelas);
      return matchSearch && matchTingkat && matchWali;
    });
  }, [classes, search, filterTingkat, filterWali]);

  const resetForm = () => {
    setFormName("");
    setFormTingkat("");
    setFormWali("none");
    setEditId(null);
  };

  const handleCreate = async () => {
    if (!formName || !formTingkat) {
      toast.error("Nama kelas dan tingkat wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaKelas: formName,
          tingkat: formTingkat,
          waliKelas: formWali === "none" ? null : formWali,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success("Kelas berhasil ditambahkan!");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Gagal menambahkan kelas";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (kls: ClassRow) => {
    setEditId(kls.id);
    setFormName(kls.namaKelas);
    setFormTingkat(kls.tingkat);
    setFormWali(kls.waliKelas || "none");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editId || !formName || !formTingkat) {
      toast.error("Nama kelas dan tingkat wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/classes/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaKelas: formName,
          tingkat: formTingkat,
          waliKelas: formWali === "none" ? null : formWali,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengupdate");
      }

      toast.success("Kelas berhasil diperbarui!");
      setEditOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Gagal mengupdate kelas";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/classes/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menghapus kelas");
      }

      toast.success(`Kelas ${deleteTarget.namaKelas} berhasil dihapus!`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus kelas";
      toast.error(msg);
    } finally {
      setDeleting(false);
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
        title="Data Kelas"
        badge={`${classes.length} Kelas`}
        description="Kelola daftar kelas, tingkat kelas, dan alokasi wali kelas."
        icon={Building2}
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
                Tambah Kelas
              </Button>
            }
          />
          <DialogContent className="rounded-lg border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Tambah Kelas Baru
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Isi informasi kelas yang akan dibuat.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nama-kelas" className="text-xs font-semibold">
                    Nama Kelas
                  </Label>
                  <Input
                    id="nama-kelas"
                    placeholder="Contoh: X-A"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tingkat" className="text-xs font-semibold">
                    Tingkat
                  </Label>
                  <Select
                    value={formTingkat}
                    onValueChange={(val) => setFormTingkat(val || "")}
                  >
                    <SelectTrigger id="tingkat" className="h-9 text-xs">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">Tingkat 10 (X)</SelectItem>
                      <SelectItem value="11">Tingkat 11 (XI)</SelectItem>
                      <SelectItem value="12">Tingkat 12 (XII)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wali" className="text-xs font-semibold">
                  Wali Kelas
                </Label>
                <Select
                  value={formWali}
                  onValueChange={(val) => setFormWali(val || "")}
                >
                  <SelectTrigger id="wali" className="h-9 text-xs">
                    <SelectValue placeholder="Pilih guru (Opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada wali kelas</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.namaLengkap}>
                        {t.namaLengkap}
                      </SelectItem>
                    ))}
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
                Simpan Kelas
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Edit Kelas */}
        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="rounded-lg border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Edit Data Kelas
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Perbarui informasi nama kelas, tingkat, atau wali kelas.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="edit-nama-kelas"
                    className="text-xs font-semibold"
                  >
                    Nama Kelas
                  </Label>
                  <Input
                    id="edit-nama-kelas"
                    placeholder="Contoh: X-A"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="edit-tingkat"
                    className="text-xs font-semibold"
                  >
                    Tingkat
                  </Label>
                  <Select
                    value={formTingkat}
                    onValueChange={(val) => setFormTingkat(val || "")}
                  >
                    <SelectTrigger id="edit-tingkat" className="h-9 text-xs">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">Tingkat 10 (X)</SelectItem>
                      <SelectItem value="11">Tingkat 11 (XI)</SelectItem>
                      <SelectItem value="12">Tingkat 12 (XII)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-wali" className="text-xs font-semibold">
                  Wali Kelas
                </Label>
                <Select
                  value={formWali}
                  onValueChange={(val) => setFormWali(val || "")}
                >
                  <SelectTrigger id="edit-wali" className="h-9 text-xs">
                    <SelectValue placeholder="Pilih guru (Opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada wali kelas</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.namaLengkap}>
                        {t.namaLengkap}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            placeholder="Cari nama kelas atau wali kelas..."
            className="pl-8.5 h-9 text-xs border-slate-200 bg-slate-50/50 focus:bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span>Filter:</span>
          </div>
          <Select
            value={filterTingkat}
            onValueChange={(val) => setFilterTingkat(val || "all")}
          >
            <SelectTrigger className="w-[140px] h-9 text-xs border-slate-200">
              <SelectValue placeholder="Tingkat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tingkat</SelectItem>
              <SelectItem value="10">Tingkat 10 (X)</SelectItem>
              <SelectItem value="11">Tingkat 11 (XI)</SelectItem>
              <SelectItem value="12">Tingkat 12 (XII)</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filterWali}
            onValueChange={(val) => setFilterWali(val || "all")}
          >
            <SelectTrigger className="w-[160px] h-9 text-xs border-slate-200">
              <SelectValue placeholder="Wali Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status Wali</SelectItem>
              <SelectItem value="assigned">Memiliki Wali</SelectItem>
              <SelectItem value="unassigned">Belum Ada Wali</SelectItem>
            </SelectContent>
          </Select>
          {(search || filterTingkat !== "all" || filterWali !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setFilterTingkat("all");
                setFilterWali("all");
              }}
              className="h-9 px-2.5 text-xs text-slate-500 hover:text-slate-900 gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Belum Ada Data Kelas"
          description="Tambahkan kelas pertama untuk mulai mengalokasikan siswa dan jadwal absensi."
          actionLabel="Tambah Kelas"
          onAction={() => setDialogOpen(true)}
        />
      ) : filteredClasses.length === 0 ? (
        <div className="border border-slate-200 py-12 text-center text-xs text-slate-500 bg-white">
          Tidak ada data kelas yang cocok dengan kriteria pencarian atau filter.
        </div>
      ) : (
        <div className="border-y border-slate-200 divide-y divide-slate-200 sm:divide-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-px sm:bg-slate-200">
          {filteredClasses.map((kelas) => (
            <div
              key={kelas.id}
              className="bg-white p-5 hover:bg-[#091524] transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-slate-100 group-hover:bg-slate-800 text-slate-800 group-hover:text-white border border-slate-200 group-hover:border-slate-700 flex items-center justify-center font-bold text-xs shrink-0 transition-colors">
                      {kelas.namaKelas}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-white tracking-tight transition-colors">
                        Kelas {kelas.namaKelas}
                      </h3>
                      <p className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                        Tingkat {kelas.tingkat}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-xs font-medium bg-blue-50 group-hover:bg-blue-500/15 text-blue-700 group-hover:text-blue-300 border border-blue-200 group-hover:border-blue-500/30 tabular-nums transition-colors">
                    <Users className="w-3 h-3" />
                    {kelas.jumlahSiswa} siswa
                  </span>
                </div>

                <div className="bg-slate-50 group-hover:bg-slate-900/80 border border-slate-200 group-hover:border-slate-800 p-3 mb-4 transition-colors">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 group-hover:text-slate-400 uppercase tracking-wider transition-colors">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-500" />
                    <span>Wali Kelas</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-white mt-1 truncate transition-colors">
                    {kelas.waliKelas || "Belum ditentukan"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 group-hover:border-slate-800 transition-colors">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 group-hover:bg-slate-800 group-hover:border-slate-700 group-hover:text-white transition-colors"
                  onClick={() => openEdit(kelas)}
                >
                  <Edit className="h-3.5 w-3.5 text-blue-600 group-hover:text-blue-400" />
                  Edit Kelas
                </Button>
                <Button
                  variant="destructive"
                  size="icon-sm"
                  aria-label={`Hapus kelas ${kelas.namaKelas}`}
                  onClick={() => setDeleteTarget(kelas)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog Konfirmasi Hapus Kelas */}
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
              Hapus Kelas {deleteTarget?.namaKelas}?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Apakah Anda yakin ingin menghapus kelas{" "}
              <strong className="text-slate-800">{deleteTarget?.namaKelas}</strong>? Kelas yang masih memiliki siswa terdaftar tidak dapat dihapus.
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
              Ya, Hapus Kelas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
