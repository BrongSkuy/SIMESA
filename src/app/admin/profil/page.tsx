"use client";

import { useState } from "react";
import { User, KeyRound, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AD"
  );
}

export default function AdminProfilPage() {
  const { data: session } = authClient.useSession();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi sandi baru tidak cocok.");
      return;
    }
    if (newPassword.length < 4) {
      toast.error("Sandi baru minimal 4 karakter.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.changePassword({
        newPassword,
        currentPassword,
        revokeOtherSessions: true,
      });

      if (error) {
        throw new Error(error.message || "Gagal mengubah kata sandi.");
      }

      toast.success("Kata sandi berhasil diperbarui!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const userName = session?.user?.name || "Administrator";
  const username =
    ((session?.user as Record<string, unknown>)?.username as string) ||
    session?.user?.email ||
    "-";
  const appRole =
    ((session?.user as Record<string, unknown>)?.appRole as string) || "ADMIN";

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Profil & Keamanan Administrator"
        badge="Akun Saya"
        description="Kelola identitas akun administrator dan perbarui kata sandi otentikasi"
        icon={User}
      />

      <div className="grid gap-6 md:grid-cols-5">
        {/* Identity Column */}
        <div className="md:col-span-2 md:border-r border-slate-200 md:pr-8 space-y-6">
          <div className="space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 bg-[#1e3a8a] flex items-center justify-center text-white font-bold text-base shrink-0">
                {getInitials(userName)}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {userName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pengguna Sistem Aktif
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 text-xs">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Username / ID Login
                </p>
                <p className="font-mono text-sm text-slate-800 mt-1 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md w-fit">
                  {username}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Peran Akses
                </p>
                <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-[#1e3a8a] border border-blue-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {appRole}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-500 leading-relaxed">
            Mengganti kata sandi akan otomatis memperbarui kredensial masuk akun
            Anda pada sistem ini.
          </div>
        </div>

        {/* Password Update Column */}
        <div className="md:col-span-3 space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <KeyRound className="h-4 w-4 text-blue-600" /> Perbarui Kata Sandi
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Gunakan kombinasi kata sandi yang kuat untuk menjaga keamanan
              akses panel kontrol
            </p>
          </div>
          <div className="pt-2">
            <div className="mb-5 border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
              <p className="font-semibold text-slate-800 mb-1">
                Catatan Keamanan:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li>
                  Kata sandi terenkripsi secara kriptografis dan tidak dapat
                  ditampilkan dalam teks biasa.
                </li>
                <li>
                  Sandi bawaan akun awal umumnya sama dengan Username atau{" "}
                  <code className="font-mono text-slate-800">admin123</code>.
                </li>
              </ul>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current" className="text-xs font-medium">
                  Kata Sandi Saat Ini
                </Label>
                <div className="relative">
                  <Input
                    id="current"
                    type={showCurrent ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-10 h-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showCurrent ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new" className="text-xs font-medium">
                  Kata Sandi Baru
                </Label>
                <div className="relative">
                  <Input
                    id="new"
                    type={showNew ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10 h-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showNew ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-xs font-medium">
                  Konfirmasi Kata Sandi Baru
                </Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10 h-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Simpan Kata Sandi Baru
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
