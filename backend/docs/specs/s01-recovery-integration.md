# S01 password recovery and reset sign-out effects

Implements [#112](https://github.com/AxIon-200/aventix-development/issues/112)
against the [approved S01 specification](s01-attendee-authentication-spec.md)
and [Phase 1 contract](phase-1-integration-contract.md).

Recovery submits only normalized email to `/api/auth/request-password-reset`
and displays the approved generic response. Unknown addresses, account gates,
per-address suppression, and delivery failure retain the existing backend
privacy behavior. Verification and recovery cooldowns remain independent.

New mail uses the configured `FRONTEND_URL` and fixed
`/reset-password#token=...` destination. Previously issued
`/api/auth/password-reset` links open an explicit Continue bridge using the same
implementation as verification. Both bridges use memory-only fragments,
immediate history replacement, no external assets, no-store, no-referrer,
and a hashed-script Content Security Policy. Continue constructs the fixed
frontend fragment only when selected; neither GET nor Continue changes account
state or issues a session. Request-supplied destinations remain forbidden.

The reset form captures the token into memory, strips the fragment, and explains
reopening the original email after reload. It has no token preflight. Only an
explicit submission sends `token` and exact `newPassword`; confirmation remains
local. Password validation counts 15 to 128 Unicode code points without trimming,
normalization, or truncation. Password reuse remains actionable on the same
link. Invalid, expired, and used links share one recovery screen.

Reset remains usable while signed in and explains that success revokes all
sessions of the reset account and clears this browser's cookie without issuing
a replacement session. If the browser belongs to another account, that browser
is signed out while the other account's other devices remain signed in. The
adapter emits the existing reset hint; navigation and other tabs read `/me`
again. Reset success also refreshes server-rendered navigation.

The existing atomic password replacement, token consumption, revocation, and
audit behavior is reused. Reset preserves account role, status, verification,
and genuine consent. Disabled and unverified accounts remain restricted;
still-valid verification links work with the new password. No schema change
is required.

Login and protected-access `PASSWORD_RESET_REQUIRED` gates already point to
the now-connected recovery form. Verification's own recovery gate uses the
same destination. The consent slice connects its gate separately. Safe
original-browser `returnTo` values remain in account navigation, with no
passwords passed between pages and no booking context added to email links.

Lost request/reset responses show uncertainty and explicit next actions without
automatic resubmission or a completion claim. Safe errors, IP throttling,
Retry-After guidance, and the localhost proxy's documented direct-peer
aggregation remain unchanged; see [sign-in integration](s01-sign-in-integration.md).

## Validation

Run focused adapter tests from the repository root with
`node --test tests/recovery.test.mjs`. The actual-browser verification/recovery
test is `tests/verification.browser.test.mjs`; it builds an isolated production
Next app and uses real Express/Better Auth and the guarded dedicated test
database. Mail stays in memory. Its fixture verifies database separation and
the `aventix-test` marker before writes, and cleans up its synthetic accounts,
audits, sessions, cooldowns, and isolated throttle window.

Run frontend static checks with `npx tsc --noEmit` and scoped ESLint. Run the
complete frontend suite with `node --test --test-concurrency=1 tests/*.test.mjs`.
From `backend/`, run `npm run typecheck`, focused
`npx vitest run test/password-recovery.test.ts`, and the full `npm test` suite.
Browser tests need an installed Chrome/Chromium browser (or `BROWSER_PATH`),
the existing backend test configuration, and access to the existing production
build's Google Fonts.

Final validation completed with:

- Frontend TypeScript and scoped ESLint passed.
- Recovery adapter tests passed (4/4).
- Actual-browser verification/recovery tests passed (17/17).
- Backend typecheck passed; password-recovery tests passed (23/23).
- The full backend suite reported 258/259 passing. Its sole timeout was the
  unrelated profile test `rechecks access after waiting for an in-flight
  revoke`; that test passed when run alone. The earlier password-change timeout
  also passed when isolated.
- The full frontend suite reported 67/69 passing. Its two failures are one
  account-switching browser scenario and its enclosing test, both caused by a
  null navigation element in `tests/account-switching.browser.test.mjs`; all
  recovery browser tests passed.
- Final Standards review: 0 findings. Final Spec review against #112: 0
  findings.

## Activation boundary

Captured mail and synthetic accounts prove technical integration, not inbox
delivery. Genuine owner-reviewed terms, real recovery delivery and its smoke
evidence, and actual-account inventory remain activation requirements. This
slice configures no sending credentials, sends no real mail, inventories no
actual users, and makes no production deployment or activation claim.
