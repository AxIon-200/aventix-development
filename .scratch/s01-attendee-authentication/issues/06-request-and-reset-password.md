# Draft 06: Recover a password and enforce reset sign-out effects

## What to build

An account holder can request recovery, open a new or existing reset email, explicitly choose a different valid password, and return to separate login with reset effects explained accurately. This supplies the usable recovery destination for forgotten passwords and legacy credential gates.

Source: [S01 specification](../../../backend/docs/specs/s01-attendee-authentication-spec.md). Reuse the implemented recovery/reset lifecycle, revocation, audit, and delivery boundaries.

## Acceptance criteria

- [ ] Recovery sends only the normalized email to the approved request endpoint. Every validly formatted address receives the approved generic response, including unknown, disabled, unverified, cooldown-suppressed, and delivery-failure cases. Verification and recovery address cooldowns remain independent.
- [ ] New reset mail uses the configured fixed frontend reset destination with a token fragment. Previously issued backend landing links provide explicit Continue to that fixed destination. Opening/continuing never changes credentials, consumes the token, or issues a session; request-supplied destinations remain forbidden.
- [ ] On both bridge and completion pages, capture the token in memory and immediately strip the fragment from history. Never persist or log it, send it in query strings/server-rendered requests, or use external bridge assets. Preserve no-store/no-referrer and explain reopening the original email after reload.
- [ ] Remove the simulated reset-token preflight. Only explicit token/newPassword submission checks validity. Validate exact 15–128 Unicode code points without modifying passwords; confirmation is local only. PASSWORD_REUSE remains actionable and invalid/expired/used links use one common recovery screen.
- [ ] Reset remains usable while signed in. Explain that success revokes every session of the reset account, clears this browser's cookie with no replacement session, and requires separate login. If this browser belongs to another account, its browser session is signed out without revoking that other account's other devices.
- [ ] Refresh account navigation and emit the existing account-change hint after success; draft 02 extends propagation across tabs. Reset preserves role, status, verification, and genuine consent. Disabled/unverified accounts remain restricted; a still-valid verification link remains usable with the new password.
- [ ] PASSWORD_RESET_REQUIRED from login and protected access opens usable recovery. Verification and consent slices connect their own gate outcomes to the same flow. No password passes between pages and safe original-browser return handling is preserved without adding email booking destinations.
- [ ] Lost request/reset responses show uncertainty with explicit next actions and no automatic resubmission or completion claim. Preserve safe errors, cooldown privacy, IP throttling, and Retry-After guidance.
- [ ] Verify the observable request/reset contracts, new/old mail links and stripping, password reuse, signed-in effects, session revocation including the other-account cookie case, preserved restrictions, and verification after reset. Reuse backend recovery tests on the guarded dedicated database, extend mail/bridge tests, and run frontend static checks and actual localhost browser acceptance.

## Blocked by

- Draft 01: Connect sign-in, current-account navigation, and sign-out.

## Independence

Recovery can be demonstrated with controlled existing accounts independently of registration and verification UI. Share token-page behavior if already available, but do not make the two completion journeys block each other solely for anticipated code reuse. Real recovery delivery and actual-account inventory remain activation requirements.
