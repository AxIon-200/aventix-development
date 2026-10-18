import Link from "next/link";
import {
  CalendarDays,
  Ticket,
  DollarSign,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  MapPin,
} from "lucide-react";
import OrganizerTopbar from "@/components/organizer/OrganizerTopbar";
import OrganizerStatCard from "@/components/organizer/OrganizerStatCard";
import { getOrganizerDashboard } from "@/lib/organizer";

export default async function OrganizerDashboardPage() {
  const data = await getOrganizerDashboard();

  return (
    <div className="flex flex-col gap-6">
      <OrganizerTopbar
        title={`Welcome, ${data.organizerName}!`}
        subtitle={`${data.organizationName} — Event Management Hub`}
      />

      <div className="flex flex-col gap-6">
        {/* Stat Cards */}
        <section aria-label="Key performance indicators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OrganizerStatCard
            label="Active Events"
            value="4 Live"
            change="+1 this month"
            footnote="Across 2 venues"
            icon={CalendarDays}
          />
          <OrganizerStatCard
            label="Tickets Sold"
            value="1,840"
            change="+18.2%"
            footnote="85% capacity reached"
            icon={Ticket}
          />
          <OrganizerStatCard
            label="Gross Sales"
            value="₱425,000"
            change="+24.5%"
            footnote="Net payout pending"
            icon={DollarSign}
          />
          <OrganizerStatCard
            label="Check-in Rate"
            value="92%"
            change="On target"
            footnote="Real-time gate scans"
            icon={TrendingUp}
          />
        </section>

        {/* Active Events Overview */}
        <section
          aria-label="Active events"
          className="rounded-xl border border-white/10 bg-[#111622] p-5 shadow-sm"
        >
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h2 className="text-base font-semibold text-white">Your Managed Events</h2>
              <p className="text-xs text-slate-400">Current active listings and live ticket capacity</p>
            </div>
            <Link
              href="/organizer/events"
              className="flex items-center gap-1 text-xs font-medium text-teal-400 hover:text-teal-300"
            >
              <span>View all events</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {data.activeEvents.map((event) => {
              const capacityPercent = Math.round((event.ticketsSold / event.totalCapacity) * 100);
              return (
                <div
                  key={event.id}
                  className="flex flex-col gap-4 rounded-lg border border-white/5 bg-[#0f141f] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-teal-500/20 px-2 py-0.5 text-[11px] font-medium text-teal-300">
                        {event.category}
                      </span>
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                        {event.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white">{event.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        {event.startDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-500" />
                        {event.venue}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex flex-col text-right">
                      <span className="text-xs text-slate-400">
                        {event.ticketsSold} / {event.totalCapacity} Sold ({capacityPercent}%)
                      </span>
                      <span className="text-sm font-bold text-white">
                        ₱{event.grossRevenue.toLocaleString()}
                      </span>
                    </div>

                    <Link
                      href={`/organizer/events/${event.id}`}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/5"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Ticket Sales Activity */}
        <section
          aria-label="Recent ticket sales"
          className="rounded-xl border border-white/10 bg-[#111622] p-5 shadow-sm"
        >
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h2 className="text-base font-semibold text-white">Recent Ticket Sales</h2>
              <p className="text-xs text-slate-400">Latest buyer checkouts across your events</p>
            </div>
            <Link
              href="/organizer/analytics"
              className="text-xs font-medium text-teal-400 hover:text-teal-300"
            >
              Analytics & Reports
            </Link>
          </div>

          <div className="mt-4 divide-y divide-white/5">
            {data.recentTicketSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">{sale.buyerName}</span>
                  <span className="text-xs text-slate-400">
                    {sale.eventTitle} &bull; <span className="text-teal-400">{sale.tier}</span>
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-sm font-semibold text-white">
                    ₱{sale.amount.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-500">{sale.purchasedAt}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
