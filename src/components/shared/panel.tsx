import React from "react";
import { cn } from "@/lib/utils";

interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  headerClassName?: string;
  bodyClassName?: string;
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  headerClassName,
  bodyClassName,
  ...props
}: PanelProps) {
  const hasHeader = title || description || action;

  return (
    <div
      className={cn(
        "bg-white",
        className
      )}
      {...props}
    >
      {hasHeader && (
        <div
          className={cn(
            "pb-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white",
            headerClassName
          )}
        >
          <div>
            {typeof title === "string" ? (
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                {title}
              </h3>
            ) : (
              title
            )}
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn("pt-4", bodyClassName)}>{children}</div>
    </div>
  );
}
