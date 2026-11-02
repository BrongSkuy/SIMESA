"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BookOpen,
  BarChart3,
  List,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type StatusType = "Hadir" | "Izin" | "Sakit" | "Alfa" | null;

interface AttendanceRecord {
  id: string;
  tanggal: string; // YYYY-MM-DD
  mapel: string;
  status: StatusType;
}

const months = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const statusTileMap: Record<string, string> = {
  Hadir: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Izin: "bg-amber-50 text-amber-700 border border-amber-200",
  Sakit: "bg-blue-50 text-blue-700 border border-blue-200",
  Alfa: "bg-rose-50 text-rose-700 border border-rose-200",
};

const statusPillMap: Record<string, string> = {
  Hadir: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Izin: "bg-amber-50 text-amber-700 border-amber-200",
  Sakit: "bg-blue-50 text-blue-700 border-blue-200",
  Alfa: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function SiswaAbsensiPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedMapel, setSelectedMapel] = useState("Semua");
  const [viewMode, setViewMode] = useState<"kalender" | "grafik">("kalender");

  useEffect(() => {
    fetch("/api/students/me/attendance")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAttendanceRecords(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const mapelList = useMemo(() => {
    const set = new Set<string>();
    attendanceRecords.forEach((r) => {
      if (r.mapel) set.add(r.mapel);
    });
    return Array.from(set).sort();
  }, [attendanceRecords]);

  const filteredRecords = useMemo(() => {
    if (selectedMapel === "Semua") return attendanceRecords;
    return attendanceRecords.filter((r) => r.mapel === selectedMapel);
  }, [attendanceRecords, selectedMapel]);

  const summary = useMemo(() => {
    const h = filteredRecords.filter((r) => r.status === "Hadir").length;
    const i = filteredRecords.filter((r) => r.status === "Izin").length;
    const s = filteredRecords.filter((r) => r.status === "Sakit").length;
    const a = filteredRecords.filter((r) => r.status === "Alfa").length;
    return { hadir: h, izin: i, sakit: s, alfa: a, total: h + i + s + a };
  }, [filteredRecords]);

  const perMapelChartData = useMemo(() => {
    const mapelMap: Record<
      string,
      { hadir: number; izin: number; sakit: number; alfa: number }
    > = {};
    attendanceRecords.forEach((r) => {
      const key = r.mapel || "Umum";
      if (!mapelMap[key])
        mapelMap[key] = { hadir: 0, izin: 0, sakit: 0, alfa: 0 };
      if (r.status === "Hadir") mapelMap[key].hadir++;
      else if (r.status === "Izin") mapelMap[key].izin++;
      else if (r.status === "Sakit") mapelMap[key].sakit++;
      else if (r.status === "Alfa") mapelMap[key].alfa++;
    });
    return Object.entries(mapelMap).map(([mapel, val]) => ({
      mapel,
      ...val,
    }));
  }, [attendanceRecords]);

  const generateCalendarData = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days: {
      date: number;
      status: StatusType;
      isWeekend: boolean;
      count: number;
    }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = new Date(year, month, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        d
      ).padStart(2, "0")}`;

      const dayRecords = filteredRecords.filter((r) => r.tanggal === dateStr);

      let displayStatus: StatusType = null;
      if (!isWeekend && dayRecords.length > 0) {
        if (dayRecords.some((r) => r.status === "Alfa")) displayStatus = "Alfa";
        else if (dayRecords.some((r) => r.status === "Sakit"))
          displayStatus = "Sakit";
        else if (dayRecords.some((r) => r.status === "Izin"))
          displayStatus = "Izin";
        else if (dayRecords.some((r) => r.status === "Hadir"))
          displayStatus = "Hadir";
      }

      days.push({
        date: d,
        status: isWeekend ? null : displayStatus,
        isWeekend,
        count: dayRecords.length,
      });
    }

    return { days, firstDay };
  };

  const { days, firstDay } = generateCalendarData(currentYear, currentMonth);
  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const dateCompare =
        new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
      if (dateCompare !== 0) return dateCompare;
      return (a.mapel || "").localeCompare(b.mapel || "");
    });
  }, [filteredRecords]);

  const recentHistory = sortedRecords.slice(0, 15);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-7 w-7 text-blue-600" />
      </div>
    );
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const attendancePct =
    summary.total > 0 ? Math.round((summary.hadir / summary.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Kehadiran & Presensi"
        badge="Portal Siswa"
        description="Rekam jejak kehadiran Anda per tanggal dan per mata pelajaran sepanjang semester"
        icon={CalendarCheck}
      />

      {/* Controls: Filter + View Toggle */}
      <div className="py-3.5 border-y border-slate-200 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2.5 flex-wrap">
          <BookOpen className="h-4 w-4 text-slate-400" />
          <Select
            value={selectedMapel}
            onValueChange={(val) => {
              if (val) setSelectedMapel(val);
            }}
          >
            <SelectTrigger className="w-[220px] h-9 text-xs">
              <SelectValue placeholder="Filter Mata Pelajaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua">Semua Mata Pelajaran</SelectItem>
              {mapelList.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedMapel !== "Semua" && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Filter: {selectedMapel}
            </span>
          )}
        </div>

        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as "kalender" | "grafik")}
        >
          <TabsList>
            <TabsTrigger value="kalender" className="gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5" /> Kalender Bulanan
            </TabsTrigger>
            <TabsTrigger value="grafik" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Grafik Per Mapel
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Stats */}
      <div className="border-y border-slate-200 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-2 sm:grid-cols-5 bg-white">
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Hadir
          </p>
          <p className="text-2xl font-bold tabular-nums text-emerald-600 mt-1">
            {summary.hadir}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Izin
          </p>
          <p className="text-2xl font-bold tabular-nums text-amber-600 mt-1">
            {summary.izin}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Sakit
          </p>
          <p className="text-2xl font-bold tabular-nums text-blue-600 mt-1">
            {summary.sakit}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Alfa
          </p>
          <p className="text-2xl font-bold tabular-nums text-rose-600 mt-1">
            {summary.alfa}
          </p>
        </div>
        <div className="p-4 col-span-2 sm:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            % Kehadiran
          </p>
          <p
            className={`text-2xl font-bold tabular-nums mt-1 ${
              summary.total > 0
                ? attendancePct >= 75
                  ? "text-emerald-600"
                  : "text-rose-600"
                : "text-slate-500"
            }`}
          >
            {attendancePct}%
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
          <span>Hadir</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" />
          <span>Izin</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-[#6366F1]" />
          <span>Sakit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" />
          <span>Alfa</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs bg-slate-200" />
          <span>Belum Ada / Akhir Pekan</span>
        </div>
      </div>

      {viewMode === "kalender" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <div className="lg:col-span-2 lg:border-r border-slate-200 lg:pr-8 space-y-4">
            <div className="flex flex-row items-center justify-between pb-3 border-b border-slate-200">
              <CardTitle className="text-sm font-semibold text-slate-900">
                {months[currentMonth]} {currentYear}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={handlePrevMonth}
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={handleNextMonth}
                  aria-label="Bulan selanjutnya"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="pt-1">
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {dayNames.map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400 py-1.5"
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {days.map((day) => (
                  <div
                    key={day.date}
                    className={`relative flex h-10 items-center justify-center rounded-lg text-xs font-mono font-semibold transition-colors ${
                      day.isWeekend
                        ? "bg-slate-100/70 text-slate-400"
                        : day.status
                          ? statusTileMap[day.status]
                          : "bg-slate-50/70 text-slate-500 border border-slate-100"
                    }`}
                    title={
                      day.count > 1
                        ? `${day.count} catatan absensi`
                        : undefined
                    }
                  >
                    {day.date}
                    {day.count > 1 && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 px-1 items-center justify-center rounded-xs bg-[#1e3a8a] text-[10px] font-bold text-white shadow-xs">
                        {day.count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent History */}
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-200">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <List className="h-4 w-4 text-blue-600" />
                Log Presensi Terkini
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                15 catatan kehadiran terakhir Anda
              </CardDescription>
            </div>
            <div className="border-b border-slate-200">
              <div className="max-h-[430px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Tanggal</TableHead>
                      <TableHead>Mapel</TableHead>
                      <TableHead className="text-right pr-5">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentHistory.length > 0 ? (
                      recentHistory.map((r, i) => {
                        try {
                          const parsedDate = new Date(r.tanggal);
                          const formattedDate = new Intl.DateTimeFormat(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          ).format(parsedDate);
                          const hariName = new Intl.DateTimeFormat("id-ID", {
                            weekday: "long",
                          }).format(parsedDate);

                          return (
                            <TableRow
                              key={`${r.id}-${i}`}
                              className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 last:border-0"
                            >
                              <TableCell className="pl-5">
                                <p className="text-xs font-semibold text-slate-800 group-hover/row:text-white transition-colors">
                                  {formattedDate}
                                </p>
                                <p className="text-xs text-slate-400 group-hover/row:text-slate-500 transition-colors">
                                  {hariName}
                                </p>
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 group-hover/row:bg-slate-800 text-slate-700 group-hover/row:text-slate-300 border border-slate-200 group-hover/row:border-slate-700 transition-colors">
                                  {r.mapel || "Umum"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right pr-5">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border transition-colors ${
                                    r.status
                                      ? statusPillMap[r.status]
                                      : "bg-slate-100 text-slate-500 border-slate-200"
                                  }`}
                                >
                                  {r.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        } catch {
                          return null;
                        }
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center py-10 text-xs text-slate-500"
                        >
                          Belum ada data riwayat presensi.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Grafik Per Mapel View */
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl group space-y-4 cursor-pointer">
            <div className="pb-3.5 border-b border-slate-100 group-hover:border-slate-800/80 transition-colors">
              <CardTitle className="text-sm font-semibold text-slate-900 group-hover:text-white flex items-center gap-2 transition-colors">
                <BarChart3 className="h-4 w-4 text-blue-600 group-hover:text-blue-400 transition-colors" />
                Grafik Kehadiran Per Mata Pelajaran
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 group-hover:text-slate-400 mt-0.5 transition-colors">
                Perbandingan frekuensi status kehadiran pada setiap mata
                pelajaran
              </CardDescription>
            </div>
            <div className="pt-2">
              <div className="h-[340px]">
                {perMapelChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perMapelChartData} barGap={2}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148, 163, 184, 0.18)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="mapel"
                        tick={{ fontSize: 11, fill: "#94A3B8" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94A3B8" }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
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
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: "12px" }}
                      />
                      <Bar
                        dataKey="hadir"
                        name="Hadir"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="izin"
                        name="Izin"
                        fill="#F59E0B"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="sakit"
                        name="Sakit"
                        fill="#6366F1"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="alfa"
                        name="Alfa"
                        fill="#F43F5E"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <p className="text-xs">Belum ada data untuk ditampilkan</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-600" />
                Rincian Per Mapel
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Akumulasi H / I / S / A tiap mata pelajaran
              </CardDescription>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Mapel</TableHead>
                    <TableHead className="text-center">H</TableHead>
                    <TableHead className="text-center">I</TableHead>
                    <TableHead className="text-center">S</TableHead>
                    <TableHead className="text-center pr-5">A</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perMapelChartData.map((row) => (
                    <TableRow
                      key={row.mapel}
                      className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 last:border-0"
                    >
                      <TableCell className="pl-5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 group-hover/row:bg-slate-800 text-slate-700 group-hover/row:text-slate-300 border border-slate-200 group-hover/row:border-slate-700 transition-colors">
                          {row.mapel}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold text-emerald-600 group-hover/row:text-emerald-400 transition-colors">
                        {row.hadir}
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold text-amber-600 group-hover/row:text-amber-400 transition-colors">
                        {row.izin}
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold text-blue-600 group-hover/row:text-blue-400 transition-colors">
                        {row.sakit}
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold text-rose-600 group-hover/row:text-rose-400 pr-5 transition-colors">
                        {row.alfa}
                      </TableCell>
                    </TableRow>
                  ))}
                  {perMapelChartData.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-10 text-xs text-slate-500"
                      >
                        Belum ada data absensi.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
