import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { hashExactPassword } from "../src/lib/exact-password.js";
import { defaultSettings } from "../src/routes/admin-settings.routes.js";

const origin = process.env.FRONTEND_URL!;
const terms = { version: "admin-settings-fixture", documentUrl: "https://example.com/terms" };
const password = " admin settings fixture password ";
const prefix = `admin-settings-${randomUUID()}`;
const app = createApp({ terms, loginLimit: 1000, aggregateLimit: 10000 });
const admin = request.agent(app);
const otherAdmin = request.agent(app);
const attendee = request.agent(app);
const ids: string[] = [];
const endpoint = "/api/v1/admin/settings";
const put = (body: unknown) => admin.put(endpoint).set("Origin", origin).send(body);

beforeAll(async () => {
  const marker = await prisma.$queryRaw<Array<{ environment: string }>>`
    SELECT environment FROM public.test_environment_marker WHERE id = 1`;
  expect(marker[0]?.environment).toBe("aventix-test");
  const hash = await hashExactPassword(password);
  for (const [label, role, agent] of [["admin", "ADMINISTRATOR", admin], ["other", "ADMINISTRATOR", otherAdmin], ["attendee", "ATTENDEE", attendee]] as const) {
    const id = randomUUID();
    ids.push(id);
    const email = `${prefix}-${label}@example.com`;
    await prisma.user.create({ data: { id, firstName: "Settings", lastName: label, name: `Settings ${label}`,
      email, role, emailVerified: true, termsVersion: terms.version, termsAcceptedAt: new Date(),
      accounts: { create: { accountId: id, providerId: "credential", password: hash } } } });
    expect((await agent.post("/api/auth/login").set("Origin", origin).send({ email, password })).status).toBe(200);
  }
}, 30000);

afterAll(async () => {
  await prisma.activityLog.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
});

it("requires an eligible administrator for reads and writes", async () => {
  expect((await request(app).get(endpoint)).status).toBe(401);
  expect((await request(app).put(endpoint).set("Origin", origin).send(defaultSettings)).status).toBe(401);
  expect((await attendee.get(endpoint)).status).toBe(403);
  expect((await attendee.put(endpoint).set("Origin", origin).send(defaultSettings)).status).toBe(403);
});

it("returns honest unsaved defaults without writing on GET", async () => {
  const result = await admin.get(endpoint);
  expect(result.status).toBe(200);
  expect(result.headers["cache-control"]).toBe("no-store");
  expect(result.body).toEqual({ settings: defaultSettings, updatedAt: null });
  expect(await prisma.adminPreferences.count({ where: { userId: ids[0] } })).toBe(0);
});

it("persists all preferences across new requests, audits the save, and isolates accounts", async () => {
  const changed = structuredClone(defaultSettings);
  changed.general.timezone = "UTC";
  changed.notifications.email = false;
  changed.appearance.compactTables = true;
  changed.appearance.sidebar = "collapsed";
  changed.system.dataRefresh = "off";
  const saved = await put(changed);
  expect(saved.status).toBe(200);
  expect(saved.body.settings).toEqual(changed);
  expect(Number.isFinite(Date.parse(saved.body.updatedAt))).toBe(true);
  expect((await admin.get(endpoint)).body).toEqual(saved.body);
  expect((await otherAdmin.get(endpoint)).body).toEqual({ settings: defaultSettings, updatedAt: null });
  expect(await prisma.activityLog.count({ where: { userId: ids[0], action: "ADMIN_SETTINGS_UPDATED" } })).toBe(1);
});

it("rejects cross-origin, non-JSON, unknown, malformed and unavailable settings atomically", async () => {
  const original = (await admin.get(endpoint)).body;
  expect((await admin.put(endpoint).set("Origin", "https://untrusted.example").send(defaultSettings)).status).toBe(403);
  expect((await admin.put(endpoint).send(defaultSettings)).status).toBe(403);
  expect((await admin.put(endpoint).set("Origin", origin).type("text").send("bad")).status).toBe(415);
  for (const invalid of [
    {}, { ...defaultSettings, userId: ids[1] },
    { ...defaultSettings, general: { ...defaultSettings.general, timezone: "Invalid/Timezone" } },
    { ...defaultSettings, appearance: { ...defaultSettings.appearance, theme: "light" } },
    { ...defaultSettings, security: { ...defaultSettings.security, twoFactor: true } },
    { ...defaultSettings, system: { ...defaultSettings.system, maintenanceMode: true } },
    { ...defaultSettings, notifications: { ...defaultSettings.notifications, email: "false" } },
  ]) expect((await put(invalid)).status).toBe(400);
  expect((await admin.get(`${endpoint}?userId=${ids[1]}`)).status).toBe(400);
  expect((await admin.get(endpoint)).body).toEqual(original);
});

it("rechecks live account eligibility before settings access", async () => {
  await prisma.user.update({ where: { id: ids[1] }, data: { status: "DISABLED" } });
  expect((await otherAdmin.get(endpoint)).status).toBe(403);
  expect((await otherAdmin.put(endpoint).set("Origin", origin).send(defaultSettings)).status).toBe(403);
});
