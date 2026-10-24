import Link from "next/link";
import type { UpcomingEvent } from "@/lib/dashboard";
import StatusBadge from "./StatusBadge";

export default function UpcomingEventsTable({ events }: { events: UpcomingEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-[#2c3644] bg-[#0b0c10] p-8 text-center text-sm text-[#c5c6c7]">
        You have no upcoming events yet.{" "}
        <Link href="/events" className="font-semibold text-[#66fcf1] hover:underline">
          Browse events
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#2c3644] bg-[#0b0c10]">
      <table className="w-full min-w-[820px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-[#2c3644] text-[#c5c6c7]">
            <th scope="col" className="w-[300px] p-4 font-semibold">Event</th>
            <th scope="col" className="w-[180px] p-4 font-semibold">Ticket Tier</th>
            <th scope="col" className="p-4 font-semibold">Date &amp; Venue</th>
            <th scope="col" className="w-[140px] p-4 font-semibold">Status</th>
            <th scope="col" className="p-4 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.ticketId} className="border-b border-[#2c3644] last:border-b-0">
              <td className="p-4">
                <Link href={`/events/${event.eventId}`} className="flex items-center gap-3">
                  {event.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.imageUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1f2833] text-sm font-semibold text-[#66fcf1]">
                      {event.name.charAt(0)}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">{event.name}</span>
                    {event.organizerEmail && (
                      <span className="block truncate text-[11px] text-[#64748b]">{event.organizerEmail}</span>
                    )}
                  </span>
                </Link>
              </td>
              <td className="p-4 font-semibold text-[#66fcf1]">{event.ticketTier}</td>
              <td className="p-4 text-[#c5c6c7]">
                {event.date} • {event.venue}
              </td>
              <td className="p-4">
                <StatusBadge status={event.status} />
              </td>
              <td className="p-4">
                <Link
                  href="/dashboard/tickets"
                  className="font-semibold text-[#66fcf1] hover:underline"
                >
                  View Ticket
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
