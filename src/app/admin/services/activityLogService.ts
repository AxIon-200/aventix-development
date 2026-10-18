import {
  ActivityLog,
  ActivityLogDetails,
  ActivityLogFilters,
  ActivityLogStats,
} from "@/app/admin/types/activity-logs";
import { ListParams, PaginatedResult } from "@/app/admin/types/common";
import { DEMO, mockActivityLogs, mockLogExtras } from "@/app/admin/lib/mock/mockActivityLogs";
import { API_BASE, delay, toQueryString } from "@/app/admin/services/api";

// Flip to false once the backend endpoints exist. Nothing in the hooks,
// components, or page needs to change.
const USE_MOCK = true;

type Query = Pick<ListParams<ActivityLogFilters>, "search" | "filters">;

// GET /admin/activity-logs?page=1&pageSize=10&search=refund&category=payment&result=failed&from=2026-09-01&to=2026-09-30
export async function getActivityLogs(
  params: ListParams<ActivityLogFilters>
): Promise<PaginatedResult<ActivityLog>> {
  const { page, pageSize, search, filters } = params;

  if (USE_MOCK) {
    await delay(450);
    failIfDemo("Failed to load activity logs");
    const rows = filterMock(search, filters);
    const start = (page - 1) * pageSize;
    return { data: rows.slice(start, start + pageSize), total: rows.length, page, pageSize };
  }

  const res = await fetch(
    `${API_BASE}/admin/activity-logs?${toQuery({ search, filters }, { page, pageSize })}`
  );
  if (!res.ok) throw new Error("Failed to load activity logs");
  return res.json();
}

// GET /admin/activity-logs/stats?search=&category=&result=&from=&to=
// Computed for the CURRENT search + filters.
export async function getActivityLogStats(query: Query): Promise<ActivityLogStats> {
  if (USE_MOCK) {
    await delay(350);
    failIfDemo("Failed to load activity statistics");
    const rows = filterMock(query.search, query.filters);
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return {
      total: rows.length,
      last24Hours: rows.filter((l) => new Date(l.occurredAt).getTime() >= dayAgo).length,
      adminActions: rows.filter((l) => l.actorRole === "admin").length,
      failed: rows.filter((l) => l.result === "failed").length,
    };
  }

  const res = await fetch(`${API_BASE}/admin/activity-logs/stats?${toQuery(query)}`);
  if (!res.ok) throw new Error("Failed to load activity statistics");
  return res.json();
}

// GET /admin/activity-logs/:id
export async function getActivityLogById(id: string): Promise<ActivityLogDetails> {
  if (USE_MOCK) {
    await delay(350);
    failIfDemo("Failed to load log details");
    const log = mockActivityLogs.find((l) => l.id === id);
    const extras = mockLogExtras.get(id);
    if (!log || !extras) throw new Error("Log entry not found");
    return { ...log, ...extras };
  }

  const res = await fetch(`${API_BASE}/admin/activity-logs/${id}`);
  if (!res.ok) throw new Error("Failed to load log details");
  return res.json();
}

// GET /admin/activity-logs/export?search=&category=&result=&from=&to=   -> CSV file (Blob)
// Exports ALL rows matching the current filters, not just the visible page.
export async function exportActivityLogs(query: Query): Promise<Blob> {
  if (USE_MOCK) {
    await delay(600);
    failIfDemo("Failed to export activity logs");
    const rows = filterMock(query.search, query.filters);
    const header = ["Log ID", "Timestamp", "Actor", "Role", "Action", "Target", "Category", "Result"];
    const lines = rows.map((l) =>
      [l.logCode, l.occurredAt, l.actorName, l.actorRole, l.action, l.targetLabel, l.category, l.result]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    );
    return new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  }

  const res = await fetch(`${API_BASE}/admin/activity-logs/export?${toQuery(query)}`);
  if (!res.ok) throw new Error("Failed to export activity logs");
  return res.blob();
}

// ───────────── helpers ─────────────
function toQuery(query: Query, extra: Record<string, number> = {}) {
  const { category, result, from, to } = query.filters;
  return toQueryString({
    ...extra,
    search: query.search,
    category: category === "all" ? undefined : category,
    result: result === "all" ? undefined : result,
    from,
    to,
  });
}

function filterMock(search: string, filters: ActivityLogFilters) {
  const q = search.trim().toLowerCase();
  // "from"/"to" are whole days, inclusive, in the browser's local time.
  const fromMs = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : null;
  const toMs = filters.to ? new Date(`${filters.to}T23:59:59.999`).getTime() : null;

  return mockActivityLogs
    .filter((l) => (filters.category === "all" ? true : l.category === filters.category))
    .filter((l) => (filters.result === "all" ? true : l.result === filters.result))
    .filter((l) => {
      const t = new Date(l.occurredAt).getTime();
      return (fromMs === null || t >= fromMs) && (toMs === null || t <= toMs);
    })
    .filter((l) =>
      q
        ? [l.logCode, l.actorName, l.action, l.targetLabel].some((v) => v.toLowerCase().includes(q))
        : true
    )
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

function failIfDemo(message: string) {
  if (DEMO.failRequests) throw new Error(message);
}
