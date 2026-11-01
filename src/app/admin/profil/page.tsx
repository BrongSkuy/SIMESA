"use client";

import { useState, useRef, useEffect } from "react";
import {
  User,
  KeyRound,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { compressImage } from "@/lib/image-compress";

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

function calculateStrength(pass: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!pass) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 8) score += 1;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score <= 2) {
    return { score: 1, label: "Lemah", color: "bg-rose-500 text-rose-600" };
  }
  if (score <= 3) {
    return { score: 2, label: "Sedang", color: "bg-amber-500 text-amber-600" };
  }
  return { score: 3, label: "Kuat", color: "bg-emerald-500 text-emerald-600" };
}

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid password") ||
    lower.includes("incorrect password") ||
    lower.includes("current password")
  ) {
    return "Kata sandi saat ini tidak sesuai.";
  }
  if (lower.includes("too short") || lower.includes("at least")) {
    return "Kata sandi baru minimal 4 karakter.";
  }
  return message;
}

export default function AdminProfilPage() {
  const { data: session } = authClient.useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile data state
  const [displayName, setDisplayName] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (session?.user?.name && !displayName) {
      setDisplayName(session.user.name);
    }
    if (session?.user?.image && !photoPreview) {
      setPhotoPreview(session.user.image);
    }
  }, [session, displayName, photoPreview]);

  // Handle Photo Upload
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const compressedDataUrl = await compressImage(file, 360, 0.85);
      setPhotoPreview(compressedDataUrl);

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressedDataUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memperbarui foto profil");
      }

      toast.success("Foto profil berhasil diperbarui!");
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah foto";
      toast.error(msg);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Remove Photo
  const handleRemovePhoto = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus foto profil?")) return;

    setUploadingPhoto(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus foto profil");
      }

      setPhotoPreview(null);
      toast.success("Foto profil berhasil dihapus!");
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus foto";
      toast.error(msg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle Save Name
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Nama lengkap tidak boleh kosong.");
      return;
    }

    setSavingName(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memperbarui nama");
      }

      toast.success("Nama profil berhasil disimpan!");
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan nama";
      toast.error(msg);
    } finally {
      setSavingName(false);
    }
  };

  // Handle Password Change with all security fixes
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Masukkan kata sandi saat ini.");
      return;
    }

    if (newPassword.length < 4) {
      toast.error("Kata sandi baru minimal 4 karakter.");
      return;
    }

    if (newPassword === currentPassword) {
      toast.error("Kata sandi baru tidak boleh sama dengan kata sandi saat ini.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setSavingPassword(true);
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
      const rawMsg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      toast.error(translateAuthError(rawMsg));
    } finally {
      setSavingPassword(false);
    }
  };

  const username =
    ((session?.user as Record<string, unknown>)?.username as string) ||
    session?.user?.email ||
    "-";
  const appRole =
    ((session?.user as Record<string, unknown>)?.appRole as string) || "ADMIN";

  const strength = calculateStrength(newPassword);

  return (
    <div className="space-y-6 w-full max-w-5xl">
      <PageHeader
        title="Profil & Keamanan Administrator"
        badge="Akun Saya"
        description="Kelola identitas, foto profil, dan perbarui kata sandi akun administrator"
        icon={User}
      />

      <div className="grid gap-6 md:grid-cols-5">
        {/* Kolom Identitas & Foto */}
        <div className="md:col-span-2 md:border-r border-slate-200 md:pr-8 space-y-6">
          <div className="space-y-5">
            {/* Foto Profil & Upload */}
            <div className="flex flex-col items-center sm:items-start gap-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center shadow-sm">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Foto Profil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1e3a8a] text-white font-bold text-2xl flex items-center justify-center">
                      {getInitials(displayName || session?.user?.name || "Admin")}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute inset-0 bg-black/50 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-[11px] font-medium cursor-pointer"
                  title="Ubah Foto Profil"
                >
                  <Camera className="w-5 h-5" />
                  <span>Ubah Foto</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 gap-1.5 border-slate-300"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  {photoPreview ? "Ganti Foto" : "Unggah Foto"}
                </Button>
                {photoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 text-center sm:text-left">
                Format JPG, PNG, atau WebP. Otomatis dikompresi agar ringan.
              </p>
            </div>

            {/* Form Ubah Nama Lengkap */}
            <form onSubmit={handleSaveName} className="space-y-3 pt-3 border-t border-slate-100">
              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-xs font-semibold text-slate-700">
                  Nama Tampilan
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nama Lengkap Administrator"
                    className="h-9 text-xs"
                    required
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 text-xs shrink-0"
                    disabled={savingName || displayName === session?.user?.name}
                  >
                    {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Simpan"}
                  </Button>
                </div>
              </div>
            </form>

            {/* Detail Kredensial & Peran */}
            <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Username / ID Login
                </p>
                <p className="font-mono text-xs text-slate-800 mt-1 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md w-fit">
                  {username}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Peran Akses
                </p>
                <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-[#1e3a8a] border border-blue-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {appRole}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 bg-slate-50 p-3.5 rounded-lg text-xs text-slate-600 leading-relaxed">
            Foto profil dan nama tampilan ini akan muncul pada navigasi atas serta sistem audit aktivitas.
          </div>
        </div>

        {/* Kolom Update Password */}
        <div className="md:col-span-3 space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <KeyRound className="h-4 w-4 text-blue-600" /> Perbarui Kata Sandi
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Gunakan kombinasi kata sandi yang kuat untuk menjaga keamanan akses panel kontrol
            </p>
          </div>

          <div className="pt-2">
            <div className="mb-5 border border-slate-200 bg-slate-50 p-3.5 rounded-lg text-xs text-slate-600">
              <p className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-blue-600" /> Catatan Keamanan:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li>
                  Kata sandi terenkripsi secara kriptografis dan tidak dapat ditampilkan dalam teks biasa.
                </li>
                <li>
                  Kata sandi baru tidak boleh sama dengan kata sandi saat ini demi standar keamanan.
                </li>
              </ul>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* Kata Sandi Saat Ini */}
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
                    placeholder="Masukkan sandi lama"
                    className="pr-10 h-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Kata Sandi Baru */}
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
                    placeholder="Minimal 4 karakter"
                    className="pr-10 h-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="pt-1.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Kekuatan Sandi:</span>
                      <span className={`font-semibold ${strength.color.split(" ")[1]}`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                      <div
                        className={`h-full rounded-full transition-all ${
                          strength.score >= 1 ? strength.color.split(" ")[0] : "bg-transparent"
                        }`}
                        style={{ width: "33%" }}
                      />
                      <div
                        className={`h-full rounded-full transition-all ${
                          strength.score >= 2 ? strength.color.split(" ")[0] : "bg-transparent"
                        }`}
                        style={{ width: "33%" }}
                      />
                      <div
                        className={`h-full rounded-full transition-all ${
                          strength.score >= 3 ? strength.color.split(" ")[0] : "bg-transparent"
                        }`}
                        style={{ width: "34%" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Konfirmasi Kata Sandi Baru */}
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
                    placeholder="Ulangi sandi baru"
                    className="pr-10 h-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword && (
                  <p
                    className={`text-[11px] flex items-center gap-1 ${
                      newPassword === confirmPassword ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {newPassword === confirmPassword ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Konfirmasi sandi cocok
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" /> Sandi belum cocok
                      </>
                    )}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={savingPassword}>
                {savingPassword ? (
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
