> Latest ticket-selection follow-up: see TICKET-SELECTION-UPDATE.md. The report below describes the preceding integration baseline.

# Aventix — Abrigo integration report

## 1. Implementation summary

The expanded Abrigo frontend is now integrated into the actual uploaded `aventix-development (2).zip`, on its existing `public-pages` working tree. The uploaded frontend matched the earlier public review package byte for byte. This delivery preserves that public/auth work and adds ticket quantities, mandatory numbered-seat selection, booking summary, payment/status and confirmation UI, session/logout navigation, and accessible search/filter controls. It extends the existing Next.js application.

Public routes include landing, events, event details, About, Contact, Login, account choice, attendee registration, disabled organizer preview, forgot/reset password and unauthenticated ticket entry. Booking routes use shared authentication and service adapters. No Sherwin dashboard/profile/My Tickets/history, Mary organizer management, or Shai administrator pages were implemented.

## 2. Exact files changed

The following inventory is relative to the uploaded ZIP, not Git HEAD. The upload already contained uncommitted frontend and backend changes; those were preserved. `review/team-upload-changes.patch` applies only this delivery's changes. `review/team-file-changes.json` records paths and hashes.

| Status | Path |
| --- | --- |
| Added | `ABRIGO-HANDOFF.md` |
| Added | `FIGMA-TRACEABILITY.md` |
| Added | `src/app/bookings/[bookingId]/confirmation/page.tsx` |
| Added | `src/app/bookings/[bookingId]/payment/page.tsx` |
| Added | `src/app/bookings/[bookingId]/summary/page.tsx` |
| Modified | `src/app/events/[id]/page.tsx` |
| Added | `src/app/events/[id]/seats/page.tsx` |
| Modified | `src/app/events/[id]/tickets/page.tsx` |
| Modified | `src/app/events/page.tsx` |
| Modified | `src/components/Navbar.tsx` |
| Added | `src/components/auth/AccountMenu.tsx` |
| Added | `src/components/auth/useAccountSession.ts` |
| Added | `src/components/booking/BookingPrimitives.tsx` |
| Added | `src/components/booking/BookingRecordView.tsx` |
| Added | `src/components/booking/SeatSelection.tsx` |
| Added | `src/components/booking/TicketSelection.tsx` |
| Added | `src/components/events/EventSearchField.tsx` |
| Modified | `src/components/events/EventsBrowser.tsx` |
| Added | `src/components/events/FilterSelect.tsx` |
| Modified | `src/components/layout/PageShell.tsx` |
| Modified | `src/lib/auth/client.ts` |
| Modified | `src/lib/auth/destination.ts` |
| Added | `src/lib/booking/client.ts` |
| Added | `src/lib/booking/draft.ts` |
| Added | `src/lib/booking/format.ts` |
| Added | `src/lib/booking/rules.ts` |
| Added | `src/lib/booking/types.ts` |
| Added | `src/lib/booking/validate.ts` |
| Modified | `src/lib/format.ts` |
| Added | `tests/booking-frontend.test.mjs` |
| Added | `tests/load-typescript.mjs` |
| Modified | `tests/public-frontend.test.mjs` |
| Added | `TEAM-INTEGRATION-REPORT.md` |

## 3. Figma fidelity

All 72 references were inspected and mapped in `FIGMA-TRACEABILITY.md`; these include sections, hover/overlay states and five attendee references assigned to Sherwin, rather than 72 independent pages. Existing public styling and image assets were preserved. Exact unavailable Figma backgrounds/collage/illustrations and some artwork remain missing: asset downloads returned HTML instead of image bytes. Static prototype payment QR codes were not represented as real payment instructions. No browser pixel-fidelity sign-off is claimed.

## 4. Interaction status

Public navigation, local event search/filtering, field validation, password visibility, safe return destinations, recovery UI, and accessible custom controls are implemented. Contact opens the user's email application and does not claim delivery. Organizer onboarding remains explicitly unavailable; there is no role self-assignment.

Authenticated booking views validate quantities, cumulative limits and exact numbered seats, handle conflicts, preserve event identity and the original server expiry, guard duplicate/uncertain mutations, and display only service-confirmed payment/booking status. Back does not cancel; unpaid cancellation is explicit. Confirmation requires actual paid+confirmed status and a non-cancelled event. Ticket links must come from the service.

The default auth and booking adapters are disconnected. These views do not create accounts, reserve seats, take payment or issue tickets without backend integration. Existing public event fetch behavior is retained; unconfigured discovery uses explicitly labeled sample data. Production configured API failures do not become sample success.

## 5. Backend dependencies — Moyamoy

The uploaded backend was inspected read-only. It contains nine starter files: empty domain module classes, commented bootstrap and schema model placeholders. There are no implemented controllers, services, DTOs, recovery/session client or usable booking/payment endpoints to wire. The existing Prisma status enum alone is not an HTTP contract.

Supply agreed session/login/logout/attendee registration/recovery contracts, session persistence and password policy; event response mapping; numbered-seat inventory and cumulative limits; atomic/idempotent booking creation; owner-authorized retrieval/cancellation; authoritative server timestamps/expiry; payment methods/trusted origins/instructions and booking-level status; event-cancellation/refund semantics; and issued-ticket destinations. Map these into `src/lib/auth/client.ts` and `src/lib/booking/client.ts`. Their types are frontend view models, not imposed backend contracts. Confirm organizer onboarding, legal text, fees and remaining PDF policy proposals with the team. No endpoints or backend policies were invented.

## 6. Verification

- `npm run build`: passed on this integrated project, including TypeScript and production route generation.
- `npm run lint`: passed, zero errors/warnings.
- `node --test tests/*.test.mjs`: 17 passed.
- DOM interaction harness: 16 auth/public and 12 booking checks passed using injected test adapters, not live services.
- Production HTTP checks: 20 public/booking/auth URLs returned expected headings/main content without placeholder anchors; unknown-event fallback also checked. Streaming unknown-event response was HTTP 200, not a claimed 404.
- Backend/planning/config/dependency preservation: every supplied protected file verified byte for byte; no backend edits.
- Browser rendering/responsiveness/native focus and real backend end-to-end/concurrency/payment checks: not completed. Chromium download was unavailable. Test adapters do not prove live authorization, atomic reservations or provider behavior.

The initial dependency symlink build failed because Turbopack disallows an out-of-root node_modules symlink. Repeating with physical local dependencies passed without source/config changes. The dependency manifest/lockfile are unchanged.

## 7. Git impact

Existing branch: `public-pages`. The upload already had numerous tracked modifications and untracked public files, including backend changes. They were not reset, staged, committed, pushed or attributed to this work. Use the ZIP-relative patch/inventory to distinguish this delivery from that pre-existing work. No automatic push, merge or PR was performed.

Shared overlap: Navbar, PageShell, EventsBrowser, Events and Event Details routes, auth adapter/destination helper, price formatter and ticket entry route. New booking code stays in dedicated routes/components/lib folders. Global CSS, root layout, package files, configuration, original image bytes, backend and team planning files remain unchanged from this upload. Review overlap against the current remote base before applying; zero merge conflicts cannot be guaranteed. Do not stage the entire pre-existing dirty tree.

## 8. Remaining work

Connect and verify Moyamoy's real services once implemented; obtain missing Figma exports; perform desktop/tablet/mobile browser review; approve outstanding onboarding/payment/legal policies; complete reviewer acceptance and the team's normal branch/PR process. The frontend is reviewable, but all assigned acceptance criteria cannot honestly be marked complete while these dependencies remain unresolved.

The ZIP preserves project structure and backend source, excluding Git history, dependencies/build outputs, environment files/secrets and generated caches. `ABRIGO-HANDOFF.md` and `FRONTEND-HANDOFF.md` are historical phase reports; this report is authoritative for the uploaded-project integration.
