"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  PenLine,
  Save,
  Loader2,
  BookOpen,
  Trash2,
  Upload,
  Download,
  Plus,
  X,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SessionSetup } from "@/components/shared/session-setup";
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

interface KelasRow {
  id: string;
  namaKelas: string;
}
interface MapelRow {
  namaMapel: string;
  kelas?: string[];
}
interface CriteriaRow {
  id: string;
  namaKriteria: string;
  bobot: number;
  tipe: string;
  deskripsi: string;
}
interface ScoreStudent {
  studentId: string;
  nis: string;
  namaLengkap: string;
  nilai: number;
  details: Record<string, number>;
  scoreId: string | null;
}

const AVAILABLE_CATEGORIES = ["Tugas", "UTS", "UAS", "Praktek"];

function formatBobotPct(bobot: number): number {
  return bobot <= 1 ? Math.round(bobot * 100) : Math.round(bobot);
}

export default function GuruNilaiPage() {
  const [classes, setClasses] = useState<KelasRow[]>([]);
  const [subjects, setSubjects] = useState<MapelRow[]>([]);
  const [waliClasses, setWaliClasses] = useState<string[]>([]);
  const [criteria, setCriteria] = useState<CriteriaRow[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedMapel, setSelectedMapel] = useState("");
  const [selectedCriteria, setSelectedCriteria] = useState("");

  const [siswaList, setSiswaList] = useState<ScoreStudent[]>([]);
  const [details, setDetails] = useState<
    Record<string, Record<string, number>>
  >({});
  const [categories, setCategories] = useState<string[]>([]);
  const [newCat, setNewCat] = useState<string>("");

  const [showGrid, setShowGrid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [changeSessionOpen, setChangeSessionOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const importRef = useRef<HTMLInputElement>(null);
  const loadedSnapshotRef = useRef<string>("");

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
      fetch("/api/spk/criteria").then((r) => {
        if (!r.ok) throw new Error("Gagal memuat kriteria penilaian");
        return r.json();
      }),
    ])
      .then(([classesData, subjectsRes, criteriaData]) => {
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

        const manualCriteria = (
          Array.isArray(criteriaData) ? criteriaData : []
        ).filter(
          (c: CriteriaRow) =>
            c.tipe === "Manual" ||
            c.namaKriteria.toLowerCase().includes("akademik")
        );
        setCriteria(manualCriteria);
        if (manualCriteria.length > 0) {
          setSelectedCriteria(manualCriteria[0].id);
        }
      })
      .catch((err: unknown) => {
        toast.error(
          err instanceof Error ? err.message : "Gagal memuat preferensi guru"
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

  const handleLoad = useCallback(async () => {
    if (!selectedKelas || !selectedMapel || !selectedCriteria) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/spk/scores?kelas=${encodeURIComponent(selectedKelas)}&criteriaId=${encodeURIComponent(selectedCriteria)}&mapel=${encodeURIComponent(selectedMapel)}`
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        throw new Error(data?.error || "Gagal memuat grid nilai");
      }

      const payload = data as {
        categories: string[];
        students: ScoreStudent[];
      };
      const isAka = criteria
        .find((c) => c.id === selectedCriteria)
        ?.namaKriteria.toLowerCase()
        .includes("akademik");

      let fetchedCats = payload.categories || [];
      if (!isAka) {
        fetchedCats = ["Nilai"];
      }
      setCategories(fetchedCats);
      setSiswaList(payload.students);

      const init: Record<string, Record<string, number>> = {};
      payload.students.forEach((s) => {
        let det = s.details || {};
        // Use scoreId !== null so a legitimate stored score of 0 is preserved
        if (!isAka && Object.keys(det).length === 0 && s.scoreId !== null) {
          det = { Nilai: s.nilai };
        }
        init[s.studentId] = det;
      });
      setDetails(init);
      loadedSnapshotRef.current = JSON.stringify({
        categories: fetchedCats,
        details: init,
      });
      setShowGrid(true);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memuat grid nilai"
      );
    } finally {
      setLoading(false);
    }
  }, [selectedKelas, selectedCriteria, selectedMapel, criteria]);

  const handleChangeSession = () => {
    const isDirty =
      loadedSnapshotRef.current !== JSON.stringify({ categories, details });
    if (isDirty) {
      setChangeSessionOpen(true);
      return;
    }
    setShowGrid(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = Object.entries(details).map(
        ([studentId, studDetails]) => ({
          studentId,
          details: studDetails,
        })
      );

      const res = await fetch("/api/spk/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kelas: selectedKelas,
          criteriaId: selectedCriteria,
          mapel: selectedMapel,
          categories,
          records,
        }),
      });

      const resJson = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(resJson?.error || "Gagal menyimpan nilai");
      }

      toast.success("Catatan kategori dan nilai berhasil disimpan!");
      handleLoad();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan nilai"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/spk/scores?kelas=${encodeURIComponent(selectedKelas)}&criteriaId=${encodeURIComponent(selectedCriteria)}&mapel=${encodeURIComponent(selectedMapel)}`,
        {
          method: "DELETE",
        }
      );
      const errJson = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(errJson?.error || "Gagal menghapus nilai");
      }
      toast.success("Seluruh nilai mapel ini berhasil dihapus");
      handleLoad();
      setDeleteOpen(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus nilai"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleAddCategory = () => {
    if (!newCat) return;
    let finalName = newCat;
    if (categories.includes(finalName)) {
      let i = 1;
      while (categories.includes(finalName)) {
        finalName = `${newCat} ${i + 1}`;
        i++;
      }
    }
    setCategories([...categories, finalName]);
    setNewCat("");
  };

  const handleRemoveCategory = (catToRemove: string) => {
    setCategories(categories.filter((c) => c !== catToRemove));
    setDetails((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((studentId) => {
        if (next[studentId]?.[catToRemove] !== undefined) {
          const nd = { ...next[studentId] };
          delete nd[catToRemove];
          next[studentId] = nd;
        }
      });
      return next;
    });
  };

  // Compute average strictly over filled numeric categories (matches POST /api/spk/scores)
  const getAverage = (studentId: string): number | null => {
    if (categories.length === 0) return null;
    const studsDetails = details[studentId] || {};
    let sum = 0;
    let count = 0;
    categories.forEach((c) => {
      const val = studsDetails[c];
      if (val !== undefined && Number.isFinite(val)) {
        sum += val;
        count++;
      }
    });
    if (count === 0) return null;
    return Math.round(sum / count);
  };

  const activeCriteriaObj = criteria.find((c) => c.id === selectedCriteria);
  const isAkademik = activeCriteriaObj?.namaKriteria
    .toLowerCase()
    .includes("akademik");

  const handleDownloadTemplate = () => {
    const templateData = siswaList.map((s) => {
      const baseRow: Record<string, string | number> = {
        NIS: s.nis,
        NamaLengkap: s.namaLengkap,
      };
      categories.forEach((c) => {
        baseRow[c] = "";
      });
      return baseRow;
    });
    if (templateData.length === 0) return toast.error("Tidak ada siswa");
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Format Nilai");
    XLSX.writeFile(wb, `Template_Nilai_${selectedKelas}_${selectedMapel}.xlsx`);
    toast.success("Template nilai berhasil diunduh!");
  };

  const handleExportExcel = () => {
    const dataToExport = siswaList.map((s) => {
      const row: Record<string, string | number> = {
        NIS: s.nis,
        NamaLengkap: s.namaLengkap,
      };
      categories.forEach((c) => {
        row[c] =
          details[s.studentId]?.[c] !== undefined
            ? details[s.studentId][c]
            : "";
      });
      const avg = getAverage(s.studentId);
      row["Rata-rata"] = avg !== null ? avg : "";
      return row;
    });
    if (dataToExport.length === 0) return toast.error("Tidak ada siswa");
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Nilai");
    XLSX.writeFile(wb, `Data_Nilai_${selectedKelas}_${selectedMapel}.xlsx`);
    toast.success("Data nilai berhasil diekspor!");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows =
        XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet);

      if (rows.length === 0) {
        toast.error("File excel kosong");
        return;
      }

      const allHeaders = new Set<string>();
      rows.forEach((row) => {
        Object.keys(row).forEach((k) => allHeaders.add(k.trim().toLowerCase()));
      });

      const excelCategories = categories.filter((c) =>
        allHeaders.has(c.trim().toLowerCase())
      );

      if (excelCategories.length === 0 && categories.length > 0) {
        toast.error(
          "Format Excel tidak sesuai. Gagal menemukan kolom dengan nama kategori. Coba Download Template Excel terlebih dahulu."
        );
        return;
      }

      let matchCount = 0;
      let clampedCount = 0;
      let invalidCellCount = 0;

      setDetails((prev) => {
        const next = { ...prev };
        rows.forEach((row) => {
          const rowNis = String(row.NIS || row.nis || "")
            .replace(/['"]/g, "")
            .trim();
          if (!rowNis) return;

          const matchedStudent = siswaList.find((s) => s.nis === rowNis);
          if (!matchedStudent) return;

          const updatedStud = { ...(next[matchedStudent.studentId] || {}) };
          categories.forEach((cat) => {
            const matchedKey = Object.keys(row).find(
              (k) => k.trim().toLowerCase() === cat.trim().toLowerCase()
            );
            if (!matchedKey) return;

            const rawVal = row[matchedKey];
            if (
              rawVal === undefined ||
              rawVal === null ||
              String(rawVal).trim() === ""
            ) {
              return;
            }

            const parsed = Number(rawVal);
            if (!Number.isFinite(parsed)) {
              invalidCellCount++;
              return;
            }

            const clamped = Math.min(100, Math.max(0, parsed));
            if (clamped !== parsed) clampedCount++;
            updatedStud[cat] = clamped;
          });

          next[matchedStudent.studentId] = updatedStud;
          matchCount++;
        });
        return next;
      });

      if (matchCount > 0) {
        toast.success(
          `Berhasil mengimpor nilai untuk ${matchCount} siswa. Klik 'Simpan Record Nilai' jika sudah sesuai.`
        );
        if (clampedCount > 0 || invalidCellCount > 0) {
          toast.warning(
            `Catatan impor: ${clampedCount} nilai disesuaikan ke rentang 0-100, ${invalidCellCount} sel bukan angka dilewati.`
          );
        }
      } else {
        toast.warning("Tidak ada NIS yang cocok dengan daftar di kelas ini.");
      }
    } catch {
      toast.error("Gagal membaca file excel");
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
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
        title="Input Nilai Multi-Kategori"
        badge="Portal Guru"
        description="Kelola komponen penilaian Tugas, UTS, UAS, Praktek, maupun kriteria non-akademik SPK SAW"
        icon={PenLine}
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
              onClick={handleExportExcel}
            >
              <Save className="h-3.5 w-3.5 text-slate-500" /> Ekspor Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={importing || categories.length === 0}
              onClick={() => importRef.current?.click()}
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
              onChange={handleImportExcel}
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
              Pengisian nilai hanya tersedia untuk mata pelajaran kurikulum yang
              ditugaskan kepada Anda oleh Administrator.
            </p>
          </div>
          {waliClasses.length > 0 && (
            <Link href="/guru/rekap" className="inline-block pt-1">
              <Button variant="outline" size="sm" className="gap-1.5">
                Pantau Rekap Kelas Perwalian{" "}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <AlertDialog
            open={changeSessionOpen}
            onOpenChange={setChangeSessionOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ganti Sesi Penilaian?</AlertDialogTitle>
                <AlertDialogDescription>
                  Perubahan penilaian pada sesi ini belum disimpan dan akan
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

          <SessionSetup
            active={showGrid}
            icon={PenLine}
            eyebrow="Langkah 1 dari 2"
            title="Mulai Sesi Penilaian Siswa"
            description="Pilih target kelas penugasan, mata pelajaran, dan kriteria evaluasi SPK SAW untuk membuka lembar pengisian nilai."
            submitLabel="Buka Lembar Penilaian"
            onSubmit={handleLoad}
            loading={loading}
            disabled={!selectedKelas || !selectedMapel || !selectedCriteria}
            onChangeSession={handleChangeSession}
            chips={[
              { label: "Kelas", value: selectedKelas },
              { label: "Mapel", value: selectedMapel },
              {
                label: "Kriteria",
                value: activeCriteriaObj
                  ? `${activeCriteriaObj.namaKriteria} (${formatBobotPct(activeCriteriaObj.bobot)}%)`
                  : "-",
              },
            ]}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Target Kelas
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
                  searchPlaceholder="Ketik nama mapel (mis. Matematika, Kejuruan)..."
                  emptyMessage="Mata pelajaran tidak ditemukan"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Kriteria Penilaian SPK
              </Label>
              <Select
                value={selectedCriteria}
                onValueChange={(val: string | null) =>
                  val && setSelectedCriteria(val)
                }
              >
                <SelectTrigger className="h-9 w-full text-xs">
                  <span className="line-clamp-1 truncate">
                    {activeCriteriaObj
                      ? `${activeCriteriaObj.namaKriteria} (Bobot: ${formatBobotPct(activeCriteriaObj.bobot)}%)`
                      : "Pilih Kriteria..."}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-w-[100vw] xl:max-w-2xl">
                  {criteria.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.namaKriteria} (Bobot: {formatBobotPct(c.bobot)}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </SessionSetup>

          {showGrid && (
            <>
              {/* Session Toolbar */}
              <div className="py-3 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                {isAkademik ? (
                  <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center w-full sm:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Select
                        value={newCat}
                        onValueChange={(val) => val && setNewCat(val)}
                      >
                        <SelectTrigger className="w-full sm:w-[170px] h-8 text-xs bg-white border-slate-200 text-slate-800">
                          <SelectValue placeholder="Pilih Kategori..." />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="gap-1.5 shrink-0"
                        onClick={handleAddCategory}
                        disabled={!newCat}
                      >
                        <Plus className="h-3.5 w-3.5" /> Tambah Kolom
                      </Button>
                    </div>
                    {categories.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {categories.map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {cat}
                            <button
                              type="button"
                              onClick={() => handleRemoveCategory(cat)}
                              className="text-slate-400 hover:text-rose-600 transition-colors"
                              title={`Hapus kolom ${cat}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    Penilaian kriteria tunggal{" "}
                    <span className="font-semibold text-slate-800">
                      ({siswaList.length} siswa)
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <AlertDialogTrigger
                      render={
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:text-rose-800 gap-1.5"
                          disabled={deleting}
                        >
                          {deleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Hapus Nilai
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Hapus Data Penilaian?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Menghapus seluruh nilai pada kelas{" "}
                          <b>{selectedKelas}</b>, mapel <b>{selectedMapel}</b>,
                          untuk kriteria ini.
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
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
                <div>
                  {categories.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-8 text-slate-500 bg-slate-50/60 border-b border-slate-200">
                      <BookOpen className="h-6 w-6 mb-2 text-slate-400" />
                      <p className="text-xs font-medium">
                        Tambahkan minimal 1 kolom kategori (Tugas, UTS, UAS, atau
                        Praktek) di atas untuk mulai mengisi nilai.
                      </p>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-max border-collapse text-left">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                          <th className="px-4 py-3 font-semibold w-12 min-w-[48px] sticky left-0 bg-slate-50 z-20">
                            No
                          </th>
                          <th className="px-4 py-3 font-semibold w-24 min-w-[96px] sticky left-12 bg-slate-50 z-20">
                            NIS
                          </th>
                          <th className="px-4 py-3 font-semibold min-w-[200px] whitespace-nowrap">
                            Nama Siswa
                          </th>
                          {categories.map((cat) => (
                            <th
                              key={cat}
                              className="px-3 py-3 text-center font-semibold min-w-[120px]"
                            >
                              <div className="flex items-center justify-center gap-1 group">
                                <span>{cat}</span>
                                {isAkademik && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCategory(cat)}
                                    className="text-rose-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-opacity"
                                    title="Hapus Kategori"
                                  >
                                    &times;
                                  </button>
                                )}
                              </div>
                            </th>
                          ))}
                          {isAkademik && (
                            <th className="px-4 py-3 text-center font-semibold text-blue-700 bg-blue-50/70 min-w-[110px]">
                              Rata-rata
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {siswaList.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4 + categories.length}
                              className="text-center py-10 text-slate-500"
                            >
                              Tidak ada data siswa di kelas ini.
                            </td>
                          </tr>
                        ) : (
                          siswaList.map((siswa, i) => {
                            const rerata = getAverage(siswa.studentId);
                            return (
                              <tr
                                key={siswa.studentId}
                                className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md"
                              >
                                <td className="px-4 py-2.5 w-12 min-w-[48px] text-slate-500 group-hover/row:text-slate-400 font-mono sticky left-0 z-10 bg-white group-hover/row:bg-[#091524] transition-colors">
                                  {i + 1}
                                </td>
                                <td className="px-4 py-2.5 w-24 min-w-[96px] font-mono text-slate-600 group-hover/row:text-slate-400 sticky left-12 z-10 bg-white group-hover/row:bg-[#091524] transition-colors">
                                  {siswa.nis}
                                </td>
                                <td className="px-4 py-2.5 font-semibold text-slate-800 group-hover/row:text-white transition-colors">
                                  {siswa.namaLengkap}
                                </td>

                                {categories.map((cat) => (
                                  <td key={cat} className="px-2 py-2">
                                    <div className="flex justify-center">
                                      <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={
                                          details[siswa.studentId]?.[cat] !==
                                          undefined
                                            ? details[siswa.studentId][cat]
                                            : ""
                                        }
                                        onChange={(e) => {
                                          const raw = e.target.value;
                                          setDetails((p) => {
                                            const currentStud = {
                                              ...(p[siswa.studentId] || {}),
                                            };
                                            if (raw === "") {
                                              delete currentStud[cat];
                                            } else {
                                              const num = parseFloat(raw);
                                              currentStud[cat] = !Number.isFinite(
                                                num
                                              )
                                                ? 0
                                                : Math.min(100, Math.max(0, num));
                                            }
                                            return {
                                              ...p,
                                              [siswa.studentId]: currentStud,
                                            };
                                          });
                                        }}
                                        className="w-20 h-8 text-center font-mono text-xs font-semibold group-hover/row:bg-slate-900/90 group-hover/row:border-slate-700 group-hover/row:text-white group-hover/row:[color-scheme:dark] transition-colors"
                                      />
                                    </div>
                                  </td>
                                ))}
                                {isAkademik && (
                                  <td className="px-4 py-2.5 text-center font-mono font-bold bg-blue-50/40 group-hover/row:bg-blue-950/30 text-blue-700 group-hover/row:text-blue-300 transition-colors">
                                    {rerata !== null ? rerata : "-"}
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="lg"
                  className="gap-2 w-full sm:w-auto"
                  onClick={handleSave}
                  disabled={saving || categories.length === 0}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Simpan Record Nilai
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
