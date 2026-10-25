import { isEventPayload } from "@/lib/event-payload";
import { BookingClientError } from "./client";
import type { BookingRecord, EventSeat, TicketOptions } from "./types";

const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const money = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
const count = (v: unknown): v is number => money(v) && Number.isSafeInteger(v);
const date = (v: unknown) => text(v) && Number.isFinite(Date.parse(v));
const fail = () => {
  throw new BookingClientError("CONTRACT_MISMATCH");
};

export function requireOptions(value: unknown, eventId: string): TicketOptions {
  if (
    !record(value) ||
    !isEventPayload(value.event) ||
    value.event.id !== eventId ||
    !count(value.purchaseLimit) ||
    value.purchaseLimit < 1 ||
    !count(value.confirmedQuantity) ||
    !count(value.heldQuantity)
  )
    return fail();
  if (
    value.categoryLimits !== undefined &&
    (!record(value.categoryLimits) ||
      !Object.values(value.categoryLimits).every(count))
  )
    return fail();
  if (value.seatPlanUrl !== undefined && typeof value.seatPlanUrl !== "string")
    return fail();
  return value as unknown as TicketOptions;
}
export function requireSeats(
  value: unknown,
  options: TicketOptions,
): EventSeat[] {
  if (!Array.isArray(value)) return fail();
  const ids = new Set<string>();
  const labels = new Set<string>();
  for (const s of value) {
    if (
      !record(s) ||
      !text(s.id) ||
      s.eventId !== options.event.id ||
      !options.event.categories.some((c) => c.id === s.ticketCategoryId) ||
      !text(s.seatNumber) ||
      !text(s.displayLabel) ||
      !["AVAILABLE", "HELD", "SOLD", "DISABLED"].includes(String(s.status)) ||
      (s.row !== undefined && typeof s.row !== "string") ||
      (s.section !== undefined && typeof s.section !== "string") ||
      ids.has(s.id) ||
      labels.has(s.displayLabel)
    )
      return fail();
    ids.add(s.id);
    labels.add(s.displayLabel);
  }
  return value;
}
export function requireBooking(
  value: unknown,
  bookingId?: string,
): BookingRecord {
  if (
    !record(value) ||
    !text(value.id) ||
    (bookingId && value.id !== bookingId) ||
    !text(value.reference) ||
    !record(value.event) ||
    !text(value.event.id) ||
    !text(value.event.name) ||
    !date(value.event.startsAt) ||
    !record(value.event.venue) ||
    !text(value.event.venue.name) ||
    !text(value.event.venue.address) ||
    !record(value.attendee) ||
    !text(value.attendee.name) ||
    !text(value.attendee.email)
  )
    return fail();
  if (
    !["PUBLISHED", "CANCELLED", "COMPLETED"].includes(
      String(value.event.status),
    )
  )
    return fail();
  if (
    ![
      "PENDING_PAYMENT",
      "CONFIRMED",
      "CANCELLED",
      "EXPIRED",
      "REFUNDED",
    ].includes(String(value.status)) ||
    !["PENDING", "PAID", "FAILED", "REFUNDED"].includes(
      String(value.paymentStatus),
    ) ||
    !date(value.expiresAt) ||
    !date(value.serverNow) ||
    value.currency !== "PHP" ||
    typeof value.canPay !== "boolean" ||
    typeof value.canCancel !== "boolean" ||
    !money(value.subtotal) ||
    !money(value.total) ||
    !Array.isArray(value.fees) ||
    !value.fees.every((f) => record(f) && text(f.name) && money(f.amount))
  )
    return fail();
  if (
    value.refundStatus !== undefined &&
    !["NOT_APPLICABLE", "PENDING", "PROCESSING", "FAILED", "REFUNDED"].includes(
      String(value.refundStatus),
    )
  )
    return fail();
  if (!Array.isArray(value.items) || !value.items.length) return fail();
  const categories = new Set<string>();
  const seats = new Set<string>();
  for (const item of value.items) {
    if (
      !record(item) ||
      !text(item.ticketCategoryId) ||
      !text(item.name) ||
      !count(item.quantity) ||
      item.quantity < 1 ||
      !money(item.unitPrice) ||
      !Array.isArray(item.seats) ||
      (item.admissionMode !== undefined && !["ASSIGNED_SEATING", "GENERAL_ADMISSION"].includes(String(item.admissionMode))) ||
      item.seats.length !== (item.admissionMode === "GENERAL_ADMISSION" ? 0 : item.quantity) ||
      categories.has(item.ticketCategoryId)
    )
      return fail();
    categories.add(item.ticketCategoryId);
    for (const seat of item.seats) {
      if (
        !record(seat) ||
        !text(seat.id) ||
        !text(seat.displayLabel) ||
        seats.has(seat.id)
      )
        return fail();
      seats.add(seat.id);
    }
  }
  if (
    Math.abs(
      value.total -
        (value.subtotal + value.fees.reduce((sum, f) => sum + f.amount, 0)),
    ) > 0.011
  )
    return fail();
  if (
    (value.attendee.phoneNumber !== undefined &&
      typeof value.attendee.phoneNumber !== "string") ||
    (value.paymentMethod !== undefined &&
      typeof value.paymentMethod !== "string") ||
    (value.myTicketsHref !== undefined &&
      typeof value.myTicketsHref !== "string") ||
    (value.seatPlanUrl !== undefined && typeof value.seatPlanUrl !== "string")
  )
    return fail();
  if (
    value.issuedTickets !== undefined &&
    (!Array.isArray(value.issuedTickets) ||
      !value.issuedTickets.every(
        (t) => record(t) && text(t.id) && text(t.seatLabel) && text(t.href),
      ))
  )
    return fail();
  return value as unknown as BookingRecord;
}
