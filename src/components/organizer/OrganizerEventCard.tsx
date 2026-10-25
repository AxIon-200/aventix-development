import Link from "next/link";
import { organizerDate, organizerMoney } from "@/lib/organizer";
import type { OrganizerEventSummary } from "@/types/organizer";
export default function OrganizerEventCard({ event }: { event: OrganizerEventSummary }) {
  return <article className="rounded-xl border border-white/10 bg-[#0f141f] p-4">
    <p className="text-xs text-teal-300">{event.category} · {event.status}</p>
    <h3 className="mt-2 font-semibold text-white">{event.title}</h3>
    <p className="mt-1 text-sm text-slate-400">{organizerDate(event.startsAt)} · {event.venue}</p>
    <p className="mt-3 text-sm text-slate-300">{event.ticketsSold} / {event.totalCapacity ?? "unknown"} sold{event.capacityPercent === null ? "" : ` (${event.capacityPercent}%)`} · {organizerMoney(event.grossRevenue)} gross sales</p>
    <div className="mt-4 flex gap-4 text-sm">
      <Link className="text-teal-300 underline" href={`/organizer/events/new?eventId=${encodeURIComponent(event.id)}`}>Edit / Manage</Link>
      {event.publicView ? <Link className="text-teal-300 underline" href={`/events/${event.id}`}>Public View</Link> : <span className="text-slate-500" title="Drafts and incomplete listings are not publicly available">Public View unavailable</span>}
    </div>
  </article>;
}
