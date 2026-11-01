"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar, type TopbarUser } from "@/components/layout/topbar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import type { UserRole } from "@/lib/mock-data";

interface DashboardShellProps {
  children: React.ReactNode;
  role: UserRole;
}

export function DashboardShell({ children, role }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  const user: TopbarUser = {
    id: session?.user?.id || "",
    nama: session?.user?.name || "Pengguna",
    username:
      ((session?.user as Record<string, unknown>)?.username as string) || "",
    email: session?.user?.email || "",
    role,
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
          <p className="text-xs font-medium text-slate-500">
            Memuat ruang kerja...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
        {/* Sticky Dark Enterprise Top Navigation Bar */}
        <Topbar user={user} onMenuClick={() => setMobileOpen(true)} />

        {/* Mobile Dark Navigation Drawer (< lg) */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="w-[280px] p-0 bg-slate-900 border-slate-800 text-white"
          >
            <SheetTitle className="sr-only">Menu Navigasi SMK Penerbangan Dirgantara</SheetTitle>
            <Sidebar role={role} onToggle={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Centered Full-Width Enterprise Main Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col justify-between gap-8">
          <div className="space-y-6">{children}</div>

          {/* Institutional Footer */}
          <footer className="pt-4 pb-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div>
              <span>SMK Penerbangan Dirgantara</span>
              <span className="mx-2 text-slate-300">·</span>
              <span>Sistem Presensi &amp; Evaluasi SPK</span>
            </div>
            <span>
              &copy; {new Date().getFullYear()} Hak Cipta Dilindungi.
            </span>
          </footer>
        </main>
      </div>
    </TooltipProvider>
  );
}
