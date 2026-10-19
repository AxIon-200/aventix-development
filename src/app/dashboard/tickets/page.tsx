"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { QrCodeIcon } from "@/components/dashboard/icons";
import { Plus, X, Ticket as TicketIcon } from "lucide-react";
import ConfirmedETicket, { type ETicketData, DEFAULT_ETICKET_DATA } from "@/components/booking/ConfirmedETicket";

interface AttendeeTicketItem {
  id: string;
  eventTitle: string;
  tier: string;
  date: string;
  venue: string;
  status: string;
  seat: string;
  price?: string;
}

const INITIAL_SAMPLE_TICKETS: AttendeeTicketItem[] = [
  {
    id: "TKT-7F3K-92QD-XM41",
    eventTitle: "Neon Nights: Live Sessions",
    tier: "VIP",
    date: "Sat, Dec 5, 2026",
    venue: "The Astoria, Makati City",
    status: "confirmed",
    seat: "Section A · Row 5 · Seat 12",
    price: "PHP 4,500.00",
  },
  {
    id: "TKT-8291",
    eventTitle: "Neon Eclipse Rave",
    tier: "VIP Lounge",
    date: "Oct 24, 2026",
    venue: "Warehouse District",
    status: "confirmed",
    seat: "Section A - Table 4",
    price: "PHP 3,800.00",
  },
  {
    id: "TKT-3194",
    eventTitle: "Sunset Jazz Festival",
    tier: "General Admission",
    date: "Nov 02, 2026",
    venue: "Riverside Park",
    status: "pending",
    seat: "Open Lawn",
    price: "PHP 1,500.00",
  },
];

export default function AttendeeTicketsPage() {
  const [tickets, setTickets] = useState<AttendeeTicketItem[]>(INITIAL_SAMPLE_TICKETS);
  const [selectedPass, setSelectedPass] = useState<ETicketData | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("aventix_attendee_tickets");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge unique by id
          const existingIds = new Set(parsed.map((t) => t.id));
          const combined = [
            ...parsed,
            ...INITIAL_SAMPLE_TICKETS.filter((t) => !existingIds.has(t.id)),
          ];
          setTickets(combined);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleOpenQRModal = (ticket: AttendeeTicketItem) => {
    const ticketData: ETicketData = {
      eventTitle: ticket.eventTitle,
      category: "CONCERT",
      organizer: "Soundwave PH",
      date: ticket.date,
      time: "7:00 PM",
      doorsOpenTime: "Doors open 6:00 PM",
      venueName: ticket.venue.split(",")[0] || "The Astoria",
      venueAddress: ticket.venue.includes(",") ? ticket.venue : "2/F Poblacion Strip, Makati City",
      ticketHolder: "Jamie Dela Cruz",
      ticketType: ticket.tier,
      seatInfo: ticket.seat,
      gateInfo: "Enter via Gate B",
      bookingRef: "BKG-9031",
      admitsText: "Ticket 1 of 1",
      ticketId: ticket.id,
      priceFormatted: ticket.price || "PHP 4,500.00",
      paymentMethod: "Paid with GCash",
      paymentDate: "Oct 2, 2026 09:42",
      paymentRef: "Ref GC-70331-951189",
      supportEmail: "help@soundwave.ph",
      supportPhone: "+63 917 555 0123",
    };
    setSelectedPass(ticketData);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
            Tickets & Passes
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">My Tickets</h1>
          <p className="mt-1 text-sm text-slate-400">
            Show your official digital QR code pass at the event gate for entrance.
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
              <button
                type="button"
                onClick={() => handleOpenQRModal(ticket)}
                className="flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs font-medium text-teal-300 transition hover:bg-teal-500/20"
              >
                <QrCodeIcon className="h-4 w-4" />
                <span>Show QR Pass</span>
              </button>
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
