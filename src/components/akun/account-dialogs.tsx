"use client";

import React from "react";
import { Loader2, Shield, UserPlus } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ROLE_CONFIGS,
  ADDITIONAL_TEACHER_ROLES,
  STAFF_CREATABLE_ROLES,
  isTeacherCategoryRole,
  type AppRole,
} from "@/lib/rbac";

export interface ExtraRoleItem {
  id: string;
  role: string;
  metadata?: string | null;
}

export interface AccountRow {
  id: string;
  username: string | null;
  email?: string | null;
  name: string;
  appRole: string | null;
  banned: boolean | null;
  isCurrentUser?: boolean;
  additionalRoles?: ExtraRoleItem[];
}

export interface ClassOption {
  id: string;
  namaKelas: string;
  tingkat: string;
  waliKelas?: string | null;
}

export type ExtraRoleFormState = Record<
  string,
  {
    enabled: boolean;
    kelas: string;
    ekskul: string;
  }
>;

interface TeacherExtraRolesPanelProps {
  primaryRole: AppRole;
  roleState: ExtraRoleFormState;
  onChange: (next: ExtraRoleFormState) => void;
  classesList: ClassOption[];
  idPrefix: string;
  primaryWaliKelas: string;
  onPrimaryWaliKelasChange: (kelas: string) => void;
}

export function TeacherExtraRolesPanel({
  primaryRole,
  roleState,
  onChange,
  classesList,
  idPrefix,
  primaryWaliKelas,
  onPrimaryWaliKelasChange,
}: TeacherExtraRolesPanelProps) {
  if (!isTeacherCategoryRole(primaryRole)) {
    return null;
  }

  const availableExtras = ADDITIONAL_TEACHER_ROLES.filter(
    (r) => r !== primaryRole
  );

  const toggleRole = (role: AppRole, checked: boolean) => {
    const current = roleState[role] || { enabled: false, kelas: "", ekskul: "" };
    onChange({
      ...roleState,
      [role]: { ...current, enabled: checked },
    });
  };

  return (
    <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-3.5 space-y-3">
      {primaryRole === "WALI_KELAS" && (
        <div className="rounded-lg border border-blue-200 bg-white p-2.5 space-y-1.5">
          <Label className="text-xs font-semibold text-slate-800">
            Kelas Binaan Wali Kelas
          </Label>
          <Select
            value={primaryWaliKelas || "none"}
            onValueChange={(val) =>
              onPrimaryWaliKelasChange(val === "none" ? "" : String(val))
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Pilih kelas binaan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Belum ditentukan</SelectItem>
              {classesList.map((cls) => (
                <SelectItem key={cls.id} value={cls.namaKelas}>
                  {cls.namaKelas}
                  {cls.waliKelas ? ` (Saat ini: ${cls.waliKelas})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-0.5">
        <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-blue-600" />
          Peran Tambahan Guru (Opsional)
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Centang tugas tambahan yang dirangkap akun guru ini. Penugasan Wali
          Kelas akan otomatis disinkronkan dengan Data Kelas.
        </p>
      </div>

      <div className="space-y-2">
        {availableExtras.map((extraRole) => {
          const cfg = ROLE_CONFIGS[extraRole];
          const itemState = roleState[extraRole] || {
            enabled: false,
            kelas: "",
            ekskul: "",
          };
          const checkboxId = `${idPrefix}-extra-${extraRole}`;

          return (
            <div
              key={extraRole}
              className="rounded-lg border border-slate-200/80 bg-white p-2.5 space-y-2"
            >
              <label
                htmlFor={checkboxId}
                className="flex items-start gap-2.5 cursor-pointer select-none"
              >
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={itemState.enabled}
                  onChange={(e) => toggleRole(extraRole, e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800">
                    {cfg?.label || extraRole}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {cfg?.description}
                  </p>
                </div>
              </label>

              {itemState.enabled && extraRole === "WALI_KELAS" && (
                <div className="pl-6 space-y-1">
                  <Label className="text-[11px] font-medium text-slate-700">
                    Kelas Binaan
                  </Label>
                  <Select
                    value={itemState.kelas || "none"}
                    onValueChange={(val) =>
                      onChange({
                        ...roleState,
                        [extraRole]: {
                          ...itemState,
                          kelas: val === "none" ? "" : String(val),
                        },
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Pilih kelas binaan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Belum ditentukan</SelectItem>
                      {classesList.map((cls) => (
                        <SelectItem key={cls.id} value={cls.namaKelas}>
                          {cls.namaKelas}
                          {cls.waliKelas ? ` (Saat ini: ${cls.waliKelas})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {itemState.enabled && extraRole === "PEMBINA_EKSKUL" && (
                <div className="pl-6 space-y-1">
                  <Label className="text-[11px] font-medium text-slate-700">
                    Nama Ekstrakurikuler
                  </Label>
                  <Input
                    placeholder="Contoh: Pramuka, Paskibra, Futsal"
                    className="h-8 text-xs"
                    value={itemState.ekskul}
                    onChange={(e) =>
                      onChange({
                        ...roleState,
                        [extraRole]: { ...itemState, ekskul: e.target.value },
                      })
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (val: string) => void;
  username: string;
  onUsernameChange: (val: string) => void;
  password: string;
  onPasswordChange: (val: string) => void;
  email: string;
  onEmailChange: (val: string) => void;
  role: AppRole;
  onRoleChange: (val: AppRole) => void;
  gender: "L" | "P";
  onGenderChange: (val: "L" | "P") => void;
  extraRoles: ExtraRoleFormState;
  onExtraRolesChange: (next: ExtraRoleFormState) => void;
  waliKelas: string;
  onWaliKelasChange: (kelas: string) => void;
  classesList: ClassOption[];
  saving: boolean;
  onSubmit: () => void;
}

export function AddAccountDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  username,
  onUsernameChange,
  password,
  onPasswordChange,
  email,
  onEmailChange,
  role,
  onRoleChange,
  gender,
  onGenderChange,
  extraRoles,
  onExtraRolesChange,
  waliKelas,
  onWaliKelasChange,
  classesList,
  saving,
  onSubmit,
}: AddAccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-blue-600" />
            Tambah Akun Pengguna Baru
          </DialogTitle>
          <DialogDescription className="text-xs">
            Buat akun akses untuk pimpinan, manajemen, guru, atau staf layanan.
            Akun siswa tetap dibuat melalui menu Data Siswa.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3">
          <div className="space-y-1.5">
            <Label htmlFor="add-name" className="text-xs font-medium">
              Nama Lengkap <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="add-name"
              placeholder="Contoh: Drs. H. Mulyadi, M.M."
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-username" className="text-xs font-medium">
                Username Login atau NIP <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="add-username"
                placeholder="Minimal 4 karakter"
                className="font-mono"
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-password" className="text-xs font-medium">
                Kata Sandi Awal <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="add-password"
                type="text"
                placeholder="Minimal 4 karakter"
                className="font-mono"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-email" className="text-xs font-medium">
              Email (Opsional)
            </Label>
            <Input
              id="add-email"
              type="email"
              placeholder="Otomatis dibuatkan dari username bila dikosongkan"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Peran Utama Akun <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={role}
                onValueChange={(val) => onRoleChange(val as AppRole)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_CREATABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_CONFIGS[r]?.label || r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isTeacherCategoryRole(role) && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Jenis Kelamin</Label>
                <Select
                  value={gender}
                  onValueChange={(val) =>
                    onGenderChange(val === "P" ? "P" : "L")
                  }
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 -mt-1">
            {ROLE_CONFIGS[role]?.description}
          </p>

          <TeacherExtraRolesPanel
            primaryRole={role}
            roleState={extraRoles}
            onChange={onExtraRolesChange}
            classesList={classesList}
            idPrefix="add"
            primaryWaliKelas={waliKelas}
            onPrimaryWaliKelasChange={onWaliKelasChange}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Buat Akun Baru
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: AccountRow | null;
  isSuperadmin: boolean;
  name: string;
  onNameChange: (val: string) => void;
  username: string;
  onUsernameChange: (val: string) => void;
  role: AppRole;
  onRoleChange: (val: AppRole) => void;
  extraRoles: ExtraRoleFormState;
  onExtraRolesChange: (next: ExtraRoleFormState) => void;
  waliKelas: string;
  onWaliKelasChange: (kelas: string) => void;
  classesList: ClassOption[];
  saving: boolean;
  onSubmit: () => void;
}

export function EditAccountDialog({
  open,
  onOpenChange,
  editItem,
  isSuperadmin,
  name,
  onNameChange,
  username,
  onUsernameChange,
  role,
  onRoleChange,
  extraRoles,
  onExtraRolesChange,
  waliKelas,
  onWaliKelasChange,
  classesList,
  saving,
  onSubmit,
}: EditAccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profil &amp; Peran Akun</DialogTitle>
          <DialogDescription className="text-xs">
            Perbarui nama lengkap, username kredensial, dan otorisasi peran akun
            ini.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name" className="text-xs font-medium">
              Nama Lengkap
            </Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-username" className="text-xs font-medium">
              Username Login
            </Label>
            <Input
              id="edit-username"
              placeholder="Masukkan username"
              className="font-mono"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
            />
            <p className="text-xs text-slate-500">
              Username digunakan untuk autentikasi masuk bersama kata sandi
              (otomatis tersinkronisasi dengan NIS atau NIP).
            </p>
          </div>

          {isSuperadmin &&
            (editItem?.appRole || "").toUpperCase() === "SISWA" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                Peran akun siswa terhubung langsung dengan Data Siswa dan tidak
                dapat diubah menjadi peran staf atau guru.
              </div>
            )}

          {isSuperadmin &&
            (editItem?.appRole || "").toUpperCase() !== "SISWA" && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-900">
                    Peran Utama (Hak Akses)
                  </Label>
                  <Select
                    value={role}
                    disabled={Boolean(editItem?.isCurrentUser)}
                    onValueChange={(val) => onRoleChange(val as AppRole)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAFF_CREATABLE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_CONFIGS[r]?.label || r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editItem?.isCurrentUser ? (
                    <p className="text-[11px] text-amber-700">
                      Peran utama akun yang sedang digunakan login tidak dapat
                      diubah.
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      {ROLE_CONFIGS[role]?.description}
                    </p>
                  )}
                </div>

                <TeacherExtraRolesPanel
                  primaryRole={role}
                  roleState={extraRoles}
                  onChange={onExtraRolesChange}
                  classesList={classesList}
                  idPrefix="edit"
                  primaryWaliKelas={waliKelas}
                  onPrimaryWaliKelasChange={onWaliKelasChange}
                />
              </div>
            )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resetItem: AccountRow | null;
  newPassword: string;
  onNewPasswordChange: (val: string) => void;
  saving: boolean;
  onSubmit: () => void;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  resetItem,
  newPassword,
  onNewPasswordChange,
  saving,
  onSubmit,
}: ResetPasswordDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Kata Sandi Pengguna</DialogTitle>
          <DialogDescription className="text-xs">
            Tetapkan kata sandi baru untuk akun{" "}
            <span className="font-semibold text-slate-900">
              {resetItem?.name}
            </span>
            .
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2">
            <p className="text-xs font-semibold text-slate-800">
              Referensi Kredensial Bawaan
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Sandi Bawaan (Default):
              </span>
              <code className="rounded bg-white px-2 py-0.5 text-xs font-mono font-bold text-slate-900 border border-slate-200">
                {resetItem?.username || "-"}
              </code>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sandi bawaan akun baru sama dengan Username. Kata sandi aktif
              terenkripsi satu arah sehingga tidak dapat dibaca langsung.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs font-medium">
              Kata Sandi Baru
            </Label>
            <Input
              id="new-password"
              type="text"
              placeholder="Masukkan minimal 4 karakter..."
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-amber-700">
              Sandi baru akan langsung menggantikan sandi lama pengguna.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Konfirmasi Reset Sandi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AccountStatusAlertDialogProps {
  statusTarget: { account: AccountRow; setBanned: boolean } | null;
  onClose: () => void;
  saving: boolean;
  onConfirm: (account: AccountRow, setBanned: boolean) => void;
}

export function AccountStatusAlertDialog({
  statusTarget,
  onClose,
  saving,
  onConfirm,
}: AccountStatusAlertDialogProps) {
  return (
    <AlertDialog
      open={!!statusTarget}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {statusTarget?.setBanned
              ? "Tangguhkan Akses Akun?"
              : "Aktifkan Kembali Akses Akun?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed">
            {statusTarget?.setBanned ? (
              <>
                Apakah Anda yakin ingin menangguhkan akun{" "}
                <strong className="text-slate-900">
                  {statusTarget.account.name}
                </strong>{" "}
                ({statusTarget.account.username || "-"})? Seluruh sesi login
                aktif pengguna ini akan langsung dihentikan dan statusnya
                menjadi nonaktif.
              </>
            ) : (
              <>
                Apakah Anda yakin ingin mengaktifkan kembali akun{" "}
                <strong className="text-slate-900">
                  {statusTarget?.account.name}
                </strong>{" "}
                ({statusTarget?.account.username || "-"}) agar dapat masuk ke
                sistem?
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={saving}>
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={saving}
            className={
              statusTarget?.setBanned
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }
            onClick={() => {
              if (statusTarget) {
                onConfirm(statusTarget.account, statusTarget.setBanned);
              }
            }}
          >
            {saving ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : null}
            {statusTarget?.setBanned ? "Ya, Tangguhkan" : "Ya, Aktifkan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
