import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { beforeAll, afterAll, it, expect, vi } from "vitest";
import { adminDashboardRouter } from "../src/routes/admin-dashboard.routes.js";
import { prisma } from "../src/lib/prisma.js";
import type { createAuth } from "../src/lib/auth.js";

const base = "/api/v1/admin/dashboard";
const prefix = `dashboard-${randomUUID()}`;
const userIds = [randomUUID(), randomUUID()];
const now = new Date("2096-06-15T18:00:00Z"); // June 16 in Manila
const createdAt = new Date("2096-06-15T17:00:00Z");
let organizerId: string;
let eventId: string;
let completedId: string;
let categoryId: string;
const bookingIds: string[] = [];
let baseline: Record<string, number>;
let baselineMix: Record<string, number>;
function fixture(role: string | null = "ADMINISTRATOR") {
  const auth = { api: { readOwnProfile: async () => role
    ? Response.json({ data: { user: { id: userIds[0], role } } })
    : Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 }) } };
  const app = express();
  app.use(base, adminDashboardRouter(auth as unknown as ReturnType<typeof createAuth>, () => now));
  return app;
}
const app = fixture();
beforeAll(async () => {
  const marker = await prisma.$queryRaw<Array<{ environment: string }>>`SELECT environment FROM public.test_environment_marker WHERE id=1`;
  expect(marker[0]?.environment).toBe("aventix-test");
  const first = await request(app).get(base + "/stats");
  expect(first.status).toBe(200);
  baseline = first.body;
  baselineMix = (await request(app).get(base + "/booking-status")).body;
  for (const [i, id] of userIds.entries()) await prisma.user.create({ data: { id, name: prefix,
    email: `${prefix}-${i}@example.com`, firstName: prefix, lastName: "fixture", createdAt,
    role: i === 0 ? "ORGANIZER" : "ATTENDEE" } });
  organizerId = (await prisma.organizerProfile.create({ data: { userId: userIds[0]!, organizationName: prefix, createdAt } })).id;
  eventId = (await prisma.event.create({ data: { organizerId, name: prefix, slug: prefix, status: "PUBLISHED",
    startTime: new Date("2096-06-20"), createdAt } })).id;
  completedId = (await prisma.event.create({ data: { organizerId, name: prefix + "-completed", slug: prefix + "-completed", status: "COMPLETED", createdAt } })).id;
  categoryId = (await prisma.ticketCategory.create({ data: { eventId, name: prefix, price: 100, admissionMode: "GENERAL_ADMISSION" } })).id;
  for (const [i, status] of (["CONFIRMED", "CONFIRMED", "PENDING_PAYMENT", "PENDING_PAYMENT", "CANCELLED", "EXPIRED", "REFUNDED"] as const).entries()) {
    const booking = await prisma.booking.create({ data: { userId: userIds[1]!, eventId: i === 1 ? completedId : eventId,
      bookingReference: `${prefix}-${i}`, status, subtotal: 200, totalAmount: 200, createdAt,
      expiresAt: new Date(i === 3 ? "2096-06-14" : "2096-06-17") } });
    bookingIds.push(booking.id);
  }
  await prisma.bookingItem.create({ data: { bookingId: bookingIds[0]!, eventId, ticketCategoryId: categoryId,
    quantity: 2, unitPrice: 100, subtotal: 200 } });
  for (const status of ["PAID", "PENDING", "FAILED", "REFUNDED"] as const) await prisma.payment.create({
    data: { bookingId: bookingIds[0]!, provider: prefix, amount: 200.25, status, createdAt,
      paidAt: status === "PAID" ? createdAt : null } });
  // Missing paidAt must fall back to the actual payment creation timestamp.
  await prisma.payment.create({ data: { bookingId: bookingIds[0]!, provider: prefix, amount: 10.50, status: "PAID", createdAt } });
  await prisma.activityLog.create({ data: { userId: userIds[0]!, action: prefix, entityType: "TEST", createdAt } });
}, 30000);
afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.activityLog.deleteMany({ where: { action: prefix } });
  await prisma.payment.deleteMany({ where: { provider: prefix } });
  await prisma.bookingItem.deleteMany({ where: { bookingId: { in: bookingIds } } });
  await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  if (categoryId) await prisma.ticketCategory.delete({ where: { id: categoryId } });
  await prisma.event.deleteMany({ where: { slug: { in: [prefix, prefix + "-completed"] } } });
  if (organizerId) await prisma.organizerProfile.delete({ where: { id: organizerId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});
it("aggregates persisted records, counting paid payments rather than failed attempts or refunds", async () => {
  const result = await request(app).get(base + "/stats");
  expect(result.status).toBe(200);
  expect(result.headers["cache-control"]).toBe("no-store");
  for (const [key, delta] of Object.entries({ totalUsers: 2, totalOrganizers: 1, totalEvents: 2, upcomingEvents: 1,
    confirmedBookings: 2, ticketsSold: 2, recordedRevenue: 210.75, recentActivityCount: 1 })) {
    expect(result.body[key]).toBeCloseTo(baseline[key]! + delta, 2);
  }
  expect(result.body.totalUsersChange).toMatchObject({ value: "+2", label: "created in last 30 days" });
  const csv = await request(app).get(base + "/export");
  expect(csv.status).toBe(200);
  expect(csv.headers["content-type"]).toContain("text/csv");
  expect(csv.headers["content-disposition"]).toContain("dashboard-report.csv");
  expect(csv.text.trim().split("\r\n")).toHaveLength(9);
});
it("groups sales into Philippine calendar days with zero-filled 7, 30 and 90 day ranges", async () => {
  for (const days of [7, 30, 90]) {
    const result = await request(app).get(base + "/sales").query({ range: `${days}d` });
    expect(result.status).toBe(200);
    expect(result.body).toHaveLength(days);
    expect(result.body.at(-1)).toMatchObject({ date: "2096-06-16", ticketsSold: 2, revenue: 210.75 });
    expect(result.body[0]).toMatchObject({ ticketsSold: 0, revenue: 0 });
    expect(new Set(result.body.map(row => row.date)).size).toBe(days);
  }
});
it("preserves completed, expired and refunded booking meanings and recent record relations", async () => {
  const mix = (await request(app).get(base + "/booking-status")).body;
  for (const [key, delta] of Object.entries({ confirmed: 1, completed: 1, pending: 1, expired: 2, cancelled: 1, refunded: 1, total: 7 }))
    expect(mix[key]).toBe(baselineMix[key]! + delta);
  const events = await request(app).get(base + "/recent-events");
  expect(events.body.length).toBeLessThanOrEqual(5);
  expect(events.body.find(e => e.id === completedId)).toMatchObject({ date: null, status: "completed" });
  const users = await request(app).get(base + "/recent-users");
  expect(users.body.length).toBeLessThanOrEqual(5);
  for (const row of users.body) {
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: row.id } });
    expect(row).toEqual({ id: stored.id, name: stored.name, email: stored.email, joinedAt: stored.createdAt.toISOString() });
  }
  const bookings = await request(app).get(base + "/recent-bookings");
  expect(bookings.body).toHaveLength(5);
  expect(bookings.body[0]).toMatchObject({ eventTitle: expect.stringContaining(prefix), userName: prefix });
});
it("validates input and protects every endpoint with administrator authorization", async () => {
  for (const path of ["/stats", "/sales", "/booking-status", "/recent-events", "/recent-users", "/recent-bookings", "/export"]) {
    expect((await request(fixture(null)).get(base + path)).status).toBe(401);
    for (const role of ["ATTENDEE", "ORGANIZER"])
      expect((await request(fixture(role)).get(base + path)).status).toBe(403);
    expect((await request(app).get(base + path).query({ unknown: "x" })).status).toBe(400);
  }
  for (const range of ["1d", "7d&bad", ["7d", "30d"]])
    expect((await request(app).get(base + "/sales").query({ range })).status).toBe(400);
});
it("returns a safe error when a database query fails", async () => {
  vi.spyOn(prisma.user, "findMany").mockRejectedValueOnce(new Error("private connection detail"));
  const result = await request(app).get(base + "/recent-users");
  expect(result.status).toBe(500);
  expect(result.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Could not load dashboard data" } });
});
