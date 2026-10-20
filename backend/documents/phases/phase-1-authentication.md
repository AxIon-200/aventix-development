# Phase 1 — Authentication and User Accounts

## Context

Aventix is an online concert, gig, and music festival ticketing platform.

The system uses:

- Backend: Express.js, TypeScript
- Database: PostgreSQL (Supabase)
- ORM: Prisma
- Authentication: Better Auth
- Frontend: Next.js

The frontend is still under development. This phase focuses exclusively on backend functionality.

The backend must be independently implementable and testable without relying on completed frontend pages.

This is a school project. Use straightforward implementations appropriate for
the demonstration, existing stack, and available budget. The approved security
behavior remains required; additional infrastructure is not a prerequisite.

## Objective

Design and implement secure authentication, user account management, session handling, and role-based authorization.

The completed backend must support attendee registration, login, logout, password management, profile management, and protected API access.

## Scope

### Authentication

- Attendee registration
- Login and logout
- Secure session creation and validation
- Session expiration and invalidation
- Forgot password and password reset
- Authenticated password change

Ordinary logout invalidates only the session making the request and clears its
cookie. Other device sessions remain signed in. A user-facing "log out all
devices" operation is outside Phase 1; automatic session invalidation required
for password operations and account disabling still applies.

Sessions have a fixed seven-day lifetime measured from issuance for all three
roles. Activity must not extend their expiry. After expiration, the user must
log in again. Phase 1 has no "remember me" option that changes this lifetime.
Logout, password operations, and account disabling may invalidate sessions
earlier as specified in this document.

Session cookies persist across browser closure and expire no later than the
session's original expiry. Reopening the browser may resume a still-valid
session, but must not extend its expiry or revive an invalidated session.

### User Accounts

Registration must support:

- First name
- Last name
- Email
- Optional phone number
- Password
- Terms and conditions acceptance

Newly registered users must receive:

- Role: `ATTENDEE`
- Status: `ACTIVE`

Email ownership verification is required before a login session can be issued.
Registration creates an `ACTIVE` attendee whose email is initially unverified;
account status and email verification are separate concerns. Registration must
not automatically issue a login session. Email verification and verification
email resend behavior are required in Phase 1 as specified below.

Completing email verification requires both a valid verification link and the
account's current password. Possession of the link alone must not mark the email
as verified. A user who does not know the password must reset it first.
Successful email verification marks the email as verified but does not issue a
session. The user must log in separately with their password.

Each email verification link expires 24 hours after issuance. An expired link
must not verify the email; the account remains unverified and the user can
request another verification email.

Resending a verification email does not invalidate previously issued links.
Each link remains usable until its own expiry or successful email verification.
Successful verification invalidates all outstanding verification links for the
account.

Verification email delivery is limited to one email per address every 60
seconds, including the initial registration email. Requests during the cooldown
send no email and do not extend the cooldown. Additional IP-based throttling is
specified under operational requirements below.

For validly formatted email addresses, verification resend requests return the
same status and message whether the account is missing, already verified,
eligible for delivery, or suppressed by the per-address cooldown: "If this
address is eligible, a verification email will be sent."

Email addresses are normalized by trimming surrounding whitespace and
lowercasing the entire address. Registration, login, password recovery,
verification resend, duplicate detection, and per-address cooldowns use this
same normalization. Dots and `+suffixes` are preserved; provider-specific alias
rules are not applied.

Duplicate email registrations must be rejected even when the existing account's
email is unverified. A rejected registration must not change the existing
account's credentials or profile information.

Password recovery is available for unverified accounts. A successful password
reset changes the password but does not mark the email as verified or issue a
session. Email verification is still required before login.

A successful password reset invalidates every active session, including any
session in the browser performing the reset. It issues no replacement session;
the user must log in again, subject to email verification and account status.

Password-reset links expire 30 minutes after issuance. Expired links cannot
change the password; the user must request another reset link.

A successful password reset consumes the used link and invalidates all other
outstanding password-reset links for the account. Replaying any of these links
must fail.

Requesting another password-reset email does not invalidate previously issued
reset links. Each remains valid until its own 30-minute expiry or a successful
password reset.

Password-reset email delivery is limited to one email per normalized address
every 60 seconds, independently of the verification-email cooldown. Requests
during the cooldown send no email and do not extend the cooldown.

For validly formatted addresses, password-recovery requests return the same
status and message for unknown, active, disabled, and unverified accounts,
including requests suppressed by the cooldown: "If an account exists for this
address, a password-reset email will be sent."

Authenticated password changes require the current password and a valid new
password. An incorrect current password leaves credentials and sessions
unchanged. Users who have forgotten their current password use password
recovery instead.

Successful authenticated password changes invalidate all outstanding
password-reset links as well as the user's other active sessions.
The session used for the successful change remains authenticated. This differs
from password recovery, where a successful reset invalidates every session.

Login attempts with an unknown email or an incorrect password return the same
"Invalid email or password" response. Only after the password is correct may
login report "Email verification required" for an unverified email; no session
is issued.

Registration must submit `termsAccepted: true` and the terms version presented
to the user. The backend rejects missing or false acceptance and any version
other than the current terms version. It records the accepted version with a
server-generated acceptance timestamp. Ordinary profile updates must not alter
this acceptance record.

Users must be able to retrieve their profile. Phase 1 profile editing permits
only first name, last name, and optional phone number. Users may clear their
phone number. Email changes and profile-image updates are deferred beyond
Phase 1. Password changes use a separate password-change operation.

Phone numbers, when provided, must be Philippine mobile numbers only. Accept
`09` followed by nine ASCII digits or `+639` followed by nine ASCII digits, and
store the normalized `+639XXXXXXXXX` form. Reject spaces, hyphens, other country
codes, and landlines. Validation checks format only, without a carrier-prefix
list or a guarantee of allocation or reachability. Phone ownership verification
is outside Phase 1. Omitting
the phone number in a profile update preserves it; `null` clears it.

First name and last name are the authoritative name fields. The backend derives
the Better Auth `name` field by joining them with one space at registration and
whenever either field changes. Clients must not independently set `name`.

Profile updates containing any field outside the editing allowlist must be
rejected in full without changing any fields. This includes role, status,
email-verification state, terms acceptance records, and all other fields outside
first name, last name, and phone number.

Profile updates are partial and atomic: omitted fields remain unchanged, any
invalid field rejects the entire update, and empty updates are rejected.

### Input validation and account contracts

- Registration, password reset, and password change use the same password policy:
  15-128 characters, allowing spaces and Unicode, without composition rules,
  trimming, or silent truncation. Reset and change reject a new password
  identical to the current password.
- Trim surrounding whitespace from first and last names. Each must contain
  1-100 characters after trimming. Allow Unicode, punctuation, and internal
  spaces; do not impose a letters-only restriction.
- Name and password length limits count Unicode code points, not JavaScript
  UTF-16 code units or visually combined characters. Count names after trimming
  surrounding whitespace. Preserve password contents exactly; do not trim or
  normalize them.
- `GET /api/v1/me` retrieves only the authenticated account's profile;
  `PATCH /api/v1/me` updates only that profile. Arbitrary-user lookup is excluded.
- The profile response may expose ID, first name, last name, derived name,
  email, phone number, role, status, email-verification state, accepted terms
  version and timestamp, and account timestamps. Exclude passwords, tokens,
  and authentication-provider records.
- A public backend endpoint provides the current terms version and document
  URL. Requiring existing users to accept future revisions is outside Phase 1.
- Duplicate registration returns a conflict response without revealing role,
  status, profile, or verification state. Account-existence disclosure through
  registration is accepted.
- Login never automatically sends another verification email. Use the explicit
  verification resend operation instead.
- Logout is idempotent: missing, expired, and already-invalidated sessions still
  receive a successful logout response and have their cookie cleared.
- Multiple simultaneous sessions are permitted without a device-count limit in
  Phase 1; each follows the approved expiry and invalidation rules independently.
- Existing accounts must not receive fabricated terms acceptance or email
  verification. They remain subject to verification and must genuinely accept
  terms through a dedicated flow before protected access if acceptance is absent.
- The dedicated legacy-consent operation requires the normalized email, current
  password, an `ACTIVE` account, verified email, `termsAccepted: true`, and the
  current terms version. It records genuine acceptance but issues no session;
  the user must then log in normally. Missing acceptance blocks login and all
  existing sessions from protected access. Unverified users verify first;
  disabled accounts cannot complete this operation. No restricted-session system
  is required. Logout and credential-recovery operations remain available under
  their previously specified rules.

### Legacy credential transition

The user approved mandatory recovery/reset for existing Better Auth default
password hashes on 2026-10-19. Those hashes normalize Unicode before hashing,
so the original exact password spelling cannot be recovered. New credentials
must use the approved exact-password implementation; do not silently rehash a
legacy login or allow a temporary normalization exception for login access.

Existing accounts with legacy credential hashes must complete password recovery
before receiving a new session or using an existing session for protected access.
Preserve the previously approved incorrect-credential privacy and correct-password
disabled/unverified/missing-consent ordering. When these preceding checks pass,
legacy credentials return HTTP 403 with `PASSWORD_RESET_REQUIRED`, directing the
user to recovery. Password-gated verification and legacy consent also require
the transition before they mutate account state; a valid link or correct password
does not by itself upgrade the stored credential. Wrong verification passwords
must still leave valid links usable.

The old verifier may be retained only to recognize a valid legacy credential
for this transition response and to reject reuse during reset. Reject a reset
candidate that matches the old verifier: legacy hashes cannot distinguish
equivalent Unicode spellings. Successful recovery writes the exact-password
credential and performs the existing reset invalidation and audit requirements.
It does not change role, account status, email verification, or terms acceptance,
and issues no session. Verification links retain their approved lifetime and
require the new current password after reset.

Do not assume a database has no legacy accounts. Before activating the
transition, inspect the target database safely and ensure affected accounts
have working recovery delivery. Do not fabricate verification or consent, delete
accounts, or assign replacement passwords to avoid the transition. The
[integration contract](../../docs/specs/phase-1-integration-contract.md) owns
the version-specific mechanism and error catalogue.

### Email delivery and token behavior

- Phase 1 requires actual verification and recovery email delivery through a
  transactional email provider. Automated tests use a controlled mail substitute.
  Provider selection is an implementation detail subject to project budget.
- For validly formatted recovery and verification-resend requests, email delivery
  failures retain the same generic status and message as other account outcomes.
  Do not return a delivery-specific error that reveals account existence. Record
  delivery failures internally without passwords or raw tokens. Users may retry
  subject to the cooldown; a background delivery queue is not required in Phase 1.
  Registration retains the explicit account-created/delivery-failed behavior below.
- Each eligible verification or recovery delivery attempt starts its respective
  60-second per-address cooldown when the attempt begins, even if the provider
  fails. Requests during that cooldown send no email and do not extend it.
  Verification and recovery cooldowns remain independent.
- If account creation succeeds but verification-email delivery fails, retain the
  unverified account and terms record. Report that the account was created but
  delivery failed, allow resend, and issue no session. Do not request registration
  again.
- Invalid, expired, or consumed links return the common error "Link is invalid
  or expired" without exposing account details or tokens. An incorrect password
  during verification does not consume an otherwise-valid verification link.
- Bind links to their account and purpose; verification and reset links cannot
  be interchanged. Concurrent use must preserve consumption and invalidation rules.
- Password reset preserves outstanding verification links until their approved
  expiry or successful verification. Verification requires the new current password.
- Recovery and verification destinations must be backend-approved. Reject arbitrary
  redirect destinations, keep tokens out of application logs, and provide completion
  contracts testable independently of finished frontend pages.

### Operational requirements and errors

- Add configurable IP-based throttling alongside per-address email cooldowns.
  Failed attempts must not permanently lock accounts. Initial thresholds remain
  to be documented before implementation approval.
- Production sessions use HTTPS-only secure, HTTP-only cookies, explicit trusted
  origins, credentialed CORS, and CSRF protection for state-changing requests.
  Verify deployment site arrangements before choosing cookie `SameSite` settings.
- Public authentication routes, including direct Better Auth routes, must enforce
  all approved rules. Unsupported operations are unavailable. Verify compatibility
  with the installed Better Auth version before selecting the integration approach.
- Compatibility checks determine the integration mechanism without changing
  approved behavior. Prefer supported Better Auth configuration and hooks. Where
  insufficient, use a small Aventix endpoint or extension that still relies on
  Better Auth for credentials and sessions. Make bypass routes unavailable.
  Finalize authentication paths and payloads only after checking the exact
  dependency version. If a requirement needs substantial custom authentication
  logic, present the conflict for a user decision before proceeding. The declared
  dependency range alone is not evidence of compatibility.
- Use stable machine-readable error codes without exposing internal details.
  HTTP conventions are: 400 invalid input; 401 missing/invalid authentication or
  incorrect credentials; 403 disabled/unverified access or insufficient role;
  409 duplicate email or outdated terms; 429 IP throttling; and 503 synchronous
  email-service failure for registration only. Recovery and verification-resend
  delivery failures retain their generic status and message, as do requests
  suppressed by the per-address cooldown.
- Persist audit records for successful password changes/resets, account
  disabling/re-enabling, and privileged provisioning. Never record passwords or
  raw tokens. An audit-log viewing API is outside Phase 1.

### Aventix-owned JSON response contract

- Successful operations return `data` containing only the approved public result.
- Rejections return `error` with a stable `code` and safe `message`. Validation
  errors may include field errors but must never echo submitted passwords or tokens.
- Validly formatted recovery and verification-resend requests return HTTP 200
  with the approved generic message, including per-address cooldown suppression
  and delivery failures.
- Registration email failure returns HTTP 503 with code
  `ACCOUNT_CREATED_EMAIL_FAILED`, stating that the account exists and resend is
  available. No session is issued.
- Missing legacy consent returns HTTP 403 with code `TERMS_ACCEPTANCE_REQUIRED`,
  disclosed only after correct credentials. Previously approved disabled-account
  and email-verification requirements remain in effect.
- Session credentials travel through cookies, not JSON response bodies.
- Better Auth-owned response shapes remain subject to compatibility verification;
  add adapters only where necessary to enforce approved requirements.

### Operation-level API contract

The following inputs and success outcomes are approved. Authentication paths and
exact field names must be checked against the exact Better Auth version before
finalization; the approved profile routes remain settled. JSON envelopes apply
to Aventix-owned endpoints as specified above. Session-cookie inputs are subject
to the previously approved origin and CSRF controls.

| Operation | Inputs | Successful outcome |
| --- | --- | --- |
| Registration | First/last name, email, password, optional phone, terms acceptance/version | HTTP 201: account created, verification required; no session |
| Login | Email, password | HTTP 200: permitted account information and session cookie |
| Email verification | Verification token and current password | HTTP 200: email verified; no session |
| Verification resend | Email | HTTP 200: approved generic message |
| Recovery request | Email | HTTP 200: approved generic message |
| Password reset | Reset token and new password | HTTP 200: password reset; no session |
| Authenticated password change | Session cookie, current password, new password | HTTP 200: password changed; current session retained |
| Logout | Session cookie, if present | HTTP 200: logged out; cookie cleared |
| Profile retrieval/update | Session cookie; allowed fields for updates | HTTP 200: permitted profile information |
| Current terms | None | HTTP 200: current version and document URL |
| Legacy consent | Email, current password, explicit acceptance/version | HTTP 200: acceptance recorded; no session |

### Roles

The system has three authenticated roles:

- `ATTENDEE`
- `ORGANIZER`
- `ADMINISTRATOR`

Roles are assigned only through trusted backend operations when accounts are
created. An account's role is fixed for its lifetime and must never be changed,
including for administrator accounts. Withdrawing access uses account disabling;
access under another role requires a separate account. See the
[account-role identity decision](../../docs/adr/0001-fixed-account-roles.md).

An `ORGANIZER` account cannot be converted to an `ATTENDEE` account. An organizer
who needs attendee access must create a separate attendee account using a
different normalized email address. The two accounts have independent
credentials, email verification, and sessions.

An `ATTENDEE` account cannot be converted to an `ORGANIZER` account. Becoming an
organizer requires a separate organizer account with a different normalized
email address; the attendee account remains an attendee account. Organizer
registration and approval remain outside Phase 1.

Administrator access requires a separate, dedicated account using a different
normalized email address from the person's attendee or organizer accounts.
Existing attendee and organizer accounts retain their roles rather than being
promoted. Administrator accounts are provisioned only through trusted backend
operations; public administrator registration and administrator
account-management endpoints are outside Phase 1.

Trusted Phase 1 account operations use local maintenance commands, not HTTP
endpoints: create a dedicated administrator account, disable an account by ID,
and re-enable an account by ID. Commands enforce approved identity, session
invalidation, and audit rules, verify the target database, and keep passwords
out of command arguments and logs. Access requires an authorized developer with
backend/database access. Organizer accounts for authorization tests use isolated
test fixtures; organizer onboarding remains outside Phase 1.

### Account Status

Supported account statuses:

- `ACTIVE`
- `DISABLED`

Disabled accounts must not retain access to protected functionality, including through previously established sessions.

Disabling an account invalidates all its existing sessions. Re-enabling the
account requires a fresh login; previously invalidated sessions must never
regain access. Administrator account-management endpoints remain out of scope.

Disabled accounts may use password recovery and reset. A reset does not change
their `DISABLED` status, verify their email, or issue a session. Login remains
blocked until a trusted backend operation re-enables the account.

Disabled accounts may complete email verification with the required link and
current password. Verification never re-enables the account or permits login.
With a correct password, login reports disabled access before reporting an
unverified email. Incorrect credentials retain the generic login response.

### Authorization

The backend must:

- Authenticate protected requests.
- Enforce role-based permissions.
- Check account status.
- Reject unauthorized access.
- Prevent users from modifying their own role or status.
- Protect sensitive user information.

Every protected request checks the current server-side account status; cached
session information must not preserve disabled access. A request authorized
before disabling may finish.

Organizer approval and resource ownership authorization will be completed in later phases.

Each protected operation explicitly lists its permitted roles. Roles do not
automatically inherit permissions from one another; `ADMINISTRATOR` does not
implicitly receive `ORGANIZER` access. Shared self-service operations, including
editing one's own profile, explicitly permit all three authenticated roles,
subject to account-status and authentication requirements.

Phase 1 role restrictions may be demonstrated with test-only routes exercising
the real authentication and authorization middleware. Tests must cover allowed
and denied requests for each role, including that administrators do not inherit
organizer access. These routes must never be mounted in production; business
endpoints outside Phase 1 are not required for this demonstration.

## Existing Architectural Decisions

The following decisions are already documented:

1. Better Auth manages authentication and sessions.
2. Authentication uses secure cookie-based sessions.
3. Better Auth and Aventix share one `User` identity.
4. Prisma manages database access.
5. New registrations create attendee accounts.
6. User roles and account statuses are server-controlled. Roles are fixed at
   account creation; account status may change through trusted backend operations.
7. Password changes invalidate the user's other active sessions.
8. The Express backend independently enforces authentication and authorization.
9. Application API routes use `/api/v1`.
10. Better Auth routes are provisionally mounted at `/api/auth/*`, subject to verification against the installed version.

Do not reopen approved decisions unless an implementation conflict or inconsistency is discovered.

## Out of Scope

This phase does not include:

- Frontend implementation
- Frontend API integration
- Frontend route protection
- Organizer applications and approval workflows
- Administrator account-management endpoints
- Event management
- Booking and payment functionality

The authentication API contract must still be documented for future frontend integration.

## Dependencies

Phase 0 — Project Foundation must provide:

- Working Express server
- PostgreSQL database connection
- Prisma configuration and required schema
- Environment configuration
- Centralized error handling
- Input validation structure
- Backend testing setup

## Acceptance Criteria

The backend must demonstrate that:

1. A new attendee can register successfully.
2. Duplicate email registrations are rejected.
3. Invalid registration data is rejected.
4. A registered user can log in with valid credentials.
5. Invalid login credentials are rejected.
6. Authenticated sessions can access protected endpoints.
7. Unauthenticated requests are rejected.
8. Users can retrieve and update permitted profile information.
9. Attendees cannot access organizer- or administrator-only endpoints.
10. Users cannot modify their own role or account status.
11. Disabled accounts cannot access protected functionality.
12. Logout invalidates the applicable session.
13. Invalidated sessions cannot access protected endpoints.
14. Password recovery and reset function securely.
15. Password changes invalidate other active sessions.
16. All required backend behavior can be verified without the frontend.

Automated acceptance tests must cover all confirmed rules, including failure
paths, direct-route bypass attempts, expiry, concurrent token use, and session
invalidation. Use the dedicated test database and controlled mail substitute;
no completed frontend is required.

## Planning status and remaining verification

The user explicitly approved the consolidated specification as the planning
baseline on 2026-10-19, with the technical prerequisites below still outstanding.
This approval does not authorize implementation or GitHub publication. Resolve
the prerequisites and obtain separate implementation approval before code changes.

The interview recommendations are accepted, with Philippine-mobile-only phone
numbers and school-project implementation scope. This records requirements
approval, not authorization to begin implementation in this planning session.

Before implementation approval:

1. Verify Better Auth version compatibility, especially password-gated email
   verification, multiple outstanding links, token invalidation, fixed session
   expiry, and consistent enforcement through every exposed authentication route.
2. Document initial IP-throttle thresholds.
3. Verify frontend/backend deployment origins and select cookie `SameSite`
   behavior. Select an affordable email provider and approved link destinations.
4. Finalize version-compatible authentication paths, exact request field names,
   remaining machine-readable error codes, and terms-operation routes using the
   approved operation and response contracts. Inspect existing data without
   fabricating consent.
5. Review the consolidated specification with the user and obtain explicit
   implementation approval. Resolve conflicts through questions rather than
   silently weakening approved behavior.

## Definition of Done

Phase 1 backend implementation is complete when:

- Authentication and account-management functionality is operational.
- Sessions are securely managed.
- Role-based authorization is enforced.
- Account-status restrictions are enforced.
- Protected user fields cannot be modified through ordinary account operations.
- Authentication APIs have documented contracts.
- Required backend tests pass.
- No frontend dependency prevents verification.

Frontend integration will be tracked separately and completed when the relevant Next.js pages become available.

## Instructions for Grill With Docs

This document defines the intended scope and currently approved requirements for Phase 1.

Before implementation:

1. Review the relevant Aventix project documentation.
2. Identify missing requirements, ambiguities, contradictions, and unresolved technical decisions.
3. Ask focused questions one at a time where clarification is necessary.
4. Distinguish approved decisions from proposed implementation details.
5. Do not silently introduce new business rules.
6. Record confirmed terminology and architectural decisions using the documentation workflow supported by `grill-with-docs`.
7. Do not modify application code, Prisma schemas, migrations, or configuration files during this planning session.
8. Do not begin implementation until the specification has been reviewed and explicitly approved.

The goal is to produce a clear, agreed-upon specification that can later guide implementation.
