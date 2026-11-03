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
    <div className="relative rounded-2xl bg-gradient-to-b from-amber-50/80 via-amber-50/30 to-slate-50/20 border border-amber-200/80 p-5 sm:p-7 pb-6 text-center space-y-4 overflow-hidden select-none">
      {/* Decorative Fireworks & Confetti SVGs (Background Layer) */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {/* Soft Ambient Golden Halo Behind Trophy */}
        <div className="absolute left-1/2 top-4 -translate-x-1/2 w-80 h-40 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.22),transparent_70%)] blur-md" />

        {/* Enhanced Fireworks Burst - Left Corner */}
        <svg
          className="absolute -top-1 -left-1 w-24 h-24 sm:w-32 sm:h-32 opacity-70"
          viewBox="0 0 100 100"
          fill="none"
        >
          <circle cx="48" cy="48" r="3" fill="#f59e0b" />
          <line
            x1="48"
            y1="48"
            x2="14"
            y2="18"
            stroke="#ef4444"
            strokeWidth="1.8"
            strokeDasharray="3 2"
            strokeLinecap="round"
          />
          <line
            x1="48"
            y1="48"
            x2="84"
            y2="16"
            stroke="#3b82f6"
            strokeWidth="1.8"
            strokeDasharray="3 2"
            strokeLinecap="round"
          />
          <line
            x1="48"
            y1="48"
            x2="88"
            y2="58"
            stroke="#10b981"
            strokeWidth="1.8"
            strokeDasharray="3 2"
            strokeLinecap="round"
          />
          <line
            x1="48"
            y1="48"
            x2="18"
            y2="76"
            stroke="#f59e0b"
            strokeWidth="1.8"
            strokeDasharray="3 2"
            strokeLinecap="round"
          />
          <line
            x1="48"
            y1="48"
            x2="48"
            y2="6"
            stroke="#ec4899"
            strokeWidth="1.8"
            strokeDasharray="3 2"
            strokeLinecap="round"
          />
          <line
            x1="48"
            y1="48"
            x2="10"
            y2="46"
            stroke="#8b5cf6"
            strokeWidth="1.6"
            strokeDasharray="2 2"
            strokeLinecap="round"
          />
          {/* Burst Tips */}
          <circle cx="14" cy="18" r="2.2" fill="#ef4444" />
          <circle cx="84" cy="16" r="2.2" fill="#3b82f6" />
          <circle cx="88" cy="58" r="2.2" fill="#10b981" />
          <circle cx="18" cy="76" r="2.2" fill="#f59e0b" />
          <circle cx="48" cy="6" r="2.2" fill="#ec4899" />
          <circle cx="10" cy="46" r="2" fill="#8b5cf6" />
          {/* Spark Star ✦ */}
          <path
            d="M 68 32 Q 68 38 74 38 Q 68 38 68 44 Q 68 38 62 38 Q 68 38 68 32 Z"
            fill="#f59e0b"
          />
          <path
            d="M 28 60 Q 28 65 33 65 Q 28 65 28 70 Q 28 65 23 65 Q 28 65 28 60 Z"
            fill="#ec4899"
          />
        </svg>

        {/* Enhanced Fireworks Burst - Right Corner */}
        <svg
          className="absolute -top-1 -right-1 w-24 h-24 sm:w-32 sm:h-32 opacity-70"
          viewBox="0 0 100 100"
          fill="none"
        >
          <circle cx="52" cy="48" r="3" fill="#3b82f6" />
          <line
            x1="52"
            y1="48"
            x2="20"
            y2="16"
            stroke="#f59e0b"
            strokeWidth="1.8"
            strokeDasharray="3 2"
            strokeLinecap="round"
          />
          <line
            x1="52"
            y1="48"
            x2="86"
            y2="20"
            stroke="#ef4444"
            strokeWidth="1.8"
            strokeDasharray="3 2"
            strokeLinecap="round"
          />
          <line
            x1="52"
            y1="48"
            x2="14"
            y2="58"
            stroke="#8b5cf6"
            strokeWidth="1.8"
            strokeDasharray="3 2"
            strokeLinecap="round"
          />
          <line
            x1="52"
            y1="48"
            x2="78"
            y2="78"
            stroke="#10b981"
            strokeWidth="1.8"
            strokeDasharray="3 2"
            strokeLinecap="round"
          />
          <line
            x1="52"
            y1="48"
            x2="52"
            y2="6"
            stroke="#f59e0b"
            strokeWidth="1.8"
            strokeDasharray="3 2"
            strokeLinecap="round"
          />
          <line
            x1="52"
            y1="48"
            x2="90"
            y2="46"
            stroke="#06b6d4"
            strokeWidth="1.6"
            strokeDasharray="2 2"
            strokeLinecap="round"
          />
          {/* Burst Tips */}
          <circle cx="20" cy="16" r="2.2" fill="#f59e0b" />
          <circle cx="86" cy="20" r="2.2" fill="#ef4444" />
          <circle cx="14" cy="58" r="2.2" fill="#8b5cf6" />
          <circle cx="78" cy="78" r="2.2" fill="#10b981" />
          <circle cx="52" cy="6" r="2.2" fill="#f59e0b" />
          <circle cx="90" cy="46" r="2" fill="#06b6d4" />
          {/* Spark Star ✦ */}
          <path
            d="M 32 32 Q 32 38 26 38 Q 32 38 32 44 Q 32 38 38 38 Q 32 38 32 32 Z"
            fill="#3b82f6"
          />
          <path
            d="M 72 60 Q 72 65 67 65 Q 72 65 72 70 Q 72 65 77 65 Q 72 65 72 60 Z"
            fill="#10b981"
          />
        </svg>

        {/* Confetti Ribbon Streamers & Festive Particles */}
        <svg
          className="absolute inset-0 w-full h-full opacity-55"
          preserveAspectRatio="none"
          viewBox="0 0 500 140"
          fill="none"
        >
          {/* Flowing Ribbon Streamers */}
          <path
            d="M 35 10 Q 55 26 44 45 T 52 80"
            stroke="#f59e0b"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M 465 10 Q 445 26 456 45 T 448 80"
            stroke="#3b82f6"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M 115 8 Q 132 22 125 40"
            stroke="#ec4899"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M 385 8 Q 368 22 375 40"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Celebratory Confetti Rectangles */}
          <rect
            x="80"
            y="28"
            width="6.5"
            height="3.2"
            rx="1"
            fill="#ef4444"
            transform="rotate(25 80 28)"
          />
          <rect
            x="155"
            y="14"
            width="6.5"
            height="3.2"
            rx="1"
            fill="#3b82f6"
            transform="rotate(-30 155 14)"
          />
          <rect
            x="345"
            y="14"
            width="6.5"
            height="3.2"
            rx="1"
            fill="#f59e0b"
            transform="rotate(40 345 14)"
          />
          <rect
            x="420"
            y="28"
            width="6.5"
            height="3.2"
            rx="1"
            fill="#8b5cf6"
            transform="rotate(-18 420 28)"
          />
          <rect
            x="215"
            y="18"
            width="5"
            height="2.5"
            rx="0.8"
            fill="#ec4899"
            transform="rotate(15 215 18)"
          />
          <rect
            x="285"
            y="18"
            width="5"
            height="2.5"
            rx="0.8"
            fill="#10b981"
            transform="rotate(-20 285 18)"
          />

          {/* Festive Confetti Dots */}
          <circle cx="95" cy="52" r="2.2" fill="#f59e0b" />
          <circle cx="175" cy="36" r="1.8" fill="#10b981" />
          <circle cx="325" cy="36" r="1.8" fill="#ef4444" />
          <circle cx="405" cy="52" r="2.2" fill="#3b82f6" />
          <circle cx="135" cy="62" r="1.5" fill="#8b5cf6" />
          <circle cx="365" cy="62" r="1.5" fill="#f59e0b" />
        </svg>
      </div>

      {/* Central Trophy Medallion Flanked by Party Horns (PURE GOLDEN TROPHY - NO AI SYMBOL) */}
      <div className="relative flex items-center justify-center gap-3 sm:gap-6 pt-1">
        {/* Left Party Horn / Popper */}
        <div
          className="p-2 sm:p-2.5 rounded-full bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100 border border-amber-300/80 text-amber-700 shadow-xs -rotate-12 hover:-rotate-45 hover:scale-110 transition-all duration-300 cursor-default ring-2 ring-amber-100/60"
          title="Perayaan Prestasi!"
          aria-label="Perayaan Prestasi"
        >
          <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
        </div>

        {/* Pure Golden Trophy Medallion (Guaranteed Free from AI Symbol) */}
        <div className="relative inline-flex items-center justify-center group">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 p-[2px] shadow-[0_0_24px_rgba(245,158,11,0.4)] ring-4 ring-amber-100/90 transition-transform duration-300 group-hover:scale-105">
            <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-amber-50 via-white to-amber-100 flex items-center justify-center">
              <Trophy
                className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600 drop-shadow-xs"
                aria-label="Trofi Peringkat Emas"
              />
            </div>
          </div>
        </div>

        {/* Right Party Horn / Popper (Mirrored) */}
        <div
          className="p-2 sm:p-2.5 rounded-full bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100 border border-amber-300/80 text-amber-700 shadow-xs rotate-12 scale-x-[-1] hover:rotate-45 hover:scale-110 transition-all duration-300 cursor-default ring-2 ring-amber-100/60"
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
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-full border border-blue-200/90 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
          </span>
          {badgeMethod}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 rounded-full border border-amber-300/90 shadow-2xs">
          <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
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
            <TabsList className="flex flex-wrap items-center justify-center h-auto p-1 bg-white/95 backdrop-blur-xs rounded-full border border-amber-200/90 shadow-2xs gap-1">
              <TabsTrigger
                value="umum"
                className="rounded-full text-xs font-medium px-3.5 py-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all"
              >
                Umum (Semua)
              </TabsTrigger>
              {classes.map((c) => (
                <TabsTrigger
                  key={c.id}
                  value={c.namaKelas}
                  className="rounded-full text-xs font-medium px-3 py-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all"
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
