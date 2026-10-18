import {
  AdminBooking,
  AdminBookingDetails,
  BookingFilters,
  BookingStats,
  EventOption,
  PaymentDecision,
} from "@/app/admin/types/bookings";
import { ListParams, PaginatedResult } from "@/app/admin/types/common";
import {
  DEMO,
  MOCK_EVENT_VENUES,
  mockBookings,
  mockPaymentNotes,
} from "@/app/admin/lib/mock/mockBookings";
import { getPaymentTransitions } from "@/app/admin/lib/bookingRules";
import { API_BASE, delay, toQueryString } from "@/app/admin/services/api";

// Flip to false once the backend endpoints exist. Nothing in the hooks,
// components, or page needs to change.
const USE_MOCK = true;

type Query = Pick<ListParams<BookingFilters>, "search" | "filters">;

// GET /admin/bookings?page=1&pageSize=10&search=mia&status=pending&event=evt-401
export async function getBookings(
  params: ListParams<BookingFilters>
): Promise<PaginatedResult<AdminBooking>> {
  const { page, pageSize, search, filters } = params;

  if (USE_MOCK) {
    await delay(450);
    failIfDemo("Failed to load bookings");
    const rows = filterMock(search, filters);
    const start = (page - 1) * pageSize;
    return { data: rows.slice(start, start + pageSize), total: rows.length, page, pageSize };
  }

  const res = await fetch(`${API_BASE}/admin/bookings?${toQuery({ search, filters }, { page, pageSize })}`);
  if (!res.ok) throw new Error("Failed to load bookings");
  return res.json();
}

// GET /admin/bookings/stats?search=&status=&event=
// Computed for the CURRENT search + filters (the design labels these cards
// "Current list" / "Recorded in current view").
export async function getBookingStats(query: Query): Promise<BookingStats> {
  if (USE_MOCK) {
    await delay(350);
    failIfDemo("Failed to load booking statistics");
    const rows = filterMock(query.search, query.filters);
    return {
      total: rows.length,
      confirmed: rows.filter((b) => b.status === "confirmed").length,
      pending: rows.filter((b) => b.status === "pending").length,
      totalValue: rows.filter((b) => b.status !== "cancelled").reduce((sum, b) => sum + b.amount, 0),
    };
  }

  const res = await fetch(`${API_BASE}/admin/bookings/stats?${toQuery(query)}`);
  if (!res.ok) throw new Error("Failed to load booking statistics");
  return res.json();
}

// GET /admin/bookings/event-options   -> [{ value: "evt-401", label: "Neon Nights" }, ...]
export async function getBookingEventOptions(): Promise<EventOption[]> {
  if (USE_MOCK) {
    await delay(250);
    failIfDemo("Failed to load events");
    const byId = new Map(mockBookings.map((b) => [b.eventId, b.eventTitle]));
    return [...byId.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  const res = await fetch(`${API_BASE}/admin/bookings/event-options`);
  if (!res.ok) throw new Error("Failed to load events");
  return res.json();
}

// GET /admin/bookings/:id
export async function getBookingById(id: string): Promise<AdminBookingDetails> {
  if (USE_MOCK) {
    await delay(350);
    failIfDemo("Failed to load booking details");
    const b = mockBookings.find((x) => x.id === id);
    if (!b) throw new Error("Booking not found");
    const n = Number(b.bookingCode.replace(/\D/g, "")) || 0;
    const DAY = 86_400_000;
    const created = new Date(b.createdAt).getTime();
    const wasPaid = b.paymentStatus === "paid" || b.paymentStatus === "refunded";
    return {
      ...b,
      customerPhone: `+63 917 ${String(100 + (n % 900)).padStart(3, "0")} ${String(1000 + ((n * 7) % 9000))}`,
      eventStartsAt: new Date(Date.now() + ((n % 30) - 6) * DAY).toISOString(),
      eventVenue: MOCK_EVENT_VENUES[b.eventId] ?? "—",
      paymentMethod: wasPaid ? ["GCash", "Card", "Maya"][n % 3] : null,
      paidAt: wasPaid ? new Date(created + 3_600_000).toISOString() : null,
      refundedAt: b.paymentStatus === "refunded" ? new Date(created + 2 * DAY).toISOString() : null,
      paymentNote: mockPaymentNotes.get(id) ?? null,
      items: [{ tier: "General Admission", quantity: b.tickets, unitPrice: b.amount / b.tickets }],
    };
  }

  const res = await fetch(`${API_BASE}/admin/bookings/${id}`);
  if (!res.ok) throw new Error("Failed to load booking details");
  return res.json();
}

// PATCH /admin/bookings/:id/payment   body: { paymentStatus: "paid" | "refunded", note?: string }
// Backend side effects: "paid" confirms a pending booking; "refunded" cancels the booking.
export async function updatePaymentStatus(
  id: string,
  paymentStatus: PaymentDecision,
  note?: string
): Promise<AdminBooking> {
  if (USE_MOCK) {
    await delay(500);
    failIfDemo("Failed to update payment");
    const b = mockBookings.find((x) => x.id === id);
    if (!b) throw new Error("Booking not found");
    if (!getPaymentTransitions(b).includes(paymentStatus)) {
      throw new Error("This payment can't be changed.");
    }
    b.paymentStatus = paymentStatus;
    if (paymentStatus === "paid" && b.status === "pending") b.status = "confirmed";
    if (paymentStatus === "refunded") b.status = "cancelled";
    if (note) mockPaymentNotes.set(id, note);
    return { ...b };
  }

  const res = await fetch(`${API_BASE}/admin/bookings/${id}/payment`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentStatus, note }),
  });
  if (!res.ok) throw new Error("Failed to update payment");
  return res.json();
}

// GET /admin/bookings/export?search=&status=&event=   -> CSV file (Blob)
// Exports ALL rows matching the current filters, not just the visible page.
export async function exportBookings(query: Query): Promise<Blob> {
  if (USE_MOCK) {
    await delay(600);
    failIfDemo("Failed to export bookings");
    const rows = filterMock(query.search, query.filters);
    const header = ["Booking ID", "Event", "Customer", "Email", "Tickets", "Amount", "Status", "Payment", "Booked on"];
    const lines = rows.map((b) =>
      [b.bookingCode, b.eventTitle, b.customerName, b.customerEmail, String(b.tickets), String(b.amount), b.status, b.paymentStatus, b.createdAt.slice(0, 10)]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    );
    return new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  }

  const res = await fetch(`${API_BASE}/admin/bookings/export?${toQuery(query)}`);
  if (!res.ok) throw new Error("Failed to export bookings");
  return res.blob();
}

// ───────────── helpers ─────────────
function toQuery(query: Query, extra: Record<string, number> = {}) {
  return toQueryString({
    ...extra,
    search: query.search,
    status: query.filters.status === "all" ? undefined : query.filters.status,
    event: query.filters.event === "all" ? undefined : query.filters.event,
  });
}

function filterMock(search: string, filters: BookingFilters) {
  const q = search.trim().toLowerCase();
  return mockBookings
    .filter((b) => (filters.status === "all" ? true : b.status === filters.status))
    .filter((b) => (filters.event === "all" ? true : b.eventId === filters.event))
    .filter((b) =>
      q
        ? [b.bookingCode, b.customerName, b.customerEmail, b.eventTitle].some((v) => v.toLowerCase().includes(q))
        : true
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function failIfDemo(message: string) {
  if (DEMO.failRequests) throw new Error(message);
}
