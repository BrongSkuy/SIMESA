"use client";

import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 text-blue-400 border border-slate-800 shadow-xs">
          <FileQuestion className="h-7 w-7" />
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200 mb-3">
          HTTP 404
        </span>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Halaman Tidak Ditemukan
        </h1>
        <p className="mt-2 mb-6 text-xs text-slate-500 leading-relaxed">
          Maaf, tautan atau halaman yang Anda tuju tidak tersedia atau telah
          dipindahkan. Silakan kembali ke dashboard utama untuk melanjutkan.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
