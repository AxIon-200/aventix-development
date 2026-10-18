/**
 * Types for Organizer Domain
 */

export type EventPublishStatus = "DRAFT" | "PENDING_APPROVAL" | "PUBLISHED" | "COMPLETED" | "CANCELLED";

export interface OrganizerDashboardStat {
  label: string;
  value: string;
  change?: string;
  footnote?: string;
}

export interface OrganizerEventSummary {
  id: string;
  title: string;
  category: string;
  startDate: string;
  venue: string;
  status: EventPublishStatus;
  ticketsSold: number;
  totalCapacity: number;
  grossRevenue: number;
}

export interface OrganizerDashboard {
  organizerName: string;
  organizationName: string;
  stats: OrganizerDashboardStat[];
  activeEvents: OrganizerEventSummary[];
  recentTicketSales: {
    id: string;
    buyerName: string;
    eventTitle: string;
    tier: string;
    amount: number;
    purchasedAt: string;
  }[];
}

export interface OrganizerProfile {
  id: string;
  organizationName: string;
  contactEmail: string;
  phoneNumber?: string;
  bio?: string;
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";
  payoutAccount?: {
    bankName: string;
    accountNumberMasked: string;
    status: "ACTIVE" | "PENDING";
  };
}
