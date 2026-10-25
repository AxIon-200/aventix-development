import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { beforeAll, afterAll, it, expect, vi } from "vitest";
import { adminBookingsRouter } from "../src/routes/admin-bookings.routes.js";
import { prisma } from "../src/lib/prisma.js";
import type { createAuth } from "../src/lib/auth.js";

const prefix = `admin-bookings-${randomUUID()}`;
const ids = [randomUUID(), randomUUID(), randomUUID()];
const now = new Date();
const base = "/api/v1/admin/bookings";
let organizerId: string;
let eventId: string;
let completedEventId: string;
const bookings: string[] = [];
function fixture(role = "ADMINISTRATOR") {
  const auth = { api: { readOwnProfile: async () => Response.json({ data: { user: { id: ids[0], role } } }) } };
  const app = express(); app.use(express.json());
  app.use(base, adminBookingsRouter(auth as unknown as ReturnType<typeof createAuth>, () => now));
  return app;
}
const app = fixture();
const patch = (id: string, paymentStatus: string, note?: string) => request(app).patch(`${base}/${id}/payment`)
  .set("Origin", process.env.FRONTEND_URL!).send({ paymentStatus, note });
beforeAll(async () => {
  const marker = await prisma.$queryRaw<Array<{ environment: string }>>`SELECT environment FROM public.test_environment_marker WHERE id=1`;
  expect(marker[0]?.environment).toBe("aventix-test");
  for (const [i, id] of ids.entries()) await prisma.user.create({ data: { id, name: prefix, email: `${prefix}-${i}@example.com`,
    firstName: prefix, lastName: "fixture", emailVerified: true, role: i === 0 ? "ADMINISTRATOR" : i === 1 ? "ORGANIZER" : "ATTENDEE" } });
  organizerId = (await prisma.organizerProfile.create({ data: { userId: ids[1]!, organizationName: prefix } })).id;
  for (const completed of [false, true]) {
    const event = await prisma.event.create({ data: { organizerId, name: `${prefix}-${completed}`, slug: `${prefix}-${completed}`,
      status: completed ? "COMPLETED" : "PUBLISHED", ticketCategories: { create: { name: "VIP", price: 100, admissionMode: "ASSIGNED_SEATING" } } }, include: { ticketCategories: true } });
    if (completed) completedEventId = event.id; else eventId = event.id;
    const tier = event.ticketCategories[0]!;
    const statuses = completed ? ["CONFIRMED"] as const : ["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "EXPIRED", "REFUNDED", "PENDING_PAYMENT", "PENDING_PAYMENT", "PENDING_PAYMENT"] as const;
    for (const [i, status] of statuses.entries()) {
      const b = await prisma.booking.create({ data: { userId: ids[2]!, eventId: event.id, bookingReference: `${prefix}-${completed}-${i}`,
        status, subtotal: 200, totalAmount: 200, expiresAt: new Date(now.getTime() + (i === 5 ? -1 : 86_400_000)),
        items: { create: { ticketCategoryId: tier.id, quantity: 2, unitPrice: 100, subtotal: 200 } },
        ...(status === "CONFIRMED" || status === "REFUNDED" ? { payments: { create: { provider: "fixture", amount: 200, status: status === "REFUNDED" ? "REFUNDED" : "PAID", paidAt: now } } } : {}),
      }, include: { items: true } });
      bookings.push(b.id);
      if (i === 0 && !completed) {
        const seat = await prisma.eventSeat.create({ data: { eventId: event.id, ticketCategoryId: tier.id, seatNumber: "1", displayLabel: "A1" } });
        const allocation = await prisma.bookingSeat.create({ data: { eventSeatId: seat.id, bookingItemId: b.items[0]!.id, ticketCategoryId: tier.id } });
        await prisma.ticket.create({ data: { bookingItemId: b.items[0]!.id, bookingSeatId: allocation.id, ticketCode: prefix, verificationTokenHash: prefix } });
      }
    }
  }
}, 30000);
afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.activityLog.deleteMany({ where: { entityId: { in: bookings } } });
  await prisma.ticket.deleteMany({ where: { bookingItem: { bookingId: { in: bookings } } } });
  await prisma.bookingSeat.deleteMany({ where: { bookingItem: { bookingId: { in: bookings } } } });
  await prisma.payment.deleteMany({ where: { bookingId: { in: bookings } } });
  await prisma.bookingItem.deleteMany({ where: { bookingId: { in: bookings } } });
  await prisma.booking.deleteMany({ where: { id: { in: bookings } } });
  await prisma.eventSeat.deleteMany({ where: { eventId: { in: [eventId, completedEventId].filter(Boolean) } } });
  await prisma.ticketCategory.deleteMany({ where: { eventId: { in: [eventId, completedEventId].filter(Boolean) } } });
  await prisma.event.deleteMany({ where: { id: { in: [eventId, completedEventId].filter(Boolean) } } });
  if (organizerId) await prisma.organizerProfile.delete({ where: { id: organizerId } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
});
it("lists database bookings with matching filters, stats, pagination, event options, and full CSV export", async () => {
  const list = await request(app).get(base).query({ search: prefix.toUpperCase(), event: eventId, pageSize: 2 });
  expect(list.status).toBe(200); expect(list.body.total).toBe(8); expect(list.body.data).toHaveLength(2);
  expect(list.headers["cache-control"]).toBe("no-store");
  const next = await request(app).get(base).query({ search: prefix, event: eventId, page: 2, pageSize: 2 });
  expect(new Set([...list.body.data, ...next.body.data].map(b => b.id)).size).toBe(4);
  for (const [status, count] of Object.entries({ pending: 3, confirmed: 1, cancelled: 1, expired: 2, refunded: 1 })) {
    expect((await request(app).get(base).query({ search: prefix, event: eventId, status })).body.total).toBe(count);
  }
  expect((await request(app).get(base).query({ search: prefix, status: "completed" })).body.total).toBe(1);
  expect((await request(app).get(`${base}/stats`).query({ search: prefix, event: eventId })).body)
    .toEqual({ total: 8, confirmed: 1, pending: 3, totalValue: 800 });
  expect((await request(app).get(`${base}/stats`).query({ search: prefix, status: "expired" })).body)
    .toEqual({ total: 2, confirmed: 0, pending: 0, totalValue: 0 });
  expect((await request(app).get(`${base}/event-options`)).body).toContainEqual({ value: eventId, label: `${prefix}-false` });
  const exported = await request(app).get(`${base}/export`).query({ search: prefix, event: eventId });
  expect(exported.status).toBe(200); expect(exported.text.trim().split('\r\n')).toHaveLength(9);
  const detail = await request(app).get(`${base}/${bookings[0]}`);
  expect(detail.body).toMatchObject({ amount: 200, tickets: 2, customerName: prefix, eventStartsAt: null, paymentMethod: null,
    items: [{ tier: "VIP", quantity: 2, unitPrice: 100 }] });
});
it("records payment and refund atomically, persists notes, confirms/releases seats and cancels tickets", async () => {
  const id = bookings[0]!;
  expect((await patch(id, "paid", "Cash received")).body).toMatchObject({ status: "confirmed", paymentStatus: "paid" });
  expect((await prisma.bookingSeat.findFirstOrThrow({ where: { bookingItem: { bookingId: id } } })).allocationStatus).toBe("CONFIRMED");
  expect((await request(app).get(`${base}/${id}`)).body).toMatchObject({ paymentNote: "Cash received", paymentMethod: "Manual", paidAt: now.toISOString() });
  expect((await patch(id, "paid")).status).toBe(409);
  expect((await patch(id, "refunded", "Funds returned")).body).toMatchObject({ status: "refunded", paymentStatus: "refunded" });
  expect((await request(app).get(`${base}/${id}`)).body).toMatchObject({ paymentNote: "Funds returned", refundedAt: now.toISOString() });
  expect((await prisma.ticket.findFirstOrThrow({ where: { bookingItem: { bookingId: id } } })).status).toBe("CANCELLED");
  expect((await prisma.bookingSeat.findFirstOrThrow({ where: { bookingItem: { bookingId: id } } })).allocationStatus).toBe("RELEASED");
  expect((await patch(id, "refunded")).status).toBe(409);
  for (const index of [2, 3, 4, 5, 8]) expect((await patch(bookings[index]!, "paid")).status).toBe(409);
  expect((await patch(bookings[8]!, "refunded")).status).toBe(409);
});
it("serializes simultaneous decisions and rolls back all changes when audit persistence fails", async () => {
  const responses = await Promise.all([patch(bookings[6]!, "paid"), patch(bookings[6]!, "paid")]);
  expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
  expect(await prisma.payment.count({ where: { bookingId: bookings[6]!, status: "PAID" } })).toBe(1);
  const original = prisma.$transaction.bind(prisma);
  const spy = vi.spyOn(prisma, "$transaction").mockImplementationOnce(async callback => original(async tx => {
    const wrapped = new Proxy(tx, { get(target, key) { return key === "activityLog" ? { create: async () => { throw new Error("audit failure"); } } : Reflect.get(target, key); } });
    return (callback as (tx: typeof tx) => Promise<unknown>)(wrapped);
  }) as never);
  expect((await patch(bookings[7]!, "paid")).status).toBe(500); spy.mockRestore();
  expect((await prisma.booking.findUniqueOrThrow({ where: { id: bookings[7]! } })).status).toBe("PENDING_PAYMENT");
  expect(await prisma.payment.count({ where: { bookingId: bookings[7]! } })).toBe(0);
});
it("rejects unauthorized roles, invalid input, missing records, and cross-origin writes", async () => {
  expect((await request(fixture("ATTENDEE")).get(base)).status).toBe(403);
  expect((await request(fixture("ORGANIZER")).get(`${base}/export`)).status).toBe(403);
  for (const query of [{ page: 0 }, { pageSize: 101 }, { status: "other" }, { event: "bad" }]) expect((await request(app).get(base).query(query)).status).toBe(400);
  expect((await request(app).get(`${base}/bad`)).status).toBe(400);
  expect((await request(app).get(`${base}/${randomUUID()}`)).status).toBe(404);
  expect((await patch(randomUUID(), "paid")).status).toBe(404);
  expect((await patch(bookings[1]!, "pending")).status).toBe(400);
  expect((await patch(bookings[1]!, "refunded", "x".repeat(501))).status).toBe(400);
  expect((await request(app).patch(`${base}/${bookings[1]}/payment`).set("Origin", "https://other.example").send({ paymentStatus: "refunded" })).status).toBe(403);
});
