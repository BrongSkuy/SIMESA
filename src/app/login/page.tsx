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
  AlertTriangle,
  Clock,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { getPortalForRole } from "@/lib/rbac";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const SCHOOL_BUILDING_BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAAOABgDASIAAhEBAxEB/8QAGAAAAwEBAAAAAAAAAAAAAAAAAAQFAwb/xAAjEAABBAEEAQUAAAAAAAAAAAABAgMEEQAFEhMhMSJCYaHw/8QAFwEAAwEAAAAAAAAAAAAAAAAAAAECA//EABwRAAICAgMAAAAAAAAAAAAAAAARAQIDBBIUIf/aAAwDAQACEQMRAD8A3YkM7piVJb2shNK8+VV+rGG5EYLAUaJHt7+jk+Poslh0hmUFNqonf0euwKGNDSEiuZ9aqN+nrCdi78M4w1SRWbcjcPJyISkCzuUBhnFzZrTxLTUfj2CkqKyar4wx9ixPCD//2Q==";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(true);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const { data: session, isPending: sessionLoading } = authClient.useSession();

  // Redirect automatically if user already has an active session
  useEffect(() => {
    if (!sessionLoading && session) {
      const appRole = (session?.user as Record<string, unknown>)?.appRole as string | undefined;
      router.push(getPortalForRole(appRole || "SISWA"));
    }
  }, [sessionLoading, session, router]);

  // Countdown timer effect for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const formatCountdown = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Pre-fill username if remembered (scheduled post-hydration to avoid SSR mismatch)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const savedUser = localStorage.getItem("simesa_remember_user");
        if (savedUser) {
          setUsername(savedUser);
          setRememberMe(true);
        }
      } catch {
        // ignore
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (lockoutSeconds > 0) {
      setError(`Akun sedang dalam masa jeda penguncian. Tunggu ${formatCountdown(lockoutSeconds)}`);
      return;
    }

    const cleanUsername = username.trim();
    if (!cleanUsername) return;

    setLoading(true);

    try {
      // 1. Cek apakah username sedang terkena rate limiting lockout di server
      try {
        const secRes = await fetch(
          `/api/auth/login-security?identifier=${encodeURIComponent(cleanUsername)}`
        );
        if (secRes.ok) {
          const secData = await secRes.json();
          if (secData.isLocked && secData.remainingSeconds > 0) {
            setLockoutSeconds(secData.remainingSeconds);
            setError(
              `Terlalu banyak percobaan gagal. Akun dikunci sementara. Silakan tunggu jeda waktu.`
            );
            setLoading(false);
            return;
          }
        }
      } catch {
        // Abaikan jika network check gagal, lanjutkan verifikasi auth
      }

      // 2. Eksekusi sign-in Better Auth
      const { error: signInError } = await authClient.signIn.username({
        username: cleanUsername,
        password,
      });

      if (signInError) {
        // Catat percobaan gagal di server
        try {
          const failRes = await fetch("/api/auth/login-security", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "failed",
              identifier: cleanUsername,
            }),
          });

          if (failRes.ok) {
            const failData = await failRes.json();
            if (failData.isLocked) {
              setLockoutSeconds(failData.remainingSeconds || 300);
              setError(
                "Batas 5 kali percobaan terlampaui. Akun dikunci sementara selama 5 menit."
              );
              setLoading(false);
              return;
            } else if (failData.remainingAttempts !== undefined) {
              setError(
                `Username atau kata sandi tidak sesuai. Sisa kesempatan: ${failData.remainingAttempts} kali.`
              );
              setLoading(false);
              return;
            }
          }
        } catch {
          // fallback jika endpoint fail gagal
        }

        setError(signInError.message || "Username atau kata sandi tidak sesuai");
        setLoading(false);
        return;
      }

      // 3. Login sukses: Reset catatan percobaan gagal
      try {
        await fetch("/api/auth/login-security", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reset",
            identifier: cleanUsername,
          }),
        });
      } catch {
        // non-blocking
      }

      // Handle remember me preference
      try {
        if (rememberMe) {
          localStorage.setItem("simesa_remember_user", cleanUsername);
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

      router.push(getPortalForRole(appRole || "SISWA"));
    } catch {
      setError("Terjadi kesalahan koneksi. Silakan coba kembali.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col lg:flex-row bg-[#0a192f] lg:bg-white">
      {/* Background Biru + Gedung Sekolah: Penuh di Mobile (< lg), Separuh Kiri di Desktop (>= lg) */}
      <div className="absolute inset-0 lg:right-auto lg:w-1/2 z-0 bg-gradient-to-br from-[#0a192f] via-[#1e3a8a] to-[#0f172a] overflow-hidden pointer-events-none">
        {bgLoaded && (
          <Image
            src="/school-building.jpg"
            alt="Gedung Sekolah SMK Penerbangan Dirgantara"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            unoptimized
            placeholder="blur"
            blurDataURL={SCHOOL_BUILDING_BLUR_DATA_URL}
            className="object-cover object-center opacity-40 mix-blend-luminosity filter contrast-125 brightness-95"
            onError={() => setBgLoaded(false)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a192f]/65 via-[#1e3a8a]/60 to-[#0f172a]/90" />
      </div>

      {/* Sisi Kiri Desktop: Identitas Institusi */}
      <div className="relative z-10 hidden lg:flex lg:w-1/2 min-h-screen flex-col justify-between p-12 xl:p-16 text-white select-none">
        {/* Brand Header Kiri */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0">
            <Image
              src="/logo.png?v=2"
              alt="Logo SMK Penerbangan Dirgantara"
              fill
              sizes="40px"
              unoptimized
              className="object-contain"
            />
          </div>
          <span className="text-sm font-semibold tracking-wide text-white/90">
            SMK Penerbangan Dirgantara
          </span>
        </div>

        {/* Konten Tengah: Logo Besar, SIMESA, & Subtitle */}
        <div className="relative z-10 flex flex-col items-center text-center my-auto py-10">
          <div className="relative h-24 w-24 mb-6 shrink-0 filter drop-shadow-lg">
            <Image
              src="/logo.png?v=2"
              alt="Logo SMK Penerbangan Dirgantara"
              fill
              sizes="96px"
              unoptimized
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-none">
            SIMESA
          </h1>
          <p className="text-base xl:text-lg font-semibold text-blue-100 mt-3">
            Sistem Informasi Manajemen Elektronik Sekolah dan Administrasi
          </p>
          <p className="text-sm font-normal text-blue-200/80 mt-1">
            SMK Penerbangan Dirgantara
          </p>
        </div>

        {/* Konten Bawah: Slogan & Aksen Garis Emas */}
        <div className="relative z-10 text-center pt-6">
          <p className="text-base font-semibold tracking-wide text-white/95 leading-relaxed">
            Bersama Maju,
            <br />
            Meraih Masa Depan
          </p>
          <div className="h-1 w-12 bg-amber-400 rounded-xs mx-auto mt-3" />
        </div>
      </div>

      {/* Sisi Kanan / Mobile Full-Bleed Overlay Container */}
      <div className="relative z-10 flex-1 flex flex-col justify-between p-5 sm:p-8 lg:p-16 xl:p-20 min-h-screen lg:bg-white">
        {/* Mobile Hero Branding (Tampil di layar kecil < lg di atas latar biru + gedung) */}
        <div className="flex flex-col items-center text-center pt-3 pb-6 lg:hidden select-none">
          <div className="relative h-16 w-16 mb-3 shrink-0 filter drop-shadow-lg">
            <Image
              src="/logo.png?v=2"
              alt="Logo SMK Penerbangan Dirgantara"
              fill
              sizes="64px"
              unoptimized
              priority
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-none">
            SIMESA
          </h1>
          <p className="text-xs sm:text-sm font-medium text-blue-100/95 mt-2 max-w-xs leading-snug">
            Sistem Informasi Manajemen Elektronik Sekolah dan Administrasi
          </p>
          <p className="text-xs text-blue-200/80 mt-0.5">
            SMK Penerbangan Dirgantara
          </p>
          <div className="h-1 w-10 bg-amber-400 rounded-xs mx-auto mt-3" />
        </div>

        {/* Form Container (Card putih elegan di mobile, full clean di desktop) */}
        <div className="w-full max-w-md mx-auto my-auto rounded-2xl bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-2xl border border-white/25 lg:rounded-none lg:bg-transparent lg:backdrop-blur-none lg:p-0 lg:py-4 lg:shadow-none lg:border-0">
          <div className="mb-6 lg:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Selamat Datang
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              Masuk untuk mengakses sistem
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Field 1: NIP atau Username */}
            <div className="space-y-1.5">
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                <Input
                  id="username"
                  type="text"
                  placeholder="NIP atau Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading || lockoutSeconds > 0}
                  required
                  className="h-12 rounded-xl pl-11 text-sm border-slate-200 bg-white focus-visible:ring-blue-600 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            </div>

            {/* Field 2: Password */}
            <div className="space-y-1.5">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || lockoutSeconds > 0}
                  required
                  className="h-12 rounded-xl pl-11 pr-11 text-sm border-slate-200 bg-white focus-visible:ring-blue-600 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
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
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Baris Opsi: Ingat Saya & Lupa Password */}
            <div className="flex items-center justify-between text-xs pt-1">
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

            {/* Status Lockout (Timer Mundur) atau Pesan Error */}
            {lockoutSeconds > 0 ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50/95 p-3.5 text-xs text-amber-900 shadow-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
                  <span>Akses Masuk Terkunci Sementara</span>
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  Batas percobaan kata sandi salah (5x) tercapai. Demi keamanan sistem, silakan tunggu jeda waktu:
                </p>
                <div className="text-center py-1">
                  <span className="font-mono text-xl font-extrabold tracking-wider text-amber-950 bg-amber-100/90 px-3.5 py-1 rounded-lg border border-amber-300 inline-block">
                    {formatCountdown(lockoutSeconds)}
                  </span>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : null}

            {/* Tombol Utama: Masuk */}
            <button
              type="submit"
              disabled={loading || lockoutSeconds > 0}
              className="w-full h-12 rounded-xl bg-[#1e3a8a] hover:bg-[#172554] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow cursor-pointer disabled:opacity-50 mt-3"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : lockoutSeconds > 0 ? (
                <Clock className="h-5 w-5" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
              <span>
                {loading
                  ? "Memverifikasi..."
                  : lockoutSeconds > 0
                  ? `Terkunci (${formatCountdown(lockoutSeconds)})`
                  : "Masuk"}
              </span>
            </button>
          </form>
        </div>

        {/* Footer Hak Cipta */}
        <div className="text-center text-xs text-blue-100/75 lg:text-slate-400 pt-6 pb-1">
          © 2026 SIMESA, SMK Penerbangan Dirgantara
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
