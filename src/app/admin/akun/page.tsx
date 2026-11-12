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
  ShieldCheck,
  Users,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import {
  LeaderboardPagination,
  LEADERBOARD_ITEMS_PER_PAGE,
} from "@/components/LeaderboardCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_CONFIGS, APP_ROLES, type AppRole } from "@/lib/rbac";

interface AccountRow {
  id: string;
  username: string | null;
  name: string;
  appRole: string | null;
  banned: boolean | null;
  isCurrentUser?: boolean;
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
  const [currentPage, setCurrentPage] = useState(1);
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

  // Confirm Suspend/Activate State
  const [statusTarget, setStatusTarget] = useState<{
    account: AccountRow;
    setBanned: boolean;
  } | null>(null);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterRole]);

  const toggleStatus = async (account: AccountRow, setBanned: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/auth-accounts/${account.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned: setBanned }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Update gagal");
      }
      toast.success(
        `Akun ${account.name} berhasil ${
          setBanned ? "ditangguhkan" : "diaktifkan kembali"
        }.`
      );
      setStatusTarget(null);
      fetchData();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Gagal mengubah status akun.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (acc: AccountRow) => {
    setEditItem(acc);
    setFormEditName(acc.name);
    setFormEditUsername(acc.username || "");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editItem || !formEditName.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/auth-accounts/${editItem.id}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formEditName.trim(),
          username: formEditUsername.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menyimpan");
      }
      toast.success("Profil akun berhasil diperbarui!");
      setEditOpen(false);
      fetchData();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Gagal memperbarui profil akun";
      toast.error(msg);
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
    if (formNewPassword.trim().length < 4) {
      toast.error("Karakter password terlalu pendek (minimal 4 karakter)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/auth-accounts/${resetItem.id}/reset`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: formNewPassword.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal me-reset password");
      }
      toast.success(`Password untuk ${resetItem.name} berhasil di-reset!`);
      setResetOpen(false);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Gagal me-reset password";
      toast.error(msg);
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

  const totalStaff = accounts.filter(
    (a) => (a.appRole || "").toUpperCase() !== "SISWA"
  ).length;
  const totalSiswa = accounts.filter(
    (a) => (a.appRole || "").toUpperCase() === "SISWA"
  ).length;
  const totalBanned = accounts.filter((a) => a.banned).length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  const getRolePill = (role: string | null) => {
    const r = (role || "").toUpperCase();
    if (
      ["SUPERADMIN", "ADMIN", "KEPALA_SEKOLAH", "STAF_PERPUS", "STAF_SARPRAS"].includes(
        r
      )
    ) {
      return "bg-slate-100 text-slate-800 border-slate-300";
    }
    if (
      ["GURU", "WALI_KELAS", "GURU_PIKET", "GURU_BK", "PEMBINA_EKSKUL"].includes(
        r
      )
    ) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  const startIndex = (currentPage - 1) * LEADERBOARD_ITEMS_PER_PAGE;
  const paginatedAccounts = filtered.slice(
    startIndex,
    startIndex + LEADERBOARD_ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Akun & Hak Akses"
        badge={`${accounts.length} Akun Terdaftar`}
        description="Kelola kredensial login, otorisasi peran (RBAC), dan status aktif pengguna sistem"
        icon={UserCog}
      />

      {/* Summary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Guru & Tenaga Kependidikan
            </p>
            <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
              {totalStaff}{" "}
              <span className="text-xs font-normal text-slate-500">Akun</span>
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Akun Siswa</p>
            <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
              {totalSiswa}{" "}
              <span className="text-xs font-normal text-slate-500">Akun</span>
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <GraduationCap className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Status Akses Pengguna
            </p>
            <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
              {accounts.length - totalBanned}{" "}
              <span className="text-xs font-normal text-emerald-600">
                Aktif
              </span>
              {totalBanned > 0 && (
                <span className="text-xs font-normal text-rose-600 ml-2">
                  · {totalBanned} Ditangguhkan
                </span>
              )}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Card Container */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center">
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
                {APP_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_CONFIGS[role]?.label || role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead className="w-14 pl-6">No</TableHead>
                <TableHead>Pengguna</TableHead>
                <TableHead>Username Login</TableHead>
                <TableHead>Peran (Role)</TableHead>
                <TableHead>Status Akses</TableHead>
                <TableHead className="text-right pr-6">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAccounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-slate-500 text-xs"
                  >
                    Tidak ada akun yang cocok dengan filter pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAccounts.map((a, i) => (
                  <TableRow
                    key={a.id}
                    className="group/row transition-all duration-200 hover:bg-[#091524] hover:shadow-md cursor-pointer border-b border-slate-100 last:border-0"
                  >
                    <TableCell className="pl-6 font-mono text-slate-500 group-hover/row:text-slate-400 transition-colors">
                      {startIndex + i + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-md bg-slate-100 group-hover/row:bg-slate-800 text-slate-700 group-hover/row:text-white font-semibold flex items-center justify-center text-xs border border-slate-200 group-hover/row:border-slate-700 shrink-0 transition-colors">
                          {getInitials(a.name)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800 group-hover/row:text-white transition-colors">
                            {a.name}
                          </span>
                          {a.isCurrentUser && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200 group-hover/row:bg-blue-500/20 group-hover/row:text-blue-300 group-hover/row:border-blue-500/40">
                              Anda
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-slate-600 group-hover/row:text-slate-300 transition-colors">
                      {a.username || "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border transition-colors ${getRolePill(
                          a.appRole
                        )} group-hover/row:bg-slate-800 group-hover/row:text-slate-200 group-hover/row:border-slate-700`}
                      >
                        {ROLE_CONFIGS[a.appRole as AppRole]?.label || a.appRole || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border transition-colors ${
                          !a.banned
                            ? "bg-emerald-50 group-hover/row:bg-emerald-500/15 text-emerald-700 group-hover/row:text-emerald-300 border-emerald-200 group-hover/row:border-emerald-500/30"
                            : "bg-rose-50 group-hover/row:bg-rose-500/15 text-rose-700 group-hover/row:text-rose-300 border-rose-200 group-hover/row:border-rose-500/30"
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
                          className="gap-1 text-slate-700 group-hover/row:text-slate-300 hover:text-blue-600 hover:bg-blue-50 group-hover/row:hover:bg-slate-800 transition-colors"
                          onClick={() => openEdit(a)}
                        >
                          <Edit className="h-3 w-3" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="gap-1 text-amber-700 group-hover/row:text-amber-400 hover:text-amber-800 hover:bg-amber-50 group-hover/row:hover:bg-amber-950/40 transition-colors"
                          onClick={() => openReset(a)}
                        >
                          <KeyRound className="h-3 w-3" /> Reset Sandi
                        </Button>
                        {!a.banned ? (
                          <Button
                            variant="ghost"
                            size="xs"
                            disabled={a.isCurrentUser}
                            title={
                              a.isCurrentUser
                                ? "Akun yang sedang digunakan login tidak dapat ditangguhkan"
                                : "Tangguhkan akses akun"
                            }
                            className="gap-1 text-rose-600 group-hover/row:text-rose-400 hover:text-rose-700 hover:bg-rose-50 group-hover/row:hover:bg-rose-950/40 transition-colors disabled:opacity-30"
                            onClick={() =>
                              setStatusTarget({ account: a, setBanned: true })
                            }
                          >
                            <Ban className="h-3 w-3" /> Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="gap-1 text-emerald-600 group-hover/row:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 group-hover/row:hover:bg-emerald-950/40 transition-colors"
                            onClick={() =>
                              setStatusTarget({ account: a, setBanned: false })
                            }
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

        {filtered.length > LEADERBOARD_ITEMS_PER_PAGE && (
          <div className="px-5 pb-4">
            <LeaderboardPagination
              currentPage={currentPage}
              totalItems={filtered.length}
              itemsPerPage={LEADERBOARD_ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
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
                Username digunakan untuk autentikasi masuk bersama kata sandi
                (otomatis tersinkronisasi dengan NIS/NIP).
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
                Sandi bawaan akun baru sama dengan Username. Kata sandi aktif terenkripsi satu arah sehingga tidak dapat
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

      {/* AlertDialog Confirm Suspend / Activate */}
      <AlertDialog
        open={!!statusTarget}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
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
            <AlertDialogCancel
              onClick={() => setStatusTarget(null)}
              disabled={saving}
            >
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
                  toggleStatus(statusTarget.account, statusTarget.setBanned);
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
    </div>
  );
}
