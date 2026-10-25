import type { ActivityLog, ActivityLogDetails, ActivityLogFilters, ActivityLogStats } from "@/app/admin/types/activity-logs";
import type { ListParams, PaginatedResult } from "@/app/admin/types/common";

const BASE = "/api/v1/admin/activity-logs";
type Query = Pick<ListParams<ActivityLogFilters>, "search" | "filters">;
async function responseFor(path: string) {
  let response: Response;
  try { response = await fetch(BASE + path, { credentials: "include", cache: "no-store" }); }
  catch { throw new Error("Could not connect to activity logs."); }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? "The activity log request failed.");
  }
  return response;
}
function queryFor({ search, filters }: Query) {
  const query = new URLSearchParams();
  if (search.trim()) query.set("search", search.trim());
  if (filters.category !== "all") query.set("category", filters.category);
  if (filters.result !== "all") query.set("result", filters.result);
  // Preserve inclusive calendar days in the browser's local timezone.
  if (filters.from) query.set("from", new Date(`${filters.from}T00:00:00`).toISOString());
  if (filters.to) query.set("to", new Date(`${filters.to}T23:59:59.999`).toISOString());
  return query;
}
export async function getActivityLogs(params: ListParams<ActivityLogFilters>): Promise<PaginatedResult<ActivityLog>> {
  const query = queryFor(params);
  query.set("page", String(params.page)); query.set("pageSize", String(params.pageSize));
  return (await responseFor("?" + query)).json();
}
export async function getActivityLogStats(query: Query): Promise<ActivityLogStats> {
  return (await responseFor("/stats?" + queryFor(query))).json();
}
export async function getActivityLogById(id: string): Promise<ActivityLogDetails> {
  return (await responseFor("/" + encodeURIComponent(id))).json();
}
export async function exportActivityLogs(query: Query): Promise<Blob> {
  return (await responseFor("/export?" + queryFor(query))).blob();
}
