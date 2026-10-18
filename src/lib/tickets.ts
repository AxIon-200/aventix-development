// Data layer for the My Tickets page (issue #11).
// The backend route is GET /attendee/tickets. Its getTickets() currently returns [],
// so sample data is used until NEXT_PUBLIC_API_URL is set and the endpoint returns real tickets.

export type TicketStatus = "VALID" | "USED" | "CANCELLED" | "EXPIRED";
export type RefundStatus = "NONE" | "PENDING" | "FAILED" | "COMPLETED";
export type TicketTab = "upcoming" | "past" | "cancelled";

export interface MyTicket {
  ticketId: string;
  eventId: string;
  eventName: string;
  eventDate: string; // ISO date-time, e.g. "2026-10-24T20:00:00+08:00"
  venue: string;
  ticketType: string;
  seatLabel?: string;
  status: TicketStatus;
  eventCancelled?: boolean;
  refundStatus?: RefundStatus;
}

// A ticket plus the status that should actually be shown to the attendee.
export interface DisplayTicket extends MyTicket {
  displayStatus: TicketStatus;
}

export type TicketGroups = Record<TicketTab, DisplayTicket[]>;

export const TICKET_TABS: { key: TicketTab; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
];

export function isTicketTab(value: string | undefined): value is TicketTab {
  return value === "upcoming" || value === "past" || value === "cancelled";
}

// Assumption to confirm with the team: a VALID ticket whose event date has passed is shown as EXPIRED.
function resolveStatus(ticket: MyTicket, now: Date): TicketStatus {
  // A cancelled event makes the ticket invalid immediately, even while the refund is pending or failed.
  if (ticket.eventCancelled || ticket.status === "CANCELLED") return "CANCELLED";
  if (ticket.status === "VALID" && new Date(ticket.eventDate).getTime() < now.getTime()) return "EXPIRED";
  return ticket.status;
}

function tabFor(status: TicketStatus): TicketTab {
  if (status === "CANCELLED") return "cancelled";
  if (status === "USED" || status === "EXPIRED") return "past";
  return "upcoming";
}

export function groupTickets(tickets: MyTicket[], now: Date = new Date()): TicketGroups {
  const groups: TicketGroups = { upcoming: [], past: [], cancelled: [] };

  for (const ticket of tickets) {
    const displayStatus = resolveStatus(ticket, now);
    groups[tabFor(displayStatus)].push({ ...ticket, displayStatus });
  }

  const byDate = (a: DisplayTicket, b: DisplayTicket) =>
    new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();

  groups.upcoming.sort(byDate); // soonest first
  groups.past.sort((a, b) => byDate(b, a)); // most recent first
  groups.cancelled.sort((a, b) => byDate(b, a));
  return groups;
}

export function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(iso));
}

const sampleTickets: MyTicket[] = [
  {
    ticketId: "TKT-8291",
    eventId: "e-001",
    eventName: "Neon Eclipse Rave",
    eventDate: "2026-10-24T20:00:00+08:00",
    venue: "Warehouse District",
    ticketType: "VIP Lounge",
    seatLabel: "Section A - Table 4",
    status: "VALID",
  },
  {
    ticketId: "TKT-3194",
    eventId: "e-002",
    eventName: "Sunset Jazz Festival",
    eventDate: "2026-11-02T17:00:00+08:00",
    venue: "Riverside Park",
    ticketType: "General Admission",
    seatLabel: "Open Lawn",
    status: "VALID",
  },
  {
    ticketId: "TKT-9871",
    eventId: "e-003",
    eventName: "Retro Arcade Night",
    eventDate: "2026-08-15T19:00:00+08:00",
    venue: "Downtown Hall",
    ticketType: "Standard",
    seatLabel: "Row C - Seat 12",
    status: "USED",
  },
  {
    ticketId: "TKT-5522",
    eventId: "e-004",
    eventName: "Indie Rock Night",
    eventDate: "2026-09-10T20:00:00+08:00",
    venue: "Riverside Park",
    ticketType: "General Admission",
    seatLabel: "Open Lawn",
    status: "EXPIRED",
  },
  {
    ticketId: "TKT-7710",
    eventId: "e-005",
    eventName: "Metro Indie Acoustic Night",
    eventDate: "2026-11-14T19:00:00+08:00",
    venue: "Downtown Hall",
    ticketType: "Standard",
    seatLabel: "Row A - Seat 3",
    status: "VALID",
    eventCancelled: true,
    refundStatus: "PENDING",
  },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Adjust this when Moyamoy finalizes the response shape.
function normalizeTicket(raw: MyTicket): MyTicket {
  return {
    ...raw,
    status: String(raw.status).toUpperCase() as TicketStatus,
    refundStatus: raw.refundStatus ? (String(raw.refundStatus).toUpperCase() as RefundStatus) : undefined,
  };
}

export async function getMyTickets(): Promise<MyTicket[]> {
  if (!API_URL) return sampleTickets;

  // TODO: send the signed-in attendee's auth token. The backend's requireRole() needs req.user.
  const res = await fetch(`${API_URL}/attendee/tickets`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Tickets request failed (${res.status})`);

  const body = await res.json();
  const list: MyTicket[] = Array.isArray(body) ? body : (body?.data ?? []);
  return list.map(normalizeTicket);
}
