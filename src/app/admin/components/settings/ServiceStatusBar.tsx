"use client";

import { useEffect, useState } from "react";

function timeAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (Number.isNaN(seconds)) return "recently";
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ServiceStatusBar({ message, updatedAt }: { message: string; updatedAt: string }) {
  // Re-render every 30s so "just now" doesn't go stale while the page stays open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0B0F19]/60 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 shrink-0 rounded-full bg-teal-400" aria-hidden="true" />
        <p className="text-xs text-slate-300">{message}</p>
      </div>
      <p className="shrink-0 text-[11px] text-slate-500">Updated {timeAgo(updatedAt, now)}</p>
    </div>
  );
}
