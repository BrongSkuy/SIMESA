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
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h2>
          {typeof badge === "string" ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-[#1e3a8a] border border-blue-200/70">
              {badge}
            </span>
          ) : (
            badge
          )}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2.5">{children}</div>
      )}
    </section>
  );
}
