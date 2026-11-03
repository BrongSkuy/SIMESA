"use client";

import React from "react";
import { Trophy, PartyPopper } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export default function LeaderboardCard({
  title = "Tabel Peringkat Siswa Berprestasi",
  subtitle = "Kalkulasi normalisasi matriks multi-kriteria real-time metode SAW",
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
    <div className="relative rounded-2xl bg-gradient-to-b from-amber-50/70 via-amber-50/25 to-slate-50/20 border border-amber-200/70 p-5 sm:p-6 pb-6 text-center space-y-4 overflow-hidden select-none">
      {/* Central Trophy Medallion Flanked by Party Poppers (PURE GOLDEN TROPHY - NO AI SYMBOL) */}
      <div className="relative flex items-center justify-center gap-3 sm:gap-6 pt-1">
        {/* Left Party Popper Horn */}
        <div
          className="p-2 sm:p-2.5 rounded-full bg-amber-100/90 border border-amber-300/80 text-amber-700 shadow-xs -rotate-12 hover:-rotate-45 transition-transform"
          title="Perayaan Prestasi!"
          aria-label="Perayaan Prestasi"
        >
          <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
        </div>

        {/* Pure Golden Trophy Medallion */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 p-0.5 shadow-[0_0_24px_rgba(245,158,11,0.4)] ring-4 ring-amber-100/90">
            <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-amber-50 via-white to-amber-100 flex items-center justify-center">
              <Trophy
                className="w-7 h-7 text-amber-600 drop-shadow-xs"
                aria-label="Trofi Peringkat Emas"
              />
            </div>
          </div>
        </div>

        {/* Right Party Popper Horn (Flipped) */}
        <div
          className="p-2 sm:p-2.5 rounded-full bg-amber-100/90 border border-amber-300/80 text-amber-700 shadow-xs rotate-12 scale-x-[-1] hover:rotate-45 transition-transform"
          title="Perayaan Prestasi!"
          aria-label="Perayaan Prestasi"
        >
          <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
        </div>
      </div>

      {/* Title & Subtitle */}
      <div className="relative space-y-1 max-w-xl mx-auto px-2">
        <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
          {subtitle}
        </p>
      </div>

      {/* Centered Dual Badges */}
      <div className="relative flex flex-wrap items-center justify-center gap-2 pt-0.5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          {badgeMethod}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-amber-50 text-amber-800 rounded-full border border-amber-300/90 shadow-2xs">
          <Trophy className="w-3 h-3 text-amber-600 shrink-0" />
          Periode: {period}
        </span>
      </div>

      {/* Optional Interactive Actions */}
      {(onDetailClick || onDownloadClick) && (
        <div className="relative flex items-center justify-center gap-3 pt-2 hide-on-print">
          {onDetailClick && (
            <button
              onClick={onDetailClick}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-xs focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors"
            >
              Lihat Detail
            </button>
          )}
          {onDownloadClick && (
            <button
              onClick={onDownloadClick}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-xs focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors"
            >
              Unduh PDF
            </button>
          )}
        </div>
      )}

      {/* Centered Class Tabs (When provided) */}
      {showTabs && onTabChange && (
        <div className="relative w-full pt-2 flex justify-center hide-on-print">
          <Tabs value={activeTab} onValueChange={onTabChange} className="w-auto">
            <TabsList className="flex flex-wrap items-center justify-center h-auto p-1 bg-white/90 backdrop-blur-xs rounded-full border border-amber-200/80 shadow-2xs gap-1">
              <TabsTrigger
                value="umum"
                className="rounded-full text-xs font-medium px-3.5 py-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all"
              >
                Umum (Semua)
              </TabsTrigger>
              {classes.map((c) => (
                <TabsTrigger
                  key={c.id}
                  value={c.namaKelas}
                  className="rounded-full text-xs font-medium px-3.5 py-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all"
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
