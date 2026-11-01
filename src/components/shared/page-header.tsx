import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  children?: React.ReactNode; // action buttons
}

export function PageHeader({
  title,
  description,
  badge,
  children,
}: PageHeaderProps) {
  return (
    <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
      <div className="border-l-4 border-[#1e3a8a] pl-3.5">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs sm:text-sm text-slate-500">
          {typeof badge === "string" ? (
            <span className="font-semibold text-[#1e3a8a]">{badge}</span>
          ) : (
            badge
          )}
          {badge && description && <span className="text-slate-300">·</span>}
          {description && <span>{description}</span>}
        </div>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2.5">{children}</div>
      )}
    </section>
  );
}
