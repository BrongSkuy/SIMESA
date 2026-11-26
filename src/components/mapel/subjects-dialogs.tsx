"use client";

import React from "react";
import { AlertTriangle, Loader2, Plus, RotateCcw, Save } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  sanitizeKkmInput,
  type UniqueMapelKkmItem,
} from "@/lib/erapor-utils";

export interface SubjectDialogTeacher {
  id: string;
  namaLengkap: string;
}

export interface SubjectDeleteTarget {
  id: string;
  namaMapel: string;
}

interface SubjectCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formName: string;
  onFormNameChange: (val: string) => void;
  formGuru: string;
  onFormGuruChange: (val: string) => void;
  teachers: SubjectDialogTeacher[];
  classMultiSelect: React.ReactNode;
  saving: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export function SubjectCreateDialog({
  open,
  onOpenChange,
  formName,
  onFormNameChange,
  formGuru,
  onFormGuruChange,
  teachers,
  classMultiSelect,
  saving,
  onCancel,
  onSubmit,
}: SubjectCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm" className="cursor-pointer">
            <Plus className="h-3.5 w-3.5" />
            Tambah Mata Pelajaran
          </Button>
        }
      />
      <DialogContent className="rounded-lg border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            Tambah Mata Pelajaran
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Masukkan detail mata pelajaran dan alokasi kelas pengampu.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          <div className="space-y-1.5">
            <Label htmlFor="nama-mapel" className="text-xs font-semibold">
              Nama Mata Pelajaran
            </Label>
            <Input
              id="nama-mapel"
              placeholder="Contoh: Matematika Lanjut"
              value={formName}
              onChange={(e) => onFormNameChange(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guru" className="text-xs font-semibold">
              Guru Pengampu
            </Label>
            <Select
              value={formGuru}
              onValueChange={(val) => onFormGuruChange(val || "none")}
            >
              <SelectTrigger id="guru" className="h-9 text-xs">
                <SelectValue placeholder="Pilih guru pengampu (opsional)">
                  {(value) => {
                    if (value === "none" || !value) return "Belum ditentukan";
                    const teacher = teachers.find((t) => t.id === value);
                    return teacher ? teacher.namaLengkap : "Belum ditentukan";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Belum ditentukan</SelectItem>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.namaLengkap}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Kelas yang Diampu</Label>
            {classMultiSelect}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Batal
          </Button>
          <Button size="sm" onClick={onSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Simpan Mapel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SubjectEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formName: string;
  onFormNameChange: (val: string) => void;
  formGuru: string;
  onFormGuruChange: (val: string) => void;
  teachers: SubjectDialogTeacher[];
  classMultiSelect: React.ReactNode;
  saving: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export function SubjectEditDialog({
  open,
  onOpenChange,
  formName,
  onFormNameChange,
  formGuru,
  onFormGuruChange,
  teachers,
  classMultiSelect,
  saving,
  onCancel,
  onSubmit,
}: SubjectEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-lg border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            Edit Mata Pelajaran
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Perbarui detail mata pelajaran dan penugasan guru.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-nama-mapel" className="text-xs font-semibold">
              Nama Mata Pelajaran
            </Label>
            <Input
              id="edit-nama-mapel"
              placeholder="Contoh: Matematika Lanjut"
              value={formName}
              onChange={(e) => onFormNameChange(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-guru" className="text-xs font-semibold">
              Guru Pengampu
            </Label>
            <Select
              value={formGuru}
              onValueChange={(val) => onFormGuruChange(val || "none")}
            >
              <SelectTrigger id="edit-guru" className="h-9 text-xs">
                <SelectValue placeholder="Pilih guru pengampu (opsional)">
                  {(value) => {
                    if (value === "none" || !value) return "Belum ditentukan";
                    const teacher = teachers.find((t) => t.id === value);
                    return teacher ? teacher.namaLengkap : "Belum ditentukan";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Belum ditentukan</SelectItem>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.namaLengkap}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Kelas yang Diampu</Label>
            {classMultiSelect}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Batal
          </Button>
          <Button size="sm" onClick={onSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DefaultKkmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onValueChange: (val: string) => void;
  saving: boolean;
  onSubmit: () => void;
}

export function DefaultKkmDialog({
  open,
  onOpenChange,
  value,
  onValueChange,
  saving,
  onSubmit,
}: DefaultKkmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            Ubah KKM Default Sekolah
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Angka ini berlaku otomatis untuk seluruh mata pelajaran yang tidak
            memiliki penetapan KKM khusus.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="default-kkm-input" className="text-xs font-semibold">
              Nilai KKM Default (1 sampai 100)
            </Label>
            <Input
              id="default-kkm-input"
              type="text"
              inputMode="numeric"
              placeholder="Contoh: 75"
              className="h-9 text-sm font-mono font-bold"
              value={value}
              onChange={(e) => onValueChange(sanitizeKkmInput(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Batal
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={saving}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Simpan KKM Default
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SubjectKkmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetItem: UniqueMapelKkmItem | null;
  defaultKkm: number;
  kkmInputValue: string;
  onKkmInputChange: (val: string) => void;
  capaianValue: string;
  onCapaianChange: (val: string) => void;
  saving: boolean;
  onResetToDefault: () => void;
  onSubmit: () => void;
}

export function SubjectKkmDialog({
  open,
  onOpenChange,
  targetItem,
  defaultKkm,
  kkmInputValue,
  onKkmInputChange,
  capaianValue,
  onCapaianChange,
  saving,
  onResetToDefault,
  onSubmit,
}: SubjectKkmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            Atur KKM Mata Pelajaran
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {targetItem
              ? `Penetapan KKM dan narasi capaian untuk ${targetItem.namaMapel} (Default Sekolah: ${defaultKkm})`
              : "Penetapan KKM mata pelajaran"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="mapel-kkm-input" className="text-xs font-semibold">
              Angka KKM Khusus (1 sampai 100)
            </Label>
            <Input
              id="mapel-kkm-input"
              type="text"
              inputMode="numeric"
              placeholder={`Contoh: ${defaultKkm}`}
              className="h-9 text-sm font-mono font-bold"
              value={kkmInputValue}
              onChange={(e) =>
                onKkmInputChange(sanitizeKkmInput(e.target.value))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="mapel-capaian-input"
              className="text-xs font-semibold"
            >
              Template Materi Capaian Kompetensi (Opsional)
            </Label>
            <Input
              id="mapel-capaian-input"
              placeholder="Contoh: aljabar linier, trigonometri, dan kalkulus terapan"
              className="h-9 text-xs"
              value={capaianValue}
              onChange={(e) => onCapaianChange(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <div>
            {targetItem?.isCustomKkm && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onResetToDefault}
                disabled={saving}
                className="text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Gunakan Default ({defaultKkm})
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Simpan KKM
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteSubjectDialogProps {
  target: SubjectDeleteTarget | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteSubjectDialog({
  target,
  deleting,
  onClose,
  onConfirm,
}: DeleteSubjectDialogProps) {
  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md rounded-2xl border-slate-200 p-6">
        <DialogHeader>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <DialogTitle className="text-base font-bold text-slate-900">
            Hapus Mata Pelajaran?
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 leading-relaxed">
            Apakah Anda yakin ingin menghapus mata pelajaran{" "}
            <strong className="text-slate-800">{target?.namaMapel}</strong>?
            Mata pelajaran yang telah memiliki data presensi atau nilai tidak
            dapat dihapus.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={deleting}
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            )}
            Ya, Hapus Mapel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
