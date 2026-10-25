import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { beforeAll, afterAll, it, expect, vi } from "vitest";
import { adminActivityLogsRouter } from "../src/routes/admin-activity-logs.routes.js";
import { prisma } from "../src/lib/prisma.js";
import type { createAuth } from "../src/lib/auth.js";

const prefix = `audit-${randomUUID()}`;
const users = [randomUUID(), randomUUID()];
const logs = Array.from({ length: 7 }, () => randomUUID());
const base = "/api/v1/admin/activity-logs";
const now = new Date("2026-01-01T12:00:00Z");
function fixture(role: string | null = "ADMINISTRATOR") {
  const auth = { api: { readOwnProfile: async () => role
    ? Response.json({ data: { user: { id: users[0], role } } })
    : Response.json({ error: { code: "AUTHENTICATION_REQUIRED" } }, { status: 401 }) } };
  const app = express();
  app.use(base, adminActivityLogsRouter(auth as unknown as ReturnType<typeof createAuth>, () => now));
  return app;
}
const app = fixture();
beforeAll(async () => {
  const marker = await prisma.$queryRaw<Array<{ environment: string }>>`SELECT environment FROM public.test_environment_marker WHERE id=1`;
  expect(marker[0]?.environment).toBe("aventix-test");
  for (const [i, id] of users.entries()) await prisma.user.create({ data: {
    id, name: `=${prefix}`, email: `${prefix}-${i}@example.com`, firstName: prefix, lastName: "fixture",
    emailVerified: true, role: i === 0 ? "ADMINISTRATOR" : "ATTENDEE",
  } });
  const entries = [
    { action: "ACCOUNT_DISABLED", entityType: "User", userId: users[0] },
    { action: "PASSWORD_CHANGED", entityType: "User", userId: users[1] },
    { action: "ORGANIZATION_APPROVED", entityType: "OrganizerProfile", userId: users[0] },
    { action: "EVENT_STATUS_CHANGED", entityType: "Event", userId: users[0] },
    { action: "BOOKING_CREATED", entityType: "Booking", userId: users[1] },
    { action: "BOOKING_PAYMENT_RECORDED", entityType: "Booking", userId: users[0] },
    { action: `${prefix}_SYSTEM_FAILED`, entityType: "Worker", userId: null },
  ];
  for (const [i, entry] of entries.entries()) await prisma.activityLog.create({ data: {
    ...entry, id: logs[i]!, entityId: users[1]!, createdAt: new Date(i === 6 ? "2025-12-30T00:00:00Z" : "2026-01-01T00:00:00Z"),
    metadata: { previousStatus: "ACTIVE", status: "DISABLED", secret: "must-not-be-returned" },
  } });
}, 30000);
afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.activityLog.deleteMany({ where: { id: { in: logs } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
});
it("reads persisted records, paginates ties, and returns filtered counts", async () => {
  const first = await request(app).get(base).query({ search: prefix, pageSize: 3 });
  expect(first.status).toBe(200);
  expect(first.headers["cache-control"]).toBe("no-store");
  expect(first.body).toMatchObject({ total: 7, page: 1, pageSize: 3 });
  const second = await request(app).get(base).query({ search: prefix, pageSize: 3, page: 2 });
  expect(new Set([...first.body.data, ...second.body.data].map(r => r.id)).size).toBe(6);
  expect((await request(app).get(`${base}/stats`).query({ search: prefix })).body)
    .toEqual({ total: 7, last24Hours: 6, adminActions: 4, failed: 1 });
  for (const category of ["auth", "user", "organizer", "event", "booking", "payment", "system"]) {
    const result = await request(app).get(base).query({ search: prefix, category });
    expect(result.body.total, category).toBe(1);
    expect(result.body.data[0].category).toBe(category);
  }
  expect((await request(app).get(base).query({ search: prefix, result: "success" })).body.total).toBe(6);
  expect((await request(app).get(`${base}/stats`).query({ search: prefix, result: "failed" })).body)
    .toEqual({ total: 1, last24Hours: 0, adminActions: 0, failed: 1 });
});
it("preserves inclusive date boundaries and applies them to statistics and CSV", async () => {
  const query = { search: prefix, from: "2026-01-01T00:00:00.000Z", to: "2026-01-01T00:00:00.000Z" };
  expect((await request(app).get(base).query(query)).body.total).toBe(6);
  expect((await request(app).get(`${base}/stats`).query(query)).body.total).toBe(6);
  const csv = await request(app).get(`${base}/export`).query(query);
  expect(csv.status).toBe(200);
  expect(csv.headers["content-type"]).toContain("text/csv");
  expect(csv.text.trim().split("\r\n")).toHaveLength(7);
  expect(csv.text).toContain(`"'=${prefix}"`);
  expect(csv.text).not.toContain("SYSTEM_FAILED");
});
it("returns recorded details and searches display codes, actors, actions and targets", async () => {
  const detail = await request(app).get(`${base}/${logs[0]}`);
  expect(detail.body).toMatchObject({ logCode: `LOG-${logs[0]}`, actorRole: "admin", category: "user", result: "success",
    actorEmail: `${prefix}-0@example.com`, changes: [{ field: "Status", from: "ACTIVE", to: "DISABLED" }], ipAddress: null, userAgent: null });
  expect(JSON.stringify(detail.body)).not.toContain("must-not-be-returned");
  expect((await request(app).get(base).query({ search: `LOG-${logs[0]}` })).body.total).toBe(1);
  expect((await request(app).get(base).query({ search: users[1] })).body.total).toBe(7);
  expect((await request(app).get(base).query({ search: `${prefix}-0@example.com` })).body.total).toBe(4);
  expect((await request(app).get(base).query({ search: "password changed" })).body.data.some(r => r.id === logs[1])).toBe(true);
  expect((await request(app).get(`${base}/${randomUUID()}`)).status).toBe(404);
});
it("validates all inputs and denies unauthenticated and nonadministrator access", async () => {
  for (const query of [{ page: 0 }, { pageSize: 101 }, { category: "unknown" }, { result: "unknown" }, { search: "x".repeat(101) },
    { from: "2026-02-30" }, { from: "2026-01-02T00:00:00Z", to: "2026-01-01T00:00:00Z" }, { extra: "ignored" }])
    expect((await request(app).get(base).query(query)).status).toBe(400);
  for (const path of ["/stats", "/export"]) {
    expect((await request(app).get(base + path).query({ from: "invalid" })).status).toBe(400);
  }
  expect((await request(app).get(`${base}/not-an-id`)).status).toBe(400);
  for (const path of ["", "/stats", "/export", `/${logs[0]}`]) {
    expect((await request(fixture(null)).get(base + path)).status).toBe(401);
    for (const role of ["ATTENDEE", "ORGANIZER"])
      expect((await request(fixture(role)).get(base + path)).status).toBe(403);
  }
});
it("keeps private database failures out of responses", async () => {
  vi.spyOn(prisma.activityLog, "findUnique").mockRejectedValueOnce(new Error("private database error"));
  const result = await request(app).get(`${base}/${logs[0]}`);
  expect(result.status).toBe(500);
  expect(result.body.error.message).toBe("Could not load log details");
});
