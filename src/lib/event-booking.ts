import type { CategoryAvailability, EventDetails, TicketCategory } from "@/types/event";
import { formatShortDate } from "./format";

export interface BookingState {
  canBook: boolean;
  /** Short badge text shown near the hero. */
  label: string;
  /** Sentence explaining why booking is (not) possible. */
  message?: string;
}

export function isCategoryBookable(event: EventDetails, c: TicketCategory): boolean {
  return event.status === "PUBLISHED" && c.status === "ACTIVE" && c.availability === "AVAILABLE" && (c.remaining === undefined || c.remaining > 0);
}

export function categoryStateLabel(event: EventDetails, c: TicketCategory): string {
  if (event.status === "CANCELLED") return "Cancelled";
  if (event.status === "COMPLETED") return "Event ended";
  if (event.status !== "PUBLISHED") return "Unavailable";
  if (c.remaining === 0 && c.availability === "AVAILABLE") return "Sold out";
  if (c.status === "DISABLED") return "Unavailable";
  const map: Record<CategoryAvailability, string> = {
    AVAILABLE: "Buy Tickets",
    SOLD_OUT: "Sold out",
    NOT_YET_OPEN: "Not on sale yet",
    SALE_ENDED: "Sale ended",
  };
  return map[c.availability];
}

export function getBookingState(event: EventDetails): BookingState {
  if (event.status === "CANCELLED") {
    return { canBook: false, label: "Cancelled", message: "This event has been cancelled. Tickets can no longer be booked." };
  }
  if (event.status === "COMPLETED") {
    return { canBook: false, label: "Completed", message: "This event has already taken place." };
  }
  if (event.status !== "PUBLISHED") return { canBook: false, label: "Unavailable", message: "This event is not available for booking." };
  const active = event.categories.filter((c) => c.status === "ACTIVE");
  if (active.length === 0) {
    return { canBook: false, label: "Unavailable", message: "No ticket categories are open for this event." };
  }
  if (active.some((c) => isCategoryBookable(event, c))) {
    return { canBook: true, label: "On sale" };
  }
  if (active.every((c) => c.availability === "SOLD_OUT")) {
    return { canBook: false, label: "Sold out", message: "All tickets for this event are sold out." };
  }
  if (active.every((c) => c.availability === "SALE_ENDED")) {
    return { canBook: false, label: "Sale ended", message: "Ticket sales for this event have ended." };
  }
  if (active.every((c) => c.availability === "NOT_YET_OPEN")) {
    const start = event.salesStartAt ?? active.map((c) => c.salesStartAt).filter(Boolean).sort()[0];
    return {
      canBook: false,
      label: "Not on sale yet",
      message: start ? `Ticket sales open on ${formatShortDate(start)}.` : "Ticket sales have not opened yet.",
    };
  }
  return { canBook: false, label: "Unavailable", message: "No tickets are currently available for booking." };
}

/** Booking-flow entry. The event identity travels in the URL (and the chosen category in the query). */
export function bookingHref(eventId: string, categoryId?: string): string {
  const base = `/events/${encodeURIComponent(eventId)}/tickets`;
  return categoryId ? `${base}?category=${encodeURIComponent(categoryId)}` : base;
}
