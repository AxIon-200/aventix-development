import type { ManagedUser, UserDecision, UserDetails, UserFilters, UserStats } from "@/app/admin/types/users";
import type { ListParams, PaginatedResult } from "@/app/admin/types/common";

const BASE = "/api/v1/admin/users";

async function responseFor(path: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { credentials: "include", cache: "no-store", ...init });
  } catch {
    throw new Error(init ? "The account update could not be confirmed. Refresh before retrying." : "Could not connect to attendee management.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? "The attendee request failed.");
  }
  return response;
}

async function requestData<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await responseFor(path, init);
  const result = await response.json();
  if (result.data === undefined) throw new Error("The server returned an invalid response.");
  return result.data as T;
}

function queryFor({ search, filters }: Pick<ListParams<UserFilters>, "search" | "filters">) {
  const query = new URLSearchParams();
  if (search.trim()) query.set("search", search.trim());
  if (filters.status !== "all") query.set("status", filters.status);
  return query;
}

export async function getUsers(params: ListParams<UserFilters>): Promise<PaginatedResult<ManagedUser>> {
  const query = queryFor(params);
  query.set("page", String(params.page));
  query.set("pageSize", String(params.pageSize));
  return (await responseFor(`?${query}`)).json();
}

export const getUserStats = () => requestData<UserStats>("/stats");
export const getUserById = (id: string) => requestData<UserDetails>(`/${encodeURIComponent(id)}`);

export function updateUserStatus(id: string, status: UserDecision): Promise<ManagedUser> {
  return requestData(`/${encodeURIComponent(id)}/status`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
  });
}

export async function exportUsers(params: Pick<ListParams<UserFilters>, "search" | "filters">): Promise<Blob> {
  return (await responseFor(`/export?${queryFor(params)}`)).blob();
}
