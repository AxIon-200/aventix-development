"use client";

import { Building2, CalendarDays, CheckCircle2, Clock } from "lucide-react";
import { OrganizerStats } from "@/app/admin/types/organizers";
import { StatCard } from "@/app/admin/components/dashboard/StatCard";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";

type Props = {
  stats: OrganizerStats | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

const note = (text: string) => ({ value: text, direction: "neutral" as const, label: "" });

export function OrganizerStatsCards({ stats, isLoading, error, onRetry }: Props) {
  if (error) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03]">
        <ErrorState compact title="Couldn't load organizer statistics" message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[104px] animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard label="Total Organizers" value={stats.total.toLocaleString()} icon={Building2} change={note("Across all statuses")} />
      <StatCard label="Needs Review" value={stats.needsReview.toLocaleString()} icon={Clock} change={note("Awaiting admin decision")} />
      <StatCard label="Approved" value={stats.approved.toLocaleString()} icon={CheckCircle2} change={note("Currently active")} />
      <StatCard label="Total Events" value={stats.totalEvents.toLocaleString()} icon={CalendarDays} change={note("Published + draft")} />
    </div>
  );
}
