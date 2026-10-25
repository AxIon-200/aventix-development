"use client";
import Link from "next/link";
import { CalendarDays, Ticket, DollarSign, TrendingUp } from "lucide-react";
import OrganizerStatCard from "../OrganizerStatCard";
import OrganizerFeedback from "../OrganizerFeedback";
import OrganizerEventCard from "../OrganizerEventCard";
import { useOrganizerData } from "../useOrganizerData";
import { organizerChange, organizerDate, organizerMoney } from "@/lib/organizer";
import type { OrganizerDashboard } from "@/types/organizer";

export default function OrganizerDashboardPage() {
  const state = useOrganizerData<OrganizerDashboard>("/dashboard");
  const data = state.data;
  return <div className="space-y-6">
    <header><p className="text-xs uppercase text-teal-400">Organizer Portal</p><h1 className="mt-1 text-2xl font-semibold text-white">Your organizer dashboard</h1>
      <p className="mt-1 text-sm text-slate-400">{data?.organizationName} · Sales, active events, and attendance across your organization.</p></header>
    <OrganizerFeedback {...state} />
    {data && <>
      {data.metrics.hasTestPayments && <p role="status" className="text-sm text-amber-300">Includes test payments. These figures do not represent settled funds.</p>}
      <p className="text-xs text-slate-400">Sales totals are lifetime confirmed paid sales. Changes compare month-to-date with the same elapsed portion of last month.</p>
      <section aria-label="Key performance indicators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OrganizerStatCard label="Active Events" value={`${data.metrics.activeEvents} Live`} change={`${data.metrics.newEventsChange > 0 ? "+" : ""}${data.metrics.newEventsChange} event creations vs prior month-to-date`} footnote={`Across ${data.metrics.venues} venues`} icon={CalendarDays} />
        <OrganizerStatCard label="Tickets Sold" value={data.metrics.ticketsSold.toLocaleString()} change={organizerChange(data.metrics.ticketsChange)} footnote={data.metrics.capacityPercent === null ? "Active event capacity unavailable" : `${data.metrics.capacityPercent}% active event capacity reached`} icon={Ticket} />
        <OrganizerStatCard label="Gross Sales" value={organizerMoney(data.metrics.grossRevenue)} change={organizerChange(data.metrics.grossChange)} footnote="Stored ticket subtotals; fees and payouts unavailable" icon={DollarSign} />
        <OrganizerStatCard label="Check-in Rate" value={`${data.metrics.checkInRate}%`} change="Active events" footnote="Used tickets / valid or used paid tickets" icon={TrendingUp} />
      </section>
      <section aria-label="Active events" className="rounded-xl border border-white/10 bg-[#111622] p-5">
        <div className="flex justify-between"><h2 className="font-semibold text-white">Your Managed Events</h2><Link className="text-sm text-teal-300" href="/organizer/events">View all events</Link></div>
        <div className="mt-4 space-y-3">{data.activeEvents.length ? data.activeEvents.map(event => <OrganizerEventCard key={event.id} event={event} />) : <p className="text-sm text-slate-400">No active events yet. Saved drafts appear in My Events.</p>}</div>
      </section>
      <section aria-label="Recent ticket sales" className="rounded-xl border border-white/10 bg-[#111622] p-5">
        <div className="flex justify-between"><h2 className="font-semibold text-white">Recent Ticket Sales</h2><Link href="/organizer/analytics" className="text-sm text-teal-300">Analytics & Reports</Link></div>
        {!data.recentTicketSales.length && <p className="mt-4 text-sm text-slate-400">No confirmed paid sales yet.</p>}
        {data.recentTicketSales.map(sale => <div key={sale.id} className="mt-3 flex justify-between gap-3 border-t border-white/5 pt-3 text-sm">
          <div><p className="text-white">{sale.buyerName}</p><p className="text-slate-400">{sale.eventTitle} · {sale.tier}</p></div>
          <div className="text-right"><p className="text-white">{organizerMoney(sale.amount)}{sale.testMode ? " (test)" : ""}</p><p className="text-xs text-slate-400">{organizerDate(sale.purchasedAt)}</p></div>
        </div>)}
      </section>
    </>}
  </div>;
}
