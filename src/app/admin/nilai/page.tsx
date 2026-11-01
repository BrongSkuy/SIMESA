"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
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

interface KelasRow {
  id: string;
  namaKelas: string;
}
interface MapelRow {
  namaMapel: string;
  kelasDiampu?: string | null;
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

export default function AdminNilaiPage() {
  const [classes, setClasses] = useState<KelasRow[]>([]);
  const [subjects, setSubjects] = useState<MapelRow[]>([]);
  const [criteria, setCriteria] = useState<CriteriaRow[]>([]);

  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedMapel, setSelectedMapel] = useState("Umum");
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
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/classes").then((r) => r.json()),
      fetch("/api/subjects").then((r) => r.json()),
      fetch("/api/spk/criteria").then((r) => r.json()),
    ])
      .then(([classesData, subjectsData, criteriaData]) => {
        setClasses(Array.isArray(classesData) ? classesData : []);
        if (Array.isArray(classesData) && classesData.length > 0) {
          setSelectedKelas(classesData[0].namaKelas);
        }

        const manualCriteria = (
          Array.isArray(criteriaData) ? criteriaData : []
        ).filter(
          (c: CriteriaRow) =>
            c.tipe === "Manual" ||
            c.namaKriteria.toLowerCase().includes("akademik")
        );
        setCriteria(manualCriteria);
        if (manualCriteria.length > 0)
          setSelectedCriteria(manualCriteria[0].id);

        if (Array.isArray(subjectsData) && subjectsData.length > 0) {
          // De-duplicate subjects by namaMapel
          const uniqueMapel: MapelRow[] = Array.from(
            new Map(
              subjectsData.map((s: MapelRow) => [s.namaMapel, s])
            ).values()
          );
          setSubjects(uniqueMapel);
          setSelectedMapel(uniqueMapel[0].namaMapel);
        }
      })
      .catch(() => toast.error("Gagal memuat preferensi penilaian"));
  }, []);

  // Reset selectedMapel if it's not valid for the selected class
  useEffect(() => {
    if (!selectedKelas || subjects.length === 0) return;
    const validSubjects = subjects.filter((s) => {
      if (!s.kelasDiampu) return false;
      return s.kelasDiampu
        .split(",")
        .map((k) => k.trim())
        .includes(selectedKelas);
    });
    const isValid =
      selectedMapel === "Umum" ||
      validSubjects.some((s) => s.namaMapel === selectedMapel);
    if (!isValid) {
      if (validSubjects.length > 0) {
        setSelectedMapel(validSubjects[0].namaMapel);
      } else {
        setSelectedMapel("Umum");
      }
    }
  }, [selectedKelas, selectedMapel, subjects]);

  const handleLoad = useCallback(async () => {
    if (!selectedKelas || !selectedCriteria) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/spk/scores?kelas=${encodeURIComponent(selectedKelas)}&criteriaId=${encodeURIComponent(selectedCriteria)}&mapel=${encodeURIComponent(selectedMapel)}`
      );
      if (!res.ok) throw new Error("Gagal load nilai");
      const data: { categories: string[]; students: ScoreStudent[] } =
        await res.json();

      const isAka = criteria
        .find((c) => c.id === selectedCriteria)
        ?.namaKriteria.toLowerCase()
        .includes("akademik");
      let fetchedCats = data.categories || [];
      if (!isAka) {
        fetchedCats = ["Nilai"];
      }
      setCategories(fetchedCats);
      setSiswaList(data.students);

      const init: Record<string, Record<string, number>> = {};
      data.students.forEach((s) => {
        let det = s.details || {};
        if (!isAka && Object.keys(det).length === 0 && s.nilai > 0) {
          det = { Nilai: s.nilai };
        }
        init[s.studentId] = det;
      });
      setDetails(init);
      setShowGrid(true);
    } catch {
      toast.error("Gagal memuat grid nilai");
    } finally {
      setLoading(false);
    }
  }, [selectedKelas, selectedCriteria, selectedMapel, criteria]);

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

      if (!res.ok) throw new Error("Gagal menyimpan");

      toast.success("Catatan kategori dan nilai berhasil disimpan!");
      handleLoad();
    } catch {
      toast.error("Gagal menyimpan nilai");
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
      if (!res.ok) throw new Error("Gagal hapus");
      toast.success("Seluruh nilai mapel ini berhasil dihapus");
      handleLoad();
      setDeleteOpen(false);
    } catch {
      toast.error("Gagal menghapus nilai");
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

  // Helper to compute live average
  const getAverage = (studentId: string) => {
    if (categories.length === 0) return 0;
    const studsDetails = details[studentId] || {};
    let sum = 0;
    categories.forEach((c) => {
      sum += studsDetails[c] || 0;
    });
    return Math.round(sum / categories.length);
  };

  const activeCriteriaObj = criteria.find((c) => c.id === selectedCriteria);
  const isAkademik = activeCriteriaObj?.namaKriteria
    .toLowerCase()
    .includes("akademik");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Input Nilai Multi-Kategori"
        badge="Operasional"
        description="Kelola komponen penilaian seperti Tugas, UTS, UAS, dan Praktek untuk perhitungan kriteria SPK SAW"
        icon={PenLine}
      />

      <div className="pb-5 border-b border-slate-200">
        <div className="pb-3 mb-4 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900">
            Pengaturan Sesi Penilaian
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Pilih target kelas, mata pelajaran, dan kriteria evaluasi SPK
          </CardDescription>
        </div>
        <div>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="space-y-1.5 flex-1 sm:min-w-[150px]">
              <Label className="text-xs font-medium text-slate-700">
                Target Kelas
              </Label>
              <Select
                value={selectedKelas}
                onValueChange={(val: string | null) =>
                  val && setSelectedKelas(val)
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
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
                Mata Pelajaran (Pilih Umum untuk Non-Akademik)
              </Label>
              <Select
                value={selectedMapel}
                onValueChange={(val: string | null) =>
                  val && setSelectedMapel(val)
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Umum">Umum / Semua Mapel</SelectItem>
                  {subjects
                    .filter((s) => {
                      if (!s.kelasDiampu) return false;
                      return s.kelasDiampu
                        .split(",")
                        .map((k) => k.trim())
                        .includes(selectedKelas);
                    })
                    .map((s, i) => (
                      <SelectItem key={i} value={s.namaMapel}>
                        {s.namaMapel}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 flex-1 sm:min-w-[280px]">
              <Label className="text-xs font-medium text-slate-700">
                Kriteria Penilaian SPK
              </Label>
              <Select
                value={selectedCriteria}
                onValueChange={(val: string | null) =>
                  val && setSelectedCriteria(val)
                }
              >
                <SelectTrigger className="w-full h-9 text-xs">
                  <span className="line-clamp-1 truncate">
                    {activeCriteriaObj
                      ? `${activeCriteriaObj.namaKriteria} (Bobot: ${activeCriteriaObj.bobot}%)`
                      : "Pilih Kriteria..."}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-w-[100vw] xl:max-w-2xl">
                  {criteria.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.namaKriteria} (Bobot: {c.bobot}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full xl:w-auto h-9 gap-1.5 shrink-0"
              onClick={handleLoad}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BookOpen className="h-3.5 w-3.5" />
              )}
              Muat Data Tabel
            </Button>

            <input
              ref={importRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImporting(true);
                try {
                  const data = await file.arrayBuffer();
                  const workbook = XLSX.read(data);
                  const sheet = workbook.Sheets[workbook.SheetNames[0]];
                  const rows =
                    XLSX.utils.sheet_to_json<Record<string, string | number>>(
                      sheet
                    );

                  if (rows.length === 0) {
                    toast.error("File excel kosong");
                    return;
                  }

                  let matchCount = 0;
                  const excelCategories = categories.filter(
                    (c) =>
                      rows[0] && (c in rows[0] || c.toLowerCase() in rows[0])
                  );

                  if (excelCategories.length === 0 && categories.length > 0) {
                    toast.error(
                      "Format Excel tidak sesuai. Gagal menemukan kolom dengan nama kategori. Coba Download Template Excel terlebih dahulu."
                    );
                    return;
                  }

                  setDetails((prev) => {
                    const next = { ...prev };
                    rows.forEach((row) => {
                      const rowNis = String(row.NIS || row.nis || "").trim();

                      if (rowNis) {
                        const matchedStudent = siswaList.find(
                          (s) => s.nis === rowNis
                        );
                        if (matchedStudent) {
                          if (!next[matchedStudent.studentId])
                            next[matchedStudent.studentId] = {};

                          categories.forEach((cat) => {
                            const val =
                              row[cat] !== undefined
                                ? row[cat]
                                : row[cat.toLowerCase()] !== undefined
                                  ? row[cat.toLowerCase()]
                                  : "";
                            const parsed = parseFloat(String(val));
                            if (!isNaN(parsed)) {
                              next[matchedStudent.studentId][cat] = parsed;
                            }
                          });
                          matchCount++;
                        }
                      }
                    });
                    return next;
                  });

                  if (matchCount > 0) {
                    toast.success(
                      `Berhasil mengimpor nilai untuk ${matchCount} siswa. Klik 'Simpan Record Nilai' jika sudah sesuai.`
                    );
                  } else {
                    toast.warning(
                      "Tidak ada NIS yang cocok dengan daftar di kelas ini."
                    );
                  }
                } catch {
                  toast.error("Gagal membaca file excel");
                } finally {
                  setImporting(false);
                  if (importRef.current) importRef.current.value = "";
                }
              }}
            />
          </div>
        </div>
      </div>

      {showGrid && (
        <>
          {/* Session Toolbar */}
          <div className="py-3.5 border-b border-slate-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            {isAkademik ? (
              <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center w-full xl:w-auto">
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
              <div className="text-xs text-slate-300">
                Sesi:{" "}
                <span className="font-semibold text-white">
                  Kelas {selectedKelas}
                </span>{" "}
                ·{" "}
                <span className="text-blue-400 font-medium">
                  {activeCriteriaObj?.namaKriteria}
                </span>
              </div>
            )}

            <div className="flex flex-wrap justify-start xl:justify-end gap-2 items-center w-full xl:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white gap-1.5"
                onClick={() => {
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
                    row["Rata-rata"] = getAverage(s.studentId);
                    return row;
                  });
                  if (dataToExport.length === 0)
                    return toast.error("Tidak ada siswa");
                  const ws = XLSX.utils.json_to_sheet(dataToExport);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Data Nilai");
                  XLSX.writeFile(
                    wb,
                    `Data_Nilai_${selectedKelas}_${selectedMapel}.xlsx`
                  );
                }}
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" /> Ekspor
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white gap-1.5"
                onClick={() => {
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
                  if (templateData.length === 0)
                    return toast.error("Tidak ada siswa");
                  const ws = XLSX.utils.json_to_sheet(templateData);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Format Nilai");
                  XLSX.writeFile(
                    wb,
                    `Template_Nilai_${selectedKelas}_${selectedMapel}.xlsx`
                  );
                }}
              >
                <Download className="h-3.5 w-3.5 text-blue-400" /> Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white gap-1.5"
                disabled={importing || categories.length === 0}
                onClick={() => importRef.current?.click()}
              >
                {importing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5 text-amber-400" />
                )}
                Impor Excel
              </Button>
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-rose-950/50 border-rose-800/70 text-rose-300 hover:bg-rose-900/60 hover:text-rose-200 gap-1.5"
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
                    <AlertDialogTitle>Hapus Data Penilaian?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Menghapus seluruh nilai pada kelas <b>{selectedKelas}</b>,
                      mapel <b>{selectedMapel}</b>, untuk kriteria ini.
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

          <div className="border-b border-slate-200">
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
                      <th className="px-4 py-3 font-semibold w-12 sticky left-0 bg-slate-50 z-10">
                        No
                      </th>
                      <th className="px-4 py-3 font-semibold w-24 sticky left-12 bg-slate-50 z-10">
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
                            className="transition-colors hover:bg-slate-50/80 group"
                          >
                            <td className="px-4 py-2.5 text-slate-500 font-mono sticky left-0 bg-white group-hover:bg-slate-50">
                              {i + 1}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-600 sticky left-12 bg-white group-hover:bg-slate-50">
                              {siswa.nis}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-slate-800">
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
                                    onChange={(e) =>
                                      setDetails((p) => ({
                                        ...p,
                                        [siswa.studentId]: {
                                          ...(p[siswa.studentId] || {}),
                                          [cat]:
                                            parseFloat(e.target.value) || 0,
                                        },
                                      }))
                                    }
                                    className="w-20 h-8 text-center font-mono text-xs font-semibold"
                                  />
                                </div>
                              </td>
                            ))}
                            {isAkademik && (
                              <td className="px-4 py-2.5 text-center font-mono font-bold bg-blue-50/40 text-blue-700">
                                {rerata > 0 ? rerata : "-"}
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
    </div>
  );
}
