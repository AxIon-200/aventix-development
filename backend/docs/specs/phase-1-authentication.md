# Phase 1: Authentication and User Accounts

## Problem Statement

Aventix users need secure, independent access to their ticketing accounts before
the frontend is complete. The current backend has basic authentication wiring
and a narrow registration/login/session/logout test foundation, but does not
demonstrate the agreed verification, consent, profile, recovery, account-status,
and authorization requirements. Its existing tests assume immediate access after
registration, which conflicts with the approved verification requirement.

## Solution

Provide a backend-testable account lifecycle: attendee registration with explicit
terms acceptance, password-gated email verification, login, persistent fixed-life
cookie sessions, self-service profiles, password recovery and change, logout,
and role/status enforcement. Keep implementation appropriate for a school
project using the existing stack and affordable email delivery.

This spec synthesizes the approved interview decisions. The
[Phase 1 requirements](../../documents/phases/phase-1-authentication.md) remain
the authoritative rule reference; the
[fixed-role ADR](../adr/0001-fixed-account-roles.md) explains identity separation.
No domain glossary exists in the current checkout.

## User Stories

1. As a prospective attendee, I want to register with my first name, last name, email, password, and optional Philippine mobile number, so that I can create an account.
2. As a prospective attendee, I want to explicitly accept the current terms version, so that my agreement is recorded accurately.
3. As a prospective attendee, I want invalid registration data rejected, so that my account starts with usable details.
4. As an account owner, I want duplicate registration rejected without changing my details, so that another registration cannot overwrite my account.
5. As an account owner, I want email case and surrounding whitespace handled consistently, so that equivalent inputs identify my account.
6. As a new attendee, I want an ACTIVE account with an unverified email and no session, so that registration does not bypass verification.
7. As a new attendee, I want a verification email, so that I can prove ownership of my address.
8. As an email owner, I want verification to require both the link and current password, so that clicking a link cannot activate credentials chosen by another person.
9. As an email owner who does not know the registered password, I want recovery available before verification, so that I can take control of my account.
10. As an unverified user, I want to resend verification emails, so that I can recover from missing or expired emails.
11. As an unverified user, I want earlier verification links to survive a resend until expiry or verification, so that delayed delivery does not break my attempt.
12. As a verified user, I want a separate login step after verification, so that verification alone grants no session.
13. As a user, I want to know when my account was created but email delivery failed, so that I resend rather than register again.
14. As a registered user, I want to log in using valid credentials after verification, so that I can access protected functionality.
15. As an account owner, I want incorrect credentials rejected consistently, so that login does not disclose my verification state to someone without my password.
16. As a signed-in user, I want to remain signed in across browser closure within the original session lifetime, so that I can resume using the service.
17. As an account owner, I want every session to expire seven days after issuance without activity extending it, so that access has a definite end.
18. As a user with several devices, I want independent sessions, so that I can use more than one device.
19. As a signed-in user, I want to log out of my current session, so that the browser loses access while my other devices remain signed in.
20. As a user, I want logout to succeed even if my session already expired, so that I can reliably clear browser authentication.
21. As an authenticated user, I want to retrieve only my own permitted profile information, so that I can check my account details.
22. As an authenticated user, I want to update my first name, last name, or mobile number, so that my details remain current.
23. As an authenticated user, I want to clear my optional mobile number, so that I can remove information I no longer use.
24. As an authenticated user, I want omitted profile fields preserved and invalid updates rejected atomically, so that partial edits do not damage other details.
25. As an account owner, I want my derived name synchronized with my first and last names, so that my identity is presented consistently.
26. As an account owner, I want role, status, verification, consent, and other forbidden profile edits rejected, so that ordinary editing cannot bypass account controls.
27. As a user who forgot a password, I want a reset email, so that I can regain control through my inbox.
28. As an unverified or disabled account owner, I want password recovery without automatic verification or re-enabling, so that credential recovery does not override access restrictions.
29. As an account owner, I want reset links to expire after 30 minutes, so that recovery access is time limited.
30. As an account owner, I want a successful reset to invalidate every session and outstanding reset link, so that old access cannot survive recovery.
31. As a user requesting another reset email, I want earlier links to remain valid until expiry or successful reset, so that delayed email delivery does not prevent recovery.
32. As a signed-in user, I want password changes to require my current password, so that possession of a session alone cannot replace my credentials.
33. As an account owner changing a password, I want other sessions and reset links invalidated while my current session stays authenticated, so that I can continue safely.
34. As an account owner, I want verification and reset emails rate limited, so that repeated requests do not flood my inbox.
35. As an account owner, I want recovery and resend responses to conceal account details, so that these endpoints disclose no unnecessary account information.
36. As a user, I want invalid, expired, and consumed links rejected without disclosing account details, so that link handling fails safely.
37. As an attendee, organizer, or administrator, I want permissions explicitly assigned to my role, so that another role does not automatically inherit access.
38. As a person needing multiple roles, I want separate accounts with different emails and independent credentials, verification, and sessions, so that those identities remain separate.
39. As an account owner, I want my role fixed at creation, so that my existing account is never converted to a different identity.
40. As a disabled account owner, I want my account to remain disabled during credential recovery or verification, so that these operations do not bypass the restriction.
41. As a platform maintainer, I want disabling to invalidate existing sessions and re-enabling to require a fresh login, so that old sessions cannot regain access.
42. As a platform maintainer, I want trusted-origin, cookie, and CSRF controls, so that browser-based requests respect the authentication boundary.
43. As a platform maintainer, I want direct authentication endpoints to enforce the same rules, so that alternate routes cannot bypass the specification.
44. As a platform maintainer, I want durable records of credential changes, status changes, and privileged provisioning without secrets, so that important account actions are traceable.
45. As an existing user missing verification or consent, I want a genuine completion flow, so that the system does not fabricate my agreement or email ownership.
46. As a frontend developer, I want documented inputs, responses, cookies, errors, and completion destinations, so that future integration follows an agreed contract.
47. As a project evaluator, I want automated backend demonstrations of all accepted behavior without frontend pages, so that Phase 1 can be assessed independently.

## Implementation Decisions

- Retain Express, TypeScript ESM, PostgreSQL/Supabase, Prisma, and Better Auth.
  Better Auth manages authentication and sessions using the shared User identity.
  Preserve authentication-handler ordering before JSON parsing. Application APIs
  use `/api/v1`; `/api/auth` remains the provisional authentication base subject
  to installed-version verification.
- Keep the school-project implementation straightforward. Do not introduce
  additional infrastructure unless needed to satisfy an approved behavior.
- Extend authentication policy, account/profile operations, validation,
  authorization middleware, email delivery, error handling, and audit recording
  through the existing backend. No specific new schema design is approved by
  this spec; persistence must support the confirmed rules without fabricated
  consent or verification data.
- Public registration creates only ACTIVE ATTENDEE accounts. Role is immutable;
  organizer and administrator identities require separate accounts with different
  normalized emails. Administrator provisioning is trusted, never public.
- Trusted account operations use local maintenance commands to create a dedicated
  administrator account and disable/re-enable accounts by ID. No HTTP management
  endpoints are added. Commands enforce approved identity, session-invalidation,
  and audit rules, verify the target database, and keep passwords out of command
  arguments and logs. Only authorized developers with backend/database access
  may use them. Organizer test identities use isolated fixtures; organizer
  onboarding stays outside Phase 1.
- Normalize emails by trimming surrounding whitespace and lowercasing the entire
  address; preserve dots and plus suffixes. Reject duplicates even if unverified,
  with no modification of the existing account. Explicit duplicate conflicts
  intentionally disclose account existence, but no other account state.
- Require first/last names of 1-100 characters after trimming, preserving Unicode,
  punctuation, and internal whitespace. Derive the separate authentication name
  by joining the two with one space; clients cannot set it independently.
- Accept Philippine mobile numbers as `09` plus nine ASCII digits or `+639`
  plus nine ASCII digits and store the latter form. Reject spaces, hyphens,
  other country codes, and landlines. Check format only; no carrier-prefix list,
  allocation, reachability, or ownership check is required. Omission preserves
  a phone in partial updates; null clears it.
- Require passwords of 15-128 characters for registration, reset, and change.
  Allow spaces and Unicode without composition rules, trimming, or truncation.
  Reset/change reject a new password identical to the current one.
- Count name and password lengths in Unicode code points. Apply name limits
  after surrounding-whitespace trimming; preserve password contents exactly,
  without trimming or normalization. Visually combined characters may comprise
  more than one code point.
- Require explicit true terms acceptance and the current version; store the
  server-generated timestamp. Expose a public current-terms version/document-URL
  operation. Missing acceptance and outdated versions are rejected. Ordinary
  profile editing cannot change consent records.
- Require verification link plus current password, then a separate login.
  Verification links last 24 hours; resends preserve earlier links, and successful
  verification invalidates all outstanding verification links. Wrong verification
  passwords do not consume otherwise-valid links. Login never automatically
  resends verification email.
- Recovery is available to unverified and disabled accounts. A reset neither
  verifies email nor re-enables an account nor issues a session. Reset links last
  30 minutes; new requests preserve earlier links, while successful reset consumes
  all outstanding reset links and invalidates every session. Verification links
  survive reset, but require the new password to complete verification.
- Authenticated password changes require the current password and valid new
  password. Incorrect current passwords change nothing. Success invalidates other
  sessions and outstanding reset links, preserving the current authenticated session.
- Use fixed seven-day sessions for all roles with persistent cookies and no
  activity renewal or remember-me variation. Permit concurrent device sessions.
  Logout affects only the requesting session, clears its cookie, and is idempotent.
- Implement `GET /api/v1/me` and `PATCH /api/v1/me` for the authenticated account.
  Profile editing permits only first name, last name, and phone. Updates are
  partial and atomic; empty requests, invalid values, and forbidden fields reject
  the entire request.
- Profile responses may expose ID, names, email, phone, role, status, verification
  state, terms version/acceptance timestamp, and account timestamps, excluding
  credentials, tokens, and provider records.
- Enforce explicit role allowlists without inheritance. Shared self-service
  operations permit all three roles subject to authentication and status checks.
  Every protected request checks current server-side status. Disabling invalidates
  all sessions; re-enabling never revives them. Requests authorized before disabling
  may finish. Disabled users may verify email without gaining login access.
- Unknown-email and wrong-password login responses are identical. Only a correct
  password reveals verification-required or disabled access, with disabled taking
  precedence. Recovery/resend responses retain their approved generic messages
  across account states, per-address cooldown suppression, and email delivery
  failures. Delivery failures are recorded internally without passwords or raw
  tokens. Users may retry subject to cooldowns; no background queue is required.
- Each normalized address may receive one verification email per 60 seconds and,
  independently, one reset email per 60 seconds. The initial verification email
  counts. Suppressed requests send nothing and do not extend cooldowns. Add
  configurable IP throttling without permanent failed-attempt account locks.
  An eligible delivery attempt starts its respective 60-second cooldown when
  the attempt begins, including when provider delivery fails. Verification and
  recovery cooldowns remain independent.
- Use real transactional email delivery for demonstrations and a controlled mail
  substitute for automated tests. Preserve a successfully created unverified
  account and consent record when email delivery fails; clearly report creation
  and delivery failure, support resend, and issue no session.
- Bind links to account and purpose; reject reuse, purpose substitution, and
  concurrent uses that violate invalidation rules. Use the common invalid-or-expired
  link error, approved completion destinations, and no raw tokens in logs.
- Production cookie sessions use HTTPS-only secure, HTTP-only cookies, explicit
  trusted origins, credentialed CORS, and CSRF protection. Exact SameSite settings
  depend on deployment site arrangement. All exposed direct authentication routes
  must enforce these policies; unsupported operations are unavailable.
- Use compatibility checks to choose mechanisms while retaining all approved
  behavior: prefer Better Auth configuration/hooks, then small Aventix endpoints
  or extensions that continue to use Better Auth credentials and sessions. Make
  bypass routes unavailable. Check the exact dependency version before finalizing
  authentication paths/payloads. Substantial custom authentication logic requires
  presenting the conflict for a user decision. A declared dependency range does
  not establish compatibility.
- Use stable machine-readable errors without internal details: 400 invalid input,
  401 missing/invalid authentication or credentials, 403 disabled/unverified access
  or insufficient role, 409 duplicates/outdated terms, 429 IP throttling, and 503
  synchronous email-service failure for registration only. Recovery/resend
  delivery failures keep the same generic status and message as other outcomes.
- Persist audit records for successful password changes/resets, disabling and
  re-enabling, and privileged provisioning, excluding passwords and raw tokens.
- Aventix-owned JSON responses use `data` for successful public results, or
  `error` with a stable `code` and safe `message` for rejections. Validation errors
  may include field errors without echoing passwords or tokens. Recovery/resend
  use HTTP 200 and the approved generic message even for cooldown suppression or
  delivery failure. Registration delivery failure uses HTTP 503 and code
  `ACCOUNT_CREATED_EMAIL_FAILED`, confirming account creation and resend
  availability without issuing a session. Missing legacy consent uses HTTP 403
  and `TERMS_ACCEPTANCE_REQUIRED` only after correct credentials. Session
  credentials are sent through cookies, not JSON bodies. Better Auth-owned
  response shapes remain subject to compatibility checks; adapt only as needed.
- Existing accounts missing genuine consent must complete a dedicated acceptance
  flow before protected access, and remain subject to verification. No fabricated
  consent or verified state is permitted. Future terms reacceptance is deferred.
  The dedicated legacy-consent operation requires normalized email, current
  password, an ACTIVE account, verified email, explicit true acceptance, and the
  current terms version. It records acceptance without issuing a session; the
  user logs in afterward. Missing acceptance blocks login and protected access
  through existing sessions. Unverified users verify first; disabled accounts
  cannot complete acceptance. No restricted-session system is required. Logout
  and recovery remain available under their previously specified rules.

### Operation contract

The approved operation inputs and success outcomes are recorded in the
[authoritative API contract](../../documents/phases/phase-1-authentication.md#operation-level-api-contract).
Registration succeeds with HTTP 201 and no session; other listed operations
succeed with HTTP 200. Authentication paths and exact field names require
version-specific verification; the previously approved profile routes are fixed.
This is an approved operation-level contract, not a claim that Better Auth's
default handlers already satisfy it.

## Testing Decisions


- Confirmed primary boundary: HTTP
  integration tests through the Express application with real Better Auth and
  Prisma on the dedicated PostgreSQL test database. This is the highest existing
  seam and covers authentication, account/profile behavior, and authorization
  without a frontend. The earlier interview already approved test-only role
  routes using the actual middleware.
- Follow the existing Vitest and Supertest authentication tests, including
  cookie-preserving agents and isolated user cleanup. Update their assumptions
  about registration sessions, terms acceptance, verification, and password policy.
- Test externally observable behavior: responses, cookies, access granted or
  denied, captured mail links, and durable required outcomes. Avoid testing
  private helpers, internal call order, or library defaults as requirements.
- Substitute outbound email at a controlled boundary for automated tests;
  use captured messages to complete verification/recovery through HTTP. A real
  delivery smoke check demonstrates provider integration separately.
- Exercise actual authorization middleware through test-only organizer/admin
  routes, never mounted in production. Cover every allowed/denied role pairing,
  especially administrators denied organizer-only operations without an allowlist.
- Cover registration/normalization/consent, validation boundaries, forbidden fields,
  profile response filtering, verification/password gating, recovery enumeration
  behavior, invalid/replayed/wrong-purpose links, and email delivery failure.
- Cover fixed expiry without renewal, persistent cookies, independent sessions,
  repeated logout, password change/reset revocation, disabled status, re-enabling,
  and direct-route bypass attempts. Include concurrent token-use cases and
  deterministic time handling for expiry and throttling.
- Verify durable consent and audit outcomes where needed; never emit credentials
  or tokens in test output. Preserve existing test-environment and Supabase project
  checks, ensuring the test database differs from development before any writes.
- Run typechecking and relevant automated tests for subsequent implementation.
  This planning-only change does not run data-changing tests or migrations.

## Out of Scope

- Frontend implementation, integration, and route protection.
- Organizer registration/application/approval workflows and resource ownership
  authorization; event, booking, ticketing, and payment features.
- Public administrator registration and administrator account-management APIs.
- Role conversion, multiple roles on one account, and automatic role inheritance.
- Email changes, profile-image updates, and phone ownership verification.
- User-facing logout-all-devices and device/session management interfaces.
- Future terms-revision reacceptance and audit-log viewing APIs.
- Extra infrastructure or enterprise operational features beyond the approved
  school-project requirements.

## Further Notes

- Planning baseline approved explicitly by the user on 2026-10-19, with the
  technical prerequisites below still outstanding. This approval does not
  authorize implementation or GitHub publication. Separate implementation
  approval is required after resolving the prerequisites.
- All interview recommendations were accepted with Philippine-mobile-only numbers
  and school-project implementation scope. Acceptance of this synthesis does not
  authorize feature implementation during the planning session.
- Technical prerequisites remain explicit: verify the installed Better Auth
  version and support for password-gated verification, multiple outstanding links,
  invalidation, fixed expiry, and policy enforcement on all public routes. Resolve
  conflicts before selecting an integration strategy rather than silently
  weakening an approved rule.
- The follow-up review confirmed delivery-failure privacy, cooldowns after failed
  attempts, password-gated legacy consent without restricted sessions, Unicode
  code-point length counting, format-only Philippine mobile validation, local
  trusted maintenance commands, a compatibility-first integration strategy, and
  the Aventix-owned response and operation contracts. The HTTP integration test
  boundary is confirmed. These resolve the seven review findings at the policy
  level; dependency and deployment verification remains outstanding.
- Finalize initial IP-throttle thresholds, deployment origins and SameSite,
  affordable email provider, approved destinations, version-compatible
  authentication paths and exact field names, remaining error codes, and
  terms-operation routes before implementation approval. Use the approved
  operation/response and legacy-consent contracts; library defaults do not
  silently supply the remaining details.
- The external system-requirements document could not be accessed during review.
  Available README/team material describes an outdated NestJS layout; the current
  backend and agreed architecture use Express. No application code, configuration,
  schema, or migrations were changed during this planning session.
- Tracker and triage configuration is complete at the Git repository root. With
  explicit user approval, the consolidated issue description and acceptance
  criteria were published by updating existing
  [GitHub issue #33: Phase 1: Authentication and User Accounts — Backend](https://github.com/AxIon-200/aventix-development/issues/33),
  retaining `ready-for-agent`. No duplicate issue was created. The publication
  approval does not authorize implementation; the technical prerequisites and
  separate implementation approval gate above remain in force.

### Approved implementation tickets

Issue #55's prerequisite investigation is recorded in the proposed
[integration contract](phase-1-integration-contract.md) and
[exact-version compatibility evidence](phase-1-better-auth-compatibility.md).
These documents identify default password-normalization and session-replacement
conflicts and propose a transactional Aventix extension for explicit review.
Follow-up [operational findings](phase-1-operational-prerequisites.md) document
the local deployment target, selected email provider, and external activation
inputs. An isolated temporary installation verified exact dependency versions
and 14 runtime assertions; backend installation and PostgreSQL integration tests
remain later work. These documents do not supply missing production hosts,
sender-domain ownership, or legal terms.
The user approved the extension and transaction boundary on 2026-10-19; see the
[approval record](phase-1-integration-contract.md#approval-record). The user also
approved localhost-first scope and mandatory legacy recovery/reset and confirmed
there is no sending domain or approved terms. The local technical prerequisites
are resolved; sender activation, genuine terms, production verification, and
target-database preflight remain explicit implementation/activation gates.
The consolidated contract received final implementation approval on 2026-10-19,
completing #55's local planning/approval work. No remote issue closure or
publication was performed; #56 has not begun.

The user approved the ten-ticket breakdown. The tickets are published as native
sub-issues of #33, each labeled `ready-for-agent`, with native blocking edges.
The parent's title, description, and status were preserved. Publication does not
authorize implementation; the first ticket retains the prerequisite review and
separate implementation approval gate.

| Ticket | Delivery | Blocked by |
| --- | --- | --- |
| [#55](https://github.com/AxIon-200/aventix-development/issues/55) | Compatibility and deployment contracts | None |
| [#56](https://github.com/AxIon-200/aventix-development/issues/56) | Registration, consent, initial verification email | #55 |
| [#57](https://github.com/AxIon-200/aventix-development/issues/57) | Password-gated verification and resend | #56 |
| [#58](https://github.com/AxIon-200/aventix-development/issues/58) | Login, authenticated account retrieval, sessions, logout | #57 |
| [#59](https://github.com/AxIon-200/aventix-development/issues/59) | Legacy consent | #58 |
| [#60](https://github.com/AxIon-200/aventix-development/issues/60) | Atomic profile editing | #58 |
| [#61](https://github.com/AxIon-200/aventix-development/issues/61) | Password recovery and reset | #58 |
| [#62](https://github.com/AxIon-200/aventix-development/issues/62) | Authenticated password change | #61 |
| [#63](https://github.com/AxIon-200/aventix-development/issues/63) | Role permissions and trusted account commands | #58 |
| [#64](https://github.com/AxIon-200/aventix-development/issues/64) | Complete lifecycle and deployment verification | #59, #60, #62, #63 |
