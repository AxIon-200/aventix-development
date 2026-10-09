import {
  DashboardStats,
  SalesDataPoint,
  BookingStatusBreakdown,
  RecentEventRow,
  RecentUserRow,
  RecentBookingRow,
} from "@/app/admin/types/admin";
import {
  mockDashboardStats,
  mockSalesAnalytics,
  mockBookingStatus,
  mockRecentEvents,
  mockRecentUsers,
  mockRecentBookings,
} from "@/app/admin/lib/mockAdminData";

// Flip to false once the backend has admin endpoints. Nothing in the
// components that call these functions needs to change.
const USE_MOCK = true;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export async function getDashboardStats(): Promise<DashboardStats> {
  if (USE_MOCK) {
    await delay(300);
    return mockDashboardStats;
  }
  const res = await fetch(`${API_BASE}/admin/dashboard/stats`);
  if (!res.ok) throw new Error("Failed to fetch dashboard stats");
  return res.json();
}

export async function getSalesAnalytics(
  range: "7d" | "30d" | "90d" = "30d"
): Promise<SalesDataPoint[]> {
  if (USE_MOCK) {
    await delay(350);
    return mockSalesAnalytics;
  }
  const res = await fetch(`${API_BASE}/admin/dashboard/sales?range=${range}`);
  if (!res.ok) throw new Error("Failed to fetch sales analytics");
  return res.json();
}

export async function getBookingStatusBreakdown(): Promise<BookingStatusBreakdown> {
  if (USE_MOCK) {
    await delay(300);
    return mockBookingStatus;
  }
  const res = await fetch(`${API_BASE}/admin/dashboard/booking-status`);
  if (!res.ok) throw new Error("Failed to fetch booking status");
  return res.json();
}

export async function getRecentEvents(): Promise<RecentEventRow[]> {
  if (USE_MOCK) {
    await delay(300);
    return mockRecentEvents;
  }
  const res = await fetch(`${API_BASE}/admin/dashboard/recent-events`);
  if (!res.ok) throw new Error("Failed to fetch recent events");
  return res.json();
}

export async function getRecentUsers(): Promise<RecentUserRow[]> {
  if (USE_MOCK) {
    await delay(300);
    return mockRecentUsers;
  }
  const res = await fetch(`${API_BASE}/admin/dashboard/recent-users`);
  if (!res.ok) throw new Error("Failed to fetch recent users");
  return res.json();
}

export async function getRecentBookings(): Promise<RecentBookingRow[]> {
  if (USE_MOCK) {
    await delay(300);
    return mockRecentBookings;
  }
  const res = await fetch(`${API_BASE}/admin/dashboard/recent-bookings`);
  if (!res.ok) throw new Error("Failed to fetch recent bookings");
  return res.json();
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
