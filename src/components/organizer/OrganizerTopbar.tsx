"use client";

import Link from "next/link";
import { Plus, Bell, ExternalLink } from "lucide-react";

interface OrganizerTopbarProps {
  title: string;
  subtitle?: string;
}

export default function OrganizerTopbar({ title, subtitle }: OrganizerTopbarProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-white/10 bg-[#0f141f] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          target="_blank"
          className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/5 sm:flex"
        >
          <span>View Public Site</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>

        <button
          type="button"
          aria-label="Organizer notifications"
          className="relative rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-teal-400 ring-2 ring-[#0f141f]" />
        </button>

        <Link
          href="/organizer/events/new"
          className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-teal-400"
        >
          <Plus className="h-4 w-4" />
          <span>Create Event</span>
        </Link>
      </div>
    </header>
  );
}
