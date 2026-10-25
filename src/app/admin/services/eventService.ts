import type { AdminEvent, AdminEventDetails, EventFilters, EventStats, EventStatus } from "@/app/admin/types/events";
import type { ListParams, PaginatedResult } from "@/app/admin/types/common";
const BASE = "/api/v1/admin/events";
async function responseFor(path: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try { response = await fetch(BASE + path, { credentials: "include", cache: "no-store", ...init }); }
  catch { throw new Error(init ? "The event update could not be confirmed. Refresh before retrying." : "Could not connect to event management."); }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? "The event request failed.");
  }
  return response;
}
async function dataFor<T>(path: string, init?: RequestInit): Promise<T> {
  const result = await (await responseFor(path, init)).json();
  if (result.data === undefined) throw new Error("The server returned an invalid response.");
  return result.data as T;
}
function queryFor({ search, filters }: Pick<ListParams<EventFilters>, "search" | "filters">) {
  const query = new URLSearchParams();
  if (search.trim()) query.set("search", search.trim());
  if (filters.status !== "all") query.set("status", filters.status);
  if (filters.category !== "all") query.set("category", filters.category);
  return query;
}
export async function getEvents(params: ListParams<EventFilters>): Promise<PaginatedResult<AdminEvent>> {
  const query = queryFor(params);
  query.set("page", String(params.page)); query.set("pageSize", String(params.pageSize));
  return (await responseFor("?" + query)).json();
}
export const getEventStats = () => dataFor<EventStats>("/stats");
export const getEventById = (id: string) => dataFor<AdminEventDetails>("/" + encodeURIComponent(id));
export function updateEventStatus(id: string, status: EventStatus, expectedUpdatedAt: string, reason?: string) {
  return dataFor<AdminEvent>("/" + encodeURIComponent(id) + "/status", { method: "PATCH",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, expectedUpdatedAt, reason }) });
}
export async function exportEvents(params: Pick<ListParams<EventFilters>, "search" | "filters">): Promise<Blob> {
  return (await responseFor("/export?" + queryFor(params))).blob();
}
