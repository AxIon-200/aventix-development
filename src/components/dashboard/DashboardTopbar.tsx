"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X, Compass } from "lucide-react";
import { NotificationBell } from "@/app/admin/components/ui/NotificationBell";

import RoleDropdownSwitcher from "@/components/shared/RoleDropdownSwitcher";

type DashboardTopbarProps = {
  attendeeName?: string;
  roleLabel?: string;
};

export default function DashboardTopbar({
  attendeeName = "Sherwin Cruz",
  roleLabel = "Attendee User",
}: DashboardTopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-end gap-3 border-b border-white/10 bg-[#0B0F19] px-4 sm:px-8">
      {/* Demo Role Switcher */}
      <RoleDropdownSwitcher />

      {/* Expandable Search */}
      <div
        className={`flex items-center transition-all duration-200 ${
          searchOpen ? "w-56 sm:w-80" : "w-9"
        }`}
      >
        {searchOpen ? (
          <div className="flex h-9 w-full items-center gap-2 rounded-lg border border-teal-400/30 bg-[#111b24] px-3 shadow-lg shadow-black/10">
            <Search className="h-4 w-4 shrink-0 text-teal-300" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your tickets, events, bookings..."
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
              className="shrink-0 rounded p-0.5 text-slate-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Open search"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:border-teal-400/30 hover:bg-white/5 hover:text-teal-300"
          >
            <Search className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Quick Action: Browse Events */}
      <Link
        href="/events"
        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-teal-400/30 hover:bg-white/5 hover:text-teal-300"
      >
        <Compass className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Browse Events</span>
      </Link>

      {/* Notifications */}
      <NotificationBell />

      {/* Attendee Profile Info */}
      <div className="flex shrink-0 items-center gap-2 pl-1 sm:pl-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-teal-400/30 bg-teal-500 text-xs font-semibold text-slate-950">
          {attendeeName.slice(0, 2).toUpperCase()}
        </div>
        <div className="hidden leading-tight sm:block">
          <p className="text-sm font-medium text-white">{attendeeName}</p>
          <p className="text-xs text-slate-500">{roleLabel}</p>
        </div>
      </div>
    </header>
  );
}
