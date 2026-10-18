import { isCategoryBookable } from "@/lib/event-booking";
import type {
  BookingDraft,
  BookingRecord,
  DraftItem,
  EventSeat,
  TicketOptions,
} from "./types";
import { BookingClientError } from "./client";

export function remainingAllowance(options: TicketOptions): number {
  return Math.max(
    0,
    options.purchaseLimit - options.confirmedQuantity - options.heldQuantity,
  );
}
export function validateDraft(
  draft: BookingDraft,
  options: TicketOptions,
  seats?: EventSeat[],
): string[] {
  const errors: string[] = [];
  if (draft.eventId !== options.event.id)
    return ["Ticket selection belongs to another event."];
  if (!draft.items.length) return ["Select at least one ticket."];
  const categories = new Set<string>();
  const selectedSeats = new Set<string>();
  let total = 0;
  for (const item of draft.items) {
    const category = options.event.categories.find(
      (c) => c.id === item.ticketCategoryId,
    );
    if (!category || categories.has(item.ticketCategoryId)) {
      errors.push("Each configured category may appear only once.");
      continue;
    }
    categories.add(item.ticketCategoryId);
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      errors.push(`Choose a valid quantity for ${category.name}.`);
      continue;
    }
    total += item.quantity;
    if (!isCategoryBookable(options.event, category))
      errors.push(`${category.name} is not currently on sale.`);
    if (category.remaining !== undefined && item.quantity > category.remaining)
      errors.push(`${category.name} has insufficient availability.`);
    if (
      options.categoryLimits?.[category.id] !== undefined &&
      item.quantity > options.categoryLimits[category.id]
    )
      errors.push(`${category.name} exceeds its purchase limit.`);
    if (seats) {
      if (item.seatIds.length !== item.quantity)
        errors.push(
          `Choose exactly ${item.quantity} numbered seats for ${category.name}.`,
        );
      for (const seatId of item.seatIds) {
        const seat = seats.find((s) => s.id === seatId);
        if (
          !seat ||
          seat.eventId !== draft.eventId ||
          seat.ticketCategoryId !== category.id ||
          seat.status !== "AVAILABLE"
        )
          errors.push(
            "A selected seat is unavailable or belongs to another event/category.",
          );
        if (selectedSeats.has(seatId))
          errors.push("A numbered seat cannot be selected more than once.");
        selectedSeats.add(seatId);
      }
    }
  }
  if (total > remainingAllowance(options))
    errors.push(
      "Your selected quantity exceeds the event-wide allowance after confirmed tickets and active holds.",
    );
  return Array.from(new Set(errors));
}

export function draftEstimate(
  draft: BookingDraft,
  options: TicketOptions,
): number {
  return draft.items.reduce(
    (sum, item) =>
      sum +
      (options.event.categories.find((c) => c.id === item.ticketCategoryId)
        ?.price ?? 0) *
        item.quantity,
    0,
  );
}
export function setQuantity(
  draft: BookingDraft,
  categoryId: string,
  quantity: number,
): BookingDraft {
  const items = draft.items.filter(
    (item) => item.ticketCategoryId !== categoryId,
  );
  const old = draft.items.find((item) => item.ticketCategoryId === categoryId);
  if (quantity > 0)
    items.push({
      ticketCategoryId: categoryId,
      quantity,
      seatIds: old?.quantity === quantity ? old.seatIds : [],
    });
  return { ...draft, items, operationKey: undefined };
}
export function toggleSeat(draft: BookingDraft, seat: EventSeat): BookingDraft {
  if (seat.eventId !== draft.eventId || seat.status !== "AVAILABLE")
    return draft;
  const item = draft.items.find(
    (item) => item.ticketCategoryId === seat.ticketCategoryId,
  );
  if (!item) return draft;
  const chosen = item.seatIds.includes(seat.id);
  if (
    !chosen &&
    (item.seatIds.length >= item.quantity ||
      draft.items.some((i) => i.seatIds.includes(seat.id)))
  )
    return draft;
  return {
    ...draft,
    operationKey: undefined,
    items: draft.items.map((i) =>
      i !== item
        ? i
        : {
            ...i,
            seatIds: chosen
              ? i.seatIds.filter((id) => id !== seat.id)
              : [...i.seatIds, seat.id],
          },
    ),
  };
}
export function refreshDraft(
  draft: BookingDraft,
  seats: EventSeat[],
): BookingDraft {
  return {
    ...draft,
    operationKey: undefined,
    items: draft.items.map((i) => ({
      ...i,
      seatIds: i.seatIds.filter((id) =>
        seats.some(
          (s) =>
            s.id === id &&
            s.eventId === draft.eventId &&
            s.ticketCategoryId === i.ticketCategoryId &&
            s.status === "AVAILABLE",
        ),
      ),
    })),
  };
}
export function isConfirmed(booking: BookingRecord): boolean {
  return (
    booking.event.status !== "CANCELLED" &&
    booking.status === "CONFIRMED" &&
    booking.paymentStatus === "PAID"
  );
}
export function secondsRemaining(
  booking: Pick<BookingRecord, "expiresAt" | "serverNow">,
  elapsedMilliseconds: number,
): number {
  return Math.max(
    0,
    Math.ceil(
      (Date.parse(booking.expiresAt) -
        Date.parse(booking.serverNow) -
        elapsedMilliseconds) /
        1000,
    ),
  );
}
export function canPay(booking: BookingRecord, remaining: number): boolean {
  return (
    booking.event.status === "PUBLISHED" &&
    booking.status === "PENDING_PAYMENT" &&
    booking.paymentStatus !== "PAID" &&
    booking.paymentStatus !== "REFUNDED" &&
    booking.canPay &&
    remaining > 0
  );
}
export function canCancel(booking: BookingRecord, remaining: number): boolean {
  return (
    booking.status === "PENDING_PAYMENT" &&
    booking.paymentStatus !== "PAID" &&
    booking.canCancel &&
    remaining > 0
  );
}
export function reconcileBooking(
  previous: BookingRecord | undefined,
  next: BookingRecord,
): BookingRecord {
  if (
    previous &&
    (previous.id !== next.id ||
      previous.event.id !== next.event.id ||
      Date.parse(previous.expiresAt) !== Date.parse(next.expiresAt))
  )
    throw new BookingClientError("CONTRACT_MISMATCH");
  if (previous && Date.parse(next.serverNow) < Date.parse(previous.serverNow))
    throw new BookingClientError("CONTRACT_MISMATCH");
  if (
    previous &&
    previous.status !== "PENDING_PAYMENT" &&
    next.status === "PENDING_PAYMENT"
  )
    throw new BookingClientError("CONTRACT_MISMATCH");
  if (
    previous &&
    ["CANCELLED", "EXPIRED", "REFUNDED"].includes(previous.status) &&
    next.status === "CONFIRMED"
  )
    throw new BookingClientError("CONTRACT_MISMATCH");
  if (previous?.status === "REFUNDED" && next.status !== "REFUNDED")
    throw new BookingClientError("CONTRACT_MISMATCH");
  // A failed later attempt is never proof that a paid booking became unpaid.
  if (
    previous &&
    ["PAID", "REFUNDED"].includes(previous.paymentStatus) &&
    !["PAID", "REFUNDED"].includes(next.paymentStatus)
  )
    throw new BookingClientError("CONTRACT_MISMATCH");
  return next;
}
export function safeLocalHref(value?: string): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return;
  try {
    const decoded = decodeURIComponent(value);
    if (
      /[\\\x00-\x1f]/.test(decoded) ||
      decoded.includes("..") ||
      decoded.includes("//")
    )
      return;
    const url = new URL(value, "https://aventix.invalid");
    if (url.origin === "https://aventix.invalid")
      return url.pathname + url.search + url.hash;
  } catch {
    return;
  }
}
export function trustedPaymentUrl(
  value: string | undefined,
  origins: string[] = [],
): string | undefined {
  try {
    const url = new URL(value ?? "");
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      origins.includes(url.origin)
    )
      return url.href;
  } catch {
    return;
  }
}
export function assertMatchesDraft(
  booking: BookingRecord,
  draft: BookingDraft,
): void {
  const expected = new Map(draft.items.map((i) => [i.ticketCategoryId, i]));
  if (
    booking.event.id !== draft.eventId ||
    booking.items.length !== expected.size
  )
    throw new BookingClientError("CONTRACT_MISMATCH");
  for (const item of booking.items) {
    const requested = expected.get(item.ticketCategoryId);
    if (
      !requested ||
      requested.quantity !== item.quantity ||
      requested.seatIds.length !== item.seats.length ||
      item.seats.some((s) => !requested.seatIds.includes(s.id))
    )
      throw new BookingClientError("CONTRACT_MISMATCH");
    expected.delete(item.ticketCategoryId);
  }
  if (expected.size) throw new BookingClientError("CONTRACT_MISMATCH");
}

export function parseDraft(
  value: unknown,
  eventId: string,
): BookingDraft | undefined {
  if (!value || typeof value !== "object") return;
  const d = value as Partial<BookingDraft>;
  if (
    d.version !== 1 ||
    d.eventId !== eventId ||
    !Array.isArray(d.items) ||
    d.items.length > 100
  )
    return;
  const items: DraftItem[] = [];
  for (const item of d.items) {
    if (
      !item ||
      typeof item.ticketCategoryId !== "string" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      !Array.isArray(item.seatIds) ||
      !item.seatIds.every((id) => typeof id === "string") ||
      item.seatIds.length > item.quantity
    )
      return;
    items.push({
      ticketCategoryId: item.ticketCategoryId,
      quantity: item.quantity,
      seatIds: [...item.seatIds],
    });
  }
  return {
    version: 1,
    eventId,
    items,
    ...(typeof d.operationKey === "string"
      ? { operationKey: d.operationKey }
      : {}),
  };
}
