# S01 — Attendee authentication integration

Status: ticket breakdown and public HTTP test seam approved on 2026-10-21;
eight GitHub tickets published with native blocking relationships under
[S01 parent #115](https://github.com/AxIon-200/aventix-development/issues/115).
Source decisions: confirmed on 2026-10-21. This specification synthesizes those
decisions for a new GitHub issue; it does not start application implementation.

## Problem Statement

An attendee cannot reliably complete the account journey through the existing
frontend. Its adapter calls obsolete native authentication routes, expects raw
Better Auth responses, and can imply automatic sign-in after registration.
Current terms, password-gated email verification, legacy consent, and password
recovery are not connected to the approved backend contract. Navigation and
workspace content can suggest an authenticated identity or show personal sample
records without a current, eligible session.

Attendees need a working localhost account journey that preserves their actual
identity and booking destination, explains required account steps, and tells
them truthfully when a request or the account service cannot be confirmed.

## Solution

Connect the existing account screens and navigation to Aventix's approved
authentication and current-account APIs. A new attendee explicitly accepts
current terms, registers without a session, verifies their email with the link
and current password, and logs in separately. Existing accounts can complete
missing consent and mandatory credential recovery through usable frontend
flows. Recovery request and reset belong to S01; profile editing and
authenticated password change remain in S02.

Use the real current account for navigation and protect attendee, organizer,
and administrator workspaces at their page/data boundaries. Eligible accounts
see an honest unavailable screen wherever later business slices are unfinished.
Demonstrate technical integration locally, while retaining separate activation
gates for genuine terms, actual email delivery, and public deployment.

## User Stories

1. As a visitor, I want to open attendee registration from the existing account choices, so that I can create the appropriate identity for attending music events.
2. As a new attendee, I want to register with my first name, last name, email, password, and optional Philippine mobile number, so that I can supply the approved account details without unnecessary fields.
3. As an attendee, I want clear validation that accepts Unicode names and exact passwords with spaces, so that the frontend does not silently change my credentials or reject supported input.
4. As a new attendee, I want to read the current terms document and explicitly accept its version, so that my consent relates to the document I was shown.
5. As a new attendee, I want registration to pause with a retry action when current terms are unavailable, so that I am never asked to accept an unpublished substitute.
6. As a new attendee, I want changed terms to be shown again with acceptance cleared, so that I can make a fresh decision before submitting.
7. As a new attendee, I want successful registration to explain verification and separate login, so that I understand why account creation has not signed me in.
8. As a new attendee whose initial verification email failed, I want to know that my account exists and request resend, so that I do not repeatedly register it.
9. As an account holder using an already-registered email, I want a conflict with login and recovery options, so that I can continue without changing the existing account.
10. As an unverified attendee, I want new verification emails to open a dedicated frontend completion page, so that I can verify without constructing an API request.
11. As an email owner, I want verification to require my current password and explicit submission, so that opening or previewing the email alone cannot verify the account.
12. As an attendee who enters the wrong verification password, I want to correct it using the same still-valid link, so that a typing error does not force another email.
13. As an unverified attendee, I want an explicit resend action with a privacy-preserving response, so that I can request another link without exposing account state.
14. As an account holder opening an invalid, expired, or already-used link, I want one clear recovery screen with relevant next actions, so that I can continue without guessing why the link failed.
15. As an account holder opening a previously issued backend email link, I want an explicit Continue action to the fixed frontend page, so that existing links remain usable without completing anything automatically.
16. As an account holder using a completion link, I want the token removed from the visible URL and kept only for that page session, so that it is not retained in browser storage or navigation history.
17. As an account holder who reloads a completion page, I want instructions to reopen the email link, so that I understand why the token is no longer available.
18. As a verified, eligible attendee, I want to sign in with my email and exact password, so that I can use my attendee account.
19. As an attendee signing in normally, I want to land on the events page, so that I can continue using available functionality while my dashboard is unfinished.
20. As an attendee returning from a booking flow, I want a validated internal return destination preserved through the original browser flow, so that I can resume where supported.
21. As an attendee opening an email in another tab or device, I want a usable default destination without a promise of restored booking context, so that the flow remains understandable.
22. As an account holder with missing legacy consent, I want a dedicated page showing current terms and requiring my current password again, so that genuine consent can be recorded before separate login.
23. As an account holder with legacy credentials, I want a working password-recovery path when the server requires a reset, so that I can complete the mandatory transition without losing my identity.
24. As an account holder who forgot a password, I want to request a reset through the existing recovery form, so that I can regain access without knowing the old password.
25. As an account holder requesting recovery, I want the same generic response for all validly formatted addresses, so that recovery does not disclose another account's existence or eligibility.
26. As a holder of a reset link, I want to enter a valid new password and explicitly submit it, so that I can replace my credential without a misleading token preflight.
27. As an account holder resetting a password, I want reuse rejected with an actionable message, so that I can choose a genuinely different credential.
28. As an account holder who completed a reset, I want all sessions for that account revoked and separate login required, so that previously authenticated devices lose access.
29. As an unverified or disabled account holder using recovery, I want reset to preserve those account restrictions, so that recovery cannot grant access I do not have.
30. As an unverified account holder who has reset a password, I want a still-valid verification link to work with the new password, so that recovery does not strand verification.
31. As an account holder already signed in, I want login and registration to show my current account with Continue and explicit sign-out options, so that I do not accidentally switch identities.
32. As an account holder already signed in and opening verification or reset, I want the completion page to remain usable with its sign-out effects explained, so that I can understand which account operation I am performing.
33. As a signed-in account holder, I want account navigation derived from the current server profile, so that the interface reflects my real identity and permitted workspace.
34. As a signed-in account holder, I want a persistent session across reload and browser reopening within its fixed lifetime, so that I can resume without a misleading remember-me option.
35. As an account holder, I want navigation refreshed on navigation, focus, and cross-tab account changes, so that stale browser state does not remain authoritative.
36. As an account holder whose session expired or was revoked, I want protected pages to direct me to login, so that I can authenticate again before proceeding.
37. As an attendee, organizer, or administrator opening another role's workspace, I want access denied with a link to my permitted area, so that my account is neither silently signed out nor granted another role.
38. As an account holder whose account is disabled or otherwise ineligible, I want the server's current restriction enforced on protected access, so that a previous session cannot bypass account policy.
39. As an eligible account holder opening an unfinished workspace page, I want real account identity and an unavailable screen with public navigation and logout, so that sample records are not presented as mine.
40. As an account holder, I want role-demo switches absent from the connected application, so that changing a URL or UI control cannot imply another identity or permission.
41. As an account holder facing an account-service outage, I want a retryable unavailable state, so that an outage neither grants access nor falsely reports invalid credentials.
42. As an account holder, I want confirmed logout to immediately clear account UI and invalidate this session, so that I can end access on this browser while other devices remain signed in.
43. As an account holder whose logout response was lost, I want the application to check my current account and report uncertainty if that also fails, so that it does not claim an unconfirmed sign-out succeeded.
44. As an account holder whose verification, consent, registration, or reset response was lost, I want honest uncertainty and explicit next actions without automatic resubmission, so that a potentially completed operation is not blindly repeated.
45. As an account holder making repeated requests, I want clear throttling guidance consistent with server cooldowns, so that I can retry without permanent account lockout or privacy leaks.
46. As a project owner, I want technical acceptance evidence separated from genuine terms and delivery evidence, so that a passing fixture-based demonstration is not mistaken for real-user activation.

## Implementation Decisions

- **Reuse the authentication system.** Keep Better Auth credentials and sessions,
  the shared User identity, Prisma persistence, and the existing Aventix lifecycle
  boundary. Reuse the existing account, session, purpose-bound link, cooldown,
  rate-limit, and consent records. No new identity/session system or planned
  schema change is needed for this integration. Verify the installed backend
  contract rather than rebuilding already implemented lifecycle behavior.
- **Frontend modules.** Extend the existing public authentication client,
  validation/error mapping, account-session UI, account menu, completion forms,
  safe-return handling, and workspace page/data access checks. Remove obsolete
  assumptions from their consumers and tests. Preserve public browsing while
  connected private workspaces expose only completed functionality.
- **Approved HTTP surface.** All operations use the existing Aventix-owned
  contracts below. Successful JSON is wrapped in `data`; failures contain
  `error` with stable `code`, safe `message`, and optional safe field errors.
  Session credentials travel only in cookies. Do not reopen native Better Auth
  routes or request raw session/token results.

  | Operation | Method and path | Submitted fields | Confirmed success |
  | --- | --- | --- | --- |
  | Current terms | GET `/api/v1/terms` | None | 200; version and document URL |
  | Registration | POST `/api/auth/register` | firstName, lastName, email, password, optional phoneNumber, termsAccepted, termsVersion | 201; verificationRequired; no new session |
  | Verification | POST `/api/auth/verify-email` | token, currentPassword | 200; emailVerified; no new session |
  | Verification resend | POST `/api/auth/resend-verification` | email | 200; approved generic message |
  | Login | POST `/api/auth/login` | email, password | 200; permitted user profile and session cookie |
  | Current account | GET `/api/v1/me` | None; requesting session cookie | 200; permitted user profile |
  | Legacy consent | POST `/api/auth/accept-terms` | email, currentPassword, termsAccepted, termsVersion | 200; termsAccepted; no new session |
  | Recovery request | POST `/api/auth/request-password-reset` | email | 200; approved generic message |
  | Reset | POST `/api/auth/reset-password` | token, newPassword | 200; passwordReset; no replacement session; browser cookie cleared |
  | Logout | POST `/api/auth/logout` | No fields; optional session cookie | 200; loggedOut; requesting session invalidated and cookie cleared |

- **Input and credential handling.** Match authoritative backend validation:
  trim names to 1–100 Unicode code points, normalize email by trimming and
  lowercasing without provider alias rules, and accept passwords of 15–128
  Unicode code points without trimming, normalization, truncation, or
  composition rules. Validate optional phone against the approved Philippine
  mobile contract and omit an empty registration phone. Do not submit derived
  name, confirmation, role, status, verification state, callback URLs, or
  remember-me fields. Do not pass passwords between pages or persist credentials.
- **Terms and registration.** Load the current version/document from the terms
  endpoint and require literal explicit acceptance. Unavailable terms disable
  registration and legacy acceptance with retry; login, verification, recovery,
  and logout remain independently available. On `TERMS_VERSION_OUTDATED`, fetch
  the current pair, show its document, clear acceptance, preserve nonsensitive
  form fields, and require renewed submission. Never automatically accept or
  retry. Unpublished legal pages are not substitutes. Registration and
  verification never create a session; completion leads to separate login.
- **Creation with failed delivery.** Treat `ACCOUNT_CREATED_EMAIL_FAILED` as
  an existing unverified account whose consent persists. Explain the delivery
  failure and offer resend, without reporting full registration failure or
  prompting duplicate creation. Duplicate registration does not modify an
  existing identity. Login itself never automatically sends verification mail.
- **Fixed email destinations.** New verification and reset mail uses the
  configured, fixed frontend `/verify-email` and `/reset-password` destinations
  with a `token` fragment. Extend the existing backend GET landing pages
  `/api/auth/verification` and `/api/auth/password-reset` with an explicit
  Continue action carrying the fragment to the corresponding fixed frontend
  page. Opening or continuing never completes verification/reset, consumes a
  token, or issues a session. Request-supplied destinations remain forbidden.
  Preserve no-store and no-referrer behavior and avoid external assets on
  token-handling bridge pages.
- **Token lifetime in the frontend.** Read completion tokens into memory and
  immediately strip fragments from browser history on both completion and
  bridge pages. Never store tokens in browser storage, query strings, logs,
  analytics, or server-rendered requests. A bridge constructs the fixed frontend
  fragment from memory only when Continue is selected. Explain that reloading
  requires reopening the original email. Do not add or simulate a reset-token
  preflight API: validity is checked by the server on explicit submission.
- **Link behavior and failures.** Preserve backend purpose binding and expiry:
  verification links last 24 hours and reset links 30 minutes. Resend does not
  revoke older links; successful verification invalidates outstanding
  verification links, and successful reset invalidates outstanding reset links.
  Wrong verification passwords do not consume valid links. Use one
  `LINK_INVALID_OR_EXPIRED` screen rather than inventing distinctions between
  invalid, expired, and consumed links. Keep wrong-password verification
  recoverable on the current form. A lost completion response shows uncertainty
  with explicit login, another-link, or recovery actions; do not automatically
  resubmit or claim completion.
- **Legacy gates.** Present server outcomes in their existing correct-credential
  order: disabled, unverified, missing consent, then legacy credential reset.
  `TERMS_ACCEPTANCE_REQUIRED` opens a dedicated current-terms page, prefilling
  email where available, requiring the current password again, and requiring
  separate login after acceptance. Verification and consent can themselves
  return `PASSWORD_RESET_REQUIRED` before mutation. Reuse recovery rather than
  fabricating consent/verification, silently upgrading credentials, or adding a
  restricted session. Genuine historical acceptance is not replaced merely
  because a newer terms version exists.
- **Recovery effects.** Reset rejects password reuse and preserves role, status,
  verification, and consent. It revokes every session of the reset account and
  clears this browser's authentication cookie, with no replacement session. A
  still-valid verification link survives reset and requires the new password.
  If the browser cookie belongs to another account, that browser is signed out
  too; that other account's device sessions are not revoked by this reset.
  Explain browser sign-out and refresh account navigation after success.
- **Browser and server transport.** Browser calls to both `/api/auth` and
  `/api/v1` use the frontend origin with credentialed, uncached requests.
  Server-rendered account checks forward the requesting session cookie
  explicitly to the configured Express origin. Use one documented transport
  convention; never derive a trusted API origin from arbitrary request headers.
  Preserve mutation Origin and JSON checks, exact trusted origins, cookie
  forwarding/clearing, and Better Auth middleware ordering. Never share a cached
  identity between requests or accept browser identity fields as authorization.
- **Local topology prerequisite.** Establish the concrete proxy behavior for
  frontend localhost port 3000 and API port 5000, including original mutation
  Origin preservation and meaningful IP throttling. The existing backend uses
  `trust proxy=false`; adding a frontend proxy does not prove trusted forwarded
  headers or per-client IP attribution. Verify the chosen arrangement and
  document any intentional local aggregation. Do not silently enable blanket
  proxy trust, accept spoofable client IP headers, or infer production settings
  from a localhost test. Resolve a contract conflict before activation.
- **Session and navigation.** Derive identity, display name, role-specific
  navigation, and attendee booking eligibility from the permitted `/me` profile.
  Reject malformed/unsupported profiles instead of fabricating identity. Keep
  the fixed seven-day persistent session without remember-me or activity-based
  renewal. Ordinary attendee login defaults to `/events`; an allowed booking
  return destination takes precedence only for an eligible attendee. Organizer
  and administrator accounts link to their own permitted workspaces; roles have
  no implicit hierarchy.
- **Return context.** Reuse the existing internal event/booking return allowlist
  and validate it at each use. Preserve validated `returnTo` through the
  original browser flow. Email links carry no booking destination; a fresh email
  tab/device has no promised booking context and defaults to `/events` after
  attendee login. Do not restore drafts across devices or imply a draft reserves
  inventory.
- **Already signed in.** Login and registration show the eligible current
  account, with Continue and explicit sign-out before using another account.
  Verification and reset remain usable while signed in. Opening mail never
  silently switches identities; verification/consent issue no session, and reset
  follows its explicit revocation contract.
- **Workspace protection.** Enforce current account eligibility and the exact
  permitted role at protected page/data entry points for attendee, organizer,
  and administrator workspaces, including direct requests and client navigation.
  Layout-only checks are insufficient in the installed Next.js version.
  Express remains authoritative for each protected API request; later business
  slices must add live account checks, explicit roles, and ownership before
  exposing their operations. Existing stub routers are not evidence of completed
  business authorization. Authorization demonstration routes remain test-only.
- **Access states.** Missing, expired, or revoked authentication leads to login.
  Current eligibility failures follow their approved recovery/gate outcomes.
  Wrong-role access shows denial and a link to the permitted area without
  automatic logout. Account-service errors show a retryable unavailable state
  and expose no protected content. Authorized users entering unfinished
  workspace pages see real identity, public navigation, logout, and unavailable
  content, with no sample personal records or working-looking mutations.
- **Refresh and logout.** Refresh account navigation on page navigation, focus,
  and cross-tab hints after login/logout/reset without continuous polling. Hints
  contain no authoritative identity and trigger a fresh `/me` read. Ignore stale
  responses that would restore outdated account UI. Confirmed logout immediately
  clears account UI. A lost logout response triggers `/me` reconciliation; if
  that also fails, show that sign-out could not be confirmed, offer retry, and
  keep protected content unavailable. No claim of immediate idle-tab updates
  for remote expiry or disabling is made.
- **Truthful errors and limits.** Preserve generic invalid-credential and
  recovery/resend responses, independent 60-second per-address cooldowns,
  IP-based throttling, safe field errors, and `Retry-After` guidance. Do not
  infer account state from a generic mail response or report an outage as
  expired authentication. Mutation transport failures remain potentially
  completed requests; offer explicit recovery/reconciliation rather than
  automatic retries. Never expose provider payloads, passwords, or tokens.
- **Remove demonstration identity.** Remove floating role switches and role
  dropdowns from the connected app. Any retained demonstrations belong only in
  explicit development previews and cannot bypass authentication. Public event
  fixtures retain their later-slice boundary and must not be represented as live
  inventory. Do not present sample tickets, statistics, or payments as belonging
  to the signed-in account.

## Testing Decisions

- **Approved primary seam: the existing public application HTTP boundary.**
  Exercise the approved authentication, terms, and current-account endpoints
  and their observable effects. Reuse the frontend client's injected fetch
  transport for contract cases and the backend application factory with
  Supertest, real Better Auth/Prisma, and the guarded dedicated PostgreSQL test
  database for lifecycle integration. Do not introduce new internal seams or
  mock the lifecycle modules under test. The user approved this seam with the
  eight-ticket breakdown on 2026-10-21.
- **Good tests assert external behavior.** Check request paths and allowed
  payloads, public envelopes/statuses, cookie issuance/clearing, actual access,
  rendered messages/destinations, and observable persistence/invalidation.
  Avoid private helper call counts, component structure snapshots, or tests that
  merely reproduce implementation. Controlled mail capture/failure and a
  deterministic clock reuse existing backend test boundaries.
- **Frontend contract prior art.** Update the existing authentication adapter
  and public frontend tests, which already inject transport and exercise safe
  returns/validation. Their native-route, auto-login, mandatory-phone, and
  provisional password expectations are obsolete; rewrite those expectations
  against the approved contract rather than preserving a passing wrong model.
  Cover exact passwords/Unicode boundaries, optional phone omission, forbidden
  fields, current terms and stale-version acceptance reset, safe errors,
  no-session registration, every required account gate, recovery, and uncertain
  mutations. A transport mock does not establish real browser cookies or UI.
- **Backend lifecycle prior art.** Reuse the registration, verification, session,
  terms-acceptance, password-recovery, and authorization suites. Cover missing
  terms; initial delivery failure; wrong-password verification nonconsumption;
  purpose binding; expiry, replay, multiple links and concurrent completion;
  legacy recovery and consent; persistent nonrenewing sessions; reset revocation;
  disabling; cooldown privacy; explicit role pairings; native-route denial; and
  logout idempotence. Extend only where S01 changes behavior, notably fixed mail
  destinations and the legacy-link bridges. Preserve transaction/audit rollback
  checks already owned by the lifecycle suites.
- **Actual localhost browser acceptance.** Exercise registration through
  verification and separate login; recovery/consent gates; new and existing mail
  links; immediate fragment removal and reopen-after-reload behavior; signed-in
  completion behavior; safe and rejected returns; cookie persistence on reload;
  focus/navigation/cross-tab refresh; confirmed/uncertain logout; and truthful
  outage/unavailable states. Test direct and client-navigated workspace access
  for all three roles and guests, including stale/revoked sessions and absence
  of protected content in nested rendering. Verify real browser-to-proxy-to-API
  cookie and Origin behavior; transport-only assertions cannot substitute.
- **Verification requirements.** Implementation acceptance requires updated
  frontend tests, passing backend authentication suites on the dedicated test
  database, frontend typechecking and production build, appropriate backend
  static checks for changed code, and the actual localhost walkthrough. Preserve
  existing database identity/separation guards. Record blockers honestly; a
  missing database or browser run cannot be reported as a passing check.
- **Activation evidence remains separate.** Automated tests use clearly labeled
  fixture terms and controlled mail. Before real-user registration/consent,
  require owner-reviewed genuine terms with a reachable matching document and
  version. Before real sending, require configured delivery and smoke evidence;
  a restricted owner-mailbox demo is not arbitrary-recipient delivery. Inventory
  actual accounts and provide working recovery before activating a legacy
  transition. Production HTTPS origins, cookies, and trusted proxies require
  their own approval and verification. No such evidence is claimed by this spec.

## Out of Scope

- Profile editing, authenticated password changes, and their forms: S02.
- Organizer applications/approval, administrator account management, role
  changes, public administrator registration, or an account role hierarchy.
- Event, booking, inventory, payment, ticket, check-in, dashboard, analytics,
  notification, and audit-viewer integration. Protect their workspaces and make
  unfinished operations unavailable without claiming those APIs are connected.
- Cross-device booking-context/draft restoration, booking destinations in email,
  arbitrary callback URLs, reset-token preflight, remember-me, social login, 2FA,
  email changes, and a user-facing sign-out-all-devices feature.
- Authoring legal terms, purchasing/provisioning a sending domain, configuring
  real credentials, production deployment, or lifting activation gates.
- Application code/configuration/schema changes, migrations, database writes,
  provider sends, or starting implementation during this specification task.
- Reopening or rewriting closed historical GitHub issues, including #67.

## Further Notes

- Source scope: [S01 in the project plan](../../../project-plan.md#s01--register-verify-sign-in-and-sign-out-as-an-attendee).
- Confirmed product and integration decisions:
  [S01 design record](s01-attendee-authentication.md). Recommendations Q1–Q4,
  Q5–Q11, Q12–Q19, and the consolidated understanding were confirmed on
  2026-10-21; the interview is complete. This spec preserves those decisions
  rather than reopening product discovery.
- Authoritative account policy: [Phase 1 requirements](../../documents/phases/phase-1-authentication.md).
  Existing operation, envelope, privacy, and lifecycle contracts:
  [Phase 1 integration contract](phase-1-integration-contract.md).
  S01's confirmed fixed frontend destinations and explicit legacy-link bridges
  extend the earlier backend-only landing arrangement without changing token
  validation, session issuance, or callback restrictions.
- Terminology: [account glossary](../../GLOSSARY.md); role architecture:
  [fixed account roles](../adr/0001-fixed-account-roles.md).
- Test prior art: [frontend authentication tests](../../../tests/auth-integration.test.mjs),
  [frontend public tests](../../../tests/public-frontend.test.mjs), and backend
  [registration](../../test/registration.test.ts),
  [verification](../../test/verification.test.ts),
  [sessions](../../test/sessions.test.ts),
  [legacy consent](../../test/terms-acceptance.test.ts),
  [recovery](../../test/password-recovery.test.ts), and
  [authorization](../../test/authorization.test.ts).
- Repository review found existing lifecycle implementations and tests, not
  proof of passing execution, deployed migrations, or provider readiness. No
  application tests, browser walkthrough, database operations, or delivery were
  performed for this documentation-only specification.
- On 2026-10-21, the user approved the eight-ticket `to-tickets` breakdown,
  blocking edges, and public HTTP test seam, then authorized publication.
  All eight tickets have `ready-for-agent` and native GitHub blocking
  relationships. Historical tickets remain unchanged. Publication does not
  authorize starting application implementation or bypassing activation gates.
- The approved specification snapshot is included in the first ticket so its
  requirements are readable before the local source documents are committed.

## Published tickets

Parent: [#115 — S01: Attendee authentication integration](https://github.com/AxIon-200/aventix-development/issues/115).
The eight tickets below are native sub-issues of #115; their approved blocking
relationships remain unchanged. The user requested this parent on 2026-10-21.

| Ticket | What it delivers | Blocked by |
| --- | --- | --- |
| [#107](https://github.com/AxIon-200/aventix-development/issues/107) | Sign-in, current-account navigation, and sign-out | None |
| [#108](https://github.com/AxIon-200/aventix-development/issues/108) | Account refresh across navigation and tabs | #107 |
| [#109](https://github.com/AxIon-200/aventix-development/issues/109) | Role workspace protection and removal of personal sample content | #107 |
| [#110](https://github.com/AxIon-200/aventix-development/issues/110) | Attendee registration with current terms | #107 |
| [#111](https://github.com/AxIon-200/aventix-development/issues/111) | Password-gated email verification and resend | #107 |
| [#112](https://github.com/AxIon-200/aventix-development/issues/112) | Password recovery and reset sign-out effects | #107 |
| [#113](https://github.com/AxIon-200/aventix-development/issues/113) | Missing legacy consent | #110, #112 |
| [#114](https://github.com/AxIon-200/aventix-development/issues/114) | Joined localhost acceptance evidence | #108, #109, #111, #113 |

Work the frontier: #107 can start immediately; subsequent tickets become
available when their blockers are complete. Each feature owns its own checks;
#114 verifies the joined journey and retains separate activation gates.
