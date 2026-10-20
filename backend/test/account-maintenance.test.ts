import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { runAccountCommand, verifyMaintenanceTarget } from "../src/lib/account-maintenance.js";
import { env } from "../src/config/env.js";
import type { VerificationMessage } from "../src/lib/verification-email.js";

const password = " dedicated admin password ";
const terms = { version: "maintenance-test-fixture", documentUrl: "https://example.com/test-fixture-terms" };
const emails: string[] = [];
const ids: string[] = [];
const target = { expectedProjectRef: process.env.TEST_DATABASE_PROJECT_REF!, operator: "integration-test-developer" };
const messages: VerificationMessage[] = [];
const options = { terms, now: () => new Date("2099-01-01"), loginLimit: 10000, aggregateLimit: 10000,
  verificationResendLimit: 10000, verificationLimit: 10000, termsAcceptanceLimit: 10000,
  sendVerificationEmail: async (message: VerificationMessage) => { messages.push(message); } };
const post = (app: ReturnType<typeof createApp>, path: string, body: object) => request(app)
  .post(`/api/auth${path}`).set("Origin", process.env.FRONTEND_URL!).send(body);
const cookieFrom = (response: request.Response) => (response.headers["set-cookie"] as unknown as string[])
  .find(value => value.startsWith("better-auth.session_token="))!.split(";")[0]!;

async function provision() {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(options.now());
  const email = `maintenance-${randomUUID()}@example.com`;
  emails.push(email);
  const result = await runAccountCommand("create-administrator", {
    email: ` ${email.toUpperCase()} `, firstName: " Admin ", lastName: " Owner ", password,
  }, target);
  ids.push(result.id);
  return { id: result.id, email, app: createApp(options) };
}

async function eligible() {
  const f = await provision();
  await prisma.user.update({ where: { id: f.id }, data: { emailVerified: true,
    termsVersion: terms.version, termsAcceptedAt: options.now() } });
  const login = await post(f.app, "/login", { email: f.email, password });
  expect(login.status).toBe(200);
  return { ...f, cookie: cookieFrom(login) };
}

afterEach(() => vi.useRealTimers());
afterAll(async () => {
  await prisma.activityLog.deleteMany({ where: { entityId: { in: ids } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.emailCooldown.deleteMany({ where: { email: { in: emails } } });
  await prisma.authRateLimit.deleteMany({ where: { expiresAt: { gte: new Date("2099-01-01"), lt: new Date("2099-02-01") } } });
});

it("provisions a dedicated unverified administrator without manufacturing consent or bypassing owner completion", async () => {
  const f = await provision();
  expect((await post(f.app, "/login", { email: f.email, password })).body.error.code).toBe("EMAIL_VERIFICATION_REQUIRED");
  expect((await post(f.app, "/resend-verification", { email: f.email })).status).toBe(200);
  const token = new URLSearchParams(new URL(messages.at(-1)!.url).hash.slice(1)).get("token");
  expect((await post(f.app, "/verify-email", { token, currentPassword: password })).status).toBe(200);
  expect((await post(f.app, "/login", { email: f.email, password })).body.error.code).toBe("TERMS_ACCEPTANCE_REQUIRED");
  expect((await post(f.app, "/accept-terms", { email: f.email, currentPassword: password,
    termsAccepted: true, termsVersion: terms.version })).status).toBe(200);
  const login = await post(f.app, "/login", { email: f.email, password });
  expect(login.status).toBe(200);
  expect(login.body.data.user).toMatchObject({ id: f.id, role: "ADMINISTRATOR", email: f.email,
    firstName: "Admin", lastName: "Owner", name: "Admin Owner", emailVerified: true,
    termsVersion: terms.version, status: "ACTIVE" });
  const audit = await prisma.activityLog.findMany({ where: { entityId: f.id, action: "ADMINISTRATOR_PROVISIONED" } });
  expect(audit).toHaveLength(1);
  expect(audit[0]).toMatchObject({ userId: null, entityType: "User", metadata: { operator: target.operator } });
  expect(JSON.stringify(audit)).not.toContain(password);
});

it("disable and re-enable revoke every old session even with no intervening requests", async () => {
  const f = await provision();
  // Isolated eligible identity fixture; the command itself never writes these fields.
  await prisma.user.update({ where: { id: f.id }, data: { emailVerified: true,
    termsVersion: terms.version, termsAcceptedAt: options.now() } });
  const cookies = [];
  for (let index = 0; index < 2; index++) cookies.push(cookieFrom(await post(f.app, "/login", { email: f.email, password })));
  expect((await request(f.app).get("/api/v1/me").set("Cookie", cookies[0]!)).status).toBe(200);
  await runAccountCommand("disable", { id: f.id }, target);
  expect((await post(f.app, "/login", { email: f.email, password })).body.error.code).toBe("ACCOUNT_DISABLED");
  await runAccountCommand("enable", { id: f.id }, target);
  for (const cookie of cookies) {
    expect((await request(f.app).get("/api/v1/me").set("Cookie", cookie)).status).toBe(401);
    expect((await request(f.app).patch("/api/v1/me").set("Cookie", cookie)
      .set("Origin", process.env.FRONTEND_URL!).send({ firstName: "Revived" })).status).toBe(401);
    expect((await post(f.app, "/change-password", { currentPassword: password, newPassword: "different new password" })
      .set("Cookie", cookie)).status).toBe(401);
  }
  const login = await post(f.app, "/login", { email: f.email, password });
  expect(login.status).toBe(200);
  expect(login.body.data.user).toMatchObject({ role: "ADMINISTRATOR", status: "ACTIVE", firstName: "Admin" });
  expect(cookies).not.toContain(cookieFrom(login));
  const audits = await prisma.activityLog.findMany({ where: { entityId: f.id }, orderBy: { createdAt: "asc" } });
  expect(audits.map(log => log.action)).toEqual(["ADMINISTRATOR_PROVISIONED", "ACCOUNT_DISABLED", "ACCOUNT_REENABLED"]);
  expect(audits[1]?.metadata).toEqual({ operator: target.operator, previousStatus: "ACTIVE", status: "DISABLED" });
  expect(audits[2]?.metadata).toEqual({ operator: target.operator, previousStatus: "DISABLED", status: "ACTIVE" });
});

it("rejects password arguments and noninteractive invocation without printing secrets", () => {
  for (const args of [["create-administrator", "--password", password], ["disable", "--id", password], ["create-administrator"]]) {
    const result = spawnSync(process.execPath, ["--import", "tsx", "src/commands/accounts.ts", ...args], {
      encoding: "utf8", timeout: 10000,
    });
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).not.toContain(password);
    expect(result.stdout + result.stderr).toMatch(/Usage:|interactive terminal/);
  }
});

it("rejects wrong database identities, role conversions, unknown commands, and invalid IDs without mutations", async () => {
  const f = await provision();
  const originalUrl = env.DATABASE_URL;
  try {
    for (const databaseUrl of [
      `postgresql://postgres:secret@db.${target.expectedProjectRef}.supabase.co.attacker.example/postgres`,
      `postgresql://postgres.attacker${target.expectedProjectRef}:secret@aws-0-region.pooler.supabase.com/postgres`,
      `postgresql://postgres:secret@db.${target.expectedProjectRef}.supabase.co/other`,
      `${originalUrl}?user=postgres.anotherproject`,
    ]) {
      env.DATABASE_URL = databaseUrl;
      await expect(runAccountCommand("disable", { id: f.id }, target)).rejects.toThrow("Database does not match");
    }
  } finally { env.DATABASE_URL = originalUrl; }
  await expect(verifyMaintenanceTarget({ ...target, expectedProjectRef: "a".repeat(20) })).rejects.toThrow("Database does not match");
  await expect(verifyMaintenanceTarget({ ...target, operator: "" })).rejects.toThrow("developer identity");
  await expect(runAccountCommand("set-role", { id: f.id, role: "ATTENDEE" }, target)).rejects.toThrow("Unknown maintenance command");
  await expect(runAccountCommand("disable", { id: "invalid" }, target)).rejects.toThrow("valid account ID");
  await expect(runAccountCommand("enable", { id: randomUUID() }, target)).rejects.toThrow("Account was not found");
  await expect(runAccountCommand("disable", { id: f.id, role: "ATTENDEE" }, target)).rejects.toThrow("valid account ID");
  expect(await prisma.user.findUnique({ where: { id: f.id } })).toMatchObject({ role: "ADMINISTRATOR", status: "ACTIVE" });
  expect(await prisma.activityLog.count({ where: { entityId: f.id } })).toBe(1);
});

it("cannot complete authorization with a revoked session after a paused policy check resumes", async () => {
  const f = await eligible();
  let release!: () => void;
  let locked!: () => void;
  let blockerPid: number;
  let observing = true;
  const hold = new Promise<void>(resolve => { release = resolve; });
  const ready = new Promise<void>(resolve => { locked = resolve; });
  // Pause credential reads at the database boundary, after the session lookup.
  const blocker = prisma.$transaction(async tx => {
    const [backend] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
    blockerPid = backend!.pid;
    await tx.$executeRaw`LOCK TABLE public.account IN ACCESS EXCLUSIVE MODE`;
    locked();
    await hold;
  }, { timeout: 30000 });
  const waitForBlocked = async (table: string, blockingPid: number) => {
    for (let attempt = 0; observing && attempt < 100; attempt++) {
      const rows = await prisma.$queryRaw<Array<{ pid: number }>>`
        SELECT pid FROM pg_stat_activity
        WHERE datname = current_database() AND wait_event_type = 'Lock'
          AND ${blockingPid} = ANY(pg_blocking_pids(pid))
          AND query LIKE ${`%"${table}"%`}
          AND query ILIKE ${table === "account" ? "%SELECT%" : "%UPDATE%"}
      `;
      if (rows[0]) return rows[0].pid;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error("Expected database interleaving was not reached");
  };
  await ready;
  const reading = request(f.app).get("/api/v1/me").set("Cookie", f.cookie).then(response => response);
  let changing: Promise<unknown> | undefined;
  try {
    const readerPid = await waitForBlocked("account", blockerPid!);
    changing = runAccountCommand("disable", { id: f.id }, target)
      .then(() => runAccountCommand("enable", { id: f.id }, target));
    const order = await Promise.race([
      changing.then(() => "disabled-first"),
      waitForBlocked("user", readerPid).then(() => "authorization-first"),
    ]);
    observing = false;
    release();
    await blocker;
    // Authorization may finish before disabling obtains its lifecycle lock.
    // Once disabling committed first, the paused request must deny the cookie.
    expect((await reading).status).toBe(order === "disabled-first" ? 401 : 200);
    await changing;
    expect((await request(f.app).get("/api/v1/me").set("Cookie", f.cookie)).status).toBe(401);
  } finally {
    observing = false;
    release();
    await blocker;
    await reading;
    await changing;
  }
}, 30000);

it("rejects normalized duplicate identities and protected administrator inputs without altering an existing account", async () => {
  const f = await eligible();
  const profile = { email: ` ${f.email.toUpperCase()} `, firstName: "Other", lastName: "Identity", password: "another independent password" };
  await expect(runAccountCommand("create-administrator", profile, target)).rejects.toThrow("Email is already registered");
  for (const extra of [{ role: "ORGANIZER" }, { emailVerified: true }, { termsAcceptedAt: new Date() }, { termsAccepted: true }, { status: "DISABLED" }]) {
    await expect(runAccountCommand("create-administrator", { ...profile, ...extra }, target)).rejects.toThrow("Invalid administrator input");
  }
  for (const invalid of ["short", "x".repeat(129), "\ud800".repeat(15)]) {
    await expect(runAccountCommand("create-administrator", { ...profile, password: invalid }, target)).rejects.toThrow("Invalid administrator input");
  }
  expect((await request(f.app).get("/api/v1/me").set("Cookie", f.cookie)).body.data.user).toMatchObject({ firstName: "Admin", role: "ADMINISTRATOR" });
  expect((await post(f.app, "/login", { email: f.email, password })).status).toBe(200);
  expect((await post(f.app, "/login", { email: f.email, password: profile.password })).status).toBe(401);
});

it("rolls back status and session revocation if the mandatory audit fails", async () => {
  const f = await eligible();
  const constraint = `maintenance_test_${randomUUID().replaceAll("-", "")}`;
  await prisma.$executeRawUnsafe(`ALTER TABLE public."ActivityLog" ADD CONSTRAINT ${constraint} CHECK ("entityId" <> '${f.id}'::uuid) NOT VALID`);
  try {
    await expect(runAccountCommand("disable", { id: f.id }, target)).rejects.toThrow("Account status change failed");
    expect((await request(f.app).get("/api/v1/me").set("Cookie", f.cookie)).status).toBe(200);
    expect(await prisma.activityLog.count({ where: { entityId: f.id } })).toBe(1);
  } finally {
    await prisma.$executeRawUnsafe(`ALTER TABLE public."ActivityLog" DROP CONSTRAINT ${constraint}`);
  }
});

it("rolls back administrator creation when provisioning cannot be audited", async () => {
  const operator = `rollback-${randomUUID()}`;
  const email = `maintenance-${randomUUID()}@example.com`;
  emails.push(email);
  const constraint = `maintenance_test_${randomUUID().replaceAll("-", "")}`;
  await prisma.$executeRawUnsafe(`ALTER TABLE public."ActivityLog" ADD CONSTRAINT ${constraint} CHECK (metadata->>'operator' <> '${operator}') NOT VALID`);
  try {
    await expect(runAccountCommand("create-administrator", { email, firstName: "Rollback", lastName: "Owner", password },
      { ...target, operator })).rejects.toThrow("Administrator provisioning failed");
    expect(await prisma.user.count({ where: { email } })).toBe(0);
  } finally {
    await prisma.$executeRawUnsafe(`ALTER TABLE public."ActivityLog" DROP CONSTRAINT ${constraint}`);
  }
});

it("serializes concurrent login and disable so re-enabling cannot revive a racing session", async () => {
  const f = await eligible();
  const [login] = await Promise.all([
    post(f.app, "/login", { email: f.email, password }),
    runAccountCommand("disable", { id: f.id }, target),
  ]);
  expect([200, 403]).toContain(login.status);
  await runAccountCommand("enable", { id: f.id }, target);
  const cookies = [f.cookie, ...(login.status === 200 ? [cookieFrom(login)] : [])];
  for (const cookie of cookies) expect((await request(f.app).get("/api/v1/me").set("Cookie", cookie)).status).toBe(401);
  expect((await post(f.app, "/login", { email: f.email, password })).status).toBe(200);
});
