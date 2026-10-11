"use client";

import { ReactNode, useEffect, useRef } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { FilterConfig } from "@/app/admin/components/data-table/types";

type TableToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  filterValues: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  hasActiveFilters: boolean;
  onClear: () => void;
  children?: ReactNode; // extra controls (e.g. a date range picker)
};

export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters = [],
  filterValues,
  onFilterChange,
  hasActiveFilters,
  onClear,
  children,
}: TableToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Press "/" anywhere (when not typing in a field) to jump to search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable)) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-9 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-teal-400/60"
        />
        {search ? (
          <button
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-white/10 px-1.5 text-[10px] text-slate-500">
            /
          </kbd>
        )}
      </div>

      {filters.map((f) => (
        <div key={f.key} className="relative">
          <select
            value={filterValues[f.key] ?? "all"}
            onChange={(e) => onFilterChange(f.key, e.target.value)}
            aria-label={f.label}
            className="appearance-none rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-3 pr-8 text-sm text-slate-200 outline-none focus:border-teal-400/60"
          >
            <option value="all">{f.allLabel}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>
      ))}

      {children}

      {hasActiveFilters && (
        <button onClick={onClear} className="text-xs text-teal-400 hover:underline">
          Clear filters
        </button>
      )}
    </div>
  );
}
