# PayMongo test webhook setup

The dedicated receiver binds to `127.0.0.1:5051`. A Cloudflare Quick Tunnel exposes only this service, not the Express authentication/admin API or the Next.js frontend.

- `POST /api/v1/webhooks/paymongo`: verifies PayMongo's test `te` HMAC-SHA256 signature against the unmodified request body, with a five-minute signature timestamp tolerance. Only test `checkout_session.payment.paid` events containing exactly one paid PHP payment are accepted. Invalid signatures, live events and malformed payloads do not write to the database.
- `GET /health`: indicates whether the signing secret is configured. All other paths return 404.
- Accepted events are persisted as `ActivityLog` rows with action `PAYMONGO_TEST_WEBHOOK_RECEIVED`. A PostgreSQL transaction advisory lock serializes duplicate event IDs; retries return 200 without adding another row. Storage failures return 503 so delivery can be retried. Receipt metadata stores the event/session/payment references, amount in centavos, currency, test marker and body hash; billing details and credentials are excluded.

The receiver now reconciles sessions created by the [attendee checkout integration](paymongo-checkout.md). Matching verified payments confirm bookings, confirm allocations, issue tickets and record paid amounts in the same transaction as the receipt. Unknown dashboard fixtures are acknowledged as `UNMATCHED_TEST_EVENT`; missing or mismatched payment details never confirm a booking. A stored receipt alone is not booking confirmation or revenue. Earlier `AWAITING_CHECKOUT_INTEGRATION` receipts remain historical setup evidence.

## Configuration

Dashboard test events can omit both payment `amount` and `currency`. The test receiver acknowledges these signed events and stores both fields as `null`; it never infers a paid amount from line items. When supplied, the amount must be a nonnegative safe integer and currency must be PHP. Supplying only one field is rejected. These incomplete test receipts must not be used to settle bookings or calculate revenue.

Secrets live in ignored `backend/.env.test`: `PAYMONGO_SECRET_KEY` must start with `sk_test_`; `PAYMONGO_WEBHOOK_SECRET` is returned by PayMongo registration. Registration also saves `PAYMONGO_WEBHOOK_ID` and `PAYMONGO_WEBHOOK_URL`. Never put these secrets in frontend environment variables. `backend/.local/` is ignored and contains the tunnel binary, process IDs, logs and nonsecret registration state.

Start or restart from the backend directory:

```powershell
& ./scripts/start-paymongo-test.ps1
```

The script builds the backend, starts/reuses the dedicated tunnel, creates or updates only the webhook registered by this setup, saves the signing secret locally, and starts the receiver in the background. Keep `.local/paymongo/registration.json` so future tunnel URLs update the same endpoint rather than creating duplicates. The hostname changes when a new Quick Tunnel is created. Both processes must remain running for delivery.

To test a genuine PayMongo delivery: open Developers → Webhooks in the PayMongo dashboard, switch to Test mode, open the endpoint, choose Test Events → `checkout_session.payment.paid`, and send a test event. Check Event Deliveries for HTTP 200 and the database activity log for the receipt. The integration tests additionally verify tampering rejection, timestamp checks, live-event rejection, safe storage errors, inaccessible application routes, and concurrent duplicate persistence against the marker-verified test database.

References: [PayMongo webhook setup](https://docs.paymongo.com/docs/developer-tools-webhook-setup-management), [event structure](https://docs.paymongo.com/docs/developer-tools-webhooks-events), [sending test events](https://docs.paymongo.com/do/docs/sending-a-test-event), [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
