import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { hashExactPassword } from "../src/lib/exact-password.js";
import type { VerificationMessage } from "../src/lib/verification-email.js";
import { hashPassword } from "better-auth/crypto";
import { createAuth } from "../src/lib/auth.js";
import { env } from "../src/config/env.js";

const terms = { version: "legacy-consent-test-fixture", documentUrl: "https://example.com/test-fixture-terms" };
const password = " exact consent password é ";
const now = new Date("2094-01-01T00:00:00Z");
const emails: string[] = [];
const post = (app: ReturnType<typeof createApp>, path: string, body: unknown) => request(app)
  .post(`/api/auth${path}`).set("Origin", process.env.FRONTEND_URL!).send(body);
const input = (email: string) => ({ email, currentPassword: password, termsAccepted: true, termsVersion: terms.version });
const cookie = (response: request.Response) => (response.headers["set-cookie"] as unknown as string[])
  .find(value => value.startsWith("better-auth.session_token="))!.split(";")[0]!;

async function fixture(role = "ATTENDEE") {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  const id = randomUUID();
  const email = `consent-${id}@example.com`;
  emails.push(email);
  await prisma.user.create({ data: {
    id, email, firstName: "Legacy", lastName: "Owner", name: "Legacy Owner", role, status: "ACTIVE",
    emailVerified: true, termsVersion: null, termsAcceptedAt: null,
    accounts: { create: { accountId: id, providerId: "credential", password: await hashExactPassword(password) } },
  } });
  const messages: VerificationMessage[] = [];
  const options = { terms, now: () => now, registrationLimit: 10000, aggregateLimit: 10000,
    loginLimit: 10000, logoutLimit: 10000, verificationLimit: 10000, termsAcceptanceLimit: 10000,
    sendVerificationEmail: async (message: VerificationMessage) => { messages.push(message); } };
  return { app: createApp(options), options, email, id, messages };
}

afterEach(() => vi.useRealTimers());
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.emailCooldown.deleteMany({ where: { email: { in: emails } } });
  await prisma.authRateLimit.deleteMany({ where: { expiresAt: { gte: new Date("2094-01-01"), lt: new Date("2094-02-01") } } });
});

describe("Genuine legacy terms acceptance", () => {
  it("records explicit current-version acceptance with server time and requires a separate login", async () => {
    const f = await fixture();
    const blocked = await post(f.app, "/login", { email: f.email, password });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("TERMS_ACCEPTANCE_REQUIRED");
    const accepted = await post(f.app, "/accept-terms", input(` ${f.email.toUpperCase()} `));
    expect(accepted.status).toBe(200);
    expect(accepted.body).toEqual({ data: { termsAccepted: true } });
    expect(accepted.headers["set-cookie"]).toBeUndefined();
    expect(accepted.headers["cache-control"]).toBe("no-store");
    expect((await request(f.app).get("/api/v1/me")).status).toBe(401);
    expect(await prisma.session.count({ where: { userId: f.id } })).toBe(0);
    const loggedIn = await post(f.app, "/login", { email: f.email, password });
    expect(loggedIn.status).toBe(200);
    const profile = await request(f.app).get("/api/v1/me").set("Cookie", cookie(loggedIn));
    expect(profile.status).toBe(200);
    expect(profile.body.data.user).toMatchObject({ termsVersion: terms.version, termsAcceptedAt: "2094-01-01T00:00:00.000Z",
      emailVerified: true, role: "ATTENDEE", status: "ACTIVE" });
    expect(f.messages).toHaveLength(0);
  });

  it("keeps unknown and wrong credentials indistinguishable before checking account gates", async () => {
    const f = await fixture();
    const missing = await post(f.app, "/accept-terms", input(`missing-${randomUUID()}@example.com`));
    expect(missing.status).toBe(401);
    expect(missing.body).toEqual({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    for (const state of [
      { status: "DISABLED", emailVerified: false },
      { status: "ACTIVE", emailVerified: false },
      { status: "ACTIVE", emailVerified: true },
    ]) {
      await prisma.user.update({ where: { id: f.id }, data: state });
      const wrong = await post(f.app, "/accept-terms", { ...input(f.email), currentPassword: password.trim() });
      expect(wrong.status).toBe(missing.status);
      expect(wrong.body).toEqual(missing.body);
      expect(wrong.headers["set-cookie"]).toBeUndefined();
    }
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: f.id } });
    expect(saved.termsVersion).toBeNull();
    expect(saved.termsAcceptedAt).toBeNull();
  });

  it("requires active status, verified email, and transitioned credentials without fabricating account state", async () => {
    const f = await fixture();
    const legacyPassword = await hashPassword(password);
    await prisma.account.updateMany({ where: { userId: f.id }, data: { password: legacyPassword } });
    for (const { state, code } of [
      { state: { status: "DISABLED", emailVerified: false }, code: "ACCOUNT_DISABLED" },
      { state: { status: "ACTIVE", emailVerified: false }, code: "EMAIL_VERIFICATION_REQUIRED" },
      { state: { status: "ACTIVE", emailVerified: true }, code: "PASSWORD_RESET_REQUIRED" },
    ]) {
      await prisma.user.update({ where: { id: f.id }, data: state });
      const result = await post(f.app, "/accept-terms", input(f.email));
      expect(result.status).toBe(403);
      expect(result.body.error.code).toBe(code);
      expect(result.headers["set-cookie"]).toBeUndefined();
      const saved = await prisma.user.findUniqueOrThrow({ where: { id: f.id } });
      expect(saved).toMatchObject({ ...state, termsVersion: null, termsAcceptedAt: null });
    }
    expect(await prisma.session.count({ where: { userId: f.id } })).toBe(0);
    expect((await prisma.account.findFirstOrThrow({ where: { userId: f.id } })).password).toBe(legacyPassword);
  });

  it("allows an unverified legacy account to verify first, then accept terms without creating a session", async () => {
    const f = await fixture();
    await prisma.user.update({ where: { id: f.id }, data: { emailVerified: false } });
    expect((await post(f.app, "/accept-terms", input(f.email))).body.error.code).toBe("EMAIL_VERIFICATION_REQUIRED");
    expect((await post(f.app, "/resend-verification", { email: f.email })).status).toBe(200);
    const token = new URLSearchParams(new URL(f.messages[0]!.url).hash.slice(1)).get("token")!;
    const verified = await post(f.app, "/verify-email", { token, currentPassword: password });
    expect(verified.status).toBe(200);
    expect(verified.headers["set-cookie"]).toBeUndefined();
    expect((await post(f.app, "/login", { email: f.email, password })).body.error.code).toBe("TERMS_ACCEPTANCE_REQUIRED");
    expect((await post(f.app, "/accept-terms", input(f.email))).status).toBe(200);
    expect(await prisma.session.count({ where: { userId: f.id } })).toBe(0);
    expect((await post(f.app, "/login", { email: f.email, password })).status).toBe(200);
  });

  it("rejects missing, false, outdated, or forged acceptance without changing the account", async () => {
    const f = await fixture();
    const valid = input(f.email);
    const { termsAccepted: _acceptance, ...withoutAcceptance } = valid;
    const { termsVersion: _version, ...withoutVersion } = valid;
    const { currentPassword: _password, ...withoutPassword } = valid;
    const cases = [
      withoutAcceptance, withoutVersion, withoutPassword, { ...valid, termsAccepted: false },
      { ...valid, termsAccepted: "true" }, { ...valid, email: "invalid" },
      { ...valid, currentPassword: "" }, { ...valid, currentPassword: "\ud800" },
      { ...valid, currentPassword: "x".repeat(129) }, { ...valid, termsAcceptedAt: now.toISOString() },
      { ...valid, role: "ADMINISTRATOR" }, { ...valid, status: "ACTIVE" },
      { ...valid, emailVerified: true }, { ...valid, callbackURL: "https://untrusted.example" },
    ];
    for (const body of cases) {
      const result = await post(f.app, "/accept-terms", body);
      expect(result.status).toBe(400);
      expect(Object.keys(result.body.error).sort()).toEqual(["code", "message"]);
      expect(result.body.error.code).toBe("VALIDATION_ERROR");
      expect(result.headers["set-cookie"]).toBeUndefined();
    }
    for (const version of ["", "outdated", ` ${terms.version} `]) {
      const result = await post(f.app, "/accept-terms", { ...valid, termsVersion: version });
      expect(result.status).toBe(409);
      expect(result.body).toEqual({ error: { code: "TERMS_VERSION_OUTDATED", message: "Current terms version is required" } });
    }
    expect(await prisma.user.findUniqueOrThrow({ where: { id: f.id } })).toMatchObject({
      termsVersion: null, termsAcceptedAt: null, role: "ATTENDEE", emailVerified: true, status: "ACTIVE",
    });
    expect((await post(f.app, "/login", { email: f.email, password })).body.error.code).toBe("TERMS_ACCEPTANCE_REQUIRED");
  });

  it.each(["ATTENDEE", "ORGANIZER", "ADMINISTRATOR"])("preserves genuine historical acceptance and requires no future reacceptance for %s", async role => {
    const f = await fixture(role);
    await prisma.user.update({ where: { id: f.id }, data: {
      termsVersion: "genuine-historical-version", termsAcceptedAt: new Date("2090-05-01T00:00:00Z"),
    } });
    const login = await post(f.app, "/login", { email: f.email, password });
    expect(login.status).toBe(200);
    const accepted = await post(f.app, "/accept-terms", input(f.email));
    expect(accepted.status).toBe(200);
    expect(accepted.headers["set-cookie"]).toBeUndefined();
    const profile = await request(f.app).get("/api/v1/me").set("Cookie", cookie(login));
    expect(profile.status).toBe(200);
    expect(profile.body.data.user).toMatchObject({ role, termsVersion: "genuine-historical-version", termsAcceptedAt: "2090-05-01T00:00:00.000Z" });
    expect((await post(f.app, "/accept-terms", { ...input(f.email), termsVersion: "genuine-historical-version" })).status).toBe(409);
  });

  it("blocks an existing session with incomplete consent while preserving logout and genuine completion", async () => {
    const f = await fixture();
    await prisma.user.update({ where: { id: f.id }, data: { termsVersion: terms.version, termsAcceptedAt: now } });
    const first = await post(f.app, "/login", { email: f.email, password });
    const second = await post(f.app, "/login", { email: f.email, password });
    for (const incomplete of [
      { termsVersion: null, termsAcceptedAt: now },
      { termsVersion: terms.version, termsAcceptedAt: null },
      { termsVersion: " ", termsAcceptedAt: now },
    ]) {
      await prisma.user.update({ where: { id: f.id }, data: incomplete });
      const profile = await request(f.app).get("/api/v1/me").set("Cookie", cookie(first));
      expect(profile.status).toBe(403);
      expect(profile.body.error.code).toBe("TERMS_ACCEPTANCE_REQUIRED");
      expect((await post(f.app, "/login", { email: f.email, password })).body.error.code).toBe("TERMS_ACCEPTANCE_REQUIRED");
    }
    expect((await post(f.app, "/logout", {}).set("Cookie", cookie(first))).status).toBe(200);
    expect((await post(f.app, "/accept-terms", input(f.email))).status).toBe(200);
    expect((await request(f.app).get("/api/v1/me").set("Cookie", cookie(first))).status).toBe(401);
    expect((await request(f.app).get("/api/v1/me").set("Cookie", cookie(second))).status).toBe(200);
  });

  it("serializes concurrent acceptance and preserves its first genuine timestamp on retries", async () => {
    const f = await fixture();
    const anotherApp = createApp(f.options);
    const results = await Promise.all([
      post(f.app, "/accept-terms", input(f.email)), post(anotherApp, "/accept-terms", input(f.email)),
    ]);
    for (const result of results) {
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ data: { termsAccepted: true } });
      expect(result.headers["set-cookie"]).toBeUndefined();
    }
    const later = createApp({ ...f.options, now: () => new Date("2094-01-02T00:00:00Z") });
    expect((await post(later, "/accept-terms", input(f.email))).status).toBe(200);
    expect(await prisma.session.count({ where: { userId: f.id } })).toBe(0);
    const login = await post(f.app, "/login", { email: f.email, password });
    expect(login.status).toBe(200);
    expect(login.body.data.user).toMatchObject({ termsVersion: terms.version, termsAcceptedAt: "2094-01-01T00:00:00.000Z" });
  });

  it("rechecks status after waiting for a concurrent disable before recording consent", async () => {
    const f = await fixture();
    let pending: Promise<request.Response> | undefined;
    await prisma.$transaction(async tx => {
      const [{ pid } = { pid: 0 }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
      await tx.user.update({ where: { id: f.id }, data: { status: "DISABLED", lifecycleLock: randomUUID() } });
      pending = post(f.app, "/accept-terms", input(f.email)).then(response => response);
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
    }, { timeout: 10000 });
    const result = await pending!;
    expect(result.status).toBe(403);
    expect(result.body.error.code).toBe("ACCOUNT_DISABLED");
    expect(result.headers["set-cookie"]).toBeUndefined();
    expect(await prisma.user.findUniqueOrThrow({ where: { id: f.id } })).toMatchObject({
      status: "DISABLED", termsVersion: null, termsAcceptedAt: null,
    });
  });

  it("rolls back the acceptance transaction if persistence fails", async () => {
    const f = await fixture();
    const before = await prisma.user.findUniqueOrThrow({ where: { id: f.id } });
    const constraint = `consent_test_${randomUUID().replaceAll("-", "")}`;
    if (!/^[a-f0-9-]{36}$/.test(f.id)) throw new Error("Unexpected fixture ID");
    await prisma.$executeRawUnsafe(`ALTER TABLE public.\"user\" ADD CONSTRAINT ${constraint} CHECK (id <> '${f.id}'::uuid OR \"termsAcceptedAt\" IS NULL) NOT VALID`);
    try {
      const result = await post(f.app, "/accept-terms", input(f.email));
      expect(result.status).toBe(500);
      expect(result.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed" } });
      expect(result.headers["set-cookie"]).toBeUndefined();
      const saved = await prisma.user.findUniqueOrThrow({ where: { id: f.id } });
      expect(saved).toMatchObject({ termsVersion: null, termsAcceptedAt: null, lifecycleLock: before.lifecycleLock });
    } finally {
      await prisma.$executeRawUnsafe(`ALTER TABLE public.\"user\" DROP CONSTRAINT ${constraint}`);
    }
    expect((await post(f.app, "/accept-terms", input(f.email))).status).toBe(200);
  });
});

describe("Terms acceptance request policy", () => {
  const options = { terms, now: () => new Date("2094-01-10T00:00:00Z"), termsAcceptanceLimit: 10000, aggregateLimit: 10000 };

  it("requires reviewed terms configuration before activating legacy acceptance", async () => {
    const version = process.env.CURRENT_TERMS_VERSION;
    const documentUrl = process.env.CURRENT_TERMS_DOCUMENT_URL;
    delete process.env.CURRENT_TERMS_VERSION;
    delete process.env.CURRENT_TERMS_DOCUMENT_URL;
    try {
      const result = await post(createApp({ ...options, terms: undefined }), "/accept-terms", input("fixture@example.com"));
      expect(result.status).toBe(503);
      expect(result.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Current terms are unavailable" } });
      expect(result.headers["set-cookie"]).toBeUndefined();
    } finally {
      if (version !== undefined) process.env.CURRENT_TERMS_VERSION = version;
      if (documentUrl !== undefined) process.env.CURRENT_TERMS_DOCUMENT_URL = documentUrl;
    }
  });

  it("enforces Origin, JSON, body limits, methods, and canonical paths", async () => {
    const app = createApp(options);
    for (const origin of [undefined, "null", "https://untrusted.example"]) {
      const pending = request(app).post("/api/auth/accept-terms").send(input("fixture@example.com"));
      const result = await (origin === undefined ? pending : pending.set("Origin", origin));
      expect(result.status).toBe(403);
      expect(result.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
    }
    const form = await request(app).post("/api/auth/accept-terms").set("Origin", env.FRONTEND_URL).type("form").send({ termsAccepted: true });
    expect(form.status).toBe(415);
    const malformed = await request(app).post("/api/auth/accept-terms").set("Origin", env.FRONTEND_URL)
      .set("Content-Type", "application/json").send('{"currentPassword":');
    expect(malformed.status).toBe(400);
    expect(malformed.body).toEqual({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } });
    expect((await post(app, "/accept-terms", { currentPassword: "x".repeat(17000) })).status).toBe(413);
    const method = await request(app).get("/api/auth/accept-terms");
    expect(method.status).toBe(405);
    expect(method.headers.allow).toBe("POST");
    for (const path of ["/accept-terms/", "/ACCEPT-TERMS", "/%61ccept-terms", "/acceptTerms", "/sign-in/email", "/update-user"]) {
      const denied = await post(app, path, input("fixture@example.com"));
      expect(denied.status).toBe(404);
      expect(denied.headers["set-cookie"]).toBeUndefined();
    }
  });

  it("shares credential-attempt limits across app instances, ignores spoofed IPs, and recovers after the window", async () => {
    let time = new Date("2094-01-11T00:00:00Z");
    const settings = { ...options, now: () => time, termsAcceptanceLimit: 2 };
    const first = createApp(settings), second = createApp(settings);
    for (const [index, app] of [first, second].entries()) {
      const result = await post(app, "/accept-terms", input(`missing-${randomUUID()}@example.com`))
        .set("X-Forwarded-For", `192.0.2.${index + 1}`).set("X-Aventix-Client-IP", `192.0.2.${index + 1}`);
      expect(result.status).toBe(401);
    }
    const denied = await post(second, "/accept-terms", {}).set("X-Forwarded-For", "192.0.2.3");
    expect(denied.status).toBe(429);
    expect(denied.headers["retry-after"]).toBe("900");
    expect(denied.body).toEqual({ error: { code: "RATE_LIMITED", message: "Too many requests" } });
    time = new Date(time.getTime() + 900_000);
    expect((await post(first, "/accept-terms", {})).status).toBe(400);
  });

  it("counts consent attempts toward the shared authentication mutation limit", async () => {
    const app = createApp({ ...options, now: () => new Date("2094-01-12T00:00:00Z"), aggregateLimit: 2 });
    expect((await post(app, "/accept-terms", {})).status).toBe(400);
    expect((await post(app, "/logout", {})).status).toBe(200);
    expect((await post(app, "/accept-terms", {})).status).toBe(429);
  });

  it("also enforces acceptance and bypass policy through the Better Auth handler", async () => {
    const f = await fixture();
    const auth = createAuth(f.options);
    const send = (path: string, body: unknown, origin = env.FRONTEND_URL) => auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth${path}`, {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
    }));
    expect((await send("/accept-terms", { ...input(f.email), termsAccepted: false })).status).toBe(400);
    expect((await send("/accept-terms", input(f.email), "null")).status).toBe(403);
    for (const path of ["/accept-terms/", "/ACCEPT-TERMS", "/%61ccept-terms", "/update-user", "/sign-in/email"]) {
      expect((await send(path, input(f.email))).status).toBe(404);
    }
    const accepted = await send("/accept-terms", input(f.email));
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toEqual({ data: { termsAccepted: true } });
    expect(accepted.headers.has("set-cookie")).toBe(false);
    expect((await auth.handler(new Request(`${env.BETTER_AUTH_URL}/api/auth/accept-terms`))).status).toBe(405);
  });
});
