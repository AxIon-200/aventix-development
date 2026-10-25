// Admin dashboard data contracts. Every number on the dashboard comes
// from one of these shapes — build the real backend to return exactly
// this, and nothing on the frontend needs to change.

export type StatChange = {
  value: string; // e.g. "+8.2%" or "next 30 days"
  direction: "up" | "down" | "neutral";
  label: string; // e.g. "vs previous period", "last 24 hours"
};

export type DashboardStats = {
  totalUsers: number;
  totalUsersChange: StatChange;
  totalOrganizers: number;
  totalOrganizersChange: StatChange;
  totalEvents: number;
  totalEventsChange: StatChange;
  upcomingEvents: number;
  upcomingEventsChange: StatChange;
  confirmedBookings: number;
  confirmedBookingsChange: StatChange;
  ticketsSold: number;
  ticketsSoldChange: StatChange;
  recordedRevenue: number;
  recordedRevenueChange: StatChange;
  recentActivityCount: number;
  recentActivityChange: StatChange;
};

export type SalesDataPoint = {
  label: string; // e.g. "Aug 17"
  ticketsSold: number;
  revenue: number;
  date: string;
};

export type BookingStatusBreakdown = {
  confirmed: number; // booking counts
  completed: number;
  pending: number;
  cancelled: number;
  expired: number;
  refunded: number;
  total: number;
};

export type RecentEventRow = {
  id: string;
  title: string;
  date: string | null;
  status: "draft" | "published" | "sold_out" | "completed" | "cancelled";
};

export type RecentUserRow = {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
};

export type RecentBookingRow = {
  id: string;
  eventTitle: string;
  userName: string;
  status: "confirmed" | "completed" | "pending" | "cancelled" | "expired" | "refunded";
  createdAt: string;
};
