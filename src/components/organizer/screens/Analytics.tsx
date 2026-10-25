"use client";
import { useState } from "react";
import { DateRangePicker } from "@/components/shared/date-picker";
import OrganizerFeedback from "../OrganizerFeedback";
import { useOrganizerData } from "../useOrganizerData";
import { manilaInput, organizerChange, organizerErrorMessage, organizerMoney, organizerRequest } from "@/lib/organizer";
import type { OrganizerAnalytics } from "@/types/organizer";
export default function OrganizerAnalyticsPage() {
  const [range, setRange] = useState(() => { const today = manilaInput(new Date().toISOString()).slice(0, 10); return { from: `${today.slice(0, 7)}-01`, to: today }; });
  const valid = !!range.from && !!range.to && range.from <= range.to;
  const query = new URLSearchParams(range).toString();
  const state = useOrganizerData<OrganizerAnalytics>(valid ? `/analytics?${query}` : null);
  const [exporting, setExporting] = useState(false), [error, setError] = useState("");
  const data = state.data;
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-semibold text-white">Sales & Analytics</h1><p className="mt-2 text-sm text-slate-400">Current confirmed paid sales, selected by payment date in Manila. Refunded bookings are excluded.</p></header>
    <div className="flex flex-wrap items-center gap-3"><DateRangePicker from={range.from} to={range.to} onChange={(key, value) => setRange(previous => ({ ...previous, [key]: value }))} ariaLabel="Filter sales report date range" />
      <button disabled={!valid || !data || exporting} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-teal-300 disabled:opacity-50" onClick={async () => {
        setExporting(true); setError("");
        try {
          const blob = await organizerRequest<Blob>(`/analytics/export?${query}`, { csv: true });
          const url = URL.createObjectURL(blob), link = document.createElement("a");
          link.href = url; link.download = `organizer-sales-${range.from}-${range.to}.csv`; link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (failure) { setError(organizerErrorMessage(failure)); }
        finally { setExporting(false); }
      }}>{exporting ? "Exporting…" : "Export Sales CSV"}</button>
    </div>
    {!valid && <p role="alert" className="text-sm text-red-300">Choose a start date on or before the end date.</p>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}<OrganizerFeedback {...state} />
    {data && <>
      {data.hasTestPayments && <p role="status" className="text-sm text-amber-300">Includes test payments. These figures do not represent settled funds.</p>}
      <p className="text-sm text-slate-300">Gross sales: {organizerMoney(data.grossRevenue)} · {organizerChange(data.grossChange)} (preceding equal-length range)</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-white/10 bg-[#111622] p-5"><h2 className="text-sm text-slate-400">Total Net Revenue</h2><p className="mt-2 text-2xl text-white">Unavailable</p><p className="mt-1 text-xs text-slate-400">Fees and payouts are not recorded</p></article>
        <article className="rounded-xl border border-white/10 bg-[#111622] p-5"><h2 className="text-sm text-slate-400">Average Order Value</h2><p className="mt-2 text-2xl text-white">{organizerMoney(data.averageOrderValue)}</p><p className="mt-1 text-xs text-slate-400">{data.ticketsPerOrder.toFixed(1)} tickets per order</p></article>
        <article className="rounded-xl border border-white/10 bg-[#111622] p-5"><h2 className="text-sm text-slate-400">Unique Attendees</h2><p className="mt-2 text-2xl text-white">{data.uniqueAttendees}</p><p className="mt-1 text-xs text-slate-400">Unique buyers · {data.firstTimeBuyerPercent}% first-time buyers</p></article>
      </div>
      <section className="rounded-xl border border-white/10 bg-[#111622] p-5"><h2 className="font-semibold text-white">Sales Performance by Ticket Tier</h2>
        {!data.tiers.length && <p className="mt-4 text-sm text-slate-400">No ticket tiers yet.</p>}
        {data.tiers.map(tier => <div key={tier.id} className="mt-4 space-y-2"><div className="flex flex-wrap justify-between gap-2 text-sm"><span className="text-white">{tier.eventTitle} · {tier.name}</span><span className="text-slate-400">{tier.sold} / {tier.capacity ?? "unknown"} sold · {organizerMoney(tier.revenue)}</span></div>
          {tier.percent !== null && <div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-teal-400" style={{ width: `${Math.min(100, Math.max(0, tier.percent))}%` }} /></div>}
        </div>)}
      </section>
    </>}
  </div>;
}
