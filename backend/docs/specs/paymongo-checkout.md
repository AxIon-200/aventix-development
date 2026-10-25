# Attendee PayMongo test checkout

The attendee Buy Tickets flow now creates a database reservation and opens the existing booking payment page. GCash, Maya and Card use PayMongo Hosted Checkout v2 with backend-only `sk_test_` credentials. Live keys and live events are rejected. The browser simulation remains available only as legacy demonstration code; it cannot create these paid bookings.

## HTTP contract

All `/api/v1/checkout` routes require the current active, verified attendee session through `requireRoles`, check booking/ticket ownership and return `Cache-Control: no-store`. POST additionally requires exact configured frontend Origin and JSON. No request supplies prices, customer identity, return URLs or provider credentials.

- `GET /events/:id/options`: current event and cumulative attendee purchase allowance.
- `GET /events/:id/seats`: numbered seats and allocation status.
- `POST /bookings`: `{ version: 1, eventId, items: [{ ticketCategoryId, quantity, seatIds }], operationKey }`. The operation key is a UUID; a hash scoped to the owner identifies the booking. Identical retries return the same booking; changed input with the same key returns 409. Prices and totals are calculated in centavos from stored categories. The initial hold lasts 15 minutes.
- `GET /bookings/:id`: authoritative summary, payment status, server clock, expiry, allowed actions and issued ticket links.
- `GET /bookings/:id/payment-methods`: GCash, Maya, Card.
- `POST /bookings/:id/payment`: `{ methodId: "gcash" | "paymaya" | "card", operationKey }`. Creates one pending Payment claim before calling PayMongo. Returns a trusted `https://checkout.paymongo.com` redirect. An existing checkout is reused regardless of a new operation key; failed payments within the hosted session can be retried there. Returning to Aventix never marks it paid.
- `POST /bookings/:id/cancel`: `{ operationKey }`. Idempotent cancellation; expires the provider session and verifies its terminal status before releasing inventory.
- `GET /tickets/:id`: owner-only persisted ticket data for the printable pass and QR code. Test payments produce clearly marked test passes, without real admission entitlement.

## Reservation and settlement

Event row locks serialize inventory and cumulative per-attendee limits. Assigned seats must belong to the selected event/category, be enabled, unique, and exactly match quantity. General admission checks category capacity. The existing partial unique allocation index additionally prevents two active allocations for a seat.

The dedicated [webhook receiver](paymongo-test-webhooks.md) matches the stored Checkout Session ID, booking reference, PHP currency, and exact booking/payment amount. Booking row locks serialize webhook, cancellation and administrative decisions. Event and provider payment ID locks protect settlement against inventory races and payment reuse. Payment, booking confirmation, seat confirmation, one ticket per attendee, receipt, and audit commit together. Duplicate event IDs and later events for a confirmed session cannot duplicate tickets or paid amounts. Missing amounts, unknown sessions, cancelled bookings/events and invalid transitions are retained for inspection without confirmation. A webhook arriving before its create response is persisted receives 503 for retry.

Confirmed Payment rows feed existing attendee records, administrative payment/booking pages and recorded revenue statistics. The current test database includes test transactions; these totals are demonstration amounts, not actual funds. Manual paid bookkeeping is blocked while a PayMongo payment claim is pending. Refund processing and gate scanning are separate features.

PayMongo sessions do not expire automatically. The API process runs a 30-second expiry check. Pending inventory remains reserved even after its local deadline until the provider is confirmed expired and has no paid/ongoing payment. Provider errors and in-progress payments preserve the hold. A session whose creation has an uncertain result is never automatically retried or released: check PayMongo against the booking reference and recover its session ID before resuming/closing it. This conservative recovery requires operator review; creating a second payable session is unsafe. An abandoned browser does not release inventory by itself.

## Setup and verification

Apply `20261025010000_paymongo_checkout` with `node --env-file=.env.test scripts/checkout-migrate.mjs`. The script checks test/development separation, project identity and the test marker, and refuses unrelated pending migrations. Generate Prisma, rebuild the backend, restart the API and dedicated receiver. Keep the existing tunnel and webhook enabled. Redirect URLs use configured `FRONTEND_URL` and fixed booking routes.

Automated verification covers HTTP ownership/roles/origins, price tampering, idempotent creation, inventory contention, matching and mismatched signed events, duplicate/concurrent deliveries, issuance, rollback, uncertain provider requests and expiry safety. The provider adapter tests cover minimal v2 responses, test-only keys, redirect trust and definitive versus uncertain failures. Unpaid provider smoke checks create and expire sessions for all three methods. Completing an actual hosted test payment is a separate interactive smoke step.

References: [Hosted Checkout](https://docs.paymongo.com/docs/payment-channels-hosted-checkout), [session lifecycle and expiry](https://docs.paymongo.com/docs/payment-channels-key-concepts), [Checkout quick start](https://docs.paymongo.com/docs/payment-channels-hosted-checkout-quick-start).
