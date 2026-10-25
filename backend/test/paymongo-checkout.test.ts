import { afterEach, expect, it, vi } from "vitest";
import { paymongoCheckout, CheckoutProviderError } from "../src/lib/paymongo-checkout.js";
const input = { reference: "AVX-test-reference", bookingId: "fixture-booking", paymentId: "fixture-payment", method: "gcash",
  items: [{ name: "Standing", amount: 125025, quantity: 1 }] };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("accepts PayMongo v2's minimal create response and sends exact server prices with fixed return URLs", async () => {
  vi.stubEnv("PAYMONGO_SECRET_KEY", "sk_test_fixture");
  const fetcher = vi.fn(async () => Response.json({ data: { id: "cs_fixture", attributes: {
    checkout_url: "https://checkout.paymongo.com/fixture", livemode: false, created_at: 1790000000,
  } } }));
  vi.stubGlobal("fetch", fetcher);
  expect((await paymongoCheckout.create(input)).id).toBe("cs_fixture");
  const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("https://api.paymongo.com/v2/checkout_sessions");
  const body = JSON.parse(options.body as string).data.attributes;
  expect(body).toMatchObject({ reference_number: input.reference, payment_method_types: ["gcash"],
    line_items: [{ name: "Standing", amount: 125025, quantity: 1, currency: "PHP" }] });
  expect(new URL(body.success_url).pathname).toBe("/bookings/fixture-booking/confirmation");
});
it("refuses live mode and untrusted checkout origins and distinguishes rejection from uncertain creation", async () => {
  vi.stubEnv("PAYMONGO_SECRET_KEY", "sk_live_forbidden");
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  await expect(paymongoCheckout.create(input)).rejects.toMatchObject({ definitive: true });
  expect(fetcher).not.toHaveBeenCalled();
  vi.stubEnv("PAYMONGO_SECRET_KEY", "sk_test_fixture");
  fetcher.mockResolvedValueOnce(Response.json({ error: "rejected" }, { status: 422 }));
  await expect(paymongoCheckout.create(input)).rejects.toMatchObject({ definitive: true });
  fetcher.mockRejectedValueOnce(new Error("timeout"));
  await expect(paymongoCheckout.create(input)).rejects.toMatchObject({ definitive: false });
  for (const attributes of [{ livemode: true, checkout_url: "https://checkout.paymongo.com/fixture" },
    { livemode: false, checkout_url: "https://example.com/checkout" }]) {
    fetcher.mockResolvedValueOnce(Response.json({ data: { id: "cs_fixture", attributes } }));
    await expect(paymongoCheckout.create(input)).rejects.toBeInstanceOf(CheckoutProviderError);
  }
});
it("only releases a checkout after retrieval confirms expiry with no paid or ongoing payment", async () => {
  vi.stubEnv("PAYMONGO_SECRET_KEY", "sk_test_fixture");
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  for (const [status, paymentStatus, expected] of [["expired", "failed", true], ["active", "paid", false], ["expired", "processing", false]] as const) {
    fetcher.mockResolvedValueOnce(Response.json({}, { status: 400 }));
    fetcher.mockResolvedValueOnce(Response.json({ data: { id: "cs_fixture", attributes: { livemode: false, status,
      payments: [{ id: "pay_fixture", attributes: { status: paymentStatus } }] } } }));
    expect(await paymongoCheckout.expire("cs_fixture")).toBe(expected);
  }
});
