import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import type { VerificationMessage } from "../src/lib/verification-email.js";
import { createAuth } from "../src/lib/auth.js";
import { hashPassword } from "better-auth/crypto";
import { hashExactPassword } from "../src/lib/exact-password.js";

const terms = { version: "password-change-test-fixture", documentUrl: "https://example.com/test-fixture-terms" };
const password = " exact change password \u00e9 ";
const replacement = " new change password \u00e9 ";
const emails: string[] = [];
const post = (app: ReturnType<typeof createApp>, path: string, body: unknown) => request(app)
  .post(`/api/auth${path}`).set("Origin", process.env.FRONTEND_URL!)
  .set("Content-Type", "application/json").send(JSON.stringify(body));
const tokenFrom = (message: VerificationMessage) => new URLSearchParams(new URL(message.url).hash.slice(1)).get("token")!;
const cookieFrom = (response: request.Response) => (response.headers["set-cookie"] as unknown as string[])
  .find(value => value.startsWith("better-auth.session_token="))!.split(";")[0]!;
const me = (app: ReturnType<typeof createApp>, cookie: string) => request(app).get("/api/v1/me").set("Cookie", cookie);
const change = (app: ReturnType<typeof createApp>, cookie: string, body: unknown = { currentPassword: password, newPassword: replacement }) =>
  post(app, "/change-password", body).set("Cookie", cookie);

async function fixture(role = "ATTENDEE") {
  let time = new Date("2097-01-01T00:00:00Z");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(time);
  const verification: VerificationMessage[] = [];
  const recovery: VerificationMessage[] = [];
  const email = `password-change-${randomUUID()}@example.com`;
  emails.push(email);
  const options = { terms, now: () => time, registrationLimit: 10000, aggregateLimit: 10000,
    verificationLimit: 10000, loginLimit: 10000, recoveryLimit: 10000, resetLimit: 10000, passwordChangeLimit: 10000,
    sendVerificationEmail: async (message: VerificationMessage) => { verification.push(message); },
    sendPasswordResetEmail: async (message: VerificationMessage) => { recovery.push(message); } };
  const app = createApp(options);
  if (role === "ATTENDEE") {
    expect((await post(app, "/register", { firstName: "Password", lastName: "Owner", email, password,
      termsAccepted: true, termsVersion: terms.version })).status).toBe(201);
    expect((await post(app, "/verify-email", { token: tokenFrom(verification[0]!), currentPassword: password })).status).toBe(200);
  } else {
    // Separate trusted fixtures; existing account roles are never converted.
    const id = randomUUID();
    await prisma.user.create({ data: { id, firstName: "Password", lastName: "Owner", name: "Password Owner", email,
      role, status: "ACTIVE", emailVerified: true, termsVersion: terms.version, termsAcceptedAt: time,
      accounts: { create: { accountId: id, providerId: "credential", password: await hashExactPassword(password) } } } });
    if (role === "ORGANIZER") await prisma.organizerProfile.create({ data: {
      userId: id, organizationName: "Controlled approved organizer", approvalStatus: "APPROVED",
    } });
  }
  const login = await post(app, "/login", { email, password });
  expect(login.status).toBe(200);
  const cookie = cookieFrom(login);
  const user = (await me(app, cookie)).body.data.user as { id: string };
  return { app, options, email, user, cookie, recovery,
    advance: (ms: number) => { time = new Date(time.getTime() + ms); vi.setSystemTime(time); } };
}

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
afterAll(async () => {
  const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
  await prisma.activityLog.deleteMany({ where: { userId: { in: users.map(user => user.id) } } });
  await prisma.organizerProfile.deleteMany({ where: { userId: { in: users.map(user => user.id) } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.emailCooldown.deleteMany({ where: { email: { in: emails } } });
  await prisma.authRateLimit.deleteMany({ where: { expiresAt: { gte: new Date("2097-01-01"), lt: new Date("2097-02-01") } } });
});

describe("Authenticated password change", { timeout: 60_000 }, () => {
  it("revokes other sessions and all reset links while retaining the requesting session and original expiry", async () => {
    const f = await fixture();
    const original = await prisma.session.findFirstOrThrow({ where: { userId: f.user.id } });
    const otherCookies = [];
    for (let index = 0; index < 2; index++) {
      otherCookies.push(cookieFrom(await post(f.app, "/login", { email: f.email, password })));
    }
    await post(f.app, "/request-password-reset", { email: f.email });
    f.advance(60_000);
    await post(f.app, "/request-password-reset", { email: f.email });
    expect(f.recovery).toHaveLength(2);
    const changed = await change(f.app, f.cookie);
    expect(changed.status).toBe(200);
    expect(changed.body).toEqual({ data: { passwordChanged: true } });
    expect(changed.headers["set-cookie"]).toBeUndefined();
    expect((await me(f.app, f.cookie)).status).toBe(200);
    for (const cookie of otherCookies) expect((await me(f.app, cookie)).status).toBe(401);
    const sessions = await prisma.session.findMany({ where: { userId: f.user.id } });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.id).toBe(original.id);
    expect(sessions[0]?.token === original.token).toBe(true);
    expect(sessions[0]?.expiresAt).toEqual(original.expiresAt);
    expect(sessions[0]?.createdAt).toEqual(original.createdAt);
    for (const message of f.recovery) {
      const replay = await post(f.app, "/reset-password", { token: tokenFrom(message), newPassword: password });
      expect(replay.status).toBe(400);
      expect(replay.body).toEqual({ error: { code: "LINK_INVALID_OR_EXPIRED", message: "Link is invalid or expired" } });
    }
    const audits = await prisma.activityLog.findMany({ where: { userId: f.user.id } });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: "PASSWORD_CHANGED", entityType: "User", entityId: f.user.id,
      createdAt: f.options.now(), metadata: null });
    expect((await post(f.app, "/login", { email: f.email, password })).status).toBe(401);
    expect((await post(f.app, "/login", { email: f.email, password: replacement })).status).toBe(200);
    f.advance(604800_000 - 60_001);
    expect((await me(f.app, f.cookie)).status).toBe(200);
    f.advance(1);
    expect((await me(f.app, f.cookie)).status).toBe(401);
  });

  it("leaves credentials, sessions and reset links unchanged for wrong passwords, reuse and invalid input", async () => {
    const f = await fixture();
    const otherCookie = cookieFrom(await post(f.app, "/login", { email: f.email, password }));
    await post(f.app, "/request-password-reset", { email: f.email });
    const attempts = [
      { body: { currentPassword: "incorrect current password", newPassword: replacement }, status: 401, code: "CURRENT_PASSWORD_INCORRECT" },
      { body: { currentPassword: password.trim(), newPassword: replacement }, status: 401, code: "CURRENT_PASSWORD_INCORRECT" },
      { body: { currentPassword: password.normalize("NFD"), newPassword: replacement }, status: 401, code: "CURRENT_PASSWORD_INCORRECT" },
      { body: { currentPassword: password, newPassword: password }, status: 400, code: "PASSWORD_REUSE" },
      ...["x".repeat(14), "\u{1f600}".repeat(129), "invalid unicode \ud800", null, 42, {}, []]
        .map(newPassword => ({ body: { currentPassword: password, newPassword }, status: 400, code: "VALIDATION_ERROR" })),
      ...["", "\u{1f600}".repeat(129), "invalid unicode \ud800", null, false]
        .map(currentPassword => ({ body: { currentPassword, newPassword: replacement }, status: 400, code: "VALIDATION_ERROR" })),
      ...[null, [], {}, { currentPassword: password }, { newPassword: replacement },
        ...[false, true].map(revokeOtherSessions => ({ currentPassword: password, newPassword: replacement, revokeOtherSessions })),
        { currentPassword: password, newPassword: replacement, userId: randomUUID() }]
        .map(body => ({ body, status: 400, code: "VALIDATION_ERROR" })),
    ];
    for (const { body, status, code } of attempts) {
      const result = await change(f.app, f.cookie, body);
      expect(result.status).toBe(status);
      expect(result.body.error.code).toBe(code);
      expect(Object.keys(result.body.error).sort()).toEqual(["code", "message"]);
      expect(result.headers["set-cookie"]).toBeUndefined();
    }
    for (const cookie of [f.cookie, otherCookie]) expect((await me(f.app, cookie)).status).toBe(200);
    expect((await post(f.app, "/login", { email: f.email, password })).status).toBe(200);
    expect((await post(f.app, "/login", { email: f.email, password: replacement })).status).toBe(401);
    expect(await prisma.activityLog.count({ where: { userId: f.user.id } })).toBe(0);
    expect((await post(f.app, "/reset-password", { token: tokenFrom(f.recovery[0]!), newPassword: replacement })).status).toBe(200);
  });

  it.each([15, 128])("accepts %i Unicode code points and preserves the exact new password", async length => {
    const f = await fixture();
    const exact = ` ${"\u{1f600}".repeat(length - 4)}e\u0301 `;
    expect((await change(f.app, f.cookie, { currentPassword: password, newPassword: exact })).status).toBe(200);
    for (const altered of [exact.trim(), exact.normalize("NFC"), password]) {
      expect((await post(f.app, "/login", { email: f.email, password: altered })).status).toBe(401);
    }
    expect((await post(f.app, "/login", { email: f.email, password: exact })).status).toBe(200);
  });

  it.each(["ORGANIZER", "ADMINISTRATOR"])("allows an eligible %s to change their own password", async role => {
    const f = await fixture(role);
    expect((await change(f.app, f.cookie)).status).toBe(200);
    expect((await me(f.app, f.cookie)).body.data.user.role).toBe(role);
    expect((await post(f.app, "/login", { email: f.email, password: replacement })).status).toBe(200);
  });

  it("requires a valid unexpired session and rechecks current account eligibility", async () => {
    const f = await fixture();
    for (const cookie of ["", "better-auth.session_token=forged"]) {
      const denied = await change(f.app, cookie);
      expect(denied.status).toBe(401);
      expect(denied.body).toEqual({ error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication required" } });
    }
    for (const { data, code } of [
      { data: { status: "DISABLED" }, code: "ACCOUNT_DISABLED" },
      { data: { status: "ACTIVE", emailVerified: false }, code: "EMAIL_VERIFICATION_REQUIRED" },
      { data: { emailVerified: true, termsAcceptedAt: null, termsVersion: null }, code: "TERMS_ACCEPTANCE_REQUIRED" },
    ]) {
      await prisma.user.update({ where: { id: f.user.id }, data });
      const denied = await change(f.app, f.cookie);
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe(code);
    }
    await prisma.user.update({ where: { id: f.user.id }, data: { termsAcceptedAt: f.options.now(), termsVersion: terms.version } });
    const credential = await prisma.account.findFirstOrThrow({ where: { userId: f.user.id, providerId: "credential" } });
    for (const { hash, status, code } of [
      { hash: await hashPassword(password), status: 403, code: "PASSWORD_RESET_REQUIRED" },
      { hash: null, status: 401, code: "AUTHENTICATION_REQUIRED" },
      { hash: "aventix-scrypt-v1$corrupt", status: 401, code: "AUTHENTICATION_REQUIRED" },
    ]) {
      await prisma.account.update({ where: { id: credential.id }, data: { password: hash } });
      const denied = await change(f.app, f.cookie);
      expect(denied.status).toBe(status);
      expect(denied.body.error.code).toBe(code);
    }
    await prisma.account.update({ where: { id: credential.id }, data: { password: credential.password } });
    f.advance(604800_000);
    expect((await change(f.app, f.cookie)).status).toBe(401);
    expect(await prisma.activityLog.count({ where: { userId: f.user.id } })).toBe(0);
    expect((await post(f.app, "/login", { email: f.email, password })).status).toBe(200);
  });

  it("rolls back credentials, link invalidation and session revocation when the audit cannot persist", async () => {
    const f = await fixture();
    const otherCookie = cookieFrom(await post(f.app, "/login", { email: f.email, password }));
    await post(f.app, "/request-password-reset", { email: f.email });
    const constraint = `password_change_test_${randomUUID().replaceAll("-", "")}`;
    if (!/^[a-f0-9-]{36}$/.test(f.user.id)) throw new Error("Unexpected fixture ID");
    await prisma.$executeRawUnsafe(`ALTER TABLE public."ActivityLog" ADD CONSTRAINT ${constraint} CHECK ("userId" <> '${f.user.id}'::uuid) NOT VALID`);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result = await change(f.app, f.cookie);
      expect(result.status).toBe(500);
      expect(result.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed" } });
      expect(result.headers["set-cookie"]).toBeUndefined();
      for (const cookie of [f.cookie, otherCookie]) expect((await me(f.app, cookie)).status).toBe(200);
      expect((await post(f.app, "/login", { email: f.email, password })).status).toBe(200);
      expect((await post(f.app, "/login", { email: f.email, password: replacement })).status).toBe(401);
      expect(await prisma.activityLog.count({ where: { userId: f.user.id } })).toBe(0);
      expect(log).not.toHaveBeenCalled();
    } finally {
      await prisma.$executeRawUnsafe(`ALTER TABLE public."ActivityLog" DROP CONSTRAINT ${constraint}`);
    }
    // The original reset link still works after the failed change.
    expect((await post(f.app, "/reset-password", { token: tokenFrom(f.recovery[0]!), newPassword: replacement })).status).toBe(200);
    for (const cookie of [f.cookie, otherCookie]) expect((await me(f.app, cookie)).status).toBe(401);
  });

  it("allows only one concurrent change and prevents old-password login from retaining access", async () => {
    const f = await fixture();
    const otherCookie = cookieFrom(await post(f.app, "/login", { email: f.email, password }));
    const [first, second, login] = await Promise.all([
      change(f.app, f.cookie), change(createApp(f.options), otherCookie),
      post(createApp(f.options), "/login", { email: f.email, password }),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 401]);
    const winner = first.status === 200 ? f.cookie : otherCookie;
    const loser = first.status === 200 ? otherCookie : f.cookie;
    expect((await me(f.app, winner)).status).toBe(200);
    expect((await me(f.app, loser)).status).toBe(401);
    expect([200, 401]).toContain(login.status);
    if (login.status === 200) expect((await me(f.app, cookieFrom(login))).status).toBe(401);
    expect(await prisma.activityLog.count({ where: { userId: f.user.id, action: "PASSWORD_CHANGED" } })).toBe(1);
    expect((await post(f.app, "/login", { email: f.email, password: replacement })).status).toBe(200);
  });

  it("serializes a reset racing with a change so that reset invalidates the requesting session too", async () => {
    const f = await fixture();
    await post(f.app, "/request-password-reset", { email: f.email });
    const [changed, reset] = await Promise.all([
      change(f.app, f.cookie),
      post(createApp(f.options), "/reset-password", { token: tokenFrom(f.recovery[0]!), newPassword: " password from racing reset " }),
    ]);
    if (changed.status === 200) {
      expect(reset.status).toBe(400);
      expect(reset.body.error.code).toBe("LINK_INVALID_OR_EXPIRED");
      expect((await me(f.app, f.cookie)).status).toBe(200);
      expect((await post(f.app, "/login", { email: f.email, password: replacement })).status).toBe(200);
    } else {
      expect(changed.status).toBe(401);
      expect(reset.status).toBe(200);
      expect((await me(f.app, f.cookie)).status).toBe(401);
      expect((await post(f.app, "/login", { email: f.email, password: " password from racing reset " })).status).toBe(200);
    }
    expect(await prisma.activityLog.count({ where: { userId: f.user.id } })).toBe(1);
  });

  it.each(["disable", "revoke"])("rechecks access after waiting for an in-flight %s", async action => {
    const f = await fixture();
    let pending: Promise<request.Response> | undefined;
    await prisma.$transaction(async tx => {
      const [{ pid } = { pid: 0 }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
      await tx.user.update({ where: { id: f.user.id }, data: {
        lifecycleLock: randomUUID(), ...(action === "disable" ? { status: "DISABLED" } : {}),
      } });
      pending = change(f.app, f.cookie).then(response => response);
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
      if (action === "revoke") await tx.session.deleteMany({ where: { userId: f.user.id } });
    }, { timeout: 10000 });
    const denied = await pending!;
    expect(denied.status).toBe(action === "disable" ? 403 : 401);
    expect(denied.body.error.code).toBe(action === "disable" ? "ACCOUNT_DISABLED" : "AUTHENTICATION_REQUIRED");
    await prisma.user.update({ where: { id: f.user.id }, data: { status: "ACTIVE" } });
    expect((await post(f.app, "/login", { email: f.email, password })).status).toBe(200);
    expect(await prisma.activityLog.count({ where: { userId: f.user.id } })).toBe(0);
  });

  it("enforces the replacement in Better Auth's handler and internal API without affecting another account", async () => {
    const f = await fixture();
    const other = await fixture();
    await post(other.app, "/request-password-reset", { email: other.email });
    const auth = createAuth(f.options);
    const headers = { Origin: process.env.FRONTEND_URL!, "Content-Type": "application/json", Cookie: f.cookie };
    const send = (body: unknown) => auth.handler(new Request(`${process.env.BETTER_AUTH_URL}/api/auth/change-password`, {
      method: "POST", headers, body: JSON.stringify(body),
    }));
    for (const revokeOtherSessions of [false, true]) {
      const body = { currentPassword: password, newPassword: replacement, revokeOtherSessions };
      expect((await send(body)).status).toBe(400);
      expect((await auth.api.changePassword({ headers: new Headers(headers), body, asResponse: true })).status).toBe(400);
    }
    const changed = await send({ currentPassword: password, newPassword: replacement });
    expect(changed.status).toBe(200);
    expect(await changed.json()).toEqual({ data: { passwordChanged: true } });
    expect(changed.headers.has("set-cookie")).toBe(false);
    const newlyIssued = cookieFrom(await post(f.app, "/login", { email: f.email, password: replacement }));
    const internal = await auth.api.changePassword({ headers: new Headers(headers), asResponse: true,
      body: { currentPassword: replacement, newPassword: password } });
    expect(internal.status).toBe(200);
    expect(await internal.json()).toEqual({ data: { passwordChanged: true } });
    expect((await me(f.app, newlyIssued)).status).toBe(401);
    expect((await me(f.app, f.cookie)).status).toBe(200);
    expect((await me(other.app, other.cookie)).status).toBe(200);
    expect((await post(other.app, "/reset-password", { token: tokenFrom(other.recovery[0]!), newPassword: replacement })).status).toBe(200);
  });
});

describe("Password change HTTP policy", () => {
  const options = { now: () => new Date("2097-01-02T00:00:00Z"), passwordChangeLimit: 10000, aggregateLimit: 10000 };

  it("requires trusted origin and bounded JSON before authentication", async () => {
    const app = createApp(options);
    for (const origin of [undefined, "null", "https://untrusted.example"]) {
      let pending = request(app).post("/api/auth/change-password");
      if (origin) pending = pending.set("Origin", origin);
      const result = await pending.send({});
      expect(result.status).toBe(403);
      expect(result.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
    }
    expect((await request(app).post("/api/auth/change-password").set("Origin", process.env.FRONTEND_URL!).type("form").send({})).status).toBe(415);
    const malformed = await request(app).post("/api/auth/change-password").set("Origin", process.env.FRONTEND_URL!)
      .set("Content-Type", "application/json").send('{"currentPassword":');
    expect(malformed.status).toBe(400);
    expect(malformed.body).toEqual({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } });
    expect((await post(app, "/change-password", { currentPassword: password, newPassword: "x".repeat(17000) })).status).toBe(413);
    const unauthenticated = await post(app, "/change-password", { currentPassword: password, newPassword: replacement });
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.headers["cache-control"]).toBe("no-store");
  });

  it("persists the per-IP limit across app instances and ignores spoofed forwarding headers", async () => {
    let time = new Date("2097-01-03T00:00:00Z");
    const config = { now: () => time, passwordChangeLimit: 2, aggregateLimit: 10000 };
    const first = createApp(config);
    const second = createApp(config);
    expect((await post(first, "/change-password", {}).set("X-Forwarded-For", "192.0.2.1")).status).toBe(400);
    expect((await post(second, "/change-password", {}).set("X-Forwarded-For", "192.0.2.2")
      .set("x-aventix-client-ip", "192.0.2.3")).status).toBe(400);
    const limited = await post(second, "/change-password", {});
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    expect(limited.headers["retry-after"]).toBe("900");
    expect((await post(first, "/reset-password", {})).status).toBe(400);
    time = new Date(time.getTime() + 900_000);
    expect((await post(second, "/change-password", {})).status).toBe(400);
  });

  it("counts password changes toward the aggregate limit", async () => {
    const app = createApp({ ...options, now: () => new Date("2097-01-03T01:00:00Z"), aggregateLimit: 2 });
    expect((await post(app, "/change-password", {})).status).toBe(400);
    expect((await post(app, "/reset-password", {})).status).toBe(400);
    expect((await post(app, "/change-password", {})).status).toBe(429);
  });

  it("rejects alternate paths, methods, origins and content types at the provider boundary", async () => {
    const auth = createAuth({ now: options.now, sendVerificationEmail: async () => {} });
    for (const path of ["/change-password/", "/CHANGE-PASSWORD", "/%63hange-password", "/set-password", "/update-user"]) {
      expect((await auth.handler(new Request(`${process.env.BETTER_AUTH_URL}/api/auth${path}`, {
        method: "POST", headers: { Origin: process.env.FRONTEND_URL!, "Content-Type": "application/json" }, body: "{}",
      }))).status).toBe(404);
    }
    for (const method of ["GET", "PATCH", "DELETE"]) {
      const denied = await auth.handler(new Request(`${process.env.BETTER_AUTH_URL}/api/auth/change-password`, { method }));
      expect(denied.status).toBe(405);
      expect(denied.headers.get("allow")).toBe("POST");
    }
    for (const origin of [undefined, "null", "https://untrusted.example"]) {
      expect((await auth.handler(new Request(`${process.env.BETTER_AUTH_URL}/api/auth/change-password`, {
        method: "POST", headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) }, body: "{}",
      }))).status).toBe(403);
    }
    expect((await auth.handler(new Request(`${process.env.BETTER_AUTH_URL}/api/auth/change-password`, {
      method: "POST", headers: { Origin: process.env.FRONTEND_URL!, "Content-Type": "text/plain" }, body: "{}",
    }))).status).toBe(415);
  });
});
