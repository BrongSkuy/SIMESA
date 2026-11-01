"use client";

import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { BarChart3, Loader2, Download, Users, CheckCircle2 } from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StudentRekap {
  id: string;
  nama: string;
  nis: string;
  hadir: number;
  izin: number;
  sakit: number;
  alfa: number;
  persen: number;
  nilai?: Record<string, number>;
}

interface ClassData {
  id: string;
  namaKelas: string;
}

interface SubjectData {
  namaMapel: string;
  kelas?: string[];
}

const CHART_COLORS: Record<string, string> = {
  Hadir: "#10B981",
  Izin: "#F59E0B",
  Sakit: "#3B82F6",
  Alfa: "#F43F5E",
};

export default function GuruRekapPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedTanggal, setSelectedTanggal] = useState<string>("");
  const [selectedMapel, setSelectedMapel] = useState<string>(
    "Semua Mata Pelajaran"
  );
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [isWaliKelas, setIsWaliKelas] = useState(false);
  const [waliClasses, setWaliClasses] = useState<string[]>([]);
  const [rekapData, setRekapData] = useState<StudentRekap[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRekap, setLoadingRekap] = useState(false);

  useEffect(() => {
    const queryKelas =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("kelas")
        : null;

    Promise.all([
      fetch("/api/classes").then((res) => res.json()),
      fetch("/api/teachers/me/subjects")
        .then((res) => res.json())
        .catch(() => ({
          classes: [],
          subjects: [],
          waliClasses: [],
          isWaliKelas: false,
        })),
    ])
      .then(([classesData, subjectsRes]) => {
        if (!Array.isArray(classesData)) {
          setClasses([]);
          setLoading(false);
          return;
        }

        const isWali = subjectsRes.isWaliKelas || false;
        const wClasses = subjectsRes.waliClasses || [];
        const assignedClasses = subjectsRes.classes || [];
        const subjectsData = subjectsRes.subjects || [];

        setIsWaliKelas(isWali);
        setWaliClasses(wClasses);
        setSubjects(subjectsData);

        const filteredClasses = classesData.filter((c: ClassData) =>
          assignedClasses.includes(c.namaKelas)
        );

        setClasses(filteredClasses);
        if (filteredClasses.length > 0) {
          const matched =
            queryKelas &&
            filteredClasses.some((c: ClassData) => c.namaKelas === queryKelas)
              ? queryKelas
              : filteredClasses[0].namaKelas;
          setSelectedClass(matched);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingRekap(true);
    let url = `/api/attendance/rekap?kelas=${encodeURIComponent(selectedClass)}`;
    if (selectedTanggal) url += `&tanggal=${selectedTanggal}`;
    if (selectedMapel && selectedMapel !== "Semua Mata Pelajaran")
      url += `&mapel=${encodeURIComponent(selectedMapel)}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          console.error("API Error: ", data);
          setRekapData([]);
          setLoadingRekap(false);
          return;
        }
        setRekapData(data);
        setLoadingRekap(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingRekap(false);
      });
  }, [selectedClass, selectedTanggal, selectedMapel]);

  const { chartData, avgPersen, totalHadir, totalAbsen } = useMemo(() => {
    let hadir = 0,
      izin = 0,
      sakit = 0,
      alfa = 0,
      sumPersen = 0;
    rekapData.forEach((r) => {
      hadir += r.hadir;
      izin += r.izin;
      sakit += r.sakit;
      alfa += r.alfa;
      sumPersen += r.persen;
    });
    return {
      chartData: [
        { status: "Hadir", jumlah: hadir },
        { status: "Izin", jumlah: izin },
        { status: "Sakit", jumlah: sakit },
        { status: "Alfa", jumlah: alfa },
      ],
      avgPersen:
        rekapData.length > 0 ? Math.round(sumPersen / rekapData.length) : 0,
      totalHadir: hadir,
      totalAbsen: izin + sakit + alfa,
    };
  }, [rekapData]);

  const criteriaKeys = useMemo(() => {
    if (rekapData.length === 0) return [];
    const keys = new Set<string>();
    rekapData.forEach((r) => {
      if (r.nilai) Object.keys(r.nilai).forEach((k) => keys.add(k));
    });
    return Array.from(keys);
  }, [rekapData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-7 w-7 text-blue-600" />
      </div>
    );
  }

  const handleExport = () => {
    if (!rekapData || rekapData.length === 0) return;
    const templateData = rekapData.map((s, i) => {
      const baseRow: Record<string, string | number> = {
        No: i + 1,
        NIS: s.nis,
        NamaSiswa: s.nama,
        Hadir: s.hadir,
        Izin: s.izin,
        Sakit: s.sakit,
        Alfa: s.alfa,
        "Persentase (%)": s.persen,
      };
      criteriaKeys.forEach((k) => {
        baseRow[`Nilai ${k}`] = s.nilai?.[k] || 0;
      });
      return baseRow;
    });
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Kelas");
    XLSX.writeFile(wb, `Rekap_Kehadiran_Nilai_Kelas_${selectedClass}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rekapitulasi Kelas Diampu"
        badge="Portal Guru"
        description="Ringkasan akumulasi presensi dan nilai kriteria SPK siswa pada kelas penugasan Anda"
        icon={BarChart3}
      >
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleExport}
          disabled={rekapData.length === 0}
        >
          <Download className="h-3.5 w-3.5 text-slate-500" /> Ekspor Rekap Excel
        </Button>
      </PageHeader>

      {classes.length === 0 ? (
        <div className="border border-slate-200 py-12 text-center text-xs text-slate-500">

            Anda belum memiliki penugasan kelas.
        </div>

      ) : (
        <Tabs
          value={selectedClass}
          onValueChange={(val) => {
            setSelectedClass(val);
            if (selectedMapel === "Umum" && !waliClasses.includes(val)) {
              setSelectedMapel("Semua Mata Pelajaran");
            }
          }}
        >
          <TabsList className="flex flex-wrap h-auto">
            {classes.map((c) => (
              <TabsTrigger key={c.id} value={c.namaKelas}>
                Kelas {c.namaKelas}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedClass} className="space-y-6 mt-4">
            {loadingRekap ? (
              <div className="flex py-16 justify-center">
                <Loader2 className="animate-spin h-7 w-7 text-blue-600" />
              </div>
            ) : (
              <>
                {/* Dark KPI Row */}
                <div className="border-y border-slate-200 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid sm:grid-cols-3 bg-white">
                  <StatCard
                    title={`Siswa Kelas ${selectedClass}`}
                    value={rekapData.length}
                    icon={Users}
                    color="blue"
                    footerLeft="Peserta didik terdaftar"
                  />
                  <StatCard
                    title="Rata-rata Kehadiran"
                    value={`${avgPersen}%`}
                    icon={CheckCircle2}
                    color="emerald"
                    footerLeft={`${totalHadir} total presensi hadir`}
                  />
                  <StatCard
                    title="Total Ketidakhadiran"
                    value={totalAbsen}
                    icon={BarChart3}
                    color="amber"
                    footerLeft="Gabungan Izin, Sakit & Alfa"
                  />
                </div>

                {/* Chart */}
                <div className="pt-2 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
                    <div>
                      <CardTitle className="text-sm font-semibold text-slate-900">
                        Distribusi Kehadiran Tersimpan
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Kelas {selectedClass} ·{" "}
                        {selectedTanggal
                          ? `Tanggal: ${selectedTanggal}`
                          : "Akumulasi Keseluruhan"}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={selectedMapel}
                        onValueChange={(val) =>
                          setSelectedMapel(val || "Semua Mata Pelajaran")
                        }
                      >
                        <SelectTrigger className="w-[200px] h-8 text-xs">
                          <SelectValue placeholder="Pilih Mata Pelajaran" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Semua Mata Pelajaran">
                            Semua Mata Pelajaran
                          </SelectItem>
                          {isWaliKelas &&
                            waliClasses.includes(selectedClass) && (
                              <SelectItem value="Umum">
                                Umum / Wali Kelas
                              </SelectItem>
                            )}
                          {subjects
                            .filter((m) => m.kelas?.includes(selectedClass))
                            .map((m, i) => (
                              <SelectItem key={i} value={m.namaMapel}>
                                {m.namaMapel}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        value={selectedTanggal}
                        onChange={(e) => setSelectedTanggal(e.target.value)}
                        className="w-auto h-8 text-xs"
                      />
                      {selectedTanggal && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setSelectedTanggal("")}
                        >
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="pt-2">
                    <div className="h-[230px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData}
                          layout="vertical"
                          barSize={26}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#E2E8F0"
                            horizontal={false}
                          />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 11, fill: "#64748B" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="status"
                            tick={{
                              fontSize: 12,
                              fill: "#334155",
                              fontWeight: 600,
                            }}
                            axisLine={false}
                            tickLine={false}
                            width={65}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#0F172A",
                              color: "#F8FAFC",
                              borderRadius: "8px",
                              border: "1px solid #1E293B",
                              fontSize: "12px",
                            }}
                            itemStyle={{ color: "#F8FAFC" }}
                          />
                          <Bar dataKey="jumlah" radius={[0, 6, 6, 0]}>
                            {chartData.map((entry) => (
                              <Cell
                                key={entry.status}
                                fill={CHART_COLORS[entry.status] || "#2563EB"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Detail Table */}
                <div className="pt-2 space-y-3">
                  <div className="pb-3 border-b border-slate-200">
                    <CardTitle className="text-sm font-semibold text-slate-900">
                      Matriks Detail Per Siswa
                    </CardTitle>
                  </div>
                  <div className="border-b border-slate-200 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-6 whitespace-nowrap">
                            NIS
                          </TableHead>
                          <TableHead className="whitespace-nowrap min-w-[200px]">
                            Nama Siswa
                          </TableHead>
                          <TableHead className="text-center whitespace-nowrap">
                            Hadir
                          </TableHead>
                          <TableHead className="text-center whitespace-nowrap">
                            Izin
                          </TableHead>
                          <TableHead className="text-center whitespace-nowrap">
                            Sakit
                          </TableHead>
                          <TableHead className="text-center whitespace-nowrap">
                            Alfa
                          </TableHead>
                          <TableHead className="text-right whitespace-nowrap pr-6">
                            % Kehadiran
                          </TableHead>
                          {criteriaKeys.map((k, idx) => (
                            <TableHead
                              key={k}
                              className={`text-right whitespace-nowrap min-w-[110px] ${
                                idx === criteriaKeys.length - 1 ? "pr-6" : ""
                              }`}
                            >
                              {k}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rekapData.length > 0 ? (
                          rekapData.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="pl-6 font-mono text-slate-600 whitespace-nowrap">
                                {r.nis}
                              </TableCell>
                              <TableCell className="font-semibold text-slate-800 whitespace-nowrap">
                                {r.nama}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex min-w-7 justify-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {r.hadir}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex min-w-7 justify-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  {r.izin}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex min-w-7 justify-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-blue-50 text-[#1e3a8a] border border-blue-200">
                                  {r.sakit}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex min-w-7 justify-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  {r.alfa}
                                </span>
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap pr-6">
                                <div className="inline-flex items-center justify-end gap-2">
                                  <div className="w-14 bg-slate-100 h-1.5 rounded-xs overflow-hidden hidden sm:block">
                                    <div
                                      className="bg-[#1e3a8a] h-full rounded-xs"
                                      style={{
                                        width: `${Math.min(100, Math.max(0, r.persen))}%`,
                                      }}
                                    />
                                  </div>
                                  <span
                                    className={`font-mono font-bold ${
                                      r.persen >= 90
                                        ? "text-emerald-700"
                                        : r.persen >= 75
                                          ? "text-amber-700"
                                          : "text-rose-700"
                                    }`}
                                  >
                                    {r.persen}%
                                  </span>
                                </div>
                              </TableCell>
                              {criteriaKeys.map((k, idx) => (
                                <TableCell
                                  key={k}
                                  className={`text-right font-mono font-semibold text-slate-700 whitespace-nowrap ${
                                    idx === criteriaKeys.length - 1
                                      ? "pr-6"
                                      : ""
                                  }`}
                                >
                                  {r.nilai?.[k] || 0}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={7 + criteriaKeys.length}
                              className="text-center py-10 text-slate-500"
                            >
                              Belum ada data siswa di kelas ini.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
