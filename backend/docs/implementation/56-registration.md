# Attendee registration — issue #56

Implements [#56](https://github.com/AxIon-200/aventix-development/issues/56).
Behavior and HTTP contracts remain authoritative in the
[Phase 1 requirements](../../documents/phases/phase-1-authentication.md) and
[approved integration contract](../specs/phase-1-integration-contract.md).

`GET /api/v1/terms` and `POST /api/auth/register` use one immutable terms
snapshot. Supply `CURRENT_TERMS_VERSION` and `CURRENT_TERMS_DOCUMENT_URL`
privately from the owner's reviewed document. Both absent keeps these operations
unavailable with HTTP 503; an incomplete or invalid pair fails application
initialization. The examples contain no legal terms or default version.
Tests inject an explicitly labeled fixture; it is never the runtime default.

Registration writes the user, Better Auth credential, verification-token digest,
and initial delivery cooldown in one Better Auth/Prisma transaction. Email is
sent after commit. An email failure retains these records, sends no session,
and tells the caller to request a resend. The resend and password-gated
verification operations are implemented in [issue #57](57-email-verification.md);
their native equivalents remain unavailable. The read-only verification landing resource carries no
token in its request URL and makes no account changes.

Real delivery uses the [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email)
with `RESEND_API_KEY` and `AUTH_EMAIL_FROM`, a ten-second timeout, and no
automatic retry. Disable provider open/click tracking before real sends.
The domainless sender is restricted to the provider account owner's mailbox;
arbitrary recipients require a verified sending domain. Provider credentials,
genuine terms, and real delivery remain activation inputs, as recorded in the
[operational prerequisites](../specs/phase-1-operational-prerequisites.md).

Local access keeps `trust proxy=false`, uses the direct peer IP, and ignores
forwarded client-IP headers. IPv4-mapped addresses share the IPv4 key; IPv6
addresses share a /64 network key. Registration and aggregate counters persist
in PostgreSQL fixed fifteen-minute buckets. Configure their limits with
`AUTH_REGISTRATION_IP_LIMIT` and `AUTH_AGGREGATE_IP_LIMIT`. Public deployment
still requires the approved host, proxy, cookie and browser checks. Expired
`auth_rate_limit` rows can be removed during ordinary database maintenance.

Before database writes, configure `.env.test` using
[the test example](../../.env.test.example), retaining all
[test setup checks](../../test/setup.ts). Run
`npx tsx scripts/registration-preflight.ts` for a read-only, marker-verified
aggregate inventory. It reports existing consent/verification/legacy-credential
counts without revealing account identities or secrets and rejects ambiguous
data. Resolve noncanonical emails or collisions through owner review; never
fabricate consent, verification or replacement credentials. This command is
restricted to the dedicated test database and does not migrate any database.

The registration migration adds lifecycle storage and a normalized-email
unique index without backfilling account state. Generate the client with
`npx prisma generate`; apply migrations only after verifying the intended target
and its inventory. Do not run database migrations against development merely
to satisfy integration tests. Existing legacy credentials are not upgraded by
registration; their recovery transition belongs to the later lifecycle tickets.

Run `npm run typecheck`, then focused HTTP tests with
`npx vitest run test/registration.test.ts test/auth.test.ts`, and `npm test`.
These exercise real Better Auth/Prisma with captured or failed delivery,
including concurrent duplicate registration and a late database failure proving
transaction rollback. Controlled delivery does not establish inbox delivery or
browser cookie behavior.
