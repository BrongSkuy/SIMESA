"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  SlidersHorizontal,
  Save,
  Eye,
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
import { cn } from "@/lib/utils";
import {
  DEFAULT_KKM_FALLBACK,
  deduplicateSubjectsForKkm,
  parseKkmNumber,
  sanitizeKkmInput,
  type RawCurriculumForKkm,
  type UniqueMapelKkmItem,
} from "@/lib/erapor-utils";

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

interface SubjectsManagementViewProps {
  portal?: "admin" | "guru";
}

export function SubjectsManagementView({
  portal = "admin",
}: SubjectsManagementViewProps) {
  const [viewMode, setViewMode] = useState<"all" | "kkm">("all");
  const [search, setSearch] = useState("");
  const [filterGuru, setFilterGuru] = useState("all");
  const [filterKelas, setFilterKelas] = useState("all");
  const [filterKkmStatus, setFilterKkmStatus] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [classesList, setClassesList] = useState<ClassOption[]>([]);
  const [curriculumList, setCurriculumList] = useState<RawCurriculumForKkm[]>([]);
  const [defaultKkm, setDefaultKkm] = useState<number>(DEFAULT_KKM_FALLBACK);
  const [canManage, setCanManage] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<SubjectRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const ITEMS_PER_PAGE = 15;

  // Form Mapel State
  const [formName, setFormName] = useState("");
  const [formGuru, setFormGuru] = useState("none");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  // Form Edit KKM Default State (string-based agar tidak muncul angka 0 di awal)
  const [defaultKkmDialogOpen, setDefaultKkmDialogOpen] = useState(false);
  const [defaultKkmInput, setDefaultKkmInput] = useState<string>(
    String(DEFAULT_KKM_FALLBACK)
  );
  const [savingDefaultKkm, setSavingDefaultKkm] = useState(false);

  // Form Edit KKM Per Mapel State (string-based agar tidak muncul angka 0 di awal)
  const [kkmDialogOpen, setKkmDialogOpen] = useState(false);
  const [kkmTargetItem, setKkmTargetItem] = useState<UniqueMapelKkmItem | null>(
    null
  );
  const [kkmInputValue, setKkmInputValue] = useState<string>("");
  const [kkmCapaianValue, setKkmCapaianValue] = useState<string>("");
  const [savingMapelKkm, setSavingMapelKkm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const requests: Promise<Response>[] = [
        fetch("/api/subjects"),
        fetch("/api/classes"),
        fetch("/api/academic/curriculum"),
        fetch("/api/user/roles"),
      ];
      if (portal === "admin") {
        requests.push(fetch("/api/teachers"));
      }

      const [subjectRes, classRes, currRes, roleRes, teacherRes] =
        await Promise.all(requests);

      if (subjectRes.ok) {
        const subjectData = await subjectRes.json();
        setSubjects(Array.isArray(subjectData) ? subjectData : []);
      }

      if (classRes.ok) {
        const classData = await classRes.json();
        setClassesList(Array.isArray(classData) ? classData : []);
      }

      if (currRes.ok) {
        const currData = await currRes.json();
        if (typeof currData.defaultKkm === "number") {
          setDefaultKkm(currData.defaultKkm);
        }
        setCurriculumList(Array.isArray(currData.data) ? currData.data : []);
      }

      if (roleRes.ok) {
        const roleData = await roleRes.json();
        const allRoles: string[] = Array.isArray(roleData.allRoles)
          ? roleData.allRoles
          : [];
        const isAdminRole = allRoles.some(
          (r) =>
            r.toUpperCase() === "SUPERADMIN" || r.toUpperCase() === "ADMIN"
        );
        setCanManage(portal === "admin" && isAdminRole);
      }

      if (teacherRes && teacherRes.ok) {
        const teacherData = await teacherRes.json();
        setTeachers(Array.isArray(teacherData) ? teacherData : []);
      }
    } catch {
      toast.error("Gagal memuat data mata pelajaran");
    } finally {
      setLoading(false);
    }
  }, [portal]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Data untuk mode "Semua Mapel"
  const filteredSubjects = useMemo(() => {
    const searchLow = search.toLowerCase().trim();
    return subjects.filter((m) => {
      const matchSearch =
        !searchLow ||
        m.namaMapel.toLowerCase().includes(searchLow) ||
        (m.guruPengampu || "").toLowerCase().includes(searchLow) ||
        (m.kelasDiampu || "").toLowerCase().includes(searchLow);

      const matchGuru =
        filterGuru === "all" ||
        (filterGuru === "unassigned" && !m.guruPengampu) ||
        m.guruPengampu === filterGuru ||
        m.teacherId === filterGuru;

      const matchKelas =
        filterKelas === "all" ||
        (m.kelasDiampu
          ? m.kelasDiampu
              .split(",")
              .map((k) => k.trim().toLowerCase())
              .includes(filterKelas.toLowerCase())
          : false);

      return matchSearch && matchGuru && matchKelas;
    });
  }, [subjects, search, filterGuru, filterKelas]);

  // Data unik (1 varian nama mapel) untuk mode "KKM"
  const uniqueMapelKkmList = useMemo(
    () => deduplicateSubjectsForKkm(subjects, curriculumList, defaultKkm),
    [subjects, curriculumList, defaultKkm]
  );

  const filteredKkmList = useMemo(() => {
    const searchLow = search.toLowerCase().trim();
    return uniqueMapelKkmList.filter((item) => {
      const matchSearch =
        !searchLow ||
        item.namaMapel.toLowerCase().includes(searchLow) ||
        item.capaianKompetensi.toLowerCase().includes(searchLow) ||
        String(item.kkm).includes(searchLow);

      const matchStatus =
        filterKkmStatus === "all" ||
        (filterKkmStatus === "custom" && item.isCustomKkm) ||
        (filterKkmStatus === "default" && !item.isCustomKkm);

      return matchSearch && matchStatus;
    });
  }, [uniqueMapelKkmList, search, filterKkmStatus]);

  const activeListLength =
    viewMode === "all" ? filteredSubjects.length : filteredKkmList.length;
  const totalPages = Math.max(1, Math.ceil(activeListLength / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedSubjects = filteredSubjects.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );
  const paginatedKkmList = filteredKkmList.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, search, filterGuru, filterKelas, filterKkmStatus]);

  const resetForm = () => {
    setFormName("");
    setFormGuru("none");
    setSelectedClasses([]);
    setEditId(null);
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast.error("Nama mata pelajaran wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaMapel: formName.trim(),
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
    if (!editId || !formName.trim()) {
      toast.error("Nama mata pelajaran wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/subjects/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaMapel: formName.trim(),
          teacherId: formGuru === "none" ? null : formGuru,
          kelasDiampu: selectedClasses.join(", "),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memperbarui");
      }

      toast.success("Mata pelajaran berhasil diperbarui!");
      setEditOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Gagal memperbarui mata pelajaran";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/subjects/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menghapus mata pelajaran");
      }

      toast.success(
        `Mata pelajaran ${deleteTarget.namaMapel} berhasil dihapus!`
      );
      setDeleteTarget(null);
      fetchData();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal menghapus mata pelajaran";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  // Handler Buka & Simpan KKM Default Sekolah
  const openDefaultKkmDialog = () => {
    setDefaultKkmInput(String(defaultKkm));
    setDefaultKkmDialogOpen(true);
  };

  const handleSaveDefaultKkm = async () => {
    const parsed = parseKkmNumber(defaultKkmInput);
    if (parsed === null || parsed < 1 || parsed > 100) {
      toast.error("Angka KKM default harus berada antara 1 sampai 100");
      return;
    }
    setSavingDefaultKkm(true);
    try {
      const res = await fetch("/api/academic/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "default", kkm: parsed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan KKM default");
      toast.success(json.message);
      setDefaultKkmDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan KKM default"
      );
    } finally {
      setSavingDefaultKkm(false);
    }
  };

  // Handler Buka, Simpan, & Reset KKM Per Mapel
  const openEditKkmModal = (item: UniqueMapelKkmItem) => {
    setKkmTargetItem(item);
    setKkmInputValue(String(item.kkm));
    setKkmCapaianValue(item.capaianKompetensi || "");
    setKkmDialogOpen(true);
  };

  const handleSaveMapelKkm = async () => {
    if (!kkmTargetItem) return;
    const parsed = parseKkmNumber(kkmInputValue);
    if (parsed === null || parsed < 1 || parsed > 100) {
      toast.error("Angka KKM harus berupa bilangan bulat antara 1 sampai 100");
      return;
    }
    setSavingMapelKkm(true);
    try {
      const res = await fetch("/api/academic/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapel: kkmTargetItem.namaMapel,
          kkm: parsed,
          capaianKompetensi: kkmCapaianValue.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan KKM");
      toast.success(json.message);
      setKkmDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan KKM");
    } finally {
      setSavingMapelKkm(false);
    }
  };

  const handleResetMapelKkmToDefault = async () => {
    if (!kkmTargetItem) return;
    setSavingMapelKkm(true);
    try {
      const res = await fetch("/api/academic/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapel: kkmTargetItem.namaMapel,
          resetToDefault: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mereset KKM");
      toast.success(json.message);
      setKkmDialogOpen(false);
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mereset KKM");
    } finally {
      setSavingMapelKkm(false);
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
        title={
          viewMode === "kkm"
            ? "Mata Pelajaran & Standar KKM"
            : "Mata Pelajaran"
        }
        badge={
          viewMode === "kkm"
            ? `${uniqueMapelKkmList.length} Mapel Unik`
            : `${subjects.length} Alokasi Mapel`
        }
        description={
          canManage
            ? "Kelola kurikulum mata pelajaran, distribusi pengampu, serta penetapan KKM default dan KKM per mata pelajaran."
            : "Daftar mata pelajaran sekolah dan standar Kriteria Ketuntasan Minimal (mode hanya baca)."
        }
        icon={BookOpen}
      >
        {canManage && (
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger
              render={
                <Button size="sm" className="cursor-pointer">
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
                  <Label
                    htmlFor="nama-mapel"
                    className="text-xs font-semibold"
                  >
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
                    onValueChange={(val) => setFormGuru(val || "none")}
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
                  {saving && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  )}
                  Simpan Mapel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {!canManage && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-medium text-blue-100">
            <Eye className="h-3.5 w-3.5 text-amber-300" />
            Mode Hanya Baca
          </span>
        )}
      </PageHeader>

      {/* Dialog Edit Mapel (Khusus Admin) */}
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
                onValueChange={(val) => setFormGuru(val || "none")}
              >
                <SelectTrigger id="edit-guru" className="h-9 text-xs">
                  <SelectValue placeholder="Pilih guru pengampu (opsional)">
                    {(value) => {
                      if (value === "none" || !value) return "Belum ditentukan";
                      const teacher = teachers.find((t) => t.id === value);
                      return teacher ? teacher.namaLengkap : "Belum ditentukan";
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
              <Label className="text-xs font-semibold">Kelas yang Diampu</Label>
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
              {saving && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toolbar Pencarian + Switch "Semua Mapel" & "KKM" di Sebelah Search */}
      <div className="py-3.5 border-y border-slate-200 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={
                viewMode === "kkm"
                  ? "Cari nama mata pelajaran atau angka KKM..."
                  : "Cari mata pelajaran, guru pengampu, atau kelas..."
              }
              className="pl-8.5 h-9 text-xs border-slate-200 bg-slate-50/50 focus:bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Tombol Switch "Semua Mapel" dan "KKM" tepat di sebelah Search */}
          <div
            role="tablist"
            aria-label="Mode tampilan mata pelajaran"
            className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80 shrink-0 self-start sm:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "all"}
              onClick={() => setViewMode("all")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                viewMode === "all"
                  ? "bg-[#0d1e38] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Semua Mapel
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "kkm"}
              onClick={() => setViewMode("kkm")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                viewMode === "kkm"
                  ? "bg-[#0d1e38] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              KKM
            </button>
          </div>
        </div>

        {/* Filter Kanan */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span>Filter:</span>
          </div>

          {viewMode === "all" ? (
            <>
              {portal === "admin" && (
                <Select
                  value={filterGuru}
                  onValueChange={(val) => setFilterGuru(val || "all")}
                >
                  <SelectTrigger className="w-[165px] h-9 text-xs border-slate-200">
                    <SelectValue placeholder="Guru Pengampu">
                      {(val) => {
                        if (!val || val === "all") return "Semua Guru";
                        if (val === "unassigned") return "Belum Ditentukan";
                        return val;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Guru</SelectItem>
                    <SelectItem value="unassigned">Belum Ditentukan</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.namaLengkap}>
                        {t.namaLengkap}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select
                value={filterKelas}
                onValueChange={(val) => setFilterKelas(val || "all")}
              >
                <SelectTrigger className="w-[150px] h-9 text-xs border-slate-200">
                  <SelectValue placeholder="Alokasi Kelas">
                    {(val) =>
                      !val || val === "all" ? "Semua Kelas" : `Kelas ${val}`
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {classesList.map((k) => (
                    <SelectItem key={k.id} value={k.namaKelas}>
                      Kelas {k.namaKelas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(search || filterGuru !== "all" || filterKelas !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setFilterGuru("all");
                    setFilterKelas("all");
                  }}
                  className="h-9 px-2.5 text-xs text-slate-500 hover:text-slate-900 gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </Button>
              )}
            </>
          ) : (
            <>
              <Select
                value={filterKkmStatus}
                onValueChange={(val) => setFilterKkmStatus(val || "all")}
              >
                <SelectTrigger className="w-[170px] h-9 text-xs border-slate-200">
                  <SelectValue placeholder="Status KKM">
                    {(val) => {
                      if (val === "custom") return "KKM Khusus";
                      if (val === "default") return "Standar Default";
                      return "Semua Status KKM";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status KKM</SelectItem>
                  <SelectItem value="custom">KKM Khusus</SelectItem>
                  <SelectItem value="default">Standar Default</SelectItem>
                </SelectContent>
              </Select>
              {(search || filterKkmStatus !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setFilterKkmStatus("all");
                  }}
                  className="h-9 px-2.5 text-xs text-slate-500 hover:text-slate-900 gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Kartu Ringkasan KKM Default Sekolah (Khusus Mode KKM) */}
      {viewMode === "kkm" && (
        <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-white to-slate-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-[#0d1e38] text-amber-300 flex items-center justify-center shrink-0 font-mono font-extrabold text-base border border-amber-400/30 shadow-xs">
              {defaultKkm}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                KKM Default Standar Sekolah: {defaultKkm}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Seluruh mata pelajaran yang belum memiliki angka KKM khusus
                otomatis mengikuti standar default ini. Tabel di bawah
                menampilkan 1 varian unik untuk setiap nama mata pelajaran.
              </p>
            </div>
          </div>

          {canManage ? (
            <Button
              type="button"
              size="sm"
              onClick={openDefaultKkmDialog}
              className="gap-1.5 bg-[#0d1e38] hover:bg-[#163056] text-white text-xs shrink-0 cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-amber-300" />
              Ubah KKM Default
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600 shrink-0">
              <Eye className="h-3.5 w-3.5 text-slate-500" />
              Hanya Baca
            </span>
          )}
        </div>
      )}

      {/* Data Table: Mode Semua Mapel vs Mode KKM */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {viewMode === "all" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 text-center">No</TableHead>
                  <TableHead>Nama Mata Pelajaran</TableHead>
                  <TableHead>Guru Pengampu</TableHead>
                  <TableHead>Alokasi Kelas</TableHead>
                  {canManage && (
                    <TableHead className="text-right pr-5">Aksi</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canManage ? 5 : 4}
                      className="py-10 text-center text-xs text-slate-500"
                    >
                      Tidak ada data mata pelajaran yang ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSubjects.map((mapel, i) => (
                    <TableRow
                      key={mapel.id}
                      className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 last:border-0"
                    >
                      <TableCell className="text-center font-mono text-slate-400 group-hover/row:text-slate-500 transition-colors">
                        {(safePage - 1) * ITEMS_PER_PAGE + i + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-md bg-blue-50 group-hover/row:bg-blue-500/15 text-blue-600 group-hover/row:text-blue-300 border border-blue-100 group-hover/row:border-blue-500/30 shrink-0 transition-colors">
                            <BookOpen className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-semibold text-slate-900 group-hover/row:text-white transition-colors">
                            {mapel.namaMapel}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-700 group-hover/row:text-slate-300 transition-colors">
                        {mapel.guruPengampu || (
                          <span className="text-slate-400 group-hover/row:text-slate-500 italic transition-colors">
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
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 group-hover/row:bg-blue-500/15 text-blue-700 group-hover/row:text-blue-300 border border-blue-200 group-hover/row:border-blue-500/30 transition-colors"
                                >
                                  {trimmed}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-slate-400 group-hover/row:text-slate-500 transition-colors">
                              -
                            </span>
                          )}
                        </div>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right pr-5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              aria-label={`Edit ${mapel.namaMapel}`}
                              onClick={() => openEdit(mapel)}
                              className="inline-flex items-center justify-center h-7.5 w-7.5 rounded-md text-slate-600 group-hover/row:text-slate-300 hover:text-blue-600 hover:bg-blue-50 group-hover/row:hover:bg-slate-800 border border-transparent hover:border-blue-200 transition-colors cursor-pointer"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Hapus ${mapel.namaMapel}`}
                              onClick={() => setDeleteTarget(mapel)}
                              className="inline-flex items-center justify-center h-7.5 w-7.5 rounded-md text-slate-500 group-hover/row:text-slate-400 hover:text-rose-600 hover:bg-rose-50 group-hover/row:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14 text-center">No</TableHead>
                  <TableHead>Nama Mata Pelajaran</TableHead>
                  <TableHead className="text-center w-36">Nilai KKM</TableHead>
                  <TableHead className="text-center w-36">Status KKM</TableHead>
                  <TableHead>Capaian Kompetensi</TableHead>
                  {canManage && (
                    <TableHead className="text-right pr-5 w-32">Aksi</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedKkmList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canManage ? 6 : 5}
                      className="py-10 text-center text-xs text-slate-500"
                    >
                      Tidak ada mata pelajaran yang cocok dengan filter KKM.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedKkmList.map((item, i) => (
                    <TableRow
                      key={item.key}
                      className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 last:border-0"
                    >
                      <TableCell className="text-center font-mono text-slate-400 group-hover/row:text-slate-500 transition-colors">
                        {(safePage - 1) * ITEMS_PER_PAGE + i + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-md bg-blue-50 group-hover/row:bg-blue-500/15 text-blue-600 group-hover/row:text-blue-300 border border-blue-100 group-hover/row:border-blue-500/30 shrink-0 transition-colors">
                            <BookOpen className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 group-hover/row:text-white transition-colors block">
                              {item.namaMapel}
                            </span>
                            <span className="text-[11px] text-slate-500 group-hover/row:text-slate-400">
                              {item.kelasList.length > 0
                                ? `Kelas: ${item.kelasList.join(", ")}`
                                : "Semua Kelas"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center min-w-[52px] px-2.5 py-1 rounded-lg font-mono font-bold text-sm bg-blue-50 text-blue-800 border border-blue-200 group-hover/row:bg-blue-500/20 group-hover/row:text-blue-200 group-hover/row:border-blue-400/40 transition-colors tabular-nums">
                          {item.kkm}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors",
                            item.isCustomKkm
                              ? "bg-amber-50 text-amber-800 border-amber-200 group-hover/row:bg-amber-500/20 group-hover/row:text-amber-200 group-hover/row:border-amber-400/40"
                              : "bg-slate-100 text-slate-600 border-slate-200 group-hover/row:bg-slate-800 group-hover/row:text-slate-300 group-hover/row:border-slate-700"
                          )}
                        >
                          {item.isCustomKkm ? "KKM Khusus" : "Standar Default"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 group-hover/row:text-slate-300 max-w-sm">
                        {item.capaianKompetensi ? (
                          <span className="line-clamp-2">
                            {item.capaianKompetensi}
                          </span>
                        ) : (
                          <span className="text-slate-400 group-hover/row:text-slate-500 italic">
                            Menggunakan narasi otomatis standar
                          </span>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right pr-5">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => openEditKkmModal(item)}
                            className="h-7 px-2.5 text-xs gap-1 group-hover/row:bg-blue-900/40 group-hover/row:border-blue-500/40 group-hover/row:text-white cursor-pointer"
                          >
                            <Edit className="h-3 w-3" />
                            Atur KKM
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Halaman <strong className="text-slate-800">{safePage}</strong>{" "}
              dari <strong className="text-slate-800">{totalPages}</strong> (
              {activeListLength} mapel)
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
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={safePage >= totalPages}
              >
                Selanjutnya
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Ubah KKM Default Sekolah (Khusus Admin) */}
      <Dialog
        open={defaultKkmDialogOpen}
        onOpenChange={setDefaultKkmDialogOpen}
      >
        <DialogContent className="max-w-md rounded-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Ubah KKM Default Sekolah
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Angka ini berlaku otomatis untuk seluruh mata pelajaran yang tidak
              memiliki penetapan KKM khusus.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="default-kkm-input" className="text-xs font-semibold">
                Nilai KKM Default (1 sampai 100)
              </Label>
              <Input
                id="default-kkm-input"
                type="text"
                inputMode="numeric"
                placeholder="Contoh: 75"
                className="h-9 text-sm font-mono font-bold"
                value={defaultKkmInput}
                onChange={(e) =>
                  setDefaultKkmInput(sanitizeKkmInput(e.target.value))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDefaultKkmDialogOpen(false)}
              disabled={savingDefaultKkm}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDefaultKkm}
              disabled={savingDefaultKkm}
              className="gap-1.5"
            >
              {savingDefaultKkm ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Simpan KKM Default
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Atur KKM Per Mapel (Khusus Admin) */}
      <Dialog open={kkmDialogOpen} onOpenChange={setKkmDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Atur KKM Mata Pelajaran
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {kkmTargetItem
                ? `Penetapan KKM dan narasi capaian untuk ${kkmTargetItem.namaMapel} (Default Sekolah: ${defaultKkm})`
                : "Penetapan KKM mata pelajaran"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="mapel-kkm-input" className="text-xs font-semibold">
                Angka KKM Khusus (1 sampai 100)
              </Label>
              <Input
                id="mapel-kkm-input"
                type="text"
                inputMode="numeric"
                placeholder={`Contoh: ${defaultKkm}`}
                className="h-9 text-sm font-mono font-bold"
                value={kkmInputValue}
                onChange={(e) =>
                  setKkmInputValue(sanitizeKkmInput(e.target.value))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="mapel-capaian-input"
                className="text-xs font-semibold"
              >
                Template Materi Capaian Kompetensi (Opsional)
              </Label>
              <Input
                id="mapel-capaian-input"
                placeholder="Contoh: aljabar linier, trigonometri, dan kalkulus terapan"
                className="h-9 text-xs"
                value={kkmCapaianValue}
                onChange={(e) => setKkmCapaianValue(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <div>
              {kkmTargetItem?.isCustomKkm && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetMapelKkmToDefault}
                  disabled={savingMapelKkm}
                  className="text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Gunakan Default ({defaultKkm})
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setKkmDialogOpen(false)}
                disabled={savingMapelKkm}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveMapelKkm}
                disabled={savingMapelKkm}
                className="gap-1.5"
              >
                {savingMapelKkm ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Simpan KKM
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Mapel */}
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
              Hapus Mata Pelajaran?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Apakah Anda yakin ingin menghapus mata pelajaran{" "}
              <strong className="text-slate-800">
                {deleteTarget?.namaMapel}
              </strong>
              ? Mata pelajaran yang telah memiliki data presensi atau nilai
              tidak dapat dihapus.
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
              {deleting && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Ya, Hapus Mapel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
