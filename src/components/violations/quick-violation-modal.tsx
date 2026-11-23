"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Plus, Loader2 } from "lucide-react";
import { sanitizePoinInput } from "@/lib/violations";

function getLocalIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface StudentOption {
  id: string;
  nis: string;
  namaLengkap: string;
  kelas: string;
}

interface ViolationTypeOption {
  id: string;
  kode: string;
  namaPelanggaran: string;
  kategori: string;
  poinDefault: number;
}

interface QuickViolationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (recordedStudentId?: string) => void;
  studentsList: StudentOption[];
  typesList: ViolationTypeOption[];
  defaultStudentId?: string;
}

export function QuickViolationModal({
  open,
  onOpenChange,
  onSuccess,
  studentsList,
  typesList,
  defaultStudentId,
}: QuickViolationModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState(defaultStudentId || "");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [poinInput, setPoinInput] = useState<string>("10");
  const [tanggal, setTanggal] = useState(getLocalIsoDate);
  const [lokasi, setLokasi] = useState("Area Sekolah");
  const [keterangan, setKeterangan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedStudentId(defaultStudentId || "");
      setTanggal(getLocalIsoDate());
      setError(null);
    }
  }, [open, defaultStudentId]);

  // Saat jenis pelanggaran dipilih, otomatis isi poin default
  const handleTypeChange = (typeId: string) => {
    setSelectedTypeId(typeId);
    const found = typesList.find((t) => t.id === typeId);
    if (found) {
      setPoinInput(String(found.poinDefault));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedTypeId) {
      setError("Pilih siswa dan jenis pelanggaran");
      return;
    }

    const parsedPoin = Number(poinInput);
    if (!poinInput.trim() || !Number.isInteger(parsedPoin) || parsedPoin < 1 || parsedPoin > 100) {
      setError("Bobot poin harus berupa bilangan bulat antara 1 sampai 100");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          violationTypeId: selectedTypeId,
          tanggal,
          poin: parsedPoin,
          lokasi,
          keterangan,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan pelanggaran");
      }

      // Reset form
      const recordedId = selectedStudentId;
      setKeterangan("");
      setSelectedTypeId("");
      onOpenChange(false);
      onSuccess(recordedId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Catat Pelanggaran Siswa
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pencatatan buku poin kedisiplinan dan tata tertib sekolah
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs border border-red-200 dark:border-red-500/20">
              {error}
            </div>
          )}

          {/* Pilih Siswa */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pilih Siswa <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedStudentId}
              onValueChange={(val) => setSelectedStudentId(val || "")}
            >
              <SelectTrigger className="w-full text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Pilih siswa...">
                  {(val) => {
                    if (!val) return "Pilih siswa...";
                    const student = studentsList.find((s) => s.id === val);
                    return student
                      ? `[${student.kelas}] ${student.namaLengkap} (${student.nis})`
                      : "Pilih siswa...";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {studentsList.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    [{s.kelas}] {s.namaLengkap} ({s.nis})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pilih Jenis Pelanggaran */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Jenis Pelanggaran <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedTypeId}
              onValueChange={(val) => handleTypeChange(val || "")}
            >
              <SelectTrigger className="w-full text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Pilih aturan pelanggaran...">
                  {(val) => {
                    if (!val) return "Pilih aturan pelanggaran...";
                    const item = typesList.find((t) => t.id === val);
                    return item
                      ? `[${item.kategori}] ${item.kode} - ${item.namaPelanggaran} (+${item.poinDefault} Poin)`
                      : "Pilih aturan pelanggaran...";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {typesList.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    [{t.kategori}] {t.kode} - {t.namaPelanggaran} (+{t.poinDefault} Poin)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Poin & Tanggal */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Bobot Poin
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="1 sampai 100"
                value={poinInput}
                onChange={(e) => setPoinInput(sanitizePoinInput(e.target.value))}
                className="text-xs font-mono font-bold text-red-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tanggal Kejadian
              </Label>
              <Input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Lokasi Kejadian */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Lokasi Kejadian
            </Label>
            <Input
              type="text"
              placeholder="Contoh: Gerbang Depan, Koridor Kelas, Kantin..."
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>

          {/* Kronologi Singkat */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Keterangan dan Kronologi Singkat
            </Label>
            <Textarea
              rows={2}
              placeholder="Catatan kronologi kejadian pelanggaran..."
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-[#1F4E78] hover:bg-[#163a5c] text-white flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Simpan Catatan</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

