"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModuleTheme = "navy" | "emerald" | "royal" | "obsidian";

export interface ModuleStatItem {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  tone?: "default" | "blue" | "emerald" | "amber" | "rose";
  onClick?: () => void;
  active?: boolean;
}

export interface ModuleTabItem {
  key: string;
  label: string;
  badge?: React.ReactNode;
}

export interface ModulePageShellProps {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  theme?: ModuleTheme;
  actions?: React.ReactNode;
  stats?: ModuleStatItem[];
  tabs?: ModuleTabItem[];
  tabsLabel?: string;
  activeTab?: string;
  onTabChange?: (key: string) => void;
  backdropSrc?: string;
  sheetClassName?: string;
  containerClassName?: string;
  children: React.ReactNode;
  afterSheet?: React.ReactNode;
}

const THEME_TOKENS: Record<
  ModuleTheme,
  {
    sectionBg: string;
    gradR: string;
    gradB: string;
    eyebrow: string;
    icon: string;
    desc: string;
    statLabel: string;
    tabInactive: string;
  }
> = {
  navy: {
    sectionBg: "bg-[#091424]",
    gradR: "from-[#091424] via-[#0b192e]/88 to-[#0d1e38]/45",
    gradB: "from-[#091424]/40 via-transparent to-[#091424]/92",
    eyebrow: "bg-blue-500/15 text-blue-200 border-blue-400/25",
    icon: "text-blue-300",
    desc: "text-blue-100/75",
    statLabel: "text-blue-100/70",
    tabInactive:
      "bg-white/[0.08] text-blue-100/85 border-white/10 hover:bg-white/15 hover:border-white/20 hover:text-white",
  },
  emerald: {
    sectionBg: "bg-[#061c17]",
    gradR: "from-[#061c17] via-[#08241e]/88 to-[#0b2e26]/45",
    gradB: "from-[#061c17]/40 via-transparent to-[#061c17]/92",
    eyebrow: "bg-emerald-500/15 text-emerald-200 border-emerald-400/25",
    icon: "text-emerald-300",
    desc: "text-emerald-100/75",
    statLabel: "text-emerald-100/70",
    tabInactive:
      "bg-white/[0.08] text-emerald-100/85 border-white/10 hover:bg-white/15 hover:border-white/20 hover:text-white",
  },
  royal: {
    sectionBg: "bg-[#0c1229]",
    gradR: "from-[#0c1229] via-[#111938]/88 to-[#161e42]/45",
    gradB: "from-[#0c1229]/40 via-transparent to-[#0c1229]/92",
    eyebrow: "bg-amber-500/15 text-amber-200 border-amber-400/30",
    icon: "text-amber-300",
    desc: "text-indigo-100/75",
    statLabel: "text-indigo-100/70",
    tabInactive:
      "bg-white/[0.08] text-indigo-100/85 border-white/10 hover:bg-white/15 hover:border-white/20 hover:text-white",
  },
  obsidian: {
    sectionBg: "bg-[#0c1017]",
    gradR: "from-[#0c1017] via-[#111722]/88 to-[#161d29]/45",
    gradB: "from-[#0c1017]/40 via-transparent to-[#0c1017]/92",
    eyebrow: "bg-slate-400/15 text-slate-200 border-slate-400/25",
    icon: "text-sky-300",
    desc: "text-slate-300/80",
    statLabel: "text-slate-300/70",
    tabInactive:
      "bg-white/[0.08] text-slate-200/85 border-white/10 hover:bg-white/15 hover:border-white/20 hover:text-white",
  },
};

const STAT_VALUE_TONE: Record<NonNullable<ModuleStatItem["tone"]>, string> = {
  default: "text-white",
  blue: "text-sky-300",
  emerald: "text-emerald-300",
  amber: "text-amber-300",
  rose: "text-rose-300",
};

export function ModulePageShell({
  title,
  description,
  eyebrow,
  icon: Icon,
  theme = "navy",
  actions,
  stats,
  tabs,
  tabsLabel = "Navigasi bagian halaman",
  activeTab,
  onTabChange,
  backdropSrc = "/school-building.jpg",
  sheetClassName,
  containerClassName,
  children,
  afterSheet,
}: ModulePageShellProps) {
  const [bgLoaded, setBgLoaded] = useState(true);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const t = THEME_TOKENS[theme];
  const hasTabs = Boolean(tabs && tabs.length > 0 && onTabChange);

  const statColsClass =
    !stats || stats.length <= 2
      ? "grid-cols-2 max-w-md"
      : stats.length === 3
        ? "grid-cols-1 sm:grid-cols-3 max-w-2xl"
        : "grid-cols-2 sm:grid-cols-4 max-w-3xl";

  const handleSelectTab = (key: string) => {
    if (!onTabChange) return;
    onTabChange(key);
    const btn = tabRefs.current[key];
    if (btn && typeof btn.scrollIntoView === "function") {
      btn.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (!tabs || tabs.length === 0 || !onTabChange) return;
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft")
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex !== null) {
      e.preventDefault();
      const target = tabs[nextIndex];
      handleSelectTab(target.key);
      tabRefs.current[target.key]?.focus();
    }
  };

  return (
    <div className={cn("space-y-0 pb-10", containerClassName)}>
      {/* 1. ASYMMETRIC DARK ATMOSPHERIC HERO HEADER */}
      <section
        className={cn(
          "relative overflow-hidden -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10 pt-6 pb-16 sm:pb-20 border-b border-white/10 text-white print:hidden",
          t.sectionBg
        )}
      >
        {bgLoaded && (
          <Image
            src={backdropSrc}
            alt=""
            fill
            sizes="100vw"
            unoptimized
            priority
            className="object-cover object-right opacity-30 mix-blend-luminosity filter contrast-125 brightness-95 pointer-events-none select-none"
            onError={() => setBgLoaded(false)}
          />
        )}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-r pointer-events-none",
            t.gradR
          )}
        />
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-b pointer-events-none",
            t.gradB
          )}
        />

        <div className="relative z-10 max-w-7xl mx-auto space-y-5">
          {/* Baris Atas: Judul Kiri & Tombol Aksi Kanan */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              {eyebrow && (
                <span
                  className={cn(
                    "inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                    t.eyebrow
                  )}
                >
                  {eyebrow}
                </span>
              )}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                {Icon && <Icon className={cn("w-6 h-6 shrink-0", t.icon)} />}
                <span>{title}</span>
              </h1>
              {description && (
                <p
                  className={cn(
                    "text-xs sm:text-sm max-w-2xl leading-relaxed",
                    t.desc
                  )}
                >
                  {description}
                </p>
              )}
            </div>

            {actions && (
              <div className="flex flex-wrap items-center gap-2 shrink-0 [&_button[data-variant=outline]]:bg-white/[0.08] [&_button[data-variant=outline]]:border-white/20 [&_button[data-variant=outline]]:text-white [&_button[data-variant=outline]:hover]:bg-white/15 [&_button[data-variant=outline]:hover]:text-white [&_button[data-variant=outline]_svg]:text-slate-200">
                {actions}
              </div>
            )}
          </div>

          {/* 1 Strip KPI Kaca Ramping */}
          {stats && stats.length > 0 && (
            <div
              className={cn(
                "rounded-xl bg-white/[0.08] backdrop-blur-md border border-white/15 grid divide-y sm:divide-y-0 sm:divide-x divide-white/12 shadow-xs",
                statColsClass
              )}
            >
              {stats.map((stat, idx) => {
                const valueColor = STAT_VALUE_TONE[stat.tone || "default"];
                const content = (
                  <>
                    <span
                      className={cn(
                        "font-mono font-bold text-base tabular-nums block leading-tight",
                        valueColor
                      )}
                    >
                      {stat.value}
                    </span>
                    <span
                      className={cn("text-[11px] font-medium block mt-0.5", t.statLabel)}
                    >
                      {stat.label}
                    </span>
                    {stat.sublabel && (
                      <span className="text-[10px] text-white/45 block">
                        {stat.sublabel}
                      </span>
                    )}
                  </>
                );

                if (stat.onClick) {
                  return (
                    <button
                      key={`${stat.label}-${idx}`}
                      type="button"
                      onClick={stat.onClick}
                      className={cn(
                        "px-4 py-2.5 text-left transition-colors cursor-pointer hover:bg-white/[0.06]",
                        stat.active && "bg-white/[0.10]"
                      )}
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <div
                    key={`${stat.label}-${idx}`}
                    className="px-4 py-2.5 text-left"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 2. OVERLAPPING WHITE SHEET + OPTIONAL FOLDER TABS */}
      <div className="relative z-20 max-w-7xl mx-auto px-0 sm:px-2 lg:px-4 -mt-11 sm:-mt-12 print:mt-0 print:px-0 print:max-w-none">
        {hasTabs && tabs && (
          <div
            role="tablist"
            aria-label={tabsLabel}
            className="flex flex-nowrap items-end justify-start sm:justify-end overflow-x-auto snap-x snap-proximity px-3 sm:pr-7 gap-1.5 print:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map((tab, idx) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  ref={(el) => {
                    tabRefs.current[tab.key] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => handleSelectTab(tab.key)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  className={cn(
                    "relative flex-none snap-start px-4 py-2 rounded-t-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none border-t border-x focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-400",
                    isActive
                      ? "bg-white text-slate-900 border-slate-200/90 translate-y-[1px] z-30 font-bold"
                      : cn(t.tabInactive, "backdrop-blur-xs")
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span>{tab.label}</span>
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main Clean White Sheet */}
        <div
          className={cn(
            "relative rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_-22px_rgba(9,20,36,0.22)] overflow-hidden print:border-0 print:shadow-none print:rounded-none",
            sheetClassName
          )}
        >
          {children}
        </div>
      </div>

      {afterSheet}
    </div>
  );
}
