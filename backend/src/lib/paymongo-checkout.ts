import { z } from "zod";

export const paymentMethods = [
  { id: "gcash", label: "GCash" }, { id: "paymaya", label: "Maya" }, { id: "card", label: "Card" },
];
const sessionSchema = z.object({ data: z.object({ id: z.string().regex(/^cs_[A-Za-z0-9]+$/),
  attributes: z.object({ livemode: z.literal(false), status: z.string().optional(),
    checkout_url: z.url().optional(), reference_number: z.string().nullish(),
    payments: z.array(z.object({ id: z.string(), attributes: z.object({ status: z.string(),
      amount: z.number().int().nonnegative().safe().optional(), currency: z.string().optional() }) })).optional(),
  }) }) });
export type CheckoutSession = z.infer<typeof sessionSchema>["data"];
export class CheckoutProviderError extends Error {
  constructor(public definitive: boolean) { super("PayMongo checkout could not be confirmed"); }
}
export interface CheckoutGateway {
  create(input: { reference: string; bookingId: string; paymentId: string; method: string;
    items: { name: string; amount: number; quantity: number }[] }): Promise<CheckoutSession>;
  expire(sessionId: string): Promise<boolean>;
  inspect(sessionId: string): Promise<CheckoutSession>;
}
function authorization() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key?.startsWith("sk_test_")) throw new CheckoutProviderError(true);
  return "Basic " + Buffer.from(key + ":").toString("base64");
}
export function safeCheckoutUrl(value: string | undefined) {
  if (!value) throw new CheckoutProviderError(false);
  const url = new URL(value);
  if (url.origin !== "https://checkout.paymongo.com" || url.username || url.password) throw new CheckoutProviderError(false);
  return url.href;
}
export const paymongoCheckout: CheckoutGateway = {
  async create(input) {
    const origin = new URL(process.env.FRONTEND_URL ?? "http://localhost:3000").origin;
    let response: Response;
    try {
      response = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
        method: "POST", headers: { Authorization: authorization(), "Content-Type": "application/json" },
        body: JSON.stringify({ data: { attributes: {
          line_items: input.items.map(item => ({ ...item, currency: "PHP" })),
          payment_method_types: [input.method], reference_number: input.reference,
          metadata: { bookingId: input.bookingId, paymentId: input.paymentId },
          success_url: `${origin}/bookings/${input.bookingId}/confirmation`,
          cancel_url: `${origin}/bookings/${input.bookingId}/payment`,
          send_email_receipt: false, show_line_items: true,
        } } }), signal: AbortSignal.timeout(15000),
      });
    } catch (error) { if (error instanceof CheckoutProviderError) throw error; throw new CheckoutProviderError(false); }
    if (!response.ok) throw new CheckoutProviderError(response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429);
    const parsed = sessionSchema.safeParse(await response.json());
    // v2 create returns only checkout_url, livemode and timestamps; the reference is returned on retrieval/webhooks.
    if (!parsed.success || (parsed.data.data.attributes.reference_number != null && parsed.data.data.attributes.reference_number !== input.reference)) throw new CheckoutProviderError(false);
    safeCheckoutUrl(parsed.data.data.attributes.checkout_url);
    return parsed.data.data;
  },
  async expire(id) {
    if (!/^cs_[A-Za-z0-9]+$/.test(id)) return false;
    const headers = { Authorization: authorization(), Accept: "application/json" };
    const response = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${id}/expire`, {
      method: "POST", headers, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok && response.status !== 400) return false;
    // Re-read even after 400: paid or processing sessions must keep their inventory.
    const current = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${id}`, { headers, signal: AbortSignal.timeout(10000) });
    if (!current.ok) return false;
    const parsed = sessionSchema.safeParse(await current.json());
    return parsed.success && parsed.data.data.id === id && parsed.data.data.attributes.status === "expired"
      && !(parsed.data.data.attributes.payments ?? []).some(p => ["paid", "pending", "processing"].includes(p.attributes.status));
  },
  async inspect(id) {
    if (!/^cs_[A-Za-z0-9]+$/.test(id)) throw new CheckoutProviderError(false);
    const response = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${id}`, {
      headers: { Authorization: authorization(), Accept: "application/json" }, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new CheckoutProviderError(false);
    const parsed = sessionSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.data.id !== id) throw new CheckoutProviderError(false);
    return parsed.data.data;
  },
};
