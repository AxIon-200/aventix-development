import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import type { VerificationMessage } from "../src/lib/verification-email.js";
import { hashPassword } from "better-auth/crypto";
import { hashExactPassword } from "../src/lib/exact-password.js";
import { createAuth } from "../src/lib/auth.js";
import { env } from "../src/config/env.js";

const terms = { version: "profile-test-fixture", documentUrl: "https://example.com/test-fixture-terms" };
const password = " exact profile password ";
const emails: string[] = [];
const post = (app: ReturnType<typeof createApp>, path: string, body: unknown) => request(app)
  .post(`/api/auth${path}`).set("Origin", process.env.FRONTEND_URL!).send(body);
const read = (app: ReturnType<typeof createApp>, cookie: string) => request(app)
  .get("/api/v1/me").set("Cookie", cookie);
const patch = (app: ReturnType<typeof createApp>, cookie: string, body: unknown) => request(app)
  .patch("/api/v1/me").set("Origin", process.env.FRONTEND_URL!).set("Cookie", cookie)
  .set("Content-Type", "application/json").send(JSON.stringify(body));

async function fixture(role = "ATTENDEE") {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2095-01-01T00:00:00Z"));
  const messages: VerificationMessage[] = [];
  const email = `profile-${randomUUID()}@example.com`;
  emails.push(email);
  const options = { terms, registrationLimit: 10000, aggregateLimit: 10000,
    loginLimit: 10000, verificationLimit: 10000,
    sendVerificationEmail: async (message: VerificationMessage) => { messages.push(message); } };
  const app = createApp(options);
  if (role === "ATTENDEE") {
    expect((await post(app, "/register", { firstName: "Profile", lastName: "Owner", email, password,
      phoneNumber: "09171234567", termsAccepted: true, termsVersion: terms.version })).status).toBe(201);
    const token = new URLSearchParams(new URL(messages[0]!.url).hash.slice(1)).get("token")!;
    expect((await post(app, "/verify-email", { token, currentPassword: password })).status).toBe(200);
  } else {
    // Privileged identities are created separately, never by converting an account's role.
    const id = randomUUID();
    await prisma.user.create({ data: { id, firstName: "Profile", lastName: "Owner", name: "Profile Owner", email,
      role, status: "ACTIVE", emailVerified: true, phoneNumber: "+639171234567",
      termsVersion: terms.version, termsAcceptedAt: new Date(),
      accounts: { create: { accountId: id, providerId: "credential", password: await hashExactPassword(password) } } } });
    if (role === "ORGANIZER") await prisma.organizerProfile.create({ data: {
      userId: id, organizationName: "Controlled approved organizer", approvalStatus: "APPROVED",
    } });
  }
  const login = await post(app, "/login", { email, password });
  expect(login.status).toBe(200);
  const cookie = (login.headers["set-cookie"] as unknown as string[])
    .find(value => value.startsWith("better-auth.session_token="))!.split(";")[0]!;
  return { app, options, email, cookie };
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
afterAll(async () => {
  await prisma.organizerProfile.deleteMany({ where: { user: { email: { in: emails } } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.emailCooldown.deleteMany({ where: { email: { in: emails } } });
  await prisma.authRateLimit.deleteMany({ where: { expiresAt: { gte: new Date("2095-01-01"), lt: new Date("2095-02-01") } } });
});

describe("Own profile editing", () => {
  it("counts trimmed names in Unicode code points and preserves spelling, punctuation, and internal whitespace", async () => {
    const f = await fixture();
    const longest = "😀".repeat(100);
    const result = await patch(f.app, f.cookie, { firstName: `  ${longest}  `, lastName: " e\u0301  O’Neil-李 " });
    expect(result.status).toBe(200);
    expect(result.body.data.user).toMatchObject({ firstName: longest, lastName: "e\u0301  O’Neil-李",
      name: `${longest} e\u0301  O’Neil-李` });
    expect((await patch(f.app, f.cookie, { firstName: "李", lastName: "😀" })).status).toBe(200);
    expect((await read(f.app, f.cookie)).body.data.user.name).toBe("李 😀");
  });

  it("rejects invalid and empty updates in full without changing any public profile field", async () => {
    const f = await fixture();
    const before = await read(f.app, f.cookie);
    vi.setSystemTime(new Date("2095-01-01T00:02:00Z"));
    const invalid = [
      {}, [], null, "name", 1, true,
      ...["", "   ", "😀".repeat(101), "e\u0301".repeat(51), "\ud800", "bad\u0000name", null, 7, {}, []]
        .flatMap(value => [{ firstName: value, lastName: "Valid" }, { firstName: "Valid", lastName: value }]),
      ...["", "0917 1234567", "0917-1234567", " 09171234567", "+639171234567 ", "+14155552671",
        "021234567", "0917123456", "091712345678", "０９１７１２３４５６７", 9171234567, false, {}, []]
        .map(phoneNumber => ({ firstName: "Valid", phoneNumber })),
    ];
    for (const body of invalid) {
      const result = await patch(f.app, f.cookie, body).set("Content-Type", "application/json");
      expect(result.status).toBe(400);
      expect(result.body).toEqual({ error: { code: "VALIDATION_ERROR", message: "Invalid profile input" } });
      expect(result.headers["set-cookie"]).toBeUndefined();
      expect((await read(f.app, f.cookie)).body).toEqual(before.body);
    }
  }, 30000);

  it("rejects every protected or unknown field even alongside permitted edits", async () => {
    const f = await fixture();
    const before = await read(f.app, f.cookie);
    vi.setSystemTime(new Date("2095-01-01T00:03:00Z"));
    for (const [key, value] of Object.entries({
      id: randomUUID(), userId: randomUUID(), role: "ADMINISTRATOR", status: "DISABLED", email: "other@example.com",
      image: "https://example.com/image.png", emailVerified: true, name: "Derived override", termsAccepted: true,
      termsVersion: "invented", termsAcceptedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), password: "submitted-secret", token: "submitted-token",
      accounts: [], sessions: [], lifecycleLock: "override", unknown: "value", ["__proto__"]: "override",
    })) {
      const result = await patch(f.app, f.cookie, { firstName: "Valid", [key]: value });
      expect(result.status).toBe(400);
      expect(result.body).toEqual({ error: { code: "VALIDATION_ERROR", message: "Invalid profile input" } });
      expect((await read(f.app, f.cookie)).body).toEqual(before.body);
    }
  }, 30000);

  it.each(["ORGANIZER", "ADMINISTRATOR"])("permits self-service edits for an eligible %s", async role => {
    const f = await fixture(role);
    const result = await patch(f.app, f.cookie, { lastName: "Updated" });
    expect(result.status).toBe(200);
    expect(result.body.data.user).toMatchObject({ email: f.email, role, name: "Profile Updated" });
    expect((await read(f.app, f.cookie)).body).toEqual(result.body);
  });

  it("isolates different accounts and ignores another account's ID in the query", async () => {
    const a = await fixture();
    const b = await fixture();
    const before = await read(b.app, b.cookie);
    const id = before.body.data.user.id;
    const rejected = await patch(a.app, a.cookie, { userId: id, firstName: "Other" });
    expect(rejected.status).toBe(400);
    const updated = await request(a.app).patch(`/api/v1/me?userId=${id}`)
      .set("Origin", env.FRONTEND_URL).set("Cookie", a.cookie).send({ firstName: "Own" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.user).toMatchObject({ email: a.email, firstName: "Own" });
    expect((await read(b.app, b.cookie)).body).toEqual(before.body);
    expect((await request(a.app).patch(`/api/v1/me/${id}`).set("Cookie", a.cookie)
      .set("Origin", env.FRONTEND_URL).send({ firstName: "Other" })).status).toBe(404);
  });

  it("checks current status, verification, consent, and credential gates on existing sessions", async () => {
    const f = await fixture();
    for (const { data, code } of [
      { data: { status: "DISABLED", emailVerified: false }, code: "ACCOUNT_DISABLED" },
      { data: { status: "ACTIVE", emailVerified: false }, code: "EMAIL_VERIFICATION_REQUIRED" },
      { data: { emailVerified: true, termsAcceptedAt: null }, code: "TERMS_ACCEPTANCE_REQUIRED" },
      { data: { termsAcceptedAt: new Date(), termsVersion: null }, code: "TERMS_ACCEPTANCE_REQUIRED" },
    ]) {
      await prisma.user.update({ where: { email: f.email }, data });
      const denied = await patch(f.app, f.cookie, { firstName: "Forbidden" });
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe(code);
      expect(Object.keys(denied.body)).toEqual(["error"]);
      expect(denied.headers["set-cookie"]).toBeUndefined();
    }
    await prisma.user.update({ where: { email: f.email }, data: { termsVersion: "genuine-historical-version" } });
    const exact = await prisma.account.findFirstOrThrow({ where: { user: { email: f.email }, providerId: "credential" } });
    for (const { password: hash, code, status } of [
      { password: await hashPassword(password), code: "PASSWORD_RESET_REQUIRED", status: 403 },
      { password: null, code: "AUTHENTICATION_REQUIRED", status: 401 },
      { password: "aventix-scrypt-v1$corrupt", code: "AUTHENTICATION_REQUIRED", status: 401 },
    ]) {
      await prisma.account.update({ where: { id: exact.id }, data: { password: hash } });
      const denied = await patch(f.app, f.cookie, { firstName: "Forbidden" });
      expect(denied.status).toBe(status);
      expect(denied.body.error.code).toBe(code);
    }
    await prisma.account.update({ where: { id: exact.id }, data: { password: exact.password } });
    expect((await read(f.app, f.cookie)).body.data.user).toMatchObject({ firstName: "Profile", name: "Profile Owner" });
  });

  it("rejects missing, forged, expired, and revoked sessions without renewing their lifetime", async () => {
    const f = await fixture();
    const missing = await request(f.app).patch("/api/v1/me").set("Origin", env.FRONTEND_URL).send({ firstName: "No" });
    expect(missing.status).toBe(401);
    for (const cookie of ["", "better-auth.session_token=forged"]) {
      const denied = await patch(f.app, cookie, { firstName: "No" });
      expect(denied.status).toBe(401);
      expect(denied.body).toEqual({ error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication required" } });
    }
    vi.setSystemTime(new Date("2095-01-07T23:59:59.999Z"));
    expect((await patch(f.app, f.cookie, { firstName: "At boundary" })).status).toBe(200);
    vi.setSystemTime(new Date("2095-01-08T00:00:00Z"));
    expect((await patch(f.app, f.cookie, { firstName: "Expired" })).status).toBe(401);
    // Even moving the clock back cannot resurrect a deleted session.
    vi.setSystemTime(new Date("2095-01-01T00:00:00Z"));
    await prisma.session.deleteMany({ where: { user: { email: f.email } } });
    expect((await patch(f.app, f.cookie, { firstName: "Revoked" })).status).toBe(401);
    const login = await post(f.app, "/login", { email: f.email, password });
    expect(login.body.data.user.firstName).toBe("At boundary");
  });

  it("serializes concurrent partial edits so neither name nor the derived name is lost", async () => {
    const f = await fixture();
    const results = await Promise.all([
      patch(f.app, f.cookie, { firstName: "Concurrent" }),
      patch(f.app, f.cookie, { lastName: "Edits" }),
    ]);
    for (const result of results) expect(result.status).toBe(200);
    const saved = await read(f.app, f.cookie);
    expect(saved.body.data.user).toMatchObject({ firstName: "Concurrent", lastName: "Edits", name: "Concurrent Edits" });
  });

  it.each(["disable", "revoke"])("rechecks access after waiting for an in-flight %s", async action => {
    const f = await fixture();
    let pending: Promise<request.Response> | undefined;
    await prisma.$transaction(async tx => {
      const [{ pid } = { pid: 0 }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
      await tx.user.update({ where: { email: f.email }, data: {
        lifecycleLock: randomUUID(), ...(action === "disable" ? { status: "DISABLED" } : {}),
      } });
      pending = patch(f.app, f.cookie, { firstName: "Blocked" }).then(response => response);
      const deadline = performance.now() + 4000;
      let blocked = false;
      while (performance.now() < deadline) {
        const [result] = await tx.$queryRaw<Array<{ waiting: boolean }>>`
          SELECT EXISTS(SELECT 1 FROM pg_locks WHERE NOT granted AND ${pid} = ANY(pg_blocking_pids(pid))) AS waiting
        `;
        if (result?.waiting) { blocked = true; break; }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(blocked).toBe(true);
      if (action === "revoke") await tx.session.deleteMany({ where: { user: { email: f.email } } });
    }, { timeout: 10000 });
    const denied = await pending!;
    expect(denied.status).toBe(action === "disable" ? 403 : 401);
    expect(denied.body.error.code).toBe(action === "disable" ? "ACCOUNT_DISABLED" : "AUTHENTICATION_REQUIRED");
    await prisma.user.update({ where: { email: f.email }, data: { status: "ACTIVE" } });
    const login = await post(f.app, "/login", { email: f.email, password });
    expect(login.body.data.user).toMatchObject({ firstName: "Profile", name: "Profile Owner" });
  });

  it("rolls back all fields and returns a safe error when database persistence fails", async () => {
    const f = await fixture();
    const before = await read(f.app, f.cookie);
    const id: string = before.body.data.user.id;
    const constraint = `profile_test_${randomUUID().replaceAll("-", "")}`;
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Unexpected fixture ID");
    await prisma.$executeRawUnsafe(`ALTER TABLE public.user ADD CONSTRAINT ${constraint} CHECK (id <> '${id}'::uuid OR "firstName" <> 'Persistence failure') NOT VALID`);
    try {
      const result = await patch(f.app, f.cookie, { firstName: "Persistence failure", lastName: "Changed", phoneNumber: null });
      expect(result.status).toBe(500);
      expect(result.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed" } });
      expect(result.headers["set-cookie"]).toBeUndefined();
      expect((await read(f.app, f.cookie)).body).toEqual(before.body);
    } finally {
      await prisma.$executeRawUnsafe(`ALTER TABLE public.user DROP CONSTRAINT ${constraint}`);
    }
    expect((await patch(f.app, f.cookie, { firstName: "Available again" })).status).toBe(200);
  });

  it("requires the exact Origin and JSON and returns safe errors for malformed or oversized requests", async () => {
    const f = await fixture();
    const before = await read(f.app, f.cookie);
    for (const origin of [undefined, "null", "https://untrusted.example", `${env.FRONTEND_URL}.evil.example`]) {
      const pending = request(f.app).patch("/api/v1/me").set("Cookie", f.cookie).send({ firstName: "Blocked" });
      const result = await (origin === undefined ? pending : pending.set("Origin", origin));
      expect(result.status).toBe(403);
      expect(result.body).toEqual({ error: { code: "ORIGIN_NOT_ALLOWED", message: "Request origin is not allowed" } });
    }
    for (const type of ["form", "text"]) {
      const result = await request(f.app).patch("/api/v1/me").set("Cookie", f.cookie)
        .set("Origin", env.FRONTEND_URL).type(type).send("firstName=Blocked");
      expect(result.status).toBe(415);
      expect(result.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    }
    const malformed = await request(f.app).patch("/api/v1/me").set("Cookie", f.cookie)
      .set("Origin", env.FRONTEND_URL).set("Content-Type", "application/json").send('{"password":"submitted-secret",');
    expect(malformed.status).toBe(400);
    expect(malformed.body).toEqual({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } });
    const oversized = await patch(f.app, f.cookie, { firstName: "x".repeat(17000) });
    expect(oversized.status).toBe(413);
    expect(oversized.body).toEqual({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" } });
    const method = await request(f.app).put("/api/v1/me");
    expect(method.status).toBe(405);
    expect(method.headers.allow).toBe("GET, PATCH");
    for (const path of ["/api/v1/me/", "/api/v1/ME"]) {
      expect((await request(f.app).patch(path).set("Cookie", f.cookie).set("Origin", env.FRONTEND_URL)
        .send({ firstName: "Blocked" })).status).toBe(404);
    }
    expect((await read(f.app, f.cookie)).body).toEqual(before.body);
  });

  it("blocks native and internal profile mutation routes through Express and the Better Auth handler", async () => {
    const f = await fixture();
    const before = await read(f.app, f.cookie);
    const auth = createAuth(f.options);
    for (const path of ["/update-user", "/update-user/", "/UPDATE-USER", "/%75pdate-user", "/change-email",
      "/update-own-profile", "/own-profile"]) {
      const body = { firstName: "Blocked", name: "Override", role: "ADMINISTRATOR" };
      const express = await post(f.app, path, body).set("Cookie", f.cookie);
      expect(express.status).toBe(404);
      expect(express.body).toEqual({ error: { code: "NOT_FOUND", message: "Route not found" } });
      const direct = await auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth${path}`, {
        method: "POST", headers: { Origin: env.FRONTEND_URL, Cookie: f.cookie, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }));
      expect(direct.status).toBe(404);
      expect(await direct.json()).toEqual(express.body);
    }
    expect((await read(f.app, f.cookie)).body).toEqual(before.body);
  });

  it("updates either or both names, normalizes phones, and clears only an explicitly null phone", async () => {
    const f = await fixture();
    for (const { body, expected } of [
      { body: { lastName: "  Dela  Cruz-Santos  " }, expected: { firstName: "Profile", lastName: "Dela  Cruz-Santos",
        name: "Profile Dela  Cruz-Santos", phoneNumber: "+639171234567" } },
      { body: { firstName: "李", lastName: "O’Neil", phoneNumber: "09991234567" },
        expected: { firstName: "李", lastName: "O’Neil", name: "李 O’Neil", phoneNumber: "+639991234567" } },
      { body: { phoneNumber: "+639001234567" }, expected: { name: "李 O’Neil", phoneNumber: "+639001234567" } },
      { body: { phoneNumber: null }, expected: { name: "李 O’Neil", phoneNumber: null } },
      { body: { lastName: "Owner" }, expected: { name: "李 Owner", phoneNumber: null } },
    ]) {
      const result = await patch(f.app, f.cookie, body);
      expect(result.status).toBe(200);
      expect(result.body.data.user).toMatchObject(expected);
      expect((await read(f.app, f.cookie)).body).toEqual(result.body);
    }
  });

  it("persists a partial name edit, preserves omitted fields, and returns only the approved profile", async () => {
    const f = await fixture();
    const before = await read(f.app, f.cookie);
    vi.setSystemTime(new Date("2095-01-01T00:01:00Z"));
    const result = await patch(f.app, f.cookie, { firstName: "  María  " });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ data: { user: { ...before.body.data.user,
      firstName: "María", name: "María Owner", updatedAt: "2095-01-01T00:01:00.000Z" } } });
    expect(Object.keys(result.body.data.user).sort()).toEqual([
      "id", "firstName", "lastName", "name", "email", "phoneNumber", "role", "status", "emailVerified",
      "termsVersion", "termsAcceptedAt", "createdAt", "updatedAt",
    ].sort());
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(result.headers["set-cookie"]).toBeUndefined();
    expect((await read(createApp(f.options), f.cookie)).body).toEqual(result.body);
  });
});
