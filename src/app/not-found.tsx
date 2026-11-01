"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
        <div className="relative h-16 w-16 mx-auto mb-4">
          <Image
            src="/logo.png?v=3"
            alt="Logo SMK Penerbangan Dirgantara"
            fill
            sizes="64px"
            unoptimized
            className="object-contain"
          />
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-blue-50 text-[#1e3a8a] border border-blue-200 mb-3">
          SIMESA · HTTP 404
        </span>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Halaman Tidak Ditemukan
        </h1>
        <p className="mt-2 mb-6 text-xs text-slate-500 leading-relaxed">
          Maaf, tautan atau halaman yang Anda tuju pada sistem SIMESA tidak tersedia atau telah
          dipindahkan. Silakan kembali ke beranda untuk melanjutkan.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e3a8a] hover:bg-[#172554] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Beranda SIMESA
        </Link>
      </div>
    </div>
  );
}
