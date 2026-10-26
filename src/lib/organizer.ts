import { notifyAccountChange } from "./auth/session-events";

export class OrganizerClientError extends Error {
  constructor(public code: string, public accessRejected = false) { super(code); }
}
export async function organizerRequest<T>(path: string, options: { method?: "POST" | "PATCH"; body?: object; signal?: AbortSignal; csv?: boolean } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/organizer${path}`, { method: options.method ?? "GET", credentials: "include", cache: "no-store", redirect: "error",
      headers: { Accept: options.csv ? "text/csv" : "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}), signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new OrganizerClientError(options.method ? "REQUEST_UNCERTAIN" : "UNAVAILABLE");
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) notifyAccountChange("blocked");
    const body = await response.json().catch(() => null);
    throw new OrganizerClientError(typeof body?.error?.code === "string" ? body.error.code : "UNAVAILABLE", response.status === 401 || response.status === 403);
  }
  if (options.csv) return await response.blob() as T;
  const body = await response.json().catch(() => null);
  if (!body || typeof body !== "object" || !("data" in body)) throw new OrganizerClientError(options.method ? "REQUEST_UNCERTAIN" : "INVALID_RESPONSE");
  return body.data as T;
}
export async function uploadOrganizerPoster<T>(eventId: string, file: File, expectedUpdatedAt: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/organizer/events/${encodeURIComponent(eventId)}/images/poster`, {
      method: "PUT", credentials: "include", cache: "no-store", redirect: "error",
      headers: { Accept: "application/json", "Content-Type": file.type, "X-Event-Updated-At": expectedUpdatedAt },
      body: file, signal: AbortSignal.timeout(60000),
    });
  } catch { throw new OrganizerClientError("REQUEST_UNCERTAIN"); }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) notifyAccountChange("blocked");
    const body = await response.json().catch(() => null);
    throw new OrganizerClientError(typeof body?.error?.code === "string" ? body.error.code : "UNAVAILABLE");
  }
  const body = await response.json().catch(() => null);
  if (!body || typeof body !== "object" || !("data" in body)) throw new OrganizerClientError("REQUEST_UNCERTAIN");
  return body.data as T;
}
export function organizerErrorMessage(error: unknown) {
  const code = error instanceof OrganizerClientError ? error.code : "UNAVAILABLE";
  if (code === "STALE_EVENT") return "This event changed elsewhere. Reload it before saving again.";
  if (code === "NOT_FOUND") return "This event is unavailable.";
  if (code === "VALIDATION_ERROR") return "Check the fields and try again.";
  if (code === "INVALID_IMAGE" || code === "PAYLOAD_TOO_LARGE") return "Choose a JPEG, PNG, or WebP image under 3 MB.";
  if (code === "INCOMPLETE_EVENT") return "Publishing requires a future date, venue, category, and an active ticket tier, plus an active, verified organizer account.";
  if (code === "TIER_EDIT_UNAVAILABLE") return "Ticket tiers can be changed while the event is a draft. Assigned seating tiers need a seat editor.";
  if (code === "TIER_HAS_BOOKINGS") return "This tier has bookings, so its price, capacity, and availability cannot be changed.";
  if (code === "INVALID_TRANSITION") return "This event cannot be published from its current status.";
  if (code === "PAYOUT_STORAGE_UNAVAILABLE") return "Bank details cannot be saved until payout storage is configured.";
  if (code === "REQUEST_UNCERTAIN") return "The save could not be confirmed. Reload to check its result before retrying.";
  return "The organizer request could not be completed. Please retry.";
}
export const organizerMoney = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
export const organizerDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not scheduled";
export const organizerChange = (value: number | null) => value === null ? "No prior sales for comparison" : `${value > 0 ? "+" : ""}${value}% vs previous period`;
export function manilaInput(value: string | null) { return value ? new Date(new Date(value).getTime() + 8 * 3600000).toISOString().slice(0, 16) : ""; }
export function manilaTimestamp(value: string) { return value ? new Date(`${value}:00+08:00`).toISOString() : null; }
