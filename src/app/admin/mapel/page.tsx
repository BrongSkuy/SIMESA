"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Search, Edit, Trash2, Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface SubjectRow {
  id: string;
  namaMapel: string;
  teacherId: string | null;
  guruPengampu: string | null;
  kelasDiampu: string | null;
}

interface TeacherRow {
  id: string;
  namaLengkap: string;
}

interface ClassOption {
  id: string;
  namaKelas: string;
}

export default function AdminMapelPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [classesList, setClassesList] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formGuru, setFormGuru] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [subjectRes, teacherRes, classRes] = await Promise.all([
        fetch("/api/subjects"),
        fetch("/api/teachers"),
        fetch("/api/classes"),
      ]);
      const subjectData = await subjectRes.json();
      const teacherData = await teacherRes.json();
      const classData = await classRes.json();
      setSubjects(Array.isArray(subjectData) ? subjectData : []);
      setTeachers(Array.isArray(teacherData) ? teacherData : []);
      setClassesList(Array.isArray(classData) ? classData : []);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = subjects.filter(
    (m) =>
      m.namaMapel.toLowerCase().includes(search.toLowerCase()) ||
      (m.guruPengampu || "").toLowerCase().includes(search.toLowerCase()) ||
      (m.kelasDiampu || "").toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormName("");
    setFormGuru("none");
    setSelectedClasses([]);
    setEditId(null);
  };

  const handleCreate = async () => {
    if (!formName) {
      toast.error("Nama mata pelajaran wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaMapel: formName,
          teacherId: formGuru === "none" ? null : formGuru,
          kelasDiampu: selectedClasses.join(", "),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success("Mata pelajaran berhasil ditambahkan!");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Gagal menambahkan mata pelajaran";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (mapel: SubjectRow) => {
    setEditId(mapel.id);
    setFormName(mapel.namaMapel);
    setFormGuru(mapel.teacherId || "none");
    const classesArray = mapel.kelasDiampu
      ? mapel.kelasDiampu
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
      : [];
    setSelectedClasses(classesArray);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editId || !formName) {
      toast.error("Nama mata pelajaran wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/subjects/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaMapel: formName,
          teacherId: formGuru === "none" ? null : formGuru,
          kelasDiampu: selectedClasses.join(", "),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengupdate");
      }

      toast.success("Mata pelajaran berhasil diperbarui!");
      setEditOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Gagal mengupdate mata pelajaran";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subject: SubjectRow) => {
    if (
      !confirm(`Yakin ingin menghapus mata pelajaran ${subject.namaMapel}?`)
    )
      return;

    try {
      const res = await fetch(`/api/subjects/${subject.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Gagal menghapus");

      toast.success(`Mata pelajaran ${subject.namaMapel} berhasil dihapus!`);
      fetchData();
    } catch {
      toast.error("Gagal menghapus mata pelajaran");
    }
  };

  const renderClassMultiSelect = () => (
    <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-lg bg-slate-50/70 max-h-[160px] overflow-y-auto">
      {classesList.length === 0 ? (
        <span className="text-xs text-slate-500">
          Belum ada data kelas. Silakan tambahkan kelas terlebih dahulu di menu
          Data Kelas.
        </span>
      ) : (
        classesList.map((cls) => {
          const isChecked = selectedClasses.includes(cls.namaKelas);
          return (
            <label
              key={cls.id}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs cursor-pointer select-none transition-colors",
                isChecked
                  ? "bg-blue-600 border-blue-600 text-white font-medium"
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
              )}
            >
              <input
                type="checkbox"
                checked={isChecked}
                className="sr-only"
                onChange={() => {
                  if (isChecked) {
                    setSelectedClasses(
                      selectedClasses.filter((c) => c !== cls.namaKelas)
                    );
                  } else {
                    setSelectedClasses([...selectedClasses, cls.namaKelas]);
                  }
                }}
              />
              {cls.namaKelas}
            </label>
          );
        })
      )}
    </div>
  );

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
        title="Mata Pelajaran"
        badge={`${subjects.length} Mapel`}
        description="Kurikulum mata pelajaran, guru pengampu, dan distribusi rombongan belajar."
        icon={BookOpen}
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
                Tambah Mata Pelajaran
              </Button>
            }
          />
          <DialogContent className="rounded-lg border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Tambah Mata Pelajaran
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Masukkan detail mata pelajaran dan alokasi kelas pengampu.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="nama-mapel" className="text-xs font-semibold">
                  Nama Mata Pelajaran
                </Label>
                <Input
                  id="nama-mapel"
                  placeholder="Contoh: Matematika Lanjut"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guru" className="text-xs font-semibold">
                  Guru Pengampu
                </Label>
                <Select
                  value={formGuru}
                  onValueChange={(val) => setFormGuru(val || "")}
                >
                  <SelectTrigger id="guru" className="h-9 text-xs">
                    <SelectValue placeholder="Pilih guru pengampu (opsional)">
                      {(value) => {
                        if (value === "none" || !value)
                          return "Belum ditentukan";
                        const teacher = teachers.find((t) => t.id === value);
                        return teacher
                          ? teacher.namaLengkap
                          : "Belum ditentukan";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Belum ditentukan</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.namaLengkap}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Kelas yang Diampu
                </Label>
                {renderClassMultiSelect()}
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
                Simpan Mapel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Edit Mapel */}
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
                Edit Mata Pelajaran
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Perbarui detail mata pelajaran dan penugasan guru.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-nama-mapel"
                  className="text-xs font-semibold"
                >
                  Nama Mata Pelajaran
                </Label>
                <Input
                  id="edit-nama-mapel"
                  placeholder="Contoh: Matematika Lanjut"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-guru" className="text-xs font-semibold">
                  Guru Pengampu
                </Label>
                <Select
                  value={formGuru}
                  onValueChange={(val) => setFormGuru(val || "")}
                >
                  <SelectTrigger id="edit-guru" className="h-9 text-xs">
                    <SelectValue placeholder="Pilih guru pengampu (opsional)">
                      {(value) => {
                        if (value === "none" || !value)
                          return "Belum ditentukan";
                        const teacher = teachers.find((t) => t.id === value);
                        return teacher
                          ? teacher.namaLengkap
                          : "Belum ditentukan";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Belum ditentukan</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.namaLengkap}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Kelas yang Diampu
                </Label>
                {renderClassMultiSelect()}
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
            placeholder="Cari mata pelajaran, guru pengampu, atau kelas..."
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
              <TableHead>Nama Mata Pelajaran</TableHead>
              <TableHead>Guru Pengampu</TableHead>
              <TableHead>Alokasi Kelas</TableHead>
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
                  Tidak ada data mata pelajaran yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((mapel, i) => (
                <TableRow key={mapel.id}>
                  <TableCell className="text-center font-mono text-slate-400">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-slate-900">
                        {mapel.namaMapel}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-700">
                    {mapel.guruPengampu || (
                      <span className="text-slate-400 italic">
                        Belum ditentukan
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {mapel.kelasDiampu ? (
                        mapel.kelasDiampu.split(",").map((k) => {
                          const trimmed = k.trim();
                          if (!trimmed) return null;
                          return (
                            <span
                              key={trimmed}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                            >
                              {trimmed}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${mapel.namaMapel}`}
                        onClick={() => openEdit(mapel)}
                        className="inline-flex items-center justify-center h-7.5 w-7.5 rounded-md text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors cursor-pointer"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Hapus ${mapel.namaMapel}`}
                        onClick={() => handleDelete(mapel)}
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
