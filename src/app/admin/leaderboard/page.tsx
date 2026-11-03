"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Trophy,
  Download,
  Upload,
  FileSpreadsheet,
  Loader2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Lock,
  Unlock,
  ShieldAlert,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface SpkResult {
  studentId: string;
  nis: string;
  namaLengkap: string;
  kelas: string;
  rawScore: number;
  persentase: number;
  rank: number;
  detailRaw: Record<string, number>;
}

interface ClassRow {
  id: string;
  namaKelas: string;
}

interface MissingCriterion {
  studentId: string;
  studentName: string;
  kelas: string;
  criteriaId: string;
  criteriaName: string;
  reason: string;
}

const initialArchives: {
  id: string;
  fileUrl: string;
  namaFile: string;
  periode: string;
  uploadedAt: string;
}[] = [];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-100 text-amber-800 font-bold text-xs">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-200 text-slate-800 font-bold text-xs">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-50 text-amber-700 font-bold text-xs">
        3
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-600 font-medium text-xs">
      {rank}
    </span>
  );
}

function getPredikatBadge(rawScore: number) {
  if (rawScore >= 0.9) {
    return {
      label: "Sangat Baik",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (rawScore >= 0.8) {
    return {
      label: "Baik",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }
  return {
    label: "Cukup",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };
}

export default function AdminLeaderboardPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [activeTab, setActiveTab] = useState("umum");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SpkResult[]>([]);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    missing: MissingCriterion[];
  } | null>(null);
  const [publishStatus, setPublishStatus] = useState<{
    periode: string;
    isPublished: boolean;
    publishedAt: string | null;
    publishedBy: string | null;
  } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [showMissingDialog, setShowMissingDialog] = useState(false);

  const [archives, setArchives] = useState(initialArchives);
  const archiveRef = useRef<HTMLInputElement>(null);

  const fetchPublishStatus = async () => {
    try {
      const r = await fetch("/api/spk/publish");
      const res = await r.json();
      setPublishStatus(res);
    } catch (e) {
      console.error("Gagal mengambil status publikasi", e);
    }
  };

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => setClasses(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetchPublishStatus();
  }, []);

  useEffect(() => {
    setLoading(true);
    const targetKelas =
      activeTab === "umum" ||
      activeTab === "kelas" ||
      activeTab === "angkatan"
        ? "umum"
        : activeTab;
    fetch(`/api/spk/calculate?kelas=${encodeURIComponent(targetKelas)}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res.results || []);
        setValidation(res.validation || null);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Gagal memuat SPK");
        setLoading(false);
      });
  }, [activeTab]);

  const handlePublish = async () => {
    if (!publishStatus) return;
    setPublishing(true);
    try {
      const r = await fetch("/api/spk/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periode: publishStatus.periode,
        }),
      });
      const res = await r.json();
      if (!r.ok) {
        if (res.missing) {
          setValidation({ isValid: false, missing: res.missing });
        }
        toast.error(res.error || "Gagal mempublikasikan leaderboard");
      } else {
        toast.success(res.message || "Leaderboard berhasil dipublikasikan!");
        fetchPublishStatus();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat mempublikasikan.");
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!publishStatus) return;
    setPublishing(true);
    try {
      const r = await fetch(
        `/api/spk/publish?periode=${encodeURIComponent(publishStatus.periode)}`,
        {
          method: "DELETE",
        }
      );
      const res = await r.json();
      if (!r.ok) {
        toast.error(res.error || "Gagal membatalkan publikasi");
      } else {
        toast.success(res.message || "Publikasi berhasil dibatalkan!");
        fetchPublishStatus();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat membatalkan publikasi.");
    } finally {
      setPublishing(false);
    }
  };

  const handleExport = () => {
    if (data.length === 0) return;
    const templateData = data.map((d) => ({
      Rank: d.rank,
      NIS: d.nis,
      NamaSiswa: d.namaLengkap,
      Kelas: d.kelas,
      SkorSPK_Persen: d.persentase,
      RawScore: d.rawScore,
    }));
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leaderboard " + activeTab);
    XLSX.writeFile(wb, `Leaderboard_${activeTab}_SPK.xlsx`);
  };

  const handleExportPDF = () => {
    window.print();
  };

  // Ekspor daftar penilaian kosong ke Excel (.xlsx) dengan kop formal
  const handleExportMissingExcel = () => {
    if (!validation?.missing || validation.missing.length === 0) {
      toast.error("Tidak ada data penilaian kosong untuk diunduh.");
      return;
    }

    const periode = publishStatus?.periode || "Semester Aktif";
    const exportTime = new Date().toLocaleString("id-ID", {
      dateStyle: "full",
      timeStyle: "short",
    });

    // Susun data tabel dengan kop formal
    const sheetData: (string | number)[][] = [
      ["DAFTAR PENILAIAN BELUM LENGKAP (SPK SAW)"],
      ["SMK PENERBANGAN DIRGANTARA — SIMESA"],
      [`Periode / Semester: ${periode}`],
      [`Waktu Ekspor: ${exportTime} WIB`],
      [
        "Catatan: Mohon Bapak/Ibu Guru pengajar atau Wali Kelas melengkapi item penilaian berikut sebelum perilisan leaderboard resmi.",
      ],
      [], // Baris kosong pemisah
      [
        "No",
        "Siswa / Cakupan",
        "Kelas",
        "Kriteria / Mata Pelajaran",
        "Status / Penyebab",
      ],
    ];

    validation.missing.forEach((item, index) => {
      sheetData.push([
        index + 1,
        item.studentName,
        item.kelas,
        item.criteriaName,
        item.reason,
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Set lebar kolom yang proporsional
    worksheet["!cols"] = [
      { wch: 6 },  // No
      { wch: 28 }, // Siswa
      { wch: 14 }, // Kelas
      { wch: 38 }, // Kriteria / Mata Pelajaran
      { wch: 35 }, // Status / Penyebab
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Penilaian Kosong");

    const safePeriode = periode.replace(/[/\\?%*:|"<> ]/g, "_");
    const fileName = `Daftar_Penilaian_Kosong_SMK_Dirgantara_${safePeriode}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    toast.success("Berhasil mengunduh daftar penilaian kosong (.xlsx)!");
  };

  const handleUploadArsip = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.success(`Arsip ${file.name} berhasil diunggah!`);
    const fileUrl = URL.createObjectURL(file);
    setArchives([
      ...archives,
      {
        id: String(Date.now()),
        fileUrl,
        namaFile: file.name,
        periode: "Baru Diunggah",
        uploadedAt: new Date().toLocaleDateString("id-ID"),
      },
    ]);
    if (archiveRef.current) archiveRef.current.value = "";
  };

  const handleDeleteArsip = (id: string, namaFile: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus arsip " + namaFile + "?")) {
      setArchives(archives.filter((arc) => arc.id !== id));
      toast.success("Arsip berhasil dihapus.");
    }
  };

  const handleDownloadArsip = (arc: { fileUrl: string; namaFile: string }) => {
    if (!arc.fileUrl) {
      toast.info(
        `File mock ${arc.namaFile} tidak memiliki isi (hanya sampel UI).`
      );
      return;
    }
    const a = document.createElement("a");
    a.href = arc.fileUrl;
    a.download = arc.namaFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Berhasil mengunduh ${arc.namaFile}`);
  };

  const hasMissing = validation ? !validation.isValid : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Peringkat Leaderboard & Arsip SPK"
        badge="SPK SAW"
        description="Pemeringkatan siswa berprestasi berbasis Simple Additive Weighting (SAW) dan manajemen publikasi semester"
        icon={Trophy}
      >
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 hide-on-print"
          onClick={handleExport}
          disabled={data.length === 0}
        >
          <Download className="h-3.5 w-3.5 text-slate-500" /> Ekspor Excel
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 hide-on-print"
          onClick={handleExportPDF}
          disabled={data.length === 0}
        >
          <Printer className="h-3.5 w-3.5 text-slate-500" /> Cetak / PDF
        </Button>
      </PageHeader>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .hide-on-print { display: none !important; }
        }
      `,
        }}
      />

      {/* Publication Status & Control Banner */}
      {publishStatus && (
        <div className="py-4 border-b border-slate-200 hide-on-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  Periode: {publishStatus.periode}
                </span>
                {publishStatus.isPublished ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Globe className="h-3 w-3" /> Terpublikasi Resmi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <Lock className="h-3 w-3" /> Mode Draf (Internal Admin)
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Kontrol Publikasi & Validasi Kelayakan SPK SAW
              </h3>
              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                {publishStatus.isPublished
                  ? "Peringkat resmi telah dipublikasikan. Seluruh akun Guru dan Siswa dapat meninjau hasil leaderboard periode ini."
                  : "Leaderboard masih terkunci dari portal Guru dan Siswa. Pastikan seluruh penilaian kriteria lengkap 100% sebelum merilis peringkat resmi."}
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {publishStatus.isPublished ? (
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="outline"
                        className="border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        <Lock className="mr-2 h-3.5 w-3.5" /> Batalkan Publikasi
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
                        <ShieldAlert className="h-5 w-5 text-rose-600" />
                        Batalkan Publikasi Leaderboard?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-500 leading-relaxed text-xs">
                        Tindakan ini akan menarik kembali peringkat resmi untuk
                        periode{" "}
                        <strong className="text-slate-800">
                          {publishStatus.periode}
                        </strong>
                        . Siswa dan guru tidak akan dapat melihat leaderboard
                        hingga dirilis kembali.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleUnpublish}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
                        disabled={publishing}
                      >
                        {publishing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                        ) : null}
                        Ya, Tarik Publikasi
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        className="font-semibold"
                        disabled={hasMissing}
                      >
                        <Unlock className="mr-2 h-3.5 w-3.5" /> Publikasikan
                        Leaderboard
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
                        <Trophy className="h-5 w-5 text-blue-600" />
                        Publikasikan Peringkat Semester Resmi?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-500 leading-relaxed text-xs">
                        Tindakan ini akan mengunci kalkulasi SPK SAW saat ini
                        dan menyimpannya sebagai hasil resmi untuk periode{" "}
                        <strong className="text-slate-800">
                          {publishStatus.periode}
                        </strong>
                        .
                        <span className="block mt-2 font-medium text-emerald-600">
                          Seluruh data kriteria telah tervalidasi 100% lengkap
                          untuk setiap siswa.
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handlePublish}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        disabled={publishing}
                      >
                        {publishing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                        ) : null}
                        Konfirmasi & Rilis
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Validation Notice Panel inside Status card */}
          {hasMissing && !publishStatus.isPublished && (
            <div className="mt-5 p-4 rounded-lg bg-amber-950/40 border border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex gap-3 items-start">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-200">
                    Validasi Kriteria Belum Lengkap ({validation?.missing.length}{" "}
                    Item Kosong)
                  </h4>
                  <p className="text-xs text-amber-300/80 leading-relaxed mt-0.5">
                    Beberapa nilai kriteria manual belum diinput oleh guru atau
                    siswa belum tercatat pada presensi periode aktif.
                  </p>
                </div>
              </div>

              <AlertDialog
                open={showMissingDialog}
                onOpenChange={setShowMissingDialog}
              >
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-amber-950/60 border-amber-700 text-amber-200 hover:bg-amber-900/70 hover:text-white whitespace-nowrap shrink-0"
                    >
                      Lihat Rincian Kosong
                    </Button>
                  }
                />
                <AlertDialogContent className="max-w-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Daftar Penilaian Kosong (SPK SAW)
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-500 text-xs">
                      Item penilaian berikut belum dilengkapi untuk semester
                      aktif ({publishStatus.periode}). Lengkapi seluruh item
                      sebelum merilis leaderboard resmi.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="my-3 border border-slate-200 rounded-lg max-h-[300px] overflow-y-auto bg-white">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-slate-50">
                        <TableRow>
                          <TableHead className="py-2.5 pl-4">Siswa</TableHead>
                          <TableHead className="py-2.5">Kelas</TableHead>
                          <TableHead className="py-2.5">Kriteria</TableHead>
                          <TableHead className="py-2.5 pr-4">
                            Status / Penyebab
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validation?.missing.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-semibold py-2 pl-4 text-slate-800">
                              {item.studentName}
                            </TableCell>
                            <TableCell className="py-2">
                              <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {item.kelas}
                              </span>
                            </TableCell>
                            <TableCell className="py-2 font-medium text-slate-700">
                              {item.criteriaName}
                            </TableCell>
                            <TableCell className="py-2 pr-4 text-amber-700 font-mono text-xs">
                              {item.reason}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                    <div className="text-xs text-slate-500 text-left">
                      Total:{" "}
                      <span className="font-semibold text-slate-800 font-mono">
                        {validation?.missing?.length || 0}
                      </span>{" "}
                      item belum lengkap
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-medium"
                        onClick={handleExportMissingExcel}
                        disabled={!validation?.missing || validation.missing.length === 0}
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        Unduh Excel (.xlsx)
                      </Button>
                      <AlertDialogAction
                        onClick={() => setShowMissingDialog(false)}
                        className="text-xs"
                      >
                        Tutup Rincian
                      </AlertDialogAction>
                    </div>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {!hasMissing && !publishStatus.isPublished && (
            <div className="mt-5 p-4 rounded-lg bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-emerald-200">
                  Validasi Penilaian Lengkap (100%)
                </h4>
                <p className="text-xs text-emerald-300/80 leading-relaxed">
                  Seluruh kriteria manual dan otomatis telah terisi untuk setiap
                  siswa. Hasil perhitungan SPK SAW siap dipublikasikan.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main calculation preview container */}
      <div className="print-area rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Tabel Peringkat Siswa Berprestasi
                </CardTitle>
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded border border-blue-200">
                  Metode SAW
                </span>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                {publishStatus
                  ? `Kalkulasi normalisasi matriks real-time periode ${publishStatus.periode}`
                  : "Memuat periode aktif..."}
              </CardDescription>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="hide-on-print"
            >
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="umum">Umum (Semua)</TabsTrigger>
                {classes.map((c) => (
                  <TabsTrigger key={c.id} value={c.namaKelas}>
                    {c.namaKelas}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex py-16 justify-center">
              <Loader2 className="animate-spin h-7 w-7 text-blue-600" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 bg-slate-50/60 hover:bg-slate-50/60">
                  <TableHead className="w-20 pl-6 font-semibold text-slate-600">Peringkat</TableHead>
                  <TableHead className="font-semibold text-slate-600">Siswa</TableHead>
                  <TableHead className="font-semibold text-slate-600">Kelas</TableHead>
                  <TableHead className="font-semibold text-slate-600">Nilai SAW (V)</TableHead>
                  <TableHead className="text-center font-semibold text-slate-600">Persentase</TableHead>
                  <TableHead className="text-right pr-6 font-semibold text-slate-600">
                    Predikat
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length > 0 ? (
                  data.map((entry) => {
                    const predikat = getPredikatBadge(entry.rawScore);
                    const pct = Math.min(
                      100,
                      Math.max(0, Math.round(entry.rawScore * 100))
                    );
                    return (
                      <TableRow
                        key={entry.studentId}
                        className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 last:border-0"
                      >
                        <TableCell className="pl-6">
                          <RankBadge rank={entry.rank} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover/row:text-white text-sm transition-colors">
                              {entry.namaLengkap}
                            </p>
                            <p className="text-xs text-slate-500 group-hover/row:text-slate-400 tabular-nums transition-colors">
                              NIS: {entry.nis}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 group-hover/row:bg-slate-800 text-slate-700 group-hover/row:text-slate-200 border border-slate-200 group-hover/row:border-slate-700 transition-colors">
                            {entry.kelas}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 group-hover/row:text-white tabular-nums transition-colors">
                              {entry.rawScore.toFixed(4)}
                            </span>
                            <div className="w-16 bg-slate-100 group-hover/row:bg-slate-800 h-1.5 rounded-xs overflow-hidden hidden sm:block transition-colors">
                              <div
                                className="bg-[#1e3a8a] group-hover/row:bg-blue-400 h-full rounded-xs transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-semibold text-blue-700 group-hover/row:text-blue-300 tabular-nums transition-colors">
                          {entry.persentase}%
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border transition-colors ${predikat.className}`}
                          >
                            {predikat.label}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-10 text-slate-500 group-hover:text-slate-400"
                    >
                      Belum ada data perhitungan SPK untuk filter ini.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Archives */}
      <div className="hide-on-print pt-2 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900">
              Arsip Dokumen Historis (Tahun Ajaran)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Simpan dan unduh salinan berkas rekapitulasi semester sebelumnya
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => archiveRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5 text-slate-500" /> Unggah Arsip
          </Button>
          <input
            ref={archiveRef}
            type="file"
            accept=".xlsx,.pdf,.csv"
            className="hidden"
            onChange={handleUploadArsip}
          />
        </div>
        <div className="pt-2">
          <div className="space-y-3">
            {archives.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 bg-slate-50/50 border-y border-slate-200">
                Belum ada dokumen arsip dari semester sebelumnya yang diunggah.
              </div>
            ) : (
              archives.map((arc) => (
                <div
                  key={arc.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 py-3.5 transition-colors hover:bg-slate-50/70"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200 shrink-0">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {arc.namaFile}
                      </p>
                      <p className="text-xs text-slate-500">
                        Periode: {arc.periode} · Diunggah: {arc.uploadedAt}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="xs"
                      className="gap-1"
                      onClick={() => handleDeleteArsip(arc.id, arc.namaFile)}
                    >
                      <Trash2 className="h-3 w-3" /> Hapus
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      className="gap-1"
                      onClick={() => handleDownloadArsip(arc)}
                    >
                      <Download className="h-3 w-3" /> Unduh
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
