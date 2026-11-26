"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Ya, Lanjutkan",
  cancelLabel = "Batal",
  variant = "destructive",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={
                variant === "destructive"
                  ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 border border-rose-200 text-rose-600"
                  : "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 border border-amber-200 text-amber-600"
              }
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-base font-semibold text-slate-900">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={() => void onConfirm()}
            className={
              variant === "destructive"
                ? "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                : "bg-[#1e3a8a] hover:bg-[#172554] text-white cursor-pointer"
            }
          >
            {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
