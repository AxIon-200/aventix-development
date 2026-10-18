"use client";

import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useFetch } from "@/app/admin/hooks/useFetch";
import { getSalesAnalytics } from "@/app/admin/services/dashboardService";

export function SalesAnalyticsChart() {
  const { data, isLoading } = useFetch(() => getSalesAnalytics("30d"), []);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Sales analytics</h3>
          <p className="text-xs text-slate-500">
            Tickets sold and recorded revenue across recent weeks.
          </p>
        </div>
        <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300">
          Last 30 days
        </button>
      </div>

      <div className="mt-6 h-64">
        {isLoading || !data ? (
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
              <Tooltip
                contentStyle={{
                  background: "#0B0F19",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="ticketsSold" fill="#2DD4BF" radius={[6, 6, 0, 0]} />
              <Bar dataKey="revenueIndex" fill="#334155" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-teal-400" /> Tickets sold
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-600" /> Revenue index
        </span>
      </div>
    </div>
  );
}
