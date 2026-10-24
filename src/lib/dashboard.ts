export type TicketStatus = "confirmed" | "pending" | "cancelled" | "demo";

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
