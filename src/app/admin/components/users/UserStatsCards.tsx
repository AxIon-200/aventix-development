"use client";

import { UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { UserStats } from "@/app/admin/types/users";
import { StatCard } from "@/app/admin/components/dashboard/StatCard";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";

type Props = {
  stats: UserStats | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

const pct = (part: number, total: number) =>
  total === 0 ? "0%" : `${Math.round((part / total) * 100)}%`;

export function UserStatsCards({ stats, isLoading, error, onRetry }: Props) {
  if (error) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03]">
        <ErrorState compact title="Couldn't load user statistics" message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[104px] animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Total Users"
        value={stats.total.toLocaleString()}
        icon={Users}
        change={{
          value: `+${stats.newThisMonth.toLocaleString()}`,
          direction: stats.newThisMonth > 0 ? "up" : "neutral",
          label: "joined in last 30 days",
        }}
      />
      <StatCard
        label="Active Users"
        value={stats.active.toLocaleString()}
        icon={UserCheck}
        change={{ value: pct(stats.active, stats.total), direction: "neutral", label: "of all users" }}
      />
      <StatCard
        label="Pending Activation"
        value={stats.pending.toLocaleString()}
        icon={UserPlus}
        change={{ value: pct(stats.pending, stats.total), direction: "neutral", label: "awaiting review" }}
      />
      <StatCard
        label="Inactive Users"
        value={stats.inactive.toLocaleString()}
        icon={UserX}
        change={{ value: pct(stats.inactive, stats.total), direction: "neutral", label: "of all users" }}
      />
    </div>
  );
}
