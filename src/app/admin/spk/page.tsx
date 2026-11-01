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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
      <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`p-2.5 rounded-lg border shrink-0 ${
                isValid
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-amber-50 border-amber-200 text-amber-700"
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
                <h3 className="text-base font-bold text-slate-900 tabular-nums">
                  Total Akumulasi Bobot: {totalBobot}%
                </h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
                    isValid
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {isValid ? "Valid (100%)" : "Belum Seimbang"}
                </span>
                {saved && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    ✓ Tersimpan
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isValid
                  ? "Distribusi bobot kriteria sudah tepat 100% dan siap digunakan pada mesin perhitungan SAW."
                  : totalBobot < 100
                    ? `Tambahkan ${100 - totalBobot}% lagi agar total bobot mencapai tepat 100%.`
                    : `Kurangi ${totalBobot - 100}% agar total bobot kembali tepat 100%.`}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Jumlah Kriteria
            </p>
            <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
              {criteria.length} Parameter
            </p>
          </div>
        </div>

        <div className="mt-4 w-full bg-slate-100 h-2 rounded-xs overflow-hidden border border-slate-200">
          <div
            className={`h-full rounded-xs transition-all duration-300 ${
              isValid ? "bg-emerald-600" : "bg-amber-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, totalBobot))}%` }}
          />
        </div>
      </div>

      {/* Criteria cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {criteria.map((c, index) => (
          <Card
            key={c.id}
            className="group transition-colors hover:border-slate-300"
          >
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Kriteria C{index + 1}
                  </span>
                  <CardTitle className="text-sm font-semibold text-slate-900 mt-0.5">
                    {c.namaKriteria}
                  </CardTitle>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border shrink-0 ${
                    c.tipe === "Otomatis"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-indigo-200 bg-indigo-50 text-indigo-700"
                  }`}
                >
                  {c.tipe}
                </span>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                {c.deskripsi || "Parameter evaluasi kinerja & prestasi siswa"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">
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
                      className="h-10 text-center text-lg font-mono font-bold text-slate-900 w-24"
                    />
                    <span className="text-sm font-mono font-semibold text-slate-500">
                      %
                    </span>
                  </div>
                </div>
                {/* Visual bar */}
                <div className="h-1.5 w-full rounded-xs bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-xs bg-[#1e3a8a] transition-all duration-300"
                    style={{ width: `${Math.min(Math.max(c.bobot, 0), 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info box */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-start gap-3">
        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
          <Info className="h-4 w-4" />
        </div>
        <div className="text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-900 mb-0.5">
            Metodologi Simple Additive Weighting (SAW)
          </p>
          <p>
            Sistem menormalisasi matriks nilai siswa terhadap nilai maksimum di
            setiap kriteria (Benefit), lalu mengalikan hasil normalisasi dengan
            bobot persentase di atas. Kriteria bertipe{" "}
            <strong className="text-slate-800">Otomatis</strong> dihitung
            langsung dari rekapitulasi presensi sistem, sedangkan kriteria{" "}
            <strong className="text-slate-800">Manual</strong> bersumber dari
            penilaian guru mata pelajaran / wali kelas.
          </p>
        </div>
      </div>
    </div>
  );
}
