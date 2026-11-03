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
        "relative overflow-hidden -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10 pt-7 pb-8 bg-gradient-to-r from-[#091424] via-[#0d1e38] to-[#0a1526] border-b border-white/10 text-white shadow-xs",
        className
      )}
    >
      {/* Subtle Cockpit Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-44 bg-blue-500/10 blur-3xl pointer-events-none rounded-full" />

      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-3">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2.5 drop-shadow-xs">
              {Icon && <Icon className="w-6 h-6 text-blue-400 shrink-0" />}
              <span>{title}</span>
            </h1>
            {badge && (
              typeof badge === "string" ? (
                <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-blue-300 border border-white/10 shadow-xs">
                  {badge}
                </span>
              ) : (
                badge
              )
            )}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-blue-200/75 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {children && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1 [&_.bg-white]:bg-white/5 [&_.text-slate-700]:text-slate-200 [&_.border-slate-200]:border-white/10 [&_.hover\:bg-slate-50:hover]:bg-white/10 [&_.hover\:text-slate-900:hover]:text-white [&_.text-slate-500]:text-slate-400 [&_button[data-variant=outline]]:bg-white/5 [&_button[data-variant=outline]]:border-white/10 [&_button[data-variant=outline]]:text-slate-200 [&_button[data-variant=outline]:hover]:border-amber-400/40 [&_button[data-variant=outline]:hover]:bg-white/10 [&_[data-slot=select-icon]]:text-white [&_[data-slot=select-icon]]:bg-transparent transition-colors">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
