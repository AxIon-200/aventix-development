import type { BookingDraft } from "./types";
import { parseDraft } from "./rules";

const key = (eventId: string) => `aventix:booking-draft:v1:${eventId}`;
/** Selection only: never persist customer details, payment data, sessions or prices. */
export function readDraft(eventId: string): BookingDraft {
  try {
    return (
      parseDraft(
        JSON.parse(sessionStorage.getItem(key(eventId)) ?? "null"),
        eventId,
      ) ?? { version: 1, eventId, items: [] }
    );
  } catch {
    return { version: 1, eventId, items: [] };
  }
}
export function saveDraft(draft: BookingDraft): boolean {
  try {
    sessionStorage.setItem(key(draft.eventId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}
export function clearDraft(eventId: string): void {
  try {
    sessionStorage.removeItem(key(eventId));
  } catch {
    /* Storage may be disabled. */
  }
}
