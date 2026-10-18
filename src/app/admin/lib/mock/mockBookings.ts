import { AdminBooking, BookingStatus, PaymentStatus } from "@/app/admin/types/bookings";

// ─────────────────────────────────────────────────────────────
// DEMO SWITCHES — only used while USE_MOCK is true in bookingService.ts
//   seedBookings: false = empty table (the real starting state)
//                 true  = 68 sample bookings
//   failRequests: true  = every request fails (preview the error states)
// ─────────────────────────────────────────────────────────────
export const DEMO = {
  seedBookings: false,
  failRequests: false,
};

const EVENTS = [
  { id: "evt-401", title: "Neon Nights: Live Sessions", price: 850, venue: "The Astoria" },
  { id: "evt-402", title: "Art After Dark", price: 400, venue: "Poblacion Space" },
  { id: "evt-403", title: "Build & Ship Weekend", price: 1200, venue: "Makati Makerspace" },
  { id: "evt-404", title: "Design Systems 101", price: 950, venue: "BGC Grounds Center" },
  { id: "evt-405", title: "Northstar Acoustic Night", price: 600, venue: "The Pantry" },
  { id: "evt-406", title: "Pulse Summit", price: 1500, venue: "BGC Convention Hall" },
];
const CUSTOMERS = ["Mia Santos", "Noah Garcia", "Alyssa Cruz", "Ethan Lim", "Sofia Reyes", "Daniel Tan", "Nina Ramos", "Lucas Bautista", "Isabel Mendoza", "Gabriel Aquino"];
const STATUS_CYCLE: BookingStatus[] = ["confirmed", "confirmed", "pending", "completed", "confirmed", "cancelled", "confirmed"];

// Payment always follows the booking status so the demo data stays consistent.
const PAYMENT_FOR: Record<BookingStatus, PaymentStatus> = {
  confirmed: "paid",
  pending: "pending",
  completed: "paid",
  cancelled: "refunded",
};

export const MOCK_EVENT_VENUES: Record<string, string> = Object.fromEntries(
  EVENTS.map((e) => [e.id, e.venue])
);

function buildDemoBookings(count: number): AdminBooking[] {
  const DAY = 86_400_000;
  return Array.from({ length: count }, (_, i) => {
    const event = EVENTS[i % EVENTS.length];
    const customer = CUSTOMERS[(i * 3 + 1) % CUSTOMERS.length];
    const tickets = (i % 4) + 1;
    const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
    return {
      id: `bkg-${9031 + i}`,
      bookingCode: `BKG-${9031 + i}`,
      eventId: event.id,
      eventTitle: event.title,
      customerName: customer,
      customerEmail: `${customer.toLowerCase().replace(/\s+/g, ".")}@email.com`,
      tickets,
      amount: tickets * event.price,
      status,
      paymentStatus: PAYMENT_FOR[status],
      createdAt: new Date(Date.now() - i * 0.8 * DAY).toISOString(),
    };
  });
}

// Mutable on purpose: the mock service edits it so payment changes really
// update the table, the stat cards, and the details modal.
export const mockBookings: AdminBooking[] = DEMO.seedBookings ? buildDemoBookings(68) : [];
export const mockPaymentNotes = new Map<string, string>();
