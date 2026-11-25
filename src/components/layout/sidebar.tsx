"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UserRole } from "@/lib/mock-data";
import { getPortalForRole, ROLE_CONFIGS, type AppRole } from "@/lib/rbac";
import {
  ADMIN_DROPDOWN_GROUPS,
  GURU_DROPDOWN_GROUPS,
  SISWA_DROPDOWN_GROUPS,
} from "@/components/layout/topbar";

interface SidebarProps {
  role: UserRole;
  collapsed?: boolean;
  onToggle: () => void;
}

export function Sidebar({ role, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const currentPortal = getPortalForRole(role);
  const homeHref = currentPortal;
  const roleConfig = ROLE_CONFIGS[role as AppRole];

  const isRouteActive = (href: string) => {
    if (href === homeHref) return pathname === homeHref;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isPortalAdmin = currentPortal === "/admin";
  const isPortalGuru = currentPortal === "/guru";

  const activeLinkClass = "bg-white/12 text-white font-semibold";
  const inactiveLinkClass =
    "text-slate-300 hover:bg-white/[0.06] hover:text-white font-medium";

  return (
    <div className="flex h-full flex-col bg-[#0F172A] text-white">
      {/* Header Brand */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 h-16 shrink-0">
        <div className="relative h-8 w-8 shrink-0">
          <Image
            src="/logo.png?v=2"
            alt="Logo SMK Penerbangan Dirgantara"
            fill
            sizes="32px"
            unoptimized
            className="object-contain"
          />
        </div>
        <div className="min-w-0">
          <span className="text-sm font-bold tracking-tight text-white">
            SIMESA
          </span>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">
            {roleConfig ? roleConfig.label : "Portal Pengguna"}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-4">
          {isPortalAdmin ? (
            <>
              <div>
                <Link
                  href="/admin"
                  onClick={onToggle}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors",
                    pathname === "/admin" ? activeLinkClass : inactiveLinkClass
                  )}
                >
                  <LayoutDashboard
                    className={cn(
                      "w-4 h-4",
                      pathname === "/admin" ? "text-amber-300" : "text-slate-400"
                    )}
                  />
                  Beranda
                </Link>
              </div>

              {ADMIN_DROPDOWN_GROUPS.map((group) => (
                <div key={group.label} className="space-y-1">
                  <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
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
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors",
                          active ? activeLinkClass : inactiveLinkClass
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4",
                            active ? "text-amber-300" : "text-slate-400"
                          )}
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </>
          ) : isPortalGuru ? (
            <>
              <div>
                <Link
                  href="/guru"
                  onClick={onToggle}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors",
                    pathname === "/guru" ? activeLinkClass : inactiveLinkClass
                  )}
                >
                  <LayoutDashboard
                    className={cn(
                      "w-4 h-4",
                      pathname === "/guru" ? "text-amber-300" : "text-slate-400"
                    )}
                  />
                  Beranda
                </Link>
              </div>

              {GURU_DROPDOWN_GROUPS.map((group) => (
                <div key={group.label} className="space-y-1">
                  <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
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
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors",
                          active ? activeLinkClass : inactiveLinkClass
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4",
                            active ? "text-amber-300" : "text-slate-400"
                          )}
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}

              <div>
                <Link
                  href="/guru/leaderboard"
                  onClick={onToggle}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors",
                    pathname === "/guru/leaderboard"
                      ? activeLinkClass
                      : inactiveLinkClass
                  )}
                >
                  <Trophy
                    className={cn(
                      "w-4 h-4",
                      pathname === "/guru/leaderboard"
                        ? "text-amber-300"
                        : "text-slate-400"
                    )}
                  />
                  Leaderboard
                </Link>
              </div>
            </>
          ) : (
            <>
              <div>
                <Link
                  href="/siswa"
                  onClick={onToggle}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors",
                    pathname === "/siswa" ? activeLinkClass : inactiveLinkClass
                  )}
                >
                  <LayoutDashboard
                    className={cn(
                      "w-4 h-4",
                      pathname === "/siswa" ? "text-amber-300" : "text-slate-400"
                    )}
                  />
                  Beranda
                </Link>
              </div>

              {SISWA_DROPDOWN_GROUPS.map((group) => (
                <div key={group.label} className="space-y-1">
                  <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
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
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors",
                          active ? activeLinkClass : inactiveLinkClass
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4",
                            active ? "text-amber-300" : "text-slate-400"
                          )}
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}

              <div>
                <Link
                  href="/siswa/leaderboard"
                  onClick={onToggle}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors",
                    pathname === "/siswa/leaderboard"
                      ? activeLinkClass
                      : inactiveLinkClass
                  )}
                >
                  <Trophy
                    className={cn(
                      "w-4 h-4",
                      pathname === "/siswa/leaderboard"
                        ? "text-amber-300"
                        : "text-slate-400"
                    )}
                  />
                  Leaderboard
                </Link>
              </div>
            </>
          )}
        </nav>
      </ScrollArea>
    </div>
  );
}
