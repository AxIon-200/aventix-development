# Administrator attendee management

This slice implements the existing `/admin/users` frontend, authorized by the
project owner on 2026-10-25. It extends the earlier Phase 1 scope, which kept
administrator HTTP account-management operations unavailable. The Phase 1
[account/session rules](../../documents/phases/phase-1-authentication.md) still
apply. Organizer approval remains a separate workflow.

Only an eligible, signed-in `ADMINISTRATOR` can use `/api/v1/admin/users`.
The list, details, statistics, export, and status mutations target `ATTENDEE`
accounts exclusively. User roles, credentials, consent, and email verification
cannot be changed here. The API returns account states `active` and `disabled`,
mapping to database values `ACTIVE` and `DISABLED`. Email verification is a
separate, read-only field. Attendees never await administrator activation.

## Cards

- Total Attendees: all attendee accounts, including disabled/unverified accounts.
- Active Accounts: attendees with account status `ACTIVE`; this does not mean
  recently online or that email verification/sign-in requirements are complete.
- New Attendees: attendee accounts created within the last 30 elapsed days,
  including the exact cutoff and excluding future creation timestamps.
- Attendees with Bookings: unique attendees with at least one currently
  `CONFIRMED` booking. Cancelled, expired, refunded, and pending bookings do not
  qualify. Multiple confirmed bookings count once.

Cards are global totals and do not change with table filters. Missing records
return zero counts/empty lists; database failures return errors, never samples.

## Endpoints

| Method/path below `/api/v1/admin/users` | Result |
| --- | --- |
| `GET /` | `{ data: [], total, page, pageSize }`; search name/email/exact user ID, filter active/disabled, newest first with stable ID ordering |
| `GET /stats` | `{ data: { total, active, newLast30Days, withBookings } }` |
| `GET /export` | CSV of every attendee matching search/status, with formula-safe cells |
| `GET /:id` | `{ data: attendee }`, including phone, email verification, total bookings of all statuses and ticket quantity in currently confirmed bookings |
| `PATCH /:id/status` | JSON `{ status: "active" | "disabled" }`; returns `{ data: attendee }` |

IDs are UUIDs; the display code is `USR-` followed by the full ID. Search is
case-insensitive. List page size is 1–100 (default 10). Unknown input fields,
pending/inactive statuses, and invalid IDs are rejected. Non-attendee IDs return
404. Responses require cookie authentication and use `Cache-Control: no-store`.
Mutations require JSON and the configured exact frontend Origin.

Each status mutation locks the attendee row using the shared lifecycle lock,
updates account status, deletes every session, and records `ACCOUNT_DISABLED`
or `ACCOUNT_REENABLED` in one transaction. The audit actor is the administrator;
the subject is the attendee. Audit/session failures roll back the transaction.
Re-enabling requires fresh login and never verifies email or restores sessions.
Repeated requests also invalidate sessions and record the operation. Concurrent
status requests are serialized; the last committed requested status takes effect.

No schema migration is needed. Integration coverage is in
[`admin-users.test.ts`](../../test/admin-users.test.ts), using the existing
isolated-database checks and disposable fixtures.
