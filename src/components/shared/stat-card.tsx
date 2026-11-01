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
  className?: string;
}

const iconToneMap: Record<NonNullable<StatCardProps["color"]>, string> = {
  navy: "bg-slate-100 text-slate-700 border-slate-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
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
  className,
}: StatCardProps) {
  const iconTone = iconToneMap[color] || iconToneMap.slate;
  const resolvedFooterLeft = footerLeft ?? subtitle;

  return (
    <div
      className={cn(
        "bg-white text-slate-900 rounded-lg p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
            {title}
          </p>
          <div className="flex flex-wrap items-baseline gap-2 mt-2">
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {value}
            </h3>
            {trend && (
              <span
                className={cn(
                  "text-xs font-medium flex items-center px-1.5 py-0.5 rounded border",
                  trend.isPositive
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
            "p-2.5 rounded-lg border shrink-0 transition-colors",
            iconTone
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(resolvedFooterLeft || footerRight) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 truncate">{resolvedFooterLeft}</span>
          {footerRight && (
            <span className="text-slate-600 font-medium shrink-0">
              {footerRight}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
