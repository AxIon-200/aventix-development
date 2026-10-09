"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { UserStatusFilter } from "@/app/admin/types/users";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  status: UserStatusFilter;
  onStatusChange: (value: UserStatusFilter) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
};

export function UsersToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  hasActiveFilters,
  onClearFilters,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name, email, or user ID…"
          aria-label="Search users"
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-8 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-teal-400/60"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="relative">
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as UserStatusFilter)}
          aria-label="Filter by status"
          className="appearance-none rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-3 pr-8 text-sm text-slate-200 outline-none focus:border-teal-400/60"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      </div>

      {hasActiveFilters && (
        <button onClick={onClearFilters} className="text-xs text-teal-400 hover:underline">
          Clear filters
        </button>
      )}
    </div>
  );
}
