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
import { CardDescription, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const CHART_COLORS: Record<string, string> = {
  Hadir: "#10B981",
  Izin: "#F59E0B",
  Sakit: "#6366F1",
  Alfa: "#F43F5E",
};

export default function AdminRekapPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [rekapData, setRekapData] = useState<StudentRekap[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRekap, setLoadingRekap] = useState(false);

  useEffect(() => {
    fetch("/api/classes")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          console.error("API Error: ", data);
          setClasses([]);
          setLoading(false);
          return;
        }
        setClasses(data);
        if (data.length > 0) {
          setSelectedClass(data[0].namaKelas);
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
    fetch(`/api/attendance/rekap?kelas=${encodeURIComponent(selectedClass)}`)
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
  }, [selectedClass]);

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
        title="Rekapitulasi Kehadiran & Nilai"
        badge="Analitik Kelas"
        description="Pantau matriks akumulasi presensi dan perolehan nilai kriteria SPK per rombongan belajar"
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
          Belum ada data kelas terdaftar.
        </div>
      ) : (
        <Tabs value={selectedClass} onValueChange={setSelectedClass}>
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
                {/* KPI Row */}
                <div className="rounded-2xl border border-slate-200 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid sm:grid-cols-3 bg-white overflow-hidden shadow-xs">
                  <StatCard
                    title={`Siswa Kelas ${selectedClass}`}
                    value={rekapData.length}
                    icon={Users}
                    color="blue"
                    footerLeft="Peserta didik terdaftar"
                    footerRight="Rombel Aktif"
                  />
                  <StatCard
                    title="Rata-rata Kehadiran"
                    value={`${avgPersen}%`}
                    icon={CheckCircle2}
                    color="emerald"
                    footerLeft={`${totalHadir} total presensi hadir`}
                    footerRight="Akumulasi"
                  />
                  <StatCard
                    title="Total Ketidakhadiran"
                    value={totalAbsen}
                    icon={BarChart3}
                    color="amber"
                    footerLeft="Gabungan Izin, Sakit & Alfa"
                    footerRight="Log Sesi"
                  />
                </div>

                {/* Chart */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl group space-y-3 cursor-pointer">
                  <div className="pb-3.5 border-b border-slate-100 group-hover:border-slate-800/80 transition-colors">
                    <CardTitle className="text-base font-semibold text-slate-900 group-hover:text-white tracking-tight transition-colors">
                      Distribusi Status Kehadiran Tersimpan
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 group-hover:text-slate-400 mt-0.5 transition-colors">
                      Kelas {selectedClass} · Perbandingan frekuensi Hadir,
                      Izin, Sakit, dan Alfa
                    </CardDescription>
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
                            stroke="rgba(148, 163, 184, 0.18)"
                            horizontal={false}
                          />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 11, fill: "#94A3B8" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="status"
                            tick={{ fontSize: 12, fill: "#94A3B8", fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            width={65}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#091524",
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
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-3">
                  <div className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
                      Matriks Rekapitulasi Per Siswa
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Rincian kehadiran dan rata-rata nilai kriteria untuk Kelas{" "}
                      {selectedClass}
                    </CardDescription>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-6">NIS</TableHead>
                          <TableHead>Nama Siswa</TableHead>
                          <TableHead className="text-center">Hadir</TableHead>
                          <TableHead className="text-center">Izin</TableHead>
                          <TableHead className="text-center">Sakit</TableHead>
                          <TableHead className="text-center">Alfa</TableHead>
                          <TableHead className="text-right pr-6">
                            % Kehadiran
                          </TableHead>
                          {criteriaKeys.map((k) => (
                            <TableHead key={k} className="text-right pr-5">
                              {k}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rekapData.length > 0 ? (
                          rekapData.map((r) => (
                            <TableRow
                              key={r.id}
                              className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 last:border-0"
                            >
                              <TableCell className="pl-6 font-mono text-slate-600 group-hover/row:text-slate-400 transition-colors">
                                {r.nis}
                              </TableCell>
                              <TableCell className="font-semibold text-slate-800 group-hover/row:text-white transition-colors">
                                {r.nama}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex min-w-7 justify-center px-2 py-0.5 rounded-md text-xs tabular-nums font-semibold bg-emerald-50 group-hover/row:bg-emerald-500/15 text-emerald-700 group-hover/row:text-emerald-300 border border-emerald-200 group-hover/row:border-emerald-500/30 transition-colors">
                                  {r.hadir}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex min-w-7 justify-center px-2 py-0.5 rounded-md text-xs tabular-nums font-semibold bg-amber-50 group-hover/row:bg-amber-500/15 text-amber-700 group-hover/row:text-amber-300 border border-amber-200 group-hover/row:border-amber-500/30 transition-colors">
                                  {r.izin}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex min-w-7 justify-center px-2 py-0.5 rounded-md text-xs tabular-nums font-semibold bg-blue-50 group-hover/row:bg-blue-500/15 text-blue-700 group-hover/row:text-blue-300 border border-blue-200 group-hover/row:border-blue-500/30 transition-colors">
                                  {r.sakit}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="inline-flex min-w-7 justify-center px-2 py-0.5 rounded-md text-xs tabular-nums font-semibold bg-rose-50 group-hover/row:bg-rose-500/15 text-rose-700 group-hover/row:text-rose-300 border border-rose-200 group-hover/row:border-rose-500/30 transition-colors">
                                  {r.alfa}
                                </span>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="inline-flex items-center justify-end gap-2">
                                  <div className="w-14 bg-slate-100 group-hover/row:bg-slate-800 h-1.5 rounded-xs overflow-hidden hidden sm:block transition-colors">
                                    <div
                                      className="bg-[#1e3a8a] group-hover/row:bg-blue-500 h-full rounded-xs transition-colors"
                                      style={{
                                        width: `${Math.min(100, Math.max(0, r.persen))}%`,
                                      }}
                                    />
                                  </div>
                                  <span
                                    className={`font-mono font-bold transition-colors ${
                                      r.persen >= 90
                                        ? "text-emerald-700 group-hover/row:text-emerald-400"
                                        : r.persen >= 75
                                          ? "text-amber-700 group-hover/row:text-amber-400"
                                          : "text-rose-700 group-hover/row:text-rose-400"
                                    }`}
                                  >
                                    {r.persen}%
                                  </span>
                                </div>
                              </TableCell>
                              {criteriaKeys.map((k) => (
                                <TableCell
                                  key={k}
                                  className="text-right pr-5 font-mono font-semibold text-slate-700 group-hover/row:text-slate-300 transition-colors"
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
