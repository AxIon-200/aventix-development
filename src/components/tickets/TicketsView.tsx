"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import ConfirmedETicket, { type ETicketData } from "@/components/booking/ConfirmedETicket";
import {
  BOOKED_TICKETS_KEY,
  formatEventDate,
  groupTickets,
  mergeTickets,
  parseBookedTickets,
  type DisplayTicket,
  type MyTicket,
  type TicketTab,
} from "@/lib/tickets";
import TicketList from "./TicketList";
import TicketStats from "./TicketStats";
import TicketTabs from "./TicketTabs";
import TicketsError from "./TicketsError";

// Reads the tickets saved by the booking flow without causing a hydration mismatch.
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
function getBookedSnapshot(): string | null {
  try {
    return window.localStorage.getItem(BOOKED_TICKETS_KEY);
  } catch {
    return null;
  }
}
function getServerSnapshot(): string | null {
  return null;
}

// Placeholder details come from the existing QR modal. Replace them with real ticket data in #12.
function buildPassData(ticket: DisplayTicket): ETicketData {
  return {
    eventTitle: ticket.eventName,
    category: "CONCERT",
    organizer: "Soundwave PH",
    date: ticket.dateLabel ?? formatEventDate(ticket.eventDate),
    time: "7:00 PM",
    doorsOpenTime: "Doors open 6:00 PM",
    venueName: ticket.venue.split(",")[0] || "The Astoria",
    venueAddress: ticket.venue.includes(",") ? ticket.venue : "2/F Poblacion Strip, Makati City",
    ticketHolder: "Jamie Dela Cruz",
    ticketType: ticket.ticketType,
    seatInfo: ticket.seatLabel ?? "General admission",
    gateInfo: "Enter via Gate B",
    bookingRef: "BKG-9031",
    admitsText: "Ticket 1 of 1",
    ticketId: ticket.ticketId,
    priceFormatted: ticket.price || "PHP 4,500.00",
    paymentMethod: "Paid with GCash",
    paymentDate: "Oct 2, 2026 09:42",
    paymentRef: "Ref GC-70331-951189",
    supportEmail: "help@soundwave.ph",
    supportPhone: "+63 917 555 0123",
  };
}

interface TicketsViewProps {
  tickets: MyTicket[] | null; // null means the request failed
  activeTab: TicketTab;
}

export default function TicketsView({ tickets, activeTab }: TicketsViewProps) {
  const rawBooked = useSyncExternalStore(subscribe, getBookedSnapshot, getServerSnapshot);
  const [selectedPass, setSelectedPass] = useState<ETicketData | null>(null);

  const groups = useMemo(() => {
    if (!tickets) return null;
    return groupTickets(mergeTickets(parseBookedTickets(rawBooked), tickets));
  }, [tickets, rawBooked]);

  // Close the pass with the Escape key.
  useEffect(() => {
    if (!selectedPass) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPass(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedPass]);

  if (!groups) return <TicketsError />;

  return (
    <>
      <TicketStats groups={groups} />
      <TicketTabs
        active={activeTab}
        counts={{
          upcoming: groups.upcoming.length,
          past: groups.past.length,
          cancelled: groups.cancelled.length,
        }}
      />
      <TicketList
        tickets={groups[activeTab]}
        tab={activeTab}
        onShowPass={(ticket) => setSelectedPass(buildPassData(ticket))}
      />

      {selectedPass && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Digital ticket pass"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="relative my-8 w-full max-w-2xl">
            <button
              type="button"
              onClick={() => setSelectedPass(null)}
              className="absolute -right-3 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
            <ConfirmedETicket data={selectedPass} showActions={true} />
          </div>
        </div>
      )}
    </>
  );
}
