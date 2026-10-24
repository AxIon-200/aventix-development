"use client";

import Link from "next/link";
import StatCard from "@/components/dashboard/StatCard";
import UpcomingEventsTable from "@/components/dashboard/UpcomingEventsTable";
import { PlusIcon } from "@/components/dashboard/icons";
import { useAttendeeRecords } from "./useAttendeeRecords";
import { money, summarizeAttendee } from "@/lib/attendee-records";

export default function AttendeeDashboardOverview({ attendeeName }: { attendeeName: string }) {
  const records = useAttendeeRecords();
  const summary = summarizeAttendee([...records.bookings, ...records.demos]);
  const includesDemos = records.demos.length > 0;
  const databaseUnavailable = records.loading || !!records.error;
  const badge = databaseUnavailable ? "Local demos only" : includesDemos ? "Includes simulation" : undefined;
  const data = {
    eventsThisMonth: summary.displayedEventsThisMonth,
    stats: [
      { label: "My Tickets", value: String(summary.displayedTicketCount), badge: badge ?? "Issued", footnote: includesDemos ? `${summary.demoQuantity} simulated tickets included` : "Valid and used tickets from confirmed bookings" },
      { label: "Upcoming Events", value: String(summary.displayedUpcoming.length), badge: badge ?? "Confirmed", footnote: "Upcoming events counted once, including demo purchases" },
      { label: includesDemos ? "Total Spent + Simulation" : "Total Spent", value: money(summary.displayedSpentCentavos), badge: badge ?? "Paid", footnote: databaseUnavailable ? `${money(summary.demoCentavos)} simulated; database payments unavailable` : `${money(summary.spentCentavos)} paid + ${money(summary.demoCentavos)} simulated` },
      { label: "Bookings", value: String(summary.displayedBookingCount), badge: badge ?? "All statuses", footnote: includesDemos ? `${records.demos.length} demo bookings included` : "Your database booking history" },
    ],
    upcomingEvents: summary.displayedUpcoming.map(booking => ({
      ticketId: booking.id, eventId: booking.eventId, name: booking.eventTitle,
      ticketTier: booking.simulation ? booking.pass?.ticketType ?? "Demo" : [...new Set(booking.tickets.filter(t => t.status === "VALID").map(t => t.tier))].join(", "),
      date: new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium" }).format(new Date(booking.startsAt!)),
      venue: booking.venue, status: booking.simulation ? "demo" as const : "confirmed" as const,
    })),
  };
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
            Attendee Portal
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            Welcome back, {attendeeName}!
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View your tickets, payment totals, and booking history.
          </p>
        </div>
        <Link
          href="/dashboard/buy-tickets"
          className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-3.5 py-2 text-xs font-medium text-slate-950 transition hover:bg-teal-400"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          <span>Buy Tickets</span>
        </Link>
      </div>

      {records.demos.length > 0 && <p className="rounded-lg border border-amber-400/30 p-4 text-sm text-amber-200">
        PayMongo simulation: {summary.demoQuantity} demo tickets across {records.demos.length} demo bookings, totaling {money(summary.demoCentavos)} in simulated payments. No real money spent. Demo passes appear in My Tickets and booking history.
      </p>}
      {records.loading && <p role="status">Loading your attendee records...</p>}
      {records.error && <div role="alert" className="space-y-2 text-sm text-amber-200"><p>{records.error} {includesDemos && "Showing local simulation activity only; database totals are unavailable."}</p><button type="button" onClick={records.retry} className="underline">Retry</button></div>}
      {(!databaseUnavailable || includesDemos) && <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-2.5 text-xs text-teal-300">
        <p>
          {data.eventsThisMonth === 1
            ? "You have 1 event coming up this month"
            : `You have ${data.eventsThisMonth} events coming up this month`}
        </p>
        <Link href="/dashboard/tickets" className="font-semibold underline hover:text-white">
          View your passes &rarr;
        </Link>
      </div>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section aria-label="Upcoming events">
        <UpcomingEventsTable events={data.upcomingEvents} />
      </section>
      </>}
    </div>
  );
}
