import type { ETicketData } from "@/components/booking/ConfirmedETicket";

export interface AttendeeBooking {
  id: string;
  reference: string;
  eventId: string;
  eventTitle: string;
  startsAt: string | null;
  eventStatus: string;
  venue: string;
  status: string;
  overdue?: boolean;
  createdAt: string;
  paidCentavos: number;
  totalCentavos: number;
  quantity: number;
  tickets: { id: string; code: string; status: string; tier: string }[];
  simulation?: boolean;
  pass?: ETicketData;
}
export interface AttendeeRecords { userId: string; bookings: AttendeeBooking[] }

export const money = (centavos: number) => new Intl.NumberFormat("en-PH", {
  style: "currency", currency: "PHP",
}).format(centavos / 100);

export const demoStorageKey = (userId: string) => `aventix_demo_bookings:${userId}`;
export const demoRecordsChanged = "aventix-demo-bookings-changed";

export function parseDemoBookings(raw: string | null): AttendeeBooking[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed.filter((value): value is AttendeeBooking => {
      if (!value || typeof value !== "object") return false;
      const b = value as AttendeeBooking;
      if (b.simulation !== true || b.status !== "DEMO" ||
        ![b.id, b.reference, b.eventId, b.eventTitle, b.venue, b.createdAt].every(v => typeof v === "string") ||
        !Number.isFinite(Date.parse(b.createdAt)) ||
        (b.startsAt !== null && (typeof b.startsAt !== "string" || !Number.isFinite(Date.parse(b.startsAt)))) ||
        !Number.isSafeInteger(b.quantity) || b.quantity < 1 ||
        !Number.isSafeInteger(b.totalCentavos) || b.totalCentavos < 0 ||
        b.paidCentavos !== 0 || !Array.isArray(b.tickets) || b.tickets.length !== 0 ||
        seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  } catch { return []; }
}

export function summarizeAttendee(bookings: AttendeeBooking[], now = new Date()) {
  const real = bookings.filter(b => !b.simulation);
  const issued = real.filter(b => b.status === "CONFIRMED")
    .flatMap(b => b.tickets.filter(t => t.status === "VALID" || t.status === "USED"));
  const upcoming = real.filter(b => b.status === "CONFIRMED" &&
    !["CANCELLED", "COMPLETED", "DRAFT"].includes(b.eventStatus) &&
    b.startsAt && Date.parse(b.startsAt) >= now.getTime() && b.tickets.some(t => t.status === "VALID"));
  const events = new Map(upcoming.map(b => [b.eventId, b]));
  const demos = bookings.filter(b => b.simulation && b.status === "DEMO");
  const demoUpcoming = demos.filter(b =>
    !["CANCELLED", "COMPLETED", "DRAFT"].includes(b.eventStatus) &&
    b.startsAt && Date.parse(b.startsAt) >= now.getTime());
  // Count each event once, preferring a real booking when both kinds exist.
  const displayedEvents = new Map([...demoUpcoming, ...upcoming].map(b => [b.eventId, b]));
  const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit" });
  const spentCentavos = real.filter(b => b.status !== "REFUNDED").reduce((sum, b) => sum + b.paidCentavos, 0);
  const demoQuantity = demos.reduce((sum, b) => sum + b.quantity, 0);
  const demoCentavos = demos.reduce((sum, b) => sum + b.totalCentavos, 0);
  return {
    ticketCount: issued.length,
    upcoming: [...events.values()].sort((a, b) => Date.parse(a.startsAt!) - Date.parse(b.startsAt!)),
    eventsThisMonth: [...events.values()].filter(b => month.format(new Date(b.startsAt!)) === month.format(now)).length,
    spentCentavos,
    bookingCount: real.length,
    demoQuantity,
    demoCentavos,
    displayedTicketCount: issued.length + demoQuantity,
    displayedSpentCentavos: spentCentavos + demoCentavos,
    displayedBookingCount: real.length + demos.length,
    displayedUpcoming: [...displayedEvents.values()].sort((a, b) => Date.parse(a.startsAt!) - Date.parse(b.startsAt!)),
    displayedEventsThisMonth: [...displayedEvents.values()].filter(b => month.format(new Date(b.startsAt!)) === month.format(now)).length,
  };
}
