import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { hashExactPassword } from "../src/lib/exact-password.js";

const clock = new Date();
const origin = process.env.FRONTEND_URL!;
const terms = { version: "admin-users-test-v1", documentUrl: "https://example.com/fixture-terms" };
const password = " independent attendee management password ";
const app = createApp({ terms, now: () => clock, loginLimit: 1000, aggregateLimit: 10000, sendVerificationEmail: async () => {} });
const prefix = `admin-users-${randomUUID()}`;
const ids: string[] = [];
const admin = request.agent(app);
const attendee = request.agent(app);
const organizer = request.agent(app);
let ownerId: string;
let adminId: string;
let organizerId: string;
let disabledId: string;
let unverifiedId: string;
let eventId: string;
let baseline: { total: number; active: number; newLast30Days: number; withBookings: number };

async function login(agent: ReturnType<typeof request.agent>, email: string) {
  const response = await agent.post("/api/auth/login").set("Origin", origin).send({ email, password });
  expect(response.status, JSON.stringify(response.body)).toBe(200);
}
const endpoint = "/api/v1/admin/users";
const change = (id: string, status: string) => admin.patch(`${endpoint}/${id}/status`).set("Origin", origin).send({ status });

beforeAll(async () => {
  // Environment separation is checked by setup.ts; verify the database marker before fixture writes.
  const marker = await prisma.$queryRaw<Array<{ environment: string }>>`
    SELECT environment FROM public.test_environment_marker WHERE id = 1`;
  expect(marker[0]?.environment).toBe("aventix-test");
  const hash = await hashExactPassword(password);
  async function identity(label: string, role = "ATTENDEE", status = "ACTIVE", createdAt = clock, emailVerified = true) {
    const id = randomUUID();
    ids.push(id);
    const email = `${prefix}-${label}@example.com`;
    await prisma.user.create({ data: { id, name: `${prefix} ${label}`, firstName: prefix, lastName: label, email,
      role, status, createdAt, emailVerified, termsVersion: terms.version, termsAcceptedAt: clock,
      accounts: { create: { accountId: id, providerId: "credential", password: hash } } } });
    return { id, email };
  }
  const operator = await identity("admin", "ADMINISTRATOR");
  adminId = operator.id;
  await login(admin, operator.email);
  const producer = await identity("organizer", "ORGANIZER");
  organizerId = producer.id;
  const profile = await prisma.organizerProfile.create({ data: {
    userId: organizerId, organizationName: prefix, approvalStatus: "APPROVED",
  } });
  await login(organizer, producer.email);
  baseline = (await admin.get(`${endpoint}/stats`)).body.data;
  const owner = await identity("attendee");
  ownerId = owner.id;
  disabledId = (await identity("disabled", "ATTENDEE", "DISABLED", new Date(clock.getTime() - 31 * 86_400_000))).id;
  unverifiedId = (await identity("unverified", "ATTENDEE", "ACTIVE", clock, false)).id;
  await identity("boundary", "ATTENDEE", "ACTIVE", new Date(clock.getTime() - 30 * 86_400_000));
  await identity("future", "ATTENDEE", "ACTIVE", new Date(clock.getTime() + 86_400_000));
  await login(attendee, owner.email);
  const event = await prisma.event.create({ data: { organizerId: profile.id, name: prefix, slug: prefix,
    ticketCategories: { create: { name: "GA", price: "100", admissionMode: "GENERAL_ADMISSION" } } },
    include: { ticketCategories: true } });
  eventId = event.id;
  for (const [index, quantity] of [2, 3, 7].entries()) {
    await prisma.booking.create({ data: { userId: index === 2 ? unverifiedId : ownerId,
      eventId, bookingReference: `${prefix}-${index}`, status: index === 2 ? "CANCELLED" : "CONFIRMED",
      subtotal: quantity * 100, totalAmount: quantity * 100, expiresAt: clock,
      items: { create: { ticketCategoryId: event.ticketCategories[0]!.id,
        quantity, unitPrice: 100, subtotal: quantity * 100 } } } });
  }
}, 30000);

afterAll(async () => {
  vi.restoreAllMocks();
  if (eventId) {
    await prisma.bookingItem.deleteMany({ where: { eventId } });
    await prisma.booking.deleteMany({ where: { eventId } });
    await prisma.ticketCategory.deleteMany({ where: { eventId } });
    await prisma.event.delete({ where: { id: eventId } });
  }
  await prisma.activityLog.deleteMany({ where: { OR: [{ userId: { in: ids } }, { entityId: { in: ids } }] } });
  await prisma.organizerProfile.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
});

it("counts new attendees at the 30-day boundary and unique attendees with confirmed bookings", async () => {
  const response = await admin.get(`${endpoint}/stats`);
  expect(response.status).toBe(200);
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(response.body.data).toEqual({ total: baseline.total + 5, active: baseline.active + 4,
    newLast30Days: baseline.newLast30Days + 3, withBookings: baseline.withBookings + 1 });
});

it("searches and paginates attendees without exposing organizer/admin accounts or secrets", async () => {
  const page1 = await admin.get(endpoint).query({ search: prefix, page: 1, pageSize: 2 });
  const page2 = await admin.get(endpoint).query({ search: prefix, page: 2, pageSize: 2 });
  expect(page1.status).toBe(200);
  expect(page1.body).toMatchObject({ total: 5, page: 1, pageSize: 2 });
  expect(page1.body.data).toHaveLength(2);
  expect(new Set([...page1.body.data, ...page2.body.data].map(row => row.id)).size).toBe(4);
  for (const row of page1.body.data) {
    expect(Object.keys(row).sort()).toEqual(["id", "userCode", "name", "email", "emailVerified", "status", "joinedAt", "avatarUrl"].sort());
  }
  const filtered = await admin.get(endpoint).query({ search: prefix.toUpperCase(), status: "disabled" });
  expect(filtered.body.total).toBe(1);
  expect(filtered.body.data[0].id).toBe(disabledId);
  const byCode = await admin.get(endpoint).query({ search: `USR-${ownerId}` });
  expect(byCode.body.total).toBe(1);
  expect(byCode.body.data[0].id).toBe(ownerId);
});

it("returns real profile and booking details and treats unverified attendees as active accounts", async () => {
  const details = await admin.get(`${endpoint}/${ownerId}`);
  expect(details.status).toBe(200);
  expect(details.body.data).toMatchObject({ id: ownerId, totalBookings: 2, ticketsPurchased: 5, emailVerified: true });
  expect(details.body.data.lastActiveAt).toBeUndefined();
  const unverified = await admin.get(`${endpoint}/${unverifiedId}`);
  expect(unverified.body.data).toMatchObject({ status: "active", emailVerified: false, totalBookings: 1, ticketsPurchased: 0 });
  for (const id of [adminId, organizerId, randomUUID()]) {
    expect((await admin.get(`${endpoint}/${id}`)).status).toBe(404);
    expect((await change(id, "disabled")).status).toBe(404);
  }
});

it("restricts every endpoint to eligible administrators", async () => {
  for (const path of ["", "/stats", "/export", `/${ownerId}`]) {
    expect((await request(app).get(`${endpoint}${path}`)).status).toBe(401);
    expect((await attendee.get(`${endpoint}${path}`)).status).toBe(403);
    expect((await organizer.get(`${endpoint}${path}`)).status).toBe(403);
  }
  expect((await attendee.patch(`${endpoint}/${ownerId}/status`).set("Origin", origin).send({ status: "disabled" })).status).toBe(403);
  await prisma.user.update({ where: { id: adminId }, data: { status: "DISABLED" } });
  try { expect((await admin.get(endpoint)).status).toBe(403); }
  finally { await prisma.user.update({ where: { id: adminId }, data: { status: "ACTIVE" } }); }
});

it("rejects pending/inactive statuses, invalid queries, extra mutation fields and foreign origins", async () => {
  for (const query of [{ status: "pending" }, { status: "inactive" }, { page: 0 }, { pageSize: 101 }, { page: 1.5 }, { role: "ADMINISTRATOR" }]) {
    expect((await admin.get(endpoint).query(query)).status).toBe(400);
  }
  expect((await admin.get(`${endpoint}/not-a-uuid`)).status).toBe(400);
  expect((await change(ownerId, "pending")).status).toBe(400);
  expect((await admin.patch(`${endpoint}/${ownerId}/status`).set("Origin", origin)
    .send({ status: "disabled", role: "ADMINISTRATOR" })).status).toBe(400);
  expect((await admin.patch(`${endpoint}/${ownerId}/status`).set("Origin", "https://untrusted.example")
    .send({ status: "disabled" })).status).toBe(403);
  expect((await admin.patch(`${endpoint}/${ownerId}/status`).send({ status: "disabled" })).status).toBe(403);
  expect((await admin.patch(`${endpoint}/${ownerId}/status`).set("Origin", origin).type("text").send("disabled")).status).toBe(415);
  const malformed = await admin.patch(`${endpoint}/${ownerId}/status`).set("Origin", origin).type("json").send("{");
  expect(malformed.status).toBe(400);
  expect(malformed.body.error.code).toBe("VALIDATION_ERROR");
});

it("returns genuine empty results and reports database failure instead of sample data", async () => {
  const empty = await admin.get(endpoint).query({ search: randomUUID() });
  expect(empty.status).toBe(200);
  expect(empty.body).toEqual({ data: [], total: 0, page: 1, pageSize: 10 });
  const unavailable = vi.spyOn(prisma.user, "count").mockImplementationOnce(() => { throw new Error("Controlled database failure"); });
  try {
    const failure = await admin.get(`${endpoint}/stats`);
    expect(failure.status).toBe(500);
    expect(failure.body.data).toBeUndefined();
    expect(failure.body.error.code).toBe("INTERNAL_ERROR");
  } finally { unavailable.mockRestore(); }
});

it("exports all matching attendees and neutralizes spreadsheet formulas", async () => {
  await prisma.user.update({ where: { id: disabledId }, data: { name: '=HYPERLINK("malicious")' } });
  const response = await admin.get(`${endpoint}/export`).query({ search: prefix, status: "disabled" });
  expect(response.status).toBe(200);
  expect(response.headers["content-type"]).toContain("text/csv");
  expect(response.text).toContain(`USR-${disabledId}`);
  expect(response.text).toContain("\"'=HYPERLINK(\"\"malicious\"\")\"");
  expect(response.text).not.toContain(`USR-${adminId}`);
  expect(response.text).not.toContain(`USR-${ownerId}`);
});

it("atomically disables/enables attendees, revokes sessions and records the administrator", async () => {
  expect((await attendee.get("/api/v1/me")).status).toBe(200);
  expect((await change(ownerId, "disabled")).body.data.status).toBe("disabled");
  expect(await prisma.session.count({ where: { userId: ownerId } })).toBe(0);
  expect((await attendee.get("/api/v1/me")).status).toBe(401);
  expect(await prisma.activityLog.findFirst({ where: { entityId: ownerId, action: "ACCOUNT_DISABLED" } }))
    .toMatchObject({ userId: adminId, metadata: { previousStatus: "ACTIVE", status: "DISABLED" } });
  expect((await change(ownerId, "active")).body.data.status).toBe("active");
  expect((await attendee.get("/api/v1/me")).status).toBe(401);
  expect(await prisma.activityLog.count({ where: { entityId: ownerId, action: "ACCOUNT_REENABLED", userId: adminId } })).toBe(1);
  await change(unverifiedId, "disabled");
  await change(unverifiedId, "active");
  expect((await prisma.user.findUniqueOrThrow({ where: { id: unverifiedId } })).emailVerified).toBe(false);
});

it("rolls back account and session changes when audit persistence fails", async () => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: ownerId } });
  await login(attendee, user.email);
  const sessionCount = await prisma.session.count({ where: { userId: ownerId } });
  // A nonexistent actor makes the real audit insert fail its foreign-key constraint.
  // This exercises the entire database transaction, including session deletion rollback.
  const { adminUsersRouter } = await import("../src/routes/admin-users.routes.js");
  const express = (await import("express")).default;
  const fixture = express();
  fixture.use(express.json());
  const fakeAuth = { api: { readOwnProfile: async () => Response.json({ data: { user: { id: randomUUID(), role: "ADMINISTRATOR" } } }) } };
  fixture.use(endpoint, adminUsersRouter(fakeAuth as unknown as Parameters<typeof adminUsersRouter>[0]));
  const response = await request(fixture).patch(`${endpoint}/${ownerId}/status`).set("Origin", origin).send({ status: "disabled" });
  expect(response.status).toBe(500);
  expect((await prisma.user.findUniqueOrThrow({ where: { id: ownerId } })).status).toBe("ACTIVE");
  expect(await prisma.session.count({ where: { userId: ownerId } })).toBe(sessionCount);
  expect((await attendee.get("/api/v1/me")).status).toBe(200);
});
