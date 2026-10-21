"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import TicketSelection from "../TicketSelection";
import SeatSelection from "../SeatSelection";
import BookingRecordView from "../BookingRecordView";
import type { PublicAuthClient } from "@/lib/auth/client";
import type { PublicBookingClient } from "@/lib/booking/client";
import type { BookingDraft, BookingRecord, EventSeat, TicketOptions } from "@/lib/booking/types";
import type { EventDetails } from "@/types/event";

const event: EventDetails = {
  id: "preview-event-only", name: "SAMPLE — Aventix booking walkthrough", performers: ["Sample artist"],
  type: "Concert", description: "Development screen review. This is not a real event or sale.",
  startsAt: "2027-01-20T12:00:00+08:00", venue: { name: "Sample venue", address: "Sample location" },
  organizer: { name: "Sample organizer" }, status: "PUBLISHED",
  categories: [
    { id: "preview-standard", name: "Sample reserved seating", description: "Numbered seats", price: 2200, status: "ACTIVE", availability: "AVAILABLE", remaining: 6 },
    { id: "preview-premium", name: "Sample premium seating", description: "Numbered seats", price: 3500, status: "ACTIVE", availability: "AVAILABLE", remaining: 4 },
  ],
};
const seats: EventSeat[] = event.categories.flatMap((category, index) => Array.from({ length: index ? 4 : 6 }, (_, n) => ({
  id: `${category.id}-${n + 1}`, eventId: event.id, ticketCategoryId: category.id,
  section: index ? "Premium" : "Main", row: index ? "B" : "A", seatNumber: String(n + 1),
  displayLabel: `${index ? "B" : "A"}${n + 1}`, status: "AVAILABLE" as const,
})));
const options: TicketOptions = { event, purchaseLimit: 4, confirmedQuantity: 0, heldQuantity: 0 };
const sampleAuth: PublicAuthClient = { getSession: async () => ({ userId: "sample-ui-only", role: "ATTENDEE", displayName: "Sample attendee", canBook: true }) };
const tabs = ["Tickets", "Numbered seats", "Summary", "Payment", "Confirmation"];

/** Isolated visual review only. No login cookies, account storage, reservations or payment mutations. */
export default function BookingPreview() {
  const [stage, setStage] = useState(0);
  const [openedAt] = useState(() => new Date());
  const [selection, setSelection] = useState<BookingDraft>();
  const snapshot = useMemo<BookingRecord>(() => {
    const items = selection?.items.length ? selection.items : [{ ticketCategoryId: event.categories[0].id, quantity: 1, seatIds: [seats[0].id] }];
    const bookingItems = items.map(item => {
      const category = event.categories.find(c => c.id === item.ticketCategoryId)!;
      return { ticketCategoryId: category.id, name: category.name, quantity: item.quantity, unitPrice: category.price,
        seats: item.seatIds.map(id => { const seat = seats.find(s => s.id === id)!; return { id: seat.id, displayLabel: seat.displayLabel, section: seat.section, row: seat.row }; }) };
    });
    const subtotal = bookingItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    return {
      id: "preview-booking-only", reference: "SAMPLE — NOT A REAL BOOKING", event,
      attendee: { name: "Sample attendee", email: "sample@example.invalid" },
      status: stage === 4 ? "CONFIRMED" : "PENDING_PAYMENT", paymentStatus: stage === 4 ? "PAID" : "PENDING",
      items: bookingItems, subtotal, fees: [], total: subtotal, currency: "PHP",
      serverNow: openedAt.toISOString(), expiresAt: new Date(openedAt.getTime() + 600000).toISOString(),
      canPay: stage !== 4, canCancel: false,
    };
  }, [selection, stage, openedAt]);
  const client = useMemo<PublicBookingClient>(() => ({
    getTicketOptions: async () => options, getSeats: async () => seats,
    getBooking: async () => snapshot,
    // No createBooking, startPayment or cancellation implementation in this screen review.
  }), [snapshot]);
  return <div onClickCapture={e => {
    const anchor = (e.target as Element).closest("a");
    const href = anchor?.getAttribute("href") ?? "";
    if (href.includes("preview-booking-only") || href.includes(event.id)) {
      e.preventDefault(); e.stopPropagation();
      setStage(href.includes("/payment") ? 3 : href.includes("/summary") ? 2 : 0);
    }
  }}>
    <aside className="relative z-[70] border-b border-amber-400/40 bg-[#302411] px-4 py-4 text-amber-100">
      <div className="mx-auto max-w-[1360px]">
        <p className="font-semibold">Development preview — sample screens, no real login or booking</p>
        <p className="mt-1 text-sm">Select sample tickets and seats to review the UI. Payment and confirmation are read-only examples; no money is charged and no tickets are issued.</p>
        <nav aria-label="Booking preview screens" className="mt-3 flex flex-wrap gap-2">
          {tabs.map((tab, index) => <button key={tab} type="button" aria-current={stage === index ? "step" : undefined} onClick={() => setStage(index)} className={`min-h-11 rounded-lg border px-3 text-sm ${stage === index ? "border-[#66fcf1] bg-[#66fcf1] text-[#0b0c10]" : "border-amber-100/30"}`}>{index + 1}. {tab}</button>)}
          <Link href="/login" className="min-h-11 rounded-lg px-3 py-3 text-sm underline">Real login</Link>
        </nav>
      </div>
    </aside>
    {stage === 0 ? <TicketSelection eventId={event.id} fallback={null} auth={sampleAuth} client={client} onContinue={() => setStage(1)} /> :
      stage === 1 ? <SeatSelection eventId={event.id} auth={sampleAuth} client={client} reviewSelection={draft => { setSelection(draft); setStage(2); }} /> :
      <BookingRecordView key={stage} bookingId={snapshot.id} mode={stage === 2 ? "summary" : stage === 3 ? "payment" : "confirmation"} auth={sampleAuth} client={client} />}
  </div>;
}
