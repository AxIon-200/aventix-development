/**
 * Types for Attendee / User Domain
 */

export type TicketStatus = "confirmed" | "pending" | "cancelled" | "checked-in";

export interface AttendeeDashboardStat {
  label: string;
  value: string;
  badge: string;
  footnote: string;
}

export interface AttendeeUpcomingEvent {
  ticketId: string;
  eventId: string;
  name: string;
  organizerEmail?: string;
  imageUrl?: string;
  ticketTier: string;
  date: string;
  venue: string;
  status: TicketStatus;
}

export interface AttendeeDashboard {
  attendeeName: string;
  eventsThisMonth: number;
  stats: AttendeeDashboardStat[];
  upcomingEvents: AttendeeUpcomingEvent[];
}

export interface AttendeeTicket {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  seatNumber?: string;
  ticketTier: string;
  qrCodeUrl: string;
  status: TicketStatus;
  pricePaid: number;
  purchasedAt: string;
}

export interface AttendeeBookingHistory {
  id: string;
  bookingReference: string;
  eventId: string;
  eventTitle: string;
  totalAmount: number;
  ticketCount: number;
  status: "COMPLETED" | "PENDING" | "CANCELLED" | "REFUNDED";
  bookedAt: string;
  invoiceUrl?: string;
}

export interface AttendeeProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  rewardPoints: number;
  tier: "Standard" | "Silver" | "Gold" | "Platinum";
}
