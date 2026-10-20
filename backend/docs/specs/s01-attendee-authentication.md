# S01 attendee authentication integration

Implementation specification: [S01 attendee authentication spec](s01-attendee-authentication-spec.md).
The specification is being prepared for a new GitHub issue; this design record
retains the confirmed planning decisions below.

Status: planning confirmed; interview complete on 2026-10-21.
This document records frontend integration and
slice-boundary decisions for [S01 in the project plan](../../../project-plan.md).
It does not authorize application implementation, configuration changes,
database operations, or publication.

The [Phase 1 requirements](../../documents/phases/phase-1-authentication.md),
[backend integration contract](phase-1-integration-contract.md), and
[fixed account roles decision](../adr/0001-fixed-account-roles.md) retain
authority over account policy and backend operation contracts. Frontend
completion destinations below extend the backend-only landing arrangement;
they do not change token validation, session issuance, or callback restrictions.

## Confirmed decisions

The user accepted recommendations Q1-Q4 in the first round, Q5-Q11 in the
second round, and Q12-Q19 in the third round on 2026-10-21. The resulting design
tree has no remaining product-decision frontier; implementation checks and
real-user activation evidence remain separate work.

The user then explicitly confirmed the consolidated understanding and closed
the planning interview on 2026-10-21. This confirms the full synthesis below;
it does not authorize implementation or publication.

1. New verification emails open the fixed frontend `/verify-email` page with
   the token in the URL fragment. The attendee explicitly submits the token
   and current password; successful verification leads to a separate login.
   Request-supplied callback URLs remain forbidden.
2. Move recovery-request and password-reset frontend integration into S01 so
   the mandatory legacy credential transition has a usable completion path.
   Profile editing and authenticated password changes remain in S02.
3. Browser requests for both `/api/auth` and `/api/v1` use the frontend origin.
   Server-rendered account checks explicitly forward the requesting session
   cookie to Express. Document one transport convention, preserve Express
   origin checks, and verify cookies in the real browser flow. Exact proxy/IP
   handling remains an implementation prerequisite; same-origin transport does
   not itself establish a trusted proxy arrangement.
4. Ordinary attendee login lands on `/events` until the dashboard is integrated.
   An allowed booking return destination takes precedence. Account navigation
   derives from `/api/v1/me`; unfinished workspace content shows an unavailable
   state instead of presenting sample records as the signed-in user's data.
5. New password-reset emails open the fixed frontend
   `/reset-password#token=...` destination. Existing backend verification/reset
   landing pages offer an explicit Continue action to the corresponding fixed
   frontend page, carrying the fragment in the browser. Opening or continuing
   from a link does not consume it or complete the operation. This extends the
   original read-only text landing pages; no arbitrary redirect is introduced.
6. Preserve validated `returnTo` values through the original browser flow.
   A fresh email tab/device has no promised booking context and falls back to
   `/events` after attendee login. Authentication emails do not carry booking
   destinations, and S01 does not restore booking drafts across devices.
7. On `TERMS_VERSION_OUTDATED`, fetch the current document/version, clear the
   acceptance checkbox, preserve nonsensitive fields, and require renewed
   explicit acceptance. Never automatically accept or retry registration.
8. `TERMS_ACCEPTANCE_REQUIRED` leads to a dedicated current-terms acceptance
   page. Prefill email where available, require the current password again,
   never carry passwords between pages, and require separate login after
   successful acceptance.
9. Missing/expired authentication leads to login. A wrong-role session gets
   an access-denied page with a link to its permitted area, without automatic
   logout. Backend unavailability gets a retryable unavailable state; it does
   not grant access or misreport credential expiry.
10. Functional integration of event, booking, and administrative business APIs
    remains in their later slices. S01 establishes authentication/profile API
    integration and protection of all three workspaces. Unfinished business
    operations stay unavailable; later slices must connect live account checks,
    explicit role permissions, and ownership before exposing their operations.
11. Invalid/expired/used links share one recovery screen, consistent with the
    backend's common error. A lost submission response shows that completion
    could not be confirmed; it does not claim success or automatically resubmit.
    Offer explicit login, another-link, or password-recovery actions as relevant.
    An incorrect verification password leaves the form and valid link usable.
12. Verification/reset pages read the token into memory and immediately remove
    the fragment from browser history. Never persist the token in browser
    storage. Explain that reloading requires reopening the email link. Existing
    backend landing-page bridges use the same rule: capture and strip the
    fragment, then construct the fixed frontend fragment from memory only when
    Continue is selected.
13. Login/registration pages show an already-signed-in eligible account with
    options to continue or explicitly sign out before using another account.
    Verification/reset pages remain usable while signed in. Opening an email
    never silently switches identities. Successful reset follows the existing
    backend revocation contract and requires separate login.
14. Refresh account navigation on page navigation, focus, and cross-tab hints
    after login/logout/reset, without continuous polling. Hints trigger a fresh
    `/me` check and never carry authoritative identity. Express checks current
    eligibility on every protected request. This is not a promise of immediate
    idle-tab updates for remote expiry or account disabling.
15. A confirmed logout response immediately clears account UI. A lost response
    triggers a `/me` read to reconcile the outcome. If reconciliation also
    fails, show that sign-out could not be confirmed and offer retry; do not
    claim logout succeeded or keep protected content usable.
16. Remove floating role switches and navigation role dropdowns from the
    connected application. Demonstration controls belong only in explicit
    development previews, which cannot bypass authentication. Real account
    navigation derives from `/me`.
17. Authorized users entering unfinished attendee, organizer, or administrator
    pages see an unavailable screen with real account identity, public
    navigation, and logout. Do not show sample statistics, tickets, payments,
    or working-looking mutation controls. Later slices replace these screens
    as their functionality becomes available.
18. If current terms cannot be loaded, disable registration and legacy
    acceptance with a retry action. Login, verification, recovery, and logout
    remain independently available. Acceptance links to the document returned
    by the terms endpoint; unpublished legal pages are not substitutes.
19. Technical completion requires updated frontend tests, passing backend
    authentication tests on the dedicated test database, frontend type/build
    checks, and an actual localhost browser walkthrough of cookies and
    protected-page access. Report real-user activation separately as pending
    until genuine terms and real delivery are verified. Controlled test mail
    proves integration behavior, not actual delivery.

## Flow and scope

| Branch | Confirmed outcome |
| --- | --- |
| New attendee | Current terms and explicit acceptance -> registration without a session -> verification link plus current password -> separate login -> allowed booking return or `/events` |
| Email delivery failure after creation | Account and consent persist; explain the failure and offer resend instead of duplicate registration |
| Existing account | Follow server gate order and offer verification, dedicated consent, or recovery as required; never fabricate missing history |
| Legacy credential recovery | Reset into the approved credential format; reopen a still-valid verification email if needed and use the new password; complete missing consent and then log in |
| Existing email link | Read-only backend landing page -> explicit fixed frontend Continue action -> explicit completion submission |
| Session | Same-origin browser APIs and explicit server cookie forwarding -> `/me` -> real account navigation and protected page/data checks -> confirmed logout or explicit uncertainty |
| Workspace | Check current eligibility and exact role -> functional content from a completed slice or an unavailable screen |
| Completion | Automated and browser evidence for technical integration; genuine terms and real delivery for activation |

Recovery request/reset integration belongs to S01. Profile editing and
authenticated password changes belong to S02. Event, booking, ticket, organizer,
and administrative business features retain their later slice boundaries.

The existing account gate order remains disabled, email verification, missing
consent, and legacy password transition. Verification and consent can themselves
require password recovery before mutation. Present these existing server
outcomes without inventing a different frontend policy.

Successful reset revokes all sessions belonging to the reset account and clears
this browser's authentication cookie. If that cookie belongs to another account,
the browser is signed out of that account too; its other device sessions are not
revoked by this reset. Explain browser sign-out and refresh account navigation.
Verification and consent never sign the user in or switch the current identity.

Public event fixtures remain governed by the later event-integration slice;
they must not be represented as live backend inventory. S01's unavailable-screen
decision removes personal sample records and simulated actions from connected
account workspaces without claiming public event integration is complete.

Use the [account glossary](../../GLOSSARY.md) to distinguish the three identity
kinds. Their fixed-role policy remains in the existing requirements and ADR.

## Verification evidence required for implementation

No application tests, browser walkthrough, migrations, database operations, or
provider delivery were performed during this interview. The checks below are
requirements for subsequent implementation, not passing results.

| Boundary | Required evidence |
| --- | --- |
| Frontend adapter | Exact approved paths/payloads/envelopes, safe errors, no native-route bypasses, exact password handling, optional phone, genuine terms version, registration with no session, and ambiguous response handling |
| Backend authentication HTTP | Existing lifecycle tests on the guarded dedicated database, including verification nonconsumption after wrong password, reset/session invalidation, legacy consent/transition, cooldown/privacy, role allowlists, and logout idempotence |
| Frontend static checks | Typechecking and production build; transport-mocked tests alone do not typecheck source or establish browser behavior |
| Actual localhost browser | New and old email links, fragment removal/reopen behavior, verification then separate login, recovery/consent, persistent cookie on reload, navigation and cross-tab refresh, logout/reconciliation, direct and client-navigated workspace denial, and truthful unavailable states |
| Activation | Genuine owner-reviewed terms and reachable document/version, configured real delivery and delivery smoke evidence; retain approved restricted-mailbox limits until general sending is verified |

Implementation must establish the concrete frontend/API proxy behavior, cookie
forwarding, mutation Origin preservation, and meaningful IP throttling for the
local topology. Do not infer production trusted-proxy settings from localhost
or trust arbitrary forwarded headers. A mismatch with the approved behavior
requires resolution before activation rather than weakening the contract.

## Existing constraints

- Localhost-first scope and genuine-terms/email activation gates remain as
  previously approved. Technical integration does not establish readiness for
  real-user registration or public deployment.
- Registration and email verification issue no session; login is separate.
- Session lifetime, exact password handling, optional Philippine phone format,
  current terms acceptance, fixed roles, cooldowns, and error privacy follow
  the existing authoritative documents without reopening those decisions.
- The installed Next.js authentication guide warns that layouts do not rerender
  on every navigation and do not prevent nested route segments from rendering.
  Workspace protection therefore needs checks at protected page/data boundaries,
  in addition to layout navigation and Express authorization. Per-account reads
  must not share cached identity between requests.
- All nineteen recommendations and the consolidated understanding are
  confirmed. The interview is complete; implementation and publication remain
  separately authorized work.
