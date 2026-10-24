"use client";

import { Building2, CheckCircle2, Clock, MailQuestion } from "lucide-react";
import type { OrganizerStats } from "@/app/admin/types/organizers";
import { StatCard } from "@/app/admin/components/dashboard/StatCard";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";

type Props = { stats: OrganizerStats | null; isLoading: boolean; error: string | null; onRetry: () => void };
const note = (value: string) => ({ value, direction: "neutral" as const, label: "" });
export function OrganizerStatsCards({ stats, isLoading, error, onRetry }: Props) {
  if (error) return <ErrorState compact title="Couldn't load organizer statistics" message={error} onRetry={onRetry} />;
  if (isLoading || !stats) return <div className="h-24 animate-pulse rounded-xl bg-white/5" />;
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard label="Total applications" value={stats.total} icon={Building2} change={note("All statuses")} />
    <StatCard label="Awaiting verification" value={stats.awaitingVerification} icon={MailQuestion} change={note("Email not verified")} />
    <StatCard label="Needs review" value={stats.pending} icon={Clock} change={note("Ready for decision")} />
    <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} change={note("Active organizations")} />
  </div>;
}
