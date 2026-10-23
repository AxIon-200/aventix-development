"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, X, Compass, Menu } from "lucide-react";
import { NotificationBell } from "@/app/admin/components/ui/NotificationBell";

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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#0B0F19]/95 backdrop-blur-md px-3 sm:px-6 lg:px-8">
      {/* Mobile Drawer Toggle & Logo */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("aventix-toggle-sidebar"))}
          aria-label="Open sidebar menu"
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:border-teal-400/40 hover:bg-white/5 hover:text-white transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
          <Image
            src="/images/aventix-icon.png"
            alt="Aventix"
            width={24}
            height={24}
            className="h-5 w-auto"
          />
          <span className="text-xs font-bold text-white tracking-wide">ATTENDEE</span>
        </Link>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Demo Role Switcher */}

        {/* Expandable Search */}
        <div
          className={`flex items-center transition-all duration-200 ${
            searchOpen ? "w-44 sm:w-64 md:w-80" : "w-9"
          }`}
        >
          {searchOpen ? (
            <div className="flex h-9 w-full items-center gap-2 rounded-lg border border-teal-400/30 bg-[#111b24] px-2.5 shadow-lg shadow-black/10">
              <Search className="h-4 w-4 shrink-0 text-teal-300" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tickets, bookings..."
                className="min-w-0 flex-1 bg-transparent text-xs sm:text-sm text-white outline-none placeholder:text-slate-500"
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
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#111622] px-2.5 py-1.5 sm:px-3 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <Compass className="h-3.5 w-3.5 text-teal-400" />
          <span className="hidden sm:inline">Browse Events</span>
        </Link>

        {/* Notifications */}
        <NotificationBell />

        {/* Attendee Profile Info */}
        <div className="flex shrink-0 items-center gap-2 pl-0.5 sm:pl-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-teal-400/30 bg-teal-500 text-xs font-semibold text-slate-950">
            {attendeeName.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden leading-tight md:block">
            <p className="text-sm font-medium text-white">{attendeeName}</p>
            <p className="text-xs text-slate-500">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
