"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useState } from "react";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";
import { useFetch } from "@/app/admin/hooks/useFetch";
import { getSalesAnalytics } from "@/app/admin/services/dashboardService";

export function SalesAnalyticsChart() {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const { data, isLoading, error, refetch } = useFetch(() => getSalesAnalytics(range), [range], true);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Sales analytics</h3>
          <p className="text-xs text-slate-500">
            Confirmed ticket quantities and paid revenue in PHP.
          </p>
        </div>
        <select aria-label="Sales date range" value={range} onChange={event => setRange(event.target.value as typeof range)} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-slate-300">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      <div className="mt-6 h-64">
        {error ? <ErrorState compact message={error} onRetry={refetch} /> : isLoading || !data ? (
          <div className="h-full w-full animate-pulse rounded-lg bg-white/5" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={6}>
              <XAxis
                dataKey="label"
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis yAxisId="tickets" tick={{ fill: "#64748b", fontSize: 10 }} allowDecimals={false} width={40} />
              <YAxis yAxisId="revenue" orientation="right" tick={{ fill: "#64748b", fontSize: 10 }} width={65} tickFormatter={value => `₱${Number(value).toLocaleString()}`} />
              <Tooltip
                contentStyle={{
                  background: "#0B0F19",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar yAxisId="tickets" name="Tickets sold" dataKey="ticketsSold" fill="#2DD4BF" radius={[6, 6, 0, 0]} />
              <Bar yAxisId="revenue" name="Revenue (PHP)" dataKey="revenue" fill="#334155" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-teal-400" /> Tickets sold
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-600" /> Revenue (PHP)
        </span>
      </div>
    </div>
  );
}
