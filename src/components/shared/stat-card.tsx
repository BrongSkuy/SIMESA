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
  onClick?: () => void;
  className?: string;
}

const iconToneMap: Record<NonNullable<StatCardProps["color"]>, string> = {
  navy: "bg-blue-50 text-[#1e3a8a] border-blue-200/70",
  slate: "bg-slate-100 text-slate-600 border-slate-200/80",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  blue: "bg-blue-50 text-[#1e3a8a] border-blue-200/70",
  amber: "bg-amber-50 text-amber-700 border-amber-200/70",
  rose: "bg-rose-50 text-rose-700 border-rose-200/70",
};

const darkIconToneMap: Record<NonNullable<StatCardProps["color"]>, string> = {
  navy: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  blue: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  slate: "bg-slate-800 text-slate-300 border-slate-700",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
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
  onClick,
  className,
}: StatCardProps) {
  const isDark = variant === "dark";
  const iconTone = isDark
    ? darkIconToneMap[color] || darkIconToneMap.slate
    : iconToneMap[color] || iconToneMap.slate;
  const resolvedFooterLeft = footerLeft ?? subtitle;

  return (
    <div
      onClick={onClick}
      className={cn(
        isDark
          ? "bg-slate-900/60 text-white"
          : "bg-white text-slate-900 transition-colors",
        onClick &&
          (isDark
            ? "cursor-pointer hover:bg-slate-800/80"
            : "cursor-pointer hover:bg-slate-50/70"),
        "p-4 sm:p-5 flex flex-col justify-between",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-xs font-medium truncate",
              isDark ? "text-slate-400" : "text-slate-500"
            )}
          >
            {title}
          </p>
          <div className="flex flex-wrap items-baseline gap-2 mt-1.5">
            <h3
              className={cn(
                "text-2xl sm:text-[26px] font-bold tracking-tight tabular-nums leading-tight",
                isDark ? "text-white" : "text-slate-900"
              )}
            >
              {value}
            </h3>
            {trend && (
              <span
                className={cn(
                  "text-[11px] font-semibold inline-flex items-center px-1.5 py-0.5 rounded-md border",
                  isDark
                    ? trend.isPositive
                      ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30"
                      : "text-rose-300 bg-rose-500/15 border-rose-500/30"
                    : trend.isPositive
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200/80"
                      : "text-rose-700 bg-rose-50 border-rose-200/80"
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
            "p-2 rounded-lg border shrink-0",
            iconTone
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {(resolvedFooterLeft || footerRight) && (
        <div
          className={cn(
            "mt-3.5 pt-2.5 flex items-center justify-between gap-2 text-xs",
            isDark
              ? "border-t border-slate-800"
              : "border-t border-slate-100"
          )}
        >
          <span
            className={cn(
              "truncate",
              isDark ? "text-slate-400" : "text-slate-500"
            )}
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
