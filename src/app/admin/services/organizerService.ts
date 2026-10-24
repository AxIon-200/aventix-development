import type { Organizer, OrganizerDecision, OrganizerDetails, OrganizerFilters, OrganizerStats, DecisionResult, OrganizerDecisionRecord } from "@/app/admin/types/organizers";
import type { ListParams, PaginatedResult } from "@/app/admin/types/common";

const BASE = "/api/v1/admin/organizers";

export class OrganizerRequestError extends Error {
  constructor(message: string, readonly code: string) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { credentials: "include", cache: "no-store", ...init });
  } catch {
    throw new OrganizerRequestError(init ? "The decision outcome is uncertain. Refresh the application before deciding again." : "Could not load organizer applications.", "REQUEST_UNCERTAIN");
  }
  let result: { data?: T; error?: { code?: string; message?: string } };
  try { result = await response.json(); }
  catch { throw new OrganizerRequestError(init ? "The decision outcome is uncertain. Refresh the application before deciding again." : "Could not load organizer applications.", "REQUEST_UNCERTAIN"); }
  if (!response.ok) {
    const code = result.error?.code ?? "REQUEST_FAILED";
    const message = code === "STALE_DECISION" ? "This application changed. Refresh its details before deciding again."
      : code === "EMAIL_VERIFICATION_REQUIRED" ? "The applicant must verify their email before a decision."
      : code === "INVALID_TRANSITION" ? "This decision is no longer available. Refresh its details."
      : result.error?.message ?? "The organizer request failed.";
    throw new OrganizerRequestError(message, code);
  }
  if (result.data === undefined) throw new OrganizerRequestError("The server returned an invalid response.", "INVALID_RESPONSE");
  return result.data;
}

export async function getOrganizers({ page, pageSize, search, filters }: ListParams<OrganizerFilters>): Promise<PaginatedResult<Organizer>> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search.trim()) query.set("search", search.trim());
  if (filters.status !== "all") query.set("status", filters.status);
  let response: Response;
  try { response = await fetch(`${BASE}?${query}`, { credentials: "include", cache: "no-store" }); }
  catch { throw new OrganizerRequestError("Could not load organizer applications.", "UNAVAILABLE"); }
  if (!response.ok) throw new OrganizerRequestError("Could not load organizer applications.", "REQUEST_FAILED");
  return response.json();
}

export const getOrganizerStats = (search = "") => request<OrganizerStats>(
  `/stats${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`,
);
export const getOrganizerById = (id: string) => request<OrganizerDetails>(`/${encodeURIComponent(id)}`);

export function updateOrganizerStatus(id: string, status: OrganizerDecision, version: number, reason?: string) {
  return request<DecisionResult>(`/${encodeURIComponent(id)}/status`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, version, ...(reason ? { reason } : {}) }),
  });
}

export function retryOrganizerEmail(id: string, decisionId: string) {
  return request<{ decisionId: string; emailStatus: OrganizerDecisionRecord["emailStatus"] }>(
    `/${encodeURIComponent(id)}/decisions/${encodeURIComponent(decisionId)}/retry-email`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
  );
}

export async function exportOrganizers({ search, filters }: Pick<ListParams<OrganizerFilters>, "search" | "filters">): Promise<Blob> {
  const query = new URLSearchParams();
  if (search.trim()) query.set("search", search.trim());
  if (filters.status !== "all") query.set("status", filters.status);
  const response = await fetch(`${BASE}/export?${query}`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new OrganizerRequestError("Could not export organizers.", "REQUEST_FAILED");
  return response.blob();
}
