# Administrator dashboard

The dashboard reads the existing PostgreSQL User, OrganizerProfile, Event, Booking, BookingItem, Payment and ActivityLog tables through Prisma. No new tables, migration or sample data are required. Existing administrator eligibility checks protect every endpoint and responses use `Cache-Control: no-store`. The frontend uses the existing same-origin `/api/v1` proxy.

- `GET /api/v1/admin/dashboard/stats`: total accounts, organization profiles and events; published/sold-out events starting in the next 30 days; confirmed bookings including completed events; ticket quantities in confirmed bookings; paid payment amounts excluding refunded, pending and failed payments; activity logs in the last 24 hours. Subtitles show actual additions over the last 30 days, not invented percentage comparisons. Ticket and booking additions use booking creation time; paid amounts use paidAt with creation time as a fallback. Counts and sums share a repeatable-read snapshot.
- `GET /api/v1/admin/dashboard/sales?range=7d|30d|90d`: daily confirmed booking quantities and paid revenue in PHP. Includes today and fills empty days with zero. Booking creation time and payment paidAt/creation fallback are grouped by Philippine calendar day. Revenue has its own chart axis.
- `GET /api/v1/admin/dashboard/booking-status`: counts and total for confirmed, completed, pending, cancelled, expired and refunded bookings. As in booking management, confirmed bookings for completed events display as completed, and pending holds at/past their expiry display as expired. Percentages are calculated from counts in the UI; an empty database displays zero.
- `GET /api/v1/admin/dashboard/recent-events`, `/recent-users`, `/recent-bookings`: five newest records by creation time, with descending ID as a tie breaker. Event dates remain null when unset; persisted event statuses are preserved. Booking display statuses follow booking management.
- `GET /api/v1/admin/dashboard/export`: a CSV snapshot of the eight headline metrics and report timestamp.

Unknown query parameters and invalid ranges return 400. Database failures return a generic 500 response; the UI offers retry actions. Date range selection, CSV download, View all links and the existing administrator refresh preference are connected.

Verification: backend typechecking/build, `test/admin-dashboard.test.ts`, `test/authorization.test.ts`, frontend TypeScript and targeted ESLint. Integration fixtures verify the dedicated test database marker and clean up only their own data.
