# PayMongo simulation

In the attendee portal, open **Buy Tickets**, select an event, tickets and any required seats, then proceed to checkout. Choose GCash, Maya or Card and click **Open PayMongo demo**.

The local dialog offers successful payment, failed payment and cancellation. Escape also cancels. A signed-in attendee is required. Success creates a uniquely identified demo pass and saves it to an attendee-specific browser list. Failure and cancellation allow retrying or changing methods without issuing a pass. Each retry creates a new attempt. My Tickets preserves the demo label and payment reference when reopening the pass.

This is a local UI simulation, not PayMongo's hosted sandbox. It needs no API keys, collects no card or wallet credentials, makes no provider requests, reserves no inventory and writes no backend payment records. Demo passes do not grant admission. Reloading an unfinished checkout discards that attempt; successful demo passes remain in this browser's local storage.

Dashboard, My Tickets and booking history read the signed-in attendee's database records through `GET /api/v1/attendee/dashboard`, using the existing session cookie and role checks. The dashboard counts valid/used tickets in confirmed bookings, distinct future events with valid tickets, and successful payment amounts excluding refunds. Request failures display an error rather than sample or zero totals.

Demo bookings use `aventix_demo_bookings:<userId>` in local storage. They appear in all three views. Dashboard cards include demo ticket quantities, booking counts, simulated amounts and upcoming events; badges identify totals that include simulation. The spending card shows real payments and simulated amounts as separate components. Upcoming events are counted once per event and demo rows are labeled Simulation. If database records cannot load, local demo activity still appears, labeled Local demos only. Older unscoped demo tickets are not automatically assigned to an attendee because their owner cannot be verified.

The Prisma schema, migrations and configured `.env.test` database have no points/rewards/loyalty fields or tables. The sample reward-points card has been removed; no points system or earning rules are implemented.

Run `node --test --test-isolation=none tests/paymongo-simulation.test.mjs tests/attendee-records.test.mjs` to check payment outcomes and dashboard calculations. Backend endpoint tests: `npx vitest run test/attendee-dashboard.test.ts --configLoader native --pool threads` from `backend/`.
