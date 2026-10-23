# S01 missing legacy consent integration

Implements [#113](https://github.com/AxIon-200/aventix-development/issues/113)
against the [approved S01 specification](s01-attendee-authentication-spec.md)
and [Phase 1 integration contract](phase-1-integration-contract.md).

Login and protected-access `TERMS_ACCEPTANCE_REQUIRED` gates lead to the
dedicated `/accept-terms` page. Login carries a validated email prefill and
validated same-browser `returnTo` value; no password is passed through a link.
The page loads the current terms document/version from `/api/v1/terms`, requires
the current password again and literal explicit acceptance, then sends only
`email`, `currentPassword`, `termsAccepted: true`, and `termsVersion` to
`/api/auth/accept-terms`. The adapter confirms the approved response without
requesting or claiming a session. Successful acceptance leads to separate login.

Unavailable terms disable acceptance and offer Retry while login, verification,
and recovery links remain available. Outdated terms clear acceptance and the
password, fetch the current pair, preserve email, and require another explicit
submission. Server gates retain their order: disabled, unverified, missing
consent, then legacy credential reset. Consent's `PASSWORD_RESET_REQUIRED`
leads to the existing recovery and reset journey; the account holder returns
with the new current password to accept. A lost or unsupported consent response
shows uncertainty with explicit login and recovery actions and no automatic
resubmission. Safe field errors and `Retry-After` remain visible.

The backend's existing consent endpoint records genuine acceptance without a
session and preserves an existing historical acceptance. This slice changes no
account or consent schema, historical records, delivery configuration, or
production activation state.

## Verification

- Frontend adapter consent contracts: 3 tests passed, covering exact payload,
  no session read, uncertain responses, server gates, safe errors, and retry
  guidance.
- Existing backend consent suite: 17 tests passed on the guarded dedicated
  database, including historical records, no session, gate order, and rollback.
- Complete backend suite: 259 tests passed across 12 files on the guarded
  dedicated database.
- Frontend and backend TypeScript checks and scoped ESLint passed.
- The actual Chrome → production Next proxy → Express → guarded PostgreSQL
  browser file passed all 21 checks in the complete frontend run. Its new
  checks covered missing consent from login and protected access, separate
  login, changed and unavailable terms, legacy reset followed by consent, lost
  response, and fixture cleanup.
- The complete frontend run passed 78 of 80 test entries. The only failed
  scenario and its enclosing test were in the unchanged account-switching
  browser file: `confirmed reset reconciles an earlier uncertain logout`
  timed out. An isolated rerun of that file failed at a different existing
  navigation scenario with a temporarily absent link. Earlier S01 evidence in
  [registration](s01-registration-integration.md) and
  [recovery](s01-recovery-integration.md) also records intermittent failures
  in this browser file. No consent test failed.

## Activation boundary

Browser and database tests use synthetic accounts, fixture terms, and captured
mail. Genuine owner-reviewed terms, actual-account inventory, recovery delivery,
and production hosting gates remain prerequisites for real-user activation.
