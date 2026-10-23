// Test-only real HTTP server. The database guard runs before importing application code.
import "../setup.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { mock } from "node:test";
import request from "supertest";
import type { AuthEmailMessage } from "../../src/lib/auth-email.js";

assert.ok(process.env.AVENTIX_BROWSER_ORIGIN);
process.env.FRONTEND_URL = process.env.AVENTIX_BROWSER_ORIGIN;
const { createApp } = await import("../../src/app.js");
const { env } = await import("../../src/config/env.js");
const { prisma } = await import("../../src/lib/prisma.js");
const { hashPassword } = await import("better-auth/crypto");
const { hashExactPassword } = await import("../../src/lib/exact-password.js");
assert.equal((await prisma.$queryRaw<{ environment: string }[]>`SELECT environment FROM public.test_environment_marker WHERE id = 1`)[0]?.environment, "aventix-test");

// A unique future rate-limit window isolates this run from all other fixtures.
const start = new Date(2200, 0, 1 + Math.floor(Math.random() * 100000));
mock.timers.enable({ apis: ["Date"], now: start });
let time = new Date(start);
let failDelivery = false;
let registrationLimit = 10000;
const messages: AuthEmailMessage[] = [];
const recoveryMessages: AuthEmailMessage[] = [];
const decisionMessages: { to: string; kind: string; reason?: string }[] = [];
const emails: string[] = [];
const password = " exact browser verification e\u0301 ";
const terms = { version: "verification-browser-fixture", documentUrl: `${env.FRONTEND_URL}/legal/aventix-prototype-terms-2026-10-22-v1.html` };
const createFixtureApp = () => createApp({ terms,
  now: () => time, aggregateLimit: 10000, registrationLimit, loginLimit: 10000,
  verificationLimit: 10000, verificationResendLimit: 10000, termsAcceptanceLimit: 10000,
  recoveryLimit: 10000, resetLimit: 10000,
  sendVerificationEmail: async message => { if (failDelivery) throw Error("Controlled delivery failure"); messages.push(message); },
  sendPasswordResetEmail: async message => { if (failDelivery) throw Error("Controlled delivery failure"); recoveryMessages.push(message); },
  sendOrganizerDecisionEmail: async message => { if (failDelivery) throw Error("Controlled delivery failure"); decisionMessages.push(message); },
});
let app = createFixtureApp();
const server = createServer((request, response) => app(request, response));
server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  process.send?.({ ready: true, port: address.port });
});

async function command(input: { action: string; milliseconds?: number; enabled?: boolean; email?: string; version?: string; limit?: number }) {
  if (input.action === "registrationLimit") {
    assert.equal(input.limit, 1);
    registrationLimit = input.limit;
    app = createFixtureApp();
    return {};
  }
  if (input.action === "registrationFixture") {
    const email = `joined-browser-${randomUUID()}@example.com`;
    emails.push(email);
    return { email, password };
  }
  if (input.action === "adminFixture") {
    const id = randomUUID();
    const email = `review-browser-${id}@example.com`;
    emails.push(email);
    await prisma.user.create({ data: { id, email, firstName: "Review", lastName: "Administrator",
      name: "Review Administrator", role: "ADMINISTRATOR", emailVerified: true,
      termsVersion: terms.version, termsAcceptedAt: time,
      accounts: { create: { accountId: id, providerId: "credential", password: await hashExactPassword(password) } } } });
    return { email, password };
  }
  if (input.action === "fixture") {
    const email = `verification-browser-${randomUUID()}@example.com`;
    emails.push(email);
    const result = await request(app).post("/api/auth/register").set("Origin", env.FRONTEND_URL)
      .send({ firstName: "Verification", lastName: "Fixture", email, password, termsAccepted: true, termsVersion: terms.version });
    assert.equal(result.status, 201);
    return { email, password, url: messages.at(-1)!.url };
  }
  if (input.action === "consentFixture") {
    const id = randomUUID();
    const email = `consent-browser-${id}@example.com`;
    emails.push(email);
    await prisma.user.create({ data: {
      id, email, firstName: "Consent", lastName: "Fixture", name: "Consent Fixture",
      role: "ATTENDEE", status: "ACTIVE", emailVerified: true, termsVersion: null, termsAcceptedAt: null,
      accounts: { create: { accountId: id, providerId: "credential", password: await hashExactPassword(password) } },
    } });
    return { email, password };
  }
  if (input.action === "clearConsent") {
    assert.ok(input.email && emails.includes(input.email));
    await prisma.user.update({ where: { email: input.email }, data: { termsVersion: null, termsAcceptedAt: null } });
    return {};
  }
  if (input.action === "termsVersion") {
    assert.ok(input.version?.startsWith("verification-browser-fixture"));
    terms.version = input.version;
    app = createFixtureApp();
    return {};
  }
  if (input.action === "advance") {
    time = new Date(time.getTime() + (input.milliseconds ?? 0));
    mock.timers.setTime(time.getTime());
    return {};
  }
  if (input.action === "delivery") { failDelivery = input.enabled === false; return {}; }
  if (input.action === "messages") return messages.filter(message => message.to === input.email);
  if (input.action === "recoveryMessages") return recoveryMessages.filter(message => message.to === input.email);
  if (input.action === "decisionMessages") return decisionMessages.filter(message => message.to === input.email);
  if (input.action === "legacy") {
    assert.ok(input.email && emails.includes(input.email));
    const user = await prisma.user.findUniqueOrThrow({ where: { email: input.email } });
    await prisma.account.updateMany({ where: { userId: user.id, providerId: "credential" }, data: { password: await hashPassword(password) } });
    return {};
  }
  if (input.action === "cleanup") {
    const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
    const profiles = await prisma.organizerProfile.findMany({ where: { userId: { in: users.map(user => user.id) } }, select: { id: true } });
    const profileIds = profiles.map(profile => profile.id);
    await prisma.organizerDecisionNotification.deleteMany({ where: { decision: { organizerProfileId: { in: profileIds } } } });
    await prisma.organizerDecision.deleteMany({ where: { organizerProfileId: { in: profileIds } } });
    await prisma.activityLog.deleteMany({ where: { userId: { in: users.map(user => user.id) } } });
    await prisma.organizerProfile.deleteMany({ where: { userId: { in: users.map(user => user.id) } } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.emailCooldown.deleteMany({ where: { email: { in: emails } } });
    await prisma.authRateLimit.deleteMany({ where: { expiresAt: { gte: start, lte: new Date(time.getTime() + 900000) } } });
    await prisma.$disconnect();
    mock.timers.reset();
    server.close();
    return {};
  }
  throw Error("Unknown fixture command");
}

process.on("message", async (input: Parameters<typeof command>[0] & { id: number }) => {
  try { process.send?.({ id: input.id, result: await command(input) }); }
  catch { process.send?.({ id: input.id, error: "Verification browser fixture command failed" }); }
});
