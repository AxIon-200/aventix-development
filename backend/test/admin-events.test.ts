import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { beforeAll, afterAll, it, expect, vi } from "vitest";
import { adminEventsRouter } from "../src/routes/admin-events.routes.js";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import type { createAuth } from "../src/lib/auth.js";

const prefix = `admin-events-${randomUUID()}`;
const userIds = [randomUUID(), randomUUID(), randomUUID()];
const eventIds: string[] = [];
let organizerId: string;
let venueId: string;
const base = "/api/v1/admin/events";
const origin = process.env.FRONTEND_URL!;
// Route tests use the real database; the separate authorization suite covers live cookies/account gates.
function fixture(role = "ADMINISTRATOR", actor = userIds[0]!) {
  const auth = { api: { readOwnProfile: async () => Response.json({ data: { user: { id: actor, role } } }) } };
  const app = express(); app.use(express.json());
  app.use(base, adminEventsRouter(auth as unknown as ReturnType<typeof createAuth>));
  return app;
}
const app = fixture();
const patch = (id: string, expectedUpdatedAt: string, status: string, reason?: string) =>
  request(app).patch(`${base}/${id}/status`).set("Origin", origin).send({ status, expectedUpdatedAt, reason });

beforeAll(async () => {
  const marker = await prisma.$queryRaw<Array<{ environment: string }>>`SELECT environment FROM public.test_environment_marker WHERE id=1`;
  expect(marker[0]?.environment).toBe("aventix-test");
  for (const [i, id] of userIds.entries()) await prisma.user.create({ data: { id, name: prefix,
    email: `${prefix}-${i}@example.com`, firstName: prefix, lastName: "fixture", emailVerified: true,
    role: i === 0 ? "ADMINISTRATOR" : i === 1 ? "ORGANIZER" : "ATTENDEE" } });
  organizerId = (await prisma.organizerProfile.create({ data: { userId: userIds[1]!, organizationName: prefix, approvalStatus: "APPROVED" } })).id;
  venueId = (await prisma.venue.create({ data: { name: prefix, address: "Fixture venue" } })).id;
  for (const [i, status] of (["DRAFT", "PUBLISHED", "SOLD_OUT", "COMPLETED", "CANCELLED"] as const).entries()) {
    const event = await prisma.event.create({ data: { organizerId, venueId, name: `${prefix}-${i}`, slug: `${prefix}-${i}`,
      eventDate: new Date(Date.now() + 86_400_000), eventType: "CONCERT", status,
      ticketCategories: { create: [
        { name: "GA", price: 100, admissionMode: "GENERAL_ADMISSION", maxCapacity: 10 },
        { name: "VIP", price: 200, admissionMode: "ASSIGNED_SEATING", maxCapacity: 10 },
      ] } }, include: { ticketCategories: true } });
    eventIds.push(event.id);
    await prisma.eventSeat.createMany({ data: [true, false].map((enabled, index) => ({
      eventId: event.id, ticketCategoryId: event.ticketCategories.find(tier => tier.name === "VIP")!.id,
      displayLabel: `A${index + 1}`, seatNumber: String(index + 1), enabled,
    })) });
    for (const [j, bookingStatus] of (["CONFIRMED", "PENDING_PAYMENT", "CANCELLED", "EXPIRED", "REFUNDED"] as const).entries()) {
      await prisma.booking.create({ data: { userId: userIds[2]!, eventId: event.id,
        bookingReference: `${prefix}-${i}-${j}`, status: bookingStatus, subtotal: 200, totalAmount: 200, expiresAt: new Date(),
        items: { create: { ticketCategoryId: event.ticketCategories.find(tier => tier.name === "GA")!.id,
          quantity: 2, unitPrice: 100, subtotal: 200 } } } });
    }
  }
}, 30000);

afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.activityLog.deleteMany({ where: { entityId: { in: eventIds } } });
  await prisma.bookingItem.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.booking.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.eventSeat.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.ticketCategory.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
  if (venueId) await prisma.venue.delete({ where: { id: venueId } });
  if (organizerId) await prisma.organizerProfile.delete({ where: { id: organizerId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

it("lists real events with search, category/status filters, pagination and all database states", async () => {
  const r = await request(app).get(base).query({ search: prefix, pageSize: 2 });
  expect(r.status).toBe(200); expect(r.headers["cache-control"]).toBe("no-store");
  expect(r.body.total).toBe(5); expect(r.body.data).toHaveLength(2);
  const next = await request(app).get(base).query({ search: prefix, page: 2, pageSize: 2 });
  expect(new Set([...r.body.data, ...next.body.data].map(e => e.id)).size).toBe(4);
  for (const status of ["draft", "published", "sold_out", "completed", "cancelled"]) {
    const filtered = await request(app).get(base).query({ search: prefix.toUpperCase(), category: "concert", status });
    expect(filtered.body.total).toBe(1); expect(filtered.body.data[0]).toMatchObject({ status, attendees: 2 });
  }
  expect((await request(app).get(base).query({ search: `EVT-${eventIds[0]}` })).body.total).toBe(1);
  const stats = await request(app).get(`${base}/stats`);
  expect(stats.status).toBe(200);
  expect(stats.body.data.total).toBe(Object.entries(stats.body.data).filter(([key]) => key !== "total").reduce((sum, [, n]) => sum + Number(n), 0));
});

it("reports confirmed sales and actual capacities without manufacturing missing fields", async () => {
  const r = await request(app).get(`${base}/${eventIds[0]}`);
  expect(r.status).toBe(200);
  expect(r.body.data).toMatchObject({ attendees: 2, revenue: 200, capacity: 11 });
  expect(r.body.data.tiers.find(tier => tier.name === "VIP")).toMatchObject({ capacity: 1, sold: 0 });
  await prisma.event.update({ where: { id: eventIds[0]! }, data: { eventDate: null, venueId: null, eventType: null } });
  await prisma.ticketCategory.updateMany({ where: { eventId: eventIds[0]!, name: "GA" }, data: { maxCapacity: null } });
  const missing = await request(app).get(`${base}/${eventIds[0]}`);
  expect(missing.body.data).toMatchObject({ startsAt: null, category: null, venue: "Not set", capacity: null });
  expect((await patch(eventIds[0]!, missing.body.data.updatedAt, "published")).body.error.code).toBe("INCOMPLETE_EVENT");
});

it("persists status and reason, rejects stale versions and illegal transitions, and rolls back failed audits", async () => {
  const id = eventIds[1]!;
  const initial = (await request(app).get(`${base}/${id}`)).body.data;
  const changed = await patch(id, initial.updatedAt, "cancelled", "Weather");
  expect(changed.status).toBe(200);
  expect((await request(app).get(`${base}/${id}`)).body.data.cancellationReason).toBe("Weather");
  expect((await patch(id, initial.updatedAt, "draft")).body.error.code).toBe("STALE_EVENT");
  expect((await patch(id, changed.body.data.updatedAt, "published")).body.error.code).toBe("INVALID_TRANSITION");
  const failed = await request(fixture("ADMINISTRATOR", randomUUID())).patch(`${base}/${id}/status`)
    .set("Origin", origin).send({ status: "draft", expectedUpdatedAt: changed.body.data.updatedAt });
  expect(failed.status).toBe(500);
  expect((await prisma.event.findUniqueOrThrow({ where: { id } })).status).toBe("CANCELLED");
  const restored = await patch(id, changed.body.data.updatedAt, "draft");
  expect(restored.status).toBe(200);
  expect((await patch(id, restored.body.data.updatedAt, "published")).status).toBe(200);
  expect(await prisma.activityLog.count({ where: { entityId: id, userId: userIds[0] } })).toBe(3);
});

it("allows only one concurrent status update for a version", async () => {
  const id = eventIds[2]!;
  const e = (await request(app).get(`${base}/${id}`)).body.data;
  const results = await Promise.all([patch(id, e.updatedAt, "draft"), patch(id, e.updatedAt, "cancelled")]);
  expect(results.map(r => r.status).sort()).toEqual([200, 409]);
});

it("validates inputs, restricts roles and requires the frontend origin", async () => {
  for (const query of [{ status: "bogus" }, { page: 0 }, { pageSize: 101 }, { extra: "x" }])
    expect((await request(app).get(base).query(query)).status).toBe(400);
  expect((await request(app).get(`${base}/bad-id`)).status).toBe(400);
  expect((await request(app).get(`${base}/${randomUUID()}`)).status).toBe(404);
  for (const role of ["ATTENDEE", "ORGANIZER"]) for (const suffix of ["", "/stats", "/export", `/${eventIds[0]}`])
    expect((await request(fixture(role)).get(base + suffix)).status).toBe(403);
  expect((await request(createApp()).get(base)).status).toBe(401);
  expect((await request(app).patch(`${base}/${eventIds[0]}/status`).set("Origin", "https://foreign.example").send({})).status).toBe(403);
  expect((await request(app).patch(`${base}/${eventIds[0]}/status`).set("Origin", origin).type("text").send("x")).status).toBe(415);
  expect((await request(createApp()).patch(`${base}/${eventIds[0]}/status`).set("Origin", origin).type("json").send("{")).status).toBe(400);
  expect((await request(app).patch(`${base}/${eventIds[0]}/status`).set("Origin", origin)
    .send({ status: "cancelled", expectedUpdatedAt: new Date().toISOString(), extra: true })).status).toBe(400);
});

it("exports all matches with safe CSV and returns empty data or actual failures", async () => {
  await prisma.event.update({ where: { id: eventIds[0]! }, data: { name: '=HYPERLINK("x")' } });
  const csv = await request(app).get(`${base}/export`).query({ search: prefix });
  expect(csv.status).toBe(200); expect(csv.text).toContain('"\'=HYPERLINK(""x"")"');
  for (const id of eventIds) expect(csv.text).toContain(`EVT-${id}`);
  const empty = await request(app).get(base).query({ search: randomUUID() });
  expect(empty.body).toMatchObject({ data: [], total: 0 });
  const spy = vi.spyOn(prisma.event, "groupBy").mockRejectedValueOnce(new Error("Fixture failure"));
  try { expect((await request(app).get(`${base}/stats`)).status).toBe(500); } finally { spy.mockRestore(); }
});
