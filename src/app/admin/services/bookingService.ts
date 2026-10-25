import type { AdminBooking, AdminBookingDetails, BookingFilters, BookingStats, EventOption, PaymentDecision } from "@/app/admin/types/bookings";
import type { ListParams, PaginatedResult } from "@/app/admin/types/common";

const BASE = "/api/v1/admin/bookings";
type Query = Pick<ListParams<BookingFilters>, "search" | "filters">;
async function responseFor(path: string, init?: RequestInit) {
  let response: Response;
  try { response = await fetch(BASE + path, { credentials: "include", cache: "no-store", ...init }); }
  catch { throw new Error(init ? "The payment update could not be confirmed. Refresh before retrying." : "Could not connect to booking management."); }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? "The booking request failed.");
  }
  return response;
}
function queryFor({ search, filters }: Query) {
  const query = new URLSearchParams();
  if (search.trim()) query.set("search", search.trim());
  if (filters.status !== "all") query.set("status", filters.status);
  if (filters.event !== "all") query.set("event", filters.event);
  return query;
}
export async function getBookings(params: ListParams<BookingFilters>): Promise<PaginatedResult<AdminBooking>> {
  const query = queryFor(params);
  query.set("page", String(params.page)); query.set("pageSize", String(params.pageSize));
  return (await responseFor("?" + query)).json();
}
export async function getBookingStats(query: Query): Promise<BookingStats> {
  return (await responseFor("/stats?" + queryFor(query))).json();
}
export async function getBookingEventOptions(): Promise<EventOption[]> {
  return (await responseFor("/event-options")).json();
}
export async function getBookingById(id: string): Promise<AdminBookingDetails> {
  return (await responseFor("/" + encodeURIComponent(id))).json();
}
export async function updatePaymentStatus(id: string, paymentStatus: PaymentDecision, note?: string): Promise<AdminBooking> {
  return (await responseFor("/" + encodeURIComponent(id) + "/payment", {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentStatus, note }),
  })).json();
}
export async function exportBookings(query: Query): Promise<Blob> {
  return (await responseFor("/export?" + queryFor(query))).blob();
}
