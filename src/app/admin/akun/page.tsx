"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserCog,
  Search,
  KeyRound,
  Ban,
  CheckCircle2,
  Filter,
  Loader2,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AccountRow {
  id: string;
  username: string | null;
  name: string;
  appRole: string | null;
  banned: boolean | null;
}

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

export default function AdminAkunPage() {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit Profile States
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<AccountRow | null>(null);
  const [formEditName, setFormEditName] = useState("");
  const [formEditUsername, setFormEditUsername] = useState("");

  // Reset Password States
  const [resetOpen, setResetOpen] = useState(false);
  const [resetItem, setResetItem] = useState<AccountRow | null>(null);
  const [formNewPassword, setFormNewPassword] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/auth-accounts");
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Gagal memuat data akun");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleStatus = async (account: AccountRow, setBanned: boolean) => {
    try {
      const res = await fetch(`/api/auth-accounts/${account.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: setBanned }),
      });
      if (!res.ok) throw new Error("Update gagal");
      toast.success(
        `Akun ${account.name} berhasil ${
          setBanned ? "dinonaktifkan" : "diaktifkan"
        }.`
      );
      fetchData();
    } catch {
      toast.error("Gagal mengubah status akun.");
    }
  };

  const openEdit = (acc: AccountRow) => {
    setEditItem(acc);
    setFormEditName(acc.name);
    setFormEditUsername(acc.username || "");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editItem || !formEditName) {
      toast.error("Nama wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/auth-accounts/${editItem.id}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formEditName,
          username: formEditUsername,
        }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      toast.success("Profil akun berhasil diperbarui!");
      setEditOpen(false);
      fetchData();
    } catch {
      toast.error("Gagal memperbarui profil akun");
    } finally {
      setSaving(false);
    }
  };

  const openReset = (acc: AccountRow) => {
    setResetItem(acc);
    setFormNewPassword("");
    setResetOpen(true);
  };

  const handleReset = async () => {
    if (!resetItem || !formNewPassword) {
      toast.error("Password baru wajib diisi");
      return;
    }
    if (formNewPassword.length < 4) {
      toast.error("Karakter password terlalu pendek (minimal 4 karakter)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/auth-accounts/${resetItem.id}/reset`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: formNewPassword }),
      });
      if (!res.ok) throw new Error("Gagal me-reset password");
      toast.success(`Password untuk ${resetItem.name} berhasil di-reset!`);
      setResetOpen(false);
    } catch {
      toast.error("Gagal me-reset password");
    } finally {
      setSaving(false);
    }
  };

  const filtered = accounts.filter((a) => {
    const searchLow = search.toLowerCase();
    const matchSearch =
      a.name?.toLowerCase().includes(searchLow) ||
      a.username?.toLowerCase().includes(searchLow);
    const matchRole =
      filterRole === "all" ||
      (a.appRole && a.appRole.toUpperCase() === filterRole.toUpperCase());
    return matchSearch && matchRole;
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  const getRolePill = (role: string | null) => {
    const r = (role || "").toUpperCase();
    if (r === "ADMIN") {
      return "bg-slate-100 text-slate-800 border-slate-300";
    }
    if (r === "GURU") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Akun & Hak Akses"
        badge={`${accounts.length} Akun Terdaftar`}
        description="Kelola kredensial login, otorisasi peran (RBAC), dan status aktif pengguna sistem"
        icon={UserCog}
      />

      <div className="py-3.5 border-y border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center">

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari nama pengguna atau username (NIS/NIP)..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <Select
              value={filterRole}
              onValueChange={(val) => setFilterRole(val as string)}
            >
              <SelectTrigger className="w-[150px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Peran</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="GURU">Guru</SelectItem>
                <SelectItem value="SISWA">Siswa</SelectItem>
              </SelectContent>
            </Select>
          </div>

      </div>

      <div className="border-b border-slate-200 overflow-x-auto">

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14 pl-6">No</TableHead>
                <TableHead>Pengguna</TableHead>
                <TableHead>Username Login</TableHead>
                <TableHead>Peran (Role)</TableHead>
                <TableHead>Status Akses</TableHead>
                <TableHead className="text-right pr-6">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-slate-500"
                  >
                    Tidak ada akun yang cocok dengan filter pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((a, i) => (
                  <TableRow key={a.id}>
                    <TableCell className="pl-6 font-mono text-slate-500">
                      {i + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-md bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs border border-slate-200 shrink-0">
                          {getInitials(a.name)}
                        </div>
                        <span className="font-semibold text-slate-800">
                          {a.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-slate-600">
                      {a.username || "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getRolePill(
                          a.appRole
                        )}`}
                      >
                        {a.appRole || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${
                          !a.banned
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-xs ${
                            !a.banned ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {!a.banned ? "Aktif" : "Ditangguhkan"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          className="gap-1 text-slate-700 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => openEdit(a)}
                        >
                          <Edit className="h-3 w-3" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="gap-1 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                          onClick={() => openReset(a)}
                        >
                          <KeyRound className="h-3 w-3" /> Reset Sandi
                        </Button>
                        {!a.banned ? (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => toggleStatus(a, true)}
                          >
                            <Ban className="h-3 w-3" /> Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => toggleStatus(a, false)}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Aktifkan
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

      </div>

      {/* Dialog Edit Profile */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profil Akun</DialogTitle>
            <DialogDescription className="text-xs">
              Perbarui nama lengkap dan username kredensial akses akun ini.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs font-medium">
                Nama Lengkap
              </Label>
              <Input
                id="edit-name"
                value={formEditName}
                onChange={(e) => setFormEditName(e.target.value)}
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
                value={formEditUsername}
                onChange={(e) => setFormEditUsername(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Username digunakan untuk autentikasi masuk bersama kata sandi.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Reset Password */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
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
                Sandi bawaan akun baru sama dengan Username (
                {resetItem?.appRole === "ADMIN"
                  ? "admin"
                  : resetItem?.appRole === "GURU"
                    ? "NIP"
                    : "NIS"}
                ). Kata sandi aktif terenkripsi satu arah sehingga tidak dapat
                dibaca langsung.
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
                value={formNewPassword}
                onChange={(e) => setFormNewPassword(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-amber-700">
                Sandi baru akan langsung menggantikan sandi lama pengguna.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleReset} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Konfirmasi Reset Sandi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
