"use client";

import { Activity, AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import { ActivityLogStats } from "@/app/admin/types/activity-logs";
import { StatCard } from "@/app/admin/components/dashboard/StatCard";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";

type Props = {
  stats: ActivityLogStats | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

const note = (text: string) => ({ value: text, direction: "neutral" as const, label: "" });

// These cards follow the current search + filters, so they refresh whenever
// those change. While refreshing we keep showing the previous numbers (dimmed)
// instead of flashing skeletons on every keystroke.
export function ActivityLogStatsCards({ stats, isLoading, error, onRetry }: Props) {
  if (error) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03]">
        <ErrorState compact title="Couldn't load activity statistics" message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[104px] animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-4 gap-4 transition-opacity ${isLoading ? "opacity-60" : ""}`}
      aria-busy={isLoading}
    >
      <StatCard label="Total Logs" value={stats.total.toLocaleString()} icon={Activity} change={note("Current records")} />
      <StatCard label="Last 24 Hours" value={stats.last24Hours.toLocaleString()} icon={Clock} change={note("Recent activity")} />
      <StatCard label="Admin Actions" value={stats.adminActions.toLocaleString()} icon={ShieldCheck} change={note("Performed by admins")} />
      <StatCard label="Failed" value={stats.failed.toLocaleString()} icon={AlertTriangle} change={note("Needs attention")} />
    </div>
  );
}
