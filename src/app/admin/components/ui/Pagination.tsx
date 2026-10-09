"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

type PageItem = number | "ellipsis-left" | "ellipsis-right";

// Always returns the same number of slots (7) once there are more than 7
// pages, so the control never jumps around while you click through it.
//   page near start:  1 2 3 4 … 167
//   page in middle:   1 … 9 10 11 … 167
//   page near end:    1 … 164 165 166 167
export function getPageItems(page: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 3) return [1, 2, 3, 4, "ellipsis-right", total];
  if (page >= total - 2) return [1, "ellipsis-left", total - 3, total - 2, total - 1, total];
  return [1, "ellipsis-left", page - 1, page, page + 1, "ellipsis-right", total];
}

const baseBtn =
  "flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40";

export function Pagination({ page, totalPages, onPageChange, disabled = false }: PaginationProps) {
  if (totalPages <= 1) return null;

  const go = (p: number) => onPageChange(Math.min(Math.max(1, p), totalPages));

  return (
    <nav aria-label="Pagination" className="flex items-center gap-1.5">
      <button
        aria-label="First page"
        onClick={() => go(1)}
        disabled={disabled || page === 1}
        className={`${baseBtn} border-white/10 text-slate-400 hover:bg-white/5`}
      >
        <ChevronsLeft className="h-4 w-4" />
      </button>
      <button
        aria-label="Previous page"
        onClick={() => go(page - 1)}
        disabled={disabled || page === 1}
        className={`${baseBtn} border-white/10 text-slate-400 hover:bg-white/5`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {getPageItems(page, totalPages).map((item) =>
        typeof item === "number" ? (
          <button
            key={item}
            onClick={() => go(item)}
            disabled={disabled}
            aria-current={item === page ? "page" : undefined}
            className={`${baseBtn} ${
              item === page
                ? "border-teal-400/60 bg-teal-500/10 font-semibold text-teal-300"
                : "border-white/10 text-slate-400 hover:bg-white/5"
            }`}
          >
            {item}
          </button>
        ) : (
          <span key={item} className="px-1 text-xs text-slate-600" aria-hidden="true">
            …
          </span>
        )
      )}

      <button
        aria-label="Next page"
        onClick={() => go(page + 1)}
        disabled={disabled || page === totalPages}
        className={`${baseBtn} border-white/10 text-slate-400 hover:bg-white/5`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <button
        aria-label="Last page"
        onClick={() => go(totalPages)}
        disabled={disabled || page === totalPages}
        className={`${baseBtn} border-white/10 text-slate-400 hover:bg-white/5`}
      >
        <ChevronsRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
