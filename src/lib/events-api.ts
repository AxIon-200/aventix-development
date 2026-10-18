import type { EventDetails } from "@/types/event";
import { MOCK_EVENTS } from "./mock-events";

export class EventRequestError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "EventRequestError";
  }
}

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

/**
 * Fetch one event by id. Returns `null` when the API says it does not exist
 * (404), throws EventRequestError for any other failure. While no API URL is
 * configured it serves the temporary mock list instead.
 */
export async function getEventById(id: string): Promise<EventDetails | null> {
  if (!API_URL) {
    return MOCK_EVENTS.find((e) => e.id === id) ?? null;
  }

  let res: Response;
  try {
    // Availability changes with every sale, so never serve a cached copy.
    res = await fetch(`${API_URL.replace(/\/$/, "")}/events/${encodeURIComponent(id)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new EventRequestError("Could not reach the events service.");
  }

  if (res.status === 404) return null;
  if (!res.ok) throw new EventRequestError(`Events service responded with ${res.status}.`, res.status);

  const body = (await res.json()) as EventDetails | { data: EventDetails };
  return "data" in body ? body.data : body;
}

/** Fetch all public events (GET /events). Mock list while no API URL is configured. */
export async function getEvents(): Promise<EventDetails[]> {
  if (!API_URL) return MOCK_EVENTS;

  let res: Response;
  try {
    res = await fetch(`${API_URL.replace(/\/$/, "")}/events`, { cache: "no-store", headers: { Accept: "application/json" } });
  } catch {
    throw new EventRequestError("Could not reach the events service.");
  }
  if (!res.ok) throw new EventRequestError(`Events service responded with ${res.status}.`, res.status);

  const body = (await res.json()) as EventDetails[] | { data: EventDetails[] };
  return Array.isArray(body) ? body : body.data;
}
