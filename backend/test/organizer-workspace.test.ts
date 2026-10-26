import { createDecipheriv, createHash, randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import type { createAuth } from "../src/lib/auth.js";
import { prisma } from "../src/lib/prisma.js";
import { organizerRouter } from "../src/routes/organizer.routes.js";
import { OrganizerService } from "../src/services/organizer.service.js";
import { PublicEventsService } from "../src/services/public-events.service.js";
import { createApp } from "../src/app.js";

const base = "/api/v1/organizer", prefix = `organizer-${randomUUID()}`, origin = process.env.FRONTEND_URL!;
const users = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
const organizations: string[] = [], events: string[] = [], venues: string[] = [];
let tier: string, otherTier: string;
const hash = (code: string) => createHash("sha256").update(code).digest("hex");
function fixture(role: string | null = "ORGANIZER", actor = users[0]!) {
  const auth = { api: { readOwnProfile: async () => role ? Response.json({ data: { user: { id: actor, role } } }) : Response.json({ error: { code: "AUTHENTICATION_REQUIRED" } }, { status: 401 }) } };
  const app = express(); app.use(express.json()); app.use(base, organizerRouter(auth as unknown as ReturnType<typeof createAuth>)); return app;
}
const app = fixture();
const write = (path: string, body: object, method: "post" | "patch" = "patch") => request(app)[method](base + path).set("Origin", origin).send(body);
async function booking(options: { event?: number; buyer?: number; status?: "CONFIRMED" | "CANCELLED" | "EXPIRED" | "REFUNDED" | "PENDING_PAYMENT"; paid?: boolean; at?: string; quantity?: number; amount?: number; ticketStatus?: "VALID" | "USED" | "CANCELLED" | "EXPIRED" } = {}) {
  const eventId = events[options.event ?? 0]!, ticketCategoryId = options.event === 2 ? otherTier : tier;
  const amount = options.amount ?? 100.25, quantity = options.quantity ?? 1;
  const code = `AVX-${randomUUID()}`;
  const value = await prisma.booking.create({ data: { eventId, userId: users[options.buyer ?? 2]!, bookingReference: `${prefix}-${randomUUID()}`,
    status: options.status ?? "CONFIRMED", subtotal: amount, totalAmount: amount, expiresAt: new Date("2096-12-31"),
    items: { create: { ticketCategoryId, quantity, unitPrice: amount / quantity, subtotal: amount,
      tickets: { create: { ticketCode: code, verificationTokenHash: hash(code), status: options.ticketStatus ?? "VALID" } } } },
    payments: { create: { provider: "paymongo_test", amount, status: options.paid === false ? "FAILED" : "PAID", paidAt: new Date(options.at ?? "2096-06-15T00:00:00Z") } },
  }, include: { items: { include: { tickets: true } } } });
  return { booking: value, code, ticketId: value.items[0]!.tickets[0]!.id };
}
beforeAll(async () => {
  const marker = await prisma.$queryRaw<{ environment: string }[]>`SELECT environment FROM public.test_environment_marker WHERE id=1`;
  expect(marker[0]?.environment).toBe("aventix-test");
  for (const [i, id] of users.entries()) await prisma.user.create({ data: { id, email: `${prefix}-${i}@example.invalid`, firstName: "Fixture", lastName: "Owner", name: `Buyer ${i}`, role: i < 2 ? "ORGANIZER" : "ATTENDEE" } });
  for (const id of users.slice(0, 2)) organizations.push((await prisma.organizerProfile.create({ data: { userId: id, organizationName: prefix, approvalStatus: "APPROVED" } })).id);
  venues.push((await prisma.venue.create({ data: { name: `${prefix} Shared Venue`, address: "Existing address" } })).id);
  for (let i = 0; i < 3; i++) events.push((await prisma.event.create({ data: { organizerId: organizations[i === 2 ? 1 : 0]!, venueId: venues[0]!, name: `${prefix} Event ${i}`, slug: `${prefix}-${i}`, status: "PUBLISHED", eventType: i === 0 ? "GIG" : "CONCERT", eventDate: new Date("2096-08-01T11:00:00Z"), startTime: new Date("2096-08-01T11:00:00Z"), endTime: new Date("2096-08-01T15:00:00Z") } })).id);
  tier = (await prisma.ticketCategory.create({ data: { eventId: events[0]!, name: '=VIP,"Floor"', price: 9999, admissionMode: "GENERAL_ADMISSION", maxCapacity: 10 } })).id;
  otherTier = (await prisma.ticketCategory.create({ data: { eventId: events[2]!, name: "Foreign", price: 100, admissionMode: "GENERAL_ADMISSION" } })).id;
}, 30000);
afterAll(async () => {
  vi.restoreAllMocks();
  const ownedEvents = await prisma.event.findMany({ where: { organizerId: { in: organizations } }, select: { id: true, venueId: true } });
  const ids = ownedEvents.map(event => event.id);
  venues.push(...ownedEvents.flatMap(event => event.venueId ? [event.venueId] : []));
  await prisma.activityLog.deleteMany({ where: { entityType: "Event", entityId: { in: ids } } });
  await prisma.ticketVerification.deleteMany({ where: { verifiedById: { in: users } } });
  await prisma.ticket.deleteMany({ where: { bookingItem: { eventId: { in: ids } } } });
  await prisma.payment.deleteMany({ where: { booking: { eventId: { in: ids } } } });
  await prisma.bookingItem.deleteMany({ where: { eventId: { in: ids } } });
  await prisma.booking.deleteMany({ where: { eventId: { in: ids } } });
  await prisma.eventSeat.deleteMany({ where: { eventId: { in: ids } } });
  await prisma.ticketCategory.deleteMany({ where: { eventId: { in: ids } } });
  await prisma.event.deleteMany({ where: { id: { in: ids } } });
  await prisma.venue.deleteMany({ where: { id: { in: venues } } });
  await prisma.organizerProfile.deleteMany({ where: { id: { in: organizations } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
}, 30000);
it("requires exactly organizer access, approval, trusted origin and strict input", async () => {
  for (const path of ["/dashboard", "/events", "/profile", "/check-ins", "/analytics?from=2096-06-01&to=2096-06-30", "/analytics/export?from=2096-06-01&to=2096-06-30"]) {
    expect((await request(fixture(null)).get(base + path)).status).toBe(401);
    for (const role of ["ATTENDEE", "ADMINISTRATOR"]) expect((await request(fixture(role)).get(base + path)).status).toBe(403);
  }
  for (const approvalStatus of ["PENDING", "REJECTED", "SUSPENDED"] as const) {
    await prisma.organizerProfile.update({ where: { id: organizations[0]! }, data: { approvalStatus } });
    expect((await request(app).get(base + "/profile")).body.error.code).toBe(`ORGANIZATION_${approvalStatus}`);
  }
  await prisma.organizerProfile.update({ where: { id: organizations[0]! }, data: { approvalStatus: "APPROVED" } });
  expect((await request(app).patch(base + "/profile").send({ bio: "x" })).status).toBe(403);
  expect((await request(app).patch(base + "/profile").set("Origin", origin).type("text").send("hello")).status).toBe(415);
  for (const body of [{}, { bio: "x", approvalStatus: "APPROVED" }, { accountNumber: "12345678" }, { bankName: "Bank", accountNumber: "•••• 5678" }]) expect((await write("/profile", body)).status).toBe(400);
  expect((await request(app).get(base + "/dashboard?unknown=1")).status).toBe(400);
  const malformed = await request(createApp()).patch(base + "/profile").set("Origin", origin).type("json").send('{"bio":');
  expect(malformed.status).toBe(400); expect(malformed.headers["cache-control"]).toBe("no-store");
});
it("saves contact and encrypted bank details atomically while preserving login identity", async () => {
  const originalKey = process.env.ORGANIZER_PAYOUT_KEY;
  process.env.ORGANIZER_PAYOUT_KEY = "ab".repeat(32);
  try {
    const response = await write("/profile", { organizationName: "Updated Organization", contactEmail: " Public@Example.Invalid ", bio: "Updated bio", bankName: "Bank", accountNumber: "000012345678" });
    expect(response.status).toBe(200); expect(response.body.data).toMatchObject({ contactEmail: "public@example.invalid", accountNumberMasked: "•••• 5678", approvalStatus: "APPROVED" });
    expect(JSON.stringify(response.body)).not.toContain("000012345678");
    const stored = await prisma.organizerProfile.findUniqueOrThrow({ where: { id: organizations[0]! }, include: { user: true } });
    expect(stored.user.email).toBe(`${prefix}-0@example.invalid`);
    const [version, iv, tag, ciphertext] = stored.payoutAccountEncrypted!.split(":");
    expect(version).toBe("v1");
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(process.env.ORGANIZER_PAYOUT_KEY, "hex"), Buffer.from(iv!, "base64"));
    decipher.setAuthTag(Buffer.from(tag!, "base64"));
    expect(Buffer.concat([decipher.update(Buffer.from(ciphertext!, "base64")), decipher.final()]).toString()).toBe("000012345678");
    expect((await write("/profile", { bio: "Only bio changed" })).status).toBe(200);
    expect((await prisma.organizerProfile.findUniqueOrThrow({ where: { id: stored.id } })).payoutAccountEncrypted).toBe(stored.payoutAccountEncrypted);
    delete process.env.ORGANIZER_PAYOUT_KEY;
    expect((await write("/profile", { bio: "Must roll back", bankName: "Replacement", accountNumber: "12345678" })).status).toBe(503);
    expect((await request(app).get(base + "/profile")).body.data.bio).toBe("Only bio changed");
  } finally { if (originalKey === undefined) delete process.env.ORGANIZER_PAYOUT_KEY; else process.env.ORGANIZER_PAYOUT_KEY = originalKey; }
});
it("persists drafts, categories, Manila times, safe venue replacements and stale edit protection", async () => {
  for (const field of ["status", "organizerId", "maxCapacity"]) expect((await write("/events", { title: "Draft", [field]: "forged" }, "post")).status).toBe(400);
  const draft = await write("/events", { title: " Draft title " }, "post");
  expect(draft.status).toBe(201); expect(draft.body.data).toMatchObject({ title: "Draft title", status: "DRAFT", startsAt: null });
  const id = draft.body.data.id;
  expect(await PublicEventsService.get(id)).toBeNull();
  const update = await write(`/events/${id}`, { expectedUpdatedAt: draft.body.data.updatedAt, category: "Conference", startsAt: "2096-11-20T19:00:00+08:00", venueText: "Hall, Manila" });
  expect(update.status).toBe(200); expect(update.body.data.startsAt).toBe("2096-11-20T11:00:00.000Z");
  const stored = await prisma.event.findUniqueOrThrow({ where: { id }, include: { venue: true } });
  expect(stored.eventDate).toEqual(stored.startTime); expect(stored.eventType).toBe("CONFERENCE"); expect(stored.venue).toMatchObject({ name: "Hall, Manila", address: "" });
  expect((await write(`/events/${id}`, { expectedUpdatedAt: draft.body.data.updatedAt, title: "Stale" })).status).toBe(409);
  const source = (await request(app).get(`${base}/events/${events[0]}`)).body.data;
  expect(source.category).toBe("Gig");
  expect((await write(`/events/${source.id}`, { expectedUpdatedAt: source.updatedAt, venueText: "Replacement Venue" })).status).toBe(200);
  const linked = await prisma.event.findUniqueOrThrow({ where: { id: source.id } });
  expect(linked.status).toBe("PUBLISHED"); expect(linked.endTime?.toISOString()).toBe("2096-08-01T15:00:00.000Z");
  expect((await prisma.venue.findUniqueOrThrow({ where: { id: venues[0]! } })).name).toContain("Shared Venue");
  const unchanged = (await request(app).get(`${base}/events/${source.id}`)).body.data;
  expect((await write(`/events/${source.id}`, { expectedUpdatedAt: unchanged.updatedAt, startsAt: null })).status).toBe(409);
  const responses = await Promise.all(["One", "Two"].map(title => write(`/events/${source.id}`, { expectedUpdatedAt: unchanged.updatedAt, title })));
  expect(responses.map(value => value.status).sort()).toEqual([200, 409]);
  expect((await request(app).get(`${base}/events/${events[2]}`)).status).toBe(404);
  expect((await write(`/events/${events[2]}`, { title: "Foreign", expectedUpdatedAt: unchanged.updatedAt })).status).toBe(404);
  const matches = await request(app).get(base + "/events").query({ search: "replacement venue", status: "PUBLISHED" });
  expect(matches.body.data.map(event => event.id)).toEqual([source.id]);
  for (const category of ["Conference", "Sports", "Theater"]) {
    await prisma.event.update({ where: { id: events[1]! }, data: { eventType: { Conference: "CONFERENCE", Sports: "SPORTS", Theater: "THEATER" }[category] as "CONFERENCE" | "SPORTS" | "THEATER" } });
    expect((await PublicEventsService.get(events[1]!))?.type).toBe(category);
  }
});
it("lets an organizer add general admission tiers and publish only a complete owned draft", async () => {
  const draft = await write("/events", { title: "Tickets", category: "Concert",
    startsAt: "2096-11-20T19:00:00+08:00", venueText: "Concert Hall" }, "post");
  const id = draft.body.data.id;
  expect((await write(`/events/${id}/publish`, { expectedUpdatedAt: draft.body.data.updatedAt }, "post")).body.error.code).toBe("INCOMPLETE_EVENT");
  expect((await write(`/events/${events[2]}/tiers`, { name: "GA", description: "", price: 100,
    maxCapacity: 10, status: "ACTIVE", expectedUpdatedAt: draft.body.data.updatedAt }, "post")).status).toBe(404);
  const tier = await write(`/events/${id}/tiers`, { name: " GA ", description: "Floor", price: 125.5,
    maxCapacity: 10, status: "ACTIVE", expectedUpdatedAt: draft.body.data.updatedAt }, "post");
  expect(tier.status).toBe(201);
  expect(tier.body.data.tiers[0]).toMatchObject({ name: "GA", price: 125.5, maxCapacity: 10, admissionMode: "GENERAL_ADMISSION" });
  expect((await write(`/events/${id}/tiers`, { name: "Stale", description: "", price: 100,
    maxCapacity: 10, status: "ACTIVE", expectedUpdatedAt: draft.body.data.updatedAt }, "post")).status).toBe(409);
  const changed = await write(`/events/${id}/tiers/${tier.body.data.tiers[0].id}`, { name: "VIP", description: "Front",
    price: 200, maxCapacity: 5, status: "ACTIVE", expectedUpdatedAt: tier.body.data.updatedAt });
  expect(changed.body.data.tiers[0]).toMatchObject({ name: "VIP", price: 200 });
  await prisma.user.update({ where: { id: users[0]! }, data: { emailVerified: true } });
  const published = await write(`/events/${id}/publish`, { expectedUpdatedAt: changed.body.data.updatedAt }, "post");
  expect(published.status).toBe(200);
  expect(published.body.data.status).toBe("PUBLISHED");
  expect((await PublicEventsService.get(id))?.categories[0]).toMatchObject({ name: "VIP", price: 200 });
  expect((await write(`/events/${id}/tiers`, { name: "Late", description: "", price: 100,
    maxCapacity: 10, status: "ACTIVE", expectedUpdatedAt: published.body.data.updatedAt }, "post")).body.error.code).toBe("TIER_EDIT_UNAVAILABLE");
  expect((await write(`/events/${id}/publish`, { expectedUpdatedAt: published.body.data.updatedAt }, "post")).body.error.code).toBe("INVALID_TRANSITION");
  expect(await prisma.activityLog.count({ where: { entityType: "Event", entityId: id, action: "EVENT_STATUS_CHANGED" } })).toBe(1);
});
it("uses one paid-booking selection for dashboard, analytics and escaped CSV at Manila boundaries", async () => {
  const sale = await booking({ quantity: 2, amount: 200.50, at: "2096-05-31T16:00:00Z" });
  await prisma.payment.createMany({ data: ["FAILED", "PENDING", "PAID"].map(status => ({ bookingId: sale.booking.id, provider: "paymongo_test", status: status as "FAILED" | "PENDING" | "PAID", amount: 200.50, paidAt: status === "PAID" ? new Date("2096-06-01T00:00:00Z") : null })) });
  await booking({ buyer: 3, amount: 50.10, at: "2096-06-30T15:59:59.999Z" });
  await booking({ at: "2096-05-31T15:59:59.999Z" });
  await booking({ at: "2096-06-30T16:00:00Z" });
  for (const status of ["REFUNDED", "CANCELLED", "EXPIRED", "PENDING_PAYMENT"] as const) await booking({ status, amount: 999 });
  await booking({ paid: false }); await booking({ event: 2 });
  const query = { from: "2096-06-01", to: "2096-06-30" };
  const report = await request(app).get(base + "/analytics").query(query);
  expect(report.status).toBe(200); expect(report.body.data).toMatchObject({ netRevenue: null, grossRevenue: 250.60, averageOrderValue: 125.30, ticketsPerOrder: 1.5, uniqueAttendees: 2, firstTimeBuyerPercent: 50, hasTestPayments: true });
  expect(report.body.data.tiers.find(row => row.id === tier)).toMatchObject({ sold: 3, revenue: 250.60, capacity: 10 });
  expect(report.body.data.grossChange).toBe(150);
  const csv = await request(app).get(base + "/analytics/export").query(query);
  expect(csv.status).toBe(200); expect(csv.text.trim().split("\r\n")).toHaveLength(3); expect(csv.text).toContain('"\'=VIP,""Floor"""'); expect(csv.text).not.toContain("Foreign");
  const dashboard = await OrganizerService.getDashboard(organizations[0]!, "Organization", new Date("2096-06-16T00:00:00Z"));
  expect(dashboard.metrics).toMatchObject({ ticketsSold: 5, grossRevenue: 451.10, checkInRate: 0, hasTestPayments: true });
  expect(dashboard.activeEvents.find(event => event.id === events[0])).toMatchObject({ ticketsSold: 5, grossRevenue: 451.10 });
  const empty = await request(app).get(base + "/analytics").query({ from: "2095-01-01", to: "2095-01-01" });
  expect(empty.body.data).toMatchObject({ grossRevenue: 0, uniqueAttendees: 0, grossChange: null, ticketsPerOrder: 0 });
  for (const query of [{ from: "2096-06-02", to: "2096-06-01" }, { from: "2096-02-30", to: "2096-03-01" }, { from: "bad", to: "bad" }]) expect((await request(app).get(base + "/analytics").query(query)).status).toBe(400);
});
it("uses enabled seat counts, preserves unknown capacity and distinguishes same-name tiers", async () => {
  const seating = await prisma.ticketCategory.create({ data: { eventId: events[1]!, name: '=VIP,"Floor"', price: 100, admissionMode: "ASSIGNED_SEATING", maxCapacity: 1 } });
  await prisma.eventSeat.createMany({ data: [true, true, false].map((enabled, index) => ({ eventId: events[1]!, ticketCategoryId: seating.id, displayLabel: `Seat ${index}`, seatNumber: String(index), enabled })) });
  const report = await OrganizerService.analytics(organizations[0]!, "2096-06-01", "2096-06-30");
  const sameNames = report.tiers.filter(row => row.name === '=VIP,"Floor"');
  expect(sameNames).toHaveLength(2); expect(new Set(sameNames.map(row => row.id)).size).toBe(2);
  expect(sameNames.find(row => row.id === seating.id)).toMatchObject({ capacity: 1, sold: 0, percent: 0 });
  await prisma.ticketCategory.create({ data: { eventId: events[1]!, name: "Unbounded", price: 100, admissionMode: "GENERAL_ADMISSION" } });
  const summaries = await OrganizerService.getEvents(organizations[0]!);
  expect(summaries.find(row => row.id === events[1])).toMatchObject({ totalCapacity: null, capacityPercent: null });
  expect(summaries.find(row => row.status === "DRAFT")).toMatchObject({ totalCapacity: 0, capacityPercent: 0, publicView: false });
});
it("admits once under concurrent scans and never exposes foreign tickets or raw payloads", async () => {
  const fresh = await booking();
  const results = await Promise.all([1, 2].map(() => write("/check-in", { ticketCode: fresh.code }, "post")));
  expect(results.map(response => response.body.data.result).sort()).toEqual(["ALREADY_USED", "VALID"]);
  expect(await prisma.ticketVerification.count({ where: { ticketId: fresh.ticketId, result: "VALID" } })).toBe(1);
  expect((await prisma.ticket.findUniqueOrThrow({ where: { id: fresh.ticketId } })).usedAt).not.toBeNull();
  for (const options of [{ status: "CANCELLED" }, { status: "REFUNDED" }, { status: "EXPIRED" }, { paid: false }, { ticketStatus: "CANCELLED" }, { ticketStatus: "EXPIRED" }] as const) {
    const item = await booking(options);
    const response = await write("/check-in", { ticketCode: item.code }, "post");
    expect(response.status).toBe(200); expect(response.body.data.result).toBe(options.status === "EXPIRED" || options.ticketStatus === "EXPIRED" ? "EXPIRED" : options.paid === false ? "INVALID" : "CANCELLED");
    expect(response.body.data.entry).toBeUndefined();
  }
  for (const ticketCode of ["AVX-unknown", (await booking({ event: 2 })).code]) {
    const response = await write("/check-in", { ticketCode }, "post");
    expect(response.body).toEqual({ data: { result: "INVALID" } });
    const log = await prisma.ticketVerification.findFirstOrThrow({ where: { tokenFingerprint: hash(ticketCode) } });
    expect(log.ticketId).toBeNull(); expect(log.tokenFingerprint).not.toContain(ticketCode);
  }
  const log = await request(app).get(base + "/check-ins");
  expect(log.body.data).toHaveLength(1); expect(log.body.data[0]).toMatchObject({ name: "Buyer 2", result: "VALID" });
  expect((await request(fixture("ORGANIZER", users[1]!)).get(base + "/check-ins")).body.data).toEqual([]);
  expect((await write("/check-in", { ticketCode: "" }, "post")).status).toBe(400);
});
it("accepts sold-out events and rejects draft or completed events", async () => {
  for (const [status, expected] of [["DRAFT", "INVALID"], ["SOLD_OUT", "VALID"], ["COMPLETED", "EXPIRED"]] as const) {
    await prisma.event.update({ where: { id: events[0]! }, data: { status } });
    const item = await booking();
    expect((await write("/check-in", { ticketCode: item.code }, "post")).body.data.result).toBe(expected);
  }
  await prisma.event.update({ where: { id: events[0]! }, data: { status: "PUBLISHED" } });
});
it("rechecks eligibility after waiting for refund and event cancellation locks", async () => {
  const item = await booking();
  let scan: Promise<request.Response>;
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id=${item.booking.id}::uuid FOR UPDATE`;
    scan = write("/check-in", { ticketCode: item.code }, "post").then(response => response);
    await tx.booking.update({ where: { id: item.booking.id }, data: { status: "REFUNDED" } });
  });
  expect((await scan!).body.data.result).toBe("CANCELLED");
  const next = await booking();
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Event" WHERE id=${events[0]}::uuid FOR UPDATE`;
    scan = write("/check-in", { ticketCode: next.code }, "post").then(response => response);
    await tx.event.update({ where: { id: events[0]! }, data: { status: "CANCELLED" } });
  });
  expect((await scan!).body.data.result).toBe("CANCELLED");
});
