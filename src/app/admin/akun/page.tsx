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
  STAFF_CREATABLE_ROLES,
  isTeacherCategoryRole,
  parseRoleMetadata,
  type AppRole,
} from "@/lib/rbac";

interface ExtraRoleItem {
  id: string;
  role: string;
  metadata?: string | null;
}

interface AccountRow {
  id: string;
  username: string | null;
  email?: string | null;
  name: string;
  appRole: string | null;
  banned: boolean | null;
  isCurrentUser?: boolean;
  additionalRoles?: ExtraRoleItem[];
}

interface ClassOption {
  id: string;
  namaKelas: string;
  tingkat: string;
  waliKelas?: string | null;
}

type ExtraRoleFormState = Record<
  string,
  {
    enabled: boolean;
    kelas: string;
    ekskul: string;
  }
>;

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

interface TeacherExtraRolesPanelProps {
  primaryRole: AppRole;
  roleState: ExtraRoleFormState;
  onChange: (next: ExtraRoleFormState) => void;
  classesList: ClassOption[];
  idPrefix: string;
  primaryWaliKelas: string;
  onPrimaryWaliKelasChange: (kelas: string) => void;
}

function TeacherExtraRolesPanel({
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
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border transition-colors ${getRolePill(
                            a.appRole
                          )} group-hover/row:bg-slate-800 group-hover/row:text-slate-200 group-hover/row:border-slate-700`}
                        >
                          {ROLE_CONFIGS[a.appRole as AppRole]?.label ||
                            a.appRole ||
                            "-"}
                        </span>
                        {a.additionalRoles?.map((extra) => (
                          <span
                            key={extra.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border bg-amber-50 text-amber-800 border-amber-200 group-hover/row:bg-amber-500/20 group-hover/row:text-amber-200 group-hover/row:border-amber-500/40 transition-colors"
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

      {/* Dialog Tambah Akun Baru (Khusus Superadmin) */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-600" />
              Tambah Akun Pengguna Baru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Buat akun akses untuk pimpinan, manajemen, guru, atau staf
              layanan. Akun siswa tetap dibuat melalui menu Data Siswa.
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
                value={formAddName}
                onChange={(e) => setFormAddName(e.target.value)}
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
                  value={formAddUsername}
                  onChange={(e) => setFormAddUsername(e.target.value)}
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
                  value={formAddPassword}
                  onChange={(e) => setFormAddPassword(e.target.value)}
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
                value={formAddEmail}
                onChange={(e) => setFormAddEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Peran Utama Akun <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formAddRole}
                  onValueChange={(val) => setFormAddRole(val as AppRole)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_CREATABLE_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_CONFIGS[role]?.label || role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isTeacherCategoryRole(formAddRole) && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Jenis Kelamin</Label>
                  <Select
                    value={formAddGender}
                    onValueChange={(val) =>
                      setFormAddGender(val === "P" ? "P" : "L")
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
              {ROLE_CONFIGS[formAddRole]?.description}
            </p>

            <TeacherExtraRolesPanel
              primaryRole={formAddRole}
              roleState={formAddExtraRoles}
              onChange={setFormAddExtraRoles}
              classesList={classesList}
              idPrefix="add"
              primaryWaliKelas={formAddWaliKelas}
              onPrimaryWaliKelasChange={setFormAddWaliKelas}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Buat Akun Baru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Profile & Peran */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profil &amp; Peran Akun</DialogTitle>
            <DialogDescription className="text-xs">
              Perbarui nama lengkap, username kredensial, dan otorisasi peran
              akun ini.
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
                (otomatis tersinkronisasi dengan NIS atau NIP).
              </p>
            </div>

            {isSuperadmin &&
              (editItem?.appRole || "").toUpperCase() === "SISWA" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  Peran akun siswa terhubung langsung dengan Data Siswa dan
                  tidak dapat diubah menjadi peran staf atau guru.
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
                      value={formEditRole}
                      disabled={Boolean(editItem?.isCurrentUser)}
                      onValueChange={(val) => setFormEditRole(val as AppRole)}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAFF_CREATABLE_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_CONFIGS[role]?.label || role}
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
                        {ROLE_CONFIGS[formEditRole]?.description}
                      </p>
                    )}
                  </div>

                  <TeacherExtraRolesPanel
                    primaryRole={formEditRole}
                    roleState={formEditExtraRoles}
                    onChange={setFormEditExtraRoles}
                    classesList={classesList}
                    idPrefix="edit"
                    primaryWaliKelas={formEditWaliKelas}
                    onPrimaryWaliKelasChange={setFormEditWaliKelas}
                  />
                </div>
              )}
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
