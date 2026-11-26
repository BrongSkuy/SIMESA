"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  downloadStyledExcel,
  parseExcelSheetSmart,
  scoreCellStyle,
} from "@/lib/excel-styled";
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
import { ModulePageShell } from "@/components/shared/module-page-shell";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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

function formatBobotPct(bobot: number): number {
  return bobot <= 1 ? Math.round(bobot * 100) : Math.round(bobot);
}

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
  const loadedSnapshotRef = useRef<string>("");

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
          Array.isArray(criteriaData) ? criteriaData : ""
        )
          ? (criteriaData as CriteriaRow[]).filter(
              (c: CriteriaRow) =>
                c.tipe === "Manual" ||
                c.namaKriteria.toLowerCase().includes("akademik")
            )
          : [];
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

  const mapelOptions = useMemo(() => {
    const list = [
      {
        value: "Umum",
        label: "Umum / Semua Mapel",
        sublabel: "Seluruh Mata Pelajaran",
      },
    ];
    subjects
      .filter((s) => {
        if (!s.kelasDiampu) return false;
        return s.kelasDiampu
          .split(",")
          .map((k) => k.trim())
          .includes(selectedKelas);
      })
      .forEach((s) => {
        list.push({
          value: s.namaMapel,
          label: s.namaMapel,
          sublabel: "Mata Pelajaran",
        });
      });
    return list;
  }, [subjects, selectedKelas]);

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
      loadedSnapshotRef.current = JSON.stringify({
        categories: fetchedCats,
        details: init,
      });
      setShowGrid(true);
    } catch {
      toast.error("Gagal memuat grid nilai");
    } finally {
      setLoading(false);
    }
  }, [selectedKelas, selectedCriteria, selectedMapel, criteria]);

  const [confirmChangeSessionOpen, setConfirmChangeSessionOpen] = useState(false);

  const handleChangeSession = () => {
    const isDirty =
      loadedSnapshotRef.current !== JSON.stringify({ categories, details });
    if (isDirty) {
      setConfirmChangeSessionOpen(true);
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

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || "Gagal menyimpan nilai");
      }

      toast.success("Catatan kategori dan nilai berhasil disimpan!");
      handleLoad();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan nilai";
      toast.error(msg);
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
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || "Gagal menghapus nilai");
      }
      toast.success("Seluruh nilai mapel ini berhasil dihapus");
      handleLoad();
      setDeleteOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus nilai";
      toast.error(msg);
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

  const handleDownloadTemplate = async () => {
    if (siswaList.length === 0) return toast.error("Tidak ada siswa");
    const templateData = siswaList.map((s, idx) => {
      const baseRow: Record<string, string | number> = {
        No: idx + 1,
        NIS: s.nis,
        NamaLengkap: s.namaLengkap,
      };
      categories.forEach((c) => {
        baseRow[c] = "";
      });
      return baseRow;
    });
    try {
      await downloadStyledExcel(
        `Template_Nilai_${selectedKelas}_${selectedMapel}.xlsx`,
        [
          {
            name: "Format Nilai",
            title: "Template Input Nilai Siswa",
            theme: "navy",
            metadata: [
              { label: "Kelas", value: selectedKelas },
              { label: "Mata Pelajaran", value: selectedMapel },
              {
                label: "Kriteria",
                value: activeCriteriaObj?.namaKriteria || "-",
              },
              { label: "Jumlah Siswa", value: `${siswaList.length} Siswa` },
            ],
            columns: [
              { key: "No", header: "No", width: 6, align: "center" },
              {
                key: "NIS",
                header: "NIS",
                minWidth: 14,
                align: "center",
                numFmt: "@",
              },
              {
                key: "NamaLengkap",
                header: "NamaLengkap",
                minWidth: 26,
                align: "left",
              },
              ...categories.map((c) => ({
                key: c,
                header: c,
                minWidth: 14,
                align: "center" as const,
                isInputColumn: true,
                validation: {
                  type: "decimal" as const,
                  min: 0,
                  max: 100,
                  promptTitle: `Input Nilai ${c}`,
                  prompt: "Masukkan angka antara 0 sampai 100.",
                  errorTitle: "Nilai Di Luar Batas",
                  error: "Nilai harus berupa angka antara 0 sampai 100.",
                },
              })),
            ],
            rows: templateData,
            footerNote:
              "Isi nilai hanya pada kolom berwarna kuning (rentang 0-100). Jangan mengubah kolom NIS dan nama header tabel agar proses impor berhasil.",
          },
        ],
        {
          title: "Panduan Pengisian Template Input Nilai",
          theme: "navy",
          steps: [
            "Buka sheet 'Format Nilai' dan isi angka nilai hanya pada kolom berwarna kuning.",
            "Pastikan nilai berada dalam rentang 0 sampai 100 (boleh menggunakan desimal, misal 85.5).",
            "Jangan mengubah urutan atau isi kolom NIS dan Nama Header pada baris 5.",
            "Simpan berkas (.xlsx), lalu unggah kembali melalui tombol 'Impor Excel' di SIMESA.",
          ],
          columnsGuide: [
            {
              kolom: "No & NIS",
              aturan: "Identitas referensi siswa dari sistem (jangan diubah).",
              contoh: "2024001",
            },
            {
              kolom: "NamaLengkap",
              aturan: "Nama lengkap siswa terdaftar (jangan diubah).",
              contoh: "Andi Prasetyo",
            },
            {
              kolom: categories.join(" / ") || "Kategori Nilai",
              aturan: "Kolom input wajib diisi angka 0 sampai 100. Kosongkan jika belum ada nilai.",
              contoh: "88",
            },
          ],
        }
      );
      toast.success("Template nilai berhasil diunduh!");
    } catch {
      toast.error("Gagal mengunduh template nilai");
    }
  };

  const handleExportExcel = async () => {
    if (siswaList.length === 0) return toast.error("Tidak ada siswa");
    const dataToExport = siswaList.map((s, idx) => {
      const row: Record<string, string | number> = {
        No: idx + 1,
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

    const summaryRow: Record<string, string | number> = {
      No: "",
      NIS: "",
      NamaLengkap: "Rata-rata Kelas",
    };
    categories.forEach((c) => {
      const vals = dataToExport
        .map((r) => Number(r[c]))
        .filter((v) => Number.isFinite(v) && String(v) !== "");
      summaryRow[c] =
        vals.length > 0
          ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
          : "-";
    });
    const avgVals = dataToExport
      .map((r) => Number(r["Rata-rata"]))
      .filter((v) => Number.isFinite(v));
    summaryRow["Rata-rata"] =
      avgVals.length > 0
        ? Number((avgVals.reduce((a, b) => a + b, 0) / avgVals.length).toFixed(1))
        : "-";

    try {
      await downloadStyledExcel(
        `Data_Nilai_${selectedKelas}_${selectedMapel}.xlsx`,
        [
          {
            name: "Data Nilai",
            title: "Rekap Data Penilaian Siswa",
            theme: "navy",
            metadata: [
              { label: "Kelas", value: selectedKelas },
              { label: "Mata Pelajaran", value: selectedMapel },
              {
                label: "Kriteria",
                value: activeCriteriaObj?.namaKriteria || "-",
              },
              { label: "Total Siswa", value: `${siswaList.length} Siswa` },
            ],
            columns: [
              { key: "No", header: "No", width: 6, align: "center" },
              {
                key: "NIS",
                header: "NIS",
                minWidth: 14,
                align: "center",
                numFmt: "@",
              },
              {
                key: "NamaLengkap",
                header: "Nama Lengkap",
                minWidth: 26,
                align: "left",
              },
              ...categories.map((c) => ({
                key: c,
                header: c,
                minWidth: 13,
                align: "center" as const,
                semanticStyle: scoreCellStyle,
              })),
              {
                key: "Rata-rata",
                header: "Rata-rata",
                minWidth: 13,
                align: "center",
                semanticStyle: scoreCellStyle,
              },
            ],
            rows: dataToExport,
            summaryRow,
          },
        ]
      );
      toast.success("Data nilai berhasil diekspor!");
    } catch {
      toast.error("Gagal mengekspor data nilai");
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const rows = parseExcelSheetSmart(data, {
        expectedHeaders: ["NIS", "NamaLengkap", ...categories],
      });

      if (rows.length === 0) {
        toast.error("File excel kosong");
        return;
      }

      let matchCount = 0;
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

      setDetails((prev) => {
        const next = { ...prev };
        rows.forEach((row) => {
          const rowNis = String(row.NIS || row.nis || "").trim();

          if (rowNis) {
            const matchedStudent = siswaList.find((s) => s.nis === rowNis);
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
                  next[matchedStudent.studentId][cat] = Math.min(
                    100,
                    Math.max(0, parsed)
                  );
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
        toast.warning("Tidak ada NIS yang cocok dengan daftar di kelas ini.");
      }
    } catch {
      toast.error("Gagal membaca file excel");
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  return (
    <ModulePageShell
      title="Input Nilai Multi-Kategori"
      eyebrow="Akademik | Portal Admin"
      description="Kelola komponen penilaian seperti Tugas, UTS, UAS, dan Praktek untuk perhitungan kriteria SPK SAW."
      icon={PenLine}
      theme="navy"
      stats={
        showGrid
          ? [
              {
                label: "Total Siswa",
                value: siswaList.length,
                sublabel: `Kelas ${selectedKelas}`,
              },
              {
                label: "Kategori Penilaian",
                value: categories.length,
                sublabel: isAkademik ? "Kolom nilai aktif" : "Aspek non-akademik",
                tone: "blue",
              },
              {
                label: "Mata Pelajaran",
                value: selectedMapel === "Umum" ? "Umum" : selectedMapel,
                sublabel: "Target penilaian",
              },
              {
                label: "Bobot Kriteria",
                value: activeCriteriaObj
                  ? `${formatBobotPct(activeCriteriaObj.bobot)}%`
                  : "-",
                sublabel: activeCriteriaObj?.namaKriteria || "SPK SAW",
                tone: "emerald",
              },
            ]
          : [
              {
                label: "Kelas Tersedia",
                value: classes.length,
                sublabel: "Target penilaian",
              },
              {
                label: "Kriteria SPK",
                value: criteria.length,
                sublabel: "Parameter evaluasi",
                tone: "blue",
              },
            ]
      }
      actions={
        showGrid ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleDownloadTemplate}
            >
              <Download className="h-3.5 w-3.5" /> Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleExportExcel}
            >
              <Save className="h-3.5 w-3.5" /> Ekspor Excel
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
                <Upload className="h-3.5 w-3.5" />
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
        ) : undefined
      }
      sheetClassName="p-5 sm:p-6 space-y-6"
      afterSheet={
        <ConfirmDialog
          open={confirmChangeSessionOpen}
          onOpenChange={setConfirmChangeSessionOpen}
          title="Ganti Sesi Penilaian?"
          description="Perubahan penilaian pada sesi ini belum disimpan. Tetap ganti sesi dan abaikan perubahan?"
          confirmLabel="Ya, Ganti Sesi"
          variant="default"
          onConfirm={() => {
            setConfirmChangeSessionOpen(false);
            setShowGrid(false);
          }}
        />
      }
    >

      <SessionSetup
        active={showGrid}
        icon={PenLine}
        eyebrow="Langkah 1 dari 2"
        title="Mulai Sesi Penilaian Siswa"
        description="Pilih target kelas, mata pelajaran, dan kriteria evaluasi SPK SAW untuk membuka lembar pengisian nilai."
        submitLabel="Buka Lembar Penilaian"
        onSubmit={handleLoad}
        loading={loading}
        disabled={!selectedKelas || !selectedCriteria}
        onChangeSession={handleChangeSession}
        chips={[
          { label: "Kelas", value: selectedKelas },
          {
            label: "Mapel",
            value:
              selectedMapel === "Umum" ? "Umum / Semua Mapel" : selectedMapel,
          },
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
            <Select
              value={selectedKelas}
              onValueChange={(val: string | null) =>
                val && setSelectedKelas(val)
              }
            >
              <SelectTrigger className="h-9 w-full text-xs">
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

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Mata Pelajaran
            </Label>
            <SearchableSelect
              value={selectedMapel}
              onValueChange={(val) => setSelectedMapel(val || "Umum")}
              options={mapelOptions}
              placeholder="Pilih atau cari mata pelajaran..."
              searchPlaceholder="Ketik nama mapel (mis. Matematika, Fisika)..."
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
          <p className="text-[11px] text-slate-400">
            Pilih <span className="font-medium text-slate-500">Umum</span> pada
            mata pelajaran apabila mengisi kriteria non-akademik.
          </p>
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
                            className="group/row transition-all duration-200 hover:bg-slate-50/90 cursor-pointer"
                          >
                            <td className="px-4 py-2.5 text-slate-500 font-mono sticky left-0 bg-white transition-colors">
                              {i + 1}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-600 sticky left-12 bg-white transition-colors">
                              {siswa.nis}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-slate-800 transition-colors">
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
                                          currentStud[cat] = isNaN(num)
                                            ? 0
                                            : Math.min(100, Math.max(0, num));
                                        }
                                        return {
                                          ...p,
                                          [siswa.studentId]: currentStud,
                                        };
                                      });
                                    }}
                                    className="w-20 h-8 text-center font-mono text-xs font-semibold transition-colors"
                                  />
                                </div>
                              </td>
                            ))}
                            {isAkademik && (
                              <td className="px-4 py-2.5 text-center font-mono font-bold bg-blue-50/40 text-blue-700 transition-colors">
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
    </ModulePageShell>
  );
}
