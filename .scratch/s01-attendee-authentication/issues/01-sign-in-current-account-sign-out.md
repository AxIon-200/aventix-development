# Draft 01: Connect sign-in, current-account navigation, and sign-out

## What to build

An eligible existing account can sign in through the existing interface, see its real identity and role-specific navigation, resume its session after reload, and explicitly sign out. This first tracer bullet establishes the localhost browser/API transport with a working account journey rather than a standalone client rewrite.

Source: [S01 specification](../../../backend/docs/specs/s01-attendee-authentication-spec.md). Reuse the implemented Aventix lifecycle and Better Auth credentials/sessions; do not create another authentication system or plan schema changes. This is new S01 contract integration, distinct from older UI tickets and closed historical integration tickets.

## Acceptance criteria

- [ ] Browser requests to both authentication and versioned APIs use the frontend origin, credentials, and no caching; server account reads explicitly forward the requesting cookie to the configured Express origin. Arbitrary request headers cannot select that origin and identity cannot be cached across accounts.
- [ ] Demonstrate localhost frontend port 3000 to API port 5000 cookie issuance, forwarding, clearing, and original mutation Origin preservation. Verify IP throttling with the actual proxy arrangement and spoofed forwarding headers; document intentional local aggregation with trust proxy disabled. Do not enable blanket proxy trust or infer production behavior.
- [ ] Replace native sign-in/session/sign-out and connection-probe assumptions with the approved login, current-account, and logout contracts. Decode data/error envelopes, safe field errors and Retry-After; reject malformed or unsupported profiles without fabricating identity.
- [ ] Login trims/lowercases email without alias rules, preserves the exact password, and sends only approved fields. Remove remember-me behavior; retain the fixed persistent seven-day, nonrenewing backend session.
- [ ] Account menus and booking eligibility derive from the permitted current-account profile. Ordinary attendee login goes to events; only eligible attendees may use the validated existing booking-return allowlist. Organizer and administrator accounts use their own permitted areas without role inheritance.
- [ ] Preserve and revalidate safe return context through original-browser account navigation. Never put booking context in email links or promise cross-device restoration; a fresh email tab defaults to events for attendees.
- [ ] Login and registration show an already eligible signed-in account with Continue and explicit sign-out before using another account. Opening an account screen never silently switches identity.
- [ ] Present invalid credentials and current server eligibility gates accurately, in the approved order; preserve separate verification, consent, and recovery destinations as those slices land. Outages remain retryable unavailable states, distinct from authentication expiry.
- [ ] Confirmed logout clears account UI immediately and invalidates only this session. Missing/expired sessions still receive idempotent logout. If its response is lost, reconcile with current-account retrieval; if reconciliation fails, show uncertainty, offer retry, and keep protected content unavailable. Never automatically resubmit an uncertain mutation.
- [ ] Update injected-transport frontend contract tests and verify the actual localhost sign-in/reload/logout journey. Run relevant static checks and backend session tests on the guarded dedicated test database; record unavailable checks honestly.

## Blocked by

None (can start immediately).

## Boundaries

Workspace protection and removal of sample private records belong to draft 03. Account refresh across navigation and tabs belongs to draft 02. Real-user activation and production deployment remain gated; controlled fixtures are not genuine terms or delivery evidence. Read the installed Next.js guides before implementation. The proposed public HTTP testing seam remains subject to approval with this breakdown.
