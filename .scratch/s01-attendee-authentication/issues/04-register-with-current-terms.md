# Draft 04: Register an attendee with explicit current terms

## What to build

A visitor follows the existing attendee account choice, reads and explicitly accepts the current terms, and creates an unverified attendee account without being signed in. Registration explains verification and separate login, including when account creation succeeded but initial delivery failed.

Source: [S01 specification](../../../backend/docs/specs/s01-attendee-authentication-spec.md). Reuse existing registration, consent persistence, and lifecycle APIs.

## Acceptance criteria

- [ ] Load the current version/document pair from the public terms endpoint and link to that exact document. Missing/unavailable terms disable registration with Retry; other account operations remain available. No unpublished legal page substitutes for current terms.
- [ ] Require literal explicit acceptance of the shown version. A stale-version response fetches the new document/version, clears acceptance, preserves nonsensitive fields, and requires renewed submission without automatically accepting or resubmitting.
- [ ] Trim first/last names to 1–100 Unicode code points; normalize email only by trimming/lowercasing. Accept exact 15–128-code-point passwords, including spaces and Unicode, with no trimming, normalization, composition rules, or truncation. Browser controls must not accidentally enforce UTF-16 limits.
- [ ] Phone is optional and omitted when empty. When supplied, accept only 09 plus nine ASCII digits or +639 plus nine ASCII digits; reject spaces, hyphens, unsupported country codes, and landlines.
- [ ] Submit only approved first/last name, email, password, optional phone, termsAccepted and termsVersion. Confirmation, derived name, role/status, timestamps, callback, and remember-me fields never leave the form; credentials are not persisted or passed between pages.
- [ ] Confirmed registration shows verification instructions and separate login without issuing or assuming a session. Preserve safe original-browser return context; a new email tab/device has no promised booking context.
- [ ] ACCOUNT_CREATED_EMAIL_FAILED explains that the unverified account and consent exist and offers explicit resend. Duplicate email shows login/recovery choices without implying the existing identity was changed. The verification slice supplies resend execution.
- [ ] A lost response explains uncertainty and explicit login/recovery/resend choices rather than reporting definite failure, success, or automatically creating the account again. Throttling, safe field errors, and Retry-After remain actionable.
- [ ] Rewrite obsolete mandatory-phone, provisional-password, native-route and auto-login expectations. Verify payloads, Unicode/password boundaries, terms retry/stale acceptance, duplicate/delivery failure, no session, and uncertain outcomes. Run relevant frontend checks, existing backend registration tests on the guarded dedicated database, and local browser acceptance.

## Blocked by

- Draft 01: Connect sign-in, current-account navigation, and sign-out.

## Activation boundary

Clearly labeled fixture terms are for controlled testing. Real-user registration/consent requires genuine owner-reviewed terms and a reachable matching document/version; controlled mail does not prove real delivery.
