import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import type { VerificationMessage } from "../src/lib/verification-email.js";
import { hashPassword } from "better-auth/crypto";
import { hashExactPassword } from "../src/lib/exact-password.js";
import { createAuth } from "../src/lib/auth.js";

const terms = { version: "verification-test-fixture", documentUrl: "https://example.com/test-fixture-terms" };
const password = " exact verification password é ";
const emails: string[] = [];
const post = (app: ReturnType<typeof createApp>, path: string, body: unknown) => request(app)
  .post(`/api/auth${path}`).set("Origin", process.env.FRONTEND_URL!).send(body);
const tokenFrom = (message: VerificationMessage) => new URLSearchParams(new URL(message.url).hash.slice(1)).get("token")!;

async function fixture(currentPassword = password) {
  let time = new Date("2092-01-01T00:00:00Z");
  const messages: VerificationMessage[] = [];
  const email = `verification-${randomUUID()}@example.com`;
  emails.push(email);
  const options = { terms, now: () => time, registrationLimit: 10000, aggregateLimit: 10000,
    verificationLimit: 10000, verificationResendLimit: 10000,
    sendVerificationEmail: async (message: VerificationMessage) => { messages.push(message); } };
  const app = createApp(options);
  const registration = await post(app, "/register", { firstName: "Email", lastName: "Owner", email, password: currentPassword,
    termsAccepted: true, termsVersion: terms.version });
  expect(registration.status).toBe(201);
  return { app, options, email, messages, token: tokenFrom(messages[0]!),
    advance: (milliseconds: number) => { time = new Date(time.getTime() + milliseconds); } };
}

afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.emailCooldown.deleteMany({ where: { email: { in: emails } } });
  await prisma.authRateLimit.deleteMany({ where: { expiresAt: { gte: new Date("2092-01-01"), lt: new Date("2092-01-03") } } });
});

describe("Verification request policy", () => {
  const app = () => createApp({ now: () => new Date("2092-01-02T00:00:00Z"),
    verificationLimit: 10000, verificationResendLimit: 10000, aggregateLimit: 10000 });

  it.each(["/verify-email", "/resend-verification"])("requires trusted origin and bounded JSON for %s", async path => {
    const instance = app();
    for (const origin of [undefined, "null", "https://untrusted.example"]) {
      let pending = request(instance).post(`/api/auth${path}`);
      if (origin) pending = pending.set("Origin", origin);
      const result = await pending.send({});
      expect(result.status).toBe(403);
      expect(result.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
    }
    const form = await request(instance).post(`/api/auth${path}`)
      .set("Origin", process.env.FRONTEND_URL!).type("form").send({ email: "fixture@example.com" });
    expect(form.status).toBe(415);
    expect(form.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    const malformed = await request(instance).post(`/api/auth${path}`)
      .set("Origin", process.env.FRONTEND_URL!).set("Content-Type", "application/json").send('{"password":');
    expect(malformed.status).toBe(400);
    expect(malformed.body).toEqual({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } });
    const oversized = await post(instance, path, { currentPassword: "x".repeat(17000) });
    expect(oversized.status).toBe(413);
    expect(oversized.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it.each([
    { path: "/resend-verification", body: { email: "invalid" } },
    { path: "/resend-verification", body: { email: "fixture@example.com", callbackURL: "https://evil.example" } },
    { path: "/resend-verification", body: { email: "fixture@example.com", status: "ACTIVE" } },
    { path: "/verify-email", body: { token: "fixture" } },
    { path: "/verify-email", body: { token: "fixture", currentPassword: "secret", callbackURL: "https://evil.example" } },
    { path: "/verify-email", body: { token: "fixture", currentPassword: "secret", email: "other@example.com" } },
    { path: "/verify-email", body: { token: "fixture", currentPassword: "\ud800" } },
  ])("rejects invalid or extra fields safely (case %#)", async ({ path, body }) => {
    const response = await post(app(), path, body);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(response.body.error).sort()).toEqual(["code", "message"]);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it.each(["/verify-email", "/resend-verification"])("persists the independent IP limit for %s across app instances", async path => {
    let time = new Date(path === "/verify-email" ? "2092-01-02T12:00:00Z" : "2092-01-02T13:00:00Z");
    const options = { now: () => time, verificationLimit: 2, verificationResendLimit: 2, aggregateLimit: 10000 };
    const first = createApp(options);
    const second = createApp(options);
    const body = path === "/verify-email" ? { token: "unknown", currentPassword: "wrong" } : { email: "missing@example.com" };
    const send = (instance: ReturnType<typeof createApp>, ip: string) => post(instance, path, body).set("X-Forwarded-For", ip);
    const expectedStatus = path === "/verify-email" ? 400 : 200;
    expect((await send(first, "192.0.2.1")).status).toBe(expectedStatus);
    expect((await send(second, "192.0.2.2")).status).toBe(expectedStatus);
    const denied = await send(second, "192.0.2.3");
    expect(denied.status).toBe(429);
    expect(denied.body).toEqual({ error: { code: "RATE_LIMITED", message: "Too many requests" } });
    expect(denied.headers["retry-after"]).toBe("900");
    const otherPath = path === "/verify-email" ? "/resend-verification" : "/verify-email";
    expect((await post(first, otherPath, {})).status).toBe(400);
    time = new Date(time.getTime() + 900_000);
    expect((await send(second, "192.0.2.1")).status).toBe(expectedStatus);
  });

  it("counts both operations toward the shared aggregate IP limit", async () => {
    const instance = createApp({ now: () => new Date("2092-01-02T14:00:00Z"),
      verificationLimit: 100, verificationResendLimit: 100, aggregateLimit: 2 });
    expect((await post(instance, "/verify-email", {})).status).toBe(400);
    expect((await post(instance, "/resend-verification", {})).status).toBe(400);
    expect((await post(instance, "/verify-email", {})).status).toBe(429);
  });
});

describe("Password-gated email verification", () => {
  it("sends initial and resend links only to the fixed frontend fragment destination", async () => {
    const f = await fixture();
    f.advance(60_000);
    expect((await post(f.app, "/resend-verification", { email: f.email })).status).toBe(200);
    expect(f.messages).toHaveLength(2);
    for (const message of f.messages) {
      const url = new URL(message.url);
      expect(url.origin).toBe(new URL(process.env.FRONTEND_URL!).origin);
      expect(url.pathname).toBe("/verify-email");
      expect(url.search).toBe("");
      expect(tokenFrom(message)).toBeTruthy();
    }
  });

  it("offers an inert legacy bridge with a fixed destination, private headers and no external assets", async () => {
    const instance = createApp();
    const bridge = await request(instance).get("/api/auth/verification?callbackURL=https://evil.example");
    expect(bridge.status).toBe(200);
    expect(bridge.type).toBe("text/html");
    expect(bridge.headers["cache-control"]).toBe("no-store");
    expect(bridge.headers["referrer-policy"]).toBe("no-referrer");
    expect(bridge.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(bridge.headers["set-cookie"]).toBeUndefined();
    expect(bridge.headers.location).toBeUndefined();
    expect(bridge.text).toContain("Continue to email verification");
    expect(bridge.text).toContain(new URL("/verify-email", process.env.FRONTEND_URL!).href);
    expect(bridge.text).not.toContain("evil.example");
    expect(bridge.text).not.toMatch(/<(?:script|link|img)[^>]+(?:src|href)=/i);
  });

  it("binds the required password to the link's owner and never accepts another account's credential", async () => {
    const first = await fixture();
    const otherPassword = "different account password";
    const second = await fixture(otherPassword);
    const result = await post(first.app, "/verify-email", { token: first.token, currentPassword: otherPassword });
    expect(result.status).toBe(401);
    expect((await prisma.user.findUniqueOrThrow({ where: { email: first.email } })).emailVerified).toBe(false);
    expect((await prisma.user.findUniqueOrThrow({ where: { email: second.email } })).emailVerified).toBe(false);
    expect((await post(first.app, "/verify-email", { token: first.token, currentPassword: password })).status).toBe(200);
  });

  it("keeps landing GET read-only and prevents login and native routes from sending verification email", async () => {
    const f = await fixture();
    const landing = await request(f.app).get("/api/auth/verification");
    expect(landing.status).toBe(200);
    expect(landing.headers["cache-control"]).toBe("no-store");
    expect(landing.headers["referrer-policy"]).toBe("no-referrer");
    expect(landing.headers["set-cookie"]).toBeUndefined();
    expect((await post(f.app, "/login", { email: f.email, password })).body.error.code).toBe("EMAIL_VERIFICATION_REQUIRED");
    for (const path of ["/sign-in/email", "/send-verification-email"]) {
      expect((await post(f.app, path, { email: f.email, password })).status).toBe(404);
    }
    expect(f.messages).toHaveLength(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { email: f.email } })).emailVerified).toBe(false);
    expect((await post(f.app, "/verify-email", { token: f.token, currentPassword: password })).status).toBe(200);
  });

  it("enforces the password-gated replacement through the Better Auth HTTP handler itself", async () => {
    const f = await fixture();
    const auth = createAuth(f.options);
    const get = await auth.handler(new Request(`${process.env.BETTER_AUTH_URL}/api/auth/verify-email?token=fixture`));
    expect(get.status).toBe(405);
    const result = await auth.handler(new Request(`${process.env.BETTER_AUTH_URL}/api/auth/verify-email`, {
      method: "POST", headers: { Origin: process.env.FRONTEND_URL!, "Content-Type": "application/json" },
      body: JSON.stringify({ token: f.token, currentPassword: password }),
    }));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ data: { emailVerified: true } });
    expect(result.headers.get("set-cookie")).toBeNull();
  });
  it("keeps resend responses private for missing accounts and failed delivery, and retains the failed-attempt cooldown", async () => {
    const f = await fixture();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    f.advance(60_000);
    let sends = 0;
    const failingApp = createApp({ ...f.options, sendVerificationEmail: async () => {
      sends++;
      throw new Error(`Sensitive provider payload ${password} ${f.token} ${f.email}`);
    } });
    const missing = await post(failingApp, "/resend-verification", { email: `missing-${randomUUID()}@example.com` });
    const failed = await post(failingApp, "/resend-verification", { email: f.email });
    const generic = { data: { message: "If this address is eligible, a verification email will be sent." } };
    for (const response of [missing, failed]) {
      expect(response.status).toBe(200);
      expect(response.body).toEqual(generic);
      expect(response.headers["set-cookie"]).toBeUndefined();
    }
    expect(sends).toBe(1);
    expect(log).toHaveBeenCalledWith("Verification email delivery failed", { correlationId: expect.any(String) });
    expect(JSON.stringify(log.mock.calls).includes(f.token)).toBe(false);
    expect(JSON.stringify(log.mock.calls).includes(password)).toBe(false);
    expect(JSON.stringify(log.mock.calls).includes(f.email)).toBe(false);
    f.advance(59_999);
    expect((await post(failingApp, "/resend-verification", { email: f.email })).body).toEqual(generic);
    expect(sends).toBe(1);
    f.advance(1);
    expect((await post(f.app, "/resend-verification", { email: f.email })).body).toEqual(generic);
    expect(f.messages).toHaveLength(2);
    expect((await post(f.app, "/verify-email", { token: f.token, currentPassword: password })).status).toBe(200);
  });

  it("allows resend after initial registration delivery fails without registering again", async () => {
    const messages: VerificationMessage[] = [];
    const f = await fixture();
    // Use a new address to exercise registration's explicit account-created failure.
    const email = `verification-${randomUUID()}@example.com`;
    emails.push(email);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failed = createApp({ ...f.options, sendVerificationEmail: async () => { throw new Error("Provider failure"); } });
    expect((await post(failed, "/register", { firstName: "Email", lastName: "Owner", email, password,
      termsAccepted: true, termsVersion: terms.version })).status).toBe(503);
    const retry = createApp({ ...f.options, sendVerificationEmail: async message => { messages.push(message); } });
    expect((await post(retry, "/resend-verification", { email })).status).toBe(200);
    expect(messages).toHaveLength(0);
    f.advance(60_000);
    expect((await post(retry, "/resend-verification", { email })).status).toBe(200);
    expect(messages).toHaveLength(1);
    expect((await post(retry, "/verify-email", { token: tokenFrom(messages[0]!), currentPassword: password })).status).toBe(200);
  });

  it.each([true, false])("claims only one concurrent resend and keeps recovery cooldowns independent (existing cooldown: %s)", async existingCooldown => {
    const f = await fixture();
    f.advance(60_000);
    if (!existingCooldown) await prisma.emailCooldown.deleteMany({ where: { email: f.email } });
    const recovery = await prisma.emailCooldown.create({ data: { id: randomUUID(), email: f.email,
      purpose: "PASSWORD_RESET", attemptedAt: f.options.now() } });
    const secondApp = createApp(f.options);
    const results = await Promise.all([
      post(f.app, "/resend-verification", { email: f.email }),
      post(secondApp, "/resend-verification", { email: f.email.toUpperCase() }),
    ]);
    expect(results.map(result => result.status)).toEqual([200, 200]);
    expect(results[0]!.body).toEqual(results[1]!.body);
    expect(f.messages).toHaveLength(2);
    const destination = new URL(f.messages[1]!.url);
    expect(destination.origin).toBe(new URL(process.env.FRONTEND_URL!).origin);
    expect(destination.pathname).toBe("/verify-email");
    expect(destination.search).toBe("");
    expect(await prisma.emailCooldown.findUniqueOrThrow({ where: { id: recovery.id } })).toEqual(recovery);
  });

  it("starts the cooldown before delivery completes and does not extend it on suppression", async () => {
    const f = await fixture();
    f.advance(60_000);
    let startDelivery = () => {};
    let finishDelivery = () => {};
    const started = new Promise<void>(resolve => { startDelivery = resolve; });
    const finished = new Promise<void>(resolve => { finishDelivery = resolve; });
    const slow = createApp({ ...f.options, sendVerificationEmail: async () => {
      startDelivery();
      await finished;
    } });
    const pending = post(slow, "/resend-verification", { email: f.email }).then(response => response);
    try {
      await started;
      f.advance(59_999);
      expect((await post(f.app, "/resend-verification", { email: f.email })).status).toBe(200);
      expect(f.messages).toHaveLength(1);
    } finally {
      finishDelivery();
      await pending;
    }
    f.advance(1);
    expect((await post(f.app, "/resend-verification", { email: f.email })).status).toBe(200);
    expect(f.messages).toHaveLength(2);
  });

  it("keeps each resent link's own expiry without renewing the original link", async () => {
    const f = await fixture();
    f.advance(60_000);
    await post(f.app, "/resend-verification", { email: f.email });
    f.advance(86_340_000);
    const old = await post(f.app, "/verify-email", { token: f.token, currentPassword: password });
    expect(old.status).toBe(400);
    expect(old.body.error.code).toBe("LINK_INVALID_OR_EXPIRED");
    expect((await post(f.app, "/verify-email", { token: tokenFrom(f.messages[1]!), currentPassword: password })).status).toBe(200);
  });

  it("does not issue a usable new link when resend races with successful verification", async () => {
    const f = await fixture();
    f.advance(60_000);
    const responses = await Promise.all([
      post(f.app, "/resend-verification", { email: f.email }),
      post(createApp(f.options), "/verify-email", { token: f.token, currentPassword: password }),
    ]);
    expect(responses.map(result => result.status)).toEqual([200, 200]);
    for (const message of f.messages) {
      const replay = await post(f.app, "/verify-email", { token: tokenFrom(message), currentPassword: password });
      expect(replay.status).toBe(400);
      expect(replay.body.error.code).toBe("LINK_INVALID_OR_EXPIRED");
    }
  });

  it("resends for disabled unverified accounts and leaves their status unchanged", async () => {
    const f = await fixture();
    await prisma.user.update({ where: { email: f.email }, data: { status: "DISABLED" } });
    f.advance(60_000);
    expect((await post(f.app, "/resend-verification", { email: f.email })).status).toBe(200);
    expect(f.messages).toHaveLength(2);
    expect((await prisma.user.findUniqueOrThrow({ where: { email: f.email } })).status).toBe("DISABLED");
  });
  it.each([86_399_999, 86_400_000])("enforces the 24-hour expiry boundary at %i milliseconds", async age => {
    const f = await fixture();
    f.advance(age);
    const result = await post(f.app, "/verify-email", { token: f.token, currentPassword: password });
    expect(result.status).toBe(age === 86_399_999 ? 200 : 400);
    if (age === 86_400_000) expect(result.body).toEqual({ error: { code: "LINK_INVALID_OR_EXPIRED", message: "Link is invalid or expired" } });
  });

  it("checks link validity before credentials for unknown, wrong-purpose, and orphaned links", async () => {
    const f = await fixture();
    const submit = (token: string) => post(f.app, "/verify-email", { token, currentPassword: "incorrect" });
    const invalid = { error: { code: "LINK_INVALID_OR_EXPIRED", message: "Link is invalid or expired" } };
    const unknown = await submit("unknown-fixture-token");
    expect(unknown.status).toBe(400);
    expect(unknown.body).toEqual(invalid);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: f.email } });
    await prisma.authLink.updateMany({ where: { userId: user.id }, data: { purpose: "PASSWORD_RESET" } });
    const wrongPurpose = await submit(f.token);
    expect(wrongPurpose.status).toBe(400);
    expect(wrongPurpose.body).toEqual(invalid);
    await prisma.user.delete({ where: { id: user.id } });
    const orphaned = await submit(f.token);
    expect(orphaned.status).toBe(400);
    expect(orphaned.body).toEqual(invalid);
  });

  it("allows a disabled owner to verify without enabling the account or issuing a session", async () => {
    const f = await fixture();
    await prisma.user.update({ where: { email: f.email }, data: { status: "DISABLED" } });
    const result = await post(f.app, "/verify-email", { token: f.token, currentPassword: password });
    expect(result.status).toBe(200);
    expect(result.headers["set-cookie"]).toBeUndefined();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: f.email }, include: { sessions: true } });
    expect(user).toMatchObject({ status: "DISABLED", emailVerified: true, sessions: [] });
  });

  it("uses the new current password while preserving a verification link across credential replacement", async () => {
    const f = await fixture();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: f.email } });
    const replacement = " new exact current password ";
    // Reset completion is a later ticket; represent its durable credential effect.
    await prisma.account.updateMany({ where: { userId: user.id, providerId: "credential" },
      data: { password: await hashExactPassword(replacement) } });
    expect((await post(f.app, "/verify-email", { token: f.token, currentPassword: password })).status).toBe(401);
    expect((await post(f.app, "/verify-email", { token: f.token, currentPassword: replacement })).status).toBe(200);
  });

  it("allows only one concurrent completion, including submissions using different valid links", async () => {
    const f = await fixture();
    f.advance(60_000);
    expect((await post(f.app, "/resend-verification", { email: f.email })).status).toBe(200);
    const secondApp = createApp(f.options);
    const results = await Promise.all([
      post(f.app, "/verify-email", { token: f.token, currentPassword: password }),
      post(secondApp, "/verify-email", { token: tokenFrom(f.messages[1]!), currentPassword: password }),
      post(secondApp, "/verify-email", { token: f.token, currentPassword: password }),
    ]);
    expect(results.map(result => result.status).sort()).toEqual([200, 400, 400]);
    expect(results.every(result => !result.headers["set-cookie"])).toBe(true);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: f.email }, include: { authLinks: true } });
    expect(user.emailVerified).toBe(true);
    expect(user.authLinks.every(link => link.consumedAt !== null)).toBe(true);
  });

  it("rolls back verified state when link invalidation cannot persist", async () => {
    const f = await fixture();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: f.email } });
    const constraint = `verification_test_${randomUUID().replaceAll("-", "")}`;
    // A fixture-scoped real database constraint fails the final write after
    // emailVerified changes; no production collaborator is mocked.
    if (!/^[a-f0-9-]{36}$/.test(user.id)) throw new Error("Unexpected fixture ID");
    await prisma.$executeRawUnsafe(`ALTER TABLE public.auth_link ADD CONSTRAINT ${constraint} CHECK ("userId" <> '${user.id}'::uuid OR "consumedAt" IS NULL) NOT VALID`);
    try {
      const result = await post(f.app, "/verify-email", { token: f.token, currentPassword: password });
      expect(result.status).toBe(500);
      expect(result.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed" } });
      const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { authLinks: true } });
      expect(saved.emailVerified).toBe(false);
      expect(saved.authLinks.every(link => link.consumedAt === null)).toBe(true);
    } finally {
      await prisma.$executeRawUnsafe(`ALTER TABLE public.auth_link DROP CONSTRAINT ${constraint}`);
    }
    expect((await post(f.app, "/verify-email", { token: f.token, currentPassword: password })).status).toBe(200);
  });
  it("requires genuine recovery for a matching legacy credential without consuming its link", async () => {
    const f = await fixture();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: f.email } });
    await prisma.account.updateMany({ where: { userId: user.id, providerId: "credential" },
      data: { password: await hashPassword(password) } });
    const incorrect = await post(f.app, "/verify-email", { token: f.token, currentPassword: "incorrect" });
    expect(incorrect.status).toBe(401);
    const result = await post(f.app, "/verify-email", { token: f.token, currentPassword: password });
    expect(result.status).toBe(403);
    expect(result.body).toEqual({ error: { code: "PASSWORD_RESET_REQUIRED",
      message: "Reset your password through password recovery before continuing" } });
    expect(result.headers["set-cookie"]).toBeUndefined();
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { authLinks: true } });
    expect(saved.emailVerified).toBe(false);
    expect(saved.authLinks.every(link => link.consumedAt === null)).toBe(true);
  });
  it("resends after 60 seconds, preserves the earlier link, and invalidates every link on success", async () => {
    const f = await fixture();
    const resend = () => post(f.app, "/resend-verification", { email: ` ${f.email.toUpperCase()} ` });
    const generic = { data: { message: "If this address is eligible, a verification email will be sent." } };
    const suppressed = await resend();
    expect(suppressed.status).toBe(200);
    expect(suppressed.body).toEqual(generic);
    expect(f.messages).toHaveLength(1);
    f.advance(59_999);
    expect((await resend()).body).toEqual(generic);
    expect(f.messages).toHaveLength(1);
    f.advance(1);
    expect((await resend()).body).toEqual(generic);
    expect(f.messages).toHaveLength(2);
    const verified = await post(f.app, "/verify-email", { token: f.token, currentPassword: password });
    expect(verified.status).toBe(200);
    const newer = await post(f.app, "/verify-email", { token: tokenFrom(f.messages[1]!), currentPassword: password });
    expect(newer.status).toBe(400);
    expect(newer.body).toEqual({ error: { code: "LINK_INVALID_OR_EXPIRED", message: "Link is invalid or expired" } });
    f.advance(60_000);
    expect((await resend()).body).toEqual(generic);
    expect(f.messages).toHaveLength(2);
  });
  it("requires the exact current password, preserves the link after failure, and verifies without a session", async () => {
    const f = await fixture();
    const wrong = await post(f.app, "/verify-email", { token: f.token, currentPassword: password.trim() });
    expect(wrong.status).toBe(401);
    expect(wrong.body).toEqual({ error: { code: "CURRENT_PASSWORD_INCORRECT", message: "Current password is incorrect" } });
    const result = await post(f.app, "/verify-email", { token: f.token, currentPassword: password });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ data: { emailVerified: true } });
    expect(result.headers["set-cookie"]).toBeUndefined();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: f.email }, include: { sessions: true } });
    expect(user.emailVerified).toBe(true);
    expect(user.sessions).toEqual([]);
    const replay = await post(f.app, "/verify-email", { token: f.token, currentPassword: password });
    expect(replay.status).toBe(400);
    expect(replay.body).toEqual({ error: { code: "LINK_INVALID_OR_EXPIRED", message: "Link is invalid or expired" } });
  });
});
