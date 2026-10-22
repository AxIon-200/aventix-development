import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import type { VerificationMessage } from "../src/lib/verification-email.js";
import { createHash, scryptSync } from "node:crypto";

const terms = Object.freeze({
  version: "test-fixture-v1",
  documentUrl: "https://example.com/test-fixture-terms",
});

describe("Attendee registration", () => {
  const emails: string[] = [];
  const newEmail = () => {
    const email = `registration-${randomUUID()}@example.com`;
    emails.push(email);
    return email;
  };
  const valid = (email = newEmail()) => ({ firstName: "Aventix", lastName: "Test", email,
    password: " exact test password é ", termsAccepted: true, termsVersion: terms.version });
  const makeApp = (options: Parameters<typeof createApp>[0] = {}) => createApp({ terms,
    registrationLimit: 1000, aggregateLimit: 2000, sendVerificationEmail: async () => {}, ...options });
  const register = (app: ReturnType<typeof createApp>, body: unknown) => request(app)
    .post("/api/auth/register").set("Origin", process.env.FRONTEND_URL!).send(body);
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.emailCooldown.deleteMany({ where: { email: { in: emails } } });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends verification through the configured Resend transport after registration", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-provider-key");
    vi.stubEnv("AUTH_EMAIL_FROM", "Aventix <sender@example.com>");
    const delivery = vi.fn(async (_url: string, _options: RequestInit) => Response.json({ id: "fixture-provider-id" }));
    vi.stubGlobal("fetch", delivery);
    const body = valid();
    const app = createApp({ terms, registrationLimit: 1000, aggregateLimit: 2000 });
    const response = await register(app, body);
    expect(response.status).toBe(201);
    expect(response.headers["set-cookie"]).toBeUndefined();
    const [url, options] = delivery.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({ Authorization: "Bearer test-provider-key", "Content-Type": "application/json" });
    const mail = JSON.parse(options.body as string);
    expect(mail).toMatchObject({ from: "Aventix <sender@example.com>", to: [body.email], subject: "Verify your Aventix email" });
    expect(mail.text).toContain("#token=");
    expect(mail.html).toContain("#token=");
    expect(mail.text).toContain("current password");
  });

  it("retains the account, consent, verification link and cooldown when delivery fails", async () => {
    const body = valid();
    const before = new Date();
    const app = makeApp({ sendVerificationEmail: async () => { throw new Error("Simulated provider outage"); } });
    const response = await register(app, body);
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: { code: "ACCOUNT_CREATED_EMAIL_FAILED",
      message: "Account was created, but verification email could not be sent. Request another verification email." } });
    expect(response.headers["set-cookie"]).toBeUndefined();
    const saved = await prisma.user.findUniqueOrThrow({ where: { email: body.email }, include: { authLinks: true, sessions: true } });
    expect(saved).toMatchObject({ emailVerified: false, termsVersion: terms.version, sessions: [] });
    expect(saved.termsAcceptedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(saved.authLinks).toHaveLength(1);
    const cooldown = await prisma.emailCooldown.findUniqueOrThrow({ where: { email_purpose: { email: body.email, purpose: "EMAIL_VERIFICATION" } } });
    expect(cooldown.attemptedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(saved.authLinks[0]!.expiresAt.getTime() - saved.authLinks[0]!.createdAt.getTime()).toBe(86_400_000);
    const duplicate = await register(app, { ...body, firstName: "Replacement", password: "some different password" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({ error: { code: "EMAIL_ALREADY_REGISTERED", message: "Email is already registered" } });
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { email: body.email } });
    expect(unchanged.firstName).toBe("Aventix");
    expect(unchanged.termsAcceptedAt).toEqual(saved.termsAcceptedAt);
    expect((await prisma.emailCooldown.findUniqueOrThrow({ where: { id: cooldown.id } })).attemptedAt).toEqual(cooldown.attemptedAt);
  });

  it("stores a digest instead of the captured token and hashes the exact untrimmed Unicode password", async () => {
    const messages: VerificationMessage[] = [];
    const body = valid();
    const app = makeApp({ sendVerificationEmail: async message => { messages.push(message); } });
    expect((await register(app, body)).status).toBe(201);
    const link = new URL(messages[0]!.url);
    expect(link.origin).toBe(new URL(process.env.FRONTEND_URL!).origin);
    expect(link.pathname).toBe("/verify-email");
    expect(link.search).toBe("");
    const token = new URLSearchParams(link.hash.slice(1)).get("token")!;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: body.email }, include: { accounts: true, authLinks: true } });
    expect(user.authLinks[0]!.digest).toBe(createHash("sha256").update(token).digest("hex"));
    expect(user.authLinks[0]!.digest).not.toContain(token);
    const [, salt, key] = user.accounts[0]!.password!.split("$");
    const derive = (password: string) => scryptSync(password, Buffer.from(salt!, "hex"), 64,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }).toString("hex");
    expect(derive(body.password)).toBe(key);
    expect(derive(body.password.trim())).not.toBe(key);
    expect(derive(body.password.normalize("NFD"))).not.toBe(key);
    const landing = await request(app).get("/api/auth/verification");
    expect(landing.status).toBe(200);
    expect(landing.headers["cache-control"]).toBe("no-store");
    expect(landing.headers["referrer-policy"]).toBe("no-referrer");
    expect(landing.headers["set-cookie"]).toBeUndefined();
    expect(landing.text).not.toContain(token);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).toBe(false);
  });

  it("rejects duplicate normalized emails without changing credentials, profile, links or consent", async () => {
    const app = makeApp();
    const body = valid();
    expect((await register(app, body)).status).toBe(201);
    const before = await prisma.user.findUniqueOrThrow({ where: { email: body.email }, include: { accounts: true, authLinks: true } });
    const response = await register(app, { ...body, email: ` ${body.email.toUpperCase()} `, password: "replacement password!", firstName: "Other" });
    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: { code: "EMAIL_ALREADY_REGISTERED", message: "Email is already registered" } });
    const after = await prisma.user.findUniqueOrThrow({ where: { email: body.email }, include: { accounts: true, authLinks: true } });
    expect(after).toEqual(before);
  });

  it("creates exactly one account and email for concurrent duplicate registrations", async () => {
    const messages: VerificationMessage[] = [];
    const app = makeApp({ sendVerificationEmail: async message => { messages.push(message); } });
    const body = valid();
    const responses = await Promise.all([register(app, body), register(app, { ...body, email: body.email.toUpperCase() })]);
    expect(responses.map(response => response.status).sort()).toEqual([201, 409]);
    expect(await prisma.user.count({ where: { email: body.email } })).toBe(1);
    expect(messages).toHaveLength(1);
  });

  it("rolls back account, credentials and links when the final persistence write fails", async () => {
    const body = valid();
    const messages: VerificationMessage[] = [];
    // A conflicting cooldown fixture forces a real database failure after the
    // account, credential and link inserts, without replacing any collaborators.
    const cooldown = await prisma.emailCooldown.create({ data: {
      id: randomUUID(), email: body.email, purpose: "EMAIL_VERIFICATION", attemptedAt: new Date(),
    } });
    const response = await register(makeApp({
      sendVerificationEmail: async message => { messages.push(message); },
    }), body);
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed" } });
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(await prisma.user.count({ where: { email: body.email } })).toBe(0);
    expect(await prisma.emailCooldown.findUniqueOrThrow({ where: { id: cooldown.id } })).toEqual(cooldown);
    expect(messages).toEqual([]);
  });

  it.each([
    { firstName: "" }, { firstName: "   " }, { firstName: "🪩".repeat(101) },
    { lastName: "" }, { lastName: "🪩".repeat(101) },
    { password: "🪩".repeat(14) }, { password: "🪩".repeat(129) },
    { password: "\ud800".repeat(15) },
    { email: "invalid" }, { email: null },
    { phoneNumber: null }, { phoneNumber: "0912-345-6789" }, { phoneNumber: " 09123456789" },
    { phoneNumber: "+14155552671" }, { phoneNumber: "０９１２３４５６７８９" },
    { termsAccepted: false }, { termsAccepted: "true" }, { termsAccepted: undefined },
    { termsVersion: undefined }, { role: "ADMINISTRATOR" }, { status: "DISABLED" },
    { emailVerified: true }, { termsAcceptedAt: "2000-01-01T00:00:00Z" },
    { name: "Client name" }, { image: "https://example.com/image" }, { rememberMe: true },
    { callbackURL: "https://evil.example" }, { lifecycleLock: "client-controlled" },
  ])("rejects invalid or protected registration fields (case %#)", async fields => {
    const messages: VerificationMessage[] = [];
    const app = makeApp({ sendVerificationEmail: async message => { messages.push(message); } });
    const body = valid();
    const response = await register(app, { ...body, ...fields });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { code: "VALIDATION_ERROR", message: "Invalid registration input" } });
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(await prisma.user.count({ where: { email: body.email } })).toBe(0);
    expect(messages).toEqual([]);
  });

  it("rejects stale terms without creating an account", async () => {
    const body = valid();
    const response = await register(makeApp(), { ...body, termsVersion: "outdated-fixture" });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("TERMS_VERSION_OUTDATED");
    expect(await prisma.user.count({ where: { email: body.email } })).toBe(0);
  });

  it.each([
    { firstName: " 🪩 ", lastName: "X", password: " ".repeat(15), phoneNumber: "+639123456789" },
    { firstName: ` ${"🪩".repeat(100)} `, lastName: "🪩".repeat(100), password: "🪩".repeat(128) },
  ])("accepts Unicode code-point boundaries and exact passwords (case %#)", async fields => {
    const body = { ...valid(), ...fields };
    const response = await register(makeApp(), body);
    expect(response.status).toBe(201);
    const saved = await prisma.user.findUniqueOrThrow({ where: { email: body.email } });
    expect(saved.firstName).toBe(body.firstName.trim());
    expect(saved.name).toBe(`${body.firstName.trim()} ${body.lastName.trim()}`);
  });

  it.each([undefined, "null", "https://untrusted.example"])("requires an exact approved Origin (case %#)", async origin => {
    let pending = request(makeApp()).post("/api/auth/register");
    if (origin !== undefined) pending = pending.set("Origin", origin);
    const response = await pending.send(valid());
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
  });

  it("requires JSON content type", async () => {
    const response = await request(makeApp()).post("/api/auth/register")
      .set("Origin", process.env.FRONTEND_URL!).type("form").send({ firstName: "Test" });
    expect(response.status).toBe(415);
    expect(response.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });
  it("publishes the configured current terms without authentication", async () => {
    const app = createApp({ terms });
    const response = await request(app).get("/api/v1/terms");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: terms });
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("returns a safe method error when terms retrieval uses POST", async () => {
    const response = await request(makeApp()).post("/api/v1/terms")
      .set("Origin", process.env.FRONTEND_URL!).send({});
    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe("GET");
    expect(response.body).toEqual({ error: { code: "METHOD_NOT_ALLOWED", message: "Method is not allowed" } });
  });

  it("rejects unsupported terms methods before parsing their body", async () => {
    const response = await request(makeApp()).post("/api/v1/terms")
      .set("Content-Type", "application/json").send('{"password":');
    expect(response.status).toBe(405);
    expect(response.body).toEqual({ error: { code: "METHOD_NOT_ALLOWED", message: "Method is not allowed" } });
  });

  it("uses one snapshot of owner-configured terms for retrieval, registration and consent", async () => {
    vi.stubEnv("CURRENT_TERMS_VERSION", terms.version);
    vi.stubEnv("CURRENT_TERMS_DOCUMENT_URL", terms.documentUrl);
    const messages: VerificationMessage[] = [];
    const now = new Date("2091-02-03T04:05:06Z");
    const app = createApp({ now: () => now, registrationLimit: 1000, aggregateLimit: 2000,
      sendVerificationEmail: async message => { messages.push(message); } });
    vi.stubEnv("CURRENT_TERMS_VERSION", "later-version");
    vi.stubEnv("CURRENT_TERMS_DOCUMENT_URL", "https://example.com/later-document");
    const published = await request(app).get("/api/v1/terms");
    expect(published.status).toBe(200);
    expect(published.body).toEqual({ data: terms });
    const body = valid();
    expect((await register(app, body)).status).toBe(201);
    const saved = await prisma.user.findUniqueOrThrow({ where: { email: body.email } });
    expect(saved.termsVersion).toBe(terms.version);
    expect(saved.termsAcceptedAt).toEqual(now);
    expect(messages).toHaveLength(1);
  });

  it("keeps registration unavailable without genuine configured terms", async () => {
    vi.stubEnv("CURRENT_TERMS_VERSION", "");
    vi.stubEnv("CURRENT_TERMS_DOCUMENT_URL", "");
    const messages: VerificationMessage[] = [];
    const app = createApp({ registrationLimit: 1000, aggregateLimit: 2000,
      sendVerificationEmail: async message => { messages.push(message); } });
    expect((await request(app).get("/api/v1/terms")).status).toBe(503);
    const body = valid();
    const response = await register(app, body);
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Current terms are unavailable" } });
    expect(await prisma.user.count({ where: { email: body.email } })).toBe(0);
    expect(messages).toEqual([]);
  });

  it("creates an unverified attendee with genuine consent, sends email, and issues no session", async () => {
    const email = `registration-${randomUUID()}+ticket@example.com`;
    emails.push(email);
    const messages: unknown[] = [];
    const app = createApp({ terms, registrationLimit: 1000, aggregateLimit: 2000, sendVerificationEmail: async message => { messages.push(message); } });
    const before = Date.now();
    const response = await request(app).post("/api/auth/register")
      .set("Origin", process.env.FRONTEND_URL!)
      .send({ firstName: "  José  ", lastName: " O’Neil ", email: ` ${email.toUpperCase()} `,
        password: " exact password 🪩 ", phoneNumber: "09123456789", termsAccepted: true, termsVersion: terms.version });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ data: { verificationRequired: true } });
    expect(response.headers["set-cookie"]).toBeUndefined();
    const user = await prisma.user.findUniqueOrThrow({ where: { email }, include: { accounts: true, sessions: true } });
    expect(user).toMatchObject({ firstName: "José", lastName: "O’Neil", name: "José O’Neil", phoneNumber: "+639123456789",
      role: "ATTENDEE", status: "ACTIVE", emailVerified: false, termsVersion: terms.version, sessions: [] });
    expect(user.termsAcceptedAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(user.termsAcceptedAt!.getTime()).toBeLessThanOrEqual(Date.now());
    expect(user.accounts).toHaveLength(1);
    expect(user.accounts[0]?.password).toMatch(/^aventix-scrypt-v1\$/);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ to: email });
  });

  it("returns safe JSON for malformed and oversized registration bodies", async () => {
    const app = createApp({ terms, registrationLimit: 1000, aggregateLimit: 2000 });
    const malformed = await request(app).post("/api/auth/register")
      .set("Origin", process.env.FRONTEND_URL!).set("Content-Type", "application/json").send('{"password":');
    expect(malformed.status).toBe(400);
    expect(malformed.body).toEqual({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } });
    const oversized = await request(app).post("/api/auth/register")
      .set("Origin", process.env.FRONTEND_URL!).send({ password: "x".repeat(17000) });
    expect(oversized.status).toBe(413);
    expect(oversized.body).toEqual({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" } });
  });

  it("persists IP throttles across application instances and ignores spoofed forwarding headers", async () => {
    const now = new Date("2090-01-01T00:00:00Z");
    await prisma.authRateLimit.deleteMany({ where: { expiresAt: new Date(now.getTime() + 900_000) } });
    const options = { terms, now: () => now, registrationLimit: 2 };
    const first = createApp(options);
    const second = createApp(options);
    const send = (app: ReturnType<typeof createApp>, forwarded: string) => request(app)
      .post("/api/auth/register").set("Origin", process.env.FRONTEND_URL!)
      .set("X-Forwarded-For", forwarded).send({});
    expect((await send(first, "192.0.2.1")).status).toBe(400);
    expect((await send(second, "192.0.2.2")).status).toBe(400);
    const denied = await send(second, "192.0.2.3");
    expect(denied.status).toBe(429);
    expect(denied.body).toEqual({ error: { code: "RATE_LIMITED", message: "Too many requests" } });
    expect(denied.headers["retry-after"]).toBe("900");
    await prisma.authRateLimit.deleteMany({ where: { expiresAt: new Date(now.getTime() + 900_000) } });
  });
});
