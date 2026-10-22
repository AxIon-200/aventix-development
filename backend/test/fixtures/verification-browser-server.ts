// Test-only real HTTP server. The database guard runs before importing application code.
import "../setup.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mock } from "node:test";
import request from "supertest";
import type { AuthEmailMessage } from "../../src/lib/auth-email.js";

assert.ok(process.env.AVENTIX_BROWSER_ORIGIN);
process.env.FRONTEND_URL = process.env.AVENTIX_BROWSER_ORIGIN;
const { createApp } = await import("../../src/app.js");
const { env } = await import("../../src/config/env.js");
const { prisma } = await import("../../src/lib/prisma.js");
const { hashPassword } = await import("better-auth/crypto");
assert.equal((await prisma.$queryRaw<{ environment: string }[]>`SELECT environment FROM public.test_environment_marker WHERE id = 1`)[0]?.environment, "aventix-test");

// A unique future rate-limit window isolates this run from all other fixtures.
const start = new Date(2200, 0, 1 + Math.floor(Math.random() * 100000));
mock.timers.enable({ apis: ["Date"], now: start });
let time = new Date(start);
let failDelivery = false;
const messages: AuthEmailMessage[] = [];
const emails: string[] = [];
const password = " exact browser verification e\u0301 ";
const app = createApp({ terms: { version: "verification-browser-fixture", documentUrl: `${env.FRONTEND_URL}/legal/terms` },
  now: () => time, aggregateLimit: 10000, registrationLimit: 10000, loginLimit: 10000,
  verificationLimit: 10000, verificationResendLimit: 10000,
  sendVerificationEmail: async message => { if (failDelivery) throw Error("Controlled delivery failure"); messages.push(message); },
});
const server = app.listen(0, "127.0.0.1", () => {
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  process.send?.({ ready: true, port: address.port });
});

async function command(input: { action: string; milliseconds?: number; enabled?: boolean; email?: string }) {
  if (input.action === "fixture") {
    const email = `verification-browser-${randomUUID()}@example.com`;
    emails.push(email);
    const result = await request(app).post("/api/auth/register").set("Origin", env.FRONTEND_URL)
      .send({ firstName: "Verification", lastName: "Fixture", email, password, termsAccepted: true, termsVersion: "verification-browser-fixture" });
    assert.equal(result.status, 201);
    return { email, password, url: messages.at(-1)!.url };
  }
  if (input.action === "advance") {
    time = new Date(time.getTime() + (input.milliseconds ?? 0));
    mock.timers.setTime(time.getTime());
    return {};
  }
  if (input.action === "delivery") { failDelivery = input.enabled === false; return {}; }
  if (input.action === "messages") return messages.filter(message => message.to === input.email);
  if (input.action === "legacy") {
    assert.ok(input.email && emails.includes(input.email));
    const user = await prisma.user.findUniqueOrThrow({ where: { email: input.email } });
    await prisma.account.updateMany({ where: { userId: user.id, providerId: "credential" }, data: { password: await hashPassword(password) } });
    return {};
  }
  if (input.action === "cleanup") {
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
