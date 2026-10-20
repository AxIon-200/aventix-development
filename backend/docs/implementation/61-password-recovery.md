# Password recovery — issue #61

Implements [#61](https://github.com/AxIon-200/aventix-development/issues/61)
under the [approved integration contract](../specs/phase-1-integration-contract.md)
and [Phase 1 requirements](../../documents/phases/phase-1-authentication.md).

`POST /api/auth/request-password-reset` accepts only `{ email }`, using the
existing normalization. Valid requests return HTTP 200
`{ data: { message: "If an account exists for this address, a password-reset email will be sent." } }`
for missing, active, disabled, unverified, cooldown-suppressed, and failed-delivery
outcomes. An eligible attempt commits a separate 60-second `PASSWORD_RESET`
email cooldown before delivery; suppression does not extend it. Verification
cooldowns remain independent.

Mail uses Resend with the configured private credentials, a bounded timeout,
and an injectable delivery boundary for tests. Failures log only a safe category
and correlation ID. Links use the canonical API origin and fixed read-only
`GET /api/auth/password-reset#token=...` destination. This landing resource
explains JSON completion without a frontend, sends no cookie, and uses
`Cache-Control: no-store` and `Referrer-Policy: no-referrer`. Clients cannot set
redirects or callback destinations. Only SHA-256 digests of random 256-bit tokens
are stored, bound to account and purpose with independent 30-minute lifetimes.
New requests preserve earlier links.

`POST /api/auth/reset-password` accepts only `{ token, newPassword }`. It uses
the approved exact Unicode password policy and Better Auth's configured password
hash/verify functions. Reusing the current password returns HTTP 400
`PASSWORD_REUSE`, including a legacy normalization-equivalent password.
Invalid, expired, consumed, and wrong-purpose tokens return HTTP 400
`LINK_INVALID_OR_EXPIRED`. Rejections preserve valid links and credentials.

Reset joins the existing account lifecycle lock and transaction. It rechecks
the link and current credential, replaces the password, consumes every outstanding
reset link, deletes every session for the owner, and writes the `PASSWORD_RESET`
audit to the existing `ActivityLog`. Any persistence failure rolls back all of
these writes. The audit records owner/subject IDs, action and server timestamp,
without submitted data or secrets. Success returns HTTP 200
`{ data: { passwordReset: true } }`, clears the browser's authentication cookies
after commit, and issues no replacement session. Role, status, consent, and
email-verification state are preserved. Verification links retain their original
expiry and require the new current password.

Both authentication allowlists expose only the approved POST routes. The plugin
replaces native `requestPasswordReset` and `resetPassword` registry keys; alternate
callbacks remain unavailable. Existing Origin, JSON, body-size, and aggregate IP
controls apply. `AUTH_RECOVERY_IP_LIMIT` and `AUTH_RESET_IP_LIMIT` independently
default to 10 requests per direct-peer IP per 15-minute window. No schema migration
or dependency change is needed.

`test/password-recovery.test.ts` uses the approved HTTP seam, real Better Auth and
Prisma, the identity-verified dedicated database, captured/failing mail, and
controlled clocks. It covers privacy, cooldown boundaries, failed/slow delivery,
expiry, Unicode boundaries, password reuse, legacy recovery, disabled/unverified
owners, consent gates, preserved verification links, multiple sessions, replay,
purpose/account binding, concurrent requests/completions/login, durable audit,
audit-failure rollback, throttling, destinations, and direct-handler enforcement.
The rollback constraint is fixture-scoped and removed in `finally`.

Vitest runs one file at a time to bound CPU and memory use from the approved
scrypt parameters (about 128 MiB per derivation). Concurrent HTTP tests still
exercise simultaneous requests and separate application instances. The initial
five-worker full run exceeded an existing test timeout and returned one reset
error under load; serial execution validates the suite within the available
test-machine budget. Production hashing capacity remains an activation gate.

Verify with `npm run typecheck`,
`npx vitest run test/password-recovery.test.ts test/auth.test.ts`, and `npm test`.
The existing [activation and deployment gates](../specs/phase-1-integration-contract.md#verification-and-approval-checklist)
still apply to real delivery and production deployment.
