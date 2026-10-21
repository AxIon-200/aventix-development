# S01 workspace protection — #109

Implements [#109](https://github.com/AxIon-200/aventix-development/issues/109)
against the approved [S01 specification](s01-attendee-authentication-spec.md).
Account eligibility and fixed roles remain governed by the
[Phase 1 requirements](../../documents/phases/phase-1-authentication.md) and
[integration contract](phase-1-integration-contract.md).

## Page and account boundaries

Every attendee, organizer, and administrator page invokes `WorkspacePage`.
This includes workspace indexes, deeply nested organizer event creation,
event ticket/seat entry points, and booking summary/payment/confirmation.
Each request forwards its own cookie to the configured Express `/api/v1/me`
with no shared identity cache. Missing authentication redirects to login;
only the existing validated event/booking return allowlist is preserved.

`WorkspaceScreen` checks the exact account role during server rendering and
again against the shared live browser account. Wrong roles receive denial and
a link to their own workspace, without automatic logout. Unknown account state,
eligibility failures, malformed profiles, and outages expose no workspace
content. Browser refresh on navigation, focus, and cross-tab hints continues
through the existing account session integration. Missing browser authentication
redirects to login; eligibility gates preserve their distinct existing actions.
An outage offers an explicit retry, and an uncertain logout offers retry sign-out.

Workspace snapshots are bound to the current pathname and query. The first
client render of a new route returns a checking state before the navigation
effect runs, rather than using the previous route's eligible account. A browser
MutationObserver regression reproduced the stale authorized render before this
fix and passes after it. Explicit logout suppresses the workspace's automatic
login redirect while the shared sign-out button navigates home; failed logout
restores normal access handling.

The installed Next.js authentication guide was read, including its warning that
layouts neither rerun on every navigation nor prevent child execution/RSC
serialization. Authorization lives at each page rather than its layout. These
pages load no business data and expose only real current identity, public
navigation, logout, and honest unavailable content. Future business data access
must independently enforce current eligibility, exact roles, and ownership in
Express before exposing operations.

Personal sample dashboards, tickets, payment/booking confirmations, statistics,
and mutation controls are disconnected from every protected route. The shared
role-demo switchers are removed, and the legacy `useRole` UI hook now reads the
current account instead of inferring an identity from the URL. The development
booking preview entry also requires attendee authentication and shows the
unavailable screen; it remains absent in production. Public browsing fixtures
retain their existing later-integration boundary and do not supply inventory.

## Backend boundary

Unfinished attendee, organizer, and administrator business routers are unmounted.
Their stub handlers and historical hierarchical role middleware are not exposed
as finished business APIs. The existing `/me` and account lifecycle APIs retain
Express/Better Auth authorization. Authorization demonstration endpoints remain
test-only. The HTTP regression checks guests and all three real account roles
against the former business endpoints and expects unavailability for each.

## Verification

Tests use the already approved public application HTTP seam. The browser suite
starts an isolated production Next build with a synthetic HTTP account service
and real headless Chrome. It asserts direct server responses, all workspace
pages, all nine exact role pairings, client-router navigation, safe returns,
account gates/outages, stale responses, and absence of personal sample content.
Its synthetic HTTP-only cookie establishes frontend behavior, not database
session validity. Existing backend authorization and session suites supply that
separate proof through real Better Auth/Prisma and the guarded dedicated test
database. Environment identity and development/test separation checks remain
unchanged.

Verified on 2026-10-21:

| Check | Result |
| --- | --- |
| `node --test tests/*.test.mjs` | 45 passed, none skipped |
| Isolated `next build --webpack`, inside browser suite | Passed |
| Frontend `npx tsc --noEmit` | Passed |
| Backend `npm run typecheck` | Passed |
| Scoped ESLint and Git whitespace checks | Passed |
| Backend `npx vitest run test/authorization.test.ts` | 9 passed |
| Backend full `npm test` | 256 passed across 12 files on the final run |

The first full backend run passed 254 tests and failed two unchanged password
recovery tests with HTTP 500 instead of 200. Both passed when rerun together
with `npx vitest run test/password-recovery.test.ts -t 'revokes every session|fixed read-only'`.
The second full run passed all 256 tests across 12 files; neither failure
recurred. These runs do not establish the cause of the initial HTTP 500s.

The full frontend run requires network access for the unchanged Google Fonts
used by the root layout. Its first sandboxed attempt was blocked downloading
fonts; rerunning with network access passed. Browser checks wait for hydration's
current-account check before asserting final direct-navigation screens.

## Standards

Independent review against task-start commit
`11ce7a8a1ee131c091b6a146e1323d0cf3aa2884` found no documented-standard
violations or actionable baseline smells. Thin page wrappers follow the
installed Next.js authentication guide. Route-aware snapshots remain owned by
the shared account-session module, and logout callbacks address the observed
redirect race without speculative abstraction.

## Spec

Independent review found one stale-navigation issue, then confirmed its fix:
the new page now blocks the previous route's cached account before navigation
effects run. A browser regression was observed failing before the change and
passing after it. Explicit logout preserves its home destination; expiry and
revocation still lead to login. No remaining missing requirements, incorrect
implementation, or scope creep was found.

Review totals: Standards 0 findings; Spec 0 remaining findings (1 fixed).

No real-user activation, genuine legal acceptance, mail delivery, production
deployment, or completion of later business slices is claimed. Verification,
consent, and recovery forms retain their separate S01 ticket boundaries.
