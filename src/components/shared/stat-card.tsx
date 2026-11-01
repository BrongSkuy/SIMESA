import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  badge?: React.ReactNode;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
  color?: "navy" | "slate" | "amber" | "emerald" | "rose" | "blue";
  variant?: "light" | "dark";
  className?: string;
}

const iconToneMap: Record<NonNullable<StatCardProps["color"]>, string> = {
  navy: "bg-blue-50 text-[#1e3a8a] border-blue-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blue: "bg-blue-50 text-[#1e3a8a] border-blue-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
};

const darkIconToneMap: Record<NonNullable<StatCardProps["color"]>, string> = {
  navy: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  slate: "bg-slate-800 text-slate-300 border-slate-700",
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  rose: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  badge,
  footerLeft,
  footerRight,
  color = "slate",
  variant = "light",
  className,
}: StatCardProps) {
  const isDark = variant === "dark";
  const iconTone = isDark
    ? darkIconToneMap[color] || darkIconToneMap.slate
    : iconToneMap[color] || iconToneMap.slate;
  const resolvedFooterLeft = footerLeft ?? subtitle;

  return (
    <div
      className={cn(
        isDark ? "bg-transparent text-white" : "bg-white text-slate-900",
        "p-4 sm:p-5 flex flex-col justify-between",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-wider truncate",
              isDark ? "text-slate-400" : "text-slate-500"
            )}
          >
            {title}
          </p>
          <div className="flex flex-wrap items-baseline gap-2 mt-2">
            <h3
              className={cn(
                "text-2xl sm:text-3xl font-bold tracking-tight tabular-nums",
                isDark ? "text-white" : "text-slate-900"
              )}
            >
              {value}
            </h3>
            {trend && (
              <span
                className={cn(
                  "text-xs font-medium flex items-center px-1.5 py-0.5 rounded-sm border",
                  isDark
                    ? trend.isPositive
                      ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
                      : "text-rose-400 bg-rose-500/15 border-rose-500/30"
                    : trend.isPositive
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : "text-rose-700 bg-rose-50 border-rose-200"
                )}
              >
                {trend.isPositive ? (
                  <ArrowUp className="w-3 h-3 mr-0.5" />
                ) : (
                  <ArrowDown className="w-3 h-3 mr-0.5" />
                )}
                {trend.isPositive ? "+" : "-"}
                {Math.abs(trend.value)}%
              </span>
            )}
            {badge}
          </div>
        </div>

        <div
          className={cn(
            "p-2.5 rounded-md border shrink-0 transition-colors",
            iconTone
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(resolvedFooterLeft || footerRight) && (
        <div
          className={cn(
            "mt-4 pt-3 flex items-center justify-between gap-2 text-xs",
            isDark ? "border-t border-slate-800/80" : "border-t border-slate-100"
          )}
        >
          <span
            className={cn("truncate", isDark ? "text-slate-400" : "text-slate-500")}
          >
            {resolvedFooterLeft}
          </span>
          {footerRight && (
            <span
              className={cn(
                "font-medium shrink-0",
                isDark ? "text-slate-300" : "text-slate-600"
              )}
            >
              {footerRight}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
