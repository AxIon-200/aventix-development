import { createHmac, randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import type { VerificationMessage } from "../src/lib/verification-email.js";
import { hashPassword } from "better-auth/crypto";
import { hashExactPassword } from "../src/lib/exact-password.js";
import { createAuth } from "../src/lib/auth.js";
import { env } from "../src/config/env.js";
const originalEnv = { ...env };

const terms = { version: "sessions-test-fixture", documentUrl: "https://example.com/test-fixture-terms" };
const password = " exact session password é ";
const emails: string[] = [];
const post = (app: ReturnType<typeof createApp>, path: string, body?: unknown) => request(app)
  .post(`/api/auth${path}`).set("Origin", process.env.FRONTEND_URL!).send(body);
const sessionCookie = (response: request.Response) => (response.headers["set-cookie"] as unknown as string[])
  .find(value => value.startsWith("better-auth.session_token="))!.split(";")[0]!;
const me = (app: ReturnType<typeof createApp>, cookie?: string) => {
  const pending = request(app).get("/api/v1/me");
  return cookie ? pending.set("Cookie", cookie) : pending;
};

async function fixture(role = "ATTENDEE", currentPassword = password) {
  let time = new Date("2093-01-01T00:00:00Z");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(time);
  const messages: VerificationMessage[] = [];
  const email = `sessions-${randomUUID()}@example.com`;
  emails.push(email);
  const options = { terms, now: () => time, registrationLimit: 10000, aggregateLimit: 10000,
    loginLimit: 10000, logoutLimit: 10000, verificationLimit: 10000,
    sendVerificationEmail: async (message: VerificationMessage) => { messages.push(message); } };
  const app = createApp(options);
  if (role !== "ATTENDEE") {
    // Privileged identities are created in isolated fixtures, never by changing a role.
    const id = randomUUID();
    await prisma.user.create({ data: { id, firstName: "Session", lastName: "Owner", name: "Session Owner",
      email, role, status: "ACTIVE", emailVerified: true, termsVersion: terms.version, termsAcceptedAt: time,
      accounts: { create: { accountId: id, providerId: "credential", password: await hashExactPassword(currentPassword) } } } });
    if (role === "ORGANIZER") await prisma.organizerProfile.create({ data: {
      userId: id, organizationName: "Controlled approved organizer", approvalStatus: "APPROVED",
    } });
  } else {
    const registered = await post(app, "/register", { firstName: "Session", lastName: "Owner", email, password: currentPassword,
      termsAccepted: true, termsVersion: terms.version });
    expect(registered.status).toBe(201);
    const token = new URLSearchParams(new URL(messages[0]!.url).hash.slice(1)).get("token")!;
    expect((await post(app, "/verify-email", { token, currentPassword })).status).toBe(200);
  }
  return { app, options, email, messages, advance: (ms: number) => {
    time = new Date(time.getTime() + ms);
    vi.setSystemTime(time);
  } };
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); Object.assign(env, originalEnv); });
afterAll(async () => {
  await prisma.organizerProfile.deleteMany({ where: { user: { email: { in: emails } } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.emailCooldown.deleteMany({ where: { email: { in: emails } } });
  await prisma.authRateLimit.deleteMany({ where: { expiresAt: { gte: new Date("2093-01-01"), lt: new Date("2093-02-01") } } });
});

describe("Login and own account", () => {
  it("logs in with normalized email and returns only the permitted own profile with cookie credentials", async () => {
    const f = await fixture();
    const result = await post(f.app, "/login", { email: ` ${f.email.toUpperCase()} `, password });
    expect(result.status).toBe(200);
    expect(Object.keys(result.body)).toEqual(["data"]);
    expect(Object.keys(result.body.data)).toEqual(["user"]);
    expect(Object.keys(result.body.data.user).sort()).toEqual([
      "id", "firstName", "lastName", "name", "email", "phoneNumber", "role", "status", "emailVerified",
      "termsVersion", "termsAcceptedAt", "createdAt", "updatedAt",
    ].sort());
    expect(result.body.data.user).toMatchObject({ email: f.email, firstName: "Session", lastName: "Owner",
      name: "Session Owner", phoneNumber: null, role: "ATTENDEE", status: "ACTIVE", emailVerified: true,
      termsVersion: terms.version, termsAcceptedAt: "2093-01-01T00:00:00.000Z" });
    const cookies = result.headers["set-cookie"] as unknown as string[];
    const sessionCookie = cookies.find(cookie => cookie.startsWith("better-auth.session_token="))!;
    const attributes = sessionCookie.split(";").slice(1).map(value => value.trim());
    expect(attributes).toEqual(expect.arrayContaining(["HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=604800"]));
    expect(attributes.some(value => value.startsWith("Domain="))).toBe(false);
    expect(attributes).not.toContain("Secure");
    const profile = await request(f.app).get("/api/v1/me").set("Cookie", sessionCookie.split(";")[0]!);
    expect(profile.status).toBe(200);
    expect(profile.body).toEqual(result.body);
    expect(profile.headers["cache-control"]).toBe("no-store");
    expect(profile.headers["set-cookie"]).toBeUndefined();
    expect(f.messages).toHaveLength(1);
  });

  it("logs out only the requesting device, clears cookies, and succeeds when repeated or bodyless", async () => {
    const f = await fixture();
    const [first, second] = await Promise.all([
      post(f.app, "/login", { email: f.email, password }),
      post(f.app, "/login", { email: f.email, password }),
    ]);
    const cookie = (response: typeof first) => (response.headers["set-cookie"] as unknown as string[])
      .find(value => value.startsWith("better-auth.session_token="))!.split(";")[0]!;
    const a = cookie(first), b = cookie(second);
    expect(a === b).toBe(false);
    const blocked = await request(f.app).post("/api/auth/logout").set("Cookie", a);
    expect(blocked.status).toBe(403);
    expect((await me(f.app, a)).status).toBe(200);
    const logout = await post(f.app, "/logout").set("Cookie", a);
    expect(logout.status).toBe(200);
    expect(logout.body).toEqual({ data: { loggedOut: true } });
    expect((logout.headers["set-cookie"] as unknown as string[]).some(value =>
      value.startsWith("better-auth.session_token=;") && value.includes("Max-Age=0") && value.includes("Path=/"))).toBe(true);
    expect((await request(f.app).get("/api/v1/me").set("Cookie", a)).status).toBe(401);
    expect((await request(f.app).get("/api/v1/me").set("Cookie", b)).status).toBe(200);
    for (const oldCookie of [a, "better-auth.session_token=invalid", ""]) {
      const repeated = await post(f.app, "/logout", {}).set("Cookie", oldCookie);
      expect(repeated.status).toBe(200);
      expect(repeated.body).toEqual(logout.body);
      expect(repeated.headers["set-cookie"]).toBeDefined();
    }
  });

  it("uses identical invalid-credential responses and reveals gates only after the correct exact password", async () => {
    const f = await fixture();
    const missing = await post(f.app, "/login", { email: `missing-${randomUUID()}@example.com`, password });
    expect(missing.status).toBe(401);
    expect(missing.body).toEqual({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    const legacyHash = await hashPassword(password);
    const cases = [
      { update: { status: "DISABLED", emailVerified: false, termsAcceptedAt: null }, code: "ACCOUNT_DISABLED" },
      { update: { status: "ACTIVE", emailVerified: false }, code: "EMAIL_VERIFICATION_REQUIRED" },
      { update: { emailVerified: true }, code: "TERMS_ACCEPTANCE_REQUIRED" },
      { update: { termsAcceptedAt: new Date(), termsVersion: "historical-genuine-version" }, code: "PASSWORD_RESET_REQUIRED" },
    ];
    await prisma.account.updateMany({ where: { user: { email: f.email }, providerId: "credential" }, data: { password: legacyHash } });
    for (const { update, code } of cases) {
      await prisma.user.update({ where: { email: f.email }, data: update });
      const wrong = await post(f.app, "/login", { email: f.email, password: "wrong password" });
      expect(wrong.status).toBe(missing.status);
      expect(wrong.body).toEqual(missing.body);
      const correct = await post(f.app, "/login", { email: f.email, password });
      expect(correct.status).toBe(403);
      expect(correct.body.error.code).toBe(code);
      expect(correct.headers["set-cookie"]).toBeUndefined();
    }
    expect(f.messages).toHaveLength(1);
    expect(await prisma.session.count({ where: { user: { email: f.email } } })).toBe(0);
  });

  it("requires current account gates for existing sessions and rejects missing, revoked, or forged credentials", async () => {
    const f = await fixture();
    const login = await post(f.app, "/login", { email: f.email, password });
    const cookie = sessionCookie(login);
    for (const update of [
      { data: { status: "DISABLED", emailVerified: false }, code: "ACCOUNT_DISABLED" },
      { data: { status: "ACTIVE", emailVerified: false }, code: "EMAIL_VERIFICATION_REQUIRED" },
      { data: { emailVerified: true, termsVersion: null }, code: "TERMS_ACCEPTANCE_REQUIRED" },
      { data: { termsVersion: "genuine-old-version", termsAcceptedAt: null }, code: "TERMS_ACCEPTANCE_REQUIRED" },
    ]) {
      await prisma.user.update({ where: { email: f.email }, data: update.data });
      const result = await me(f.app, cookie);
      expect(result.status).toBe(403);
      expect(result.body.error.code).toBe(update.code);
    }
    await prisma.user.update({ where: { email: f.email }, data: { termsAcceptedAt: new Date() } });
    expect((await me(f.app, cookie)).status).toBe(200);
    await prisma.account.updateMany({ where: { user: { email: f.email } }, data: { password: await hashPassword(password) } });
    expect((await me(f.app, cookie)).body.error.code).toBe("PASSWORD_RESET_REQUIRED");
    // Missing and malformed credentials fail closed even for a previously issued session.
    for (const credential of [null, "aventix-scrypt-v1$corrupt"]) {
      await prisma.account.updateMany({ where: { user: { email: f.email } }, data: { password: credential } });
      expect((await me(f.app, cookie)).status).toBe(401);
    }
    await prisma.session.deleteMany({ where: { user: { email: f.email } } });
    for (const value of [cookie, undefined, "better-auth.session_token=forged"]) {
      const result = await me(f.app, value);
      expect(result.status).toBe(401);
      expect(result.body).toEqual({ error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication required" } });
    }
  });

  it.each(["ATTENDEE", "ORGANIZER", "ADMINISTRATOR"])("preserves the original seven-day expiry across activity and reopening for %s", async role => {
    const f = await fixture(role);
    const login = await post(f.app, "/login", { email: f.email, password });
    expect(login.status).toBe(200);
    const cookie = sessionCookie(login);
    const original = await prisma.session.findFirstOrThrow({ where: { user: { email: f.email } } });
    expect(original.createdAt.toISOString()).toBe("2093-01-01T00:00:00.000Z");
    expect(original.expiresAt.toISOString()).toBe("2093-01-08T00:00:00.000Z");
    const header: string = (login.headers["set-cookie"] as unknown as string[])[0]!;
    expect(header.split(";").slice(1).map(part => part.trim())).toContain("Expires=Thu, 08 Jan 2093 00:00:00 GMT");
    f.advance(6 * 86400_000);
    for (const instance of [f.app, createApp(f.options)]) {
      const resumed = await me(instance, cookie);
      expect(resumed.status).toBe(200);
      expect(resumed.body.data.user.role).toBe(role);
      expect(resumed.headers["set-cookie"]).toBeUndefined();
    }
    f.advance(86400_000 - 1);
    expect((await me(f.app, cookie)).status).toBe(200);
    f.advance(1);
    expect((await me(f.app, cookie)).body).toEqual({ error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication required" } });
    const saved = await prisma.session.findUniqueOrThrow({ where: { id: original.id } });
    expect(saved.expiresAt).toEqual(original.expiresAt);
    expect(saved.updatedAt).toEqual(original.updatedAt);
    const expiredLogout = await post(f.app, "/logout").set("Cookie", cookie);
    expect(expiredLogout.status).toBe(200);
    expect((await me(f.app, cookie)).status).toBe(401);
    const fresh = await post(f.app, "/login", { email: f.email, password });
    expect(fresh.status).toBe(200);
    expect(sessionCookie(fresh) === cookie).toBe(false);
  });

  it("keeps different accounts private even when another account ID is submitted", async () => {
    const a = await fixture();
    const b = await fixture();
    const first = await post(a.app, "/login", { email: a.email, password });
    const second = await post(a.app, "/login", { email: b.email, password });
    expect(first.body.data.user.id === second.body.data.user.id).toBe(false);
    const result = await request(a.app).get(`/api/v1/me?userId=${second.body.data.user.id}`).set("Cookie", sessionCookie(first));
    expect(result.body.data.user.email).toBe(a.email);
    expect((await request(a.app).get(`/api/v1/me/${second.body.data.user.id}`).set("Cookie", sessionCookie(first))).status).toBe(404);
  });

  it("preserves spaces and Unicode spellings and accepts 128 code-point passwords", async () => {
    const exact = ` K${"😀".repeat(125)} `;
    const f = await fixture("ATTENDEE", exact);
    for (const wrong of [exact.trim(), exact.normalize("NFKC")]) {
      expect((await post(f.app, "/login", { email: f.email, password: wrong })).body.error.code).toBe("INVALID_CREDENTIALS");
    }
    expect((await post(f.app, "/login", { email: f.email, password: exact })).status).toBe(200);
  });

  it("does not inherit a native nonpersistent-cookie choice or trust client-supplied IP headers", async () => {
    const f = await fixture();
    const signature = createHmac("sha256", env.BETTER_AUTH_SECRET).update("true").digest("base64");
    const legacyPreference = `better-auth.dont_remember=${encodeURIComponent(`true.${signature}`)}`;
    const login = await post(f.app, "/login", { email: f.email, password })
      .set("Cookie", legacyPreference).set("X-Forwarded-For", "192.0.2.1")
      .set("X-Aventix-Client-IP", "192.0.2.2");
    expect(login.status).toBe(200);
    const header = (login.headers["set-cookie"] as unknown as string[]).find(value => value.startsWith("better-auth.session_token="))!;
    expect(header.split(";").slice(1).map(value => value.trim())).toContain("Max-Age=604800");
    const saved = await prisma.session.findFirstOrThrow({ where: { user: { email: f.email } } });
    expect(["::ffff:127.0.0.1", "::1", "127.0.0.1"]).toContain(saved.ipAddress);
  });

  it("rechecks account status after waiting for an in-flight disable before issuing a session", async () => {
    const f = await fixture();
    let pending: Promise<request.Response> | undefined;
    await prisma.$transaction(async tx => {
      const [{ pid } = { pid: 0 }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
      // A trusted disable operation uses the same user-row lock, then revokes sessions.
      await tx.user.update({ where: { email: f.email }, data: { status: "DISABLED", lifecycleLock: randomUUID() } });
      pending = post(f.app, "/login", { email: f.email, password }).then(response => response);
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
      await tx.session.deleteMany({ where: { user: { email: f.email } } });
    }, { timeout: 10000 });
    const result = await pending!;
    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe("ACCOUNT_DISABLED");
    expect(result.headers["set-cookie"]).toBeUndefined();
    expect(await prisma.session.count({ where: { user: { email: f.email } } })).toBe(0);
  });

  it("rolls back the login transaction and sends no cookie if session persistence fails", async () => {
    const f = await fixture();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: f.email } });
    const constraint = `session_test_${randomUUID().replaceAll("-", "")}`;
    if (!/^[a-f0-9-]{36}$/.test(user.id)) throw new Error("Unexpected fixture ID");
    await prisma.$executeRawUnsafe(`ALTER TABLE public.session ADD CONSTRAINT ${constraint} CHECK ("userId" <> '${user.id}'::uuid) NOT VALID`);
    try {
      const result = await post(f.app, "/login", { email: f.email, password });
      expect(result.status).toBe(500);
      expect(result.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed" } });
      expect(result.headers["set-cookie"]).toBeUndefined();
      expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
      const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(saved.lifecycleLock).toBe(user.lifecycleLock);
    } finally {
      await prisma.$executeRawUnsafe(`ALTER TABLE public.session DROP CONSTRAINT ${constraint}`);
    }
    expect((await post(f.app, "/login", { email: f.email, password })).status).toBe(200);
  });

  it("never revives revoked device sessions after disabling and re-enabling an account", async () => {
    const f = await fixture();
    const [first, second] = await Promise.all([
      post(f.app, "/login", { email: f.email, password }),
      post(f.app, "/login", { email: f.email, password }),
    ]);
    const cookies = [sessionCookie(first), sessionCookie(second)];
    // Trusted status commands belong to #63; model their durable effects here.
    await prisma.$transaction(async tx => {
      const user = await tx.user.update({ where: { email: f.email }, data: { status: "DISABLED", lifecycleLock: randomUUID() } });
      await tx.session.deleteMany({ where: { userId: user.id } });
    });
    for (const cookie of cookies) expect((await me(f.app, cookie)).status).toBe(401);
    await prisma.user.update({ where: { email: f.email }, data: { status: "ACTIVE", lifecycleLock: randomUUID() } });
    for (const cookie of cookies) expect((await me(f.app, cookie)).status).toBe(401);
    expect((await post(f.app, "/login", { email: f.email, password })).status).toBe(200);
  });
});

describe("Session request policy", () => {
  const options = { now: () => new Date("2093-01-20T00:00:00Z"), loginLimit: 10000, logoutLimit: 10000, aggregateLimit: 10000 };

  it.each(["/login", "/logout"])("rejects unsafe origins, content, and invalid JSON for %s", async path => {
    const app = createApp(options);
    for (const origin of [undefined, "null", "https://untrusted.example"]) {
      let pending = request(app).post(`/api/auth${path}`);
      if (origin) pending = pending.set("Origin", origin);
      const result = await pending.send({});
      expect(result.status).toBe(403);
      expect(result.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
      expect(result.headers["set-cookie"]).toBeUndefined();
    }
    const form = await request(app).post(`/api/auth${path}`).set("Origin", env.FRONTEND_URL).type("form").send({ email: "a@example.com" });
    expect(form.status).toBe(415);
    const malformed = await request(app).post(`/api/auth${path}`).set("Origin", env.FRONTEND_URL)
      .set("Content-Type", "application/json").send('{"password":');
    expect(malformed.status).toBe(400);
    expect(malformed.body).toEqual({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } });
    const oversized = await post(app, path, { password: "x".repeat(17000) });
    expect(oversized.status).toBe(413);
    expect(oversized.body.error.code).toBe("PAYLOAD_TOO_LARGE");
    const method = await request(app).get(`/api/auth${path}`);
    expect(method.status).toBe(405);
    expect(method.headers.allow).toBe("POST");
  });

  it.each([
    { path: "/login", body: { email: "invalid", password } },
    { path: "/login", body: { email: "fixture@example.com", password, rememberMe: false } },
    { path: "/login", body: { email: "fixture@example.com", password, callbackURL: "https://untrusted.example" } },
    { path: "/login", body: { email: "fixture@example.com", password, role: "ADMINISTRATOR" } },
    { path: "/login", body: { email: "fixture@example.com", password: "\ud800" } },
    { path: "/logout", body: { token: "forged" } },
    { path: "/logout", body: { userId: randomUUID() } },
    { path: "/logout", body: { callbackURL: "https://untrusted.example" } },
  ])("rejects unsupported fields or invalid values safely (case %#)", async ({ path, body }) => {
    const result = await post(createApp(options), path, body);
    expect(result.status).toBe(400);
    expect(Object.keys(result.body.error).sort()).toEqual(["code", "message"]);
    expect(result.body.error.code).toBe("VALIDATION_ERROR");
    expect(result.headers["set-cookie"]).toBeUndefined();
  });

  it.each(["/login", "/logout"])("shares durable IP counters across processes and ignores forwarded headers for %s", async path => {
    let time = new Date(path === "/login" ? "2093-01-21T00:00:00Z" : "2093-01-22T00:00:00Z");
    const settings = { now: () => time, loginLimit: 2, logoutLimit: 2, aggregateLimit: 10000 };
    const first = createApp(settings), second = createApp(settings);
    for (const app of [first, second]) {
      const result = await post(app, path, {}).set("X-Forwarded-For", `192.0.2.${app === first ? 1 : 2}`);
      expect(result.status).toBe(path === "/login" ? 400 : 200);
    }
    const denied = await post(second, path, {}).set("X-Forwarded-For", "192.0.2.3");
    expect(denied.status).toBe(429);
    expect(denied.headers["retry-after"]).toBe("900");
    expect(denied.body).toEqual({ error: { code: "RATE_LIMITED", message: "Too many requests" } });
    time = new Date(time.getTime() + 900_000);
    expect((await post(first, path, {})).status).toBe(path === "/login" ? 400 : 200);
  });

  it("counts login and logout toward the shared aggregate limit", async () => {
    const app = createApp({ ...options, now: () => new Date("2093-01-23T00:00:00Z"), aggregateLimit: 2 });
    expect((await post(app, "/login", {})).status).toBe(400);
    expect((await post(app, "/logout", {})).status).toBe(200);
    expect((await post(app, "/logout", {})).status).toBe(429);
  });

  it("enforces the safe contract through the Better Auth handler and keeps its internal profile route private", async () => {
    const f = await fixture();
    const auth = createAuth(f.options);
    const send = (path: string, body: unknown, origin = env.FRONTEND_URL) => auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth${path}`, {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
    }));
    const login = await send("/login", { email: f.email, password });
    expect(login.status).toBe(200);
    expect(Object.keys(await login.json())).toEqual(["data"]);
    expect(login.headers.has("set-cookie")).toBe(true);
    expect((await send("/login", { email: f.email, password, rememberMe: false })).status).toBe(400);
    expect((await send("/logout", {}, "null")).status).toBe(403);
    for (const path of ["/sign-in/email", "/sign-out", "/get-session", "/own-profile", "/LOGIN", "/login/", "/%6cogin"]) {
      expect((await send(path, {})).status).toBe(404);
    }
    expect((await auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth/login`))).status).toBe(405);
    expect((await auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth/own-profile`))).status).toBe(404);
    const bodyless = await auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth/logout`, { method: "POST", headers: { Origin: env.FRONTEND_URL } }));
    expect(bodyless.status).toBe(200);
    expect(await bodyless.json()).toEqual({ data: { loggedOut: true } });
  });

  it("requires HTTPS in production and issues host-only secure cookies for the HTTPS arrangement", async () => {
    const f = await fixture();
    env.NODE_ENV = "production";
    expect(() => createApp(f.options)).toThrow("Production authentication requires HTTPS");
    env.BETTER_AUTH_URL = "https://api.example.com";
    env.FRONTEND_URL = "https://www.example.com";
    const app = createApp(f.options);
    const login = await request(app).post("/api/auth/login").set("Origin", env.FRONTEND_URL).send({ email: f.email, password });
    expect(login.status).toBe(200);
    const header = (login.headers["set-cookie"] as unknown as string[]).find(value => value.startsWith("__Secure-better-auth.session_token="))!;
    expect(Boolean(header)).toBe(true);
    const attrs = header.split(";").slice(1).map(value => value.trim());
    expect(attrs).toEqual(expect.arrayContaining(["Secure", "HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=604800"]));
    expect(attrs.some(value => value.startsWith("Domain="))).toBe(false);
    const logout = await request(app).post("/api/auth/logout").set("Origin", env.FRONTEND_URL).set("Cookie", header.split(";")[0]!);
    expect(logout.status).toBe(200);
    const cleared = (logout.headers["set-cookie"] as unknown as string[]).find(value => value.startsWith("__Secure-better-auth.session_token=;"))!;
    expect(cleared.split(";").slice(1).map(value => value.trim())).toEqual(expect.arrayContaining(["Secure", "HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=0"]));
    expect(login.headers["access-control-allow-origin"]).toBe(env.FRONTEND_URL);
    expect(login.headers["access-control-allow-credentials"]).toBe("true");
  });
});
