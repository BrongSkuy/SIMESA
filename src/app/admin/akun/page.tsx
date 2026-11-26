"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserCog,
  UserPlus,
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
  Shield,
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
import {
  ROLE_CONFIGS,
  APP_ROLES,
  ADDITIONAL_TEACHER_ROLES,
  isTeacherCategoryRole,
  parseRoleMetadata,
  type AppRole,
} from "@/lib/rbac";
import {
  AddAccountDialog,
  EditAccountDialog,
  ResetPasswordDialog,
  AccountStatusAlertDialog,
  type AccountRow,
  type ClassOption,
  type ExtraRoleFormState,
  type ExtraRoleItem,
} from "@/components/akun/account-dialogs";

function createEmptyExtraRoleState(): ExtraRoleFormState {
  const state: ExtraRoleFormState = {};
  for (const role of ADDITIONAL_TEACHER_ROLES) {
    state[role] = { enabled: false, kelas: "", ekskul: "" };
  }
  return state;
}

function parseExtraRolesToState(
  additionalRoles: ExtraRoleItem[] = []
): ExtraRoleFormState {
  const state = createEmptyExtraRoleState();
  for (const item of additionalRoles) {
    const code = item.role.toUpperCase();
    if (!state[code]) continue;
    const meta = parseRoleMetadata(item.metadata);
    state[code] = {
      enabled: true,
      kelas: meta.kelas || "",
      ekskul: meta.ekskul || "",
    };
  }
  return state;
}

function buildExtraRolesPayload(
  primaryRole: AppRole,
  state: ExtraRoleFormState
): Array<{ role: AppRole; kelas?: string; ekskul?: string }> {
  if (!isTeacherCategoryRole(primaryRole)) return [];
  const payload: Array<{ role: AppRole; kelas?: string; ekskul?: string }> = [];
  for (const role of ADDITIONAL_TEACHER_ROLES) {
    if (role === primaryRole) continue;
    const entry = state[role];
    if (!entry?.enabled) continue;
    payload.push({
      role,
      ...(role === "WALI_KELAS" && entry.kelas.trim()
        ? { kelas: entry.kelas.trim() }
        : {}),
      ...(role === "PEMBINA_EKSKUL" && entry.ekskul.trim()
        ? { ekskul: entry.ekskul.trim() }
        : {}),
    });
  }
  return payload;
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
  const [classesList, setClassesList] = useState<ClassOption[]>([]);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add Account States (Superadmin only)
  const [addOpen, setAddOpen] = useState(false);
  const [formAddName, setFormAddName] = useState("");
  const [formAddUsername, setFormAddUsername] = useState("");
  const [formAddEmail, setFormAddEmail] = useState("");
  const [formAddPassword, setFormAddPassword] = useState("");
  const [formAddRole, setFormAddRole] = useState<AppRole>("GURU");
  const [formAddGender, setFormAddGender] = useState<"L" | "P">("L");
  const [formAddWaliKelas, setFormAddWaliKelas] = useState("");
  const [formAddExtraRoles, setFormAddExtraRoles] =
    useState<ExtraRoleFormState>(createEmptyExtraRoleState);

  // Edit Profile & Roles States
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<AccountRow | null>(null);
  const [formEditName, setFormEditName] = useState("");
  const [formEditUsername, setFormEditUsername] = useState("");
  const [formEditRole, setFormEditRole] = useState<AppRole>("ADMIN");
  const [formEditWaliKelas, setFormEditWaliKelas] = useState("");
  const [formEditExtraRoles, setFormEditExtraRoles] =
    useState<ExtraRoleFormState>(createEmptyExtraRoleState);

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
      const [accRes, roleRes, clsRes] = await Promise.all([
        fetch("/api/auth-accounts"),
        fetch("/api/user/roles"),
        fetch("/api/classes"),
      ]);

      if (accRes.ok) {
        const data = await accRes.json();
        setAccounts(Array.isArray(data) ? data : []);
      }

      if (roleRes.ok) {
        const roleData = await roleRes.json();
        const allUserRoles: string[] = Array.isArray(roleData.allRoles)
          ? roleData.allRoles
          : [];
        setIsSuperadmin(
          allUserRoles.some((r) => r.toUpperCase() === "SUPERADMIN")
        );
      }

      if (clsRes.ok) {
        const clsData = await clsRes.json();
        setClassesList(Array.isArray(clsData) ? clsData : []);
      }
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

  const openAdd = () => {
    setFormAddName("");
    setFormAddUsername("");
    setFormAddEmail("");
    setFormAddPassword("");
    setFormAddRole("GURU");
    setFormAddGender("L");
    setFormAddWaliKelas("");
    setFormAddExtraRoles(createEmptyExtraRoleState());
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!formAddName.trim()) {
      toast.error("Nama lengkap wajib diisi");
      return;
    }
    if (formAddUsername.trim().length < 4) {
      toast.error("Username login minimal 4 karakter");
      return;
    }
    if (formAddPassword.trim().length < 4) {
      toast.error("Kata sandi awal minimal 4 karakter");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formAddName.trim(),
          username: formAddUsername.trim(),
          email: formAddEmail.trim() || undefined,
          password: formAddPassword.trim(),
          appRole: formAddRole,
          jenisKelamin: formAddGender,
          waliKelasTarget:
            formAddRole === "WALI_KELAS" && formAddWaliKelas
              ? formAddWaliKelas
              : undefined,
          additionalRoles: buildExtraRolesPayload(
            formAddRole,
            formAddExtraRoles
          ),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menambahkan akun");
      }
      toast.success(`Akun ${formAddName.trim()} berhasil ditambahkan!`);
      setAddOpen(false);
      fetchData();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Gagal menambahkan akun";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (acc: AccountRow) => {
    const primary = ((acc.appRole || "SISWA").toUpperCase() as AppRole);
    const assignedClass =
      classesList.find((c) => c.waliKelas === acc.name)?.namaKelas || "";
    setEditItem(acc);
    setFormEditName(acc.name);
    setFormEditUsername(acc.username || "");
    setFormEditRole(primary);
    setFormEditWaliKelas(assignedClass);
    setFormEditExtraRoles(parseExtraRolesToState(acc.additionalRoles || []));
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editItem || !formEditName.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }

    const cleanEditUsername = formEditUsername.trim();
    if (editItem.username && !cleanEditUsername) {
      toast.error("Username login tidak boleh dikosongkan");
      return;
    }
    if (cleanEditUsername && cleanEditUsername.length < 4) {
      toast.error("Username login minimal 4 karakter");
      return;
    }

    const isStudentAccount =
      (editItem.appRole || "").toUpperCase() === "SISWA";

    const payload: Record<string, unknown> = {
      name: formEditName.trim(),
      username: cleanEditUsername,
    };

    if (isSuperadmin && !isStudentAccount) {
      payload.appRole = formEditRole;
      if (formEditRole === "WALI_KELAS" && formEditWaliKelas) {
        payload.waliKelasTarget = formEditWaliKelas;
      }
      payload.additionalRoles = buildExtraRolesPayload(
        formEditRole,
        formEditExtraRoles
      );
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/auth-accounts/${editItem.id}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menyimpan");
      }
      toast.success("Profil dan peran akun berhasil diperbarui!");
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
    const targetRole = filterRole.toUpperCase();
    const matchRole =
      filterRole === "all" ||
      (a.appRole && a.appRole.toUpperCase() === targetRole) ||
      Boolean(
        a.additionalRoles?.some((r) => r.role.toUpperCase() === targetRole)
      );
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
      [
        "SUPERADMIN",
        "ADMIN",
        "KEPALA_SEKOLAH",
        "STAF_PERPUS",
        "STAF_SARPRAS",
      ].includes(r)
    ) {
      return "bg-slate-100 text-slate-800 border-slate-300";
    }
    if (
      [
        "GURU",
        "WALI_KELAS",
        "GURU_PIKET",
        "GURU_BK",
        "PEMBINA_EKSKUL",
      ].includes(r)
    ) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  const formatExtraRoleBadge = (extra: ExtraRoleItem) => {
    const code = extra.role.toUpperCase() as AppRole;
    const label = ROLE_CONFIGS[code]?.label || extra.role;
    const meta = parseRoleMetadata(extra.metadata);
    if (code === "WALI_KELAS" && meta.kelas) {
      return `+${label} (${meta.kelas})`;
    }
    if (code === "PEMBINA_EKSKUL" && meta.ekskul) {
      return `+${label} (${meta.ekskul})`;
    }
    return `+${label}`;
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
      >
        {isSuperadmin && (
          <Button
            type="button"
            size="sm"
            onClick={openAdd}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold gap-1.5 shadow-xs cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Tambah Akun Baru
          </Button>
        )}
      </PageHeader>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Guru &amp; Tenaga Kependidikan
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
              placeholder="Cari nama pengguna atau username (NIS atau NIP)..."
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
              <SelectTrigger className="w-[180px] h-9 text-xs">
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
                    className="group/row transition-all duration-200 hover:bg-slate-50/90 cursor-pointer border-b border-slate-100 last:border-0"
                  >
                    <TableCell className="pl-6 font-mono text-slate-500 transition-colors">
                      {startIndex + i + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-md bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs border border-slate-200 shrink-0 transition-colors">
                          {getInitials(a.name)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800 transition-colors">
                            {a.name}
                          </span>
                          {a.isCurrentUser && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200">
                              Anda
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-slate-600 transition-colors">
                      {a.username || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border transition-colors ${getRolePill(
                            a.appRole
                          )}   `}
                        >
                          {ROLE_CONFIGS[a.appRole as AppRole]?.label ||
                            a.appRole ||
                            "-"}
                        </span>
                        {a.additionalRoles?.map((extra) => (
                          <span
                            key={extra.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border bg-amber-50 text-amber-800 border-amber-200 transition-colors"
                          >
                            {formatExtraRoleBadge(extra)}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border transition-colors ${
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
                          className="gap-1 text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          onClick={() => openEdit(a)}
                        >
                          <Edit className="h-3 w-3" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="gap-1 text-amber-700 hover:text-amber-800 hover:bg-amber-50 transition-colors"
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
                            className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-30"
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
                            className="gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
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

      <AddAccountDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        name={formAddName}
        onNameChange={setFormAddName}
        username={formAddUsername}
        onUsernameChange={setFormAddUsername}
        password={formAddPassword}
        onPasswordChange={setFormAddPassword}
        email={formAddEmail}
        onEmailChange={setFormAddEmail}
        role={formAddRole}
        onRoleChange={setFormAddRole}
        gender={formAddGender}
        onGenderChange={setFormAddGender}
        extraRoles={formAddExtraRoles}
        onExtraRolesChange={setFormAddExtraRoles}
        waliKelas={formAddWaliKelas}
        onWaliKelasChange={setFormAddWaliKelas}
        classesList={classesList}
        saving={saving}
        onSubmit={handleAdd}
      />

      <EditAccountDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editItem={editItem}
        isSuperadmin={isSuperadmin}
        name={formEditName}
        onNameChange={setFormEditName}
        username={formEditUsername}
        onUsernameChange={setFormEditUsername}
        role={formEditRole}
        onRoleChange={setFormEditRole}
        extraRoles={formEditExtraRoles}
        onExtraRolesChange={setFormEditExtraRoles}
        waliKelas={formEditWaliKelas}
        onWaliKelasChange={setFormEditWaliKelas}
        classesList={classesList}
        saving={saving}
        onSubmit={handleEdit}
      />

      <ResetPasswordDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        resetItem={resetItem}
        newPassword={formNewPassword}
        onNewPasswordChange={setFormNewPassword}
        saving={saving}
        onSubmit={handleReset}
      />

      <AccountStatusAlertDialog
        statusTarget={statusTarget}
        onClose={() => setStatusTarget(null)}
        saving={saving}
        onConfirm={toggleStatus}
      />
    </div>
  );
}
