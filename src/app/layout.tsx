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
  title: "SMK Penerbangan Dirgantara — Sistem Tata Kelola Sekolah & SPK Terpadu",
  description:
    "Sistem Administrasi Akademik, Presensi Siswa, dan Evaluasi SPK Siswa Berprestasi SMK Penerbangan Dirgantara",
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
