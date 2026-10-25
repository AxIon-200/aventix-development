# Administrator payment management

The payments page reads persisted Payment records and their Booking, User, and Event relations. Each payment attempt is a separate transaction row, including failed attempts. Bookings without a payment record do not appear. Payment updates remain in booking management.

All endpoints require the existing administrator session checks and return Cache-Control: no-store:

- GET /api/v1/admin/payments: page, pageSize, search, status; newest first with an ID tie breaker.
- GET /api/v1/admin/payments/stats: total, paid, pending, recordedValue for the same search and status filter. Recorded value sums all matching recorded amounts, including failed and refunded attempts; it is not revenue.
- GET /api/v1/admin/payments/export: all matching rows as CSV, with quotes and spreadsheet formula prefixes escaped.
- GET /api/v1/admin/payments/:id: real customer email, booking reference, event name, provider reference, and history built only from recorded creation, payment, and refund timestamps.

Payment display codes use PAY- followed by the complete persistent UUID. Search matches a complete display code or UUID, customer name/email, provider/method/reference, booking reference, or event name. Missing payment methods fall back to the recorded provider; absent provider references display Not recorded. Pending, paid, failed and refunded statuses preserve database meaning. No database migration or seeded sample payments are needed.

Verification: backend typechecking and test/admin-payments.test.ts, plus the authorization suite; frontend TypeScript and targeted ESLint. Database fixtures check the dedicated test marker and remove only their isolated records.
