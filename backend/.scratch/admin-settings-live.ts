import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { hashExactPassword } from "../src/lib/exact-password.js";

const target = new URL(process.env.DATABASE_URL!);
assert(process.env.TEST_DATABASE_PROJECT_REF);
assert(`${target.hostname} ${decodeURIComponent(target.username)}`.includes(process.env.TEST_DATABASE_PROJECT_REF));
assert.notEqual(process.env.DATABASE_URL, process.env.DEV_DATABASE_URL);
const marker = await prisma.$queryRaw<Array<{ environment: string }>>`SELECT environment FROM public.test_environment_marker WHERE id = 1`;
assert.equal(marker[0]?.environment, "aventix-test");
const id = randomUUID();
const email = `settings-live-${id}@example.com`;
const password = `settings verification ${randomUUID()}`;
try {
  await prisma.user.create({ data: { id, name: "Settings Verification", firstName: "Settings", lastName: "Verification",
    email, role: "ADMINISTRATOR", status: "ACTIVE", emailVerified: true,
    // Synthetic consent belongs only to this disposable, marker-verified test identity.
    termsVersion: "admin-settings-disposable-test-fixture", termsAcceptedAt: new Date(),
    accounts: { create: { accountId: id, providerId: "credential", password: await hashExactPassword(password) } } } });
  const login = await fetch("http://localhost:3001/api/auth/login", { method: "POST",
    headers: { Origin: process.env.FRONTEND_URL!, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  assert.equal(login.status, 200, "Live proxy login failed");
  const cookie = login.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
  assert(cookie, "Login did not issue a cookie");
  const headers = { Cookie: cookie, Origin: process.env.FRONTEND_URL!, "Content-Type": "application/json" };
  const endpoint = "http://localhost:3001/api/v1/admin/settings";
  const first = await fetch(endpoint, { headers });
  assert.equal(first.status, 200, "Live settings load failed");
  const initial = await first.json();
  assert.equal(initial.updatedAt, null);
  const changed = structuredClone(initial.settings);
  changed.appearance.compactTables = true;
  changed.general.timezone = "UTC";
  const saved = await fetch(endpoint, { method: "PUT", headers, body: JSON.stringify(changed) });
  const savedText = await saved.text();
  assert.equal(saved.status, 200, `Live settings save failed: ${savedText.slice(0, 300)}`);
  const persisted = JSON.parse(savedText);
  assert.deepEqual(persisted.settings, changed);
  const reload = await fetch(endpoint, { headers });
  assert.deepEqual(await reload.json(), persisted);
  console.log("PASS: real localhost:3001 login proxy, settings defaults, save, and reload persistence.");
} finally {
  await prisma.activityLog.deleteMany({ where: { userId: id } });
  await prisma.user.deleteMany({ where: { id } });
  await prisma.$disconnect();
}
