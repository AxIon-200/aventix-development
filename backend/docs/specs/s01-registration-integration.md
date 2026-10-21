# S01 attendee registration integration

Implements [#110](https://github.com/AxIon-200/aventix-development/issues/110)
against the [approved S01 specification](s01-attendee-authentication-spec.md)
and [Phase 1 contract](phase-1-integration-contract.md).

The existing attendee choice opens registration with a validated booking return
link. The form loads the current document/version from `GET /api/v1/terms` and
requires explicit acceptance. Missing terms disable registration with Retry.
Stale terms clear acceptance and credentials, preserve names/contact details,
fetch the new document, and require another explicit submission. Returning from
the terms tab preserves the form while the account check temporarily hides and
deactivates it. An eligible signed-in account still gets Continue/sign-out.

Names use trimmed Unicode code-point limits; passwords use exact 15–128-code-point
limits, including spaces. Browser name/password controls have no UTF-16 length
restriction. Optional phone accepts only the two approved Philippine formats;
empty phone is omitted. Email trimming/lowercasing preserves dots and plus tags.
Only the approved registration fields are sent to `POST /api/auth/register`.
Credentials stay within the current form and are never persisted or passed to
another page. Native signup and automatic sign-in expectations are removed.

Confirmed creation explains verification with the current password and separate
login. Initial delivery failure explains that the account and consent were saved.
Duplicates explain that the existing identity was unchanged. Lost/unsupported
responses show uncertainty without resubmitting. Outcome screens offer explicit
login, recovery and verification-resend destinations as appropriate. Resend
execution belongs to #111; recovery execution belongs to #112. Safe field errors
and `Retry-After` remain visible and actionable.

## Verification on 2026-10-21

- Complete frontend suite: all 55 tests passed (29 contract/public/booking tests
  and 26 production-browser checks), including the fixes found during review.
- All 26 production-browser checks passed, including terms outage/retry, stale
  acceptance, returning from the terms tab, Unicode boundary input, payload
  allowlisting, no cookie/session, duplicate/delivery/uncertain outcomes, and
  throttling. Existing account refresh, switching and workspace checks also pass.
- Existing backend registration suite: all 49 tests passed on the guarded
  dedicated test database. Frontend/backend typechecking and scoped ESLint passed.
- Final complete backend suite: all 256 tests passed across 12 files on the
  guarded dedicated database. An earlier recovery-throttling fixture failure
  (429 instead of 200) did not reproduce in its focused rerun or this final full
  run; no backend behavior or test expectations were changed.
- Isolated production builds passed as part of browser acceptance. An intermediate
  build was blocked by sandbox access to Google Fonts; the network-enabled rerun
  passed without changing font configuration.
- A separate real Chrome → Next proxy → Express → guarded PostgreSQL walkthrough
  passed: existing attendee choice, reachable labeled fixture document, explicit
  consent, persisted unverified account/consent, captured initial mail, no cookie
  or session, separate login with preserved safe return, and unverified-login
  denial. It used temporary synthetic identity data, an isolated throttle window,
  and controlled mail. Its account, cooldown and throttle fixtures were removed.

## Review

The code-review skill used task-start commit
`4df2710dcd8a8d93766235e6bdf4526f0f949fdf` for independent reviews.

### Standards

Zero remaining findings. One optional naming improvement was addressed:
`validPhone` now describes exact-format validation without implying repair or
normalization. The tests and caller were updated and checked again.

### Spec

Zero remaining findings. A gateway error can conceal a completed registration,
so unsupported service errors now use the uncertainty screen. The failing HTTP
502 contract case passes after the fix, and browser coverage verifies the
explicit login/recovery/resend choices without another creation submission.

## Activation boundary

No legal terms or real sending credentials were authored or enabled. Genuine,
owner-reviewed, reachable terms and real delivery evidence remain prerequisites
for real-user activation. Fixture terms and captured mail prove only controlled
technical integration. The joined verification/recovery journey remains #114.
