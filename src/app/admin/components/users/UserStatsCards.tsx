"use client";

import { UserCheck, UserPlus, Ticket, Users } from "lucide-react";
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
        label="Total Attendees"
        value={stats.total.toLocaleString()}
        icon={Users}
        change={{
          value: "",
          direction: "neutral",
          label: "All attendee accounts",
        }}
      />
      <StatCard
        label="Active Accounts"
        value={stats.active.toLocaleString()}
        icon={UserCheck}
        change={{ value: pct(stats.active, stats.total), direction: "neutral", label: "of accounts enabled" }}
      />
      <StatCard
        label="New Attendees"
        value={stats.newLast30Days.toLocaleString()}
        icon={UserPlus}
        change={{ value: "", direction: "neutral", label: "Joined in the last 30 days" }}
      />
      <StatCard
        label="Attendees with Bookings"
        value={stats.withBookings.toLocaleString()}
        icon={Ticket}
        change={{ value: "", direction: "neutral", label: "With at least one confirmed booking" }}
      />
    </div>
  );
}
