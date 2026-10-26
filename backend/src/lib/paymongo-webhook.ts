import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import express, { type ErrorRequestHandler } from "express";
import { z } from "zod";
import { prisma } from "./prisma.js";
import { settleCheckout } from "./settle-checkout.js";

export const PAYMONGO_WEBHOOK_PATH = "/api/v1/webhooks/paymongo";
const paidPayment = z.object({ id: z.string().min(1).max(128), attributes: z.object({
  amount: z.number().int().nonnegative().safe().optional(), currency: z.literal("PHP").optional(), status: z.literal("paid"),
}).refine(value => (value.amount === undefined) === (value.currency === undefined)) });
const eventSchema = z.object({ data: z.object({ id: z.string().min(1).max(128), type: z.literal("event"),
  attributes: z.object({ type: z.literal("checkout_session.payment.paid"), livemode: z.literal(false),
    data: z.object({ id: z.string().min(1).max(128), type: z.literal("checkout_session"), attributes: z.object({
      reference_number: z.string().max(200).nullish(), payments: z.array(paidPayment.or(z.object({
        id: z.string(), attributes: z.object({ status: z.string().refine(value => value !== "paid") }).passthrough(),
      }))).max(100),
    }) }),
  }),
}) });
export interface PayMongoReceipt {
  eventId: string;
  checkoutSessionId: string;
  referenceNumber: string | null;
  paymentId: string;
  amountCentavos: number | null;
  currency: "PHP" | null;
  livemode: false;
  payloadHash: string;
}
export type SavePayMongoReceipt = (receipt: PayMongoReceipt) => Promise<boolean>;

export function verifyPayMongoSignature(body: Buffer, signature: string | undefined, secret: string, now: Date) {
  if (!signature || signature.length > 512) return false;
  const parts = new Map<string, string>();
  for (const part of signature.split(",")) {
    const [key, value] = part.trim().split("=");
    if (!key || value === undefined || parts.has(key)) return false;
    parts.set(key, value);
  }
  const timestamp = parts.get("t");
  const supplied = parts.get("te");
  if (!timestamp || !/^\d{1,12}$/.test(timestamp) || !supplied || !/^[a-f\d]{64}$/i.test(supplied)) return false;
  if (Math.abs(now.getTime() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(timestamp + ".").update(body).digest();
  return timingSafeEqual(expected, Buffer.from(supplied, "hex"));
}

// The advisory lock serializes retries even when PayMongo delivers the same event concurrently.
export const savePayMongoReceipt: SavePayMongoReceipt = async receipt => prisma.$transaction(async tx => {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('aventix-paymongo-test'), hashtext(${receipt.eventId}))::text`;
  const duplicate = await tx.activityLog.findFirst({ where: { action: "PAYMONGO_TEST_WEBHOOK_RECEIVED",
    metadata: { path: ["eventId"], equals: receipt.eventId } }, select: { id: true } });
  if (duplicate) return false;
  const settlement = await settleCheckout(tx, receipt);
  await tx.activityLog.create({ data: { action: "PAYMONGO_TEST_WEBHOOK_RECEIVED", entityType: "PayMongoWebhook",
    metadata: { ...receipt, ...settlement } } });
  return true;
}, { timeout: 15000 });

export interface PayMongoWebhookOptions {
  secret?: () => string | undefined;
  now?: () => Date;
  save?: SavePayMongoReceipt;
}

export function createPayMongoWebhookRouter(options: PayMongoWebhookOptions = {}) {
  const router = express.Router();
  const secret = options.secret ?? (() => process.env.PAYMONGO_WEBHOOK_SECRET);
  router.post(PAYMONGO_WEBHOOK_PATH, express.raw({ type: "application/json", limit: "256kb" }), async (req, res) => {
    res.set("Cache-Control", "no-store");
    const signingSecret = secret();
    if (!signingSecret) { res.status(503).json({ error: "Webhook is not configured" }); return; }
    if (!Buffer.isBuffer(req.body)) { res.status(415).json({ error: "JSON content type is required" }); return; }
    if (!verifyPayMongoSignature(req.body, req.get("Paymongo-Signature"), signingSecret, options.now?.() ?? new Date())) {
      res.status(401).json({ error: "Invalid webhook signature" }); return;
    }
    let payload: unknown;
    try { payload = JSON.parse(req.body.toString("utf8")); }
    catch { res.status(400).json({ error: "Invalid webhook JSON" }); return; }
    const parsed = eventSchema.safeParse(payload);
    if (!parsed.success) { res.status(400).json({ error: "Expected a test checkout payment event" }); return; }
    const event = parsed.data.data;
    const session = event.attributes.data;
    const paid = session.attributes.payments.map(payment => paidPayment.safeParse(payment))
      .filter(result => result.success).map(result => result.data);
    if (paid.length !== 1) { res.status(400).json({ error: "Expected exactly one paid PHP payment" }); return; }
    const payment = paid[0]!;
    try {
      const created = await (options.save ?? savePayMongoReceipt)({ eventId: event.id, checkoutSessionId: session.id,
        referenceNumber: session.attributes.reference_number ?? null, paymentId: payment.id,
        // Dashboard test events omit these fields. Never infer a paid amount from line items.
        amountCentavos: payment.attributes.amount ?? null, currency: payment.attributes.currency ?? null, livemode: false,
        payloadHash: createHash("sha256").update(req.body).digest("hex") });
      res.status(200).json({ received: true, duplicate: !created });
    } catch { res.status(503).json({ error: "Webhook could not be saved; retry delivery" }); }
  });
  router.use(((error, _req, res, _next) => {
    res.status(error?.type === "entity.too.large" ? 413 : 400).json({ error: "Invalid webhook request" });
  }) satisfies ErrorRequestHandler);
  return router;
}

export function createPayMongoWebhookApp(options: PayMongoWebhookOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  const secret = options.secret ?? (() => process.env.PAYMONGO_WEBHOOK_SECRET);
  app.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  app.get("/health", (_req, res) => res.status(secret() ? 200 : 503).json({ ready: Boolean(secret()), mode: "test", service: "paymongo-webhook" }));
  app.use(createPayMongoWebhookRouter(options));
  app.use((_req, res) => { res.status(404).json({ error: "Not found" }); });
  return app;
}
