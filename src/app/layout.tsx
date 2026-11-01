import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title:
    "SIMESA — Sistem Informasi Manajemen Elektronik Sekolah dan Administrasi | SMK Penerbangan Dirgantara",
  description:
    "SIMESA (Sistem Informasi Manajemen Elektronik Sekolah dan Administrasi) — Portal Akademik, Presensi, dan Evaluasi Prestasi SMK Penerbangan Dirgantara",
  icons: {
    icon: [
      { url: "/logo.png?v=3", type: "image/png" },
      { url: "/favicon.ico?v=3" },
    ],
    shortcut: "/logo.png?v=3",
    apple: "/logo.png?v=3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className="h-full bg-white antialiased"
    >
      <body className="min-h-full font-sans text-slate-800 antialiased bg-white flex flex-col">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
