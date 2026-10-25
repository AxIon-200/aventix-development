"use client";

import { CalendarDays, Megaphone, FileText, XCircle } from "lucide-react";
import { EventStats } from "@/app/admin/types/events";
import { StatCard } from "@/app/admin/components/dashboard/StatCard";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";

type Props = {
  stats: EventStats | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

const note = (text: string) => ({ value: text, direction: "neutral" as const, label: "" });

export function EventStatsCards({ stats, isLoading, error, onRetry }: Props) {
  if (error) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03]">
        <ErrorState compact title="Couldn't load event statistics" message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[104px] animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard label="Total Events" value={stats.total.toLocaleString()} icon={CalendarDays} change={note("Across the platform")} />
      <StatCard label="Published" value={stats.published.toLocaleString()} icon={Megaphone} change={note("Available to attendees")} />
      <StatCard label="Draft" value={stats.draft.toLocaleString()} icon={FileText} change={note("Not published")} />
      <StatCard label="Sold out" value={stats.soldOut.toLocaleString()} icon={Megaphone} change={note("No tickets available")} />
      <StatCard label="Completed" value={stats.completed.toLocaleString()} icon={CalendarDays} change={note("Events that have ended")} />
      <StatCard label="Cancelled" value={stats.cancelled.toLocaleString()} icon={XCircle} change={note("Removed from availability")} />
    </div>
  );
}
