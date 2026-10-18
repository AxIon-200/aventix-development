import Link from "next/link";
import { formatEventDate, type DisplayTicket, type RefundStatus, type TicketTab } from "@/lib/tickets";
import TicketStatusBadge from "./TicketStatusBadge";

const emptyMessages: Record<TicketTab, string> = {
  upcoming: "You have no upcoming tickets.",
  past: "No past tickets yet.",
  cancelled: "No cancelled tickets.",
};

const columns =
  "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_128px] md:items-center md:gap-4";
  
function cancelledNote(refund?: RefundStatus): string {
  if (refund === "PENDING") return "Event cancelled · refund pending";
  if (refund === "FAILED") return "Event cancelled · refund failed";
  if (refund === "COMPLETED") return "Event cancelled · refunded";
  return "Event cancelled";
}

export default function TicketList({ tickets, tab }: { tickets: DisplayTicket[]; tab: TicketTab }) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#111622] p-8 text-center">
        <p className="text-sm text-slate-400">{emptyMessages[tab]}</p>
        {tab === "upcoming" && (
          <Link href="/events" className="mt-3 inline-block text-sm font-semibold text-teal-400 hover:underline">
            Browse events
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111622]">
      <div aria-hidden="true" className={`hidden border-b border-white/10 px-4 py-3 text-xs font-semibold text-slate-400 md:grid ${columns}`}>
        <span>Event</span>
        <span>Ticket Type</span>
        <span>Date &amp; Venue</span>
        <span>Status</span>
        <span>Action</span>
      </div>

      <ul className="divide-y divide-white/10">
        {tickets.map((ticket) => {
          const usable = ticket.displayStatus === "VALID";
          return (
            <li key={ticket.ticketId} className={`grid gap-3 p-4 ${columns} ${usable ? "" : "bg-black/20"}`}>
              <div className="min-w-0">
                <p className={`truncate text-sm font-semibold ${usable ? "text-white" : "text-slate-300"}`}>
                  {ticket.eventName}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  <span className="font-mono">{ticket.ticketId}</span>
                  {ticket.seatLabel ? ` · Seat: ${ticket.seatLabel}` : ""}
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 md:sr-only">Ticket type</p>
                <p className="text-[13px] font-semibold text-teal-400">{ticket.ticketType}</p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 md:sr-only">Date &amp; venue</p>
                <p className="text-[13px] text-slate-300">
                  {formatEventDate(ticket.eventDate)} • {ticket.venue}
                </p>
              </div>

              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500 md:sr-only">Status</p>
                <TicketStatusBadge status={ticket.displayStatus} />
                {!usable && <p className="mt-1 text-[11px] text-slate-500">Not valid for entry</p>}
                {ticket.eventCancelled && (
                  <p className="mt-0.5 text-[11px] text-red-300/80">{cancelledNote(ticket.refundStatus)}</p>
                )}
              </div>

              <div>
                <Link
                  href={`/dashboard/tickets/${encodeURIComponent(ticket.ticketId)}`}
                  aria-label={`${usable ? "View ticket" : "View details"} for ${ticket.eventName}, ${ticket.ticketId}`}
                  className={`inline-block rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
                    usable
                      ? "border border-teal-500/30 bg-teal-500/10 text-teal-300 hover:bg-teal-500/20"
                      : "border border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {usable ? "View Ticket" : "View Details"}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
