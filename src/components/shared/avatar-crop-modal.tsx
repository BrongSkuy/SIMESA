"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Check,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";

interface AvatarCropModalProps {
  open: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onApply: (croppedDataUrl: string) => Promise<void> | void;
  isSaving?: boolean;
}

const VIEWPORT_SIZE = 280; // Ukuran kotak potong dalam pixel
const OUTPUT_SIZE = 360; // Ukuran ekspor avatar ideal (360x360 px)

export function AvatarCropModal({
  open,
  imageSrc,
  onClose,
  onApply,
  isSaving = false,
}: AvatarCropModalProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const offsetStartRef = useRef({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);

  // Reset state saat modal dibuka dengan gambar baru
  useEffect(() => {
    if (open && imageSrc) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
      setNaturalSize(null);
    }
  }, [open, imageSrc]);

  // Load dimensi asli gambar
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setNaturalSize({ width: naturalWidth, height: naturalHeight });
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  // Hitung skala dasar agar gambar mengisi kotak potong (cover mode)
  const baseScale = naturalSize
    ? Math.max(VIEWPORT_SIZE / naturalSize.width, VIEWPORT_SIZE / naturalSize.height)
    : 1;

  const currentScale = baseScale * scale;
  const displayedWidth = naturalSize ? naturalSize.width * currentScale : VIEWPORT_SIZE;
  const displayedHeight = naturalSize ? naturalSize.height * currentScale : VIEWPORT_SIZE;

  // Batas geser (clamping) dengan sedikit toleransi agar terasa alami
  const maxOffsetX = Math.max(0, (displayedWidth - VIEWPORT_SIZE) / 2) + 40;
  const maxOffsetY = Math.max(0, (displayedHeight - VIEWPORT_SIZE) / 2) + 40;

  const clampOffset = (x: number, y: number) => ({
    x: Math.max(-maxOffsetX, Math.min(maxOffsetX, x)),
    y: Math.max(-maxOffsetY, Math.min(maxOffsetY, y)),
  });

  // Pointer event handlers (Mendukung mouse desktop & layar sentuh ponsel)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isSaving) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    offsetStartRef.current = { ...offset };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isSaving) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    setOffset(
      clampOffset(
        offsetStartRef.current.x + deltaX,
        offsetStartRef.current.y + deltaY
      )
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Abaikan jika pointer capture telah dilepas otomatis
      }
      setIsDragging(false);
    }
  };

  // Zoom menggunakan scroll wheel mouse
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isSaving) return;
    const delta = e.deltaY * -0.0015;
    setScale((prev) => Math.min(3, Math.max(1, +(prev + delta).toFixed(2))));
  };

  // Reset zoom dan posisi ke tengah
  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  // Ekspor hasil potong ke kanvas 360x360 px
  const handleConfirmCrop = useCallback(() => {
    if (!imageRef.current || !naturalSize) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Rasio transformasi antara viewport layar (280px) dan canvas output (360px)
    const ratio = OUTPUT_SIZE / VIEWPORT_SIZE;

    const imgCenterX = (VIEWPORT_SIZE - displayedWidth) / 2 + offset.x;
    const imgCenterY = (VIEWPORT_SIZE - displayedHeight) / 2 + offset.y;

    // Aktifkan smoothing kualitas tinggi
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Gambar potongan yang tepat sesuai dengan tampilan layar
    ctx.drawImage(
      imageRef.current,
      imgCenterX * ratio,
      imgCenterY * ratio,
      displayedWidth * ratio,
      displayedHeight * ratio
    );

    // Hasilkan JPEG terkompresi berkualitas tinggi (~35KB)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    onApply(dataUrl);
  }, [naturalSize, displayedWidth, displayedHeight, offset, onApply]);

  if (!imageSrc) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-md p-5 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200">
        <DialogHeader className="gap-1 pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2 text-[#1e3a8a]">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <DialogTitle className="text-base font-bold text-slate-900">
              Sesuaikan Foto Profil
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Geser posisi dan perbesar foto agar wajah berada tepat di tengah bingkai avatar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* Kotak Potong Interaktif (Interactive Viewport) */}
          <div
            className="relative overflow-hidden select-none bg-slate-950 rounded-2xl shadow-inner touch-none cursor-grab active:cursor-grabbing border-2 border-slate-300"
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            {/* Gambar yang dapat digeser dan di-zoom */}
            <div
              className="absolute pointer-events-none transition-transform will-change-transform"
              style={{
                left: (VIEWPORT_SIZE - displayedWidth) / 2 + offset.x,
                top: (VIEWPORT_SIZE - displayedHeight) / 2 + offset.y,
                width: displayedWidth,
                height: displayedHeight,
              }}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={handleImageLoad}
                className="w-full h-full object-fill pointer-events-none select-none max-w-none"
                draggable={false}
              />
            </div>

            {/* Panduan Grid Rule-of-Thirds Halus */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-25">
              <div className="border-r border-b border-white/60" />
              <div className="border-r border-b border-white/60" />
              <div className="border-b border-white/60" />
              <div className="border-r border-b border-white/60" />
              <div className="border-r border-b border-white/60" />
              <div className="border-b border-white/60" />
              <div className="border-r border-white/60" />
              <div className="border-r border-white/60" />
              <div />
            </div>

            {/* Panduan Bingkai Avatar (Rounded-Square Mask) */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl ring-2 ring-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]" />

            {/* Indikator Panduan Geser di Sudut */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 text-white/90 text-[10px] px-2 py-0.5 rounded-full backdrop-blur-xs pointer-events-none font-medium">
              <Move className="w-3 h-3 text-amber-300" />
              <span>Geser Foto</span>
            </div>
          </div>

          {/* Kontrol Zoom & Reset */}
          <div className="w-full max-w-[280px] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-blue-600" /> Perbesaran
              </span>
              <span className="font-mono text-slate-800 font-semibold text-[11px] bg-slate-100 px-2 py-0.5 rounded-md">
                {Math.round(scale * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                className="h-7 w-7 rounded-lg shrink-0 text-slate-600 hover:text-slate-900"
                onClick={() => setScale((s) => Math.max(1, +(s - 0.2).toFixed(2)))}
                disabled={scale <= 1 || isSaving}
                title="Perkecil"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>

              <input
                type="range"
                min="1"
                max="3"
                step="0.02"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                disabled={isSaving}
                className="flex-1 accent-[#1e3a8a] cursor-pointer h-1.5 bg-slate-200 rounded-lg"
              />

              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                className="h-7 w-7 rounded-lg shrink-0 text-slate-600 hover:text-slate-900"
                onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(2)))}
                disabled={scale >= 3 || isSaving}
                title="Perbesar"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="h-7 w-7 rounded-lg shrink-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                onClick={handleReset}
                disabled={isSaving || (scale === 1 && offset.x === 0 && offset.y === 0)}
                title="Reset Posisi & Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
            className="text-xs h-8 gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Batal
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleConfirmCrop}
            disabled={isSaving || !naturalSize}
            className="text-xs h-8 gap-1.5 bg-[#1e3a8a] hover:bg-[#172554] text-white shadow-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-amber-300" />
                Terapkan &amp; Simpan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

