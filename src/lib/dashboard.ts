// Data layer for the attendee dashboard (issue #10).
// Shapes here are what the page needs. Agree on the final API response with Moyamoy.

export type TicketStatus = "confirmed" | "pending" | "cancelled";

export interface DashboardStat {
  label: string;
  value: string;
  badge: string;
  footnote: string;
}

export interface UpcomingEvent {
  ticketId: string;
  eventId: string;
  name: string;
  organizerEmail?: string;
  imageUrl?: string;
  ticketTier: string;
  date: string; // already formatted, e.g. "Oct 24"
  venue: string;
  status: TicketStatus;
}

export interface AttendeeDashboard {
  attendeeName: string;
  eventsThisMonth: number;
  stats: DashboardStat[];
  upcomingEvents: UpcomingEvent[];
}

// Sample data copied from the Figma frame. Used until the backend endpoint is ready.
const sampleDashboard: AttendeeDashboard = {
  attendeeName: "Sherwin",
  eventsThisMonth: 2,
  stats: [
    { label: "My Tickets", value: "5 Active", badge: "2 upcoming", footnote: "Across 3 different events" },
    { label: "Upcoming Events", value: "2 Events", badge: "This month", footnote: "Next: Neon Eclipse Rave" },
    { label: "Total Spent", value: "₱18,500", badge: "Lifetime", footnote: "Across 12 orders" },
    { label: "Reward Points", value: "1,240 pts", badge: "Silver Tier", footnote: "760 pts to Gold" },
  ],
  upcomingEvents: [
    {
      ticketId: "t-001",
      eventId: "e-001",
      name: "Neon Eclipse Rave",
      organizerEmail: "neon@aventix.io",
      ticketTier: "VIP Lounge",
      date: "Oct 24",
      venue: "Warehouse District",
      status: "confirmed",
    },
    {
      ticketId: "t-002",
      eventId: "e-002",
      name: "Sunset Jazz Festival",
      organizerEmail: "jazz@aventix.io",
      ticketTier: "General Admission",
      date: "Nov 02",
      venue: "Riverside Park",
      status: "pending",
    },
  ],
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getAttendeeDashboard(): Promise<AttendeeDashboard> {
  if (API_URL) {
    try {
      // TODO: confirm the endpoint path with Moyamoy and send the signed-in attendee's auth (cookie or token).
      const res = await fetch(`${API_URL}/attendee/dashboard`, { cache: "no-store" });
      if (res.ok) return (await res.json()) as AttendeeDashboard;
    } catch {
      // fall through to the sample data
    }
  }
  return sampleDashboard;
}
