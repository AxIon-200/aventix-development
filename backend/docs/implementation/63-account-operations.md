# Role permissions and trusted account operations — issue #63

Implements [#63](https://github.com/AxIon-200/aventix-development/issues/63)
under the [Phase 1 requirements](../../documents/phases/phase-1-authentication.md),
[integration contract](../specs/phase-1-integration-contract.md), and
[fixed-role decision](../adr/0001-fixed-account-roles.md).

Every protected account operation explicitly permits the three self-service
roles. Future application routes use `requireRoles(auth, permittedRoles)` with
their own explicit list. It authenticates the signed Better Auth cookie through
the internal own-profile endpoint, reads current server-side access gates, then
checks exact role membership. Missing or invalid authentication returns 401;
insufficient permission returns 403 `FORBIDDEN`. An empty list denies everyone;
administrators receive no inherited organizer permissions. Responses use the
existing safe error envelope and `Cache-Control: no-store`.

Own-profile reads validate the stored session, current user, and credential in
one Prisma transaction after taking a shared user-row lock. That lock conflicts
with lifecycle updates; session validity is rechecked after waiting. A paused
request cannot authorize a deleted session after disable/re-enable. Reads make
no data changes and preserve profile timestamps.

Role demonstration routes exist only in the test file, outside application
creation and the production build. No application option can expose them.
Public/native authentication route allowlists continue to reject profile/role
mutation and account-management alternatives. Role changes have no command or
HTTP operation; another role requires a separate normalized email and identity.

## Local commands

From the backend directory, authorized developers with database access can run:

```text
npm run accounts -- create-administrator
npm run accounts -- disable
npm run accounts -- enable
```

Commands require a terminal and prompt for every value. Extra arguments are
rejected without echoing them. Password entry and confirmation are hidden, with
terminal history disabled; passwords never belong in command arguments or logs.
Ctrl+C cancels. The application configuration supplies the database connection.
Enter the intended Supabase project reference from your dashboard at the target
confirmation prompt. The command checks the exact direct-host/project identity
or pooler username, the configured database name, and a live database connection
before collecting account details. Connection query parameters that override
identity or connection options are rejected. Tests additionally require the dedicated
project reference, development/test separation, and database marker. Credentials
and connection URLs are never printed. No real account is created by installing
or building this feature.

Administrator creation prompts for a dedicated email, first/last names, and a
15–128 code-point exact password. It uses existing normalization, name validation,
password hashing, and database uniqueness. Existing accounts are never promoted
or overwritten. New administrators are ACTIVE, unverified, without recorded
terms acceptance or sessions. The owner must request a verification email,
verify with their current password, complete `POST /api/auth/accept-terms` with
genuine current terms acceptance, and log in separately. Provisioning sends no
email automatically. Real delivery and genuine terms retain the existing
[activation gates](../specs/phase-1-integration-contract.md#verification-and-approval-checklist).

Disable/enable prompt for the account UUID. Both acquire the existing user-row
lifecycle lock before changing status, deleting every session, and recording the
audit in one transaction. This serializes with login and other lifecycle writes.
Re-enabling requires fresh login and never restores deleted cookies, even if no
request occurred during disablement. Repeated commands also revoke sessions.
Already-authorized requests may finish. Role, verification, credentials, and
consent remain unchanged. No HTTP management endpoints or organizer onboarding
are added. No schema migration or new dependency is required.

`ActivityLog` records `ADMINISTRATOR_PROVISIONED`, `ACCOUNT_DISABLED`, and
`ACCOUNT_REENABLED`, subject ID, server timestamp, and the local operating-system
developer username in metadata. Status audits include previous/resulting status.
The actor has no fabricated application-user identity (`userId` is null).
Provisioning/status changes and session deletion roll back if the audit fails.
Errors print safe messages without payloads, hashes, tokens, or database details.

## Verification

`test/authorization.test.ts` exercises all role pairs, shared self-service, live
gates, fixed roles, blocked native routes, and absence of demonstration/management
routes in production. `test/account-maintenance.test.ts` exercises trusted
operations through the command boundary with real persistence, HTTP login/profile
checks, controlled email, database-target rejection, duplicate identities,
session revocation, concurrent login, audit rollback, and CLI argument/TTY safety.
The authorization race test pauses credential reads with database locks and
observes the exact backend lock chain before resuming the HTTP request.
Both use the existing verified isolated test database. These tests do not prove
production hosting, real inbox delivery, or browser deployment readiness.

Run `npm run typecheck`, `npx vitest run test/authorization.test.ts
test/account-maintenance.test.ts`, `npm run build`, and `npm test`.
