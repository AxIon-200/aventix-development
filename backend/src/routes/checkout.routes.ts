import { Router } from "express";
import { z } from "zod";
import type { createAuth } from "../lib/auth.js";
import { requireRoles } from "../lib/authorization.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { bookingInput, BookingError, createBooking, getOwnBooking, startCheckout, closeBooking } from "../lib/checkout-bookings.js";
import { paymongoCheckout, paymentMethods, type CheckoutGateway } from "../lib/paymongo-checkout.js";
import { PublicEventsService } from "../services/public-events.service.js";

export function checkoutRouter(auth: ReturnType<typeof createAuth>, gateway: CheckoutGateway = paymongoCheckout) {
  const router = Router();
  router.use(requireRoles(auth, ["ATTENDEE"]));
  router.use((req, res, next) => {
    if (req.method !== "GET") {
      if (req.get("Origin") !== env.FRONTEND_URL) { res.status(403).json({ error: { code: "ORIGIN_NOT_ALLOWED" } }); return; }
      if (!req.is("application/json")) { res.status(415).json({ error: { code: "UNSUPPORTED_MEDIA_TYPE" } }); return; }
    }
    next();
  });
  router.get("/events/:id/options", async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const event = await PublicEventsService.get(id);
    if (!event) throw new BookingError("NOT_FOUND", 404);
    const [limit, quantities] = await Promise.all([
      prisma.event.findUniqueOrThrow({ where: { id }, select: { maxTicketsPerAttendee: true } }),
      prisma.booking.findMany({ where: { userId: res.locals.user.id, eventId: id, status: { in: ["CONFIRMED", "PENDING_PAYMENT"] } },
        select: { status: true, items: { select: { quantity: true } } } }),
    ]);
    res.json({ data: { event, purchaseLimit: limit.maxTicketsPerAttendee,
      confirmedQuantity: quantities.filter(b => b.status === "CONFIRMED").reduce((n, b) => n + b.items.reduce((n, i) => n + i.quantity, 0), 0),
      heldQuantity: quantities.filter(b => b.status === "PENDING_PAYMENT").reduce((n, b) => n + b.items.reduce((n, i) => n + i.quantity, 0), 0),
    } });
  });
  router.get("/events/:id/seats", async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const seats = await prisma.eventSeat.findMany({ where: { eventId: id }, include: { bookingSeats: { where: { allocationStatus: { in: ["HELD", "CONFIRMED"] }, releasedAt: null } } } });
    res.json({ data: seats.map(s => ({ id: s.id, eventId: s.eventId, ticketCategoryId: s.ticketCategoryId, section: s.section ?? undefined,
      row: s.row ?? undefined, seatNumber: s.seatNumber, displayLabel: s.displayLabel,
      status: !s.enabled ? "DISABLED" : s.bookingSeats.some(b => b.allocationStatus === "CONFIRMED") ? "SOLD" : s.bookingSeats.length ? "HELD" : "AVAILABLE" })) });
  });
  router.post("/bookings", async (req, res) => {
    const input = bookingInput.parse(req.body);
    res.status(201).json({ data: await createBooking(res.locals.user.id, input) });
  });
  router.get("/bookings/:id", async (req, res) => {
    res.json({ data: await getOwnBooking(z.uuid().parse(req.params.id), res.locals.user.id, gateway) });
  });
  router.get("/bookings/:id/payment-methods", async (req, res) => {
    await getOwnBooking(z.uuid().parse(req.params.id), res.locals.user.id, gateway);
    res.json({ data: paymentMethods });
  });
  router.post("/bookings/:id/payment", async (req, res) => {
    const input = z.object({ methodId: z.enum(["gcash", "paymaya", "card"]), operationKey: z.uuid() }).strict().parse(req.body);
    res.json({ data: await startCheckout(z.uuid().parse(req.params.id), res.locals.user.id, input.methodId, gateway) });
  });
  router.post("/bookings/:id/cancel", async (req, res) => {
    z.object({ operationKey: z.uuid() }).strict().parse(req.body);
    const id = z.uuid().parse(req.params.id);
    await closeBooking(id, res.locals.user.id, "CANCELLED", gateway);
    res.json({ data: await getOwnBooking(id, res.locals.user.id, gateway) });
  });
  router.get("/tickets/:id", async (req, res) => {
    const ticket = await prisma.ticket.findFirst({ where: { id: z.uuid().parse(req.params.id), bookingItem: { booking: { userId: res.locals.user.id } } },
      include: { bookingSeat: { include: { eventSeat: true } }, bookingItem: { include: { ticketCategory: true,
        booking: { include: { user: true, event: { include: { venue: true, organizer: true } }, payments: true } } } } } });
    if (!ticket) throw new BookingError("NOT_FOUND", 404);
    const b = ticket.bookingItem.booking, e = b.event;
    const payment = b.payments.find(p => p.status === "PAID");
    const starts = e.startTime ?? e.eventDate;
    res.json({ data: { status: ticket.status, bookingStatus: b.status, eventStatus: e.status,
      pass: { eventTitle: e.name, category: e.eventType ?? "", organizer: e.organizer.organizationName,
        date: starts ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium" }).format(starts) : "To be announced",
        time: starts ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", timeStyle: "short" }).format(starts) : "",
        venueName: e.venue?.name ?? "To be announced", venueAddress: e.venue?.address ?? "To be announced", ticketHolder: b.user.name,
        ticketType: ticket.bookingItem.ticketCategory.name, seatInfo: ticket.bookingSeat?.eventSeat.displayLabel ?? "General admission",
        gateInfo: "See venue entry instructions", bookingRef: b.bookingReference, admitsText: "Admits 1 attendee",
        ticketId: ticket.ticketCode, priceFormatted: new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(ticket.bookingItem.unitPrice)),
        paymentMethod: payment?.paymentMethod ?? "PayMongo test", paymentDate: payment?.paidAt?.toISOString() ?? "",
        paymentRef: payment?.providerReference ?? "", testMode: payment?.provider === "paymongo_test",
      } } });
  });
  router.use(((error, _req, res, _next) => {
    const status = error instanceof BookingError ? error.status : error instanceof z.ZodError ? 400 : 500;
    const code = error instanceof BookingError ? error.code : status === 400 ? "VALIDATION_ERROR" : "INTERNAL_ERROR";
    res.status(status).json({ error: { code, message: "The booking request could not be completed. Refresh your booking before retrying." } });
  }) satisfies import("express").ErrorRequestHandler);
  return router;
}
