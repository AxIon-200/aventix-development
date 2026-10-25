"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Plus, Menu } from "lucide-react";
import { NotificationBell } from "@/app/admin/components/ui/NotificationBell";

type OrganizerTopbarProps = {
  organizerName?: string;
  roleLabel?: string;
};

export default function OrganizerTopbar({
  organizerName = "Organizer",
  roleLabel = "Event Organizer",
}: OrganizerTopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
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

        <Link href="/organizer/dashboard" className="flex items-center gap-2 lg:hidden">
          <Image
            src="/images/aventix-icon.png"
            alt="Aventix"
            width={24}
            height={24}
            className="h-5 w-auto"
          />
          <span className="text-xs font-bold text-white tracking-wide">ORGANIZER</span>
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
            <form onSubmit={event => { event.preventDefault(); router.push(`/organizer/events?search=${encodeURIComponent(searchQuery.trim())}`); setSearchOpen(false); }} className="flex h-9 w-full items-center gap-2 rounded-lg border border-teal-400/30 bg-[#111b24] px-2.5 shadow-lg shadow-black/10">
              <Search className="h-4 w-4 shrink-0 text-teal-300" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your events..."
                aria-label="Search your events"
                maxLength={200}
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
            </form>
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

        {/* Quick Action: Create Event */}
        <Link
          href="/organizer/events/new"
          className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-2.5 py-1.5 sm:px-3 text-xs font-medium text-slate-950 transition hover:bg-teal-400"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Create Event</span>
        </Link>

        {/* Notifications */}
        <NotificationBell />

        {/* Organizer Profile Info */}
        <div className="flex shrink-0 items-center gap-2 pl-0.5 sm:pl-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-teal-400/30 bg-teal-500 text-xs font-semibold text-slate-950">
            {organizerName.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden leading-tight md:block">
            <p className="text-sm font-medium text-white">{organizerName}</p>
            <p className="text-xs text-slate-500">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
