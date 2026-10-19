import Link from "next/link";
import StatCard from "@/components/dashboard/StatCard";
import UpcomingEventsTable from "@/components/dashboard/UpcomingEventsTable";
import { PlusIcon } from "@/components/dashboard/icons";
import { getAttendeeDashboard } from "@/lib/dashboard";

export default async function AttendeeDashboardPage() {
  const data = await getAttendeeDashboard();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
            Attendee Portal
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            Welcome back, {data.attendeeName}!
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View your upcoming event tickets, loyalty points, and purchase history.
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
    </div>
  );
}
