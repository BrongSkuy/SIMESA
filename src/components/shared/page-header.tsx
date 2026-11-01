import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  children?: React.ReactNode; // action buttons
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  icon: Icon,
  children,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "rounded-xl bg-[#091524] border border-slate-800/80 p-5 sm:p-6 overflow-hidden shadow-sm text-white bg-gradient-to-r from-[#091524] via-[#0E1E34] to-[#091524]",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 border-l-4 border-blue-500 pl-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              {Icon && <Icon className="w-5 h-5 text-blue-400 shrink-0" />}
              <span>{title}</span>
            </h1>
            {badge && (
              typeof badge === "string" ? (
                <span className="inline-flex items-center rounded-sm bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-300 border border-blue-500/30">
                  {badge}
                </span>
              ) : (
                badge
              )
            )}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {children && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 [&_.bg-white]:bg-slate-900/90 [&_.text-slate-700]:text-slate-200 [&_.border-slate-200]:border-slate-700/80 [&_.hover\:bg-slate-50:hover]:bg-slate-800 [&_.hover\:text-slate-900:hover]:text-white [&_.text-slate-500]:text-slate-400 [&_button[data-variant=outline]]:bg-slate-900/90 [&_button[data-variant=outline]]:border-slate-700/80 [&_button[data-variant=outline]]:text-slate-200">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
