// Shared helpers for every service file.

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Builds "a=1&b=2", skipping empty values.
export function toQueryString(params: Record<string, string | number | null | undefined>) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") q.set(key, String(value));
  }
  return q.toString();
}
