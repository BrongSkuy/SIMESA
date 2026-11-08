"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Loader2, LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UserRole } from "@/lib/mock-data";
import { authClient } from "@/lib/auth-client";
import {
  ADMIN_DROPDOWN_GROUPS,
  GURU_NAV_ITEMS,
  SISWA_NAV_ITEMS,
} from "@/components/layout/topbar";

interface SidebarProps {
  role: UserRole;
  collapsed?: boolean;
  onToggle: () => void;
}

export function Sidebar({ role, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const homeHref = `/${role.toLowerCase()}`;

  const isRouteActive = (href: string) => {
    if (href === homeHref) return pathname === homeHref;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    toast.loading("Mengakhiri sesi...", { id: "logout-toast" });
    try {
      await authClient.signOut();
      toast.success("Berhasil keluar dari sistem", { id: "logout-toast" });
      onToggle();
      router.push("/login");
    } catch {
      toast.error("Gagal keluar", { id: "logout-toast" });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#091424] via-[#0d1e38] to-[#0a1526] text-white">
      {/* Header Brand */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 h-16 shrink-0">
        <div className="relative h-9 w-9 shrink-0">
          <Image
            src="/logo.png?v=2"
            alt="Logo SMK Penerbangan Dirgantara"
            fill
            sizes="36px"
            unoptimized
            className="object-contain"
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-extrabold tracking-wide text-white uppercase">
              SIMESA
            </span>
            <span className="text-[10px] font-medium text-amber-300/90 border border-amber-400/30 px-1 rounded-sm">
              SMK
            </span>
          </div>
          <p className="text-[11px] text-blue-200/80 truncate mt-0.5">
            {role === "ADMIN"
              ? "Sistem Administrasi"
              : role === "GURU"
                ? "Portal Guru"
                : "Portal Siswa"}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-4">
          {role === "ADMIN" ? (
            <>
              <div>
                <Link
                  href="/admin"
                  onClick={onToggle}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-all border",
                    pathname === "/admin"
                      ? "bg-white/10 border-amber-400/40 text-amber-200 font-semibold shadow-[0_0_12px_rgba(251,191,36,0.1)]"
                      : "border-transparent text-blue-100/80 hover:bg-white/10 hover:text-white font-medium"
                  )}
                >
                  <LayoutDashboard className={cn("w-4 h-4", pathname === "/admin" ? "text-amber-300" : "text-blue-200")} />
                  Beranda
                </Link>
              </div>

              {ADMIN_DROPDOWN_GROUPS.map((group) => (
                <div key={group.label} className="space-y-1">
                  <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-blue-200/70">
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isRouteActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onToggle}
                        className={cn(
                          "flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-all border",
                          active
                            ? "bg-white/10 border-amber-400/40 text-amber-200 font-semibold shadow-[0_0_12px_rgba(251,191,36,0.1)]"
                            : "border-transparent text-blue-100/80 hover:bg-white/10 hover:text-white font-medium"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={cn("w-4 h-4", active ? "text-amber-300" : "text-blue-200")} />
                          <span>{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </>
          ) : (
            <div className="space-y-1">
              {(role === "GURU" ? GURU_NAV_ITEMS : SISWA_NAV_ITEMS).map(
                (item) => {
                  const Icon = item.icon;
                  const active = isRouteActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onToggle}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-all border",
                        active
                          ? "bg-white/10 border-amber-400/40 text-amber-200 font-semibold shadow-[0_0_12px_rgba(251,191,36,0.1)]"
                          : "border-transparent text-blue-100/80 hover:bg-white/10 hover:text-white font-medium"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn("w-4 h-4", active ? "text-amber-300" : "text-blue-200")} />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                }
              )}
            </div>
          )}

          <div className="pt-2 border-t border-white/10 space-y-1">
            <Link
              href={`${homeHref}/profil`}
              onClick={onToggle}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-all border",
                isRouteActive(`${homeHref}/profil`)
                  ? "bg-white/10 border-amber-400/40 text-amber-200 font-semibold shadow-[0_0_12px_rgba(251,191,36,0.1)]"
                  : "border-transparent text-blue-100/80 hover:bg-white/10 hover:text-white font-medium"
              )}
            >
              <UserIcon className={cn("w-4 h-4", isRouteActive(`${homeHref}/profil`) ? "text-amber-300" : "text-blue-200")} />
              <span>Profil Akun</span>
            </Link>
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-300 hover:bg-white/10 hover:text-rose-200 transition-colors text-left cursor-pointer disabled:opacity-50"
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              <span>{isLoggingOut ? "Keluar..." : "Keluar"}</span>
            </button>
          </div>
        </nav>
      </ScrollArea>
    </div>
  );
}
