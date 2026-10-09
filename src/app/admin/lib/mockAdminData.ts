import {
  DashboardStats,
  SalesDataPoint,
  BookingStatusBreakdown,
  RecentEventRow,
  RecentUserRow,
  RecentBookingRow,
} from "@/app/admin/types/admin";

export const mockDashboardStats: DashboardStats = {
  totalUsers: 7,
  totalUsersChange: { value: "+8.2%", direction: "up", label: "vs previous period" },
  totalOrganizers: 5,
  totalOrganizersChange: { value: "+5.1%", direction: "up", label: "vs previous period" },
  totalEvents: 6,
  totalEventsChange: { value: "+12.4%", direction: "up", label: "vs previous period" },
  upcomingEvents: 4,
  upcomingEventsChange: { value: "next 30 days", direction: "neutral", label: "vs previous period" },
  confirmedBookings: 3,
  confirmedBookingsChange: { value: "+11.8%", direction: "up", label: "vs previous period" },
  ticketsSold: 10880,
  ticketsSoldChange: { value: "+18.6%", direction: "up", label: "vs previous period" },
  recordedRevenue: 11900,
  recordedRevenueChange: { value: "+14.7%", direction: "up", label: "vs previous period" },
  recentActivityCount: 6,
  recentActivityChange: { value: "last 24 hours", direction: "neutral", label: "vs previous period" },
};

export const mockSalesAnalytics: SalesDataPoint[] = [
  { label: "Aug 17", ticketsSold: 1800, revenueIndex: 900 },
  { label: "Aug 24", ticketsSold: 2400, revenueIndex: 1200 },
  { label: "Aug 31", ticketsSold: 3100, revenueIndex: 1500 },
  { label: "Sep 07", ticketsSold: 2900, revenueIndex: 1400 },
  { label: "Sep 14", ticketsSold: 3400, revenueIndex: 1700 },
];

export const mockBookingStatus: BookingStatusBreakdown = {
  confirmed: 58,
  completed: 19,
  pending: 13,
  cancelled: 10,
};

export const mockRecentEvents: RecentEventRow[] = [
  { id: "evt-1", title: "Summer Sound Fest", date: "2026-12-05", status: "upcoming" },
  { id: "evt-2", title: "Indie Night Live", date: "2026-11-14", status: "upcoming" },
];

export const mockRecentUsers: RecentUserRow[] = [
  { id: "usr-1", name: "Maria Santos", email: "maria@example.com", joinedAt: "2026-10-01" },
  { id: "usr-2", name: "John Dela Cruz", email: "john@example.com", joinedAt: "2026-09-28" },
];

export const mockRecentBookings: RecentBookingRow[] = [
  { id: "bkg-1", eventTitle: "Summer Sound Fest", userName: "Maria Santos", status: "confirmed", createdAt: "2026-10-02" },
  { id: "bkg-2", eventTitle: "Indie Night Live", userName: "John Dela Cruz", status: "pending", createdAt: "2026-10-01" },
];
