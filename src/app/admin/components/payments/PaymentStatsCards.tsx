"use client";

import { CheckCircle2, Clock, CreditCard, Wallet } from "lucide-react";
import { PaymentStats } from "@/app/admin/types/payments";
import { StatCard } from "@/app/admin/components/dashboard/StatCard";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";
import { formatPeso } from "@/app/admin/lib/currency";

type Props = {
  stats: PaymentStats | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

const note = (text: string) => ({ value: text, direction: "neutral" as const, label: "" });

// These cards follow the current search + filters, so they refresh whenever
// those change. While refreshing we keep showing the previous numbers (dimmed)
// instead of flashing skeletons on every keystroke.
export function PaymentStatsCards({ stats, isLoading, error, onRetry }: Props) {
  if (error) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03]">
        <ErrorState compact title="Couldn't load payment statistics" message={error} onRetry={onRetry} />
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
      <StatCard label="Transactions" value={stats.total.toLocaleString()} icon={CreditCard} change={note("Current records")} />
      <StatCard label="Paid" value={stats.paid.toLocaleString()} icon={CheckCircle2} change={note("Captured successfully")} />
      <StatCard label="Pending" value={stats.pending.toLocaleString()} icon={Clock} change={note("Awaiting completion")} />
      <StatCard label="Recorded Value" value={formatPeso(stats.recordedValue)} icon={Wallet} change={note("All recorded attempts")} />
    </div>
  );
}
