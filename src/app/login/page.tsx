"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.41 7.36 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.29 2.59 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  // Pre-fill username from rememberMe if available
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("simesa_remember_user");
      if (savedUser) {
        setUsername(savedUser);
        setRememberMe(true);
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await authClient.signIn.username({
        username: username.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message || "Username atau kata sandi tidak sesuai");
        setLoading(false);
        return;
      }

      // Handle remember me preference
      try {
        if (rememberMe) {
          localStorage.setItem("simesa_remember_user", username.trim());
        } else {
          localStorage.removeItem("simesa_remember_user");
        }
      } catch {
        // ignore
      }

      const { data: session } = await authClient.getSession();
      const appRole = (session?.user as Record<string, unknown>)?.appRole as
        | string
        | undefined;

      if (appRole === "ADMIN") {
        router.push("/admin");
      } else if (appRole === "GURU") {
        router.push("/guru");
      } else {
        router.push("/siswa");
      }
    } catch {
      setError("Terjadi kesalahan koneksi. Silakan coba kembali.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast.info("Integrasi Single Sign-On Google", {
      description:
        "Fitur login Google terhubung dengan akun belajar @sekolah.id. Untuk saat ini, silakan gunakan NIP atau NIS Anda.",
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 sm:p-6 lg:p-8">
      {/* Split Dual-Column Card */}
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-xl grid grid-cols-1 md:grid-cols-2 min-h-[580px]">
        {/* Kolom Kiri: Hero & Identitas Institusi (Clean Deep Blue, NO BUBBLES) */}
        <div className="relative flex flex-col justify-between p-8 sm:p-10 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white overflow-hidden">
          {/* Subtle Institutional Architectural Backdrop Texture */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* Top subtle badge */}
          <div className="relative z-10">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-900/60 text-blue-200 border border-blue-700/50">
              Portal Akademik &amp; SPK
            </span>
          </div>

          {/* Konten Tengah: Logo, SIMESA, & Subtitle */}
          <div className="relative z-10 flex flex-col items-center text-center my-auto py-8">
            <div className="relative h-20 w-20 mb-4 rounded-full bg-white/10 p-2 border border-white/20 backdrop-blur-xs flex items-center justify-center shadow-lg">
              <Image
                src="/logo.png?v=2"
                alt="Logo SMK Penerbangan Dirgantara"
                fill
                sizes="80px"
                unoptimized
                className="object-contain p-1"
                priority
              />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-none">
              SIMESA
            </h1>
            <p className="text-sm sm:text-base font-semibold text-blue-100 mt-2">
              Sistem Informasi Sekolah Terpadu
            </p>
            <p className="text-xs font-normal text-blue-200/80 mt-1">
              SMK Penerbangan Dirgantara
            </p>
          </div>

          {/* Konten Bawah: Slogan & Aksen Garis Emas */}
          <div className="relative z-10 text-center pt-4">
            <p className="text-sm font-semibold tracking-wide text-white/95 leading-relaxed">
              Bersama Maju,
              <br />
              Meraih Masa Depan
            </p>
            <div className="h-1 w-10 bg-amber-400 rounded-full mx-auto mt-2.5" />
          </div>
        </div>

        {/* Kolom Kanan: Formulir Login */}
        <div className="flex flex-col justify-between p-8 sm:p-10 bg-white">
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Selamat Datang
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Masuk untuk mengakses sistem
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Field 1: NIP atau Username */}
              <div className="space-y-1.5">
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="NIP atau Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="h-11 rounded-xl pl-10 text-sm border-slate-200 bg-white focus-visible:ring-blue-600"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div className="space-y-1.5">
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 rounded-xl pl-10 pr-10 text-sm border-slate-200 bg-white focus-visible:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    aria-label={
                      showPassword
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Baris Opsi: Ingat Saya & Lupa Password */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Ingat saya</span>
                </label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-blue-600 hover:text-blue-700 hover:underline font-medium cursor-pointer"
                >
                  Lupa password?
                </button>
              </div>

              {/* Pesan Error */}
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                  {error}
                </div>
              )}

              {/* Tombol Utama: Masuk */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#1e3a8a] hover:bg-[#172554] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                <span>{loading ? "Memverifikasi..." : "Masuk"}</span>
              </button>
            </form>

            {/* Divider atau */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 font-medium">
                  atau
                </span>
              </div>
            </div>

            {/* Tombol Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center justify-center gap-2.5 transition-colors shadow-2xs cursor-pointer"
            >
              <GoogleIcon className="h-4 w-4" />
              <span>Masuk dengan Google</span>
            </button>
          </div>

          {/* Footer Hak Cipta */}
          <div className="text-center text-xs text-slate-400 pt-6">
            © 2026 SIMESA, SMK Penerbangan Dirgantara
          </div>
        </div>
      </div>

      {/* Dialog Modal Lupa Password */}
      <Dialog open={forgotModalOpen} onOpenChange={setForgotModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <HelpCircle className="h-5 w-5" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Bantuan Kata Sandi
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Petunjuk akses dan pemulihan kata sandi akun SIMESA:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-slate-600">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2">
              <p className="font-semibold text-slate-800">Kata Sandi Bawaan:</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>
                  <strong>Siswa:</strong> Gunakan Nomor Induk Siswa (NIS) Anda.
                </li>
                <li>
                  <strong>Guru / Staf:</strong> Gunakan Nomor Induk Pegawai
                  (NIP) Anda.
                </li>
              </ul>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Jika Anda telah mengubah kata sandi dan lupa, silakan hubungi{" "}
              <strong className="text-slate-700">Wali Kelas</strong> atau{" "}
              <strong className="text-slate-700">
                Staf Tata Usaha / Administrator
              </strong>{" "}
              sekolah untuk melakukan reset kata sandi akun Anda.
            </p>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Mengerti
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
