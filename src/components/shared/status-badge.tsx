import { cn } from "@/lib/utils";

export type AttendanceStatus = "HADIR" | "IZIN" | "SAKIT" | "ALFA";

interface StatusBadgeProps {
  status: AttendanceStatus | string;
  className?: string;
  size?: "sm" | "default";
}

const statusConfig: Record<
  AttendanceStatus,
  { label: string; className: string }
> = {
  HADIR: {
    label: "Hadir",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  IZIN: {
    label: "Izin",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  SAKIT: {
    label: "Sakit",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  ALFA: {
    label: "Alfa",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

export function StatusBadge({
  status,
  className,
  size = "default",
}: StatusBadgeProps) {
  const normalized = (status || "").toUpperCase() as AttendanceStatus;
  const config = statusConfig[normalized] || {
    label: status || "-",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium border rounded-md whitespace-nowrap",
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

