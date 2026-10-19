# Atomic profile editing — issue #60

Implements [#60](https://github.com/AxIon-200/aventix-development/issues/60)
using the [approved HTTP contract](../specs/phase-1-integration-contract.md#proposed-public-http-contract)
and [account requirements](../../documents/phases/phase-1-authentication.md#input-validation-and-account-contracts).

`PATCH /api/v1/me` accepts a nonempty JSON object containing only `firstName`,
`lastName`, and `phoneNumber`. Omitted fields are preserved; `null` clears the
phone. Names are trimmed and limited to 1–100 Unicode code points, preserving
spelling, punctuation, and internal whitespace. Either name change also updates
the derived `name`. Phone validation and normalization follow the approved
Philippine mobile formats. Invalid values and protected or unknown fields reject
the entire update with HTTP 400 `VALIDATION_ERROR`.

Successful reads and updates return HTTP 200 `{ data: { user: Profile } }` using
the existing explicit public-field projection. Responses use `Cache-Control:
no-store` and never expose credential/provider records, lock state, or session
tokens. Updating a profile issues no cookie and does not refresh the session.

The Express boundary requires the exact configured frontend Origin and JSON
content type for PATCH, with a 16 KiB body limit and safe JSON errors. Better Auth
remains mounted before the application JSON parser. GET remains a read operation;
unsupported methods return 405 with `Allow: GET, PATCH`.

The internal Better Auth profile endpoint authenticates the signed session cookie,
acquires the existing account lifecycle transaction lock, and rechecks session
validity, current account gates, and credentials before writing. All three
supported roles may edit their own eligible account. The account ID comes only
from the session. Reading current names under the lock and writing all submitted
fields together prevents concurrent partial edits from losing a name or producing
an inconsistent derived name. Persistence failures roll back the transaction and
return the generic `INTERNAL_ERROR` contract.

Both HTTP authentication allowlists keep the internal `/update-own-profile` path
and native `/update-user` and `/change-email` paths unavailable. No schema change,
data migration, frontend, or new account-management endpoint is introduced.

`test/profile.test.ts` exercises the approved HTTP seam with real Better Auth and
Prisma, the identity-verified dedicated test database, controlled verification
email, and deterministic time. Coverage includes partial edits, phone clearing,
Unicode boundaries, atomic input rejection, protected fields, profile filtering,
all three roles, account isolation, current access gates, expired/revoked sessions,
concurrent edits, access changes while waiting for the lock, persistence rollback,
Origin/JSON/body controls, and direct-route denial. The rollback test uses a
fixture-scoped temporary database constraint removed in `finally`.

Run `npm run typecheck`, `npx vitest run test/profile.test.ts`, and `npm test`.
The existing [activation and deployment gates](../specs/phase-1-integration-contract.md#verification-and-approval-checklist)
continue to apply; controlled integration tests do not establish real email
delivery or production browser behavior.
