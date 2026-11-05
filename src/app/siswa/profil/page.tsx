"use client";

import { useState, useRef, useEffect } from "react";
import {
  User,
  KeyRound,
  Loader2,
  Eye,
  EyeOff,
  BookUser,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  IdCard,
  GraduationCap,
  Mail,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { AvatarCropModal } from "@/components/shared/avatar-crop-modal";

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "SW"
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

export default function ProfilSiswaPage() {
  const { data: session } = authClient.useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Avatar Crop Modal state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [studentMeta, setStudentMeta] = useState<{
    nis?: string;
    kelas?: string;
    angkatan?: string;
  } | null>(null);

  useEffect(() => {
    if (session?.user?.name && !displayName) {
      setDisplayName(session.user.name);
    }
    if (session?.user?.image && !photoPreview) {
      setPhotoPreview(session.user.image);
    }
  }, [session, displayName, photoPreview]);

  useEffect(() => {
    fetch("/api/students/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.error) {
          setStudentMeta({
            nis: data.nis,
            kelas: data.kelas,
            angkatan: data.angkatan,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Handle Photo Selection -> Buka Interactive Crop Modal
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File yang dipilih harus berupa gambar.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImageSrc(event.target?.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Simpan hasil potongan foto profil ke server
  const handleApplyCroppedPhoto = async (croppedDataUrl: string) => {
    setUploadingPhoto(true);
    try {
      setPhotoPreview(croppedDataUrl);

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: croppedDataUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memperbarui foto profil");
      }

      toast.success("Foto profil berhasil diperbarui!");
      setCropModalOpen(false);
      setSelectedImageSrc(null);
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah foto";
      toast.error(msg);
    } finally {
      setUploadingPhoto(false);
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

  // Handle Password Change
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
    studentMeta?.nis ||
    ((session?.user as Record<string, unknown>)?.username as string) ||
    "-";
  const userEmail = session?.user?.email || `${username}@siswa.simesa.sch.id`;
  const kelasLabel = studentMeta?.kelas
    ? `Kelas ${studentMeta.kelas}${studentMeta.angkatan ? ` · Angkatan ${studentMeta.angkatan}` : ""}`
    : "Peserta Didik Aktif";
  const appRole =
    ((session?.user as Record<string, unknown>)?.appRole as string) || "SISWA";

  const strength = calculateStrength(newPassword);

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Profil & Keamanan Akun Siswa"
        badge="Portal Siswa"
        description="Kelola foto profil akun peserta didik dan perbarui kata sandi login Anda"
        icon={User}
      />

      <div className="grid gap-6 md:grid-cols-5">
        {/* Kolom Identitas & Foto */}
        <div className="md:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Foto Profil & Info Identitas Bersatu */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shadow-xs">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Foto Profil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1e3a8a] text-white font-bold text-xl flex items-center justify-center">
                      {getInitials(displayName || session?.user?.name || "Siswa")}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-1 -right-1 p-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow border-2 border-white transition-all cursor-pointer"
                  title="Ubah Foto Profil"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Camera className="w-3 h-3" />
                  )}
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {displayName || session?.user?.name || "Peserta Didik"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Akun Siswa Aktif
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5 gap-1.5 border-slate-300"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    <Camera className="w-3 h-3 text-blue-600" />
                    {photoPreview ? "Ganti Foto" : "Unggah Foto"}
                  </Button>
                  {photoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs"
                      onClick={handleRemovePhoto}
                      disabled={uploadingPhoto}
                      title="Hapus Foto Profil"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />

            {/* Modal Dialog Interaktif untuk Penyesuaian Foto Profil (Crop, Zoom, Geser) */}
            <AvatarCropModal
              open={cropModalOpen}
              imageSrc={selectedImageSrc}
              onClose={() => {
                setCropModalOpen(false);
                setSelectedImageSrc(null);
              }}
              onApply={handleApplyCroppedPhoto}
              isSaving={uploadingPhoto}
            />

            {/* 4 Kartu Detail Kredensial & Peran dengan Dark Hover */}
            <div className="grid grid-cols-1 gap-2.5 text-xs">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:shadow-lg group cursor-pointer flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-blue-600 shrink-0 transition-colors group-hover:bg-blue-500/20 group-hover:text-blue-400 group-hover:border-blue-500/30">
                  <IdCard className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
                    NIS / Username Login
                  </p>
                  <p className="font-mono text-sm font-bold text-slate-900 group-hover:text-white mt-0.5 truncate transition-colors">
                    {username}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:shadow-lg group cursor-pointer flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-emerald-600 shrink-0 transition-colors group-hover:bg-emerald-500/20 group-hover:text-emerald-400 group-hover:border-emerald-500/30">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
                    Kelas & Angkatan
                  </p>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-white mt-0.5 truncate transition-colors">
                    {kelasLabel}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:shadow-lg group cursor-pointer flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-amber-600 shrink-0 transition-colors group-hover:bg-amber-500/20 group-hover:text-amber-400 group-hover:border-amber-500/30">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
                    Email Akun
                  </p>
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-white mt-0.5 truncate transition-colors">
                    {userEmail}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:shadow-lg group cursor-pointer flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-indigo-600 shrink-0 transition-colors group-hover:bg-indigo-500/20 group-hover:text-indigo-400 group-hover:border-indigo-500/30">
                  <BookUser className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
                    Role Sistem
                  </p>
                  <span className="inline-flex items-center gap-1.5 mt-0.5 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-[#1e3a8a] border border-blue-200 group-hover:bg-blue-500/20 group-hover:text-blue-300 group-hover:border-blue-500/30 transition-colors">
                    {appRole}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs text-slate-500 leading-relaxed transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:text-slate-300 hover:shadow-lg group cursor-pointer flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-500 group-hover:text-amber-400 shrink-0 mt-0.5 transition-colors" />
            <span>
              Jangan bagikan kata sandi akun Anda kepada siapapun. Hubungi Wali Kelas atau Administrator bila lupa kata sandi.
            </span>
          </div>
        </div>

        {/* Kolom Update Password */}
        <div className="md:col-span-3 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <KeyRound className="h-4 w-4 text-blue-600" /> Perbarui Kata Sandi
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ubah kata sandi bawaan (NIS) Anda demi menjaga kerahasiaan akun pribadi
            </p>
          </div>

          <div className="pt-2">
            <div className="mb-5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 text-xs text-slate-600 transition-all duration-300 hover:bg-[#091524] hover:border-slate-800 hover:text-slate-300 hover:shadow-lg group cursor-pointer">
              <p className="font-semibold text-slate-800 group-hover:text-white mb-1.5 flex items-center gap-1.5 transition-colors">
                <AlertCircle className="w-3.5 h-3.5 text-blue-600 group-hover:text-blue-400 transition-colors" /> Catatan Keamanan:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600 group-hover:text-slate-300 transition-colors">
                <li>
                  Kata sandi terenkripsi secara kriptografis dan tidak dapat ditampilkan dalam teks biasa.
                </li>
                <li>
                  Sandi bawaan awal adalah nomor NIS Anda. Disarankan menggantinya dengan kata sandi baru.
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
