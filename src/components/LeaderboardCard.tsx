"use client";

import React from "react";
import { Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export const LEADERBOARD_ITEMS_PER_PAGE = 15;

export interface LeaderboardCardProps {
  title?: string;
  subtitle?: string;
  period?: string;
  badgeMethod?: string;
  activeTab?: string;
  onTabChange?: (val: string) => void;
  classes?: Array<{ id: string; namaKelas: string }>;
  showTabs?: boolean;
  onDetailClick?: () => void;
  onDownloadClick?: () => void;
  children?: React.ReactNode;
}

export interface LeaderboardPaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
}

export function LeaderboardPagination({
  currentPage,
  totalItems,
  itemsPerPage = LEADERBOARD_ITEMS_PER_PAGE,
  onPageChange,
}: LeaderboardPaginationProps) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  // Build visible page numbers with ellipsis for large datasets (e.g., 100+ students)
  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis")[] = [1];
    if (safePage > 3) {
      pages.push("ellipsis");
    }
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    if (safePage < totalPages - 2) {
      pages.push("ellipsis");
    }
    pages.push(totalPages);
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="hide-on-print flex items-center justify-center pt-4 px-2 border-t border-slate-100">
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs gap-1 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 disabled:opacity-40 cursor-pointer"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sebelumnya</span>
        </Button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) =>
            p === "ellipsis" ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-1.5 text-xs text-slate-400 select-none"
              >
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`h-8 min-w-8 px-2 rounded-md text-xs font-semibold tabular-nums border transition-colors cursor-pointer ${
                  p === safePage
                    ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-2xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
                }`}
                aria-label={`Halaman ${p}`}
                aria-current={p === safePage ? "page" : undefined}
              >
                {p}
              </button>
            )
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs gap-1 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 disabled:opacity-40 cursor-pointer"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
        >
          <span className="hidden sm:inline">Selanjutnya</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function LeaderboardCard({
  title = "Tabel Peringkat Siswa Berprestasi",
  subtitle = "Pemeringkatan siswa berdasarkan evaluasi multi-kriteria metode SAW",
  period = "Aktif",
  badgeMethod = "Metode SAW Multi-Kriteria",
  activeTab = "umum",
  onTabChange,
  classes = [],
  showTabs = true,
  onDetailClick,
  onDownloadClick,
  children,
}: LeaderboardCardProps) {
  return (
    <div className="rounded-xl bg-white border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
      {/* Header Row: Left-aligned institutional masthead */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 border border-amber-200/80 text-amber-600 mt-0.5">
            <Trophy
              className="w-5 h-5"
              aria-label="Trofi Peringkat Siswa"
            />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {title}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl">
              {subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                {badgeMethod}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-800 rounded-md border border-amber-200/90">
                Periode: {period}
              </span>
            </div>
          </div>
        </div>

        {/* Optional Interactive Actions */}
        {(onDetailClick || onDownloadClick) && (
          <div className="flex items-center gap-2 shrink-0 hide-on-print">
            {onDetailClick && (
              <button
                type="button"
                onClick={onDetailClick}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                Lihat Detail
              </button>
            )}
            {onDownloadClick && (
              <button
                type="button"
                onClick={onDownloadClick}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1e3a8a] hover:bg-[#172554] text-white shadow-2xs transition-colors cursor-pointer"
              >
                Unduh PDF
              </button>
            )}
          </div>
        )}
      </div>

      {/* Segmented Class Filter Tabs */}
      {showTabs && onTabChange && (
        <div className="w-full pt-1 border-t border-slate-100 hide-on-print">
          <Tabs value={activeTab} onValueChange={onTabChange} className="w-full pt-3">
            <TabsList className="inline-flex flex-wrap items-center justify-start h-auto p-1 bg-slate-100/90 rounded-lg border border-slate-200/80 gap-1">
              <TabsTrigger
                value="umum"
                className="rounded-md text-xs font-medium px-3 py-1.5 text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:font-semibold data-[state=active]:shadow-2xs transition-colors cursor-pointer"
              >
                Umum (Semua)
              </TabsTrigger>
              {classes.map((c) => (
                <TabsTrigger
                  key={c.id}
                  value={c.namaKelas}
                  className="rounded-md text-xs font-medium px-3 py-1.5 text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:font-semibold data-[state=active]:shadow-2xs transition-colors cursor-pointer"
                >
                  {c.namaKelas}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {children}
    </div>
  );
}

export { LeaderboardCard as LeaderboardMasthead };
