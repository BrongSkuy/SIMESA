"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ClipboardList,
  TrendingUp,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Download,
  UserCheck,
  Layers,
  Clock,
  GraduationCap,
  Search,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/shared/page-header";
import { SessionSetup } from "@/components/shared/session-setup";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";

interface ClassRow {
  id: string;
  namaKelas: string;
}

interface StudentRow {
  id: string;
  nis: string;
  namaLengkap: string;
}

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
  kehadiran: {
    hadir: number;
    izin: number;
    sakit: number;
    alfa: number;
    total: number;
    persentase: number | null;
  };
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

const CARDS_PER_PAGE = 6;

export default function AdminNilaiSayaPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");

  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"mapel" | "kriteria">("mapel");
  const [searchMapel, setSearchMapel] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [cardPage, setCardPage] = useState(1);
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState<number>(6);

  // 1. Fetch classes
  useEffect(() => {
    fetch("/api/classes")
      .then((res) => res.json())
      .then((resData: ClassRow[]) =>
        setClasses(Array.isArray(resData) ? resData : [])
      )
      .catch(() => toast.error("Gagal memuat kelas"));
  }, []);

  // 2. Fetch students when class changes
  useEffect(() => {
    if (!selectedKelas) {
      return;
    }
    fetch(`/api/students?kelas=${encodeURIComponent(selectedKelas)}`)
      .then((res) => res.json())
      .then((resData: StudentRow[]) => {
        setStudents(Array.isArray(resData) ? resData : []);
        setSelectedStudent("");
      })
      .catch(() => toast.error("Gagal memuat siswa"));
  }, [selectedKelas]);

  // 3. Fetch scores
  const handleFetchScores = () => {
    if (!selectedStudent) {
      toast.error("Pilih siswa terlebih dahulu");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    fetch(`/api/students/${selectedStudent}/scores`)
      .then((res) => res.json())
      .then((result) => {
        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Gagal memuat data nilai");
        setLoading(false);
      });
  };

  const getScoreTone = (score: number | null | undefined) => {
    if (score === null || score === undefined) {
      return {
        text: "text-slate-400 group-hover:text-slate-500 group-hover/row:text-slate-500",
        pill: "bg-slate-100 text-slate-500 border-slate-200 group-hover:bg-slate-800 group-hover:text-slate-400 group-hover:border-slate-700",
        label: "Belum Dinilai",
      };
    }
    if (score >= 85)
      return {
        text: "text-emerald-700 group-hover:text-emerald-400 group-hover/row:text-emerald-400",
        pill: "bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-emerald-500/15 group-hover:text-emerald-300 group-hover:border-emerald-500/30",
        label: "Sangat Baik",
      };
    if (score >= 70)
      return {
        text: "text-blue-700 group-hover:text-blue-400 group-hover/row:text-blue-400",
        pill: "bg-blue-50 text-blue-700 border-blue-200 group-hover:bg-blue-500/15 group-hover:text-blue-300 group-hover:border-blue-500/30",
        label: "Baik",
      };
    if (score >= 50)
      return {
        text: "text-amber-700 group-hover:text-amber-400 group-hover/row:text-amber-400",
        pill: "bg-amber-50 text-amber-700 border-amber-200 group-hover:bg-amber-500/15 group-hover:text-amber-300 group-hover:border-amber-500/30",
        label: "Cukup",
      };
    return {
      text: "text-rose-700 group-hover:text-rose-400 group-hover/row:text-rose-400",
      pill: "bg-rose-50 text-rose-700 border-rose-200 group-hover:bg-rose-500/15 group-hover:text-rose-300 group-hover:border-rose-500/30",
      label: "Perlu Perbaikan",
    };
  };

  const getStatusBadge = (
    status: "Lengkap" | "Sebagian" | "Belum Dinilai"
  ) => {
    if (status === "Lengkap") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-emerald-500/15 group-hover:text-emerald-300 group-hover:border-emerald-500/30 group-hover/row:bg-emerald-500/15 group-hover/row:text-emerald-300 group-hover/row:border-emerald-500/30";
    }
    if (status === "Sebagian") {
      return "bg-amber-50 text-amber-700 border-amber-200 group-hover:bg-amber-500/15 group-hover:text-amber-300 group-hover:border-amber-500/30 group-hover/row:bg-amber-500/15 group-hover/row:text-amber-300 group-hover/row:border-amber-500/30";
    }
    return "bg-slate-100 text-slate-600 border-slate-200 group-hover:bg-slate-800 group-hover:text-slate-300 group-hover:border-slate-700 group-hover/row:bg-slate-800 group-hover/row:text-slate-300 group-hover/row:border-slate-700";
  };

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

  const handleExportTranscript = () => {
    if (!data) return;

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Transkrip Per Mata Pelajaran
      const mapelRows = subjectsList.map((s, idx) => {
        const kompStr = s.akademik
          ? s.akademik.kategoriWajib
            .map((cat) => `${cat}: ${s.akademik?.komponen[cat] ?? "-"}`)
            .join(", ")
          : "Evaluasi Wali Kelas";

        const rowObj: Record<string, string | number> = {
          No: idx + 1,
          "Mata Pelajaran": s.labelMapel,
          "Guru Pengampu": s.guruPengampu,
          "Rincian Komponen Akademik": kompStr,
          "Nilai Akademik":
            s.akademik?.nilaiAkhir !== null &&
              s.akademik?.nilaiAkhir !== undefined
              ? s.akademik.nilaiAkhir
              : "-",
        };

        s.kriteriaLain.forEach((kl) => {
          rowObj[kl.namaKriteria] = kl.nilai !== null ? kl.nilai : "-";
        });

        rowObj["Kehadiran (%)"] =
          s.kehadiran.persentase !== null ? `${s.kehadiran.persentase}%` : "-";
        rowObj["Rincian Hadir (H/I/S/A)"] =
          `${s.kehadiran.hadir} Hadir / ${s.kehadiran.izin} Izin / ${s.kehadiran.sakit} Sakit / ${s.kehadiran.alfa} Alfa`;
        rowObj["Rata-Rata Mapel"] =
          s.rataRataMapel !== null ? s.rataRataMapel : "-";
        rowObj["Status Penilaian"] = s.statusPenilaian;

        return rowObj;
      });

      if (mapelRows.length > 0) {
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(mapelRows),
          "Transkrip Per Mapel"
        );
      }

      // Sheet 2: Perhitungan SPK SAW
      const sawRows = data.criteria.map((c, idx) => ({
        No: idx + 1,
        "Kriteria Evaluasi": c.namaKriteria,
        "Tipe Input": c.tipe,
        "Bobot (%)": c.bobot,
        "Nilai Rata-Rata": c.nilaiRataRata,
        "Normalisasi SAW (R_ij)": Number(
          (c.nilaiNormalisasi ?? c.nilaiRataRata / 100).toFixed(4)
        ),
        "Skor Terbobot SAW": c.nilaiTerbobot,
      }));

      sawRows.push({
        No: sawRows.length + 1,
        "Kriteria Evaluasi": "TOTAL AKUMULASI SKOR SPK SAW",
        "Tipe Input": "-",
        "Bobot (%)": 100,
        "Nilai Rata-Rata": 0,
        "Normalisasi SAW (R_ij)": 1,
        "Skor Terbobot SAW": data.totalSkorSPK,
      });

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(sawRows),
        "Perhitungan SPK SAW"
      );

      const safeName = data.student.namaLengkap
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .replace(/_+/g, "_");
      const safePeriode = (data.periode || "Aktif").replace(/[^a-zA-Z0-9_-]/g, "-");
      XLSX.writeFile(
        wb,
        `Transkrip_Nilai_${data.student.nis}_${safeName}_${safePeriode}.xlsx`
      );
      toast.success("Transkrip nilai berhasil diunduh (.xlsx)");
    } catch {
      toast.error("Gagal mengunduh transkrip nilai");
    }
  };

  const selectedStudentObj = students.find((s) => s.id === selectedStudent);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pratinjau Transkrip & Skor Siswa"
        badge="Inspeksi Akademik"
        description="Pilih siswa untuk meninjau rincian penilaian seluruh kriteria dan akumulasi skor SPK SAW"
        icon={ClipboardList}
      />

      <SessionSetup
        active={Boolean(data)}
        icon={ClipboardList}
        eyebrow="Langkah 1 dari 2"
        title="Pilih Siswa untuk Membuka Transkrip"
        description="Pilih kelas dan nama siswa untuk memuat rincian nilai tugas, UTS, UAS, persentase kehadiran, dan akumulasi skor SPK SAW."
        submitLabel="Tampilkan Transkrip Siswa"
        onSubmit={handleFetchScores}
        loading={loading}
        disabled={!selectedStudent}
        onChangeSession={() => setData(null)}
        chips={[
          { label: "Kelas", value: data?.student.kelas || selectedKelas || "-" },
          {
            label: "Siswa",
            value: data?.student
              ? `${data.student.nis} · ${data.student.namaLengkap}`
              : selectedStudentObj
                ? `${selectedStudentObj.nis} · ${selectedStudentObj.namaLengkap}`
                : "-",
          },
          { label: "Periode", value: data?.periode || "Aktif" },
        ]}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Target Kelas
            </Label>
            <Select
              value={selectedKelas || null}
              onValueChange={(v) => {
                setSelectedKelas(v || "");
                setStudents([]);
                setSelectedStudent("");
              }}
            >
              <SelectTrigger className="h-9 w-full text-xs">
                <SelectValue placeholder="Pilih Kelas..." />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.namaKelas}>
                    {c.namaKelas}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Pilih Siswa
            </Label>
            <SearchableSelect
              value={selectedStudent}
              onValueChange={(v) => setSelectedStudent(v)}
              disabled={!selectedKelas}
              placeholder={
                !selectedKelas
                  ? "Pilih kelas terlebih dahulu..."
                  : "Pilih atau cari siswa..."
              }
              searchPlaceholder="Ketik nama atau NIS siswa..."
              emptyMessage={
                students.length === 0
                  ? "Tidak ada siswa di kelas ini"
                  : "Siswa tidak ditemukan"
              }
              options={students.map((s) => ({
                value: s.id,
                label: `${s.nis} · ${s.namaLengkap}`,
                sublabel: `NIS: ${s.nis}`,
              }))}
            />
          </div>
        </div>
      </SessionSetup>

      {error && !data && (
        <div className="flex h-44 flex-col items-center justify-center gap-2 text-slate-500 bg-white border border-slate-200 rounded-xl max-w-xl mx-auto my-4 p-6 text-center">
          <AlertCircle className="h-7 w-7 text-rose-500" />
          <p className="text-sm font-semibold text-slate-800">
            Gagal Memuat Transkrip Nilai
          </p>
          <p className="text-xs text-slate-500">{error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-6">
          {/* Score Summary Banner - Executive Dark Hero */}
          <div className="rounded-xl bg-[#091524] border border-slate-800/80 p-5 sm:p-6 overflow-hidden shadow-sm text-white bg-gradient-to-r from-[#091524] via-[#0E1E34] to-[#091524] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold text-lg flex items-center justify-center shrink-0 shadow-inner border border-blue-400/30">
                {getInitials(data.student.namaLengkap)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
                    Periode: {data.periode || "Aktif"}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs tabular-nums bg-slate-800/80 text-slate-300 border border-slate-700/60">
                    NIS {data.student.nis}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    Kelas {data.student.kelas}
                  </span>
                  {completenessStats.total > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {completenessStats.lengkap}/{completenessStats.total} Mapel Lengkap
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1.5">
                  {data.student.namaLengkap}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3.5 bg-slate-900/90 backdrop-blur-xs px-4 py-3 rounded-lg border border-slate-700/80 w-full sm:w-auto justify-between sm:justify-start shadow-inner">
              <div className="p-2.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Total Skor SPK
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-white">
                    {data.totalSkorSPK}
                  </p>
                  <span className="text-xs text-blue-400 font-semibold">/ 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          {data.kehadiran && (
            <div className="rounded-2xl border border-slate-200/80 bg-white grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 sm:divide-slate-200/80 shadow-xs hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl group transition-all duration-300 overflow-hidden">
              <div className="p-4 group-hover:border-slate-800/80 transition-colors">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
                  Hadir
                </p>
                <p className="text-2xl font-bold tabular-nums text-emerald-600 group-hover:text-emerald-400 mt-1 transition-colors">
                  {data.kehadiran.hadir}
                </p>
              </div>
              <div className="p-4 group-hover:border-slate-800/80 transition-colors">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
                  Izin
                </p>
                <p className="text-2xl font-bold tabular-nums text-amber-600 group-hover:text-amber-400 mt-1 transition-colors">
                  {data.kehadiran.izin}
                </p>
              </div>
              <div className="p-4 group-hover:border-slate-800/80 transition-colors">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
                  Sakit
                </p>
                <p className="text-2xl font-bold tabular-nums text-blue-600 group-hover:text-blue-400 mt-1 transition-colors">
                  {data.kehadiran.sakit}
                </p>
              </div>
              <div className="p-4 group-hover:border-slate-800/80 transition-colors">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
                  Alfa
                </p>
                <p className="text-2xl font-bold tabular-nums text-rose-600 group-hover:text-rose-400 mt-1 transition-colors">
                  {data.kehadiran.alfa}
                </p>
              </div>
              <div className="p-4 col-span-2 sm:col-span-1 group-hover:border-slate-800/80 transition-colors">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
                  % Kehadiran
                </p>
                <p
                  className={`text-2xl font-bold tabular-nums mt-1 transition-colors ${getScoreTone(data.kehadiran.persentase).text
                    }`}
                >
                  {data.kehadiran.persentase}%
                </p>
              </div>
            </div>
          )}

          {/* Dual-View Tabs Switcher & Unduh Transkrip Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Mode Tampilan Transkrip Evaluasi
              </h3>
              <p className="text-xs text-slate-500">
                Pilih tampilan berdasarkan rincian per mata pelajaran atau per kriteria SPK SAW
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "mapel" | "kriteria")}
              >
                <TabsList>
                  <TabsTrigger value="mapel" className="gap-1.5 cursor-pointer">
                    <GraduationCap className="h-3.5 w-3.5" /> Rincian Per Mapel ({subjectsList.length})
                  </TabsTrigger>
                  <TabsTrigger value="kriteria" className="gap-1.5 cursor-pointer">
                    <Layers className="h-3.5 w-3.5" /> Evaluasi SPK SAW ({data.criteria.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportTranscript}
                className="gap-1.5 cursor-pointer text-xs h-8"
              >
                <Download className="h-3.5 w-3.5 text-blue-600" />
                Unduh Transkrip (.xlsx)
              </Button>
            </div>
          </div>

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
                    <SelectTrigger className="w-[148px] h-9 text-xs border-slate-200">
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {paginatedCardSubjects.map((subj) => {
                    const avgTone = getScoreTone(subj.rataRataMapel);
                    const acadTone = getScoreTone(subj.akademik?.nilaiAkhir);
                    const pct =
                      subj.rataRataMapel !== null
                        ? Math.min(100, Math.max(0, subj.rataRataMapel))
                        : 0;

                    return (
                      <div
                        key={subj.namaMapel}
                        className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between cursor-pointer"
                      >
                        <div>
                          {/* Header Mapel & Guru */}
                          <div className="pb-3.5 border-b border-slate-100 group-hover:border-slate-800 transition-colors flex items-start justify-between gap-2.5">
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-sm font-bold text-slate-900 group-hover:text-white flex items-center gap-2 transition-colors">
                                {subj.isHomeroom ? (
                                  <UserCheck className="h-4 w-4 text-amber-500 group-hover:text-amber-400 shrink-0" />
                                ) : (
                                  <BookOpen className="h-4 w-4 text-blue-600 group-hover:text-blue-400 shrink-0" />
                                )}
                                <span className="truncate">{subj.labelMapel}</span>
                              </CardTitle>
                              <CardDescription className="mt-1 text-xs text-slate-500 group-hover:text-slate-400 truncate transition-colors">
                                {subj.isHomeroom ? "Wali Kelas" : "Guru Mapel"}:{" "}
                                <span className="font-medium text-slate-700 group-hover:text-slate-300 transition-colors">
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
                            <div className="pt-3.5 pb-3 border-b border-slate-100 group-hover:border-slate-800/80 transition-colors space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
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
                                      className="rounded-xl border border-slate-200/80 bg-slate-50/80 group-hover:bg-slate-800/70 group-hover:border-slate-700/80 px-2.5 py-2 text-center transition-colors"
                                    >
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-400 truncate">
                                        {cat}
                                      </p>
                                      <p
                                        className={`text-sm font-bold font-mono tabular-nums mt-0.5 transition-colors ${hasVal
                                            ? getScoreTone(val).text
                                            : "text-slate-400 group-hover:text-slate-500"
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
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-400 transition-colors">
                              Evaluasi Karakter & Presensi Mapel
                            </p>
                            <div className="space-y-1.5">
                              {subj.kriteriaLain.map((kl) => (
                                <div
                                  key={kl.criteriaId}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <span className="text-slate-600 group-hover:text-slate-300 transition-colors">
                                    {kl.namaKriteria}
                                  </span>
                                  <span
                                    className={`font-mono font-semibold tabular-nums transition-colors ${getScoreTone(kl.nilai).text
                                      }`}
                                  >
                                    {kl.nilai !== null ? kl.nilai : "Belum diisi"}
                                  </span>
                                </div>
                              ))}
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100/80 group-hover:border-slate-800/60 transition-colors">
                                <span className="text-slate-600 group-hover:text-slate-300 transition-colors">
                                  Kehadiran Mapel
                                </span>
                                <span
                                  className={`font-mono font-semibold tabular-nums transition-colors ${getScoreTone(subj.kehadiran.persentase).text
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
                        <div className="mt-4 pt-3 border-t border-slate-100 group-hover:border-slate-800 transition-colors">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-slate-500 group-hover:text-slate-400 font-medium transition-colors">
                              Rata-Rata Evaluasi Mapel
                            </span>
                            <span
                              className={`text-sm font-bold font-mono tabular-nums transition-colors ${avgTone.text}`}
                            >
                              {subj.rataRataMapel !== null ? subj.rataRataMapel : "-"}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 group-hover:bg-slate-800 h-1.5 rounded-xs overflow-hidden transition-colors">
                            <div
                              className="bg-[#1e3a8a] group-hover:bg-blue-500 h-full rounded-xs transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalCardPages > 1 && (
                  <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      Menampilkan kartu{" "}
                      <strong className="text-slate-800">
                        {(safeCardPage - 1) * CARDS_PER_PAGE + 1}–
                        {Math.min(
                          safeCardPage * CARDS_PER_PAGE,
                          filteredSubjects.length
                        )}
                      </strong>{" "}
                      dari{" "}
                      <strong className="text-slate-800">
                        {filteredSubjects.length}
                      </strong>{" "}
                      mata pelajaran (Maks. {CARDS_PER_PAGE} kartu/halaman)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs cursor-pointer"
                        onClick={() => setCardPage((p) => Math.max(1, p - 1))}
                        disabled={safeCardPage <= 1}
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                        Sebelumnya
                      </Button>
                      <span className="px-2 font-mono font-semibold text-slate-700">
                        {safeCardPage} / {totalCardPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs cursor-pointer"
                        onClick={() =>
                          setCardPage((p) => Math.min(totalCardPages, p + 1))
                        }
                        disabled={safeCardPage >= totalCardPages}
                      >
                        Selanjutnya
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabel Matriks Rekapitulasi Seluruh Mata Pelajaran */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-3">
                <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-blue-600" />
                      Tabel Rekapitulasi Nilai Seluruh Mata Pelajaran
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Perbandingan lengkap nilai akademik (Tugas/UTS/UAS), karakter,
                      dan kehadiran di setiap mata pelajaran kelas {data.student.kelas}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-500">Tampilkan:</span>
                    <Select
                      value={String(tablePageSize)}
                      onValueChange={(val) => {
                        setTablePageSize(Number(val) || 6);
                        setTablePage(1);
                      }}
                    >
                      <SelectTrigger className="w-[125px] h-8 text-xs border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 Mapel / Hal</SelectItem>
                        <SelectItem value="10">10 Mapel / Hal</SelectItem>
                        <SelectItem value="15">15 Mapel / Hal</SelectItem>
                        <SelectItem value="50">Semua Mapel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="overflow-x-auto">
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
                      {paginatedTableSubjects.map((subj) => {
                        const kompItems = subj.akademik
                          ? subj.akademik.kategoriWajib.map((cat) => ({
                            cat,
                            val: subj.akademik?.komponen[cat],
                          }))
                          : [];
                        return (
                          <TableRow
                            key={subj.namaMapel}
                            className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 last:border-0"
                          >
                            <TableCell className="pl-5 font-semibold text-slate-800 group-hover/row:text-white transition-colors">
                              {subj.labelMapel}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 group-hover/row:text-slate-300 transition-colors">
                              {subj.guruPengampu}
                            </TableCell>
                            <TableCell>
                              {subj.isHomeroom ? (
                                <span className="text-xs text-slate-400 group-hover/row:text-slate-500 italic">
                                  Evaluasi Umum Wali Kelas
                                </span>
                              ) : kompItems.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {kompItems.map(({ cat, val }) => (
                                    <span
                                      key={cat}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-100 group-hover/row:bg-slate-800 group-hover/row:text-slate-200 border border-slate-200 group-hover/row:border-slate-700 transition-colors"
                                    >
                                      <span className="text-slate-500 group-hover/row:text-slate-400 font-sans">
                                        {cat}:
                                      </span>
                                      <span
                                        className={`font-bold ${val !== undefined && val !== null
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
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </TableCell>
                            <TableCell
                              className={`text-center font-mono font-bold ${getScoreTone(subj.akademik?.nilaiAkhir).text
                                }`}
                            >
                              {subj.akademik?.nilaiAkhir ?? "-"}
                            </TableCell>
                            {subj.kriteriaLain.map((kl) => (
                              <TableCell
                                key={kl.criteriaId}
                                className={`text-center font-mono font-semibold ${getScoreTone(kl.nilai).text
                                  }`}
                              >
                                {kl.nilai ?? "-"}
                              </TableCell>
                            ))}
                            <TableCell
                              className={`text-center font-mono font-semibold ${getScoreTone(subj.kehadiran.persentase).text
                                }`}
                            >
                              {subj.kehadiran.persentase !== null
                                ? `${subj.kehadiran.persentase}%`
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right pr-5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getStatusBadge(
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
                            colSpan={8}
                            className="py-10 text-center text-xs text-slate-500"
                          >
                            <Clock className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                            {subjectsList.length === 0
                              ? "Belum ada daftar mata pelajaran yang terdaftar untuk kelas ini."
                              : "Tidak ada mata pelajaran yang cocok dengan filter pencarian Anda."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Footer Paginasi Tabel Rekapitulasi */}
                {filteredSubjects.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      Menampilkan{" "}
                      <strong className="text-slate-800">
                        {(safeTablePage - 1) * tablePageSize + 1}–
                        {Math.min(
                          safeTablePage * tablePageSize,
                          filteredSubjects.length
                        )}
                      </strong>{" "}
                      dari{" "}
                      <strong className="text-slate-800">
                        {filteredSubjects.length}
                      </strong>{" "}
                      mata pelajaran (Halaman{" "}
                      <strong className="text-slate-800">{safeTablePage}</strong>{" "}
                      dari{" "}
                      <strong className="text-slate-800">{totalTablePages}</strong>)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs cursor-pointer"
                        onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                        disabled={safeTablePage <= 1}
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                        Sebelumnya
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs cursor-pointer"
                        onClick={() =>
                          setTablePage((p) => Math.min(totalTablePages, p + 1))
                        }
                        disabled={safeTablePage >= totalTablePages}
                      >
                        Selanjutnya
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
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
                      className="rounded-2xl border border-slate-200/90 bg-white p-5 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
                    >
                      <div className="pb-3 border-b border-slate-100 group-hover:border-slate-800/80 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm font-semibold text-slate-900 group-hover:text-white flex items-center gap-2 transition-colors">
                              {c.tipe === "Otomatis" ? (
                                <CheckCircle2 className="h-4 w-4 text-blue-600 group-hover:text-blue-400 shrink-0 transition-colors" />
                              ) : (
                                <BookOpen className="h-4 w-4 text-indigo-600 group-hover:text-indigo-400 shrink-0 transition-colors" />
                              )}
                              <span className="truncate">{c.namaKriteria}</span>
                            </CardTitle>
                            <CardDescription className="mt-1 text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                              {c.deskripsi || `Bobot evaluasi ${c.bobot}%`}
                            </CardDescription>
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs tabular-nums font-semibold bg-slate-100 group-hover:bg-slate-800 group-hover:text-slate-200 border border-slate-200 group-hover:border-slate-700 shrink-0 transition-colors">
                            {c.bobot}%
                          </span>
                        </div>
                      </div>
                      <div className="pt-4">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-xs text-slate-500 group-hover:text-slate-400 mb-0.5 transition-colors">
                              Nilai Rata-Rata
                            </p>
                            <div className="flex items-center gap-2">
                              <p
                                className={`text-2xl font-bold tabular-nums ${tone.text}`}
                              >
                                {c.nilaiRataRata}
                              </p>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${tone.pill}`}
                              >
                                {tone.label}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500 group-hover:text-slate-400 mb-0.5 transition-colors">
                              Skor Terbobot SAW
                            </p>
                            <p className="text-base font-bold tabular-nums text-slate-900 group-hover:text-white transition-colors">
                              {c.nilaiTerbobot}
                            </p>
                            <p className="text-xs text-slate-400 group-hover:text-slate-500 tabular-nums transition-colors">
                              (R: {(c.nilaiNormalisasi ?? c.nilaiRataRata / 100).toFixed(4)} × {c.bobot}%)
                            </p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3 w-full bg-slate-100 group-hover:bg-slate-800/80 h-1.5 rounded-xs overflow-hidden transition-colors">
                          <div
                            className="bg-[#1e3a8a] group-hover:bg-blue-500 h-full rounded-xs transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Per-Mapel detail if any (with bounded max-height scroll for 20+ mapels) */}
                        {Object.keys(c.detailMapel).length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-100 group-hover:border-slate-800/80 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
                                Rincian Per Mata Pelajaran
                              </p>
                              <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-500">
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
                                        <span className="text-slate-700 font-medium group-hover:text-slate-200 truncate mr-2 transition-colors">
                                          {mapel}
                                        </span>
                                        <span
                                          className={`font-mono font-semibold tabular-nums ${getScoreTone(nilai).text
                                            }`}
                                        >
                                          {c.tipe === "Otomatis" ? `${nilai}%` : nilai}
                                        </span>
                                      </div>
                                      {katEntries.length > 0 && (
                                        <p className="text-[11px] text-slate-400 group-hover:text-slate-400 font-mono truncate transition-colors">
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
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Ringkasan Perhitungan Skor SPK SAW
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Rumus SAW: Skor Akhir = Σ (Normalisasi R_ij × Bobot%), di mana R_ij = Nilai Rata-Rata / Nilai Maksimum Global
                  </CardDescription>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-100 bg-slate-50/60 hover:bg-slate-50/60">
                        <TableHead className="pl-6 font-semibold text-slate-600">Kriteria Evaluasi</TableHead>
                        <TableHead className="text-center font-semibold text-slate-600">Tipe Input</TableHead>
                        <TableHead className="text-center font-semibold text-slate-600">Bobot</TableHead>
                        <TableHead className="text-center font-semibold text-slate-600">Nilai Rata-Rata</TableHead>
                        <TableHead className="text-center font-semibold text-slate-600">Normalisasi (R)</TableHead>
                        <TableHead className="text-right pr-6 font-semibold text-slate-600">
                          Skor Terbobot
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.criteria.map((c) => (
                        <TableRow
                          key={c.id}
                          className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 last:border-0"
                        >
                          <TableCell className="pl-6 font-semibold text-slate-800 group-hover/row:text-white transition-colors">
                            {c.namaKriteria}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border transition-colors ${c.tipe === "Otomatis"
                                  ? "border-blue-200 text-[#1e3a8a] bg-blue-50 group-hover/row:bg-blue-500/15 group-hover/row:border-blue-500/30 group-hover/row:text-blue-300"
                                  : "border-indigo-200 text-indigo-700 bg-indigo-50 group-hover/row:bg-indigo-500/15 group-hover/row:border-indigo-500/30 group-hover/row:text-indigo-300"
                                }`}
                            >
                              {c.tipe}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-mono text-slate-600 group-hover/row:text-slate-300 transition-colors">
                            {c.bobot}%
                          </TableCell>
                          <TableCell
                            className={`text-center font-mono font-bold ${getScoreTone(c.nilaiRataRata).text
                              }`}
                          >
                            {c.nilaiRataRata}
                          </TableCell>
                          <TableCell className="text-center font-mono text-slate-600 group-hover/row:text-slate-300 transition-colors">
                            {(c.nilaiNormalisasi ?? c.nilaiRataRata / 100).toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right pr-6 font-mono font-bold text-slate-900 group-hover/row:text-white transition-colors">
                            {c.nilaiTerbobot}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Total Row */}
                      <TableRow className="group/row bg-slate-50/90 hover:bg-[#091524] border-t-2 border-slate-200 transition-all duration-200 cursor-pointer">
                        <TableCell
                          colSpan={5}
                          className="pl-6 font-bold text-slate-900 group-hover/row:text-white transition-colors"
                        >
                          Total Akumulasi Skor SPK SAW
                        </TableCell>
                        <TableCell className="text-right pr-6 font-mono font-extrabold text-base text-blue-600 group-hover/row:text-amber-300 transition-colors">
                          {data.totalSkorSPK}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
