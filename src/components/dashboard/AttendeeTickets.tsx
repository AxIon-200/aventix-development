"use client";

import { useState } from "react";
import Link from "next/link";
import { QrCodeIcon } from "@/components/dashboard/icons";
import { Plus, X } from "lucide-react";
import { useAttendeeRecords } from "./useAttendeeRecords";
import ConfirmedETicket, { type ETicketData } from "@/components/booking/ConfirmedETicket";

export default function AttendeeTicketsPage() {
  const records = useAttendeeRecords();
  const tickets = records.bookings.flatMap(booking => booking.tickets.map(ticket => ({
    id: ticket.id, eventTitle: booking.eventTitle, tier: ticket.tier,
    date: booking.startsAt ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium" }).format(new Date(booking.startsAt)) : "Date to be announced",
    venue: booking.venue, status: ticket.status, seat: ticket.code,
    quantity: 1, simulation: false, pass: undefined as ETicketData | undefined,
  }))).concat(records.demos.map(booking => ({
    id: booking.id, eventTitle: booking.eventTitle, tier: booking.pass?.ticketType ?? "Demo",
    date: booking.pass?.date ?? "", venue: booking.venue, status: "DEMO",
    seat: booking.pass?.seatInfo ?? "", quantity: booking.quantity, simulation: true, pass: booking.pass,
  })));
  const [selectedPass, setSelectedPass] = useState<ETicketData | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
            Tickets & Passes
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">My Tickets</h1>
          <p className="mt-1 text-sm text-slate-400">
            Your issued tickets and PayMongo demo passes. Demo passes are not valid for admission.
          </p>
        </div>

        <Link
          href="/dashboard/buy-tickets"
          className="flex items-center gap-1.5 self-start rounded-lg bg-teal-500 px-4 py-2.5 text-xs font-medium text-slate-950 transition hover:bg-teal-400 sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Buy Tickets</span>
        </Link>
      </div>

      {records.loading && <p role="status">Loading your tickets...</p>}
      {records.error && <p role="alert">{records.error} <button type="button" onClick={records.retry} className="underline">Retry</button></p>}
      {!records.loading && !records.error && tickets.length === 0 && <p className="text-sm text-slate-400">You have no tickets yet.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="flex flex-col justify-between rounded-xl border border-white/10 bg-[#111622] p-5 shadow-sm transition hover:border-teal-500/30"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-teal-500/20 px-2 py-0.5 text-[11px] font-semibold text-teal-300">
                  {ticket.tier}
                </span>
                <span className="text-xs font-mono text-slate-400">{ticket.id}</span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-white">
                {ticket.eventTitle}
              </h3>
              {ticket.simulation && <p className="text-xs text-amber-200">Demo pass for {ticket.quantity} {ticket.quantity === 1 ? "attendee" : "attendees"}</p>}
              <div className="mt-2 space-y-1 text-xs text-slate-400">
                <p>📅 {ticket.date}</p>
                <p>📍 {ticket.venue}</p>
                <p>🪑 {ticket.seat}</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
                {ticket.status}
              </span>
              {ticket.simulation && ticket.pass && <button
                type="button"
                onClick={() => setSelectedPass({ ...ticket.pass!, simulation: true })}
                className="flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs font-medium text-teal-300 transition hover:bg-teal-500/20"
              >
                <QrCodeIcon className="h-4 w-4" />
                <span>Show demo pass</span>
              </button>}
            </div>
          </div>
        ))}
      </div>

      {/* Modal with Authentic E-Ticket Pass (Matching Image 2) */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative my-8 w-full max-w-2xl">
            <button
              type="button"
              onClick={() => setSelectedPass(null)}
              className="absolute -top-3 -right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
            <ConfirmedETicket data={selectedPass} showActions={true} />
          </div>
        </div>
      )}
    </div>
  );
}
