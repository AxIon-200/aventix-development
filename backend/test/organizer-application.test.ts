import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import type { VerificationMessage } from "../src/lib/verification-email.js";

const terms = { version: "organizer-test-v1", documentUrl: "https://example.com/organizer-terms" };

describe("Organizer application", () => {
  const emails: string[] = [];
  const email = () => {
    const value = `organizer-application-${randomUUID()}@example.com`;
    emails.push(value);
    return value;
  };
  const valid = (address = email()) => ({
    firstName: "Ava", lastName: "Santos", email: address, password: " exact organizer passphrase ",
    organizationName: "The Music Collective", organizationDescription: "We organize live music events in Manila.",
    termsAccepted: true, termsVersion: terms.version,
  });
  const makeApp = (messages: VerificationMessage[]) => createApp({ terms, registrationLimit: 1000,
    verificationLimit: 1000, verificationResendLimit: 1000, loginLimit: 1000,
    aggregateLimit: 2000, sendVerificationEmail: async message => { messages.push(message); } });
  const apply = (app: ReturnType<typeof createApp>, body: unknown) => request(app)
    .post("/api/v1/organizer-applications").set("Origin", process.env.FRONTEND_URL!).send(body);

  afterAll(async () => {
    const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
    await prisma.activityLog.deleteMany({ where: { userId: { in: users.map(user => user.id) } } });
    await prisma.organizerProfile.deleteMany({ where: { user: { email: { in: emails } } } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.emailCooldown.deleteMany({ where: { email: { in: emails } } });
  });

  it("creates a pending application and sends a verification link without a session", async () => {
    const messages: VerificationMessage[] = [];
    const body = valid();
    const response = await apply(makeApp(messages), body);
    expect(response.status).toBe(201);
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(response.body.data).toMatchObject({ verificationRequired: true, administratorApprovalRequired: true });
    expect(messages).toHaveLength(1);
    const saved = await prisma.user.findUniqueOrThrow({ where: { email: body.email },
      include: { accounts: true, authLinks: true, sessions: true, organizerProfile: true, organizerApplication: true } });
    expect(saved).toMatchObject({ role: "ORGANIZER", status: "ACTIVE", emailVerified: false,
      termsVersion: terms.version, sessions: [], organizerProfile: { approvalStatus: "PENDING",
        organizationName: body.organizationName, description: body.organizationDescription } });
    expect(saved.accounts).toHaveLength(1);
    expect(saved.accounts[0]!.password).not.toBe(body.password);
    expect(saved.authLinks).toHaveLength(1);
    expect(saved.termsAcceptedAt).toBeInstanceOf(Date);
    expect(saved.organizerApplication).toMatchObject({
      userId: saved.id, organizerProfileId: saved.organizerProfile!.id,
      firstName: body.firstName, lastName: body.lastName, email: body.email,
      phoneNumber: null, organizationName: body.organizationName,
      organizationDescription: body.organizationDescription, termsVersion: terms.version,
      termsAcceptedAt: saved.termsAcceptedAt,
    });
    expect(saved.organizerApplication!.submittedAt).toBeInstanceOf(Date);
  });

  it("verifies with the current password but leaves a correct login pending review", async () => {
    const messages: VerificationMessage[] = [];
    const body = valid();
    const app = makeApp(messages);
    expect((await apply(app, body)).status).toBe(201);
    const before = await request(app).post("/api/auth/login").set("Origin", process.env.FRONTEND_URL!)
      .send({ email: body.email, password: body.password });
    expect(before.status).toBe(403);
    expect(before.body.error.code).toBe("EMAIL_VERIFICATION_REQUIRED");
    const token = new URLSearchParams(new URL(messages[0]!.url).hash.slice(1)).get("token")!;
    const wrongVerification = await request(app).post("/api/auth/verify-email").set("Origin", process.env.FRONTEND_URL!)
      .send({ token, currentPassword: "wrong organizer password" });
    expect(wrongVerification.status).toBe(401);
    const verify = await request(app).post("/api/auth/verify-email").set("Origin", process.env.FRONTEND_URL!)
      .send({ token, currentPassword: body.password });
    expect(verify.status).toBe(200);
    expect(verify.headers["set-cookie"]).toBeUndefined();
    const wrong = await request(app).post("/api/auth/login").set("Origin", process.env.FRONTEND_URL!)
      .send({ email: body.email, password: "wrong organizer password" });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe("INVALID_CREDENTIALS");
    const pending = await request(app).post("/api/auth/login").set("Origin", process.env.FRONTEND_URL!)
      .send({ email: body.email, password: body.password });
    expect(pending.status).toBe(403);
    expect(pending.body.error.code).toBe("ORGANIZATION_PENDING");
    expect(pending.headers["set-cookie"]).toBeUndefined();
    const saved = await prisma.user.findUniqueOrThrow({ where: { email: body.email }, include: { organizerProfile: true, sessions: true } });
    expect(saved.emailVerified).toBe(true);
    expect(saved.organizerProfile?.approvalStatus).toBe("PENDING");
    expect(saved.sessions).toHaveLength(0);
  });

  it("normalizes optional phone, trims Unicode organization text, and preserves the exact password", async () => {
    const messages: VerificationMessage[] = [];
    const body = { ...valid(), firstName: " 🎵 ", organizationName: ` ${"🎵".repeat(150)} `,
      organizationDescription: ` ${"🎵".repeat(20)} `, phoneNumber: "09171234567",
      password: " exact organizer password é " };
    const app = makeApp(messages);
    expect((await apply(app, body)).status).toBe(201);
    const saved = await prisma.user.findUniqueOrThrow({ where: { email: body.email }, include: {
      organizerProfile: true, organizerApplication: true, accounts: true,
    } });
    expect(saved.firstName).toBe("🎵");
    expect(saved.phoneNumber).toBe("+639171234567");
    expect(saved.organizerProfile?.organizationName).toBe("🎵".repeat(150));
    expect(saved.organizerApplication).toMatchObject({ phoneNumber: "+639171234567",
      organizationDescription: "🎵".repeat(20) });
    expect(saved.accounts[0]!.password).not.toBe(body.password);
    const token = new URLSearchParams(new URL(messages[0]!.url).hash.slice(1)).get("token")!;
    expect((await request(app).post("/api/auth/verify-email").set("Origin", process.env.FRONTEND_URL!)
      .send({ token, currentPassword: body.password.trim() })).status).toBe(401);
    expect((await request(app).post("/api/auth/verify-email").set("Origin", process.env.FRONTEND_URL!)
      .send({ token, currentPassword: body.password })).status).toBe(200);
  });

  it("expires and consumes organizer verification links while resend preserves pending review", async () => {
    const messages: VerificationMessage[] = [];
    const body = valid();
    let time = new Date("2099-01-01T00:00:00Z");
    const app = createApp({ terms, now: () => time, registrationLimit: 1000, verificationLimit: 1000,
      verificationResendLimit: 1000, aggregateLimit: 2000,
      sendVerificationEmail: async message => { messages.push(message); } });
    expect((await apply(app, body)).status).toBe(201);
    const oldToken = new URLSearchParams(new URL(messages[0]!.url).hash.slice(1)).get("token")!;
    expect((await request(app).post("/api/auth/resend-verification").set("Origin", process.env.FRONTEND_URL!)
      .send({ email: body.email })).status).toBe(200);
    expect(messages).toHaveLength(1);
    time = new Date(time.getTime() + 86_400_000);
    const verify = (token: string) => request(app).post("/api/auth/verify-email")
      .set("Origin", process.env.FRONTEND_URL!).send({ token, currentPassword: body.password });
    expect((await verify(oldToken)).body.error.code).toBe("LINK_INVALID_OR_EXPIRED");
    expect((await request(app).post("/api/auth/resend-verification").set("Origin", process.env.FRONTEND_URL!)
      .send({ email: body.email })).status).toBe(200);
    expect(messages).toHaveLength(2);
    const newToken = new URLSearchParams(new URL(messages[1]!.url).hash.slice(1)).get("token")!;
    expect((await verify(newToken)).status).toBe(200);
    expect((await verify(newToken)).body.error.code).toBe("LINK_INVALID_OR_EXPIRED");
    expect((await prisma.organizerProfile.findFirstOrThrow({ where: { user: { email: body.email } } })).approvalStatus).toBe("PENDING");
  });

  it("allows password recovery without approving the organizer or issuing a session", async () => {
    const verification: VerificationMessage[] = [];
    const recovery: VerificationMessage[] = [];
    const body = valid();
    const app = createApp({ terms, registrationLimit: 1000, verificationLimit: 1000,
      recoveryLimit: 1000, resetLimit: 1000, loginLimit: 1000, aggregateLimit: 2000,
      sendVerificationEmail: async message => { verification.push(message); },
      sendPasswordResetEmail: async message => { recovery.push(message); } });
    expect((await apply(app, body)).status).toBe(201);
    const requestReset = await request(app).post("/api/auth/request-password-reset")
      .set("Origin", process.env.FRONTEND_URL!).send({ email: body.email });
    expect(requestReset.status).toBe(200);
    expect(recovery).toHaveLength(1);
    const resetToken = new URLSearchParams(new URL(recovery[0]!.url).hash.slice(1)).get("token")!;
    const replacement = "replacement organizer password";
    const reset = await request(app).post("/api/auth/reset-password").set("Origin", process.env.FRONTEND_URL!)
      .send({ token: resetToken, newPassword: replacement });
    expect(reset.status).toBe(200);
    expect((reset.headers["set-cookie"] as string[]).every(value => value.includes("Max-Age=0"))).toBe(true);
    const verifyToken = new URLSearchParams(new URL(verification[0]!.url).hash.slice(1)).get("token")!;
    expect((await request(app).post("/api/auth/verify-email").set("Origin", process.env.FRONTEND_URL!)
      .send({ token: verifyToken, currentPassword: replacement })).status).toBe(200);
    const login = await request(app).post("/api/auth/login").set("Origin", process.env.FRONTEND_URL!)
      .send({ email: body.email, password: replacement });
    expect(login.body.error.code).toBe("ORGANIZATION_PENDING");
    expect(login.headers["set-cookie"]).toBeUndefined();
    expect((await prisma.organizerProfile.findFirstOrThrow({ where: { user: { email: body.email } } })).approvalStatus).toBe("PENDING");
  });

  it.each([
    { firstName: " " }, { organizationName: "X" }, { organizationName: "🎵".repeat(151) },
    { organizationDescription: "short" }, { organizationDescription: "🎵".repeat(2001) },
    { organizationDescription: "   " }, { phoneNumber: "" }, { phoneNumber: "0912-345-6789" },
    { termsAccepted: false }, { role: "ADMINISTRATOR" }, { approvalStatus: "APPROVED" },
    { emailVerified: true }, { submittedAt: "2020-01-01" }, { name: "Forged" },
  ])("rejects invalid or protected application fields (case %#)", async fields => {
    const messages: VerificationMessage[] = [];
    const body = valid();
    const response = await apply(makeApp(messages), { ...body, ...fields });
    expect(response.status).toBe(400);
    expect(await prisma.user.count({ where: { email: body.email } })).toBe(0);
    expect(messages).toHaveLength(0);
  });

  it("rejects stale or unavailable terms before saving an application", async () => {
    const body = valid();
    const messages: VerificationMessage[] = [];
    expect((await apply(makeApp(messages), { ...body, termsVersion: "old" })).body.error.code).toBe("TERMS_VERSION_OUTDATED");
    const unavailable = createApp({ terms: { version: "", documentUrl: "" }, registrationLimit: 1000, aggregateLimit: 2000,
      sendVerificationEmail: async message => { messages.push(message); } });
    expect((await apply(unavailable, body)).status).toBe(503);
    expect(await prisma.user.count({ where: { email: body.email } })).toBe(0);
    expect(messages).toHaveLength(0);
  });

  it("requires the public mutation method, origin, JSON, and bounded body", async () => {
    const messages: VerificationMessage[] = [];
    const body = valid();
    const app = makeApp(messages);
    expect((await request(app).get("/api/v1/organizer-applications")).status).toBe(405);
    expect((await request(app).post("/api/v1/organizer-applications").send(body)).status).toBe(403);
    expect((await request(app).post("/api/v1/organizer-applications")
      .set("Origin", process.env.FRONTEND_URL!).set("Content-Type", "text/plain").send("plain text")).status).toBe(415);
    expect((await apply(app, { ...body, organizationDescription: "x".repeat(17_000) })).status).toBe(413);
    expect(await prisma.user.count({ where: { email: body.email } })).toBe(0);
    expect(messages).toHaveLength(0);
  });

  it("keeps an attendee identity unchanged when an organizer applies with its normalized email", async () => {
    const messages: VerificationMessage[] = [];
    const body = valid();
    const app = makeApp(messages);
    const attendee = await request(app).post("/api/auth/register").set("Origin", process.env.FRONTEND_URL!)
      .send({ firstName: "Original", lastName: "Attendee", email: body.email,
        password: body.password, termsAccepted: true, termsVersion: terms.version });
    expect(attendee.status).toBe(201);
    const before = await prisma.user.findUniqueOrThrow({ where: { email: body.email }, include: { accounts: true, authLinks: true } });
    const duplicate = await apply(app, { ...body, email: ` ${body.email.toUpperCase()} `, password: "a different passphrase" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("EMAIL_ALREADY_REGISTERED");
    expect(await prisma.user.findUniqueOrThrow({ where: { email: body.email }, include: { accounts: true, authLinks: true } })).toEqual(before);
    expect(await prisma.organizerProfile.count({ where: { userId: before.id } })).toBe(0);
    expect(messages).toHaveLength(1);
  });

  it("allows two organizations to share a name but only one concurrent application per normalized email", async () => {
    const messages: VerificationMessage[] = [];
    const app = makeApp(messages);
    const first = valid();
    const second = valid();
    expect((await apply(app, first)).status).toBe(201);
    expect((await apply(app, second)).status).toBe(201);
    expect(await prisma.organizerProfile.count({ where: { organizationName: first.organizationName,
      user: { email: { in: [first.email, second.email] } } } })).toBe(2);
    const race = valid();
    const results = await Promise.all([apply(app, race), apply(app, { ...race, email: race.email.toUpperCase() })]);
    expect(results.map(result => result.status).sort()).toEqual([201, 409]);
    expect(messages).toHaveLength(3);
  });

  it("rolls back all application writes when the final cooldown write fails", async () => {
    const messages: VerificationMessage[] = [];
    const body = valid();
    await prisma.emailCooldown.create({ data: { id: randomUUID(), email: body.email,
      purpose: "EMAIL_VERIFICATION", attemptedAt: new Date() } });
    const response = await apply(makeApp(messages), body);
    expect(response.status).toBe(500);
    expect(await prisma.user.count({ where: { email: body.email } })).toBe(0);
    expect(await prisma.organizerApplication.count({ where: { email: body.email } })).toBe(0);
    expect(messages).toHaveLength(0);
  });

  it("keeps the pending application when verification email delivery fails", async () => {
    const body = valid();
    const app = createApp({ terms, registrationLimit: 1000, aggregateLimit: 2000,
      sendVerificationEmail: async () => { throw new Error("Controlled email failure"); } });
    const response = await apply(app, body);
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("ACCOUNT_CREATED_EMAIL_FAILED");
    expect(response.headers["set-cookie"]).toBeUndefined();
    const saved = await prisma.user.findUniqueOrThrow({ where: { email: body.email },
      include: { organizerProfile: true, organizerApplication: true, authLinks: true } });
    expect(saved.organizerProfile?.approvalStatus).toBe("PENDING");
    expect(saved.organizerApplication?.email).toBe(body.email);
    expect(saved.authLinks).toHaveLength(1);
    expect((await apply(makeApp([]), body)).body.error.code).toBe("EMAIL_ALREADY_REGISTERED");
  });

  it("keeps the application snapshot after approved account contact details change", async () => {
    const messages: VerificationMessage[] = [];
    const body = valid();
    const app = makeApp(messages);
    expect((await apply(app, body)).status).toBe(201);
    const token = new URLSearchParams(new URL(messages[0]!.url).hash.slice(1)).get("token")!;
    expect((await request(app).post("/api/auth/verify-email").set("Origin", process.env.FRONTEND_URL!)
      .send({ token, currentPassword: body.password })).status).toBe(200);
    const saved = await prisma.user.findUniqueOrThrow({ where: { email: body.email }, include: { organizerApplication: true } });
    await prisma.organizerProfile.update({ where: { userId: saved.id }, data: { approvalStatus: "APPROVED" } });
    const agent = request.agent(app);
    expect((await agent.post("/api/auth/login").set("Origin", process.env.FRONTEND_URL!)
      .send({ email: body.email, password: body.password })).status).toBe(200);
    expect((await agent.patch("/api/v1/me").set("Origin", process.env.FRONTEND_URL!)
      .send({ firstName: "Updated", phoneNumber: "09171234567" })).status).toBe(200);
    const after = await prisma.user.findUniqueOrThrow({ where: { email: body.email }, include: { organizerApplication: true } });
    expect(after.firstName).toBe("Updated");
    expect(after.organizerApplication).toEqual(saved.organizerApplication);
  });
});
