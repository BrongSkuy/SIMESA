import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

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
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full bg-slate-50 antialiased`}
    >
      <body className="min-h-full font-sans text-slate-800 antialiased bg-slate-50 flex flex-col">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
