"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AttendanceHistoryMatrixRecord {
  id: string;
  nis: string;
  nama: string;
  history: Record<string, string>;
}

export interface AttendanceHistoryMatrixData {
  dates: string[];
  records: AttendanceHistoryMatrixRecord[];
}

const DEFAULT_STATUS_BADGE: Record<string, string> = {
  Hadir: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Izin: "bg-amber-50 text-amber-700 border-amber-200",
  Sakit: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Alfa: "bg-rose-50 text-rose-700 border-rose-200",
};

interface AttendanceHistoryMatrixProps {
  selectedMapel: string;
  loadingHistory: boolean;
  historyData: AttendanceHistoryMatrixData;
  windowSize: number;
  viewAllDates: boolean;
  onViewAllDatesChange: (val: boolean) => void;
  visibleDates: string[];
  currentStartNum: number;
  currentEndNum: number;
  totalDatesCount: number;
  canPrev: boolean;
  canNext: boolean;
  onPrevDates: () => void;
  onNextDates: () => void;
  onExportMatrix: () => void;
  statusHistoryBadge?: Record<string, string>;
  titlePrefix?: string;
  exportButtonLabel?: string;
}

export function AttendanceHistoryMatrix({
  selectedMapel,
  loadingHistory,
  historyData,
  windowSize,
  viewAllDates,
  onViewAllDatesChange,
  visibleDates,
  currentStartNum,
  currentEndNum,
  totalDatesCount,
  canPrev,
  canNext,
  onPrevDates,
  onNextDates,
  onExportMatrix,
  statusHistoryBadge = DEFAULT_STATUS_BADGE,
  titlePrefix = "Matriks Riwayat Kehadiran",
  exportButtonLabel = "Ekspor Rekap Matriks",
}: AttendanceHistoryMatrixProps) {
  const grandTotals = historyData.dates.reduce(
    (acc, date) => {
      historyData.records.forEach((s) => {
        const st = s.history[date];
        if (st === "Hadir") acc.h++;
        else if (st === "Izin") acc.i++;
        else if (st === "Sakit") acc.s++;
        else if (st === "Alfa") acc.a++;
      });
      return acc;
    },
    { h: 0, i: 0, s: 0, a: 0 }
  );
  const grandTotalAll =
    grandTotals.h + grandTotals.i + grandTotals.s + grandTotals.a;
  const grandTotalPct =
    grandTotalAll > 0 ? Math.round((grandTotals.h / grandTotalAll) * 100) : 0;

  return (
    <div className="pt-2 space-y-4">
      <div className="pb-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            {titlePrefix} ({selectedMapel})
            {loadingHistory && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
            )}
          </h3>
          <p className="text-xs text-slate-500">
            Rekam jejak presensi seluruh pertemuan yang telah tersimpan untuk
            mata pelajaran ini
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {historyData.dates.length > windowSize && (
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => onViewAllDatesChange(false)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                  !viewAllDates
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                5 Hari
              </button>
              <button
                type="button"
                onClick={() => onViewAllDatesChange(true)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                  viewAllDates
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Semua ({historyData.dates.length})
              </button>
            </div>
          )}

          {historyData.dates.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportMatrix}
              className="h-8 gap-1.5 text-xs font-semibold bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs self-start md:self-auto"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              {exportButtonLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Legend & Pagination Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-700">Keterangan:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded border bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
              H
            </span>
            <span className="text-slate-600 font-medium">Hadir</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded border bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
              I
            </span>
            <span className="text-slate-600 font-medium">Izin</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded border bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
              S
            </span>
            <span className="text-slate-600 font-medium">Sakit</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded border bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
              A
            </span>
            <span className="text-slate-600 font-medium">Alfa</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-400">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded border bg-slate-100 text-slate-400 border-slate-200 text-[10px] font-bold">
              -
            </span>
            <span>Belum Tercatat</span>
          </span>
        </div>

        {historyData.dates.length > windowSize && !viewAllDates ? (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[11px] font-medium text-slate-600 tabular-nums">
              Pertemuan{" "}
              <span className="font-bold text-slate-900">
                {currentStartNum}–{currentEndNum}
              </span>{" "}
              dari{" "}
              <span className="font-bold text-slate-900">
                {totalDatesCount}
              </span>
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 bg-white border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-40"
                onClick={onPrevDates}
                disabled={!canPrev}
                title="5 Pertemuan Sebelumnya"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 bg-white border-slate-200 hover:bg-slate-100 text-slate-700 disabled:opacity-40"
                onClick={onNextDates}
                disabled={!canNext}
                title="5 Pertemuan Berikutnya"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400 italic">
            * Kolom No, NIS, &amp; Nama Siswa terkunci (sticky) saat digulir
          </span>
        )}
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
        {historyData.dates.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Belum ada riwayat absensi yang disimpan untuk mata pelajaran ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                <tr>
                  <th className="sticky left-0 z-20 bg-slate-50 px-3 py-3 font-semibold w-12 min-w-[48px] text-center border-r border-slate-200">
                    No
                  </th>
                  <th className="sticky left-12 z-20 bg-slate-50 px-3 py-3 font-semibold w-24 min-w-[96px] text-center border-r border-slate-200">
                    NIS
                  </th>
                  <th className="sticky left-[144px] z-20 bg-slate-50 px-4 py-3 font-semibold min-w-[200px] border-r-2 border-slate-300 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.06)]">
                    Nama Siswa
                  </th>

                  {visibleDates.map((date) => {
                    const dateObj = new Date(`${date}T00:00:00`);
                    const dayName = dateObj.toLocaleDateString("id-ID", {
                      weekday: "short",
                    });
                    const dayMonth = dateObj.toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                    });
                    const isWeekend =
                      dateObj.getDay() === 0 || dateObj.getDay() === 6;
                    return (
                      <th
                        key={date}
                        className={`px-3 py-2.5 text-center font-semibold whitespace-nowrap border-r border-slate-100 ${
                          isWeekend ? "bg-amber-50/60 text-amber-900" : ""
                        }`}
                      >
                        <div className="text-[10px] text-slate-400 font-normal uppercase">
                          {dayName}
                        </div>
                        <div className="text-xs text-slate-700 font-semibold">
                          {dayMonth}
                        </div>
                      </th>
                    );
                  })}

                  <th
                    className="px-3 py-2.5 text-center font-bold text-emerald-700 bg-emerald-50/60 border-l-2 border-slate-300 w-12 min-w-[48px]"
                    title="Total Hadir"
                  >
                    H
                  </th>
                  <th
                    className="px-3 py-2.5 text-center font-bold text-amber-700 bg-amber-50/60 border-l border-slate-200 w-12 min-w-[48px]"
                    title="Total Izin"
                  >
                    I
                  </th>
                  <th
                    className="px-3 py-2.5 text-center font-bold text-indigo-700 bg-indigo-50/60 border-l border-slate-200 w-12 min-w-[48px]"
                    title="Total Sakit"
                  >
                    S
                  </th>
                  <th
                    className="px-3 py-2.5 text-center font-bold text-rose-700 bg-rose-50/60 border-l border-slate-200 w-12 min-w-[48px]"
                    title="Total Alfa"
                  >
                    A
                  </th>
                  <th
                    className="px-3.5 py-2.5 text-center font-bold text-slate-700 bg-slate-100/80 border-l border-slate-200 min-w-[76px]"
                    title="Persentase Kehadiran"
                  >
                    % Hadir
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {historyData.records.map((siswa, index) => {
                  const counts = historyData.dates.reduce(
                    (acc, d) => {
                      const st = siswa.history[d];
                      if (st === "Hadir") acc.h++;
                      else if (st === "Izin") acc.i++;
                      else if (st === "Sakit") acc.s++;
                      else if (st === "Alfa") acc.a++;
                      return acc;
                    },
                    { h: 0, i: 0, s: 0, a: 0 }
                  );
                  const totalM = counts.h + counts.i + counts.s + counts.a;
                  const pct =
                    totalM > 0 ? Math.round((counts.h / totalM) * 100) : 0;
                  const pctBadgeClass =
                    pct >= 85
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : pct >= 70
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200";

                  return (
                    <tr
                      key={siswa.id}
                      className="transition-colors hover:bg-slate-50/90"
                    >
                      <td className="sticky left-0 z-10 w-12 min-w-[48px] bg-white px-3 py-2.5 text-slate-500 tabular-nums text-center border-r border-slate-200 font-mono">
                        {index + 1}
                      </td>
                      <td className="sticky left-12 z-10 w-24 min-w-[96px] bg-white px-3 py-2.5 tabular-nums text-slate-600 text-center border-r border-slate-200 font-mono">
                        {siswa.nis}
                      </td>
                      <td className="sticky left-[144px] z-10 min-w-[200px] bg-white px-4 py-2.5 font-semibold text-slate-800 border-r-2 border-slate-300 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.06)]">
                        {siswa.nama}
                      </td>

                      {visibleDates.map((date) => {
                        const status = siswa.history[date];
                        const pillStyle =
                          statusHistoryBadge[status] ||
                          "bg-slate-50 text-slate-400 border-slate-200";
                        const shortCode =
                          status === "Hadir"
                            ? "H"
                            : status === "Izin"
                              ? "I"
                              : status === "Sakit"
                                ? "S"
                                : status === "Alfa"
                                  ? "A"
                                  : "-";
                        return (
                          <td
                            key={date}
                            className="px-2.5 py-2 text-center border-r border-slate-100"
                          >
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs font-bold ${pillStyle}`}
                            >
                              {shortCode}
                            </span>
                          </td>
                        );
                      })}

                      <td className="px-3 py-2 text-center font-bold text-emerald-700 bg-emerald-50/30 border-l-2 border-slate-300 tabular-nums">
                        {counts.h}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-amber-700 bg-amber-50/30 border-l border-slate-200 tabular-nums">
                        {counts.i}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-indigo-700 bg-indigo-50/30 border-l border-slate-200 tabular-nums">
                        {counts.s}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-rose-700 bg-rose-50/30 border-l border-slate-200 tabular-nums">
                        {counts.a}
                      </td>
                      <td className="px-3 py-2 text-center border-l border-slate-200">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold border tabular-nums ${pctBadgeClass}`}
                        >
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot className="bg-slate-50 font-semibold text-xs border-t-2 border-slate-300">
                <tr>
                  <td
                    colSpan={3}
                    className="sticky left-0 z-20 bg-slate-100 px-4 py-2.5 text-slate-700 border-r-2 border-slate-300 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.06)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Total Hadir Harian</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        ({historyData.records.length} Siswa)
                      </span>
                    </div>
                  </td>

                  {visibleDates.map((date) => {
                    const dailyHadir = historyData.records.filter(
                      (r) => r.history[date] === "Hadir"
                    ).length;
                    return (
                      <td
                        key={date}
                        className="px-2 py-2 text-center border-r border-slate-100"
                      >
                        <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          {dailyHadir}
                        </span>
                      </td>
                    );
                  })}

                  <td className="px-3 py-2 text-center font-bold text-emerald-800 bg-emerald-100/70 border-l-2 border-slate-300 tabular-nums">
                    {grandTotals.h}
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-amber-800 bg-amber-100/70 border-l border-slate-200 tabular-nums">
                    {grandTotals.i}
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-indigo-800 bg-indigo-100/70 border-l border-slate-200 tabular-nums">
                    {grandTotals.s}
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-rose-800 bg-rose-100/70 border-l border-slate-200 tabular-nums">
                    {grandTotals.a}
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-slate-800 bg-slate-200/80 border-l border-slate-200 tabular-nums">
                    {grandTotalPct}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
