import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { hashExactPassword } from "../src/lib/exact-password.js";
import type { OrganizerDecisionMessage } from "../src/lib/organizer-decision-email.js";
import type { VerificationMessage } from "../src/lib/verification-email.js";

const terms = { version: "organizer-decision-test-v1", documentUrl: "https://example.com/organizer-terms" };
const password = " exact organizer passphrase ";
const origin = process.env.FRONTEND_URL!;

describe("Organizer administrator decisions", () => {
  const emails: string[] = [];
  const verification: VerificationMessage[] = [];
  const notices: OrganizerDecisionMessage[] = [];
  let deliveryFails = false;
  const app = createApp({ terms, registrationLimit: 1000, verificationLimit: 1000, loginLimit: 1000, aggregateLimit: 2000,
    sendVerificationEmail: async message => { verification.push(message); },
    sendOrganizerDecisionEmail: async message => {
      if (deliveryFails) throw new Error("Controlled provider failure");
      notices.push(message);
    } });
  const email = () => {
    const value = `organizer-review-${randomUUID()}@example.com`;
    emails.push(value);
    return value;
  };
  const apply = async (address = email(), organizationName = "Manila Live") => {
    const response = await request(app).post("/api/v1/organizer-applications").set("Origin", origin).send({
      firstName: "Ava", lastName: "Santos", email: address, password,
      organizationName, organizationDescription: "We organize live music events around Manila.",
      termsAccepted: true, termsVersion: terms.version,
    });
    expect(response.status).toBe(201);
    return prisma.user.findUniqueOrThrow({ where: { email: address }, include: { organizerProfile: true } });
  };
  const verify = async (address: string) => {
    const mail = verification.find(message => message.to === address)!;
    const token = new URLSearchParams(new URL(mail.url).hash.slice(1)).get("token")!;
    expect((await request(app).post("/api/auth/verify-email").set("Origin", origin)
      .send({ token, currentPassword: password })).status).toBe(200);
  };
  const admin = async () => {
    const address = email();
    const id = randomUUID();
    await prisma.user.create({ data: { id, email: address, name: "Review Admin", firstName: "Review",
      lastName: "Admin", role: "ADMINISTRATOR", emailVerified: true,
      termsVersion: terms.version, termsAcceptedAt: new Date(),
      accounts: { create: { accountId: id, providerId: "credential", password: await hashExactPassword(password) } } } });
    const agent = request.agent(app);
    expect((await agent.post("/api/auth/login").set("Origin", origin).send({ email: address, password })).status).toBe(200);
    return { agent, id };
  };
  const decide = (agent: ReturnType<typeof request.agent>, id: string, status: string, version: number, reason?: string) =>
    agent.patch(`/api/v1/admin/organizers/${id}/status`).set("Origin", origin).send({ status, version, ...(reason ? { reason } : {}) });

  afterAll(async () => {
    const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
    const ids = users.map(user => user.id);
    const profiles = await prisma.organizerProfile.findMany({ where: { userId: { in: ids } }, select: { id: true } });
    const profileIds = profiles.map(profile => profile.id);
    await prisma.organizerDecisionNotification.deleteMany({ where: { decision: { organizerProfileId: { in: profileIds } } } });
    await prisma.organizerDecision.deleteMany({ where: { organizerProfileId: { in: profileIds } } });
    await prisma.activityLog.deleteMany({ where: { OR: [{ userId: { in: ids } }, { entityId: { in: profileIds } }] } });
    await prisma.organizerProfile.deleteMany({ where: { id: { in: profileIds } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.emailCooldown.deleteMany({ where: { email: { in: emails } } });
  });

  it("separates unverified review, then approves, suspends, and reinstates with durable history", async () => {
    const owner = await apply();
    const profileId = owner.organizerProfile!.id;
    const { agent, id: actorId } = await admin();
    expect((await request(app).get("/api/v1/admin/organizers")).status).toBe(401);
    const awaiting = await agent.get("/api/v1/admin/organizers/stats");
    expect(awaiting.status).toBe(200);
    expect(awaiting.body.data.awaitingVerification).toBeGreaterThan(0);
    expect((await decide(agent, profileId, "APPROVED", 0)).body.error.code).toBe("EMAIL_VERIFICATION_REQUIRED");
    await verify(owner.email);
    const list = await agent.get("/api/v1/admin/organizers?status=pending");
    expect(list.status).toBe(200);
    expect(list.body.data.some((row: { id: string }) => row.id === profileId)).toBe(true);
    const approved = await decide(agent, profileId, "APPROVED", 0);
    expect(approved.status).toBe(200);
    expect(approved.body.data).toMatchObject({ status: "APPROVED", version: 1, emailStatus: "ACCEPTED" });
    expect(notices.at(-1)).toMatchObject({ to: owner.email, kind: "APPROVED" });
    const organizer = request.agent(app);
    expect((await organizer.post("/api/auth/login").set("Origin", origin)
      .send({ email: owner.email, password })).status).toBe(200);
    expect((await organizer.get("/api/v1/me")).status).toBe(200);
    const suspended = await decide(agent, profileId, "SUSPENDED", 1, "Access paused for review");
    expect(suspended.status).toBe(200);
    expect(suspended.body.data.version).toBe(2);
    expect(notices.at(-1)).toMatchObject({ kind: "SUSPENDED", reason: "Access paused for review" });
    expect((await organizer.get("/api/v1/me")).status).toBe(401);
    expect((await organizer.post("/api/auth/login").set("Origin", origin)
      .send({ email: owner.email, password })).body.error.code).toBe("ORGANIZATION_SUSPENDED");
    const reinstated = await decide(agent, profileId, "APPROVED", 2);
    expect(reinstated.status).toBe(200);
    expect(reinstated.body.data.version).toBe(3);
    expect(notices.at(-1)).toMatchObject({ kind: "REINSTATED" });
    expect((await organizer.get("/api/v1/me")).status).toBe(401);
    expect((await organizer.post("/api/auth/login").set("Origin", origin)
      .send({ email: owner.email, password })).status).toBe(200);
    const detail = await agent.get(`/api/v1/admin/organizers/${profileId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.decisions).toHaveLength(3);
    expect(detail.body.data.decisions.map((decision: { version: number }) => decision.version)).toEqual([3, 2, 1]);
    expect(detail.body.data.decisions.every((decision: { actorId: string }) => decision.actorId === actorId)).toBe(true);
    expect(await prisma.activityLog.count({ where: { entityId: profileId, action: { startsWith: "ORGANIZATION_" } } })).toBe(3);
    expect((await decide(agent, profileId, "SUSPENDED", 1, "Old version")).body.error.code).toBe("STALE_DECISION");
  });

  it("keeps rejection final, records failed email, and retries without repeating the decision", async () => {
    const owner = await apply();
    await verify(owner.email);
    const profileId = owner.organizerProfile!.id;
    const { agent } = await admin();
    expect((await decide(agent, profileId, "REJECTED", 0)).status).toBe(400);
    deliveryFails = true;
    const rejected = await decide(agent, profileId, "REJECTED", 0, "The event plan is incomplete");
    deliveryFails = false;
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.emailStatus).toBe("UNCERTAIN");
    expect((await request(app).post("/api/auth/login").set("Origin", origin)
      .send({ email: owner.email, password })).body.error.code).toBe("ORGANIZATION_REJECTED");
    const retry = await agent.post(`/api/v1/admin/organizers/${profileId}/decisions/${rejected.body.data.decisionId}/retry-email`)
      .set("Origin", origin).send({});
    expect(retry.status).toBe(200);
    expect(retry.body.data.emailStatus).toBe("ACCEPTED");
    expect(notices.at(-1)).toMatchObject({ kind: "REJECTED", reason: "The event plan is incomplete" });
    expect((await decide(agent, profileId, "APPROVED", 1)).body.error.code).toBe("INVALID_TRANSITION");
    expect(await prisma.organizerDecision.count({ where: { organizerProfileId: profileId } })).toBe(1);
  });

  it("uses one search scope for review counts, pages, and CSV without exposing formula cells", async () => {
    const organizationName = `=Review ${randomUUID()}`;
    const first = await apply(email(), organizationName);
    const second = await apply(email(), organizationName);
    await verify(first.email);
    const { agent } = await admin();
    const search = encodeURIComponent(organizationName);
    const list = await agent.get(`/api/v1/admin/organizers?search=${search}&pageSize=1`);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(2);
    expect(list.body.data).toHaveLength(1);
    const pageTwo = await agent.get(`/api/v1/admin/organizers?search=${search}&pageSize=1&page=2`);
    expect(pageTwo.status).toBe(200);
    expect(pageTwo.body.data).toHaveLength(1);
    expect(pageTwo.body.data[0].id).not.toBe(list.body.data[0].id);
    const stats = await agent.get(`/api/v1/admin/organizers/stats?search=${search}`);
    expect(stats.body.data).toMatchObject({ total: 2, awaitingVerification: 1, pending: 1 });
    const pending = await agent.get(`/api/v1/admin/organizers?search=${search}&status=pending`);
    expect(pending.body.total).toBe(1);
    expect(pending.body.data[0].id).toBe(first.organizerProfile!.id);
    const csv = await agent.get(`/api/v1/admin/organizers/export?search=${search}`);
    expect(csv.status).toBe(200);
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.text.split("\r\n").filter(Boolean)).toHaveLength(3);
    expect(csv.text).toContain(`"'${organizationName}"`);
    expect(csv.text).not.toContain(password);
    expect(csv.text).toContain(first.email);
    expect(csv.text).toContain(second.email);
  });

  it("rejects competing decisions and never retries a superseded approval email", async () => {
    const owner = await apply();
    await verify(owner.email);
    const profileId = owner.organizerProfile!.id;
    const { agent } = await admin();
    deliveryFails = true;
    let approval;
    let rejection;
    try {
      [approval, rejection] = await Promise.all([
        decide(agent, profileId, "APPROVED", 0),
        decide(agent, profileId, "REJECTED", 0, "The event plan is incomplete"),
      ]);
    } finally { deliveryFails = false; }
    expect([approval.status, rejection.status].sort()).toEqual([200, 409]);
    const winningStatus = approval.status === 200 ? "APPROVED" : "REJECTED";
    expect((await prisma.organizerProfile.findUniqueOrThrow({ where: { id: profileId } })).approvalStatus).toBe(winningStatus);
    expect(await prisma.organizerDecision.count({ where: { organizerProfileId: profileId } })).toBe(1);

    if (winningStatus === "REJECTED") return;
    const approvedDecisionId = approval.body.data.decisionId as string;
    const noticesBefore = notices.length;
    const suspension = await decide(agent, profileId, "SUSPENDED", 1, "Access paused for review");
    expect(suspension.status).toBe(200);
    const retry = await agent.post(`/api/v1/admin/organizers/${profileId}/decisions/${approvedDecisionId}/retry-email`)
      .set("Origin", origin).send({});
    expect(retry.status).toBe(200);
    expect(retry.body.data.emailStatus).toBe("SUPERSEDED");
    expect(notices.slice(noticesBefore).map(message => message.kind)).toEqual(["SUSPENDED"]);
  });
});
