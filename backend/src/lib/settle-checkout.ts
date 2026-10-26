import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "../generated/prisma/client.js";
import type { PayMongoReceipt } from "./paymongo-webhook.js";
import { centavos, lockBooking } from "./checkout-bookings.js";

export async function settleCheckout(tx: Prisma.TransactionClient, receipt: PayMongoReceipt, source: "webhook" | "provider_lookup" = "webhook") {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('aventix-payment-id'), hashtext(${receipt.paymentId}))::text`;
  const payment = await tx.payment.findUnique({ where: { provider_providerReference: { provider: "paymongo_test", providerReference: receipt.checkoutSessionId } },
    select: { id: true, bookingId: true } });
  if (!payment) {
    // The webhook can beat the create-session response being saved. Ask PayMongo to retry.
    if (receipt.referenceNumber && await tx.booking.findFirst({ where: { bookingReference: receipt.referenceNumber,
      status: "PENDING_PAYMENT", payments: { some: { provider: "paymongo_test", status: "PENDING", providerReference: null } } }, select: { id: true } }))
      throw new Error("Checkout session registration is pending");
    return { processingStatus: "UNMATCHED_TEST_EVENT" };
  }
  const identity = await tx.booking.findUniqueOrThrow({ where: { id: payment.bookingId }, select: { eventId: true } });
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${identity.eventId}::uuid FOR UPDATE`;
  await lockBooking(tx, payment.bookingId);
  const b = await tx.booking.findUniqueOrThrow({ where: { id: payment.bookingId }, include: {
    event: true, payments: true, items: { include: { seats: true, ticketCategory: true } },
  } });
  const p = b.payments.find(p => p.id === payment.id)!;
  if (receipt.referenceNumber !== b.bookingReference || receipt.currency !== "PHP" || receipt.amountCentavos === null
    || receipt.amountCentavos !== centavos(b.totalAmount) || receipt.amountCentavos !== centavos(p.amount))
    return { processingStatus: "PAYMENT_REQUIRES_REVIEW", bookingId: b.id, reason: "PAYMENT_DETAILS_MISMATCH" };
  if (p.status === "PAID" && b.status === "CONFIRMED") return { processingStatus: "ALREADY_CONFIRMED", bookingId: b.id };
  if (b.status !== "PENDING_PAYMENT" || p.status !== "PENDING" || !["PUBLISHED", "SOLD_OUT"].includes(b.event.status)
    || b.payments.some(p => p.status === "PAID" || p.status === "REFUNDED")
    || b.items.some(i => i.ticketCategory.admissionMode === "ASSIGNED_SEATING" && (i.seats.length !== i.quantity
      || i.seats.some(s => s.allocationStatus !== "HELD" || s.releasedAt !== null))))
    return { processingStatus: "PAYMENT_REQUIRES_REVIEW", bookingId: b.id, reason: "BOOKING_NOT_FULFILLABLE" };
  const usedPayment = await tx.activityLog.findFirst({ where: { action: "PAYMONGO_BOOKING_CONFIRMED",
    metadata: { path: ["paymentId"], equals: receipt.paymentId } } });
  if (usedPayment) return { processingStatus: "PAYMENT_REQUIRES_REVIEW", bookingId: b.id, reason: "PAYMENT_ALREADY_USED" };
  const now = new Date();
  await tx.payment.update({ where: { id: p.id }, data: { status: "PAID", paidAt: now } });
  await tx.bookingSeat.updateMany({ where: { bookingItem: { bookingId: b.id }, allocationStatus: "HELD", releasedAt: null }, data: { allocationStatus: "CONFIRMED" } });
  for (const item of b.items) {
    for (let index = 0; index < item.quantity; index++) {
      const token = `AVX-${randomBytes(24).toString("hex")}`;
      await tx.ticket.create({ data: { bookingItemId: item.id, bookingSeatId: item.seats[index]?.id ?? null,
        ticketCode: token, verificationTokenHash: createHash("sha256").update(token).digest("hex") } });
    }
  }
  await tx.booking.update({ where: { id: b.id }, data: { status: "CONFIRMED" } });
  await tx.activityLog.create({ data: { action: "PAYMONGO_BOOKING_CONFIRMED", entityType: "Booking", entityId: b.id,
    metadata: { eventId: receipt.eventId, paymentId: receipt.paymentId, checkoutSessionId: receipt.checkoutSessionId, amountCentavos: receipt.amountCentavos, mode: "test", source } } });
  return { processingStatus: "BOOKING_CONFIRMED", bookingId: b.id };
}
