"use client";

import { Search, Bell } from "lucide-react";

type AdminTopbarProps = {
  adminName?: string;
  adminRole?: string;
};

export function AdminTopbar({
  adminName = "Admin",
  adminRole = "Administrator",
}: AdminTopbarProps) {
  return (
    <header className="flex h-16 items-center justify-end gap-3 border-b border-white/10 px-8">
      <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5">
        <Search className="h-4 w-4" />
      </button>
      <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5">
        <Bell className="h-4 w-4" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-teal-400" />
      </button>
      <div className="flex items-center gap-2 pl-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-xs font-semibold text-slate-950">
          {adminName.slice(0, 2).toUpperCase()}
        </div>
        <div className="leading-tight">
          <p className="text-sm font-medium text-white">{adminName}</p>
          <p className="text-xs text-slate-500">{adminRole}</p>
        </div>
      </div>
    </header>
  );
}
