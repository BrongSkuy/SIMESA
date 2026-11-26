"use client";

import React from "react";
import { Loader2, Printer, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { ClassReportSummaryItem } from "@/lib/erapor";
import { cn } from "@/lib/utils";

export interface EraporKelasOption {
  id: string;
  namaKelas: string;
  tingkat: string;
  waliKelas?: string | null;
}

export interface EraporNoteFormState {
  catatanWaliKelas: string;
  ekskulNama: string;
  ekskulNilai: string;
  ekskulKeterangan: string;
  statusRapor: "Draf" | "Disahkan" | "Diterbitkan";
}

interface EraporBulkPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedKelas: string;
  kelasList: EraporKelasOption[];
  bulkScope: "current" | "selected" | "all";
  onBulkScopeChange: (scope: "current" | "selected" | "all") => void;
  bulkSelectedClasses: string[];
  onBulkSelectedClassesChange: (classes: string[]) => void;
  bulkStatusRapor: string;
  onBulkStatusRaporChange: (status: string) => void;
  bulkKetuntasan: string;
  onBulkKetuntasanChange: (ketuntasan: string) => void;
  bulkSortBy: string;
  onBulkSortByChange: (sortBy: string) => void;
  loadingBulkPrint: boolean;
  onExecuteBulkPrint: () => void;
}

export function EraporBulkPrintModal({
  open,
  onOpenChange,
  selectedKelas,
  kelasList,
  bulkScope,
  onBulkScopeChange,
  bulkSelectedClasses,
  onBulkSelectedClassesChange,
  bulkStatusRapor,
  onBulkStatusRaporChange,
  bulkKetuntasan,
  onBulkKetuntasanChange,
  bulkSortBy,
  onBulkSortByChange,
  loadingBulkPrint,
  onExecuteBulkPrint,
}: EraporBulkPrintModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-600" />
            Cetak Semua E-Rapor (Massal A4)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pilih cakupan kelas dan filter siswa yang lembar rapornya akan
            dicetak berurutan dalam satu dokumen A4.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="space-y-2">
            <Label className="text-xs font-semibold block">
              Cakupan Kelas yang Dicetak
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onBulkScopeChange("current")}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  bulkScope === "current"
                    ? "bg-blue-50 border-blue-500 text-blue-900 font-semibold"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <p className="text-xs font-semibold">Kelas Terpilih</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Hanya Kelas {selectedKelas || "-"}
                </p>
              </button>

              <button
                type="button"
                onClick={() => onBulkScopeChange("selected")}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  bulkScope === "selected"
                    ? "bg-blue-50 border-blue-500 text-blue-900 font-semibold"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <p className="text-xs font-semibold">Pilih Kelas</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pilih beberapa kelas
                </p>
              </button>

              <button
                type="button"
                onClick={() => onBulkScopeChange("all")}
                className={cn(
                  "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  bulkScope === "all"
                    ? "bg-blue-50 border-blue-500 text-blue-900 font-semibold"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <p className="text-xs font-semibold">Seluruh Kelas</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Semua ({kelasList.length} kelas)
                </p>
              </button>
            </div>

            {bulkScope === "selected" && (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <p className="text-[11px] font-medium text-slate-600">
                  Centang kelas yang ingin dicetak:
                </p>
                <div className="flex flex-wrap gap-2">
                  {kelasList.map((cls) => {
                    const checked = bulkSelectedClasses.includes(cls.namaKelas);
                    return (
                      <label
                        key={cls.id}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer select-none transition-colors",
                          checked
                            ? "bg-blue-600 border-blue-600 text-white font-semibold"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              onBulkSelectedClassesChange(
                                bulkSelectedClasses.filter(
                                  (k) => k !== cls.namaKelas
                                )
                              );
                            } else {
                              onBulkSelectedClassesChange([
                                ...bulkSelectedClasses,
                                cls.namaKelas,
                              ]);
                            }
                          }}
                        />
                        Kelas {cls.namaKelas}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold block">
                Filter Status Rapor
              </Label>
              <Select
                value={bulkStatusRapor}
                onValueChange={(val) => {
                  if (val) onBulkStatusRaporChange(val);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue>
                    {(val) => {
                      if (val === "disahkan_diterbitkan")
                        return "Disahkan dan Diterbitkan";
                      if (val === "Diterbitkan") return "Hanya Diterbitkan";
                      if (val === "Disahkan") return "Hanya Disahkan";
                      if (val === "Draf") return "Hanya Draf";
                      return "Semua Status Rapor";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status Rapor</SelectItem>
                  <SelectItem value="disahkan_diterbitkan">
                    Disahkan dan Diterbitkan
                  </SelectItem>
                  <SelectItem value="Diterbitkan">Hanya Diterbitkan</SelectItem>
                  <SelectItem value="Disahkan">Hanya Disahkan</SelectItem>
                  <SelectItem value="Draf">Hanya Draf</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold block">
                Filter Ketuntasan Nilai
              </Label>
              <Select
                value={bulkKetuntasan}
                onValueChange={(val) => {
                  if (val) onBulkKetuntasanChange(val);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue>
                    {(val) => {
                      if (val === "Semua Tuntas") return "Hanya Semua Tuntas";
                      if (val === "Perlu Perbaikan")
                        return "Hanya Perlu Perbaikan";
                      return "Semua Siswa";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Siswa</SelectItem>
                  <SelectItem value="Semua Tuntas">
                    Hanya Semua Tuntas
                  </SelectItem>
                  <SelectItem value="Perlu Perbaikan">
                    Hanya Perlu Perbaikan
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold block">
              Urutan Lembar Cetak
            </Label>
            <Select
              value={bulkSortBy}
              onValueChange={(val) => {
                if (val) onBulkSortByChange(val);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue>
                  {(val) => {
                    if (val === "nis_asc") return "Nomor Induk Siswa (NIS)";
                    if (val === "rata_desc") return "Nilai Rata-rata Tertinggi";
                    return "Nama Siswa (A ke Z)";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nama_asc">Nama Siswa (A ke Z)</SelectItem>
                <SelectItem value="nis_asc">Nomor Induk Siswa (NIS)</SelectItem>
                <SelectItem value="rata_desc">
                  Nilai Rata-rata Tertinggi
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loadingBulkPrint}
          >
            Batal
          </Button>
          <Button
            size="sm"
            onClick={onExecuteBulkPrint}
            disabled={loadingBulkPrint}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loadingBulkPrint ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Printer className="w-3.5 h-3.5" />
            )}
            {loadingBulkPrint
              ? "Menyiapkan Dokumen..."
              : "Cetak Massal Sekarang (A4)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EraporPublishClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedKelas: string;
  stats: {
    total: number;
    siapTerbit: number;
    diterbitkan: number;
  };
  publishingClass: boolean;
  onPublishClass: (status: "Diterbitkan" | "Draf") => void;
}

export function EraporPublishClassModal({
  open,
  onOpenChange,
  selectedKelas,
  stats,
  publishingClass,
  onPublishClass,
}: EraporPublishClassModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="w-4 h-4 text-emerald-600" />
            Penerbitan Rapor Kelas {selectedKelas}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Rapor berstatus Diterbitkan akan langsung dapat dibuka dan dicetak
            oleh siswa.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 py-2 text-center">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <p className="text-[11px] text-slate-500">Total Siswa</p>
            <p className="text-base font-bold font-mono text-slate-900">
              {stats.total}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
            <p className="text-[11px] text-emerald-700">Siap Terbit</p>
            <p className="text-base font-bold font-mono text-emerald-700">
              {stats.siapTerbit}
            </p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-2.5">
            <p className="text-[11px] text-blue-700">Sudah Terbit</p>
            <p className="text-base font-bold font-mono text-blue-700">
              {stats.diterbitkan}
            </p>
          </div>
        </div>

        {stats.total - stats.siapTerbit > 0 && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {stats.total - stats.siapTerbit} siswa belum memiliki nilai mapel
            dan akan dilewati otomatis.
          </p>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
          <div>
            {stats.diterbitkan > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onPublishClass("Draf")}
                disabled={publishingClass}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                Tarik ke Draf
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={publishingClass}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => onPublishClass("Diterbitkan")}
              disabled={publishingClass || stats.siapTerbit === 0}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {publishingClass ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Terbitkan Sekarang
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EraporNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedKelas: string;
  selectedStudent: ClassReportSummaryItem | null;
  noteForm: EraporNoteFormState;
  onNoteFormChange: (next: EraporNoteFormState) => void;
  savingNote: boolean;
  onSaveNote: () => void;
}

export function EraporNoteModal({
  open,
  onOpenChange,
  selectedKelas,
  selectedStudent,
  noteForm,
  onNoteFormChange,
  savingNote,
  onSaveNote,
}: EraporNoteModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Catatan Wali Kelas dan Ekstrakurikuler</DialogTitle>
          <DialogDescription>
            {selectedStudent
              ? `${selectedStudent.namaLengkap} (${selectedStudent.nis}) - Kelas ${selectedKelas}`
              : "Pengisian catatan evaluasi siswa"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div>
            <Label className="text-xs font-semibold mb-1 block">
              Catatan Perkembangan Karakter dan Kedisiplinan:
            </Label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Tuliskan catatan motivasi, kedisiplinan, dan perkembangan sikap siswa atau siswi..."
              value={noteForm.catatanWaliKelas}
              onChange={(e) =>
                onNoteFormChange({
                  ...noteForm,
                  catatanWaliKelas: e.target.value,
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Nama Kegiatan Ekstrakurikuler:
              </Label>
              <Input
                className="text-xs"
                placeholder="Misal: Pramuka Dirgantara"
                value={noteForm.ekskulNama}
                onChange={(e) =>
                  onNoteFormChange({ ...noteForm, ekskulNama: e.target.value })
                }
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                Predikat Nilai Ekskul:
              </Label>
              <Select
                value={noteForm.ekskulNilai || "none"}
                onValueChange={(val) => {
                  onNoteFormChange({
                    ...noteForm,
                    ekskulNilai: !val || val === "none" ? "" : val,
                  });
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Pilih Nilai">
                    {(val) => {
                      if (val === "Sangat Baik") return "Sangat Baik (A)";
                      if (val === "Baik") return "Baik (B)";
                      if (val === "Cukup") return "Cukup (C)";
                      return "Belum diisi";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belum diisi</SelectItem>
                  <SelectItem value="Sangat Baik">Sangat Baik (A)</SelectItem>
                  <SelectItem value="Baik">Baik (B)</SelectItem>
                  <SelectItem value="Cukup">Cukup (C)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">
              Keterangan Capaian Ekskul:
            </Label>
            <Input
              className="text-xs"
              placeholder="Misal: Aktif dalam kegiatan baris-berbaris dan upacara bendera."
              value={noteForm.ekskulKeterangan}
              onChange={(e) =>
                onNoteFormChange({
                  ...noteForm,
                  ekskulKeterangan: e.target.value,
                })
              }
            />
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">
              Status Pengesahan Rapor Siswa:
            </Label>
            <Select
              value={noteForm.statusRapor}
              onValueChange={(val) => {
                if (val) {
                  onNoteFormChange({
                    ...noteForm,
                    statusRapor: val as "Draf" | "Disahkan" | "Diterbitkan",
                  });
                }
              }}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Pilih Status">
                  {(val) => {
                    if (val === "Disahkan") return "Disahkan Wali Kelas";
                    if (val === "Diterbitkan") return "Diterbitkan (Resmi)";
                    return "Draf (Masih Dapat Diubah)";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draf">Draf (Masih Dapat Diubah)</SelectItem>
                <SelectItem value="Disahkan">Disahkan Wali Kelas</SelectItem>
                <SelectItem value="Diterbitkan">Diterbitkan (Resmi)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            size="sm"
            onClick={onSaveNote}
            disabled={savingNote}
            className="gap-2"
          >
            {savingNote ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Simpan Catatan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
