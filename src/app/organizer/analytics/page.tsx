import { Download } from "lucide-react";

export default function OrganizerAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">Reports</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Sales & Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">In-depth breakdown of ticket sales, attendance trends, and revenue.</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 transition">
          <Download className="h-3.5 w-3.5" />
          <span>Export Sales CSV</span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#111622] p-5 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-400">Total Net Revenue</p>
          <p className="mt-2 text-2xl font-bold text-white">₱395,250</p>
          <p className="mt-1 text-xs text-emerald-400">+18% vs last month</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111622] p-5 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-400">Average Order Value</p>
          <p className="mt-2 text-2xl font-bold text-white">₱2,450</p>
          <p className="mt-1 text-xs text-slate-400">1.8 tickets per order</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111622] p-5 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-400">Unique Attendees</p>
          <p className="mt-2 text-2xl font-bold text-white">1,620</p>
          <p className="mt-1 text-xs text-teal-400">74% first-time buyers</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#111622] p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-white">Sales Performance by Ticket Tier</h2>
        <div className="mt-4 space-y-4">
          {[
            { tier: "VIP Lounge", sold: 300, total: 300, rev: "₱150,000", pct: 100 },
            { tier: "Early Bird General", sold: 850, total: 1000, rev: "₱170,000", pct: 85 },
            { tier: "Standard Admission", sold: 690, total: 1200, rev: "₱105,000", pct: 57 },
          ].map((item) => (
            <div key={item.tier} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-white">{item.tier}</span>
                <span className="text-slate-400">
                  {item.sold} / {item.total} sold &bull; {item.rev}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-teal-400 transition-all"
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
