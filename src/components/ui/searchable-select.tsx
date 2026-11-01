"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  value?: string | null;
  onValueChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  /** Max items before scroll is prominent (default max-h-56 is ~5 items) */
  maxHeightClass?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Pilih opsi...",
  searchPlaceholder = "Ketik untuk mencari...",
  emptyMessage = "Tidak ada hasil ditemukan",
  disabled = false,
  className,
  maxHeightClass = "max-h-56",
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Selected option lookup
  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Filtered options based on search query
  const filteredOptions = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchSub = opt.sublabel
        ? opt.sublabel.toLowerCase().includes(q)
        : false;
      const matchVal = opt.value.toLowerCase().includes(q);
      return matchLabel || matchSub || matchVal;
    });
  }, [options, search]);

  // Focus input and reset search when opening
  React.useEffect(() => {
    if (open) {
      setSearch("");
      setHighlightedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close when clicking outside
  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
      scrollItemIntoView(
        highlightedIndex < filteredOptions.length - 1 ? highlightedIndex + 1 : 0
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
      scrollItemIntoView(
        highlightedIndex > 0 ? highlightedIndex - 1 : filteredOptions.length - 1
      );
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const targetOpt = filteredOptions[highlightedIndex];
      if (targetOpt && !targetOpt.disabled) {
        onValueChange(targetOpt.value);
        setOpen(false);
      }
      return;
    }
  };

  const scrollItemIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-searchable-item]");
    const target = items[index] as HTMLElement;
    if (target) {
      target.scrollIntoView({ block: "nearest" });
    }
  };

  const handleSelect = (opt: SearchableOption) => {
    if (opt.disabled) return;
    onValueChange(opt.value);
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", className)}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 shadow-2xs transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50",
          open && "border-slate-400 ring-2 ring-slate-900/10"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className={cn(
            "truncate text-left",
            !selectedOption && "text-slate-400"
          )}
        >
          {selectedOption ? (
            <span className="flex items-center gap-1.5">
              <span className="font-medium text-slate-800">
                {selectedOption.label}
              </span>
              {selectedOption.sublabel && (
                <span className="text-slate-400 font-normal">
                  ({selectedOption.sublabel})
                </span>
              )}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150",
            open && "rotate-180 text-slate-600"
          )}
        />
      </button>

      {/* Popover Dropdown Panel */}
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-full min-w-[200px] rounded-lg border border-slate-200 bg-white p-1 text-xs text-slate-800 shadow-xl ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95 duration-100"
          role="listbox"
        >
          {/* Instant Search Bar */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none"
            />
            {search.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  inputRef.current?.focus();
                }}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="Hapus pencarian"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Options List (Max-height ~5 items with smooth auto-scroll) */}
          <div
            ref={listRef}
            className={cn(
              "overflow-y-auto p-1 space-y-0.5 focus:outline-none",
              maxHeightClass
            )}
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-searchable-item
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition-colors",
                      opt.disabled && "cursor-not-allowed opacity-40",
                      isSelected
                        ? "bg-slate-100 font-semibold text-slate-900"
                        : isHighlighted
                        ? "bg-slate-50 text-slate-900"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex min-w-0 flex-1 flex-col pr-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="truncate text-[10px] text-slate-400">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-slate-900" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Micro Footer counter when items are many */}
          {options.length > 5 && (
            <div className="border-t border-slate-100 px-2.5 py-1 text-[10px] text-slate-400 flex items-center justify-between">
              <span>
                {filteredOptions.length} dari {options.length} opsi
              </span>
              {search && (
                <span className="italic text-slate-500">difilter</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
