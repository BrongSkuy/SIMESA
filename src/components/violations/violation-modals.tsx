"use client";

import React from "react";
import { FileCheck2, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSpTingkatLabel,
  sanitizePoinInput,
  sanitizeThresholdInput,
} from "@/lib/violations";

export interface ViolationRuleDraft {
  id?: string;
  kode?: string;
  namaPelanggaran?: string;
  kategori?: string;
  poinDefault?: number;
  deskripsiSanksi?: string;
}

export interface ViolationSpTargetStudent {
  namaLengkap: string;
  kelas: string;
  totalPoints: number;
}

export interface ThresholdFormValues {
  PEMBINAAN_LISAN: string;
  SP_1: string;
  SP_2: string;
  SP_3: string;
}

interface ViolationRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRule: ViolationRuleDraft | null;
  onEditingRuleChange: (next: ViolationRuleDraft | null) => void;
  rulePoinInput: string;
  onRulePoinInputChange: (val: string) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function ViolationRuleModal({
  open,
  onOpenChange,
  editingRule,
  onEditingRuleChange,
  rulePoinInput,
  onRulePoinInputChange,
  submitting,
  onSubmit,
}: ViolationRuleModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
            {editingRule?.id
              ? "Edit Aturan Pelanggaran"
              : "Tambah Jenis Pelanggaran"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Kode Aturan</Label>
              <Input
                placeholder="Contoh: TATIB-08"
                value={editingRule?.kode || ""}
                onChange={(e) =>
                  onEditingRuleChange({ ...editingRule, kode: e.target.value })
                }
                className="text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kategori</Label>
              <Select
                value={editingRule?.kategori || "Ringan"}
                onValueChange={(val) =>
                  onEditingRuleChange({
                    ...editingRule,
                    kategori: (val as "Ringan" | "Sedang" | "Berat") || "Ringan",
                  })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue>{(val) => val || "Ringan"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ringan" className="text-xs">
                    Ringan
                  </SelectItem>
                  <SelectItem value="Sedang" className="text-xs">
                    Sedang
                  </SelectItem>
                  <SelectItem value="Berat" className="text-xs">
                    Berat
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Nama Pelanggaran</Label>
            <Input
              placeholder="Contoh: Membawa barang terlarang..."
              value={editingRule?.namaPelanggaran || ""}
              onChange={(e) =>
                onEditingRuleChange({
                  ...editingRule,
                  namaPelanggaran: e.target.value,
                })
              }
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Bobot Poin Baku</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="1 sampai 100"
              value={rulePoinInput}
              onChange={(e) =>
                onRulePoinInputChange(sanitizePoinInput(e.target.value))
              }
              className="text-xs font-mono font-bold"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              Arahan Tindakan Sanksi atau Pembinaan
            </Label>
            <Input
              placeholder="Contoh: Teguran lisan & pemanggilan orang tua"
              value={editingRule?.deskripsiSanksi || ""}
              onChange={(e) =>
                onEditingRuleChange({
                  ...editingRule,
                  deskripsiSanksi: e.target.value,
                })
              }
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-[#0d1e38] hover:bg-[#162f54] text-white cursor-pointer"
            >
              {submitting ? "Menyimpan..." : "Simpan Aturan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ViolationIssueSpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetStudent: ViolationSpTargetStudent | null;
  spTingkat: number;
  onSpTingkatChange: (tingkat: number) => void;
  spCatatan: string;
  onSpCatatanChange: (val: string) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function ViolationIssueSpModal({
  open,
  onOpenChange,
  targetStudent,
  spTingkat,
  onSpTingkatChange,
  spCatatan,
  onSpCatatanChange,
  submitting,
  onSubmit,
}: ViolationIssueSpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-red-600" />
            <span>Terbitkan Surat Peringatan (SP)</span>
          </DialogTitle>
          <p className="text-xs text-slate-500">
            Siswa: <strong>{targetStudent?.namaLengkap}</strong> (
            {targetStudent?.kelas}) | Akumulasi:{" "}
            <strong className="text-red-600">
              {targetStudent?.totalPoints} Poin
            </strong>
          </p>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs">Tingkat Surat Peringatan</Label>
            <Select
              value={String(spTingkat)}
              onValueChange={(val) => onSpTingkatChange(Number(val) || 1)}
            >
              <SelectTrigger className="text-xs font-semibold">
                <SelectValue>{(val) => getSpTingkatLabel(val || 1)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1" className="text-xs">
                  Surat Peringatan I (SP 1)
                </SelectItem>
                <SelectItem value="2" className="text-xs">
                  Surat Peringatan II (SP 2)
                </SelectItem>
                <SelectItem value="3" className="text-xs">
                  Surat Peringatan III (SP 3 atau Terakhir)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              Catatan Mediasi atau Jadwal Pemanggilan Orang Tua
            </Label>
            <Input
              placeholder="Contoh: Pemanggilan wali murid hari Senin jam 09.00 WIB"
              value={spCatatan}
              onChange={(e) => onSpCatatanChange(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            >
              {submitting ? "Menerbitkan..." : "Terbitkan SP Resmi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ViolationThresholdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thresholdForm: ThresholdFormValues;
  onThresholdFormChange: React.Dispatch<
    React.SetStateAction<ThresholdFormValues>
  >;
  savingThresholds: boolean;
  onSaveThresholds: (resetToDefault: boolean) => void;
}

export function ViolationThresholdModal({
  open,
  onOpenChange,
  thresholdForm,
  onThresholdFormChange,
  savingThresholds,
  onSaveThresholds,
}: ViolationThresholdModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#0d1e38]" />
            <span>Atur Ambang Batas Meter Poin</span>
          </DialogTitle>
          <p className="text-xs text-slate-500">
            Sesuaikan batas akumulasi poin untuk pembinaan lisan dan penerbitan
            SP 1, SP 2, serta SP 3.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Pembinaan Lisan</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={thresholdForm.PEMBINAAN_LISAN}
              onChange={(e) =>
                onThresholdFormChange((prev) => ({
                  ...prev,
                  PEMBINAAN_LISAN: sanitizeThresholdInput(e.target.value),
                }))
              }
              className="h-9 text-xs font-mono font-bold"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Batas SP 1</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={thresholdForm.SP_1}
              onChange={(e) =>
                onThresholdFormChange((prev) => ({
                  ...prev,
                  SP_1: sanitizeThresholdInput(e.target.value),
                }))
              }
              className="h-9 text-xs font-mono font-bold"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Batas SP 2</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={thresholdForm.SP_2}
              onChange={(e) =>
                onThresholdFormChange((prev) => ({
                  ...prev,
                  SP_2: sanitizeThresholdInput(e.target.value),
                }))
              }
              className="h-9 text-xs font-mono font-bold"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">
              Batas SP 3 (Maks. Meter)
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              value={thresholdForm.SP_3}
              onChange={(e) =>
                onThresholdFormChange((prev) => ({
                  ...prev,
                  SP_3: sanitizeThresholdInput(e.target.value),
                }))
              }
              className="h-9 text-xs font-mono font-bold"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={savingThresholds}
            onClick={() => onSaveThresholds(true)}
            className="text-xs text-slate-600 hover:text-slate-900 gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Default (30-50-75-100)
          </Button>
          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={savingThresholds}
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={savingThresholds}
              onClick={() => onSaveThresholds(false)}
              className="bg-[#0d1e38] hover:bg-[#162f54] text-white cursor-pointer"
            >
              {savingThresholds ? "Menyimpan..." : "Simpan Ambang"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
