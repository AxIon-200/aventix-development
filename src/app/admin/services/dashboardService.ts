import type { DashboardStats, SalesDataPoint, BookingStatusBreakdown, RecentEventRow, RecentUserRow, RecentBookingRow } from "@/app/admin/types/admin";

const BASE = "/api/v1/admin/dashboard";
async function responseFor(path: string) {
  let response: Response;
  try { response = await fetch(BASE + path, { credentials: "include", cache: "no-store" }); }
  catch { throw new Error("Could not connect to the dashboard."); }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Could not load dashboard data.");
  }
  return response;
}
export async function getDashboardStats(): Promise<DashboardStats> { return (await responseFor("/stats")).json(); }
export async function getSalesAnalytics(range: "7d" | "30d" | "90d" = "30d"): Promise<SalesDataPoint[]> {
  return (await responseFor("/sales?range=" + range)).json();
}
export async function getBookingStatusBreakdown(): Promise<BookingStatusBreakdown> { return (await responseFor("/booking-status")).json(); }
export async function getRecentEvents(): Promise<RecentEventRow[]> { return (await responseFor("/recent-events")).json(); }
export async function getRecentUsers(): Promise<RecentUserRow[]> { return (await responseFor("/recent-users")).json(); }
export async function getRecentBookings(): Promise<RecentBookingRow[]> { return (await responseFor("/recent-bookings")).json(); }
export async function exportDashboard(): Promise<Blob> { return (await responseFor("/export")).blob(); }
