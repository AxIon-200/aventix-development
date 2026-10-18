import Link from "next/link";
import DashboardTopbar from "@/components/dashboard/DashboardTopbar";
import { TicketIcon, QrCodeIcon } from "@/components/dashboard/icons";

export default function AttendeeTicketsPage() {
  const sampleTickets = [
    {
      id: "TKT-8291",
      eventTitle: "Neon Eclipse Rave",
      tier: "VIP Lounge",
      date: "Oct 24, 2026",
      venue: "Warehouse District",
      status: "confirmed",
      seat: "Section A - Table 4",
    },
    {
      id: "TKT-3194",
      eventTitle: "Sunset Jazz Festival",
      tier: "General Admission",
      date: "Nov 02, 2026",
      venue: "Riverside Park",
      status: "pending",
      seat: "Open Lawn",
    },
  ];

  return (
    <div className="flex flex-col">
      <DashboardTopbar title="My Tickets & Passes" />

      <div className="flex flex-col gap-6 p-4 sm:p-8">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Show your digital QR code pass at the event gate for entrance.
          </p>
          <Link
            href="/events"
            className="rounded-lg bg-teal-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-400"
          >
            Find More Events
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {sampleTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#151c28] p-5 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-teal-500/20 px-2 py-0.5 text-[11px] font-semibold text-teal-300">
                    {ticket.tier}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{ticket.id}</span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-white">{ticket.eventTitle}</h3>
                <div className="mt-2 text-xs text-slate-400 space-y-1">
                  <p>📅 {ticket.date}</p>
                  <p>📍 {ticket.venue}</p>
                  <p>🪑 {ticket.seat}</p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
                  {ticket.status}
                </span>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs font-medium text-teal-300 hover:bg-teal-500/20"
                >
                  <QrCodeIcon className="h-4 w-4" />
                  <span>Show QR Pass</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
