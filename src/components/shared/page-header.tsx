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
        "-mt-6 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10 py-5 bg-white border-b border-slate-200/90",
        className
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          {Icon && (
            <div className="hidden sm:flex h-10 w-10 rounded-lg bg-blue-50/80 border border-blue-100 text-[#1e3a8a] items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {title}
              </h1>
              {badge &&
                (typeof badge === "string" ? (
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200/80">
                    {badge}
                  </span>
                ) : (
                  badge
                ))}
            </div>
            {description && (
              <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {children && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
