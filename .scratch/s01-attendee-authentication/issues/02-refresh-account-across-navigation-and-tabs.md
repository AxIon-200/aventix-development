# Draft 02: Keep account identity current across navigation and tabs

## What to build

Account navigation reflects a fresh server account check after page navigation, focus, and account changes in another tab. A late response cannot restore an identity that has signed out or lost access.

Source: [S01 specification](../../../backend/docs/specs/s01-attendee-authentication-spec.md). Extend the existing account-session UI and transport; do not add a second identity source.

## Acceptance criteria

- [ ] Refresh current-account state on page navigation and focus, and after login/logout/reset signals, without continuous polling.
- [ ] Cross-tab hints carry no authoritative profile, credential, or token; receiving a hint triggers a fresh current-account read.
- [ ] Ignore stale/in-flight responses that would resurrect outdated account UI, including a read begun before confirmed logout or reset. Confirmed logout clears all mounted account UI immediately.
- [ ] Expired/revoked authentication, current eligibility failures, malformed profiles, and service outages retain distinct approved states. Unknown account state cannot preserve protected content.
- [ ] No claim is made that remote expiry or disabling updates an idle tab immediately; the next defined refresh checks current server state.
- [ ] Exercise observable navigation/focus/cross-tab behavior and delayed-response races through frontend tests and an actual two-tab localhost walkthrough, with relevant frontend static checks. No internal-helper call-count or component snapshot tests.

## Blocked by

- Draft 01: Connect sign-in, current-account navigation, and sign-out.
