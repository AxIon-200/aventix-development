# Administrator event management

The existing `/admin/events` page uses `/api/v1/admin/events`, restricted to
eligible signed-in administrators by the shared live account checks.
This implements the project owner's request on 2026-10-25. No migration is needed.

- `GET /`: paginated database events, newest first with stable ID ordering.
  Supports search by title, organization, venue, or exact `EVT-<UUID>` and filters
  for status and category. Page size is 1–100, default 10.
- `GET /stats`: global counts for all five database statuses and total events.
- `GET /:id`: actual description, ticket tiers, capacity, confirmed ticket
  quantities, and revenue (sum of booking-item subtotals in confirmed bookings).
  Pending, cancelled, expired, and refunded bookings are excluded from sales.
  Missing dates and categories stay null. General-admission capacity is null
  when unset. Assigned-seat capacity is enabled seat count capped by maxCapacity.
  Overall capacity is null if any tier has unknown capacity.
- `GET /export`: every matching row as CSV, including formula-safe text.
- `PATCH /:id/status`: JSON `{ status, expectedUpdatedAt, reason? }`, requiring
  the exact configured frontend Origin. The timestamp must match the last read
  version; updates compare and swap the event row to reject concurrent edits.

Statuses are returned in lowercase: draft, published, sold_out, completed,
cancelled. Category music_festival maps to festival. IDs are UUIDs.
Errors never substitute samples. Responses use no-store.

Allowed transitions follow the existing availability UI: draft to published or
cancelled; published or sold_out to draft or cancelled; cancelled to draft.
Completed events are read-only. Publishing requires a venue, schedule, category,
active ticket tier, and an approved organizer with an active verified account.
Every successful transition and optional cancellation reason are saved in
ActivityLog in the same transaction as the event. Details read the most recent
event status audit to show its cancellation reason. Audit failure rolls back.

Cancellation closes availability through Event.status. It does not perform
refunds, alter bookings/tickets, or send notifications. The reason field describes
recording a reason, without promising notification delivery. Existing tickets
remain intact when moving an event to draft.
