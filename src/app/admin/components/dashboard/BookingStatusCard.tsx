"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useFetch } from "@/app/admin/hooks/useFetch";
import { getBookingStatusBreakdown } from "@/app/admin/services/dashboardService";

const COLORS: Record<string, string> = {
  Confirmed: "#2DD4BF",
  Completed: "#38BDF8",
  Pending: "#FACC15",
  Cancelled: "#64748B",
};

export function BookingStatusCard() {
  const { data, isLoading } = useFetch(() => getBookingStatusBreakdown(), []);

  const rows = data
    ? [
        { name: "Confirmed", value: data.confirmed },
        { name: "Completed", value: data.completed },
        { name: "Pending", value: data.pending },
        { name: "Cancelled", value: data.cancelled },
      ]
    : [];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Booking status</h3>
          <p className="text-xs text-slate-500">Current booking mix</p>
        </div>
        <span className="rounded-full bg-teal-500/10 px-2.5 py-1 text-[11px] font-medium text-teal-400">
          Confirmed
        </span>
      </div>

      {isLoading || !data ? (
        <div className="mt-6 h-40 w-full animate-pulse rounded-lg bg-white/5" />
      ) : (
        <div className="mt-4 flex items-center gap-6">
          <div className="relative h-32 w-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="value"
                  innerRadius={42}
                  outerRadius={58}
                  paddingAngle={2}
                  stroke="none"
                >
                  {rows.map((row) => (
                    <Cell key={row.name} fill={COLORS[row.name]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-semibold text-white">100%</span>
              <span className="text-[10px] text-slate-500">all bookings</span>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            {rows.map((row) => (
              <div key={row.name} className="flex items-center gap-2 text-xs">
                <span className="w-16 text-slate-400">{row.name}</span>
                <div className="h-1.5 flex-1 rounded-full bg-white/5">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${row.value}%`,
                      backgroundColor: COLORS[row.name],
                    }}
                  />
                </div>
                <span className="w-8 text-right text-slate-300">
                  {row.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
