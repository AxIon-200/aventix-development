import Link from "next/link";
import { Plus, Search, Filter, Calendar, MapPin, Users } from "lucide-react";
import OrganizerTopbar from "@/components/organizer/OrganizerTopbar";
import { getOrganizerDashboard } from "@/lib/organizer";

export default async function OrganizerEventsPage() {
  const data = await getOrganizerDashboard();

  return (
    <div className="flex flex-col gap-6">
      <OrganizerTopbar
        title="Manage Events"
        subtitle="Track registrations, edit details, and monitor seating capacity"
      />

      <div className="flex flex-col gap-4">
        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search events by title or venue..."
              className="w-full rounded-lg border border-white/10 bg-[#111622] py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#111622] px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5">
              <Filter className="h-3.5 w-3.5" />
              <span>Filter Status</span>
            </button>
            <Link
              href="/organizer/events/new"
              className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-400"
            >
              <Plus className="h-4 w-4" />
              <span>New Event</span>
            </Link>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {data.activeEvents.map((event) => (
            <div
              key={event.id}
              className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#111622] p-5 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-teal-500/20 px-2 py-0.5 text-[11px] font-medium text-teal-300">
                    {event.category}
                  </span>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                    {event.status}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-white">{event.title}</h3>
                <div className="mt-2 space-y-1 text-xs text-slate-400">
                  <p className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    {event.startDate}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    {event.venue}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-500" />
                    {event.ticketsSold} / {event.totalCapacity} attendees registered
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-sm font-bold text-white">
                  ₱{event.grossRevenue.toLocaleString()} <span className="text-xs font-normal text-slate-400">gross</span>
                </span>
                <div className="flex gap-2">
                  <Link
                    href={`/organizer/events/${event.id}`}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/5"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/events/${event.id}`}
                    target="_blank"
                    className="rounded-lg bg-teal-500/20 px-3 py-1.5 text-xs font-medium text-teal-300 hover:bg-teal-500/30"
                  >
                    Public View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
