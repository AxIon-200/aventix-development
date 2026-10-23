# Draft 05: Complete password-gated email verification and resend

## What to build

An unverified account holder can open a new or previously issued email link, explicitly submit their current password to verify, request resend, and then log in separately. Merely opening or previewing mail never verifies the account or signs anyone in.

Source: [S01 specification](../../../backend/docs/specs/s01-attendee-authentication-spec.md). Extend only the fixed mail destination and legacy bridge behavior in the existing backend lifecycle.

## Acceptance criteria

- [ ] New verification emails use the configured fixed frontend verification destination with a token fragment. Requests cannot supply destinations. The existing backend landing resource offers an explicit Continue action to that fixed page; opening/continuing does not consume a token, mutate verification, or issue a session.
- [ ] Both bridge and completion pages capture the fragment into memory and immediately replace browser history to strip it. No token enters query strings, browser storage, server requests during rendering, logs, or analytics. Construct the bridge destination from memory only on Continue; preserve no-store/no-referrer behavior and no external bridge assets.
- [ ] The frontend requires explicit submission of token and currentPassword to the approved API. Wrong password leaves the same still-valid link and form usable. Success explains verification and separate login; verification never changes the currently signed-in identity.
- [ ] Missing token/reload explains reopening the email. Invalid, expired, or consumed links share the common invalid-or-expired recovery screen. Do not invent link-state distinctions.
- [ ] Explicit resend is usable from registration completion/delivery-failure and unverified-login outcomes as they become available. Validly formatted requests retain the exact generic response across eligibility, cooldown, and delivery failures; login never sends mail automatically.
- [ ] PASSWORD_RESET_REQUIRED leads to recovery without mutating verification or carrying the password. The recovery slice supplies that flow. A lost verification response shows uncertainty and explicit login, resend, or recovery actions without automatic resubmission.
- [ ] Preserve 24-hour expiry, purpose binding, multiple outstanding links, wrong-password nonconsumption, and invalidation of outstanding verification links on success; do not rebuild those implemented lifecycle rules.
- [ ] Verify new and old mail links, fragment stripping/reload, signed-in use, wrong password/retry, generic resend/cooldowns, throttling and uncertain results with frontend tests and actual localhost browser evidence. Extend backend HTTP tests for fixed destinations/bridges and run existing verification tests on the guarded dedicated database, plus relevant static checks.

## Blocked by

- Draft 01: Connect sign-in, current-account navigation, and sign-out.

## Independence

This slice can be demonstrated with a controlled unverified exact-credential fixture; it does not depend on the registration UI. Final acceptance joins registration and mandatory recovery outcomes to this flow. Controlled mail is not real delivery evidence.
