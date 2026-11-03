"use client";

import { useState, useEffect } from "react";
import {
  Settings2,
  Save,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SpkCriteria {
  id: string;
  namaKriteria: string;
  bobot: number;
  tipe: "Otomatis" | "Manual";
  deskripsi: string | null;
}

export default function AdminSpkPage() {
  const [criteria, setCriteria] = useState<SpkCriteria[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/spk-criteria")
      .then((r) => r.json())
      .then((data) => {
        setCriteria(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Gagal memuat kriteria");
        setLoading(false);
      });
  }, []);

  const totalBobot = criteria.reduce((sum, c) => sum + c.bobot, 0);
  const isValid = totalBobot === 100;

  const updateBobot = (id: string, value: number) => {
    setSaved(false);
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, bobot: value } : c))
    );
  };

  const handleSave = async () => {
    if (!isValid) {
      toast.error(`Total bobot harus 100%. Saat ini: ${totalBobot}%`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/spk-criteria", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          criteria.map((c) => ({ id: c.id, bobot: c.bobot }))
        ),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setSaved(true);
      toast.success("Bobot kriteria SPK berhasil disimpan!");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal menyimpan";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Konfigurasi Bobot Kriteria SPK"
        badge="Metode SAW"
        description="Atur distribusi bobot persentase evaluasi untuk pemeringkatan siswa terbaik"
        icon={Settings2}
      >
        <Button
          className="gap-1.5"
          size="sm"
          disabled={!isValid || saving}
          onClick={handleSave}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
        </Button>
      </PageHeader>

      {/* Total Weight Validation Banner */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl group">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`p-2.5 rounded-xl border shrink-0 transition-colors ${
                isValid
                  ? "bg-emerald-50 group-hover:bg-emerald-500/15 border-emerald-200 group-hover:border-emerald-500/30 text-emerald-700 group-hover:text-emerald-300"
                  : "bg-amber-50 group-hover:bg-amber-500/15 border-amber-200 group-hover:border-amber-500/30 text-amber-700 group-hover:text-amber-300"
              }`}
            >
              {isValid ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-white tabular-nums transition-colors">
                  Total Akumulasi Bobot: {totalBobot}%
                </h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border transition-colors ${
                    isValid
                      ? "bg-emerald-50 group-hover:bg-emerald-500/15 text-emerald-700 group-hover:text-emerald-300 border-emerald-200 group-hover:border-emerald-500/30"
                      : "bg-amber-50 group-hover:bg-amber-500/15 text-amber-700 group-hover:text-amber-300 border-amber-200 group-hover:border-amber-500/30"
                  }`}
                >
                  {isValid ? "Valid (100%)" : "Belum Seimbang"}
                </span>
                {saved && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 group-hover:bg-blue-500/15 text-blue-700 group-hover:text-blue-300 border border-blue-200 group-hover:border-blue-500/30 transition-colors">
                    ✓ Tersimpan
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 group-hover:text-slate-400 mt-1 transition-colors">
                {isValid
                  ? "Distribusi bobot kriteria sudah tepat 100% dan siap digunakan pada mesin perhitungan SAW."
                  : totalBobot < 100
                    ? `Tambahkan ${100 - totalBobot}% lagi agar total bobot mencapai tepat 100%.`
                    : `Kurangi ${totalBobot - 100}% agar total bobot kembali tepat 100%.`}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-500 transition-colors">
              Jumlah Kriteria
            </p>
            <p className="text-xl font-bold text-slate-900 group-hover:text-white tabular-nums mt-0.5 transition-colors">
              {criteria.length} Parameter
            </p>
          </div>
        </div>

        <div className="mt-4 w-full bg-slate-100 group-hover:bg-slate-800/80 h-2 rounded-xs overflow-hidden border border-slate-200 group-hover:border-slate-700/80 transition-colors">
          <div
            className={`h-full rounded-xs transition-all duration-300 ${
              isValid ? "bg-emerald-600 group-hover:bg-emerald-500" : "bg-amber-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, totalBobot))}%` }}
          />
        </div>
      </div>

      {/* Criteria cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {criteria.map((c, index) => (
          <div
            key={c.id}
            className="rounded-2xl border border-slate-200/90 bg-white p-5 hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 group-hover:border-slate-800/80 mb-3 transition-colors">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-500 transition-colors">
                    Kriteria C{index + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-white mt-0.5 transition-colors">
                    {c.namaKriteria}
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-xs text-xs font-medium border shrink-0 transition-colors ${
                    c.tipe === "Otomatis"
                      ? "border-blue-200 bg-blue-50 text-blue-700 group-hover:bg-blue-500/15 group-hover:border-blue-500/30 group-hover:text-blue-300"
                      : "border-indigo-200 bg-indigo-50 text-indigo-700 group-hover:bg-indigo-500/15 group-hover:border-indigo-500/30 group-hover:text-indigo-300"
                  }`}
                >
                  {c.tipe}
                </span>
              </div>
              <p className="text-xs text-slate-500 group-hover:text-slate-400 mb-4 transition-colors">
                {c.deskripsi || "Parameter evaluasi kinerja & prestasi siswa"}
              </p>
            </div>
            <div className="pt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600 group-hover:text-slate-300 transition-colors">
                    Bobot Persentase
                  </span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={c.bobot}
                      onChange={(e) =>
                        updateBobot(c.id, parseInt(e.target.value) || 0)
                      }
                      className="h-10 text-center text-lg font-mono font-bold text-slate-900 group-hover:text-white group-hover:bg-slate-900/90 group-hover:border-slate-700 group-hover:[color-scheme:dark] w-24 transition-colors"
                    />
                    <span className="text-sm font-mono font-semibold text-slate-500 group-hover:text-slate-400 transition-colors">
                      %
                    </span>
                  </div>
                </div>
                {/* Visual bar */}
                <div className="h-1.5 w-full rounded-xs bg-slate-100 group-hover:bg-slate-800/80 overflow-hidden transition-colors">
                  <div
                    className="h-full rounded-xs bg-[#1e3a8a] group-hover:bg-blue-500 transition-all duration-300"
                    style={{ width: `${Math.min(Math.max(c.bobot, 0), 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:bg-[#091524] hover:border-slate-800 hover:shadow-xl group transition-all duration-300 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-blue-50 group-hover:bg-blue-500/15 text-blue-600 group-hover:text-blue-300 border border-blue-200 group-hover:border-blue-500/30 shrink-0 transition-colors">
          <Info className="h-4 w-4" />
        </div>
        <div className="text-xs text-slate-600 group-hover:text-slate-300 leading-relaxed transition-colors">
          <p className="font-semibold text-slate-900 group-hover:text-white mb-0.5 transition-colors">
            Metodologi Simple Additive Weighting (SAW)
          </p>
          <p>
            Sistem menormalisasi matriks nilai siswa terhadap nilai maksimum di
            setiap kriteria (Benefit), lalu mengalikan hasil normalisasi dengan
            bobot persentase di atas. Kriteria bertipe{" "}
            <strong className="text-slate-800 group-hover:text-white font-semibold transition-colors">Otomatis</strong> dihitung
            langsung dari rekapitulasi presensi sistem, sedangkan kriteria{" "}
            <strong className="text-slate-800 group-hover:text-white font-semibold transition-colors">Manual</strong> bersumber dari
            penilaian guru mata pelajaran / wali kelas.
          </p>
        </div>
      </div>
    </div>
  );
}
