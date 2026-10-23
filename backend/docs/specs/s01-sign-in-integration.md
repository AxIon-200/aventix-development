# S01 sign-in, current account and sign-out — #107

Implementation of [#107](https://github.com/AxIon-200/aventix-development/issues/107).
Account policy remains in [Phase 1 requirements](../../documents/phases/phase-1-authentication.md)
and the [HTTP contract](phase-1-integration-contract.md).

## Local transport

Run Next.js at `http://localhost:3000` and Express at `http://localhost:5000`.
Next rewrites both `/api/auth/*` and `/api/v1/*` to `AUTH_BACKEND_URL`, which
defaults to `http://localhost:5000`. This server configuration must be an HTTP(S)
origin without credentials, paths, query strings or fragments. Request `Host`,
`Origin` and forwarding headers never select the target. Restart Next after
changing its configuration. Keep `localhost` consistent across both services.

Browser account requests use relative frontend-origin URLs, `credentials: include`,
`cache: no-store` and a bounded timeout. Mutations use JSON. The rewrite passes
the original mutation Origin to Express; it does not substitute the trusted
frontend Origin for an untrusted caller. Express retains exact Origin checks,
its JSON checks and its existing Better Auth middleware ordering.

Server account reads use the configured Express origin directly and explicitly
forward only the requesting cookie. They use no persistent identity cache;
Next's development Server Component HMR fetch cache is disabled as well.
The login/registration account screen uses this read for its initial identity,
then the browser confirms it through `/api/v1/me`.

Cookies remain Better Auth's host-only, HttpOnly, SameSite=Lax cookies with path
`/`, Secure=false for this HTTP localhost arrangement. Cookies are scoped to the
host, not a port: using localhost on both ports is intentional. Login retains
the persistent seven-day, nonrenewing session; there is no remember-me input.
Logout forwards the backend's clearing cookies without changing their attributes.

Express still uses `trust proxy=false`. The immediate socket peer is Next's
loopback connection, so clients through this local proxy intentionally share
that peer's IP throttle bucket. Changing `X-Forwarded-For`, `Forwarded`,
`X-Real-IP` or `x-aventix-client-ip` cannot select another bucket. This is
intentional local aggregation, not proof of per-user IP attribution. Production
HTTPS hosts, cookies and trusted proxy topology still need separate verification.

## Connected behavior and boundaries

Login calls `/api/auth/login` with only trimmed/lowercased email and the exact
password, then confirms the same identity with `/api/v1/me`. Permitted profile
fields supply the displayed name, exact-role navigation and attendee booking
eligibility. Missing authentication is distinct from an unavailable account
service, malformed profile or an explicit server eligibility gate.

Eligible attendees default to `/events`. Validated booking returns can take
precedence only for attendees. The existing event/booking allowlist also covers
the existing `/dashboard/buy-tickets?eventId=...&category=...` entry; other
dashboard paths and extra query parameters remain forbidden. Account links
revalidate this context each time. No booking destination is put in an email link
or stored for another device. A fresh login URL defaults to events.

Login and registration show the current eligible account with Continue and an
explicit sign-out option. Registration, verification, legacy consent and
recovery integration are separate S01 tickets. Registration remains unavailable
until its current-terms contract is connected; it never falls back to native
signup or automatic sign-in. Verification and consent gates retain their
distinct `/verify-email` and `/accept-terms` destinations for those tickets.

Confirmed logout clears account UI immediately. During a local sign-out,
booking/account consumers clear identity and discard older pending reads. If
the response is lost, one `/me` read reconciles it; no mutation is automatically
repeated. If the account still exists or that read fails, the interface offers
an explicit retry and hides workspace content. This temporary mutation boundary
does not implement general page/data authorization: complete workspace
protection and removal of personal sample records belong to the next S01 slice.
Navigation/cross-tab refresh beyond the existing focus refresh is also separate.

## Verification on 2026-10-21

- Frontend contract/public/booking suite: 23 tests passed.
- Backend session HTTP suite: 28 tests passed on the guarded dedicated test DB.
- Backend typecheck, frontend typecheck, scoped ESLint and production build passed.
- Full backend suite: 254 passed, 1 failed across 12 files (255 tests).
  The existing `authorization.test.ts:117` expects `/api/v1/admin` to return
  404, while the existing router's guest authorization middleware returns 401.
  The same focused failure was reproduced on an isolated archive of task-start
  commit `9944231d744837b2d4869705d64f475b3267cff1` using
  `npx vitest run test/authorization.test.ts -t "never mounts demonstration routes"`
  (1 failed, 7 skipped). This is a confirmed baseline failure; #107 does not
  change business-router authorization or weaken the test to make it pass.
- Headless Chrome on the actual 3000 → 5000 arrangement passed all 12 checks:
  sign-in to events; persistent HttpOnly cookie issuance; reload identity;
  server-rendered current identity on login and registration; safe Continue
  return; cookie clearing and idempotent logout; all four eligibility gates;
  exact organizer/administrator destinations; lost-response reconciliation;
  unavailable workspace after unconfirmed logout with explicit retry; retryable
  `/me` outage; original Origin rejection; and shared throttling despite spoofed
  forwarding headers, with `Retry-After` preserved.

Browser checks used temporary synthetic identities in the dedicated test DB,
controlled consent fixtures and no email delivery. The database preflight
verified the environment marker, expected project identity and development/test
separation before writes. Fixtures and their isolated throttle counters were
removed after the run. The initial fixture's far-future clock exceeded the
cookie serializer's expiry limit; rerunning with a browser-compatible isolated
clock passed. Temporary diagnostics were removed. The actual server startup
also required correcting five Express imports to `import type`; static checking
and the browser run validate that correction.
The post-run read-only preflight confirmed that the original aggregate account
inventory and its consent, verification and legacy-credential counts were unchanged.

No genuine legal acceptance, provider delivery, real-user activation, production
deployment, complete S01 walkthrough or finished business authorization is
claimed by these checks.

## Review

The code-review skill compared the implementation against task-start commit
`9944231d744837b2d4869705d64f475b3267cff1` in separate Standards and Spec reviews.

### Standards

No documented-standard violations. One low-priority duplication in desktop/mobile
account controls was consolidated during review and rechecked: zero remaining findings.

### Spec

Zero findings against #107's scoped acceptance criteria. The separate S01
registration, verification, consent, recovery, workspace-protection and refresh
boundaries remain explicit.
