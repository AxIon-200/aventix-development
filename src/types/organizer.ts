export type EventPublishStatus = "DRAFT" | "PUBLISHED" | "SOLD_OUT" | "COMPLETED" | "CANCELLED";
export interface OrganizerEventSummary {
  id: string; title: string; category: string; startsAt: string | null; venue: string; status: EventPublishStatus;
  ticketsSold: number; totalCapacity: number | null; capacityPercent: number | null; grossRevenue: number; publicView: boolean;
}
export interface OrganizerEventDraft {
  id: string; title: string; category: string | null; startsAt: string | null; venueText: string; description: string;
  status: EventPublishStatus; updatedAt: string;
  posterUrl: string | null;
  tiers: OrganizerTicketTier[];
}
export interface OrganizerTicketTier {
  id: string; name: string; description: string; price: number; maxCapacity: number | null;
  admissionMode: "GENERAL_ADMISSION" | "ASSIGNED_SEATING"; status: "ACTIVE" | "DISABLED";
}
export interface OrganizerDashboard {
  organizationName: string; activeEvents: OrganizerEventSummary[];
  metrics: { activeEvents: number; venues: number; newEventsChange: number; ticketsSold: number; grossRevenue: number;
    capacityPercent: number | null; checkInRate: number; ticketsChange: number | null; grossChange: number | null; hasTestPayments: boolean };
  recentTicketSales: { id: string; buyerName: string; eventTitle: string; tier: string; amount: number; purchasedAt: string | null; testMode: boolean }[];
}
export interface OrganizerProfile {
  id: string; organizationName: string; contactEmail: string; bio: string; approvalStatus: "APPROVED" | "PENDING" | "REJECTED" | "SUSPENDED";
  bankName: string; accountNumberMasked: string | null;
}
export interface OrganizerAnalytics {
  from: string; to: string; netRevenue: null; grossRevenue: number; grossChange: number | null; averageOrderValue: number;
  ticketsPerOrder: number; uniqueAttendees: number; firstTimeBuyerPercent: number; hasTestPayments: boolean;
  tiers: { id: string; eventTitle: string; name: string; sold: number; capacity: number | null; revenue: number; percent: number | null }[];
}
export interface OrganizerCheckIn { id: string; name: string; tier: string; scannedAt: string; result: "VALID" }
export interface OrganizerScan { result: "VALID" | "ALREADY_USED" | "CANCELLED" | "EXPIRED" | "INVALID"; entry?: OrganizerCheckIn }
