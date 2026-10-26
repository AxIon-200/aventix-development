import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import { CheckoutProviderError, paymongoCheckout, safeCheckoutUrl, type CheckoutGateway } from "./paymongo-checkout.js";
import { settleCheckout } from "./settle-checkout.js";

export class BookingError extends Error {
  constructor(public code: string, public status = 409) { super(code); }
}
export const bookingInput = z.object({ version: z.literal(1), eventId: z.uuid(),
  items: z.array(z.object({ ticketCategoryId: z.uuid(), quantity: z.number().int().min(1).max(20),
    seatIds: z.array(z.uuid()).max(20) }).strict()).min(1).max(10), operationKey: z.uuid(),
}).strict();
const include = { event: { include: { venue: true } }, user: true,
  items: { include: { ticketCategory: true, seats: { include: { eventSeat: true } }, tickets: true } },
  payments: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.BookingInclude;
type BookingRow = Prisma.BookingGetPayload<{ include: typeof include }>;
type Tx = Prisma.TransactionClient;
export const centavos = (value: { toString(): string }) => {
  const [whole, fraction = ""] = value.toString().split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
};
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export async function lockBooking(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id}::uuid FOR UPDATE`;
}
async function release(tx: Tx, id: string, status: "CANCELLED" | "EXPIRED", now: Date) {
  await tx.bookingSeat.updateMany({ where: { bookingItem: { bookingId: id }, allocationStatus: "HELD" },
    data: { allocationStatus: "RELEASED", releasedAt: now } });
  await tx.payment.updateMany({ where: { bookingId: id, status: "PENDING" }, data: { status: "FAILED" } });
  await tx.booking.update({ where: { id }, data: { status } });
  await tx.activityLog.create({ data: { action: `BOOKING_${status}`, entityType: "Booking", entityId: id } });
}
export function presentBooking(b: BookingRow, now = new Date()) {
  const payment = b.payments.find(p => p.status === "PAID" || p.status === "REFUNDED") ?? b.payments[0];
  const active = b.status === "PENDING_PAYMENT" && b.expiresAt > now && b.event.status === "PUBLISHED";
  return { id: b.id, reference: b.bookingReference,
    event: { id: b.eventId, name: b.event.name, startsAt: (b.event.startTime ?? b.event.eventDate)?.toISOString(),
      status: b.event.status === "SOLD_OUT" ? "PUBLISHED" : b.event.status,
      venue: { name: b.event.venue?.name?.trim() || "Venue to be announced",
        address: b.event.venue?.address?.trim() || "To be announced" } },
    attendee: { name: b.user.name, email: b.user.email, ...(b.user.phoneNumber ? { phoneNumber: b.user.phoneNumber } : {}) },
    status: b.status, paymentStatus: payment?.status ?? (["CANCELLED", "EXPIRED"].includes(b.status) ? "FAILED" : "PENDING"), paymentMethod: payment?.paymentMethod ?? undefined,
    items: b.items.map(i => ({ ticketCategoryId: i.ticketCategoryId, name: i.ticketCategory.name, quantity: i.quantity,
      admissionMode: i.ticketCategory.admissionMode,
      unitPrice: Number(i.unitPrice), seats: i.seats.map(s => ({ id: s.eventSeatId, displayLabel: s.eventSeat.displayLabel,
        section: s.eventSeat.section ?? undefined, row: s.eventSeat.row ?? undefined })) })),
    subtotal: Number(b.subtotal), total: Number(b.totalAmount), fees: [], currency: "PHP",
    expiresAt: b.expiresAt.toISOString(), serverNow: now.toISOString(), canPay: active, canCancel: active,
    myTicketsHref: "/dashboard/tickets", issuedTickets: b.items.flatMap(i => i.tickets.map(t => ({
      id: t.id, seatLabel: i.seats.find(s => s.id === t.bookingSeatId)?.eventSeat.displayLabel ?? "General admission",
      href: `/tickets/${t.id}` }))),
  };
}
export async function getOwnBooking(id: string, userId: string, gateway: CheckoutGateway = paymongoCheckout) {
  let b = await prisma.booking.findFirst({ where: { id, userId }, include });
  if (!b) throw new BookingError("NOT_FOUND", 404);
  if (b.status === "PENDING_PAYMENT" && b.expiresAt <= new Date()) {
    try {
      await reconcileOverdueBooking(id, userId, gateway);
    } catch {
      // Keep the hold pending when the payment provider cannot verify expiry.
    }
    b = await prisma.booking.findFirstOrThrow({ where: { id, userId }, include });
  }
  return presentBooking(b);
}
export async function createBooking(userId: string, input: z.infer<typeof bookingInput>, now = new Date()) {
  const normalized = { eventId: input.eventId, items: input.items.map(i => ({ ...i, seatIds: [...i.seatIds].sort() }))
    .sort((a, b) => a.ticketCategoryId.localeCompare(b.ticketCategoryId)) };
  const key = hash(`${userId}:${input.operationKey}`), fingerprint = hash(JSON.stringify(normalized));
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('aventix-checkout-key'), hashtext(${key}))::text`;
    const prior = await tx.booking.findUnique({ where: { checkoutKey: key }, include });
    if (prior) { if (prior.checkoutHash !== fingerprint) throw new BookingError("IDEMPOTENCY_CONFLICT"); return presentBooking(prior, now); }
    await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${input.eventId}::uuid FOR UPDATE`;
    const event = await tx.event.findUnique({ where: { id: input.eventId }, include: { ticketCategories: true } });
    if (!event || event.status !== "PUBLISHED" || !(event.startTime ?? event.eventDate) || (event.startTime ?? event.eventDate)! <= now)
      throw new BookingError("INVENTORY_CHANGED");
    // No provider session exists for these overdue holds, so they can be cancelled under the event lock.
    const expired = await tx.booking.findMany({ where: { eventId: event.id, status: "PENDING_PAYMENT", expiresAt: { lte: now },
      payments: { none: { status: "PENDING" } } }, select: { id: true } });
    for (const b of expired) { await lockBooking(tx, b.id); await release(tx, b.id, "CANCELLED", now); }
    const existing = await tx.bookingItem.aggregate({ where: { booking: { userId, eventId: event.id,
      status: { in: ["PENDING_PAYMENT", "CONFIRMED"] } } }, _sum: { quantity: true } });
    const quantity = input.items.reduce((n, i) => n + i.quantity, 0);
    if ((existing._sum.quantity ?? 0) + quantity > event.maxTicketsPerAttendee) throw new BookingError("PURCHASE_LIMIT_EXCEEDED");
    if (new Set(input.items.map(i => i.ticketCategoryId)).size !== input.items.length) throw new BookingError("VALIDATION_ERROR", 400);
    let total = 0;
    for (const item of input.items) {
      const category = event.ticketCategories.find(c => c.id === item.ticketCategoryId);
      if (!category || category.status !== "ACTIVE") throw new BookingError("BOOKING_EVENT_MISMATCH");
      const start = category.saleStartAt ?? event.ticketSaleStart, end = category.saleEndAt ?? event.ticketSaleEnd;
      if ((start && start > now) || (end && end <= now)) throw new BookingError("INVENTORY_CHANGED");
      const reserved = await tx.bookingItem.aggregate({ where: { ticketCategoryId: category.id,
        booking: { status: { in: ["PENDING_PAYMENT", "CONFIRMED"] } } }, _sum: { quantity: true } });
      if (category.maxCapacity !== null && (reserved._sum.quantity ?? 0) + item.quantity > category.maxCapacity) throw new BookingError("INVENTORY_CHANGED");
      if (category.admissionMode === "ASSIGNED_SEATING") {
        if (new Set(item.seatIds).size !== item.quantity || item.seatIds.length !== item.quantity) throw new BookingError("SEAT_SELECTION_INVALID");
        const available = await tx.eventSeat.count({ where: { id: { in: item.seatIds }, eventId: event.id,
          ticketCategoryId: category.id, enabled: true, bookingSeats: { none: { allocationStatus: { in: ["HELD", "CONFIRMED"] }, releasedAt: null } } } });
        if (available !== item.quantity) throw new BookingError("SEAT_UNAVAILABLE");
      } else if (item.seatIds.length) throw new BookingError("SEAT_SELECTION_INVALID");
      const unit = centavos(category.price);
      if (unit < 1) throw new BookingError("INVENTORY_CHANGED");
      total += unit * item.quantity;
    }
    if (!Number.isSafeInteger(total) || total > 999999999999) throw new BookingError("VALIDATION_ERROR", 400);
    const b = await tx.booking.create({ data: { bookingReference: `AVX-${randomUUID()}`, userId, eventId: event.id,
      checkoutKey: key, checkoutHash: fingerprint, subtotal: (total / 100).toFixed(2), totalAmount: (total / 100).toFixed(2),
      expiresAt: new Date(now.getTime() + 15 * 60_000), items: { create: input.items.map(item => {
        const c = event.ticketCategories.find(c => c.id === item.ticketCategoryId)!;
        return { ticketCategoryId: c.id, quantity: item.quantity, unitPrice: c.price,
          subtotal: ((centavos(c.price) * item.quantity) / 100).toFixed(2), seats: { create: item.seatIds.map(eventSeatId => ({ eventSeatId })) } };
      }) } }, include });
    await tx.activityLog.create({ data: { userId, action: "BOOKING_CREATED", entityType: "Booking", entityId: b.id } });
    return presentBooking(b, now);
  }, { timeout: 15000 });
}

export async function startCheckout(id: string, userId: string, method: string, gateway: CheckoutGateway = paymongoCheckout) {
  const attempt = await prisma.$transaction(async tx => {
    await lockBooking(tx, id);
    const b = await tx.booking.findFirst({ where: { id, userId }, include });
    if (!b) throw new BookingError("NOT_FOUND", 404);
    if (b.status !== "PENDING_PAYMENT" || b.expiresAt <= new Date() || b.event.status !== "PUBLISHED") throw new BookingError("BOOKING_EXPIRED");
    if (b.payments.some(p => p.status === "PAID" || p.status === "REFUNDED")) throw new BookingError("BOOKING_EXPIRED");
    const pending = b.payments.find(p => p.status === "PENDING");
    if (pending) {
      if (pending.provider !== "paymongo_test" || !pending.checkoutUrl) throw new BookingError("NETWORK_UNCERTAIN");
      return { url: safeCheckoutUrl(pending.checkoutUrl) };
    }
    const payment = await tx.payment.create({ data: { bookingId: id, provider: "paymongo_test", paymentMethod: method, amount: b.totalAmount } });
    return { booking: b, payment };
  });
  if ("url" in attempt) return { redirectUrl: attempt.url, message: "Resume your existing PayMongo test checkout." };
  try {
    const session = await gateway.create({ reference: attempt.booking.bookingReference, bookingId: id, paymentId: attempt.payment.id, method,
      items: attempt.booking.items.map(i => ({ name: i.ticketCategory.name, amount: centavos(i.unitPrice), quantity: i.quantity })) });
    const url = safeCheckoutUrl(session.attributes.checkout_url);
    await prisma.payment.update({ where: { id: attempt.payment.id }, data: { providerReference: session.id, checkoutUrl: url } });
    return { redirectUrl: url, message: "PayMongo test mode. Your booking is confirmed only after payment verification." };
  } catch (error) {
    if (error instanceof CheckoutProviderError && error.definitive) {
      await prisma.payment.update({ where: { id: attempt.payment.id }, data: { status: "FAILED" } });
      throw new BookingError("PAYMENT_UNAVAILABLE", 503);
    }
    // An uncertain request may have created a payable session: retain the hold and forbid a second one.
    throw new BookingError("NETWORK_UNCERTAIN", 503);
  }
}

export async function closeBooking(id: string, userId: string | undefined, status: "CANCELLED" | "EXPIRED", gateway: CheckoutGateway = paymongoCheckout) {
  const b = await prisma.booking.findFirst({ where: { id, ...(userId ? { userId } : {}) }, include: { payments: true } });
  if (!b) throw new BookingError("NOT_FOUND", 404);
  if (b.status === status) return;
  if (b.status !== "PENDING_PAYMENT") throw new BookingError("BOOKING_NOT_CANCELLABLE");
  const pending = b.payments.filter(p => p.status === "PENDING");
  for (const p of pending) {
    if (!p.providerReference || p.provider !== "paymongo_test" || !(await gateway.expire(p.providerReference))) throw new BookingError("PAYMENT_PROCESSING");
  }
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${b.eventId}::uuid FOR UPDATE`;
    await lockBooking(tx, id);
    const current = await tx.booking.findUniqueOrThrow({ where: { id }, include: { payments: true } });
    if (current.status === status) return;
    if (current.status !== "PENDING_PAYMENT" || current.payments.some(p => p.status === "PAID" || p.status === "REFUNDED")
      || current.payments.filter(p => p.status === "PENDING").some(p => !pending.some(before => before.id === p.id && before.providerReference === p.providerReference)))
      throw new BookingError("PAYMENT_PROCESSING");
    await release(tx, id, status, new Date());
  });
}
export async function reconcileOverdueBooking(id: string, userId: string | undefined, gateway: CheckoutGateway = paymongoCheckout) {
  const b = await prisma.booking.findFirst({ where: { id, ...(userId ? { userId } : {}) },
    include: { payments: true } });
  if (!b) throw new BookingError("NOT_FOUND", 404);
  if (b.status !== "PENDING_PAYMENT" || b.expiresAt > new Date()) return;
  for (const payment of b.payments.filter(p => p.status === "PENDING")) {
    if (payment.provider !== "paymongo_test" || !payment.providerReference) throw new BookingError("PAYMENT_PROCESSING");
    const session = await gateway.inspect(payment.providerReference);
    const paid = session.attributes.payments?.filter(p => p.attributes.status === "paid") ?? [];
    if (paid.length) {
      if (paid.length !== 1) throw new BookingError("PAYMENT_PROCESSING");
      const result = await prisma.$transaction(tx => settleCheckout(tx, {
        eventId: `provider-lookup:${session.id}`, checkoutSessionId: session.id,
        referenceNumber: session.attributes.reference_number ?? null, paymentId: paid[0]!.id,
        amountCentavos: paid[0]!.attributes.amount ?? null,
        currency: paid[0]!.attributes.currency === "PHP" ? "PHP" : null,
        livemode: false, payloadHash: "",
      }, "provider_lookup"), { timeout: 15000 });
      if (result.processingStatus !== "BOOKING_CONFIRMED" && result.processingStatus !== "ALREADY_CONFIRMED")
        throw new BookingError("PAYMENT_PROCESSING");
      return;
    }
  }
  await closeBooking(id, userId, "CANCELLED", gateway);
}
export async function expireBookings(gateway: CheckoutGateway = paymongoCheckout) {
  const cutoff = new Date();
  let after: { id: string; expiresAt: Date } | undefined;
  for (;;) {
    const rows = await prisma.booking.findMany({ where: { status: "PENDING_PAYMENT", expiresAt: { lte: cutoff },
      ...(after ? { OR: [{ expiresAt: { gt: after.expiresAt } }, { expiresAt: after.expiresAt, id: { gt: after.id } }] } : {}) },
      select: { id: true, expiresAt: true }, take: 20, orderBy: [{ expiresAt: "asc" }, { id: "asc" }] });
    for (const b of rows) {
      try { await reconcileOverdueBooking(b.id, undefined, gateway); }
      catch (error) { console.error("Booking reconciliation pending", b.id, error instanceof BookingError ? error.code : "PROVIDER_UNAVAILABLE"); }
    }
    if (rows.length < 20) break;
    after = rows[rows.length - 1]!;
  }
}
export function startBookingExpiryWorker() {
  let running = false;
  const run = async () => { if (running) return; running = true; try { await expireBookings(); } catch { console.error("Booking expiry check failed"); } finally { running = false; } };
  void run();
  const timer = setInterval(() => void run(), 30_000); timer.unref();
  return () => clearInterval(timer);
}
