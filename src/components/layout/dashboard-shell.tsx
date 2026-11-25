"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar, type TopbarUser } from "@/components/layout/topbar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { authClient, isSigningOut } from "@/lib/auth-client";
import type { UserRole } from "@/lib/mock-data";
import { getPortalForRole } from "@/lib/rbac";

interface DashboardShellProps {
  children: React.ReactNode;
  role: UserRole;
}

export function DashboardShell({ children, role }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const redirectingRef = useRef(false);

  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending || isSigningOut() || redirectingRef.current) return;

    if (!session) {
      redirectingRef.current = true;
      router.replace("/login");
    } else {
      const userRole = (session?.user as Record<string, unknown>)?.appRole as string | undefined;
      if (userRole) {
        const userPortal = getPortalForRole(userRole);
        const expectedPortal = getPortalForRole(role);
        if (userPortal !== expectedPortal) {
          redirectingRef.current = true;
          router.replace(userPortal);
        }
      }
    }
  }, [isPending, session, role, router]);

  const rawRole = (session?.user as Record<string, unknown>)?.appRole as string | undefined;
  const user: TopbarUser = {
    id: session?.user?.id || "",
    nama: session?.user?.name || "Pengguna",
    username:
      ((session?.user as Record<string, unknown>)?.username as string) || "",
    email: session?.user?.email || "",
    role: (rawRole as UserRole) || role,
    image: session?.user?.image || null,
  };

  if (isPending || isSigningOut()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-12 w-12">
            <Image
              src="/logo.png?v=3"
              alt="Logo SMK Penerbangan Dirgantara"
              fill
              sizes="48px"
              unoptimized
              className="object-contain"
            />
          </div>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-[#1e3a8a]" />
          <p className="text-xs font-medium text-slate-500">
            {isSigningOut() ? "Mengakhiri sesi SIMESA..." : "Memuat SIMESA..."}
          </p>
        </div>
      </div>
    );
  }

  const userRole = (session?.user as Record<string, unknown>)?.appRole as string | undefined;
  if (!session || (userRole && getPortalForRole(userRole) !== getPortalForRole(role))) {
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
            className="w-[280px] p-0 bg-[#0F172A] border-slate-800 text-white"
          >
            <SheetTitle className="sr-only">Menu Navigasi SIMESA SMK Penerbangan Dirgantara</SheetTitle>
            <Sidebar role={user.role} onToggle={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Centered Full-Width Enterprise Main Area */}
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 flex flex-col justify-between gap-8">
          <div className="space-y-6">{children}</div>

          {/* Institutional SIMESA Footer */}
          <footer className="pt-4 pb-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div>
              <span className="font-semibold text-slate-700">SIMESA</span>
              <span className="mx-2 text-slate-300">·</span>
              <span>SMK Penerbangan Dirgantara</span>
              <span className="mx-2 text-slate-300">·</span>
              <span>Sistem Informasi Manajemen Elektronik Sekolah dan Administrasi</span>
            </div>
            <span>
              &copy; {new Date().getFullYear()} SIMESA. Hak Cipta Dilindungi.
            </span>
          </footer>
        </main>
      </div>
    </TooltipProvider>
  );
}
