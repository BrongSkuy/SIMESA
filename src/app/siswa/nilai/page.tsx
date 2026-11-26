"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  downloadStyledExcel,
  scoreCellStyle,
  statusBadgeCellStyle,
} from "@/lib/excel-styled";
import {
  Loader2,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Download,
  UserCheck,
  GraduationCap,
  Clock,
  Search,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  BookMarked,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { getStudentEraporGateInfo, type EraporStatus } from "@/lib/erapor-utils";
import { ModulePageShell } from "@/components/shared/module-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardDescription, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CriteriaScore {
  id: string;
  namaKriteria: string;
  bobot: number;
  tipe: string;
  deskripsi: string | null;
  nilaiRataRata: number;
  nilaiNormalisasi?: number;
  detailMapel: Record<string, number>;
  detailKategoriMapel?: Record<string, Record<string, number>>;
  nilaiTerbobot: number;
}

interface KehadiranData {
  hadir: number;
  izin: number;
  sakit: number;
  alfa: number;
  total: number;
  persentase: number;
}

interface SubjectTranscriptItem {
  namaMapel: string;
  labelMapel: string;
  guruPengampu: string;
  isHomeroom: boolean;
  kehadiran: {
    hadir: number;
    izin: number;
    sakit: number;
    alfa: number;
    total: number;
    persentase: number | null;
  };
  akademik: {
    criteriaId: string;
    namaKriteria: string;
    nilaiAkhir: number | null;
    komponen: Record<string, number>;
    kategoriWajib: string[];
  } | null;
  kriteriaLain: Array<{
    criteriaId: string;
    namaKriteria: string;
    bobot: number;
    nilai: number | null;
  }>;
  rataRataMapel: number | null;
  statusPenilaian: "Lengkap" | "Sebagian" | "Belum Dinilai";
}

interface ScoreData {
  student: {
    id: string;
    nis: string;
    namaLengkap: string;
    kelas: string;
  };
  periode: string | null;
  criteria: CriteriaScore[];
  subjectsTranscript?: SubjectTranscriptItem[];
  kehadiran: KehadiranData | null;
  totalSkorSPK: number;
  rankUmum?: number | null;
  erapor?: {
    statusRapor: EraporStatus;
    canPrint: boolean;
    updatedAt: string | null;
  };
}

const CARDS_PER_PAGE = 6;

export default function SiswaNilaiPage() {
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"mapel" | "kriteria">("mapel");
  const [searchMapel, setSearchMapel] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [cardPage, setCardPage] = useState(1);
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState<number>(6);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/students/me/scores")
      .then(async (res) => {
        const result = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !result || result.error) {
          setError(result?.error || "Gagal memuat data nilai");
        } else {
          setData(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Gagal memuat data nilai");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const subjectsList = useMemo(
    () => data?.subjectsTranscript || [],
    [data?.subjectsTranscript]
  );

  const filteredSubjects = useMemo(() => {
    const q = searchMapel.trim().toLowerCase();
    return subjectsList.filter((s) => {
      const matchQuery =
        !q ||
        s.labelMapel.toLowerCase().includes(q) ||
        s.guruPengampu.toLowerCase().includes(q);
      const matchStatus =
        filterStatus === "all" || s.statusPenilaian === filterStatus;
      return matchQuery && matchStatus;
    });
  }, [subjectsList, searchMapel, filterStatus]);

  const totalCardPages = Math.max(
    1,
    Math.ceil(filteredSubjects.length / CARDS_PER_PAGE)
  );
  const safeCardPage = Math.min(cardPage, totalCardPages);
  const paginatedCardSubjects = useMemo(
    () =>
      filteredSubjects.slice(
        (safeCardPage - 1) * CARDS_PER_PAGE,
        safeCardPage * CARDS_PER_PAGE
      ),
    [filteredSubjects, safeCardPage]
  );

  const totalTablePages = Math.max(
    1,
    Math.ceil(filteredSubjects.length / tablePageSize)
  );
  const safeTablePage = Math.min(tablePage, totalTablePages);
  const paginatedTableSubjects = useMemo(
    () =>
      filteredSubjects.slice(
        (safeTablePage - 1) * tablePageSize,
        safeTablePage * tablePageSize
      ),
    [filteredSubjects, safeTablePage, tablePageSize]
  );

  const completenessStats = useMemo(() => {
    const total = subjectsList.length;
    const lengkap = subjectsList.filter(
      (s) => s.statusPenilaian === "Lengkap"
    ).length;
    const sebagian = subjectsList.filter(
      (s) => s.statusPenilaian === "Sebagian"
    ).length;
    return { total, lengkap, sebagian };
  }, [subjectsList]);

  if (loading) {
    return (
      <ModulePageShell
        theme="navy"
        eyebrow="Transkrip Akademik | Portal Siswa"
        title="Transkrip Nilai Saya"
        description="Rincian nilai mata pelajaran, komponen Tugas, UTS, UAS, dan skor prestasi semester."
        stats={[
          { label: "Skor Prestasi", value: "...", sublabel: "dari 100", tone: "amber" },
          { label: "Mapel Lengkap", value: "..." },
          { label: "Kehadiran", value: "...", tone: "emerald" },
          { label: "Periode Aktif", value: "..." },
        ]}
        sheetClassName="p-8"
      >
        <div className="flex flex-col items-center justify-center py-20 gap-2.5 text-slate-500">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          <p className="text-xs font-medium">Memuat transkrip nilai Anda...</p>
        </div>
      </ModulePageShell>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-2 text-slate-500 bg-white border border-slate-200 rounded-2xl">
        <AlertCircle className="h-8 w-8 text-rose-500" />
        <p className="text-sm font-semibold text-slate-800">
          Gagal Memuat Transkrip Nilai
        </p>
        <p className="text-xs">{error || "Data penilaian belum tersedia"}</p>
      </div>
    );
  }

  const getScoreTone = (score: number | null | undefined) => {
    if (score === null || score === undefined) {
      return {
        text: "text-slate-400",
        pill: "bg-slate-100 text-slate-500 border-slate-200",
        label: "Belum Dinilai",
      };
    }
    if (score >= 85)
      return {
        text: "text-emerald-700",
        pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "Sangat Baik",
      };
    if (score >= 70)
      return {
        text: "text-blue-700",
        pill: "bg-blue-50 text-blue-700 border-blue-200",
        label: "Baik",
      };
    if (score >= 50)
      return {
        text: "text-amber-700",
        pill: "bg-amber-50 text-amber-700 border-amber-200",
        label: "Cukup",
      };
    return {
      text: "text-rose-700",
      pill: "bg-rose-50 text-rose-700 border-rose-200",
      label: "Perlu Perbaikan",
    };
  };

  const getStatusBadge = (
    status: "Lengkap" | "Sebagian" | "Belum Dinilai"
  ) => {
    if (status === "Lengkap") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (status === "Sebagian") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-slate-100 text-slate-600 border-slate-200 ";
  };

  const handleExportTranscript = async () => {
    try {
      const extraCriteriaNames = Array.from(
        new Set(
          subjectsList.flatMap((s) => s.kriteriaLain.map((kl) => kl.namaKriteria))
        )
      );

      const mapelRows = subjectsList.map((s, idx) => {
        const kompStr = s.akademik
          ? s.akademik.kategoriWajib
              .map((cat) => `${cat}: ${s.akademik?.komponen[cat] ?? "-"}`)
              .join(", ")
          : "Evaluasi Wali Kelas";

        const rowObj: Record<string, string | number> = {
          No: idx + 1,
          MataPelajaran: s.labelMapel,
          GuruPengampu: s.guruPengampu,
          Komponen: kompStr,
          NilaiAkademik:
            s.akademik?.nilaiAkhir !== null &&
            s.akademik?.nilaiAkhir !== undefined
              ? s.akademik.nilaiAkhir
              : "-",
        };

        extraCriteriaNames.forEach((critName) => {
          const kl = s.kriteriaLain.find((x) => x.namaKriteria === critName);
          rowObj[critName] = kl && kl.nilai !== null ? kl.nilai : "-";
        });

        rowObj["Kehadiran"] =
          s.kehadiran.persentase !== null ? `${s.kehadiran.persentase}%` : "-";
        rowObj["RataRata"] =
          s.rataRataMapel !== null ? s.rataRataMapel : "-";
        rowObj["Status"] = s.statusPenilaian;
        return rowObj;
      });

      const sawRows = data.criteria.map((c, idx) => ({
        No: idx + 1,
        Aspek: c.namaKriteria,
        Tipe: c.tipe,
        Bobot: `${c.bobot}%`,
        RataRata: c.nilaiRataRata,
        Indeks: Number(
          (c.nilaiNormalisasi ?? c.nilaiRataRata / 100).toFixed(4)
        ),
        Kontribusi: c.nilaiTerbobot,
      }));

      await downloadStyledExcel(
        `Transkrip_Nilai_${data.student.nis}_${data.student.namaLengkap.replace(/\s+/g, "_")}.xlsx`,
        [
          {
            name: "Transkrip Per Mapel",
            title: "Transkrip Nilai Per Mata Pelajaran",
            theme: "emerald",
            landscape: true,
            metadata: [
              { label: "Nama Siswa", value: data.student.namaLengkap },
              { label: "NIS", value: data.student.nis },
              { label: "Kelas", value: data.student.kelas },
              { label: "Periode", value: data.periode || "Semester Aktif" },
            ],
            columns: [
              { key: "No", header: "No", width: 6, align: "center" },
              {
                key: "MataPelajaran",
                header: "Mata Pelajaran",
                minWidth: 24,
                align: "left",
              },
              {
                key: "GuruPengampu",
                header: "Guru Pengampu",
                minWidth: 22,
                align: "left",
              },
              {
                key: "Komponen",
                header: "Rincian Komponen Akademik",
                minWidth: 28,
                maxWidth: 42,
                align: "left",
                wrapText: true,
              },
              {
                key: "NilaiAkademik",
                header: "Nilai Akhir Akademik",
                width: 16,
                align: "center",
                semanticStyle: scoreCellStyle,
              },
              ...extraCriteriaNames.map((name) => ({
                key: name,
                header: name,
                minWidth: 14,
                align: "center" as const,
                semanticStyle: scoreCellStyle,
              })),
              {
                key: "Kehadiran",
                header: "Kehadiran (%)",
                width: 14,
                align: "center",
                semanticStyle: scoreCellStyle,
              },
              {
                key: "RataRata",
                header: "Rata-Rata Mapel",
                width: 15,
                align: "center",
                semanticStyle: scoreCellStyle,
              },
              {
                key: "Status",
                header: "Status Penilaian",
                width: 16,
                align: "center",
                semanticStyle: statusBadgeCellStyle,
              },
            ],
            rows: mapelRows,
          },
          {
            name: "Rincian Skor Prestasi",
            title: "Rincian Akumulasi Skor Prestasi (SPK SAW)",
            theme: "emerald",
            metadata: [
              { label: "Nama Siswa", value: data.student.namaLengkap },
              { label: "NIS", value: data.student.nis },
              { label: "Total Skor Prestasi", value: `${data.totalSkorSPK} / 100` },
            ],
            columns: [
              { key: "No", header: "No", width: 6, align: "center" },
              {
                key: "Aspek",
                header: "Aspek Penilaian",
                minWidth: 26,
                align: "left",
              },
              { key: "Tipe", header: "Tipe Input", width: 14, align: "center" },
              { key: "Bobot", header: "Bobot (%)", width: 12, align: "center" },
              {
                key: "RataRata",
                header: "Nilai Rata-Rata",
                width: 16,
                align: "center",
                semanticStyle: scoreCellStyle,
              },
              {
                key: "Indeks",
                header: "Indeks Capaian",
                width: 16,
                align: "center",
                numFmt: "0.0000",
              },
              {
                key: "Kontribusi",
                header: "Kontribusi Nilai",
                width: 16,
                align: "center",
              },
            ],
            rows: sawRows,
            summaryRow: {
              No: "",
              Aspek: "TOTAL SKOR PRESTASI",
              Tipe: "-",
              Bobot: "100%",
              RataRata: "-",
              Indeks: 1,
              Kontribusi: data.totalSkorSPK,
            },
          },
        ]
      );
      toast.success("Transkrip nilai berhasil diunduh (.xlsx)");
    } catch {
      toast.error("Gagal mengunduh transkrip nilai");
    }
  };

  return (
    <ModulePageShell
      theme="navy"
      eyebrow={`Transkrip Akademik | Kelas ${data.student.kelas}`}
      title="Transkrip Nilai Saya"
      description="Rincian nilai mata pelajaran, komponen Tugas, UTS, UAS, dan skor prestasi semester."
      stats={[
        {
          label: "Skor Prestasi",
          value: data.totalSkorSPK,
          sublabel: "dari 100",
          tone: "amber",
        },
        {
          label: "Mapel Lengkap",
          value: `${completenessStats.lengkap}/${completenessStats.total}`,
          tone:
            completenessStats.total > 0 &&
            completenessStats.lengkap === completenessStats.total
              ? "emerald"
              : "amber",
        },
        ...(data.kehadiran
          ? [
              {
                label: "Kehadiran",
                value: `${data.kehadiran.persentase}%`,
                sublabel: `H:${data.kehadiran.hadir} I:${data.kehadiran.izin} S:${data.kehadiran.sakit} A:${data.kehadiran.alfa}`,
                tone: (data.kehadiran.persentase >= 75
                  ? "emerald"
                  : "rose") as "emerald" | "rose",
              },
            ]
          : []),
        {
          label: "Periode Aktif",
          value: data.periode || "Aktif",
          sublabel: `${data.criteria.length} Aspek`,
        },
      ]}
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportTranscript}
            className="gap-1.5 cursor-pointer text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Unduh Transkrip (.xlsx)
          </Button>
          {data.erapor?.canPrint ? (
            <Link href="/siswa/erapor">
              <Button
                variant="default"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5 text-xs shadow-xs cursor-pointer"
              >
                <BookMarked className="w-3.5 h-3.5" />
                Buka E-Rapor
              </Button>
            </Link>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const gate = getStudentEraporGateInfo(data.erapor?.statusRapor);
                toast.info(gate.message);
              }}
              className="gap-1.5 text-xs cursor-pointer"
              title={getStudentEraporGateInfo(data.erapor?.statusRapor).message}
            >
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              E-Rapor ({getStudentEraporGateInfo(data.erapor?.statusRapor).badgeLabel})
            </Button>
          )}
        </>
      }
      tabs={[
        {
          key: "mapel",
          label: "Rincian Per Mapel",
          badge: subjectsList.length,
        },
        {
          key: "kriteria",
          label: "Aspek Penilaian",
          badge: data.criteria.length,
        },
      ]}
      activeTab={activeTab}
      onTabChange={(key) => setActiveTab(key as "mapel" | "kriteria")}
      sheetClassName="p-5 sm:p-6 space-y-6"
    >
      {activeTab === "mapel" ? (
        <div className="space-y-6">
          {/* Toolbar Pencarian & Filter Status Mata Pelajaran */}
          <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-xs flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari mata pelajaran atau nama guru pengampu..."
                className="pl-8.5 h-9 text-xs border-slate-200 bg-slate-50/50 focus:bg-white"
                value={searchMapel}
                onChange={(e) => {
                  setSearchMapel(e.target.value);
                  setCardPage(1);
                  setTablePage(1);
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <span>Status:</span>
              </div>
              <Select
                value={filterStatus}
                onValueChange={(val) => {
                  setFilterStatus(val || "all");
                  setCardPage(1);
                  setTablePage(1);
                }}
              >
                <SelectTrigger className="w-[148px] h-9 text-xs border-slate-200 cursor-pointer">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status ({subjectsList.length})</SelectItem>
                  <SelectItem value="Lengkap">Lengkap ({completenessStats.lengkap})</SelectItem>
                  <SelectItem value="Sebagian">Sebagian ({completenessStats.sebagian})</SelectItem>
                  <SelectItem value="Belum Dinilai">
                    Belum Dinilai ({completenessStats.total - completenessStats.lengkap - completenessStats.sebagian})
                  </SelectItem>
                </SelectContent>
              </Select>
              {(searchMapel || filterStatus !== "all") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchMapel("");
                    setFilterStatus("all");
                    setCardPage(1);
                    setTablePage(1);
                  }}
                  className="h-9 px-2.5 text-xs text-slate-500 hover:text-slate-900 gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Grid Kartu Rincian Per Mata Pelajaran (Maks. 6 Kartu / 2 Baris per Halaman) */}
          <div className="space-y-3">
            {paginatedCardSubjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 py-10 px-4 text-center text-xs text-slate-500">
                <Clock className="h-5 w-5 mx-auto mb-1.5 text-slate-400" />
                {subjectsList.length === 0
                  ? "Belum ada daftar mata pelajaran yang terdaftar untuk kelas Anda."
                  : "Tidak ada mata pelajaran yang cocok dengan filter pencarian Anda."}
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedCardSubjects.map((subj, idx) => {
                const avgTone = getScoreTone(subj.rataRataMapel);
                const acadTone = getScoreTone(subj.akademik?.nilaiAkhir);
                const pct =
                  subj.rataRataMapel !== null
                    ? Math.min(100, Math.max(0, subj.rataRataMapel))
                    : 0;

                return (
                  <div
                    key={`${subj.namaMapel}-${idx}`}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300/90 hover:shadow-sm transition-all duration-300 group flex flex-col justify-between"
                  >
                    <div>
                      {/* Header Mapel & Guru */}
                      <div className="pb-3.5 border-b border-slate-100 transition-colors flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 transition-colors">
                            {subj.isHomeroom ? (
                              <UserCheck className="h-4 w-4 text-amber-500 shrink-0" />
                            ) : (
                              <BookOpen className="h-4 w-4 text-blue-600 shrink-0" />
                            )}
                            <span className="truncate">{subj.labelMapel}</span>
                          </CardTitle>
                          <CardDescription className="mt-1 text-xs text-slate-500 truncate transition-colors">
                            {subj.isHomeroom ? "Wali Kelas" : "Guru Mapel"}:{" "}
                            <span className="font-medium text-slate-700 transition-colors">
                              {subj.guruPengampu}
                            </span>
                          </CardDescription>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border shrink-0 transition-colors ${getStatusBadge(
                            subj.statusPenilaian
                          )}`}
                        >
                          {subj.statusPenilaian}
                        </span>
                      </div>

                      {/* Komponen Nilai Akademik (Tugas, UTS, UAS, dll.) */}
                      {!subj.isHomeroom && subj.akademik && (
                        <div className="pt-3.5 pb-3 border-b border-slate-100 transition-colors space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors">
                              {subj.akademik.namaKriteria}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-base font-bold font-mono tabular-nums transition-colors ${acadTone.text}`}
                              >
                                {subj.akademik.nilaiAkhir ?? "-"}
                              </span>
                              {subj.akademik.nilaiAkhir !== null && (
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors ${acadTone.pill}`}
                                >
                                  {acadTone.label}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Kotak Rincian Komponen (Tugas, UTS, UAS, dll.) */}
                          <div className="grid grid-cols-3 gap-2">
                            {subj.akademik.kategoriWajib.map((cat) => {
                              const val = subj.akademik?.komponen[cat];
                              const hasVal =
                                val !== undefined &&
                                val !== null &&
                                !isNaN(Number(val));
                              return (
                                <div
                                  key={cat}
                                  className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-2.5 py-2 text-center transition-colors"
                                >
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                                    {cat}
                                  </p>
                                  <p
                                    className={`text-sm font-bold font-mono tabular-nums mt-0.5 transition-colors ${
                                      hasVal
                                        ? getScoreTone(val).text
                                        : "text-slate-400 "
                                    }`}
                                  >
                                    {hasVal ? val : "-"}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Kriteria Non-Akademik & Kehadiran di Mapel Ini */}
                      <div className="pt-3 space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-colors">
                          Evaluasi Karakter & Presensi Mapel
                        </p>
                        <div className="space-y-1.5">
                          {subj.kriteriaLain.map((kl) => (
                            <div
                              key={kl.criteriaId}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-slate-600 transition-colors">
                                {kl.namaKriteria}
                              </span>
                              <span
                                className={`font-mono font-semibold tabular-nums transition-colors ${
                                  getScoreTone(kl.nilai).text
                                }`}
                              >
                                {kl.nilai !== null ? kl.nilai : "Belum diisi"}
                              </span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100/80 transition-colors">
                            <span className="text-slate-600 transition-colors">
                              Kehadiran Mapel
                            </span>
                            <span
                              className={`font-mono font-semibold tabular-nums transition-colors ${
                                getScoreTone(subj.kehadiran.persentase).text
                              }`}
                            >
                              {subj.kehadiran.total > 0
                                ? `${subj.kehadiran.persentase}% (${subj.kehadiran.hadir}/${subj.kehadiran.total} sesi)`
                                : "Belum ada sesi"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Rata-rata Mapel */}
                    <div className="mt-4 pt-3 border-t border-slate-100 transition-colors">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-500 font-medium transition-colors">
                          Rata-Rata Evaluasi Mapel
                        </span>
                        <span
                          className={`text-sm font-bold font-mono tabular-nums transition-colors ${avgTone.text}`}
                        >
                          {subj.rataRataMapel !== null ? subj.rataRataMapel : "-"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-xs overflow-hidden transition-colors">
                        <div
                          className="bg-[#1e3a8a] h-full rounded-xs transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}

            {totalCardPages > 1 && (
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-white border border-slate-200/90 font-semibold text-slate-700 shadow-2xs">
                    Kartu {(safeCardPage - 1) * CARDS_PER_PAGE + 1}–
                    {Math.min(
                      safeCardPage * CARDS_PER_PAGE,
                      filteredSubjects.length
                    )}{" "}
                    dari {filteredSubjects.length} Mapel
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setCardPage((p) => Math.max(1, p - 1))}
                    disabled={safeCardPage <= 1}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Halaman sebelumnya"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {Array.from({ length: totalCardPages }, (_, idx) => idx + 1).map(
                    (pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCardPage(pageNum)}
                        className={`h-7 min-w-7 px-2 inline-flex items-center justify-center rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                          pageNum === safeCardPage
                            ? "bg-[#091524] text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setCardPage((p) => Math.min(totalCardPages, p + 1))
                    }
                    disabled={safeCardPage >= totalCardPages}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Halaman selanjutnya"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tabel Matriks Rekapitulasi Seluruh Mata Pelajaran */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-3 overflow-hidden">
            <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  Tabel Rekapitulasi Nilai Seluruh Mata Pelajaran
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Perbandingan lengkap nilai akademik (Tugas/UTS/UAS), karakter,
                  dan kehadiran di setiap mata pelajaran kelas{" "}
                  {data.student.kelas}
                </p>
              </div>
              {subjectsList.length > 6 && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-500">Baris:</span>
                  <Select
                    value={String(tablePageSize)}
                    onValueChange={(val) => {
                      setTablePageSize(Number(val) || 6);
                      setTablePage(1);
                    }}
                  >
                    <SelectTrigger className="w-[125px] h-8 text-xs border-slate-200 cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 Mapel per Hal</SelectItem>
                      <SelectItem value="10">10 Mapel per Hal</SelectItem>
                      <SelectItem value="15">15 Mapel per Hal</SelectItem>
                      <SelectItem value="50">Semua Mapel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 bg-slate-50/60 hover:bg-slate-50/60">
                    <TableHead className="pl-5">Mata Pelajaran</TableHead>
                    <TableHead>Guru Pengampu</TableHead>
                    <TableHead>Komponen Akademik</TableHead>
                    <TableHead className="text-center">Akademik</TableHead>
                    {(subjectsList[0]?.kriteriaLain || []).map((kl) => (
                      <TableHead key={kl.criteriaId} className="text-center">
                        {kl.namaKriteria}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">% Hadir</TableHead>
                    <TableHead className="text-right pr-5">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTableSubjects.map((subj, idx) => {
                    const kompItems = subj.akademik
                      ? subj.akademik.kategoriWajib.map((cat) => ({
                          cat,
                          val: subj.akademik?.komponen[cat],
                        }))
                      : [];
                    return (
                      <TableRow
                        key={`${subj.namaMapel}-${idx}`}
                        className="group/row transition-colors duration-200 hover:bg-slate-50/90 border-b border-slate-100 last:border-0"
                      >
                        <TableCell className="pl-5 font-semibold text-slate-800 transition-colors">
                          {subj.labelMapel}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 transition-colors">
                          {subj.guruPengampu}
                        </TableCell>
                        <TableCell>
                          {subj.isHomeroom ? (
                            <span className="text-xs text-slate-400 italic">
                              Non-Akademik (Wali Kelas)
                            </span>
                          ) : kompItems.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {kompItems.map(({ cat, val }) => (
                                <span
                                  key={cat}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-100 border border-slate-200 transition-colors"
                                >
                                  <span className="text-slate-500 font-sans">
                                    {cat}:
                                  </span>
                                  <span
                                    className={`font-bold ${
                                      val !== undefined && val !== null
                                        ? getScoreTone(val).text
                                        : "text-slate-400 "
                                    }`}
                                  >
                                    {val !== undefined && val !== null
                                      ? val
                                      : "-"}
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 ">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-center font-mono font-bold transition-colors ${
                            getScoreTone(subj.akademik?.nilaiAkhir).text
                          }`}
                        >
                          {subj.isHomeroom
                            ? "-"
                            : (subj.akademik?.nilaiAkhir ?? "-")}
                        </TableCell>
                        {subj.kriteriaLain.map((kl) => (
                          <TableCell
                            key={kl.criteriaId}
                            className={`text-center font-mono font-semibold transition-colors ${
                              getScoreTone(kl.nilai).text
                            }`}
                          >
                            {kl.nilai ?? "-"}
                          </TableCell>
                        ))}
                        <TableCell
                          className={`text-center font-mono font-semibold transition-colors ${
                            getScoreTone(subj.kehadiran.persentase).text
                          }`}
                        >
                          {subj.kehadiran.persentase !== null
                            ? `${subj.kehadiran.persentase}%`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right pr-5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border transition-colors ${getStatusBadge(
                              subj.statusPenilaian
                            )}`}
                          >
                            {subj.statusPenilaian}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredSubjects.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6 + (subjectsList[0]?.kriteriaLain.length || 0)}
                        className="py-10 text-center text-xs text-slate-500"
                      >
                        <Clock className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                        {subjectsList.length === 0
                          ? "Belum ada daftar mata pelajaran yang terdaftar untuk kelas Anda."
                          : "Tidak ada mata pelajaran yang cocok dengan filter pencarian Anda."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {paginatedTableSubjects.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  <Clock className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                  {subjectsList.length === 0
                    ? "Belum ada daftar mata pelajaran yang terdaftar untuk kelas Anda."
                    : "Tidak ada mata pelajaran yang cocok dengan filter pencarian Anda."}
                </div>
              ) : (
                paginatedTableSubjects.map((subj, idx) => {
                  const kompItems = subj.akademik
                    ? subj.akademik.kategoriWajib.map((cat) => ({
                        cat,
                        val: subj.akademik?.komponen[cat],
                      }))
                    : [];
                  return (
                    <div
                      key={`${subj.namaMapel}-${idx}`}
                      className="p-4 space-y-3 bg-white hover:bg-slate-50/75 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm truncate">
                            {subj.labelMapel}
                          </h4>
                          <p className="text-xs text-slate-500 truncate">
                            {subj.guruPengampu}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border shrink-0 ${getStatusBadge(
                            subj.statusPenilaian
                          )}`}
                        >
                          {subj.statusPenilaian}
                        </span>
                      </div>

                      {/* Nilai Summary Row */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <span className="text-slate-500 font-medium">
                            Nilai Akhir:
                          </span>
                          <span
                            className={`font-mono font-bold text-sm ${
                              getScoreTone(subj.akademik?.nilaiAkhir).text
                            }`}
                          >
                            {subj.isHomeroom
                              ? "-"
                              : (subj.akademik?.nilaiAkhir ?? "-")}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <span className="text-slate-500 font-medium">
                            Kehadiran:
                          </span>
                          <span
                            className={`font-mono font-semibold text-sm ${
                              getScoreTone(subj.kehadiran.persentase).text
                            }`}
                          >
                            {subj.kehadiran.persentase !== null
                              ? `${subj.kehadiran.persentase}%`
                              : "-"}
                          </span>
                        </div>
                      </div>

                      {/* Komponen Akademik Details */}
                      {kompItems.length > 0 && (
                        <div className="pt-0.5">
                          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Rincian Komponen
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {kompItems.map(({ cat, val }) => (
                              <span
                                key={cat}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono bg-slate-50 border border-slate-200"
                              >
                                <span className="text-slate-500 font-sans">
                                  {cat}:
                                </span>
                                <span
                                  className={`font-bold ${
                                    val !== undefined && val !== null
                                      ? getScoreTone(val).text
                                      : "text-slate-400"
                                  }`}
                                >
                                  {val !== undefined && val !== null
                                    ? val
                                    : "-"}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Kriteria Non-Akademik */}
                      {subj.kriteriaLain.length > 0 && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 border-t border-slate-100 text-xs">
                          {subj.kriteriaLain.map((kl) => (
                            <div
                              key={kl.criteriaId}
                              className="flex items-center gap-1.5 text-slate-600"
                            >
                              <span className="text-slate-400">
                                {kl.namaKriteria}:
                              </span>
                              <span
                                className={`font-mono font-semibold ${
                                  getScoreTone(kl.nilai).text
                                }`}
                              >
                                {kl.nilai ?? "-"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Executive Status & Pagination Dock */}
            {filteredSubjects.length > 0 && (
              <div className="-mx-5 sm:-mx-6 -mb-5 sm:-mb-6 mt-3 px-5 sm:px-6 py-3 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Kiri: Ringkasan Status Kurikulum Berbentuk Pill */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200/90 text-xs font-semibold text-slate-700 shadow-2xs">
                    <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                    {totalTablePages > 1
                      ? `Baris ${(safeTablePage - 1) * tablePageSize + 1}–${Math.min(
                          safeTablePage * tablePageSize,
                          filteredSubjects.length
                        )} dari ${filteredSubjects.length} Mapel`
                      : `${filteredSubjects.length} Mata Pelajaran Kurikulum`}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/90 border border-emerald-200/80 text-[11px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {completenessStats.lengkap} Lengkap
                  </span>
                  {completenessStats.sebagian > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/90 border border-amber-200/80 text-[11px] font-semibold text-amber-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {completenessStats.sebagian} Sebagian
                    </span>
                  )}
                  {completenessStats.total -
                    completenessStats.lengkap -
                    completenessStats.sebagian >
                    0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200/80 text-[11px] font-medium text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      {completenessStats.total -
                        completenessStats.lengkap -
                        completenessStats.sebagian}{" "}
                      Belum Dinilai
                    </span>
                  )}
                </div>

                {/* Kanan: Segmented Page Pills (jika > 1 halaman) atau Indeks Skor SPK */}
                {totalTablePages > 1 ? (
                  <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                      disabled={safeTablePage <= 1}
                      className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
                      aria-label="Halaman sebelumnya"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    {Array.from(
                      { length: totalTablePages },
                      (_, idx) => idx + 1
                    ).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setTablePage(pageNum)}
                        className={`h-7 min-w-7 px-2 inline-flex items-center justify-center rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                          pageNum === safeTablePage
                            ? "bg-[#091524] text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setTablePage((p) => Math.min(totalTablePages, p + 1))
                      }
                      disabled={safeTablePage >= totalTablePages}
                      className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
                      aria-label="Halaman selanjutnya"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200/90 text-slate-600 shadow-2xs">
                      <span>Skor Prestasi:</span>
                      <strong className="font-mono text-slate-900">
                        {data.totalSkorSPK}
                      </strong>
                      <span className="text-slate-400 font-mono text-[11px]">
                        dari 100
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Criteria Detail Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.criteria.map((c) => {
              const tone = getScoreTone(c.nilaiRataRata);
              const pct = Math.min(100, Math.max(0, c.nilaiRataRata));
              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300/90 hover:shadow-sm transition-all duration-300 group flex flex-col justify-between"
                >
                  <div className="pb-3 border-b border-slate-100 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2 transition-colors">
                          {c.tipe === "Otomatis" ? (
                            <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                          ) : (
                            <BookOpen className="h-4 w-4 text-indigo-600 shrink-0" />
                          )}
                          <span className="truncate">{c.namaKriteria}</span>
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs text-slate-500 transition-colors">
                          {c.deskripsi || `Bobot evaluasi ${c.bobot}%`}
                        </CardDescription>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0 transition-colors">
                        {c.bobot}%
                      </span>
                    </div>
                  </div>
                  <div className="pt-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5 transition-colors">
                          Nilai Rata-Rata
                        </p>
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-2xl font-bold font-mono tabular-nums ${tone.text}`}
                          >
                            {c.nilaiRataRata}
                          </p>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${tone.pill}`}
                          >
                            {tone.label}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-0.5 transition-colors">
                          Kontribusi Nilai
                        </p>
                        <p className="text-base font-bold tabular-nums text-slate-900 transition-colors">
                          {c.nilaiTerbobot}
                        </p>
                        <p className="text-xs tabular-nums text-slate-400 transition-colors">
                          Bobot {c.bobot}%
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-xs overflow-hidden transition-colors">
                      <div
                        className="bg-[#1e3a8a] h-full rounded-xs transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Per-Mapel detail if any (with bounded max-height scroll for 20+ mapels) */}
                    {Object.keys(c.detailMapel).length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors">
                              Rincian Per Mata Pelajaran
                            </p>
                            <span className="text-[10px] font-mono text-slate-400 ">
                              {Object.keys(c.detailMapel).length} Mapel
                            </span>
                          </div>
                          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                            {Object.entries(c.detailMapel).map(
                              ([mapel, nilai]) => {
                                const katMap = c.detailKategoriMapel?.[mapel];
                                const katEntries = katMap
                                  ? Object.entries(katMap).filter(
                                      ([k]) =>
                                        !(
                                          Object.keys(katMap).length === 1 &&
                                          k.toLowerCase() === "nilai"
                                        )
                                    )
                                  : [];
                                return (
                                  <div key={mapel} className="space-y-0.5">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-slate-700 font-medium truncate mr-2 transition-colors">
                                        {mapel}
                                      </span>
                                      <span
                                        className={`font-mono font-semibold tabular-nums ${
                                          getScoreTone(nilai).text
                                        }`}
                                      >
                                        {c.tipe === "Otomatis" ? `${nilai}%` : nilai}
                                      </span>
                                    </div>
                                    {katEntries.length > 0 && (
                                      <p className="text-[11px] text-slate-400 font-mono truncate transition-colors">
                                        {katEntries
                                          .map(([k, v]) => `${k}: ${v}`)
                                          .join(" · ")}
                                      </p>
                                    )}
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full Table Summary */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Rincian Skor Prestasi Semester
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Skor prestasi dihitung dari gabungan seluruh aspek penilaian
                akademik dan kehadiran sesuai bobot masing-masing.
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Aspek Penilaian</TableHead>
                    <TableHead className="text-center">Tipe Input</TableHead>
                    <TableHead className="text-center">Bobot</TableHead>
                    <TableHead className="text-center">
                      Nilai Rata-Rata
                    </TableHead>
                    <TableHead className="text-right pr-6">
                      Kontribusi Nilai
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.criteria.map((c) => (
                    <TableRow
                      key={c.id}
                      className="group/row transition-colors duration-200 hover:bg-slate-50/90 border-b border-slate-100 last:border-0"
                    >
                      <TableCell className="pl-6 font-semibold text-slate-800 transition-colors">
                        {c.namaKriteria}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border transition-colors ${
                            c.tipe === "Otomatis"
                              ? "border-blue-200 text-[#1e3a8a] bg-blue-50"
                              : "border-indigo-200 text-indigo-700 bg-indigo-50"
                          }`}
                        >
                          {c.tipe}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono text-slate-600 transition-colors">
                        {c.bobot}%
                      </TableCell>
                      <TableCell
                        className={`text-center font-mono font-bold transition-colors ${
                          getScoreTone(c.nilaiRataRata).text
                        }`}
                      >
                        {c.nilaiRataRata}
                      </TableCell>
                      <TableCell className="text-right pr-6 font-mono font-bold text-slate-900 transition-colors">
                        {c.nilaiTerbobot}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="group/row bg-slate-50/90 hover:bg-slate-50/90 border-t-2 border-slate-200 transition-colors duration-200">
                    <TableCell
                      colSpan={4}
                      className="pl-6 font-bold text-slate-900 transition-colors"
                    >
                      Total Skor Prestasi
                    </TableCell>
                    <TableCell className="text-right pr-6 font-mono font-extrabold text-base text-blue-600 transition-colors">
                      {data.totalSkorSPK}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </ModulePageShell>
  );
}
