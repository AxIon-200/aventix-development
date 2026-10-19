# Login, authenticated account retrieval, and logout — issue #58

Implements [#58](https://github.com/AxIon-200/aventix-development/issues/58)
using the [approved HTTP and error contract](../specs/phase-1-integration-contract.md#proposed-public-http-contract)
and [Phase 1 requirements](../../documents/phases/phase-1-authentication.md).

The public operations are `POST /api/auth/login` with `{ email, password }`,
`GET /api/v1/me` with the session cookie, and `POST /api/auth/logout` with no
body or `{}`. Mutation requests require the exact configured frontend Origin;
login and nonempty logout bodies require JSON. Unknown input fields are rejected.
Success responses follow the linked contract and never include session credentials
in JSON. Native sign-in, sign-out, get-session, and session-management routes
remain unavailable.

Login verifies credentials under the shared account lifecycle lock before
checking current access gates or issuing a session. Better Auth creates the
session through its transaction-aware internal adapter; the signed cookie is
written only after commit. Its `createSession` override arguments, `findSession`,
and `deleteSession` calls are isolated in `src/lib/account-sessions.ts` and depend
on the verified installed Better Auth 1.7.7 behavior. Credential and gate reads
use the transaction adapter. A waiting login rechecks account state after the
lock is acquired. The shared gate and profile serializer live in
`src/lib/account-access.ts` for subsequent protected operations.

Express delegates `/api/v1/me` to an internal Better Auth endpoint that validates
the signed cookie and reads the session store, current account, and credential.
The endpoint's `/api/auth/own-profile` path is denied by the HTTP allowlists;
only the documented application route is public. Profile reads neither refresh
the session nor issue cookies. Logout deletes only the signed requesting token
through Better Auth, including an expired token, and clears cookies with the
original attributes. A persistence failure returns a safe error rather than
claiming successful revocation.

Configure `AUTH_LOGIN_IP_LIMIT` (default 20) and `AUTH_LOGOUT_IP_LIMIT` (default
60), each per fifteen-minute window. Both use the existing durable aggregate
limit. Express uses direct-peer IPs with `trust proxy=false` and overwrites the
private `x-aventix-client-ip` header before dispatch. Better Auth reads only that
header for session metadata; submitted forwarding headers cannot choose it.

Localhost retains the approved host-only HttpOnly SameSite=Lax cookie over
development HTTP. Production startup requires HTTPS frontend and API URLs;
HTTPS cookies carry Secure. Tests demonstrate those headers and matching cookie
clearing, credentialed CORS, and Origin rejection. Actual production hosts,
site/proxy arrangement, and browser smoke verification remain the
[deployment release gates](../specs/phase-1-integration-contract.md#sessions-and-browser-controls).
The tests simulate browser closure by reusing the persistent cookie in a new
client/application instance; they do not claim a real browser deployment check.

No schema migration is required. Legacy credentials remain blocked under the
approved recovery transition; actual recovery delivery, legacy consent,
profile editing, and trusted status commands belong to subsequent tickets.
Existing activation gates for genuine terms, mail delivery, and affected legacy
accounts remain in the approved integration contract.

Verification uses real HTTP/Better Auth/Prisma on the identity-verified dedicated
test database, captured verification mail, and controlled time. Tests cover
profile privacy, credential/gate precedence, all-role fixed expiry, persistent
cookies, independent concurrent sessions, idempotent logout, revocation,
re-enabling, direct-route denial, request policy, and durable throttling. A real
fixture-scoped database constraint proves rollback on failed session creation;
a held user-row lock proves login observes an in-flight disable before issuing
a session. Run `npm run typecheck`, focused `npx vitest run test/sessions.test.ts
test/auth.test.ts test/verification.test.ts`, and then `npm test`.
