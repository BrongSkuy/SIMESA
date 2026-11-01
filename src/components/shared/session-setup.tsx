"use client";

import {
  ArrowRight,
  Loader2,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SessionChip {
  label: string;
  value: string;
}

interface SessionSetupProps {
  /** true = lembar kerja sudah dimuat (Fase B), false = tampilan awal terpusat (Fase A) */
  active: boolean;
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  submitLabel: string;
  onSubmit: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Field-field pengaturan sesi (kelas, mapel, tanggal, dst.) */
  children: React.ReactNode;
  /** Ringkasan konteks sesi yang tampil di bilah ringkas saat aktif */
  chips: SessionChip[];
  /** Kembali ke tampilan pengaturan sesi */
  onChangeSession: () => void;
  /** Aksi tambahan di bilah ringkas (mis. Template / Ekspor / Impor) */
  actions?: React.ReactNode;
}

/** Format tanggal ISO (YYYY-MM-DD) menjadi label Indonesia singkat. */
export function formatTanggalID(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Alur dua fase untuk halaman operasional (presensi & penilaian):
 * - Fase A: pengaturan sesi terpusat di tengah layar (tanpa card).
 * - Fase B: bilah sesi ringkas di atas, lembar kerja mengisi layar penuh.
 */
export function SessionSetup({
  active,
  icon: Icon,
  eyebrow,
  title,
  description,
  submitLabel,
  onSubmit,
  loading = false,
  disabled = false,
  children,
  chips,
  onChangeSession,
  actions,
}: SessionSetupProps) {
  if (active) {
    return (
      <div className="flex flex-col gap-3 border-y border-slate-200 py-3 lg:flex-row lg:items-center lg:justify-between animate-in fade-in-0 duration-200">
        <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#1e3a8a] ring-1 ring-blue-100">
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sesi Aktif
            </span>
          </div>
          {chips.map((chip, idx) => (
            <div
              key={chip.label}
              className={cn(
                "flex items-baseline gap-1.5 text-xs",
                idx === 0 ? "lg:border-l lg:border-slate-200 lg:pl-5" : ""
              )}
            >
              <span className="text-slate-400">{chip.label}</span>
              <span className="font-semibold text-slate-800">{chip.value}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onChangeSession}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
            Ganti Sesi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-22rem)] items-center justify-center py-10 animate-in fade-in-0 duration-200">
      <div className="w-full max-w-xl">
        <div className="flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#1e3a8a] ring-1 ring-blue-100">
            <Icon className="h-5 w-5" />
          </span>
          {eyebrow && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {eyebrow}
            </span>
          )}
          <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
            {title}
          </h2>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
            {description}
          </p>
        </div>

        <div className="mt-7 space-y-4 border-t border-slate-200 pt-6">
          {children}
        </div>

        <Button
          className="mt-6 h-10 w-full gap-2"
          onClick={onSubmit}
          disabled={loading || disabled}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat data...
            </>
          ) : (
            <>
              {submitLabel}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </section>
  );
}

