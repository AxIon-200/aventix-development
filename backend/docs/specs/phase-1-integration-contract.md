# Phase 1 integration contract — issue #55

Prepared 2026-10-19 for [#55](https://github.com/AxIon-200/aventix-development/issues/55), under [#33](https://github.com/AxIon-200/aventix-development/issues/33). Status: technical planning complete for localhost-first scope; consolidated implementation contract explicitly approved on 2026-10-19. No approval recorded here starts #56 or lifts this task's documentation-only restriction. GitHub publication/closure remains separate.

The [Phase 1 requirements](../../documents/phases/phase-1-authentication.md) remain authoritative. The [approved specification](phase-1-authentication.md) supplies the test boundary and ticket sequence; [ADR 0001](../adr/0001-fixed-account-roles.md) preserves separate, immutable-role identities. This document resolves integration details rather than changing those rules.

## Approval record

On 2026-10-19, the user answered "yes" to: "Do you approve the proposed extension and transaction boundary?" This explicitly approves the proposed Aventix extension and coordinated transaction approach while retaining Better Auth credentials and sessions. The technical findings below retain their source-review limitations.

In a subsequent clarification on 2026-10-19, the user confirmed: "localhost first, yes, no we dont have" in response to the localhost-first scope, mandatory recovery/reset for legacy normalized-password hashes, and availability of a sending domain and approved terms. This approves localhost-first planning and the legacy reset transition, and confirms that neither the sending domain nor genuine terms currently exists. Those absent resources are explicit activation/release gates, not unresolved technical choices for this local implementation plan.

On 2026-10-19, the user then answered "yes" to: "Do you approve the consolidated contract?" after presentation of the finalized localhost-first implementation approach. This records final implementation approval of the consolidated endpoint/error/persistence/operational contract, including the approved legacy transition and explicit activation/release gates. The #55 planning and approval work is complete locally; do not request these approvals again.

These approvals do not authorize GitHub publication or closure, code/configuration/schema changes in this task, or starting #56; the original explicit restrictions remain in effect. Subsequent implementation may follow this approved contract when the user explicitly authorizes starting the relevant ticket.

## Prerequisite resolution

The follow-up investigation resolves the available technical evidence and distinguishes decisions needed for the plan from resources needed to activate it. Provider provisioning, production hosting, genuine legal text, and full lifecycle database tests are not things a documentation-only investigation can manufacture. The approval requirement still applies; moving a prerequisite to a release gate requires an explicit scope decision, not an assumption that the resource already exists.

| Prerequisite | Concrete resolution | Status |
| --- | --- | --- |
| Exact dependency/runtime compatibility | Installed the unchanged lockfile in an isolated temporary directory; loaded Better Auth/core/Prisma adapter 1.7.7 and utils 0.4.2; 14 focused runtime assertions passed | Verified for the mechanisms exercised; see the [reproducible runtime report](phase-1-better-auth-compatibility.md#follow-up-isolated-runtime-verification) |
| Extension and transaction boundary | Supported plugin endpoints, endpoint-key replacement, password override, and transaction-adapter context; required database writes must share the transaction | Boundary approved; real PostgreSQL rollback/race proof belongs to implementation acceptance |
| Deployment and cookie contract | Approved initial target: frontend `http://localhost:3000`, API `http://localhost:5000`, direct access, trust proxy=false, exact origins, host-only HttpOnly SameSite=Lax cookie with development-only Secure=false; production remains HTTPS-only | Localhost-first scope approved; actual production hosts and proxy/browser verification are release gates |
| Email selection | Select Resend's transactional HTTPS API; controlled capture for automated tests, `onboarding@resend.dev` option for a real-email smoke check to the Resend account's own mailbox; verified owned-domain sender for arbitrary recipients | No sending domain exists, confirmed by owner; domainless single-mailbox demo is the feasible initial real-delivery path once an account is supplied. Credentials and actual delivery remain activation gates |
| Terms contract | GET `/api/v1/terms` returns a mandatory owner-reviewed `{ version, documentUrl }`; load the same approved pair for validation and recording. Tests use clearly identified fixture terms, never historical consent | Owner confirms no approved terms exist. Mechanism resolved; authoring/approval/hosting is an activation gate before real-user registration or acceptance |
| Legacy credentials | Version-tagged exact-password hashes for all new credentials; mandatory genuine recovery/reset for old unversioned hashes, preserving account identity, status, role, consent, and verification | Mandatory legacy reset approved; no temporary normalized-password login exception. Exact transition/error contract is below |
| Existing-account inventory | Before any migration/backfill, use a read-only, identity-verified aggregate inventory; retain the documented collision/consent/credential checks and fail on ambiguous data | No local `.env`/`.env.test` or database connection is available; no zero-account assumption. Actual target-data preflight remains required before database changes |

Detailed [operational findings](phase-1-operational-prerequisites.md) cite provider constraints and the repository search. This matrix replaces the earlier implication that an actual production deployment, purchased sending domain, or authored legal text must be created during #55. It does not change the approved security behavior or mark unverified activation gates passed.

## Evidence and verification limits

- Read both live issues, including their acceptance criteria; neither has comments supplying deployment facts.
- `package.json` declares Better Auth `^1.7.7`; `package-lock.json` resolves Better Auth and its core to `1.7.7`. There is no backend `node_modules` installation in this checkout. Follow-up isolated installation of unchanged manifest/lock copies verified exact versions and 14 focused runtime checks; it does not claim the application or PostgreSQL integration has been tested. See the [version-specific findings](phase-1-better-auth-compatibility.md).
- [Current auth configuration](../../src/lib/auth.ts) enables basic email/password authentication and additional user fields. It does not implement the approved lifecycle. [Current app](../../src/app.ts) exposes the native wildcard handler before JSON parsing. Preserve that ordering when implementing the integration.
- [Existing HTTP tests](../../test/auth.test.ts) assume native 200 registration and immediate session access. Those expectations conflict with approved 201 registration, genuine consent, verification, and separate login; change the tests in the relevant implementation tickets.
- [Environment example](../../.env.example) documents only localhost frontend/backend origins. No deployment manifest or verified production host/proxy topology was found. No private environment values were printed or copied.
- [Schema inspection](../../prisma/schema.prisma) establishes nullable consent fields, an email uniqueness constraint, Better Auth credential/session/verification tables, and an existing `ActivityLog`. It does not establish the contents or migration state of any live database. No database was contacted, and no accounts were modified.

## Approved integration boundary and finalized approach

Retain Better Auth for credential records, configured password hash/verify dispatch, session issuance/validation, signed cookies, and session deletion. Prefer its supported configuration and hooks where those fully satisfy the approved behavior. Use a bounded Aventix extension for consent, profile policy, stateful verification/reset links, delivery cooldowns, safe public results, and coordinated transactions. Do not introduce a second session implementation.

The locked default password helper applies NFKC normalization before scrypt. This conflicts with the approved exact password preservation requirement, separately from its UTF-16 length checks. Propose the supported `emailAndPassword.password.hash/verify` override using a version-tagged raw-UTF-8 scrypt implementation with vetted parameters and timing-safe comparison, still invoked through Better Auth's password interface. No trimming or normalization is permitted. This is an explicit implementation decision for user approval, not a claim that the default helper already complies.

Finalize the proposed version-1 hash parameters as scrypt N=131072, r=8, p=1, a cryptographically random 16-byte salt, and a 64-byte output, using Node's asynchronous `crypto.scrypt` with a 256 MiB `maxmem` ceiling and timing-safe byte comparison. Store a versioned format with the fixed parameters, salt, and derived key; strictly validate the supported format and bounded parameters before verification. Do not permit stored data to select unbounded work. These cost parameters follow [OWASP's scrypt recommendation](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt); [Node documents the scrypt memory bound and salt guidance](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback). Benchmark and bound concurrent hashing on the actual deployment before activation; a memory budget conflict must be reviewed rather than silently reducing the cost. This is a proposed configuration of the already approved override boundary, not code implemented in #55.

Legacy hashes cannot reveal which Unicode spelling the user originally entered. Automatically rehashing whichever NFKC-equivalent spelling logs in would choose a new exact password without establishing the original. The user approved mandatory genuine recovery/reset into the versioned exact-password format for existing unversioned/default hashes. No temporary normalized-password login exception or automatic rehash is permitted. See the authoritative [legacy credential transition](../../documents/phases/phase-1-authentication.md#legacy-credential-transition). A version-aware verifier can recognize old credentials solely to enforce the transition and same-password rejection; it cannot create a session or silently upgrade the password.

For login, preserve generic incorrect-credential errors and the approved correct-password ordering: disabled, unverified, missing consent; then return HTTP 403 `PASSWORD_RESET_REQUIRED` when the stored credential is legacy. For protected requests, apply the normal current status/verification/consent checks, then reject legacy credentials with the same code; previously issued sessions cannot bypass recovery. Verification still checks a valid purpose-bound link and current password, and legacy consent still checks correct credentials, active status, and verified email; if their remaining blocker is a legacy credential, return `PASSWORD_RESET_REQUIRED` before any verification/consent mutation. Incorrect verification passwords never consume a valid link. After recovery, a still-valid verification link requires the new exact password.

The legacy helper is used only for transitional credential matching and reuse detection. A reset candidate accepted by the old verifier is rejected as `PASSWORD_REUSE`; the original exact spelling is unrecoverable. Recovery/reset remains available for disabled and unverified accounts. Reset writes the new versioned hash and performs the already approved atomic link/session invalidation and audit, without changing role/status/consent/verification or issuing a session. All future credentials use the exact-password format. Unknown/malformed hash formats fail closed without logging their contents. Before activating the transition, inventory the target database and make recovery delivery available to affected accounts; do not delete accounts or reset passwords administratively to avoid this gate.

Password-gated verification and account-wide, concurrent link invalidation are application-owned behavior beyond the default verification handler. Credential replacement, reset-token consumption, required session revocation, and the success audit must commit together. An after-hook that runs after a library credential update is insufficient: failure would leave a partially completed security operation. The compatibility report identifies the transaction and extension limits; approval must explicitly cover the custom lifecycle boundary before implementation begins. If a supported extension cannot provide the required transaction boundary, stop and present that conflict rather than privately importing library internals or weakening atomicity.

The public surface is a strict method/path allowlist. All other native Better Auth operations are unavailable, including native signup, link-only verification, alternate reset completion, update-user, change-email, delete-user, password setup, provider linking, and session-management APIs. An Express boundary rejects unmatched routes before dispatch; plugin hooks and database policy checks provide defense in depth. Internal calls to Better Auth APIs must not accidentally re-expose their native HTTP paths. Unknown paths return 404; wrong methods on a known public path return 405 with `Allow`. Test path normalization, trailing slashes, alternate native paths, and all enabled plugin routes.

Several proposed paths share native POST routes. The plugin must replace the native endpoint registry keys `requestPasswordReset`, `resetPassword`, `changePassword`, and `verifyEmail`, rather than merely add a differently named endpoint at the same path. The locked router spreads plugin endpoint keys over native keys; test that dispatch reaches only the replacement. Do not apply `disabledPaths` to a shared path, which would also disable its approved replacement. A method/path allowlist alone cannot distinguish two handlers with the same route.

## Proposed public HTTP contract

All mutations use JSON with `Content-Type: application/json`, except logout which also accepts no body. Reject unknown input fields; do not accept role, status, derived `name`, verification state, arbitrary callback URLs, or `rememberMe`. Email normalization and validation follow the authoritative requirements. Public endpoints are Aventix-owned, including those under `/api/auth`; the table is a deliberate adapter/extension contract, not a claim that native handlers already match it.

| Method and path | Exact JSON fields | Success `data` (HTTP status) |
| --- | --- | --- |
| POST `/api/auth/register` | `firstName`, `lastName`, `email`, `password`, optional `phoneNumber`, `termsAccepted`, `termsVersion` | `{ verificationRequired: true }` (201); no session |
| POST `/api/auth/login` | `email`, `password` | `{ user: Profile }` (200); session cookie only |
| POST `/api/auth/verify-email` | `token`, `currentPassword` | `{ emailVerified: true }` (200); no session |
| POST `/api/auth/resend-verification` | `email` | `{ message: "If this address is eligible, a verification email will be sent." }` (200) |
| POST `/api/auth/request-password-reset` | `email` | `{ message: "If an account exists for this address, a password-reset email will be sent." }` (200) |
| POST `/api/auth/reset-password` | `token`, `newPassword` | `{ passwordReset: true }` (200); no session; clear this browser's session cookie |
| POST `/api/auth/change-password` | `currentPassword`, `newPassword`; session cookie | `{ passwordChanged: true }` (200); retain current session and original expiry |
| POST `/api/auth/logout` | No fields; optional session cookie | `{ loggedOut: true }` (200); clear authentication cookies, invalidate requesting session only |
| GET `/api/v1/me` | No body; session cookie | `{ user: Profile }` (200) |
| PATCH `/api/v1/me` | One or more of `firstName`, `lastName`, `phoneNumber`; session cookie | `{ user: Profile }` (200) |
| GET `/api/v1/terms` | No body | `{ version: string, documentUrl: string }` (200) |
| POST `/api/auth/accept-terms` | `email`, `currentPassword`, `termsAccepted`, `termsVersion` | `{ termsAccepted: true }` (200); no session |

`Profile` contains only `id`, `firstName`, `lastName`, derived `name`, `email`, `phoneNumber`, `role`, `status`, `emailVerified`, `termsVersion`, `termsAcceptedAt`, `createdAt`, and `updatedAt`. Nullable fields use JSON null; timestamps use UTC ISO 8601 strings. Never serialize Better Auth's raw result, credential accounts, session tokens, or internal verification records. Successful envelopes are `{ data: ... }`. Native `/get-session` is unavailable publicly; `/api/v1/me` is the approved authentication/profile read contract.

Registration phone omission means no phone; a supplied value must be a valid string. Only profile editing supports null to clear. Terms acceptance is literal boolean true. Names/passwords use Unicode code-point lengths, preserving passwords exactly. Reset/change compare against the current credential and reject reuse. Preserve duplicate-registration disclosure as approved; do not change an existing account.

Legacy consent checks credentials before disclosing status, verification, or missing consent. Disabled takes precedence over unverified; missing consent follows both. Genuine recorded acceptance remains sufficient when future versions appear: future reacceptance is deferred. Legacy consent must never replace an existing genuine record merely because a client submits a different version. An already-consented eligible account may return success without changing its acceptance timestamp/version; the request must still explicitly accept the currently published terms.

The terms endpoint requires a real, reviewed document URL and version before registration can ship. Neither exists in current configuration. Do not invent a legal document, publish a placeholder as real terms, or fabricate acceptance for existing users. Treat the document/version as a release input, supplied by the project owner.

A real terms document need not be authored to test the terms integration: automated tests inject a clearly labeled fixture document/version. Outside tests, validate the owner-supplied pair during startup and refuse to activate real-user registration/legacy acceptance when absent; never silently use the fixture or default a version. The source of the pair is one immutable configuration snapshot for terms retrieval, request comparison, and the persisted acceptance. Hosting actual supplied text at a fixed backend path is feasible in later implementation if no external document host is available. No legal content or configuration file is created here.

## Error catalogue and precedence

Errors use `{ error: { code, message, fields? } }`. Optional `fields` maps input field names to safe descriptions and never echoes submitted values. Logout's approved idempotence applies after request-origin checks; it does not exempt the operation from CSRF controls.

| HTTP | Code | Safe message/use |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Invalid request; malformed email, forbidden fields, missing/false acceptance, invalid Unicode length, invalid phone, empty patch |
| 400 | `LINK_INVALID_OR_EXPIRED` | `Link is invalid or expired`; missing account, wrong purpose, expiry, consumed or superseded link |
| 400 | `PASSWORD_REUSE` | New password must differ from current password |
| 401 | `INVALID_CREDENTIALS` | `Invalid email or password`; identical for unknown login email and incorrect password |
| 401 | `CURRENT_PASSWORD_INCORRECT` | Current password is incorrect; password-gated verification/change failure changes nothing |
| 401 | `AUTHENTICATION_REQUIRED` | Authentication required; missing, invalid, expired, revoked session |
| 403 | `ACCOUNT_DISABLED` | Account access is disabled; login reveals only after correct credentials |
| 403 | `EMAIL_VERIFICATION_REQUIRED` | `Email verification required`; login reveals only after correct credentials |
| 403 | `TERMS_ACCEPTANCE_REQUIRED` | Terms acceptance required; login reveals only after correct credentials |
| 403 | `PASSWORD_RESET_REQUIRED` | Reset your password through password recovery before continuing; only after valid credentials/session and the preceding access checks |
| 403 | `FORBIDDEN` | Insufficient permission for an explicit role allowlist |
| 403 | `ORIGIN_NOT_ALLOWED` | Request origin is not allowed |
| 409 | `EMAIL_ALREADY_REGISTERED` | Email is already registered; no other account state |
| 409 | `TERMS_VERSION_OUTDATED` | Current terms version is required |
| 429 | `RATE_LIMITED` | Too many requests; include `Retry-After` in seconds |
| 503 | `ACCOUNT_CREATED_EMAIL_FAILED` | Account was created, but verification email could not be sent. Request another verification email. |
| 500 | `INTERNAL_ERROR` | Request could not be completed; no stack, provider response, token, or database details |

Unknown route/method use `NOT_FOUND`/`METHOD_NOT_ALLOWED` with 404/405. Reject unsupported content types with 415 `UNSUPPORTED_MEDIA_TYPE` and oversized JSON with 413 `PAYLOAD_TOO_LARGE` (proposed limit: 16 KiB). These transport errors do not expose account state.

Apply origin/content/body validation and IP throttling before account outcomes. A validly formatted recovery/resend request always uses its approved 200 generic result for account eligibility, per-address cooldown, and provider failure. Infrastructure failure before the operation can safely run may return a generic 500, identically across account states. Provider failure never becomes a 500/503 on those two operations. Verification checks token validity before checking its password; a wrong password leaves a valid link usable. Protected requests re-read current status, verified state, and genuine consent after authenticating the session.

## Token, concurrency, and persistence preparation

Proposed preparation for implementation, not an approved migration:

- Reuse `User` and Better Auth `Account`/`Session` identities. Inspect actual data before proposing a migration: normalized-email collisions, allowed role/status values, null/malformed names and consent pairs, credential provider records, and unverified accounts. Use aggregate counts without printing emails, credentials, or tokens. No live-data inventory was possible in this checkout; do not infer that there are no legacy accounts.
- Existing consent columns are nullable, which supports genuine legacy acceptance. Preserve valid records and existing verification states. Never set verified=true or fill consent from account creation dates. Case-sensitive email uniqueness alone does not prevent normalized collisions; resolve actual collisions through owner review before normalization/backfill or an enforcing constraint. Role/status enums exist but `User` currently stores strings: plan constraints only after inventory.
- Add purpose-bound link records with account ID, cryptographic token digest (not raw token), issuance/expiry, and consumption state; unique token digest and account/purpose indexes. Use independent random tokens with at least 256 bits of entropy. Verification lasts 24 hours, reset 30 minutes. Retain earlier links on resend; invalidate all same-purpose links on successful completion. Password reset preserves verification links.
- Persist cooldown state keyed by normalized address and purpose, using an atomic conditional claim. Concurrent deliveries for the same key cannot both win. Commit the cooldown when an eligible delivery attempt starts, including initial registration and provider failure; a suppressed attempt does not update it. Do not hold a transaction open during the network send.
- Serialize all credential/lifecycle mutations for an account with a common PostgreSQL transaction lock. After acquiring it, re-read credentials, account gates, token validity, and session validity as appropriate. Reset/change, verification, link issuance, login session issuance, legacy consent, and disable/re-enable must share the protocol. This prevents two different links both succeeding, verification using a just-replaced password, a concurrent email attempt reviving an old link, or login creating a session after disabling. A committed new link issued after a completed reset has its own new lifetime; it must not be confused with a link outstanding before that reset.
- Atomically reset credential + consume all reset links + delete all sessions + write audit. Atomically change credential + invalidate reset links + delete other sessions + write audit; retain the current session token and original expiry, without rotating into a fresh seven-day session. Verification atomically marks verified and consumes all verification links. Failed password checks and same-password rejections commit none of these changes.
- Reuse `ActivityLog` if it can record actor, subject, action, and server timestamp without secrets. Require durable audit in the mutation transaction for password reset/change, status changes, and privileged provisioning. Use action names `PASSWORD_RESET`, `PASSWORD_CHANGED`, `ACCOUNT_DISABLED`, `ACCOUNT_REENABLED`, and `ADMINISTRATOR_PROVISIONED`. No email bodies, submitted payloads, raw tokens, or passwords in metadata.
- Roll back on failed audit persistence, failed token consumption, or failed session invalidation. Handle retryable serialization errors with bounded retries, repeating policy checks. External email happens after committed account/link/cooldown state. An email-provider acceptance is not proof of inbox delivery.

The proposed concrete transaction mechanism is a Better Auth plugin using the publicly exported `runWithTransaction` and `getCurrentAdapter` from `@better-auth/core/context`, with Prisma adapter `transaction: true`. Define lifecycle tables in the plugin schema, mapping audit storage to `ActivityLog` where suitable. Every credential, link, session, cooldown, and audit write inside the transaction uses that transaction's adapter; calls on the global Prisma client do not join it. Acquire the per-user row lock through an adapter update of a dedicated lifecycle-lock nonce at transaction start, then re-read authoritative state under PostgreSQL's normal READ COMMITTED behavior. Store the nonce on the existing user row so every existing account already has a lock target; its initial migration value must carry no consent/verification meaning. This is a row-lock mechanism, not a claim that ordinary adapter update provides compare-and-swap. Acquire the account lock before purpose/cooldown locks consistently to avoid deadlocks. Every relevant command and endpoint must follow this protocol. Issue cookies only after a successful commit.

This is substantial custom lifecycle orchestration even though the APIs are exported. The compatibility report is required reading before approving it; source inspection supports the mechanism, but rollback and race behavior still need HTTP/database proof in implementation. Ordinary independent API calls followed by Prisma cleanup do not establish atomicity. Do not rely on after-commit hooks for required audit or revocation writes. If any required adapter operation cannot participate in the transaction or account lock, stop for a decision rather than falling back to partial commits.

## Sessions and browser controls

Use 604800-second Better Auth sessions with refresh disabled, persistent cookies, no remember-me variation, and cookie-cache/secondary session caching disabled. Every protected operation reads current database account gates. Cookies must expire by the stored original session expiry; reissuing a cookie must use remaining lifetime, never another seven days. Password change does not replace/renew the current session. If an operation cannot validate the session store, fail closed.

Use host-only, HTTP-only cookies with path `/`; production is HTTPS with `Secure`. Clear cookies using their exact original name/path/domain attributes. No session credentials in JSON, URLs, browser local storage, or logs. No cross-subdomain cookie sharing is needed when the API host owns the cookie.

| Arrangement | Cookie/CORS contract | Verification status |
| --- | --- | --- |
| Local frontend `http://localhost:3000`, API `http://localhost:5000` | SameSite=Lax, development-only Secure=false, exact frontend origin, credentials=true; consistently use localhost rather than mixing IP names | User-approved initial scope; browser smoke verification remains implementation work |
| Same-site HTTPS frontend/API, including sibling subdomains | SameSite=Lax, Secure=true, exact frontend origin, credentials=true if cross-origin; host-only API cookie | Recommended production arrangement; actual origins not supplied |
| Cross-site hosting on unrelated provider domains | SameSite=None, Secure=true, exact origins; browser third-party-cookie restrictions may still prevent sessions | Do not silently select this; requires actual host/browser verification or same-site proxy/domain arrangement |

Source: [cookie attribute and SameSite behavior](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie). Actual production origins and proxy topology remain owner-supplied facts; example URLs are not evidence of deployment. No wildcard/preview-host origin trust. Keep API canonical URL independent of untrusted Host/forwarded headers.

For every state-changing browser endpoint, including login/logout and pre-authentication operations, require an exact approved `Origin` and JSON content type (logout may be bodyless). Reject missing/null/untrusted Origin; backend HTTP clients and tests send the explicit approved origin. Do not rely on CORS alone as CSRF protection. Preserve Better Auth origin/CSRF checks for its handlers; the Aventix boundary must cover custom handlers too. GET terms/me do not mutate authentication state. No public GET completes verification or reset.

## IP throttling and trusted proxies

Initial configurable limits below are proposals for the school demonstration, counted across all outcomes rather than only successful requests. Apply both aggregate and operation limits; the stricter wins. Windows are fixed UTC duration buckets with atomic increments. Return 429 with the remaining window as `Retry-After`; no permanent account lock.

| Bucket per canonical client IP | Maximum / window |
| --- | --- |
| All authentication mutations combined | 100 / 15 minutes |
| Registration | 5 / 15 minutes |
| Login | 20 / 15 minutes |
| Verification completion | 10 / 15 minutes |
| Verification resend | 10 / 15 minutes |
| Recovery request | 10 / 15 minutes |
| Reset completion | 10 / 15 minutes |
| Password change | 10 / 15 minutes |
| Legacy consent | 10 / 15 minutes |
| Logout | 60 / 15 minutes |

The independent approved per-normalized-address email cooldowns remain 60 seconds; IP limits never replace them. Normalize IPv4-mapped addresses; use a documented IPv6 /64 network key to reduce trivial address rotation. Persist counters in PostgreSQL with key/window/expiry so restarts and multiple processes do not bypass limits; cleanup expired counters in ordinary maintenance. No Redis or background queue required. Registration's initial email counts against the same verification-address cooldown.

Direct local access uses `trust proxy=false` and ignores client-supplied forwarding headers. Behind hosting proxies, configure only verified proxy CIDRs or a verified fixed topology, ensure the last trusted proxy overwrites forwarded headers, and prevent untrusted direct access. Do not use blanket `trust proxy=true` or assume one hop without evidence. All authentication handlers must receive the same canonical IP; reject spoofing rather than letting Better Auth and Express count different addresses. [Express documents why trust must match the actual proxy arrangement](https://expressjs.com/en/guide/behind-proxies/). Production proxy values cannot be finalized until the actual host is identified.

## Email provider and completion destinations

Select Resend's transactional HTTPS API, called through one injectable mail boundary using Node's fetch; no SDK is required. Its [current pricing](https://resend.com/pricing) documents 3,000 emails per month, a 100-email daily cap, and three domains on the free plan; actual available quota remains account-specific. A domainless single-mailbox demonstration can use `onboarding@resend.dev` only to the Resend account's own email address, as documented in the [testing-domain restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain). General delivery requires a verified owned/delegated domain and its sender. [Verified-domain setup](https://resend.com/docs/dashboard/domains/introduction) requires DNS work. Domain availability and sender address are not yet confirmed; no paid plan, domain purchase, or provider account is authorized here. Domainless smoke delivery is a restricted demonstration, not general delivery for arbitrary registrations. Automated tests retain the controlled mail substitute.

Use synchronous bounded delivery (proposed 10-second timeout, no automatic resend on uncertain acceptance), with plain-text and escaped HTML versions, and no click/open tracking for credential links. Log a safe failure category and correlation ID without tokens, mail content, provider response payloads, or credentials. Preserve registration's account-created 503 behavior and recovery/resend privacy. A later explicit request can send again after cooldown.

To avoid dependence on unfinished frontend pages, propose fixed API-owned, read-only landing resources: GET `/api/auth/verification` and GET `/api/auth/password-reset`. Mail links use the configured canonical API origin plus those paths and a URL fragment `#token=...`; fragments avoid sending tokens in request URLs/access logs. GET only supplies a minimal static explanation of the relevant JSON completion endpoint; it never verifies, consumes tokens, or sets a session. Tests capture the mail link, extract the fragment, and submit the token and password via the documented POST. A browser user may supply the fragment to an HTTP client; building frontend forms remains outside this phase. Responses use `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, no external assets, and no redirect. These two read-only landing paths are explicit exceptions to the authentication-mutation route table and must be included in the public allowlist.

No request-supplied redirect/callback URL is accepted. Future frontend completion pages require separately approved exact destinations. Domain/origin values must be configured from owner-confirmed hosts before sending real links. Disable body/header/cookie logging for auth operations and ensure proxy/provider instrumentation does not retain credential data.

## Verification and approval checklist

The initial planning checks were document/source review and relative-link validation. Follow-up prerequisite work installed copied locked dependencies in a temporary directory with lifecycle scripts disabled and ran 14 disposable runtime assertions, all passing. These use memory storage and an instrumented transaction adapter; they are not application tests or PostgreSQL integration proof. No migrations, backend dependency installation/configuration changes, provider sends, or database writes occurred. The unchanged copied manifest and lockfile were compared against the originals by SHA-256.

Implementation validation must use [the existing test-environment checks](../../test/setup.ts): NODE_ENV=test, required database variables, development/test URL separation, and expected Supabase test project identity before writes. Preserve them. Use HTTP integration tests with real Better Auth/Prisma, controlled email capture/failure, deterministic time, and explicit request origins. Cover native-route denial, exact public envelopes, Unicode boundaries, cookie persistence/nonrenewal, concurrent lifecycle operations, provider failure/cooldown, genuine legacy consent, all role pairings and status gates, and durable audit rollback. Verify multiple simultaneous links and races between different link values, password changes, session issuance, and disabling. Run typecheck and relevant tests in each implementation ticket; perform real email and browser/proxy smoke checks at release.

Technical prerequisite decisions for the localhost-first plan are finalized. The user explicitly approved the consolidated implementation contract on 2026-10-19, completing #55's local planning and approval work. This is distinct from starting #56. No GitHub closure/publication is authorized by this documentation update, so the remote issue state is not changed or claimed closed.

Implementation and activation gates remain visible:

1. Install the backend's locked dependencies and configure the identity-verified dedicated test database before application integration tests. Prove lifecycle rollback/concurrency and database compatibility as the relevant features are implemented; isolated runtime checks are not those proofs.
2. Use fixture terms and controlled email in automated tests. Before any real-user registration/legacy consent, supply genuine owner-approved terms text/version/URL. Do not enable fixture terms outside tests.
3. Before real delivery, configure a Resend account/API credential privately and its owner mailbox for the domainless demonstration. Before arbitrary-recipient delivery, verify an owned/delegated sending domain. Before enforcing a legacy transition against actual accounts, inventory the database and ensure those accounts can receive recovery mail.
4. Before public deployment, select actual HTTPS frontend/API hosts, verify proxy/IP handling and browser cookies, approve the corresponding production contract, and perform real delivery/browser smoke checks. Local-first approval does not waive production requirements.

These gates are not unfinished #55 technical research or claims of completed release setup. They are mandatory checks in later implementation/activation work. The original instruction not to start #56 remains in force even after final approval of this contract, until the user explicitly changes that instruction.

No application code, schema, migrations, or configuration is changed by this planning ticket. The earlier Phase 1 requirements and fixed-role ADR remain unchanged.
