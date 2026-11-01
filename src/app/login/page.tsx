"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogIn, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await authClient.signIn.username({
        username,
        password,
      });

      if (signInError) {
        setError(signInError.message || "Username atau kata sandi tidak sesuai");
        setLoading(false);
        return;
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 py-12">
      {/* Login Card */}
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Brand Header */}
        <div className="border-b border-slate-100 bg-slate-900 px-6 py-6 text-white">
          <div className="flex items-center gap-3.5">
            <div className="relative h-11 w-11 shrink-0">
              <Image
                src="/logo.png?v=2"
                alt="Logo SMK Penerbangan Dirgantara"
                fill
                sizes="44px"
                unoptimized
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-tight">
                SMK Penerbangan Dirgantara
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Sistem Administrasi Sekolah &amp; SPK Terpadu
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Masuk ke Portal Akademik
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Masukkan username (NIP / NIS) dan kata sandi Anda.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="username"
                className="text-xs font-semibold text-slate-700"
              >
                Username (NIP / NIS)
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Contoh: admin001 / NIP / NIS"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-10 text-xs border-slate-200 bg-slate-50/50 focus:bg-white focus-visible:ring-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-semibold text-slate-700"
              >
                Kata Sandi
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 text-xs border-slate-200 bg-slate-50/50 pr-10 focus:bg-white focus-visible:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700 cursor-pointer"
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

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {loading ? "Memverifikasi..." : "Masuk ke Sistem"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} SMK Penerbangan Dirgantara
          </div>
        </div>
      </div>
    </div>
  );
}
