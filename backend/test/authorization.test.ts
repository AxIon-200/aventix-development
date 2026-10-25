import { randomUUID } from "node:crypto";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createAuth } from "../src/lib/auth.js";
import { prisma } from "../src/lib/prisma.js";
import { hashExactPassword } from "../src/lib/exact-password.js";
import { requireRoles } from "../src/lib/authorization.js";
import { env } from "../src/config/env.js";

const roles = ["ATTENDEE", "ORGANIZER", "ADMINISTRATOR"] as const;
const password = " independent role password ";
const terms = { version: "roles-test-fixture", documentUrl: "https://example.com/test-fixture-terms" };
const emails: string[] = [];
const options = { terms, now: () => new Date("2098-01-01"), loginLimit: 10000, aggregateLimit: 10000, registrationLimit: 10000,
  sendVerificationEmail: async () => {} };
const post = (app: ReturnType<typeof createApp>, path: string, body: object) => request(app)
  .post(`/api/auth${path}`).set("Origin", process.env.FRONTEND_URL!).send(body);

// Authorization demonstration routes belong only to this test, never createApp.
function fixtureApp() {
  const app = createApp(options);
  const auth = createAuth(options);
  for (const role of roles) {
    app.get(`/test/roles/${role}`, requireRoles(auth, [role]), (_req, res) => res.json({ data: { allowed: true } }));
  }
  app.get("/test/roles/none", requireRoles(auth, []), (_req, res) => res.json({ data: { allowed: true } }));
  return app;
}

async function identity(role: typeof roles[number]) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(options.now());
  const id = randomUUID();
  const email = `roles-${randomUUID()}@example.com`;
  emails.push(email);
  await prisma.user.create({ data: { id, email, name: "Role Owner", firstName: "Role", lastName: "Owner",
    role, emailVerified: true, termsVersion: terms.version, termsAcceptedAt: options.now(),
    accounts: { create: { accountId: id, providerId: "credential", password: await hashExactPassword(password) } } } });
  if (role === "ORGANIZER") await prisma.organizerProfile.create({ data: {
    userId: id, organizationName: "Controlled approved organizer", approvalStatus: "APPROVED",
  } });
  return { id, email };
}

async function login(app: ReturnType<typeof createApp>, email: string) {
  const response = await post(app, "/login", { email, password });
  expect(response.status).toBe(200);
  return (response.headers["set-cookie"] as unknown as string[])
    .find(value => value.startsWith("better-auth.session_token="))!.split(";")[0]!;
}

afterEach(() => vi.useRealTimers());
afterAll(async () => {
  await prisma.organizerProfile.deleteMany({ where: { user: { email: { in: emails } } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.authRateLimit.deleteMany({ where: { expiresAt: { gte: new Date("2098-01-01"), lt: new Date("2098-02-01") } } });
});

it("fails closed when an organizer has no organization profile", async () => {
  const app = fixtureApp();
  const owner = await identity("ORGANIZER");
  await prisma.organizerProfile.delete({ where: { userId: owner.id } });
  const denied = await post(app, "/login", { email: owner.email, password });
  expect(denied.status).toBe(403);
  expect(denied.body.error.code).toBe("ORGANIZATION_UNAVAILABLE");
  expect(denied.headers["set-cookie"]).toBeUndefined();
});

it.each(roles)("enforces every explicit role pair and shared self-service for %s", async role => {
  const app = fixtureApp();
  const owner = await identity(role);
  const cookie = await login(app, owner.email);
  for (const permitted of roles) {
    const response = await request(app).get(`/test/roles/${permitted}`).set("Cookie", cookie);
    expect(response.status).toBe(role === permitted ? 200 : 403);
    expect(response.body).toEqual(role === permitted ? { data: { allowed: true } }
      : { error: { code: "FORBIDDEN", message: "Insufficient permission" } });
    expect(response.headers["cache-control"]).toBe("no-store");
  }
  expect((await request(app).get("/test/roles/none").set("Cookie", cookie)).status).toBe(403);
  const before = await request(app).get("/api/v1/me").set("Cookie", cookie);
  expect(before.body.data.user.role).toBe(role);
  vi.setSystemTime(new Date(options.now().getTime() + 60_000));
  expect((await request(app).get("/api/v1/me").set("Cookie", cookie)).body).toEqual(before.body);
  expect((await request(app).patch("/api/v1/me").set("Cookie", cookie)
    .set("Origin", process.env.FRONTEND_URL!).send({ firstName: "Updated" })).status).toBe(200);
  expect((await request(app).get(`/test/roles/${role}`)).status).toBe(401);
});

it("checks current server-side access gates before authorizing a matching role", async () => {
  const app = fixtureApp();
  const owner = await identity("ORGANIZER");
  const cookie = await login(app, owner.email);
  for (const { data, code } of [
    { data: { status: "DISABLED" }, code: "ACCOUNT_DISABLED" },
    { data: { status: "ACTIVE", emailVerified: false }, code: "EMAIL_VERIFICATION_REQUIRED" },
    { data: { emailVerified: true, termsAcceptedAt: null }, code: "TERMS_ACCEPTANCE_REQUIRED" },
  ]) {
    await prisma.user.update({ where: { id: owner.id }, data });
    const result = await request(app).get("/test/roles/ORGANIZER").set("Cookie", cookie);
    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe(code);
    expect(Object.keys(result.body)).toEqual(["error"]);
  }
});

it.each(roles)("preserves the fixed %s role against public and native mutation attempts", async role => {
  const app = fixtureApp();
  const owner = await identity(role);
  const cookie = await login(app, owner.email);
  for (const proposed of roles) {
    expect((await request(app).patch("/api/v1/me").set("Cookie", cookie).set("Origin", env.FRONTEND_URL)
      .send({ role: proposed, firstName: "Changed" })).status).toBe(400);
    expect((await post(app, "/register", { firstName: "Role", lastName: "Owner", email: owner.email, password,
      termsAccepted: true, termsVersion: terms.version, role: proposed })).status).toBe(400);
    expect((await post(app, "/update-user", { role: proposed }).set("Cookie", cookie)).status).toBe(404);
  }
  const profile = await request(app).get("/api/v1/me").set("Cookie", cookie);
  expect(profile.body.data.user).toMatchObject({ role, firstName: "Role" });
});

it("keeps unfinished operations unavailable and enforces roles on implemented business routes", async () => {
  const app = fixtureApp();
  const cookies: (string | undefined)[] = [undefined];
  for (const role of roles) cookies.push(await login(app, (await identity(role)).email));
  for (const [index, cookie] of cookies.entries()) {
    for (const [method, path] of [
      ["get", "/attendee/dashboard"], ["get", "/attendee/tickets"], ["get", "/attendee/bookings"],
      ["get", "/organizer/dashboard"], ["get", "/organizer/events"], ["post", "/organizer/check-in"],
      ["get", "/admin/dashboard/overview"],
    ] as const) {
      const pending = request(app)[method](`/api/v1${path}`);
      const response = await (cookie ? pending.set("Cookie", cookie) : pending);
      const attendeeRequest = path.startsWith("/attendee/");
      const dashboardRequest = path.startsWith("/admin/dashboard/");
      const expected = attendeeRequest
        ? index === 0 ? 401 : index !== roles.indexOf("ATTENDEE") + 1 ? 403 : path === "/attendee/dashboard" ? 200 : 404
        : dashboardRequest ? index === 0 ? 401 : index === roles.indexOf("ADMINISTRATOR") + 1 ? 404 : 403 : 404;
      expect(response.status, `${method} ${path}`).toBe(expected);
    }
  }
  for (const [index, cookie] of cookies.entries()) {
    for (const resource of ["organizers", "users", "events", "bookings", "payments", "payments/stats", "payments/export", "activity-logs", "activity-logs/stats", "activity-logs/export", "dashboard/stats", "dashboard/sales", "dashboard/booking-status", "dashboard/recent-events", "dashboard/recent-users", "dashboard/recent-bookings", "dashboard/export"]) {
      const pending = request(app).get(`/api/v1/admin/${resource}`);
      const response = await (cookie ? pending.set("Cookie", cookie) : pending);
      expect(response.status).toBe(index === 0 ? 401 : index === roles.indexOf("ADMINISTRATOR") + 1 ? 200 : 403);
    }
  }
}, 60000);

it("never mounts demonstration routes in the production application or native handler", async () => {
  const original = { ...env };
  try {
    env.NODE_ENV = "production";
    env.BETTER_AUTH_URL = "https://api.example.com";
    env.FRONTEND_URL = "https://app.example.com";
    const app = createApp();
    for (const path of ["/test/roles/ORGANIZER", "/test/roles/ADMINISTRATOR", "/api/v1/admin", "/api/auth/create-administrator", "/api/auth/disable", "/api/auth/enable"]) {
      expect((await request(app).get(path)).status).toBe(404);
      expect((await request(app).post(path).send({})).status).toBe(404);
    }
    const auth = createAuth({ now: () => new Date(), sendVerificationEmail: async () => {} });
    for (const path of ["/test/roles/ORGANIZER", "/api/auth/admin/set-role", "/api/auth/admin/ban-user", "/api/auth/update-user"]) {
      expect((await auth.handler(new Request(`https://api.example.com${path}`, { method: "POST" }))).status).toBe(404);
    }
  } finally { Object.assign(env, original); }
});
