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
export function organizerErrorMessage(error: unknown) {
  const code = error instanceof OrganizerClientError ? error.code : "UNAVAILABLE";
  if (code === "STALE_EVENT") return "This event changed elsewhere. Reload it before saving again.";
  if (code === "NOT_FOUND") return "This event is unavailable.";
  if (code === "VALIDATION_ERROR") return "Check the fields and try again.";
  if (code === "INCOMPLETE_EVENT") return "A public event needs a date and venue.";
  if (code === "PAYOUT_STORAGE_UNAVAILABLE") return "Bank details cannot be saved until payout storage is configured.";
  if (code === "REQUEST_UNCERTAIN") return "The save could not be confirmed. Reload to check its result before retrying.";
  return "The organizer request could not be completed. Please retry.";
}
export const organizerMoney = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
export const organizerDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not scheduled";
export const organizerChange = (value: number | null) => value === null ? "No prior sales for comparison" : `${value > 0 ? "+" : ""}${value}% vs previous period`;
export function manilaInput(value: string | null) { return value ? new Date(new Date(value).getTime() + 8 * 3600000).toISOString().slice(0, 16) : ""; }
export function manilaTimestamp(value: string) { return value ? new Date(`${value}:00+08:00`).toISOString() : null; }
