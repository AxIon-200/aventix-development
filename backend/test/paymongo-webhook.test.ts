import { createHmac, randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, expect, it, vi } from "vitest";
import { createPayMongoWebhookApp, PAYMONGO_WEBHOOK_PATH, savePayMongoReceipt } from "../src/lib/paymongo-webhook.js";
import { prisma } from "../src/lib/prisma.js";

const secret = "isolated-paymongo-test-signing-secret";
const now = new Date("2026-10-25T10:00:00Z");
const eventId = `evt_fixture_${randomUUID()}`;
function payload() { return { data: { id: eventId, type: "event", attributes: {
  type: "checkout_session.payment.paid", livemode: false, data: { id: "cs_test_fixture", type: "checkout_session",
    attributes: { reference_number: "fixture-reference", payments: [{ id: "pay_test_fixture", type: "payment", attributes: {
      status: "paid", amount: 150050, currency: "PHP", billing: { email: "must-not-be-stored@example.com" },
    } }] } },
} } }; }
function signature(body: string, timestamp = Math.floor(now.getTime() / 1000)) {
  return `t=${timestamp},te=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")},li=`;
}
function fixture(save = vi.fn(async () => true), signingSecret: string | undefined = secret) {
  return { save, app: createPayMongoWebhookApp({ secret: () => signingSecret, now: () => now, save }) };
}
function deliver(app: ReturnType<typeof createPayMongoWebhookApp>, raw = JSON.stringify(payload()), header = signature(raw)) {
  return request(app).post(PAYMONGO_WEBHOOK_PATH).set("Content-Type", "application/json").set("Paymongo-Signature", header).send(raw);
}
it("accepts valid signed test payments and stores only the fields needed for later checkout integration", async () => {
  const { app, save } = fixture();
  const response = await deliver(app);
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ received: true, duplicate: false });
  expect(save).toHaveBeenCalledWith({ eventId, checkoutSessionId: "cs_test_fixture", referenceNumber: "fixture-reference",
    paymentId: "pay_test_fixture", amountCentavos: 150050, currency: "PHP", livemode: false, payloadHash: expect.any(String) });
  expect(JSON.stringify(save.mock.calls)).not.toContain("must-not-be-stored");
});
it("rejects tampered, unsigned, old, future, malformed and live events before any storage", async () => {
  const { app, save } = fixture();
  const raw = JSON.stringify(payload());
  expect((await deliver(app, raw + " ", signature(raw))).status).toBe(401);
  expect((await deliver(app, raw, "bad")).status).toBe(401);
  for (const offset of [-301, 301]) expect((await deliver(app, raw, signature(raw, now.getTime() / 1000 + offset))).status).toBe(401);
  const live = payload(); live.data.attributes.livemode = true;
  expect((await deliver(app, JSON.stringify(live))).status).toBe(400);
  expect((await deliver(app, "{bad-json")).status).toBe(400);
  const noPayments = payload(); noPayments.data.attributes.data.attributes.payments = [];
  expect((await deliver(app, JSON.stringify(noPayments))).status).toBe(400);
  const twoPayments = payload(); twoPayments.data.attributes.data.attributes.payments.push(twoPayments.data.attributes.data.attributes.payments[0]!);
  expect((await deliver(app, JSON.stringify(twoPayments))).status).toBe(400);
  expect(save).not.toHaveBeenCalled();
});
it("acknowledges dashboard test events without inventing missing payment amounts", async () => {
  const { app, save } = fixture();
  const dashboard = payload();
  const attributes = dashboard.data.attributes.data.attributes.payments[0]!.attributes;
  Reflect.deleteProperty(attributes, "amount");
  Reflect.deleteProperty(attributes, "currency");
  expect((await deliver(app, JSON.stringify(dashboard))).status).toBe(200);
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ amountCentavos: null, currency: null }));
  attributes.currency = "USD";
  expect((await deliver(app, JSON.stringify(dashboard))).status).toBe(400);
  attributes.currency = "PHP";
  expect((await deliver(app, JSON.stringify(dashboard))).status).toBe(400);
  expect(save).toHaveBeenCalledTimes(1);
});
it("fails closed before configuration, requests retry on storage failure and exposes no other app endpoints", async () => {
  const missing = createPayMongoWebhookApp({ secret: () => undefined });
  expect((await request(missing).get("/health")).status).toBe(503);
  expect((await deliver(missing)).status).toBe(503);
  const app = createPayMongoWebhookApp({ secret: () => secret, now: () => now, save: async () => { throw new Error("private database detail"); } });
  const failed = await deliver(app);
  expect(failed.status).toBe(503);
  expect(failed.text).not.toContain("private database detail");
  expect((await request(app).get("/api/v1/admin/users")).status).toBe(404);
  expect((await request(app).post("/api/auth/login").send({})).status).toBe(404);
  expect((await request(app).get(PAYMONGO_WEBHOOK_PATH)).status).toBe(404);
});
it("persists one receipt for concurrent delivery retries in the verified test database", async () => {
  const marker = await prisma.$queryRaw<Array<{ environment: string }>>`SELECT environment FROM public.test_environment_marker WHERE id=1`;
  expect(marker[0]?.environment).toBe("aventix-test");
  const app = createPayMongoWebhookApp({ secret: () => secret, now: () => now, save: savePayMongoReceipt });
  const results = await Promise.all([deliver(app), deliver(app)]);
  expect(results.map(r => r.status)).toEqual([200, 200]);
  expect(results.map(r => r.body.duplicate).sort()).toEqual([false, true]);
  const rows = await prisma.activityLog.findMany({ where: { action: "PAYMONGO_TEST_WEBHOOK_RECEIVED", metadata: { path: ["eventId"], equals: eventId } } });
  expect(rows).toHaveLength(1);
  expect(rows[0]!.metadata).toMatchObject({ eventId, amountCentavos: 150050, processingStatus: "UNMATCHED_TEST_EVENT" });
});
afterAll(async () => {
  await prisma.activityLog.deleteMany({ where: { action: "PAYMONGO_TEST_WEBHOOK_RECEIVED", metadata: { path: ["eventId"], equals: eventId } } });
});
