# Legacy terms acceptance — issue #59

Implements [#59](https://github.com/AxIon-200/aventix-development/issues/59)
through the [approved public HTTP contract](../specs/phase-1-integration-contract.md#proposed-public-http-contract)
and [Phase 1 account requirements](../../documents/phases/phase-1-authentication.md#input-validation-and-account-contracts).

`POST /api/auth/accept-terms` accepts exactly `email`, `currentPassword`,
`termsAccepted`, and `termsVersion`. Successful requests return HTTP 200 with
`{ data: { termsAccepted: true } }`. They never create a session or issue a cookie;
the account logs in separately. Current terms retrieval, comparison, and recording
use the same immutable configuration snapshot as registration.

The endpoint lives in `src/lib/terms-acceptance.ts` and uses Better Auth's
configured password verifier and the existing account lifecycle transaction.
After acquiring the shared user-row lock, it re-reads the account and credential
before checking access and persisting consent. The shared access gate permits
only this operation to complete missing consent while retaining status,
verification, credential-transition, and supported-role checks. Existing genuine
records are preserved, including records for earlier terms versions and retries.
Incomplete records are replaced only after a genuine, explicit acceptance.
No migration, backfill, role change, or verification change is performed.

Both the Express and Better Auth request allowlists admit only the canonical
operation and retain the existing Origin, JSON, body-size, and safe-error policies.
Express applies the durable aggregate IP limit and
`AUTH_TERMS_ACCEPTANCE_IP_LIMIT` (default 10 attempts per fifteen-minute window),
counting all outcomes and using the direct peer rather than submitted IP headers.
Login and protected profile reads retain their existing missing-consent gate;
logout remains available. Recovery/reset remains a subsequent ticket (#61),
including the recovery path required for old password hashes.

Real-user acceptance remains unavailable without owner-approved terms configured
through `CURRENT_TERMS_VERSION` and `CURRENT_TERMS_DOCUMENT_URL`. The existing
[activation and deployment gates](../specs/phase-1-integration-contract.md#verification-and-approval-checklist)
still apply. Tests inject clearly labeled fixture terms and capture verification
mail; they do not establish real delivery or production browser behavior.

`test/terms-acceptance.test.ts` exercises HTTP with real Better Auth/Prisma on the
identity-verified isolated database. It covers separate login, normalized email,
credential privacy, gate precedence, verification before acceptance, malformed
and outdated inputs, historical consent, existing sessions and logout, concurrent
acceptance, status changes while waiting for the lock, persistence rollback,
transport policies, native-route denial, and durable throttling across app
instances. A fixture-scoped database constraint tests actual rollback; it is
removed in `finally`. Run `npm run typecheck`,
`npx vitest run test/terms-acceptance.test.ts`, and `npm test`.
