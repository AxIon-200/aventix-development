# S01 password-gated email verification and resend

Implements [#111](https://github.com/AxIon-200/aventix-development/issues/111)
against the [approved S01 specification](s01-attendee-authentication-spec.md)
and [Phase 1 contract](phase-1-integration-contract.md).

Initial and resent verification emails use the configured `FRONTEND_URL` origin
and fixed `/verify-email#token=...` destination. Requests cannot select a
destination. Existing `/api/auth/verification` links open a minimal HTML bridge
with an explicit Continue button. Its script captures the fragment in memory,
immediately replaces the history entry, and constructs the fixed frontend URL
only on Continue. GET and Continue never complete verification or issue cookies.
The bridge has no external assets and uses no-store, no-referrer, and a hashed
script Content Security Policy.

The frontend captures and strips the fragment without a token preflight or
browser storage. Reload explains reopening the email; reopening in the same tab
captures the new fragment. Ordinary anchors, including Skip to content, preserve
the captured token. Only an explicit form submission sends `token` and the exact
`currentPassword` to the approved API. Wrong-password and throttle responses keep
the same link usable. Invalid, expired, and consumed links share one recovery
screen. Success requires separate login and preserves any signed-in identity.

The existing registration outcomes and unverified-login gate link to the resend
form. Resend submits only normalized email and displays exactly the approved
generic response across eligibility, cooldown, and delivery failure. Lost resend
or verification responses show uncertainty and explicit next actions without
automatic resubmission. Password fields are cleared after verification attempts
and never carried to login, resend, or recovery. Mandatory legacy recovery points
to `/forgot-password`; recovery execution remains #112 and joined acceptance
remains #114.

Existing backend verification, token consumption, expiry, purpose binding,
transaction locking, password verification, and cooldown rules are reused.
No schema change is required. The localhost proxy and direct-peer IP aggregation
remain as described in [sign-in integration](s01-sign-in-integration.md).

## Validation

- Focused backend registration and verification run: 84 tests passed on the
  guarded dedicated database.
- Focused frontend adapter run: all three verification/resend tests passed.
- Actual Chrome with an isolated production Next build, the same-origin proxy,
  real Express/Better Auth, and guarded PostgreSQL: all nine checks passed before
  final review. Captured mail and synthetic accounts exercise new/old links,
  fragment stripping, reload/reopen, wrong password/retry, separate login,
  signed-in identity/cookie preservation, common invalid links, generic resend,
  delivery failures/cooldowns, legacy recovery, throttling, and lost responses.
- Final full frontend suite: all 67 tests passed, including the skip-link
  regression, both production builds, all 26 existing account/registration
  browser checks, and all nine real-backend verification browser checks.
- An earlier full frontend run encountered a test-helper exception while the
  document body was absent during navigation. The readiness check now waits
  through that transition; the final complete rerun above passed.
- Frontend and backend typechecking and scoped frontend ESLint passed.
- Final full backend suite: all 258 tests passed across 12 files on the guarded
  dedicated database, including the existing verification lifecycle coverage.

Run the frontend suite from the repository root with
`node --test --test-concurrency=1 tests/*.test.mjs`. Browser tests require an
installed Chrome/Chromium browser (or `BROWSER_PATH`) and production build access
to the existing Google Fonts configuration. The verification browser test also
requires the existing guarded `backend/.env.test` database configuration and
`aventix-test` marker. Its fixture checks these before writes, captures mail in
memory, isolates its clock/throttle window, and removes its accounts, cooldowns,
sessions, and throttle rows on completion. Run backend checks from `backend/`
with `npm run typecheck` and `npm test`.

## Review

The code-review skill used task-start commit
`c55c761da338e41a2d27375fa4b7621cc3867c0f` for independent reviews.

### Standards

Zero remaining findings. Shared completion-request handling resolves the
optional duplication finding while preserving each operation's result checks.

### Spec

Zero remaining findings. The skip-link token-loss finding was fixed and covered
with the actual root-layout anchor in the browser regression.

Review totals: Standards 0 findings; Spec 0 findings. Neither axis has a remaining
issue.

## Activation boundary

Controlled mail proves integration behavior, not real inbox delivery. No sending
credentials or genuine terms were configured by this slice. Real delivery,
owner-reviewed terms, and the joined recovery flow retain their existing
acceptance requirements.
