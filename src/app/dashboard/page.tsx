import Link from "next/link";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";
import StatCard from "@/components/dashboard/StatCard";
import UpcomingEventsTable from "@/components/dashboard/UpcomingEventsTable";
import { PlusIcon } from "@/components/dashboard/icons";
import { getAttendeeDashboard } from "@/lib/dashboard";

export default async function AttendeeDashboardPage() {
  const data = await getAttendeeDashboard();

  return (
    <div className="flex flex-col">
      <DashboardTopbar title={`Welcome back, ${data.attendeeName}!`} />

      <div className="flex flex-col gap-6 p-4 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="rounded-lg border border-[#66fcf1] px-3.5 py-2 text-[13px] text-[#66fcf1]">
            {data.eventsThisMonth === 1
              ? "You have 1 event coming up this month"
              : `You have ${data.eventsThisMonth} events coming up this month`}
          </p>
          <Link
            href="/events"
            className="flex items-center gap-2 rounded-lg border border-[#2c3644] bg-[#0b0c10] px-4 py-2.5 text-[13px] font-semibold text-white hover:border-[#66fcf1]"
          >
            <PlusIcon className="h-4 w-4" />
            Buy Tickets
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
    </div>
  );
}
