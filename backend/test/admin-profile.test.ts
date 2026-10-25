import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { hashExactPassword } from "../src/lib/exact-password.js";

const origin = process.env.FRONTEND_URL!;
const password = " admin profile fixture password ";
const prefix = `admin-profile-${randomUUID()}`;
const terms = { version: "admin-profile-fixture", documentUrl: "https://example.com/terms" };
const app = createApp({ terms, loginLimit: 1000, aggregateLimit: 10000 });
const admin = request.agent(app);
const attendee = request.agent(app);
const ids: string[] = [];
let adminId: string;
const endpoint = "/api/v1/admin/profile";

beforeAll(async () => {
  const marker = await prisma.$queryRaw<Array<{ environment: string }>>`
    SELECT environment FROM public.test_environment_marker WHERE id = 1`;
  expect(marker[0]?.environment).toBe("aventix-test");
  const hash = await hashExactPassword(password);
  for (const [role, agent] of [["ADMINISTRATOR", admin], ["ATTENDEE", attendee]] as const) {
    const id = randomUUID();
    ids.push(id);
    if (role === "ADMINISTRATOR") adminId = id;
    const email = `${prefix}-${role.toLowerCase()}@example.com`;
    await prisma.user.create({ data: { id, firstName: "Profile", lastName: "Owner", name: "Profile Owner",
      email, role, emailVerified: true, status: "ACTIVE", termsVersion: terms.version, termsAcceptedAt: new Date(),
      accounts: { create: { accountId: id, providerId: "credential", password: hash } } } });
    expect((await agent.post("/api/auth/login").set("Origin", origin).send({ email, password })).status).toBe(200);
  }
}, 30000);

afterAll(async () => {
  await prisma.activityLog.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
});

it("requires an eligible administrator and forbids arbitrary-account queries", async () => {
  expect((await request(app).get(endpoint)).status).toBe(401);
  expect((await attendee.get(endpoint)).status).toBe(403);
  expect((await admin.get(`${endpoint}?userId=${ids[1]}`)).status).toBe(400);
});

it("returns only the current administrator's public summary and actual password audit date", async () => {
  const date = new Date("2020-01-01T00:00:00Z");
  await prisma.activityLog.create({ data: { userId: adminId, entityId: adminId, entityType: "User",
    action: "PASSWORD_RESET", createdAt: date } });
  const response = await admin.get(endpoint);
  expect(response.status).toBe(200);
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(response.body.data).toMatchObject({ id: adminId, fullName: "Profile Owner", role: "admin",
    passwordChangedAt: date.toISOString(), lastLoginAt: null, twoFactorEnabled: null });
  expect(JSON.stringify(response.body)).not.toContain("password:");
  expect(Object.keys(response.body.data).sort()).toEqual(["id", "fullName", "email", "phone", "role", "roleLabel",
    "status", "avatarUrl", "lastLoginAt", "createdAt", "passwordChangedAt", "twoFactorEnabled"].sort());
});

it("persists edits through the shared current-account API and preserves read-only identity fields", async () => {
  const patch = (body: unknown) => admin.patch("/api/v1/me").set("Origin", origin).send(body);
  expect((await patch({ firstName: "  Updated  ", phoneNumber: "09171234567" })).status).toBe(200);
  expect((await admin.get(endpoint)).body.data).toMatchObject({ fullName: "Updated Owner", phone: "+639171234567" });
  expect((await patch({ firstName: "Forbidden", email: "changed@example.com" })).status).toBe(400);
  expect((await admin.get(endpoint)).body.data.fullName).toBe("Updated Owner");
  expect((await patch({ phoneNumber: null })).status).toBe(200);
  expect((await admin.get(endpoint)).body.data.phone).toBeNull();
});

it("changes passwords through the shared authenticated operation and refreshes the audit summary", async () => {
  const response = await admin.post("/api/auth/change-password").set("Origin", origin)
    .send({ currentPassword: password, newPassword: " changed admin fixture password " });
  expect(response.status).toBe(200);
  const summary = await admin.get(endpoint);
  expect(summary.status).toBe(200);
  expect(Date.parse(summary.body.data.passwordChangedAt)).toBeGreaterThan(Date.parse("2020-01-01"));
});
