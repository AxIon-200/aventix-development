import {
  AdminEvent,
  AdminEventDetails,
  EventFilters,
  EventStats,
  EventStatus,
} from "@/app/admin/types/events";
import { ListParams, PaginatedResult } from "@/app/admin/types/common";
import { DEMO, mockCancellationReasons, mockEvents } from "@/app/admin/lib/mock/mockEvents";
import { API_BASE, delay, toQueryString } from "@/app/admin/services/api";

// Flip to false once the backend endpoints exist. Nothing in the hooks,
// components, or page needs to change.
const USE_MOCK = true;

// GET /admin/events?page=1&pageSize=10&search=neon&status=published&category=concert
export async function getEvents(
  params: ListParams<EventFilters>
): Promise<PaginatedResult<AdminEvent>> {
  const { page, pageSize, search, filters } = params;

  if (USE_MOCK) {
    await delay(450);
    failIfDemo("Failed to load events");
    const rows = filterMock(search, filters);
    const start = (page - 1) * pageSize;
    return { data: rows.slice(start, start + pageSize), total: rows.length, page, pageSize };
  }

  const res = await fetch(`${API_BASE}/admin/events?${toQuery(search, filters, { page, pageSize })}`);
  if (!res.ok) throw new Error("Failed to load events");
  return res.json();
}

// GET /admin/events/stats
export async function getEventStats(): Promise<EventStats> {
  if (USE_MOCK) {
    await delay(350);
    failIfDemo("Failed to load event statistics");
    return {
      total: mockEvents.length,
      published: mockEvents.filter((e) => e.status === "published").length,
      draft: mockEvents.filter((e) => e.status === "draft").length,
      cancelled: mockEvents.filter((e) => e.status === "cancelled").length,
    };
  }

  const res = await fetch(`${API_BASE}/admin/events/stats`);
  if (!res.ok) throw new Error("Failed to load event statistics");
  return res.json();
}

// GET /admin/events/:id
export async function getEventById(id: string): Promise<AdminEventDetails> {
  if (USE_MOCK) {
    await delay(350);
    failIfDemo("Failed to load event details");
    const event = mockEvents.find((e) => e.id === id);
    if (!event) throw new Error("Event not found");
    const n = Number(event.eventCode.replace(/\D/g, "")) || 0;
    const capacity = 500 + (n % 4) * 250;
    const gaCapacity = Math.floor(capacity * 0.8);
    const gaSold = Math.min(gaCapacity, Math.floor(event.attendees * 0.75));
    const vipSold = event.attendees - gaSold;
    return {
      ...event,
      description: `${event.title} brings ${event.category} fans together at ${event.venue}.`,
      capacity,
      revenue: gaSold * 1200 + vipSold * 3500,
      tiers: [
        { id: `${id}-ga`, name: "General Admission", price: 1200, sold: gaSold, capacity: gaCapacity },
        { id: `${id}-vip`, name: "VIP", price: 3500, sold: vipSold, capacity: capacity - gaCapacity },
      ],
      cancellationReason: mockCancellationReasons.get(id) ?? null,
    };
  }

  const res = await fetch(`${API_BASE}/admin/events/${id}`);
  if (!res.ok) throw new Error("Failed to load event details");
  return res.json();
}

// PATCH /admin/events/:id/status   body: { status: "published" | "draft" | "cancelled", reason?: string }
// The backend should reject invalid transitions (e.g. cancelled -> published).
export async function updateEventStatus(
  id: string,
  status: EventStatus,
  reason?: string
): Promise<AdminEvent> {
  if (USE_MOCK) {
    await delay(500);
    failIfDemo("Failed to update event availability");
    const event = mockEvents.find((e) => e.id === id);
    if (!event) throw new Error("Event not found");
    event.status = status;
    if (status === "cancelled" && reason) mockCancellationReasons.set(id, reason);
    if (status !== "cancelled") mockCancellationReasons.delete(id);
    return { ...event };
  }

  const res = await fetch(`${API_BASE}/admin/events/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reason }),
  });
  if (!res.ok) throw new Error("Failed to update event availability");
  return res.json();
}

// GET /admin/events/export?search=&status=&category=   -> CSV file (Blob)
// Exports ALL rows matching the current filters, not just the visible page.
export async function exportEvents(
  params: Pick<ListParams<EventFilters>, "search" | "filters">
): Promise<Blob> {
  const { search, filters } = params;

  if (USE_MOCK) {
    await delay(600);
    failIfDemo("Failed to export events");
    const rows = filterMock(search, filters);
    const header = ["Event ID", "Title", "Organizer", "Date", "Venue", "Category", "Status", "Attendees"];
    const lines = rows.map((e) =>
      [e.eventCode, e.title, e.organizerName, e.startsAt.slice(0, 10), e.venue, e.category, e.status, String(e.attendees)]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    );
    return new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  }

  const res = await fetch(`${API_BASE}/admin/events/export?${toQuery(search, filters)}`);
  if (!res.ok) throw new Error("Failed to export events");
  return res.blob();
}

// ───────────── helpers ─────────────
function toQuery(
  search: string,
  filters: EventFilters,
  extra: Record<string, number> = {}
) {
  return toQueryString({
    ...extra,
    search,
    status: filters.status === "all" ? undefined : filters.status,
    category: filters.category === "all" ? undefined : filters.category,
  });
}

function filterMock(search: string, filters: EventFilters) {
  const q = search.trim().toLowerCase();
  return mockEvents
    .filter((e) => (filters.status === "all" ? true : e.status === filters.status))
    .filter((e) => (filters.category === "all" ? true : e.category === filters.category))
    .filter((e) =>
      q
        ? [e.title, e.organizerName, e.eventCode, e.venue].some((v) => v.toLowerCase().includes(q))
        : true
    )
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

function failIfDemo(message: string) {
  if (DEMO.failRequests) throw new Error(message);
}
