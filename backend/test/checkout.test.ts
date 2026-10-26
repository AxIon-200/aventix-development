import { createHmac, randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import type { createAuth } from "../src/lib/auth.js";
import { checkoutRouter } from "../src/routes/checkout.routes.js";
import { createPayMongoWebhookApp } from "../src/lib/paymongo-webhook.js";
import { reconcileOverdueBooking } from "../src/lib/checkout-bookings.js";
import { CheckoutProviderError, type CheckoutGateway } from "../src/lib/paymongo-checkout.js";
import { PublicEventsService } from "../src/services/public-events.service.js";

const prefix = `checkout-${randomUUID()}`, origin = process.env.FRONTEND_URL ?? "http://localhost:3000";
const owner = randomUUID(), other = randomUUID();
let organizerId: string, eventId: string, seated: string, standing: string;
const seats: string[] = [];
const eventIds: string[] = [];
const secret = "isolated-checkout-webhook-secret";
const gateway = { create: vi.fn<CheckoutGateway["create"]>(async input => ({ id: `cs_${randomUUID().replaceAll("-", "")}`,
  attributes: { livemode: false, status: "active", reference_number: input.reference,
    checkout_url: "https://checkout.paymongo.com/test-fixture" } })), expire: vi.fn<CheckoutGateway["expire"]>(async () => true) };
function app(user = owner, role: string | null = "ATTENDEE", provider: CheckoutGateway = gateway) {
  const auth = { api: { readOwnProfile: async () => role ? Response.json({ data: { user: { id: user, role } } })
    : Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 }) } };
  const app = express(); app.use(express.json()); app.use("/checkout", checkoutRouter(auth as unknown as ReturnType<typeof createAuth>, provider));
  return app;
}
const client = app(), webhook = createPayMongoWebhookApp({ secret: () => secret });
function post(path: string, data: unknown, target = client) { return request(target).post("/checkout" + path).set("Origin", origin).send(data); }
function draft(category = standing, seatIds: string[] = [], quantity = 1) {
  return { version: 1, eventId, operationKey: randomUUID(), items: [{ ticketCategoryId: category, quantity, seatIds }] };
}
async function booking(category = standing, seatIds: string[] = [], target = client) {
  const res = await post("/bookings", draft(category, seatIds), target); expect(res.status).toBe(201); return res.body.data;
}
async function checkout(id: string, target = client) {
  return post(`/bookings/${id}/payment`, { methodId: "gcash", operationKey: randomUUID() }, target);
}
async function deliver(bookingId: string, change: { amount?: number; reference?: string; sessionId?: string; incomplete?: boolean } = {}) {
  const b = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { payments: true } });
  const eventId = `evt_${randomUUID().replaceAll("-", "")}`; eventIds.push(eventId);
  const payment = { status: "paid", ...(change.incomplete ? {} : { amount: change.amount ?? 125025, currency: "PHP" }) };
  const raw = JSON.stringify({ data: { id: eventId, type: "event", attributes: { type: "checkout_session.payment.paid", livemode: false,
    data: { id: change.sessionId ?? b.payments[0]!.providerReference, type: "checkout_session", attributes: {
      reference_number: change.reference ?? b.bookingReference, payments: [{ id: `pay_${randomUUID()}`, attributes: payment }],
    } } } } });
  const t = Math.floor(Date.now() / 1000), signature = `t=${t},te=${createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex")},li=`;
  const send = () => request(webhook).post("/api/v1/webhooks/paymongo").set("Content-Type", "application/json").set("Paymongo-Signature", signature).send(raw);
  return { send, eventId };
}
beforeAll(async () => {
  const marker = await prisma.$queryRaw<Array<{ environment: string }>>`SELECT environment FROM public.test_environment_marker WHERE id=1`;
  expect(marker[0]?.environment).toBe("aventix-test");
  for (const [i, id] of [owner, other].entries()) await prisma.user.create({ data: { id, name: prefix, email: `${prefix}-${i}@example.com`, firstName: prefix, lastName: "Test", emailVerified: true } });
  organizerId = (await prisma.organizerProfile.create({ data: { userId: owner, organizationName: prefix, approvalStatus: "APPROVED" } })).id;
  const venue = await prisma.venue.create({ data: { name: prefix, address: "Test fixture venue" } });
  const event = await prisma.event.create({ data: { organizerId, venueId: venue.id, name: prefix, slug: prefix, status: "PUBLISHED", maxTicketsPerAttendee: 20,
    eventDate: new Date(Date.now() + 86400_000), ticketCategories: { create: [
      { name: "Assigned", price: "1250.25", admissionMode: "ASSIGNED_SEATING", maxCapacity: 5 },
      { name: "Standing", price: "1250.25", admissionMode: "GENERAL_ADMISSION", maxCapacity: 30 },
    ] } }, include: { ticketCategories: true } });
  eventId = event.id; seated = event.ticketCategories.find(c => c.admissionMode === "ASSIGNED_SEATING")!.id;
  standing = event.ticketCategories.find(c => c.admissionMode === "GENERAL_ADMISSION")!.id;
  for (let n = 1; n <= 5; n++) seats.push((await prisma.eventSeat.create({ data: { eventId, ticketCategoryId: seated, seatNumber: String(n), displayLabel: `A${n}` } })).id);
}, 30000);
afterAll(async () => {
  vi.restoreAllMocks();
  if (!eventId) return;
  await prisma.ticket.deleteMany({ where: { bookingItem: { eventId } } });
  await prisma.bookingSeat.deleteMany({ where: { bookingItem: { eventId } } });
  await prisma.payment.deleteMany({ where: { booking: { eventId } } });
  await prisma.activityLog.deleteMany({ where: { OR: [{ entityId: { in: (await prisma.booking.findMany({ where: { eventId }, select: { id: true } })).map(b => b.id) } },
    ...eventIds.map(id => ({ action: "PAYMONGO_TEST_WEBHOOK_RECEIVED", metadata: { path: ["eventId"], equals: id } }))] } });
  await prisma.bookingItem.deleteMany({ where: { eventId } });
  await prisma.booking.deleteMany({ where: { eventId } });
  await prisma.eventSeat.deleteMany({ where: { eventId } });
  await prisma.ticketCategory.deleteMany({ where: { eventId } });
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { venueId: true } });
  await prisma.event.deleteMany({ where: { id: eventId } });
  if (event?.venueId) await prisma.venue.delete({ where: { id: event.venueId } });
  await prisma.organizerProfile.deleteMany({ where: { id: organizerId } });
  await prisma.user.deleteMany({ where: { id: { in: [owner, other] } } });
}, 30000);

it("reserves actual prices exactly once and prevents another attendee buying the same numbered seat", async () => {
  const input = draft(seated, [seats[0]!]);
  const results = await Promise.all([post("/bookings", input), post("/bookings", input)]);
  expect(results.map(r => r.status)).toEqual([201, 201]);
  expect(results[0]!.body.data.id).toBe(results[1]!.body.data.id);
  expect(results[0]!.body.data.total).toBe(1250.25);
  expect((await post("/bookings", { ...input, items: [{ ...input.items[0], quantity: 2 }] })).status).toBe(409);
  expect((await post("/bookings", { ...draft(), totalAmount: 1 })).status).toBe(400);
  expect((await post("/bookings", draft(seated, [seats[0]!]), app(other))).body.error.code).toBe("SEAT_UNAVAILABLE");
  const b = results[0]!.body.data;
  expect((await checkout(b.id)).status).toBe(200);
  const calls = gateway.create.mock.calls.length;
  expect((await checkout(b.id)).body.data.redirectUrl).toBe("https://checkout.paymongo.com/test-fixture");
  expect(gateway.create.mock.calls.length).toBe(calls);
  const event = await PublicEventsService.get(eventId);
  expect(event!.categories.find(c => c.id === seated)!.seats!.some(s => s.id === seats[0])).toBe(false);
  const delivery = await deliver(b.id);
  const delivered = await Promise.all([delivery.send(), delivery.send()]);
  expect(delivered.map(r => r.status)).toEqual([200, 200]);
  expect(delivered.map(r => r.body.duplicate).sort()).toEqual([false, true]);
  const read = await request(client).get(`/checkout/bookings/${b.id}`);
  expect(read.body.data).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID", canPay: false });
  expect(read.body.data.issuedTickets).toHaveLength(1);
  const ticketId = read.body.data.issuedTickets[0].id;
  const ticket = await request(client).get(`/checkout/tickets/${ticketId}`);
  expect(ticket.body.data).toMatchObject({ status: "VALID", pass: { seatInfo: "A1", ticketType: "Assigned", testMode: true } });
  expect((await request(app(other)).get(`/checkout/tickets/${ticketId}`)).status).toBe(404);
  const again = await deliver(b.id); expect((await again.send()).status).toBe(200);
  expect((await request(client).get(`/checkout/bookings/${b.id}`)).body.data.issuedTickets).toHaveLength(1);
}, 30000);

it("provides a usable venue address for bookings created with venue text only", async () => {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId }, select: { venueId: true } });
  const venueId = event.venueId!;
  await prisma.venue.update({ where: { id: venueId }, data: { address: "" } });
  try {
    const created = await booking();
    expect(created.event.venue.address).toBe("To be announced");
    const read = await request(client).get(`/checkout/bookings/${created.id}`);
    expect(read.status).toBe(200);
    expect(read.body.data.event.venue.address).toBe("To be announced");
  } finally {
    await prisma.venue.update({ where: { id: venueId }, data: { address: "Test fixture venue" } });
  }
}, 30000);

it("never confirms for unknown sessions, mismatched references, incorrect totals or incomplete dashboard fixtures", async () => {
  const b = await booking(); expect((await checkout(b.id)).status).toBe(200);
  for (const change of [{ amount: 1 }, { reference: "wrong-booking" }, { sessionId: "cs_unknown" }, { incomplete: true }]) {
    const delivery = await deliver(b.id, change); expect((await delivery.send()).status).toBe(200);
    const read = await request(client).get(`/checkout/bookings/${b.id}`);
    expect(read.body.data.status).toBe("PENDING_PAYMENT"); expect(read.body.data.issuedTickets).toHaveLength(0);
  }
  const valid = await deliver(b.id); expect((await valid.send()).status).toBe(200);
  expect((await request(client).get(`/checkout/bookings/${b.id}`)).body.data.status).toBe("CONFIRMED");
}, 30000);

it("keeps inventory until provider expiry is verified, then releases it for another attendee", async () => {
  const b = await booking(seated, [seats[1]!]); await checkout(b.id);
  gateway.expire.mockResolvedValueOnce(false);
  expect((await post(`/bookings/${b.id}/cancel`, { operationKey: randomUUID() })).body.error.code).toBe("PAYMENT_PROCESSING");
  expect((await post("/bookings", draft(seated, [seats[1]!]), app(other))).status).toBe(409);
  expect((await post(`/bookings/${b.id}/cancel`, { operationKey: randomUUID() })).body.data.status).toBe("CANCELLED");
  const next = await booking(seated, [seats[1]!], app(other));
  expect(next.status).toBe("PENDING_PAYMENT");
  await prisma.booking.update({ where: { id: next.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  await reconcileOverdueBooking(next.id, undefined, gateway);
  expect((await request(app(other)).get(`/checkout/bookings/${next.id}`)).body.data.status).toBe("CANCELLED");
}, 30000);

it("cancels an unpaid reservation when its deadline has passed", async () => {
  const b = await booking(seated, [seats[2]!]);
  await prisma.booking.update({ where: { id: b.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  const read = await request(client).get(`/checkout/bookings/${b.id}`);
  expect(read.body.data.status).toBe("CANCELLED");
  expect(read.body.data.paymentStatus).toBe("FAILED");
  expect(read.body.data.canPay).toBe(false);
  expect(read.body.data.canCancel).toBe(false);
  const otherClient = app(other);
  const replacement = await booking(seated, [seats[2]!], otherClient);
  expect(replacement.status).toBe("PENDING_PAYMENT");
  expect((await post(`/bookings/${replacement.id}/cancel`, { operationKey: randomUUID() }, otherClient)).status).toBe(200);
}, 30000);

it("retains an uncertain session attempt and refuses duplicate checkout creation or premature cancellation", async () => {
  const b = await booking();
  const failed = app(owner, "ATTENDEE", { ...gateway, create: async () => { throw new CheckoutProviderError(false); } });
  expect((await checkout(b.id, failed)).body.error.code).toBe("NETWORK_UNCERTAIN");
  const calls = gateway.create.mock.calls.length;
  expect((await checkout(b.id)).body.error.code).toBe("NETWORK_UNCERTAIN");
  expect(gateway.create.mock.calls.length).toBe(calls);
  expect((await post(`/bookings/${b.id}/cancel`, { operationKey: randomUUID() })).status).toBe(409);
  const delivery = await deliver(b.id, { sessionId: "cs_early" });
  expect((await delivery.send()).status).toBe(503);
}, 30000);

it("rolls back payment, booking, seats and tickets when required audit persistence fails", async () => {
  const b = await booking(seated, [seats[2]!]); await checkout(b.id);
  const delivery = await deliver(b.id);
  // Inject an audit failure inside the real PostgreSQL transaction.
  const original = prisma.$transaction.bind(prisma);
  const spy = vi.spyOn(prisma, "$transaction").mockImplementationOnce(((callback: (tx: unknown) => unknown) => original(async tx => {
    const create = tx.activityLog.create.bind(tx.activityLog);
    tx.activityLog.create = (async (args: Parameters<typeof create>[0]) => {
      if (args.data.action === "PAYMONGO_BOOKING_CONFIRMED") throw new Error("fixture audit failure");
      return create(args);
    }) as typeof tx.activityLog.create;
    return callback(tx);
  })) as typeof prisma.$transaction);
  expect((await delivery.send()).status).toBe(503); spy.mockRestore();
  const read = await request(client).get(`/checkout/bookings/${b.id}`);
  expect(read.body.data).toMatchObject({ status: "PENDING_PAYMENT", paymentStatus: "PENDING", issuedTickets: [] });
  expect((await delivery.send()).status).toBe(200);
  expect((await request(client).get(`/checkout/bookings/${b.id}`)).body.data.issuedTickets).toHaveLength(1);
}, 30000);

it("serializes competing reservations and issues exactly one ticket for each paid numbered seat", async () => {
  const competitor = app(other);
  const results = await Promise.all([post("/bookings", draft(seated, [seats[3]!])), post("/bookings", draft(seated, [seats[3]!]), competitor)]);
  expect(results.map(r => r.status).sort()).toEqual([201, 409]);
  const winner = results[0]!.status === 201 ? client : competitor;
  const held = results.find(r => r.status === 201)!.body.data;
  expect((await post(`/bookings/${held.id}/cancel`, { operationKey: randomUUID() }, winner)).status).toBe(200);
  const created = await post("/bookings", draft(seated, [seats[3]!, seats[4]!], 2));
  expect(created.body.data.total).toBe(2500.5);
  const b = created.body.data;
  expect((await checkout(b.id)).status).toBe(200);
  const delivery = await deliver(b.id, { amount: 250050 });
  expect((await delivery.send()).status).toBe(200);
  const confirmed = await request(client).get(`/checkout/bookings/${b.id}`);
  expect(confirmed.body.data.issuedTickets.map((t: { seatLabel: string }) => t.seatLabel).sort()).toEqual(["A4", "A5"]);
}, 30000);

it("does not oversell the last general-admission place under competing requests", async () => {
  const existing = await prisma.bookingItem.aggregate({ where: { ticketCategoryId: standing,
    booking: { status: { in: ["PENDING_PAYMENT", "CONFIRMED"] } } }, _sum: { quantity: true } });
  await prisma.ticketCategory.update({ where: { id: standing }, data: { maxCapacity: (existing._sum.quantity ?? 0) + 1 } });
  try {
    const results = await Promise.all([post("/bookings", draft()), post("/bookings", draft(), app(other))]);
    expect(results.map(r => r.status).sort()).toEqual([201, 409]);
  } finally { await prisma.ticketCategory.update({ where: { id: standing }, data: { maxCapacity: 30 } }); }
}, 30000);

it("enforces ownership, attendee role, origin, JSON, limits and seat/category membership", async () => {
  const b = await booking();
  expect((await request(app(other)).get(`/checkout/bookings/${b.id}`)).status).toBe(404);
  expect((await checkout(b.id, app(other))).status).toBe(404);
  for (const role of [null, "ORGANIZER", "ADMINISTRATOR"]) expect((await request(app(owner, role)).get(`/checkout/bookings/${b.id}`)).status).toBe(role ? 403 : 401);
  expect((await request(client).post("/checkout/bookings").send(draft())).status).toBe(403);
  expect((await request(client).post("/checkout/bookings").set("Origin", origin).type("text").send("{}")).status).toBe(415);
  expect((await post("/bookings", draft(standing, [], 20))).body.error.code).toBe("PURCHASE_LIMIT_EXCEEDED");
  expect((await post("/bookings", draft(standing, [seats[4]!]))).body.error.code).toBe("SEAT_SELECTION_INVALID");
  expect((await post("/bookings", draft(seated, [randomUUID()]))).body.error.code).toBe("SEAT_UNAVAILABLE");
}, 30000);

it("recovers a paid overdue checkout when its webhook was missed", async () => {
  const b = await booking(); await checkout(b.id);
  const row = await prisma.booking.findUniqueOrThrow({ where: { id: b.id }, include: { payments: true } });
  await prisma.booking.update({ where: { id: b.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  const paidGateway = { ...gateway, inspect: vi.fn(async () => ({ id: row.payments[0]!.providerReference!,
    attributes: { livemode: false as const, status: "active", reference_number: b.reference,
      payments: [{ id: `pay_${randomUUID()}`, attributes: { status: "paid", amount: 125025, currency: "PHP" } }] } })) };
  await reconcileOverdueBooking(b.id, undefined, paidGateway);
  const read = await request(app(owner, "ATTENDEE", paidGateway)).get(`/checkout/bookings/${b.id}`);
  expect(read.body.data).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID" });
  expect(read.body.data.issuedTickets).toHaveLength(1);
  await reconcileOverdueBooking(b.id, undefined, paidGateway);
  expect(await prisma.ticket.count({ where: { bookingItem: { bookingId: b.id } } })).toBe(1);
  expect(gateway.expire).not.toHaveBeenCalledWith(row.payments[0]!.providerReference);
}, 30000);

it("retains an overdue paid checkout when provider amount does not match", async () => {
  const b = await booking(); await checkout(b.id);
  const row = await prisma.booking.findUniqueOrThrow({ where: { id: b.id }, include: { payments: true } });
  await prisma.booking.update({ where: { id: b.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  const suspiciousGateway = { ...gateway, inspect: vi.fn(async () => ({ id: row.payments[0]!.providerReference!,
    attributes: { livemode: false as const, reference_number: b.reference,
      payments: [{ id: `pay_${randomUUID()}`, attributes: { status: "paid", amount: 1, currency: "PHP" } }] } })) };
  await expect(reconcileOverdueBooking(b.id, undefined, suspiciousGateway)).rejects.toMatchObject({ code: "PAYMENT_PROCESSING" });
  const read = await request(app(owner, "ATTENDEE", suspiciousGateway)).get(`/checkout/bookings/${b.id}`);
  expect(read.body.data.status).toBe("PENDING_PAYMENT");
  expect(await prisma.ticket.count({ where: { bookingItem: { bookingId: b.id } } })).toBe(0);
  expect(gateway.expire).not.toHaveBeenCalledWith(row.payments[0]!.providerReference);
}, 30000);
