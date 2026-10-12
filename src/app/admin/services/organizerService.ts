import {
  Organizer,
  OrganizerDecision,
  OrganizerDetails,
  OrganizerFilters,
  OrganizerStats,
} from "@/app/admin/types/organizers";
import { ListParams, PaginatedResult } from "@/app/admin/types/common";
import { DEMO, mockOrganizers, mockRejectionReasons } from "@/app/admin/lib/mock/mockOrganizers";
import { API_BASE, delay, toQueryString } from "@/app/admin/services/api";

// Flip to false once the backend endpoints exist. Nothing in the hooks,
// components, or page needs to change.
const USE_MOCK = true;

// GET /admin/organizers?page=1&pageSize=10&search=sound&status=approved
export async function getOrganizers(
  params: ListParams<OrganizerFilters>
): Promise<PaginatedResult<Organizer>> {
  const { page, pageSize, search, filters } = params;

  if (USE_MOCK) {
    await delay(450);
    failIfDemo("Failed to load organizers");
    const rows = filterMock(search, filters.status);
    const start = (page - 1) * pageSize;
    return { data: rows.slice(start, start + pageSize), total: rows.length, page, pageSize };
  }

  const qs = toQueryString({
    page,
    pageSize,
    search,
    status: filters.status === "all" ? undefined : filters.status,
  });
  const res = await fetch(`${API_BASE}/admin/organizers?${qs}`);
  if (!res.ok) throw new Error("Failed to load organizers");
  return res.json();
}

// GET /admin/organizers/stats
export async function getOrganizerStats(): Promise<OrganizerStats> {
  if (USE_MOCK) {
    await delay(350);
    failIfDemo("Failed to load organizer statistics");
    return {
      total: mockOrganizers.length,
      needsReview: mockOrganizers.filter((o) => o.status === "review").length,
      approved: mockOrganizers.filter((o) => o.status === "approved").length,
      totalEvents: mockOrganizers.reduce((sum, o) => sum + o.eventsCount, 0),
    };
  }

  const res = await fetch(`${API_BASE}/admin/organizers/stats`);
  if (!res.ok) throw new Error("Failed to load organizer statistics");
  return res.json();
}

// GET /admin/organizers/:id
export async function getOrganizerById(id: string): Promise<OrganizerDetails> {
  if (USE_MOCK) {
    await delay(350);
    failIfDemo("Failed to load organizer details");
    const org = mockOrganizers.find((o) => o.id === id);
    if (!org) throw new Error("Organizer not found");
    const n = Number(org.organizerCode.replace(/\D/g, "")) || 0;
    const published = Math.ceil(org.eventsCount * 0.7);
    const DAY = 86_400_000;
    return {
      ...org,
      phone: `+63 917 ${String(100 + (n % 900)).padStart(3, "0")} ${String(1000 + ((n * 7) % 9000))}`,
      appliedAt: new Date(Date.now() - (n % 60) * DAY - 30 * DAY).toISOString(),
      publishedEvents: published,
      draftEvents: org.eventsCount - published,
      ticketsSold: published * 180,
      rejectionReason: mockRejectionReasons.get(id) ?? null,
      recentEvents: Array.from({ length: Math.min(org.eventsCount, 5) }, (_, k) => ({
        id: `${id}-evt-${k + 1}`,
        title: `${org.name} Live Vol. ${k + 1}`,
        date: new Date(Date.now() + (k * 12 - 10) * DAY).toISOString(),
        status: k < published ? ("published" as const) : ("draft" as const),
      })),
    };
  }

  const res = await fetch(`${API_BASE}/admin/organizers/${id}`);
  if (!res.ok) throw new Error("Failed to load organizer details");
  return res.json();
}

// PATCH /admin/organizers/:id/status   body: { status: "approved" | "rejected", reason?: string }
export async function updateOrganizerStatus(
  id: string,
  decision: OrganizerDecision,
  reason?: string
): Promise<Organizer> {
  if (USE_MOCK) {
    await delay(500);
    failIfDemo("Failed to update organizer");
    const org = mockOrganizers.find((o) => o.id === id);
    if (!org) throw new Error("Organizer not found");
    org.status = decision;
    if (decision === "rejected" && reason) mockRejectionReasons.set(id, reason);
    if (decision === "approved") mockRejectionReasons.delete(id);
    return { ...org };
  }

  const res = await fetch(`${API_BASE}/admin/organizers/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: decision, reason }),
  });
  if (!res.ok) throw new Error("Failed to update organizer");
  return res.json();
}

// GET /admin/organizers/export?search=&status=   -> CSV file (Blob)
// Exports ALL rows matching the current filters, not just the visible page.
export async function exportOrganizers(
  params: Pick<ListParams<OrganizerFilters>, "search" | "filters">
): Promise<Blob> {
  const { search, filters } = params;

  if (USE_MOCK) {
    await delay(600);
    failIfDemo("Failed to export organizers");
    const rows = filterMock(search, filters.status);
    const header = ["Organizer ID", "Name", "Email", "Status", "Events"];
    const lines = rows.map((o) =>
      [o.organizerCode, o.name, o.email, o.status, String(o.eventsCount)]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    );
    return new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  }

  const qs = toQueryString({
    search,
    status: filters.status === "all" ? undefined : filters.status,
  });
  const res = await fetch(`${API_BASE}/admin/organizers/export?${qs}`);
  if (!res.ok) throw new Error("Failed to export organizers");
  return res.blob();
}

// ───────────── mock-only helpers ─────────────
function filterMock(search: string, status: OrganizerFilters["status"]) {
  const q = search.trim().toLowerCase();
  return mockOrganizers
    .filter((o) => (status === "all" ? true : o.status === status))
    .filter((o) =>
      q ? [o.name, o.email, o.organizerCode].some((v) => v.toLowerCase().includes(q)) : true
    );
}

function failIfDemo(message: string) {
  if (DEMO.failRequests) throw new Error(message);
}
