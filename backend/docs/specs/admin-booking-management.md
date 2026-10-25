# Admin booking management

The admin bookings page reads PostgreSQL through Prisma and the existing same-origin `/api/v1` proxy. All endpoints require the current active, verified administrator session and return `Cache-Control: no-store`.

- `GET /api/v1/admin/bookings`: paginated list (`page`, `pageSize`, `search`, `status`, `event`). Search matches booking reference, customer name/email, and event name.
- `GET /api/v1/admin/bookings/stats`: statistics for the same search and filters. Booking value includes confirmed and unexpired pending bookings, including confirmed bookings for completed events. Cancelled, expired, and refunded amounts are excluded.
- `GET /api/v1/admin/bookings/event-options`: events with persisted bookings.
- `GET /api/v1/admin/bookings/export`: every matching booking as quoted CSV, with spreadsheet formula prefixes escaped.
- `GET /api/v1/admin/bookings/:id`: customer, event, actual ticket line prices, payment timestamps, and most recent administrative payment note. Missing values remain null.
- `PATCH /api/v1/admin/bookings/:id/payment`: `{ paymentStatus: "paid" | "refunded", note?: string }`. Requires configured frontend origin and JSON. Notes are limited to 500 characters.

Database `PENDING_PAYMENT` is displayed as pending until its hold expires, then expired. `CONFIRMED` bookings for events explicitly marked `COMPLETED` display as completed. Other database booking and payment states retain their meaning, including failed payments and refunded bookings.

Payment changes are manual bookkeeping, without a payment gateway call. Record paid only after receiving funds; record refunded only after returning funds. A payment can be recorded only for an unexpired pending booking for an event that is neither cancelled nor completed, without an existing paid/refunded payment. Recording payment creates a manual payment and confirms the booking and held seat allocations. Recording refund requires a paid payment and a booking that is neither completed nor already refunded; it marks paid payments and the booking refunded, cancels issued tickets, and releases allocations. This endpoint does not implement attendee checkout or issue new tickets.

Booking row locks serialize concurrent administrative decisions. Payment, booking, allocations, ticket cancellation, and the actor/note activity log persist in one transaction; a failed audit rolls everything back. Invalid transitions return 409 and cannot repeat payment writes.

Verification: `npm run typecheck`, `npm run build`, and `npx vitest run test/admin-bookings.test.ts test/authorization.test.ts --testTimeout=30000` in backend; frontend TypeScript and targeted ESLint. Integration fixtures verify the dedicated test database marker before creating isolated records and remove only their own records.
