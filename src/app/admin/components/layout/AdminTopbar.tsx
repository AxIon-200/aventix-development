
"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { NotificationBell } from "@/app/admin/components/ui/NotificationBell";

type AdminTopbarProps = {
  adminName?: string;
  adminRole?: string;
};

export function AdminTopbar({
  adminName = "Admin",
  adminRole = "Administrator",
}: AdminTopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Automatically focus the input when search opens.
  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  // Close search when Escape is pressed.
  useEffect(() => {
    if (!searchOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchOpen]);

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
  }

  return (
    <header className="relative z-40 flex h-16 items-center justify-end gap-3 border-b border-white/10 px-4 sm:px-8">

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
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search users, events, bookings..."
              aria-label="Search users, events, and bookings"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />

            <button
              type="button"
              onClick={closeSearch}
              aria-label="Close search"
              className="shrink-0 rounded p-0.5 text-slate-500 transition hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Open search"
            aria-expanded={searchOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:border-teal-400/30 hover:bg-white/5 hover:text-teal-300"
          >
            <Search className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Notifications */}
      <NotificationBell />

      {/* Admin Profile */}
      <div className="flex shrink-0 items-center gap-2 pl-1 sm:pl-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-xs font-semibold text-slate-950">
          {adminName.slice(0, 2).toUpperCase()}
        </div>

        <div className="hidden leading-tight sm:block">
          <p className="text-sm font-medium text-white">
            {adminName}
          </p>
          <p className="text-xs text-slate-500">
            {adminRole}
          </p>
        </div>
      </div>
    </header>
  );
}
