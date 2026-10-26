# Organizer backend and database implementation plan

Implementation update (2026-10-26): the organizer event form now supports creating and editing general admission ticket tiers for draft events and publishing a complete draft. The original boundaries below describe the planning baseline. Assigned seating configuration remains outside this editor.

Planning baseline: current working-tree frontend in `aventix-development`, reviewed 2026-10-26. This document proposes implementation; it does not change application code or the database.

**Implementation status — 2026-10-26**

The supported flows in phases 1–5 are implemented in the working tree. All six screens use the authenticated organizer API; the preview banner and sample business records have been removed. The additive organizer migration has been applied to the verified dedicated test database only. Other databases still need that migration before running this code.

- Profile persistence uses encrypted bank storage and masked responses. Set the server-only `ORGANIZER_PAYOUT_KEY` to a stable 64-character hexadecimal key (32 random bytes). Without it, bank replacement returns `PAYOUT_STORAGE_UNAVAILABLE`; ordinary profile edits remain available. Keep this key with the encrypted data and do not rotate it without a data migration.
- My Events and the topbar search use `/events` with title/venue search and database status filters. Draft saving returns an ID reused by subsequent saves and reloads. Edit/Manage uses the same form with optimistic concurrency; Public View is limited to displayable public records.
- Manual and camera scans share `/check-in`. Camera QR decoding uses the browser's `BarcodeDetector`; unsupported browsers or denied permissions display the manual-entry fallback. The stream reads `/check-ins`, refreshes after admission, and polls every 10 seconds while visible, with cleanup on unmount or rejected access.
- Dashboard reads `/dashboard`; analytics and CSV read `/analytics` and `/analytics/export` with the same Manila date selection. These are current confirmed paid sales, including explicit test-payment labels. Ticket-tier continuation, organizer publishing, fee-based net revenue, and actual payouts remain unavailable as specified below.
- Backend coverage lives in [organizer-workspace.test.ts](../../test/organizer-workspace.test.ts), with live account gates in [authorization.test.ts](../../test/authorization.test.ts). [organizer-frontend.test.mjs](../../../tests/organizer-frontend.test.mjs) covers the production build, protected rendering, browser persistence, retry/error/empty states, scanning, and account switching using a controlled HTTP fixture.

Verified: backend typecheck/build; 24 integration tests across organizer workspace, authorization, and admin events; frontend TypeScript and organizer/workspace lint; all three organizer frontend checks including browser interaction; four ticket-availability checks; and 15 public/attendee regression checks. The isolated frontend production build omits Google Fonts downloads so the integration fixture does not depend on external font availability. Camera wiring is exercised with a controlled detector/stream; physical-device permission and native QR detection still depend on browser support.

Build on the existing Express, TypeScript, Prisma, PostgreSQL, and Better Auth application. Connect the screens that exist, reuse the existing tables, and keep calculations in ordinary service functions. No new backend framework or infrastructure is needed.

**Frontend scope and current state**

The source of truth is the six components under [organizer/screens](../../../src/components/organizer/screens), rendered through the protected organizer routes. `/organizer` and `/organizer/dashboard` show the same dashboard.

| Existing screen | What to connect | Current limitation |
| --- | --- | --- |
| Dashboard | Four summary cards, managed events, recent ticket sales, Manage links | Sample records and hardcoded card values |
| My Events | Event cards, title/venue search, status filter, Edit, Public View | Search/filter have no behavior; action buttons are disabled |
| Create New Event | Title, category, date/time, venue/city, description, Save as Draft | Only date/time has state; no save request |
| Ticket Scanner | Camera QR reading, manual code validation, recent successful entries | Camera is decorative; all entries are samples |
| Sales & Analytics | Date range, three cards, ticket-tier performance, CSV export | Date range changes state only; figures are hardcoded |
| Organizer Profile & Payouts | Organization name, contact email, bio, bank name/number, approval badge, Save Profile | All profile and bank data are samples |

The shell already uses the authenticated account name and sign-out flow. Keep that integration. Sidebar collapse and mobile navigation stay local UI behavior.

The old [organizer router](../../src/routes/organizer.routes.ts), controller, and service are stubs and are **not mounted**. They use an obsolete `req.user` guard, allow administrators, and return sample data or unconditional scan success. Replace their behavior before mounting them; do not expose them as they are.

**Boundaries imposed by the current frontend**

- There is a “Continue to Ticket Tiers” button, but no ticket-tier editor or next-step screen. No seating editor, image upload, sales-window form, or publish action exists either. Implement draft saving for the five existing fields. Keep Continue unavailable with an explanation until that frontend exists. Do not create tiers, seats, or publish an event automatically.
- Edit and Manage are existing actions. Reuse the same five-field form in edit mode, such as `/organizer/events/new?eventId=<id>`, rather than building a new management workspace. Preserve an existing event's status during edits.
- Public View links to the existing `/events/<id>` page. Keep it unavailable for drafts or records that the public endpoint cannot display.
- The bank form supports saving bank details. It does not define withdrawals, bank verification, disbursement schedules, or payment transfers. Those workflows are outside this plan. Adjust sample text that promises withdrawals or implies money has been transferred.
- The topbar search has no results UI or defined ticket-search flow. It can submit an event query to the existing My Events search; align its placeholder to that behavior. Do not add global search or ticket browsing.
- The notification bell receives an empty list and has no organizer notification source. Keep its empty state; do not invent notification events, tables, or delivery jobs.
- `PENDING_APPROVAL` exists in a frontend type but has no organizer submission/review flow. Use the database's existing event statuses, including `SOLD_OUT`; do not add event approval.

These are explicit limits on completing the current preview. A complete event creation-to-publication journey cannot be delivered from the existing organizer form alone.

**1. Reuse the database and make only small additions**

Existing schema: [schema.prisma](../../prisma/schema.prisma).

| Existing model | Use |
| --- | --- |
| `User`, `Session`, `Account` | Existing identity and authentication |
| `OrganizerProfile` | Organization identity, description, approval state, event ownership |
| `OrganizerApplication`, decision models | Existing application/approval history; leave submission evidence unchanged |
| `Event`, `Venue` | Event details, status, date/time, venue |
| `TicketCategory`, `EventSeat` | Read existing tiers and capacities |
| `Booking`, `BookingItem`, `Payment` | Paid sales, order totals, buyer information, reports |
| `Ticket`, `TicketVerification` | Validate tickets, persist check-in, show recent entries |

Proposed schema changes:

1. Add nullable `contactEmail`, `payoutBankName`, `payoutAccountEncrypted`, and `payoutAccountLast4` fields to `OrganizerProfile`. Continue storing the bio in `description`. One account per organization is enough; no payout-account table is necessary.
2. Extend `EventType` with `CONFERENCE`, `SPORTS`, and `THEATER`, because those choices already appear in the form. Map Concert to `CONCERT` and Festival to `MUSIC_FESTIVAL`; retain existing `GIG` records. The earlier music-only domain and enum conflict with the current dropdown. This plan follows the user's current-frontend scope. Update existing public/admin category serializers and frontend types to handle these values without silently reporting everything as Concert. Preserve Gig when editing an existing Gig event.
3. Add indexes only for actual query shapes missing from the schema: for example `Event(organizerId, status)` and `TicketVerification(verifiedById, verifiedAt)` if the implemented queries need them. Existing foreign keys and ticket-code uniqueness already cover most reads.

Do not add dashboard, analytics, revenue-summary, attendee, gate, notification, or settlement tables. Calculate summaries from existing records.

Use an additive migration. Existing organization contact email can fall back to the account email until explicitly saved; do not fabricate bank details or financial history. Review migration SQL, regenerate Prisma, and apply first to the dedicated test database after verifying its identity. No database changes are part of this planning task.

**2. Establish one organizer API boundary**

Mount a router factory under `/api/v1/organizer` in [app.ts](../../src/app.ts), following the existing authenticated router pattern.

- Use [requireRoles](../../src/lib/authorization.ts) with exactly `ORGANIZER`. Reuse its current session/account eligibility checks and the existing organization approval gate. Administrators retain their separate admin endpoints.
- Resolve `OrganizerProfile` from the authenticated user. `Event.organizerId` references the profile ID, not the user ID. Never accept an organizer ID from the browser as the ownership authority.
- Scope every event, report, ticket, and scan lookup to that organization. Return 404 for another organization's event; return a generic invalid result for its ticket without exposing buyer details.
- Follow the existing Origin and JSON checks for writes, strict Zod field allowlists, and `Cache-Control: no-store`. Return `{ data: ... }` or `{ error: { code, message } }` consistently.
- Use the existing frontend API-origin/session transport with credentials. Replace the organizer helper's environment-variable mismatch and silent sample fallback. Failed requests must show an error/retry state; an empty database must show an empty state.

Keep the current route/controller/service structure. Small shared query/calculation helpers are sufficient; no repository layer, generic reporting engine, queues, Redis, or WebSockets.

**Proposed endpoints**

All paths below are relative to `/api/v1/organizer`.

| Method and path | Input | Result / existing UI |
| --- | --- | --- |
| `GET /dashboard` | None | Card metrics, managed events, recent sales |
| `GET /events` | Optional `search`, `status` | Own event cards; search title and venue case-insensitively |
| `GET /events/:id` | Event ID | Five editable fields, status, update timestamp |
| `POST /events` | Five form fields | New draft; return its ID |
| `PATCH /events/:id` | Changed form fields and `expectedUpdatedAt` | Saved event; reject stale edits with 409 |
| `GET /profile` | None | Public organization fields, real approval status, masked bank details |
| `PATCH /profile` | Organization fields and optional replacement bank details | Atomically saved profile; masked response |
| `POST /check-in` | `{ ticketCode }` | Validation result and successful entry summary |
| `GET /check-ins` | None | Latest 20 successful entries by this organizer account |
| `GET /analytics` | `from`, `to` dates | Cards and ticket-tier breakdown |
| `GET /analytics/export` | Same dates | Sales CSV using the same selection rules |

No event deletion, organizer publishing, ticket-tier mutation, withdrawal, or notification endpoints are required. For a school-sized event list, ordinary filtered reads are sufficient; do not silently truncate results or invent pagination controls.

**3. Connect the profile and event form**

Profile:

- Map `organizationName`, `contactEmail`, and frontend `bio` to the organization record. Contact email is public organization contact information; changing it must not change the login email.
- Render approval from `approvalStatus`. Do not persist a second verification status or let the profile form change approval. Keep application and decision history intact.
- Save bank name and account number together through Save Profile. Treat account numbers as strings to preserve leading zeroes. Store an authenticated-encryption envelope using Node's existing crypto capability and a server-only key, with only the last four digits separately available for display. Never return the full account number or write it to logs.
- Display the existing number masked. Omit the account-number property when unchanged; reject a mask submitted as a replacement. Require bank name and a valid bounded account-number string for a new/replacement account. Do not invent bank-specific verification rules or a bank connection status.
- Strictly validate all submitted fields and save atomically. Empty bank fields should not accidentally erase saved details; no separate removal workflow is needed.

Events:

- Proposed form contract: `title`, `category`, `startsAt`, `venueText`, `description`. Trim text, enforce bounded lengths, validate the dropdown values and date, and reject unknown fields.
- For Save as Draft, require a nonempty title; allow unfinished optional details. Repeated saves update the returned event ID. Disable the button while saving to avoid double submissions.
- Store title as `Event.name`, generate the unique slug server-side, and always create with `DRAFT`. The client cannot submit ownership, status, pricing, capacity, or revenue fields.
- Interpret the date picker in `Asia/Manila`; convert to UTC explicitly. Populate `eventDate` and `startTime` consistently with the existing readers. Return ISO timestamps and format them in the frontend. Preserve `endTime` and other fields not present in this form.
- The frontend has one free-text “Venue & City” input, while `Venue` requires name and address. Preserve the entered text rather than guessing how to split it: use the full input as `Venue.name`, with an empty address when no separate address exists. Reuse an unchanged linked venue; create a replacement venue record when this text changes, so editing one event cannot rename another event's shared venue. Do not build a venue-management feature.
- Prefill Edit/Manage with real data. Use `expectedUpdatedAt` to avoid silently overwriting concurrent changes. For non-draft events, require the basic details needed by the public reader; do not turn a valid public listing into an incomplete draft through a field edit. Status remains controlled by existing functionality.

**4. Implement real check-in using existing tickets**

The current checkout issues an `AVX-...` ticket code and stores its SHA-256 hash. The attendee QR contains that ticket code. Reuse this payload; the sample `TKT-9482` placeholder is not the real format. See [settle-checkout.ts](../../src/lib/settle-checkout.ts) and [ConfirmedETicket.tsx](../../../src/components/booking/ConfirmedETicket.tsx).

1. Camera decoding and manual entry both submit the same code. Camera access/decoding belongs in the frontend; do not upload video to the backend. Keep manual entry available if permission or decoding fails.
2. Hash the input and resolve the ticket with its booking, event, and organization. Validate ownership, confirmed booking, a paid payment, usable event status (`PUBLISHED` or `SOLD_OUT`), and ticket status. Never accept a cancelled/refunded booking or cancelled event.
3. In one transaction, coordinate with the existing booking/event locking conventions, conditionally change `VALID` to `USED`, set `usedAt`, and insert the successful `TicketVerification`. A simultaneous second scan must return `ALREADY_USED`; it must not admit twice. Re-read eligibility while holding the relevant locks so a refund/cancellation cannot race the admission.
4. Use existing results `VALID`, `ALREADY_USED`, `CANCELLED`, `EXPIRED`, and `INVALID`. A well-formed scan may return HTTP 200 with a non-valid business result; only `VALID` is a successful admission. Malformed input is 400; authentication/authorization errors retain their usual HTTP statuses. Store only a fingerprint in the verification log, not the raw code. Foreign/unknown tickets get `INVALID` without a linked foreign ticket or attendee details.
5. Populate the current stream with successful entries by `verifiedById`, including buyer name, tier, and scan time. Refresh immediately after a successful scan and poll about every 10 seconds while the scanner is visible. Stop polling on unmount or access rejection.

The UI has no event or gate selector. Therefore this scope validates tickets across the organizer's own eligible events and identifies the stream by organizer account. Change “at this gate” to “by your account”; do not imply physical-gate or selected-event enforcement. No offline check-in, gate management, undo, or staff accounts.

**5. Compute dashboard and analytics consistently**

Use one small set of query/calculation helpers for cards, event lists, reports, and exports. Money comes from stored booking-item/order amounts, never today's ticket prices. Sum with Prisma Decimal or integer centavos, then serialize consistently. Count each booking once even if it has multiple payment attempts.

Proposed definitions, made explicit because the current UI has only sample numbers:

| Display | Definition |
| --- | --- |
| Tickets sold | Sum quantities from currently confirmed bookings with a paid payment; exclude pending, expired, cancelled, and refunded bookings |
| Gross sales / event revenue | Sum stored booking-item subtotals for those bookings |
| Active events | Own `PUBLISHED` / `SOLD_OUT` events; distinct linked venues supply the venue count |
| Capacity | General admission uses `maxCapacity`; assigned seating uses enabled seat count, capped by `maxCapacity` when present, matching existing admin logic |
| Capacity percentage | Sold quantity divided by capacity for the same event set; return unavailable if capacity is unknown and zero safely for an empty set |
| Check-in rate | `USED` tickets divided by valid-or-used tickets for confirmed paid bookings in the active event set; return zero for no tickets |
| Recent sales | Latest 10 qualifying booking items, with buyer, event, tier, item subtotal, and payment time |
| Average order value | Sum qualifying booking totals divided by distinct qualifying bookings |
| Tickets per order | Qualifying item quantity divided by distinct qualifying bookings |
| Unique attendees card | Distinct purchasing `Booking.userId` values, with helper text “unique buyers”; individual guest identities are not collected |
| First-time buyers | Buyers whose first qualifying purchase across this organizer's events falls in the selected period, divided by unique buyers in that period |
| Tier performance | Selected-period quantity and item revenue per `TicketCategory.id`, with its current capacity; distinguish identical tier names using the existing event title |

Dashboard event/sales totals are lifetime totals; capacity and check-in describe the active event set. Label sales trend badges as current month-to-date versus the same elapsed portion of the previous month. Active-event change uses creations in those periods. Remove sample claims such as “On target” where no target exists.

Analytics and CSV select by successful payment time, not event date or booking creation time. Interpret `from` and `to` as inclusive Manila calendar dates, using an exclusive next-day boundary in UTC. Validate `from <= to`. Compare with the immediately preceding equal-length date range. Return a null change percentage when the prior amount is zero; show a neutral unavailable label rather than infinity.

The checkout currently records `fees: []` and sets total equal to subtotal. There is no persisted provider-fee or organizer-payout amount. **Do not reproduce the sample net-revenue deduction.** Return net revenue as unavailable with “Fees and payouts are not recorded” in the existing card until actual source data exists. Gross sales remains available. Similarly, remove the hardcoded “Net payout pending” claim. Adding fee accounting or settlement is outside this plan.

Reports are a current view of confirmed paid sales; subsequently refunded bookings are excluded. This is not a historical financial ledger. Preserve test-payment labeling when reporting the existing PayMongo test data; do not describe it as settled money.

Export a straightforward CSV with payment date, booking reference, event title, ticket tier, quantity, unit price, and item subtotal. Use the exact analytics filter/ownership rules, quote cells correctly, and neutralize spreadsheet formula prefixes in user-entered text. No PDF reports, scheduled exports, or extra charts.

**6. Delivery order and verification**

| Phase | Deliverable | Focused checks |
| --- | --- | --- |
| 1 | Authenticated organizer router and organization profile persistence, minimal migration | Exact role, approval/account gates, ownership, rejected unknown fields, masked bank responses, contact email leaves login email unchanged |
| 2 | Event list/search/status filter, draft saving, existing Edit/Manage/Public View actions | Saved data survives reload; valid categories/date conversion; draft is not public; shared venue is not mutated; stale edits rejected |
| 3 | Manual check-in, real scan log, camera wiring | Unknown/foreign/cancelled/refunded/used tickets; concurrent scans admit once; QR and manual payloads match |
| 4 | Dashboard, analytics, CSV | Totals agree across views; payment attempts do not duplicate sales; date boundaries, refunds, zero/unknown capacity, same-name tiers, CSV filtering/escaping |
| 5 | Replace sample data and verify all six screens together | Empty/loading/error states, expired sessions, failed saves, account switching, polling cleanup, unsupported buttons remain honest |

Use the existing backend test setup and dedicated test database. After each code slice, run backend typechecking and relevant Vitest tests. Extend frontend interaction coverage for the connected flows; update [organizer-frontend.test.mjs](../../../tests/organizer-frontend.test.mjs), which currently expects a preview banner. Run the frontend build and focused checks after integration. Do not remove the global preview warning until connected screens no longer render sample business data; retain local unavailable explanations for missing frontend steps and unsupported financial figures.

The plan is complete when the six existing screens have documented data sources and API behavior, and implementation is complete when the supported controls persist/read real organizer-owned data with the checks above passing. The ticket-tier continuation, publishing journey, actual payouts, and fee-based net revenue remain explicitly unavailable because their required forms or source records do not currently exist.

Related existing requirements: [account identity glossary](../../GLOSSARY.md), [fixed account roles](../adr/0001-fixed-account-roles.md), and [Phase 1 authentication](../../documents/phases/phase-1-authentication.md). Preserve those established account rules while connecting this organizer workspace.
