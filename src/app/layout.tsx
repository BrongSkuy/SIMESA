import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SIMESA — Sistem Informasi Sekolah Terpadu | SMK Penerbangan Dirgantara",
  description:
    "Sistem Informasi Sekolah Terpadu (SIMESA) — Administrasi Akademik, Presensi, dan Evaluasi Prestasi SMK Penerbangan Dirgantara",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} h-full bg-slate-50 antialiased`}
    >
      <body className="min-h-full font-sans text-slate-800 antialiased bg-slate-50 flex flex-col">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
