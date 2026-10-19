# Email verification and resend — issue #57

Implements [#57](https://github.com/AxIon-200/aventix-development/issues/57)
using the [approved HTTP and error contract](../specs/phase-1-integration-contract.md#proposed-public-http-contract)
and [Phase 1 requirements](../../documents/phases/phase-1-authentication.md).

`POST /api/auth/verify-email` accepts only `{ token, currentPassword }`.
`POST /api/auth/resend-verification` accepts only `{ email }`.
Both require the configured frontend Origin and JSON content type. Verification
replaces Better Auth's native `verifyEmail` endpoint registry entry; native
link-only GET and `/send-verification-email` remain unavailable. The existing
read-only `/api/auth/verification` landing resource explains JSON completion.
Login belongs to the following ticket and remains unavailable here.

Verification and resend share the account transaction lock in
`src/lib/account-lifecycle.ts`. Future reset/change, login, consent, and trusted
status commands must use that same lock before their authoritative reads and
writes. Every lifecycle write uses Better Auth's current transaction adapter.
Verification state and link consumption commit together. Resend commits its
link and cooldown before bounded provider delivery, with no network call inside
the transaction. Registration's initial link/cooldown uses the same storage.
No schema migration is needed for this ticket.

The configured password verifier recognizes the locked Better Auth legacy hash
format only for credential matching. A correct legacy password returns
`PASSWORD_RESET_REQUIRED` before verification changes anything; a wrong password
retains the normal credential error. Neither path upgrades credentials or issues
a session. Actual recovery/reset and the legacy activation gates remain in the
[approved contract](../specs/phase-1-integration-contract.md#approved-integration-boundary-and-finalized-approach).

Configure `AUTH_VERIFICATION_IP_LIMIT` and
`AUTH_VERIFICATION_RESEND_IP_LIMIT` (each defaults to 10 per fifteen-minute
window). They have independent durable counters and share
`AUTH_AGGREGATE_IP_LIMIT` with registration. Direct-peer IP handling and
provider configuration follow the [registration implementation](56-registration.md).
Genuine terms, provider credentials/domain, real email delivery, and production
browser/proxy checks remain activation inputs; controlled test mail proves no
actual inbox delivery.

Verification: `npm run typecheck`, focused
`npx vitest run test/verification.test.ts test/auth.test.ts`, then `npm test`.
The tests use real Better Auth/Prisma on the identity-verified dedicated test
database, controlled mail and time, concurrent HTTP submissions, and a temporary
fixture-scoped database constraint to prove rollback on failed link invalidation.
Credential replacement is a database fixture representing a later reset's
durable effect; it does not claim HTTP reset acceptance is implemented here.
