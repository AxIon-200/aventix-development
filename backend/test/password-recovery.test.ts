import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import type { VerificationMessage } from "../src/lib/verification-email.js";
import { createAuth } from "../src/lib/auth.js";
import { hashPassword } from "better-auth/crypto";

const terms = { version: "recovery-test-fixture", documentUrl: "https://example.com/test-fixture-terms" };
const password = " exact recovery password é ";
const replacement = " new recovery password é ";
const emails: string[] = [];
const post = (app: ReturnType<typeof createApp>, path: string, body: unknown) => request(app)
  .post(`/api/auth${path}`).set("Origin", process.env.FRONTEND_URL!).set("Content-Type", "application/json").send(body);
const tokenFrom = (message: VerificationMessage) => new URLSearchParams(new URL(message.url).hash.slice(1)).get("token")!;
const generic = { data: { message: "If an account exists for this address, a password-reset email will be sent." } };
const invalidLink = { error: { code: "LINK_INVALID_OR_EXPIRED", message: "Link is invalid or expired" } };
const cookieFrom = (response: request.Response) => (response.headers["set-cookie"] as unknown as string[])
  .find(value => value.startsWith("better-auth.session_token="))!.split(";")[0]!;
const me = (app: ReturnType<typeof createApp>, cookie: string) => request(app).get("/api/v1/me").set("Cookie", cookie);

async function fixture(verified = false) {
  let time = new Date("2096-01-01T00:00:00Z");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(time);
  const verification: VerificationMessage[] = [];
  const recovery: VerificationMessage[] = [];
  const email = `recovery-${randomUUID()}@example.com`;
  emails.push(email);
  const options = { terms, now: () => time, registrationLimit: 10000, aggregateLimit: 10000,
    verificationLimit: 10000, verificationResendLimit: 10000, loginLimit: 10000,
    recoveryLimit: 10000, resetLimit: 10000,
    sendVerificationEmail: async (message: VerificationMessage) => { verification.push(message); },
    sendPasswordResetEmail: async (message: VerificationMessage) => { recovery.push(message); } };
  const app = createApp(options);
  expect((await post(app, "/register", { firstName: "Recovery", lastName: "Owner", email, password,
    termsAccepted: true, termsVersion: terms.version })).status).toBe(201);
  if (verified) expect((await post(app, "/verify-email", { token: tokenFrom(verification[0]!), currentPassword: password })).status).toBe(200);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { app, options, user, email, verification, recovery,
    advance: (ms: number) => { time = new Date(time.getTime() + ms); vi.setSystemTime(time); } };
}

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
afterAll(async () => {
  const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
  await prisma.activityLog.deleteMany({ where: { userId: { in: users.map(user => user.id) } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.emailCooldown.deleteMany({ where: { email: { in: emails } } });
  await prisma.authRateLimit.deleteMany({ where: { expiresAt: { gte: new Date("2096-01-01"), lt: new Date("2096-01-05") } } });
});

describe("Password recovery", { timeout: 60_000 }, () => {
  it.each([15, 128])("accepts a new password of exactly %i Unicode code points", async length => {
    const f = await fixture(true);
    await post(f.app, "/request-password-reset", { email: f.email });
    const exact = "😀".repeat(length);
    expect((await post(f.app, "/reset-password", { token: tokenFrom(f.recovery[0]!), newPassword: exact })).status).toBe(200);
    expect((await post(f.app, "/login", { email: f.email, password: exact })).status).toBe(200);
  });

  it("prevents a login racing with reset from retaining access under the old credential", async () => {
    const f = await fixture(true);
    await post(f.app, "/request-password-reset", { email: f.email });
    const [login, reset] = await Promise.all([
      post(f.app, "/login", { email: f.email, password }),
      post(createApp(f.options), "/reset-password", { token: tokenFrom(f.recovery[0]!), newPassword: replacement }),
    ]);
    expect(reset.status).toBe(200);
    expect([200, 401]).toContain(login.status);
    if (login.status === 200) expect((await me(f.app, cookieFrom(login))).status).toBe(401);
    expect((await post(f.app, "/login", { email: f.email, password: replacement })).status).toBe(200);
  });

  it("claims only one first recovery email across concurrent app instances", async () => {
    const f = await fixture();
    const results = await Promise.all([
      post(f.app, "/request-password-reset", { email: f.email }),
      post(createApp(f.options), "/request-password-reset", { email: ` ${f.email.toUpperCase()} ` }),
    ]);
    expect(results.map(result => result.status)).toEqual([200, 200]);
    expect(f.recovery).toHaveLength(1);
  });

  it.each([false, true])("keeps disabled status and genuine consent gates intact after reset (verified: %s)", async verified => {
    const f = await fixture(verified);
    await prisma.user.update({ where: { id: f.user.id }, data: { status: "DISABLED", termsAcceptedAt: null, termsVersion: null } });
    await post(f.app, "/request-password-reset", { email: f.email });
    expect((await post(f.app, "/reset-password", { token: tokenFrom(f.recovery[0]!), newPassword: replacement })).status).toBe(200);
    expect((await post(f.app, "/login", { email: f.email, password: replacement })).body.error.code).toBe("ACCOUNT_DISABLED");
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: f.user.id } });
    expect(saved).toMatchObject({ status: "DISABLED", emailVerified: verified, termsAcceptedAt: null, termsVersion: null, role: "ATTENDEE" });
    await prisma.user.update({ where: { id: f.user.id }, data: { status: "ACTIVE" } });
    expect((await post(f.app, "/login", { email: f.email, password: replacement })).body.error.code)
      .toBe(verified ? "TERMS_ACCEPTANCE_REQUIRED" : "EMAIL_VERIFICATION_REQUIRED");
  });

  it("recovers legacy credentials without accepting a normalization-equivalent reused password", async () => {
    const f = await fixture(true);
    await prisma.account.updateMany({ where: { userId: f.user.id, providerId: "credential" }, data: { password: await hashPassword(password) } });
    expect((await post(f.app, "/login", { email: f.email, password })).body.error.code).toBe("PASSWORD_RESET_REQUIRED");
    await post(f.app, "/request-password-reset", { email: f.email });
    const token = tokenFrom(f.recovery[0]!);
    const reused = await post(f.app, "/reset-password", { token, newPassword: password.normalize("NFD") });
    expect(reused.status).toBe(400);
    expect(reused.body.error.code).toBe("PASSWORD_REUSE");
    expect((await post(f.app, "/reset-password", { token, newPassword: replacement })).status).toBe(200);
    expect((await post(f.app, "/login", { email: f.email, password: replacement })).status).toBe(200);
  });

  it("binds tokens to their account and purpose and shares the safe invalid-link error", async () => {
    const f = await fixture();
    await post(f.app, "/request-password-reset", { email: f.email });
    const token = tokenFrom(f.recovery[0]!);
    const other = await fixture();
    const otherCookie = await post(other.app, "/verify-email", { token: tokenFrom(other.verification[0]!), currentPassword: password });
    expect(otherCookie.status).toBe(200);
    const cookie = cookieFrom(await post(other.app, "/login", { email: other.email, password }));
    for (const invalid of ["unknown-fixture-token", tokenFrom(f.verification[0]!)]) {
      const result = await post(f.app, "/reset-password", { token: invalid, newPassword: replacement });
      expect(result.status).toBe(400);
      expect(result.body).toEqual(invalidLink);
    }
    expect((await post(f.app, "/verify-email", { token, currentPassword: password })).body).toEqual(invalidLink);
    expect((await post(f.app, "/reset-password", { token, newPassword: replacement }).set("Cookie", cookie)).status).toBe(200);
    // A browser belonging to another owner cannot retarget the link or revoke that owner's server-side session.
    expect((await me(other.app, cookie)).status).toBe(200);
    expect((await post(other.app, "/login", { email: other.email, password })).status).toBe(200);
    expect((await post(f.app, "/login", { email: f.email, password: replacement })).body.error.code).toBe("EMAIL_VERIFICATION_REQUIRED");
  });

  it("allows only one concurrent reset across both repeated and different outstanding links", async () => {
    const f = await fixture(true);
    await post(f.app, "/request-password-reset", { email: f.email });
    f.advance(60_000);
    await post(f.app, "/request-password-reset", { email: f.email });
    const token = tokenFrom(f.recovery[0]!);
    const other = tokenFrom(f.recovery[1]!);
    const results = await Promise.all([
      post(f.app, "/reset-password", { token, newPassword: replacement }),
      post(createApp(f.options), "/reset-password", { token: other, newPassword: replacement }),
      post(f.app, "/reset-password", { token, newPassword: replacement }),
    ]);
    expect(results.map(result => result.status).sort()).toEqual([200, 400, 400]);
    expect(await prisma.activityLog.count({ where: { userId: f.user.id, action: "PASSWORD_RESET" } })).toBe(1);
    f.advance(60_000);
    await post(f.app, "/request-password-reset", { email: f.email });
    expect((await post(f.app, "/reset-password", { token: tokenFrom(f.recovery[2]!), newPassword: password })).status).toBe(200);
  });

  it("rolls back the password, every link and every session when successful-reset audit cannot persist", async () => {
    const f = await fixture(true);
    const cookie = cookieFrom(await post(f.app, "/login", { email: f.email, password }));
    await post(f.app, "/request-password-reset", { email: f.email });
    const token = tokenFrom(f.recovery[0]!);
    const constraint = `recovery_test_${randomUUID().replaceAll("-", "")}`;
    if (!/^[a-f0-9-]{36}$/.test(f.user.id)) throw new Error("Unexpected fixture ID");
    await prisma.$executeRawUnsafe(`ALTER TABLE public."ActivityLog" ADD CONSTRAINT ${constraint} CHECK ("userId" <> '${f.user.id}'::uuid) NOT VALID`);
    try {
      const result = await post(f.app, "/reset-password", { token, newPassword: replacement });
      expect(result.status).toBe(500);
      expect(result.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed" } });
      expect(result.headers["set-cookie"]).toBeUndefined();
      expect((await me(f.app, cookie)).status).toBe(200);
      expect((await post(f.app, "/login", { email: f.email, password })).status).toBe(200);
      expect(await prisma.authLink.count({ where: { userId: f.user.id, purpose: "PASSWORD_RESET", consumedAt: null } })).toBe(1);
      expect(await prisma.activityLog.count({ where: { userId: f.user.id } })).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe(`ALTER TABLE public."ActivityLog" DROP CONSTRAINT ${constraint}`);
    }
    expect((await post(f.app, "/reset-password", { token, newPassword: replacement })).status).toBe(200);
    expect((await me(f.app, cookie)).status).toBe(401);
  });

  it("claims the cooldown before delivery, independently of verification and without extending suppression", async () => {
    const f = await fixture();
    let started = () => {};
    let finish = () => {};
    const deliveryStarted = new Promise<void>(resolve => { started = resolve; });
    const deliveryFinished = new Promise<void>(resolve => { finish = resolve; });
    const slow = createApp({ ...f.options, sendPasswordResetEmail: async () => { started(); await deliveryFinished; } });
    const pending = post(slow, "/request-password-reset", { email: f.email }).then(result => result);
    try {
      await deliveryStarted;
      f.advance(59_999);
      expect((await post(f.app, "/request-password-reset", { email: f.email })).body).toEqual(generic);
      expect(f.recovery).toHaveLength(0);
    } finally { finish(); await pending; }
    f.advance(1);
    expect((await post(f.app, "/request-password-reset", { email: f.email })).status).toBe(200);
    expect((await post(f.app, "/resend-verification", { email: f.email })).status).toBe(200);
    expect(f.recovery).toHaveLength(1);
    expect(f.verification).toHaveLength(2);
    f.advance(60_000);
    const results = await Promise.all([
      post(f.app, "/request-password-reset", { email: f.email }),
      post(createApp(f.options), "/request-password-reset", { email: f.email.toUpperCase() }),
    ]);
    expect(results.map(result => result.status)).toEqual([200, 200]);
    expect(f.recovery).toHaveLength(2);
  });

  it("expires each reset link at 30 minutes without new requests invalidating or renewing older links", async () => {
    const f = await fixture();
    await post(f.app, "/request-password-reset", { email: f.email });
    f.advance(60_000);
    await post(f.app, "/request-password-reset", { email: f.email });
    f.advance(1_740_000);
    const expired = await post(f.app, "/reset-password", { token: tokenFrom(f.recovery[0]!), newPassword: replacement });
    expect(expired.status).toBe(400);
    expect(expired.body).toEqual(invalidLink);
    f.advance(59_999);
    expect((await post(f.app, "/reset-password", { token: tokenFrom(f.recovery[1]!), newPassword: replacement })).status).toBe(200);
    expect((await post(f.app, "/verify-email", { token: tokenFrom(f.verification[0]!), currentPassword: replacement })).status).toBe(200);
  });

  it("rejects reuse without consuming links and preserves exact spaces, Unicode spelling and code-point limits", async () => {
    const f = await fixture(true);
    await post(f.app, "/request-password-reset", { email: f.email });
    const token = tokenFrom(f.recovery[0]!);
    const reuse = await post(f.app, "/reset-password", { token, newPassword: password });
    expect(reuse.status).toBe(400);
    expect(reuse.body).toEqual({ error: { code: "PASSWORD_REUSE", message: "New password must differ from current password" } });
    for (const value of ["x".repeat(14), "😀".repeat(129), "valid length then \ud800"]) {
      const rejected = await post(f.app, "/reset-password", { token, newPassword: value });
      expect(rejected.status).toBe(400);
      expect(rejected.body.error.code).toBe("VALIDATION_ERROR");
    }
    const exact = ` ${"😀".repeat(125)}e\u0301`;
    expect((await post(f.app, "/reset-password", { token, newPassword: exact })).status).toBe(200);
    for (const value of [exact.trim(), exact.normalize("NFC"), password]) {
      expect((await post(f.app, "/login", { email: f.email, password: value })).status).toBe(401);
    }
    expect((await post(f.app, "/login", { email: f.email, password: exact })).status).toBe(200);
  });

  it("keeps missing, active, unverified, disabled, suppressed and delivery-failure responses identical", async () => {
    const f = await fixture();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    let attempts = 0;
    const failing = createApp({ ...f.options, sendPasswordResetEmail: async () => {
      attempts++;
      throw new Error(`Sensitive provider payload ${password} ${f.email}`);
    } });
    const responses = [await post(f.app, "/request-password-reset", { email: `missing-${randomUUID()}@example.com` }),
      await post(failing, "/request-password-reset", { email: f.email })];
    f.advance(59_999);
    responses.push(await post(failing, "/request-password-reset", { email: ` ${f.email.toUpperCase()} ` }));
    expect(attempts).toBe(1);
    f.advance(1);
    responses.push(await post(f.app, "/request-password-reset", { email: f.email }));
    expect(f.recovery).toHaveLength(1);
    await prisma.user.update({ where: { id: f.user.id }, data: { status: "DISABLED" } });
    f.advance(60_000);
    responses.push(await post(f.app, "/request-password-reset", { email: f.email }));
    await prisma.user.update({ where: { id: f.user.id }, data: { status: "ACTIVE", emailVerified: true } });
    f.advance(60_000);
    responses.push(await post(f.app, "/request-password-reset", { email: f.email }));
    expect(f.recovery).toHaveLength(3);
    for (const response of responses) {
      expect(response.status).toBe(200);
      expect(response.body).toEqual(generic);
      expect(response.headers["set-cookie"]).toBeUndefined();
    }
    expect(log).toHaveBeenCalledExactlyOnceWith("Password reset email delivery failed", { correlationId: expect.any(String) });
  });

  it("revokes every session, clears the browser cookie, consumes all reset links and persists a safe audit", async () => {
    const f = await fixture(true);
    const first = cookieFrom(await post(f.app, "/login", { email: f.email, password }));
    const second = cookieFrom(await post(f.app, "/login", { email: f.email, password }));
    expect((await me(f.app, first)).status).toBe(200);
    expect((await me(f.app, second)).status).toBe(200);
    await post(f.app, "/request-password-reset", { email: f.email });
    f.advance(60_000);
    await post(f.app, "/request-password-reset", { email: f.email });
    const token = tokenFrom(f.recovery[0]!);
    const result = await post(f.app, "/reset-password", { token, newPassword: replacement }).set("Cookie", first);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ data: { passwordReset: true } });
    expect(result.headers["set-cookie"]).toContainEqual(expect.stringMatching(/^better-auth\.session_token=;.*Max-Age=0/));
    for (const cookie of [first, second]) expect((await me(f.app, cookie)).status).toBe(401);
    for (const message of f.recovery) {
      const replay = await post(f.app, "/reset-password", { token: tokenFrom(message), newPassword: password });
      expect(replay.status).toBe(400);
      expect(replay.body).toEqual(invalidLink);
    }
    const audits = await prisma.activityLog.findMany({ where: { userId: f.user.id } });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: "PASSWORD_RESET", entityType: "User", entityId: f.user.id,
      createdAt: f.options.now(), metadata: null });
    expect((await prisma.session.count({ where: { userId: f.user.id } }))).toBe(0);
    expect((await post(f.app, "/login", { email: f.email, password: replacement })).status).toBe(200);
  });

  it("recovers an unverified owner without verifying them and preserves verification with the new password", async () => {
    const f = await fixture();
    const requested = await post(f.app, "/request-password-reset", { email: ` ${f.email.toUpperCase()} ` });
    expect(requested.status).toBe(200);
    expect(requested.body).toEqual(generic);
    expect(requested.headers["set-cookie"]).toBeUndefined();
    expect(f.recovery).toHaveLength(1);
    const reset = await post(f.app, "/reset-password", { token: tokenFrom(f.recovery[0]!), newPassword: replacement });
    expect(reset.status).toBe(200);
    expect(reset.body).toEqual({ data: { passwordReset: true } });
    expect((await post(f.app, "/login", { email: f.email, password })).status).toBe(401);
    expect((await post(f.app, "/login", { email: f.email, password: replacement })).body.error.code).toBe("EMAIL_VERIFICATION_REQUIRED");
    const token = tokenFrom(f.verification[0]!);
    expect((await post(f.app, "/verify-email", { token, currentPassword: password })).status).toBe(401);
    expect((await post(f.app, "/verify-email", { token, currentPassword: replacement })).status).toBe(200);
    expect((await post(f.app, "/login", { email: f.email, password: replacement })).status).toBe(200);
  });
});

describe("Recovery HTTP policy", () => {
  const options = { now: () => new Date("2096-01-02T00:00:00Z"), recoveryLimit: 10000, resetLimit: 10000, aggregateLimit: 10000 };

  it.each(["/request-password-reset", "/reset-password"])("requires trusted origin and bounded strict JSON for %s", async path => {
    const app = createApp(options);
    for (const origin of [undefined, "null", "https://untrusted.example"]) {
      let pending = request(app).post(`/api/auth${path}`);
      if (origin) pending = pending.set("Origin", origin);
      const result = await pending.send({});
      expect(result.status).toBe(403);
      expect(result.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
    }
    expect((await request(app).post(`/api/auth${path}`).set("Origin", process.env.FRONTEND_URL!).type("form").send({})).status).toBe(415);
    const malformed = await request(app).post(`/api/auth${path}`).set("Origin", process.env.FRONTEND_URL!)
      .set("Content-Type", "application/json").send('{"token":');
    expect(malformed.status).toBe(400);
    expect(malformed.body).toEqual({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } });
    expect((await post(app, path, { newPassword: "x".repeat(17000) })).status).toBe(413);
    for (const body of [null, [], {}, { email: "invalid" }, { email: "fixture@example.com", callbackURL: "https://evil.example" },
      { token: "fixture", newPassword: replacement, email: "other@example.com" },
      { token: "fixture", newPassword: replacement, redirectTo: "https://evil.example" }]) {
      const result = await post(app, path, body);
      expect(result.status).toBe(400);
      expect(result.body.error.code).toBe("VALIDATION_ERROR");
      expect(Object.keys(result.body.error).sort()).toEqual(["code", "message"]);
    }
  });

  it.each(["/request-password-reset", "/reset-password"])("persists an independent IP limit across app instances for %s", async path => {
    let time = new Date(path === "/request-password-reset" ? "2096-01-03T12:00:00Z" : "2096-01-03T13:00:00Z");
    const config = { now: () => time, recoveryLimit: 2, resetLimit: 2, aggregateLimit: 10000 };
    const first = createApp(config);
    const second = createApp(config);
    const body = path === "/request-password-reset" ? { email: "missing@example.com" } : { token: "unknown", newPassword: replacement };
    const expected = path === "/request-password-reset" ? 200 : 400;
    expect((await post(first, path, body).set("X-Forwarded-For", "192.0.2.1")).status).toBe(expected);
    expect((await post(second, path, body).set("X-Forwarded-For", "192.0.2.2")).status).toBe(expected);
    const limited = await post(second, path, body);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    expect(limited.headers["retry-after"]).toBe("900");
    const other = path === "/request-password-reset" ? "/reset-password" : "/request-password-reset";
    expect((await post(first, other, {})).status).toBe(400);
    time = new Date(time.getTime() + 900_000);
    expect((await post(second, path, body)).status).toBe(expected);
  });

  it("counts recovery and reset toward the aggregate limit", async () => {
    const app = createApp({ ...options, now: () => new Date("2096-01-03T14:00:00Z"), aggregateLimit: 2 });
    expect((await post(app, "/request-password-reset", {})).status).toBe(400);
    expect((await post(app, "/reset-password", {})).status).toBe(400);
    expect((await post(app, "/reset-password", {})).status).toBe(429);
  });

  it("uses a fixed read-only landing destination and enforces the replacement through Better Auth's HTTP handler", async () => {
    const f = await fixture();
    const auth = createAuth(f.options);
    const send = (path: string, body: unknown) => auth.handler(new Request(`${process.env.BETTER_AUTH_URL}/api/auth${path}`, {
      method: "POST", headers: { Origin: process.env.FRONTEND_URL!, "Content-Type": "application/json" }, body: JSON.stringify(body),
    }));
    expect((await send("/request-password-reset", { email: f.email, redirectTo: "https://evil.example" })).status).toBe(400);
    const result = await send("/request-password-reset", { email: f.email });
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual(generic);
    expect(f.recovery).toHaveLength(1);
    const destination = new URL(f.recovery[0]!.url);
    expect(destination.origin).toBe(new URL(process.env.BETTER_AUTH_URL!).origin);
    expect(destination.pathname).toBe("/api/auth/password-reset");
    expect(destination.search).toBe("");
    const landing = await request(f.app).get(destination.pathname);
    expect(landing.status).toBe(200);
    expect(landing.headers["cache-control"]).toBe("no-store");
    expect(landing.headers["referrer-policy"]).toBe("no-referrer");
    expect(landing.headers["set-cookie"]).toBeUndefined();
    expect((await request(f.app).post(destination.pathname).send({})).status).toBe(405);
    expect((await auth.handler(new Request(`${process.env.BETTER_AUTH_URL}/api/auth/reset-password?token=fixture`))).status).toBe(405);
    const wrongPurpose = await send("/reset-password", { token: tokenFrom(f.verification[0]!), newPassword: replacement });
    expect(await wrongPurpose.json()).toEqual(invalidLink);
    const reset = await send("/reset-password", { token: tokenFrom(f.recovery[0]!), newPassword: replacement });
    expect(reset.status).toBe(200);
    expect(await reset.json()).toEqual({ data: { passwordReset: true } });
    expect((await send("/reset-password/arbitrary", {})).status).toBe(404);
  });
});
