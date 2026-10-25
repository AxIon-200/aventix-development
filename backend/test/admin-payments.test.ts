import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { beforeAll, afterAll, it, expect, vi } from "vitest";
import { adminPaymentsRouter } from "../src/routes/admin-payments.routes.js";
import { prisma } from "../src/lib/prisma.js";
import type { createAuth } from "../src/lib/auth.js";

const prefix = `admin-payments-${randomUUID()}`;
const ids = [randomUUID(), randomUUID()];
const base = "/api/v1/admin/payments";
let organizerId: string;
let eventId: string;
let bookingId: string;
const paymentIds: string[] = [];
const createdAt = new Date("2026-01-01T00:00:00Z");
const paidAt = new Date("2026-01-01T00:02:00Z");
const refundedAt = new Date("2026-01-02T00:00:00Z");
function fixture(role: string | null = "ADMINISTRATOR") {
  const auth = { api: { readOwnProfile: async () => role
    ? Response.json({ data: { user: { id: ids[0], role } } })
    : Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 }) } };
  const app = express();
  app.use(base, adminPaymentsRouter(auth as unknown as ReturnType<typeof createAuth>));
  return app;
}
const app = fixture();
beforeAll(async () => {
  const marker = await prisma.$queryRaw<Array<{ environment: string }>>`SELECT environment FROM public.test_environment_marker WHERE id=1`;
  expect(marker[0]?.environment).toBe("aventix-test");
  for (const [i, id] of ids.entries()) await prisma.user.create({ data: { id, name: prefix,
    email: `${prefix}-${i}@example.com`, firstName: prefix, lastName: "fixture", emailVerified: true,
    role: i === 0 ? "ORGANIZER" : "ATTENDEE" } });
  organizerId = (await prisma.organizerProfile.create({ data: { userId: ids[0]!, organizationName: prefix } })).id;
  eventId = (await prisma.event.create({ data: { organizerId, name: prefix, slug: prefix } })).id;
  bookingId = (await prisma.booking.create({ data: { userId: ids[1]!, eventId, bookingReference: prefix,
    subtotal: 100, totalAmount: 100, expiresAt: new Date("2027-01-01") } })).id;
  for (const [i, status] of (["PENDING", "PAID", "FAILED", "REFUNDED"] as const).entries()) {
    const p = await prisma.payment.create({ data: { bookingId, provider: prefix, amount: (i + 1) * 100.25,
      status, providerReference: `${prefix}-${i}`, paymentMethod: i === 2 ? '=HYPERLINK("example")' : "GCash",
      createdAt, ...(status === "PAID" || status === "REFUNDED" ? { paidAt } : {}),
      ...(status === "REFUNDED" ? { refundedAt } : {}) } });
    paymentIds.push(p.id);
  }
}, 30000);
afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
  if (bookingId) await prisma.booking.delete({ where: { id: bookingId } });
  if (eventId) await prisma.event.delete({ where: { id: eventId } });
  if (organizerId) await prisma.organizerProfile.delete({ where: { id: organizerId } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
});
it("reads persisted attempts, paginates ties consistently and scopes statistics and CSV to the filters", async () => {
  const first = await request(app).get(base).query({ search: prefix.toUpperCase(), pageSize: 2 });
  expect(first.status).toBe(200);
  expect(first.headers["cache-control"]).toBe("no-store");
  expect(first.body).toMatchObject({ total: 4, page: 1, pageSize: 2 });
  expect(first.body.data).toHaveLength(2);
  const second = await request(app).get(base).query({ search: prefix, page: 2, pageSize: 2 });
  expect(new Set([...first.body.data, ...second.body.data].map(p => p.id)).size).toBe(4);
  expect((await request(app).get(`${base}/stats`).query({ search: prefix })).body)
    .toEqual({ total: 4, paid: 1, pending: 1, recordedValue: 1002.5 });
  for (const status of ["pending", "paid", "failed", "refunded"]) {
    expect((await request(app).get(base).query({ search: prefix, status })).body.total).toBe(1);
  }
  expect((await request(app).get(`${base}/stats`).query({ search: prefix, status: "paid" })).body)
    .toEqual({ total: 1, paid: 1, pending: 0, recordedValue: 200.5 });
  expect((await request(app).get(`${base}/stats`).query({ search: `${prefix}-missing` })).body)
    .toEqual({ total: 0, paid: 0, pending: 0, recordedValue: 0 });
  const exported = await request(app).get(`${base}/export`).query({ search: prefix });
  expect(exported.headers["content-type"]).toContain("text/csv");
  expect(exported.text.trim().split("\r\n")).toHaveLength(5);
  expect(exported.text).toContain(`"'=HYPERLINK(""example"")"`);
  expect((await request(app).get(`${base}/export`).query({ search: prefix, status: "paid" })).text.trim().split("\r\n")).toHaveLength(2);
});
it("returns actual relations, provider references and recorded timestamps and searches display IDs", async () => {
  const p = await request(app).get(`${base}/${paymentIds[3]}`);
  expect(p.status).toBe(200);
  expect(p.body).toMatchObject({ id: paymentIds[3], amount: 401, status: "refunded", userName: prefix,
    bookingCode: prefix, eventTitle: prefix, reference: `${prefix}-3`, timeline: [
      { label: "Payment initiated", at: createdAt.toISOString() },
      { label: "Payment captured", at: paidAt.toISOString() },
      { label: "Payment refunded", at: refundedAt.toISOString() },
    ] });
  expect((await request(app).get(base).query({ search: p.body.paymentCode })).body.total).toBe(1);
  expect((await request(app).get(`${base}/${paymentIds[0]}`)).body.timeline).toHaveLength(1);
  expect((await request(app).get(`${base}/${randomUUID()}`)).status).toBe(404);
});
it("validates inputs and denies unauthenticated and nonadministrator requests", async () => {
  for (const query of [{ page: 0 }, { pageSize: 101 }, { status: "unknown" }, { search: "x".repeat(101) }, { extra: "ignored" }])
    expect((await request(app).get(base).query(query)).status).toBe(400);
  expect((await request(app).get(`${base}/not-an-id`)).status).toBe(400);
  for (const path of ["", "/stats", "/export", `/${paymentIds[0]}`]) {
    expect((await request(fixture(null)).get(base + path)).status).toBe(401);
    for (const role of ["ATTENDEE", "ORGANIZER"])
      expect((await request(fixture(role)).get(base + path)).status).toBe(403);
  }
});
it("returns an error when database reads fail", async () => {
  vi.spyOn(prisma.payment, "findUnique").mockRejectedValueOnce(new Error("private database error"));
  const result = await request(app).get(`${base}/${paymentIds[0]}`);
  expect(result.status).toBe(500);
  expect(result.body.error.message).toBe("Could not load payment details");
});
