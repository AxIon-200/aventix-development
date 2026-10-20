# Phase 1 Better Auth compatibility evidence

Research for issue #55, 2026-10-19. The user approved the extension and transaction
boundary on 2026-10-19; see the [approval record](phase-1-integration-contract.md#approval-record).
The user also approved localhost-first scope and mandatory legacy recovery/reset;
the consolidated contract received final approval on 2026-10-19. Issue #56 remains outside
the authorized scope. The
[Phase 1 requirements](../../documents/phases/phase-1-authentication.md) and
[fixed-role ADR](../adr/0001-fixed-account-roles.md) remain authoritative.

## Reproducible evidence and limitations

At the initial source review there was no backend `node_modules` directory. Running
`node -e "try { console.log(import.meta.resolve('better-auth')) } catch(e) {console.log(e.code)}"`
returned `ERR_MODULE_NOT_FOUND`. Installed-version or runtime compatibility
was therefore **not verified** at that point. The follow-up isolated runtime
verification below supersedes that limitation for the dependency mechanisms it
exercised; the backend itself remains uninstalled. `package.json` declares `^1.7.7`; `package-lock.json`
locks Better Auth, its core, and its Prisma adapter to **1.7.7**, and
`@better-auth/utils` to **0.4.2**. Relevant lock entries start at lines 32, 115,
and 2220. That initial review installed no dependencies and contacted no database.

Research downloaded these exact registry archives into OS temporary storage,
extracted them, and compared each archive's SHA-512 against its lockfile
`integrity`; all four matched:

- [better-auth 1.7.7](https://registry.npmjs.org/better-auth/-/better-auth-1.7.7.tgz)
- [core 1.7.7](https://registry.npmjs.org/@better-auth/core/-/core-1.7.7.tgz)
- [Prisma adapter 1.7.7](https://registry.npmjs.org/@better-auth/prisma-adapter/-/prisma-adapter-1.7.7.tgz)
- [utils 0.4.2](https://registry.npmjs.org/@better-auth/utils/-/utils-0.4.2.tgz)

The citations below identify package-relative files and line numbers in these
archives, not nonexistent repository `node_modules` files. Better Auth source
was extracted to `%TEMP%/aventix-issue55-source/package`, core to
`aventix-issue55-core/package`, adapter to `aventix-issue55-prisma/package`, and
utils to `aventix-issue55-utils/package`. These temporary files are disposable;
the exact archives and lockfile are the reproducible source of evidence.

## Compatibility findings

| Approved behavior | Exact-source finding | Required approach |
| --- | --- | --- |
| Link plus current password to verify; no session | Native verification accepts a JWT query token, verifies its signature, and marks the email verified without a password. Verification tokens are stateless JWTs. (`better-auth/dist/api/routes/email-verification.mjs:14`, `:175`, `:295`.) | Aventix verification completion endpoint with password verification inside the account transaction; disable native `/verify-email`. |
| Multiple verification links; invalidate all on success | JWT issuance leaves earlier links independently valid, but there is no persisted per-link consumption state. Already verified accounts follow a separate response path. (`email-verification.mjs:14`, `:287`.) | Persist purpose-bound token digests and independent expiries; success atomically marks verified and consumes all verification tokens; incorrect passwords leave tokens intact. |
| Multiple reset links; success invalidates all | Reset request creates independent `reset-password:<token>` records, but completion consumes only the supplied token before separately updating credentials. (`password.mjs:77`, `:153`, `:167`.) | Transactional account-scoped completion invalidating every reset token and session; native callback/completion unavailable publicly. |
| Atomic reset/change/audit | Native reset consumes its token, writes the password, calls `onPasswordReset`, then optionally deletes sessions; no encompassing transaction appears in that handler. (`password.mjs:153-170`.) | One explicit transaction for token recheck, credentials, invalidation, and audit. An after hook alone cannot establish atomicity. |
| Change retains the existing session and original expiry | `revokeOtherSessions: true` deletes all sessions and creates a replacement, then writes a new cookie. (`update-user.mjs:174-183`.) | Delete other session rows using account ID and current-session exclusion; preserve the requesting session row, token, and `expiresAt`; invalidate reset tokens in the same transaction. |
| Seven-day fixed sessions; no remember-me variation | Native sign-in accepts `rememberMe: false`; session creation then uses one day. Refresh can extend expiry unless disabled. (`sign-in.mjs:356`, `db/internal-adapter.mjs:271`, `session.mjs:181-200`.) | Fixed `expiresIn: 604800`, `disableSessionRefresh: true`, cookie cache disabled, no public remember-me field. Never replace the current session during password change. |
| Persistent secure cookies | Defaults are HTTP-only, path `/`, `SameSite=Lax`, session max age seven days; secure selection depends on URL/config. (`cookies/index.mjs:22-49`.) | Explicit production secure cookies and verified origins; topology chooses SameSite. Any cookie reissue must use remaining original lifetime, not a fresh seven days. |
| Password length in code points | Native minimum/maximum validators use JavaScript `.length`. (`utils/password.mjs:4`, `:10`.) | Shared Aventix validation using `[...value].length`; reject outside 15–128. Native length limits must not reject valid astral characters: internal configured maximum may be 256 UTF-16 units with the mandatory 128-code-point endpoint validation. |
| Preserve password contents exactly | Default password implementation delegates to utils, whose Node and fallback scrypt implementations call `.normalize("NFKC")`. (`better-auth/dist/crypto/password.mjs:1-13`; `utils/dist/password.node.mjs:12`, `password.mjs:11`.) | Supported `emailAndPassword.password.hash/verify` overrides must use a versioned raw UTF-8 scheme without normalization. Existing default hashes need an explicit legacy-compatibility decision; exact original passwords cannot be recovered from normalized hashes. |
| Correct-password gate before account disclosure | Native login verifies the password before email verification, but has no Aventix disabled/consent ordering by default. (`sign-in.mjs:332-355`.) | Account policy must run after successful credential verification and before session creation: disabled, then unverified, then missing consent. Login must not send mail. |
| Conflict on duplicate registration | With required email verification or auto-sign-in disabled, native registration deliberately returns a synthetic success for an existing email. (`sign-up.mjs:155-199`.) | Aventix duplicate adapter with unique database constraint and safe 409 handling; no existing credentials/profile mutation. A precheck alone is insufficient under races. |
| Cookie credentials only in responses | Native login JSON includes the session token. (`sign-in.mjs:367-372`.) | Aventix success serializer excludes token fields while preserving Set-Cookie. |

## Supported extension boundary and atomicity

The exported plugin contract supports endpoints, request interception, hooks,
and plugin database schema (`core/dist/types/plugin.d.mts:37-89`). Public
`better-auth/api` exports `createAuthEndpoint`, middleware, and session helpers
(`better-auth/dist/api/index.mjs:220`). Cookie helpers are exported through
`better-auth/cookies` (`better-auth/package.json:69`). Password hash/verify
overrides are explicitly documented in the types
(`core/dist/types/init-options.d.mts:751-772`). Prefer these extension surfaces;
do not import private package filesystem paths or copy native handlers.

`@better-auth/core/context` publicly exports `runWithTransaction` and
`getCurrentAdapter` (`core/dist/context/index.mjs:4-5`). The former opens the
configured adapter transaction and propagates its adapter through async context
(`context/transaction.mjs:54-90`). Better Auth's internal adapter uses this
transaction-aware adapter (`better-auth/dist/db/internal-adapter.mjs:6`, `:48`).
The plugin context exposes the ordinary adapter, password functions, and
`internalAdapter` in its types (`core/dist/types/context.d.mts:266`, `:281`,
`:300`). `internalAdapter` is a typed extension-context member but remains a
version-sensitive surface: isolate its use behind one small bridge, rather than
treating every internal method as a stable external authentication API.

**The Prisma adapter disables general transactions by default.** Its option
must explicitly enable them (`prisma-adapter/dist/index.mjs:463-471`). The
existing `src/lib/auth.ts` does not enable this option. Merely wrapping existing
calls in `runWithTransaction` without enabling it does not prove rollback.

Proposed mechanism: implement an Aventix Better Auth plugin with plugin schema
for purpose-bound token digests, cooldowns, audit data, and an account mutation
lock nonce. Use the configured transactional adapter and obtain its current
transaction adapter for **every** plugin data operation. Update a dedicated
`User` row's lifecycle-lock nonce by unique account ID to acquire a PostgreSQL
row lock, then re-read state under READ COMMITTED. The nonce is an implementation
field, never a role/status change. Acquire the account lock before any related
purpose cooldown lock consistently across operations.
Serialize login/session issuance, token
issuance, verification, reset, change, disabling, and re-enabling for the same
account; reset must preserve verification tokens. Recheck token expiry,
credential hash, status, and current-session validity after acquiring the guard.
Do not assume a process-local mutex protects multiple backend processes.

An equally valid database-lock approach needs access to the same Prisma
transaction for all writes. Raw Prisma calls on the global client do **not**
automatically join Better Auth's adapter transaction. Avoid combining the two
transaction models without an explicit bridge. The adapter explicitly warns that
ordinary `update` is not a race-safe guarded state transition; use `incrementOne`
for guarded counters rather than assuming conditional `update` is sufficient
(`core/dist/db/adapter/index.d.mts:406-421`). The nonce update above acquires a
lock rather than deciding eligibility from a stale predicate. Database tests must prove
rollback and race behavior during implementation. This source investigation
does not claim those tests have run.

Send provider email only after the issuance/cooldown transaction commits; a
failed delivery preserves its cooldown and does not reveal account existence.
Registration email failure must preserve the account and consent record. These
are requirements from the authoritative Phase 1 document, not native defaults.

## Public route bypass protection

`disabledPaths` compares exact normalized path strings
(`better-auth/dist/api/index.mjs:166-168`); it is not a wildcard deny policy for
dynamic callback paths. Use an outer method-and-path allowlist for Aventix
authentication endpoints plus plugin enforcement, and reject every other
native operation, including alternate methods, native verification/reset
callbacks, update-user, change-email, session-management, and account-linking
routes. Retain Better Auth's origin/CSRF middleware, then explicitly apply the
approved checks to Aventix endpoints. A server-side `auth.api` call must not be
assumed to pass an Express allowlist. Test both HTTP exposure and internal
delegation boundaries. This also prevents native remember-me input, unrestricted
profile updates, synthetic registration success, and token-bearing responses
from bypassing the Aventix contracts.

Some proposed public POST paths coincide with native POST paths. The plugin
must replace the native endpoint registry keys `requestPasswordReset`,
`resetPassword`, and `changePassword`, rather than registering a second handler
on each path. The endpoint registry spreads plugin endpoints after native ones
(`better-auth/dist/api/index.mjs:145`), which supports this replacement. Replace
`verifyEmail` too, exposing only the password-gated POST. A path-level
`disabledPaths` entry would also block the replacement endpoint; use the outer
allowlist for denied paths/methods. Do not rely on duplicate-route ordering.

## Approved boundary and remaining prerequisites

Configuration and hooks alone are insufficient. The approved combination of
password-gated verification, purpose-bound token lifecycle, coordinated atomic
invalidation, unchanged current-session expiry, exact Unicode password handling,
and race-safe account policy requires **substantial custom authentication
orchestration**. Calling this only a response wrapper would understate the work.

Recommend explicit approval of the contained Aventix plugin/transaction bridge
described above while retaining Better Auth for credential hashing integration,
credential records, session records, cookie signing, and validation. This keeps
the approved shared identity and fixed-role ADR. The alternative is a separately
approved requirements/architecture change; none is implied by this research.
The user subsequently approved this extension and transaction boundary; that
decision is recorded in the linked approval record. Legacy normalized password
hashes follow the approved mandatory recovery/reset transition; no sending
domain or genuine terms currently exists, as confirmed by the owner. These
resources and production deployment verification remain activation/release
gates under the approved localhost-first scope. The isolated
runtime checks below resolve dependency loading and the exercised extension
mechanisms; real PostgreSQL rollback and race behavior remain implementation tests.
The original instruction not to start #56 remains in effect.

## Follow-up isolated runtime verification

On 2026-10-19, copied the backend `package.json` and `package-lock.json` to
`%TEMP%/aventix-issue55-runtime` and ran
`npm.cmd ci --prefix <temporary-directory> --ignore-scripts --no-audit --no-fund`.
The command completed successfully, installing 322 packages. Install scripts
were disabled; no backend dependency tree, lockfile, configuration, Prisma
generation, or application file was changed. Node was `v24.18.0`.

Read package metadata from that installation and loaded the public exports.
Actual installed versions were Better Auth/core/Prisma adapter **1.7.7** and
utils **0.4.2**, matching the lockfile. A disposable Node assertion script used
Better Auth's memory adapter and synthetic credentials entirely in memory.
It made requests directly to `auth.handler`, without a listener, database,
provider, or real user. All **14 assertions passed**:

| Runtime check | Result and implication |
| --- | --- |
| Default hashing accepts NFKC-equivalent spellings | Confirmed the exact-password conflict |
| Native registration creates an immediate session | Confirmed it cannot be exposed as approved registration |
| Initial cookie has HttpOnly, SameSite=Lax, and seven-day Max-Age | Confirmed the inspected local defaults |
| Configured session starts with seven-day lifetime | Confirmed `expiresIn: 604800` |
| Reading a session with refresh disabled preserves stored expiry | Confirmed this immediate read does not renew it; long-term/time-boundary behavior remains an implementation test |
| Native change with revokeOtherSessions replaces current row/token | Confirmed the unchanged-current-session conflict |
| Plugin `resetPassword` registry replacement handles native POST path | Confirmed endpoint-key replacement dispatch |
| Plugin `verifyEmail` replacement handles custom POST | Confirmed the password-gated completion route can replace the native operation |
| Replaced verifyEmail no longer exposes native GET | Confirmed link-only native dispatch is removed by replacement |
| Public transaction helper propagates current adapter | Confirmed async context receives the callback adapter |
| Transaction helper calls configured transaction | Confirmed the transaction entry point is invoked |
| Transaction adapter scope ends after callback | Confirmed no adapter leaks into subsequent work |
| Transaction callback errors propagate | Confirmed errors are not swallowed by that helper |
| Supported password hash override receives original Unicode input | Confirmed the extension can receive unnormalized input |

The transaction checks used an instrumented adapter, not PostgreSQL. They do
not prove database rollback, row-lock behavior, Prisma schema compatibility,
or cross-process races. Those require the dedicated verified test database
and the later implementation. Native signup/change in this experiment demonstrate
library behavior only; no Aventix lifecycle feature was implemented.

The disposable reproduction script is retained in temporary storage as
`%TEMP%/aventix-issue55-runtime/compatibility-probe.mjs`; its complete contents
are archived below for reproduction. Execute it from the temporary directory
after installing copies of the exact lockfile, never against application
credentials or a live database.


### Disposable runtime reproduction script

```javascript
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { createAuthEndpoint } from 'better-auth/api';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { getCurrentAdapter, runWithTransaction } from '@better-auth/core/context';
const checks = [];
const check = (name, condition) => { assert.ok(condition, name); checks.push(name); };
for (const name of ['better-auth', '@better-auth/core', '@better-auth/prisma-adapter', '@better-auth/utils']) {
 const pkg = JSON.parse(await readFile(new URL('./node_modules/' + name + '/package.json', import.meta.url), 'utf8'));
 console.log('VERSION ' + name + ' ' + pkg.version);
}
const normalized = 'Research-only-passphrase-\u00e9';
const alternate = 'Research-only-passphrase-e\u0301';
const hash = await hashPassword(normalized);
check('Default helper accepts NFKC-equivalent spellings (confirmed conflict)', await verifyPassword({hash, password:alternate}));
const db = { user: [], account: [], session: [], verification: [] };
const options = {
 baseURL:'http://localhost:5000', secret:'temporary-research-secret-not-a-real-credential-55',
 trustedOrigins:['http://localhost:3000'], database:memoryAdapter(db),
 emailAndPassword:{enabled:true}, logger:{disabled:true},
 session:{expiresIn:604800, disableSessionRefresh:true, cookieCache:{enabled:false}},
};
const auth = betterAuth(options);
const post = (instance, path, body, cookie) => instance.handler(new Request('http://localhost:5000/api/auth'+path, {
 method:'POST', headers:{'Content-Type':'application/json', Origin:'http://localhost:3000', ...(cookie ? {Cookie:cookie} : {})}, body:JSON.stringify(body),
}));
const email = 'probe@example.com';
const password = 'Disposable research passphrase 55!';
const signup = await post(auth, '/sign-up/email', {name:'Research Fixture', email, password});
check('Native signup issues session without approved lifecycle (confirmed conflict)', signup.status === 200 && db.session.length === 1);
const cookieHeader = signup.headers.get('set-cookie');
check('Persistent cookie has HttpOnly, SameSite=Lax and Max-Age', /httponly/i.test(cookieHeader) && /samesite=lax/i.test(cookieHeader) && /max-age=604800/i.test(cookieHeader));
const cookie = cookieHeader.split(';')[0];
const original = {...db.session[0]};
check('Configured initial session lifetime is seven days', Math.abs(new Date(original.expiresAt)-new Date(original.createdAt)-604800000) < 2000);
const getSession = await auth.handler(new Request('http://localhost:5000/api/auth/get-session',{headers:{Cookie:cookie}}));
check('Session access does not change stored expiry with refresh disabled', getSession.status === 200 && String(db.session[0].expiresAt) === String(original.expiresAt));
const change = await post(auth, '/change-password', {currentPassword:password,newPassword:'Disposable replacement passphrase 55!',revokeOtherSessions:true},cookie);
check('Native revokeOtherSessions replaces current session (confirmed conflict)',change.status === 200 && db.session.length === 1 && db.session[0].id !== original.id && db.session[0].token !== original.token);
const plugin = {id:'issue55-research', endpoints:{
 resetPassword:createAuthEndpoint('/reset-password',{method:'POST'}, async ctx=>ctx.json({replacement:true})),
 verifyEmail:createAuthEndpoint('/verify-email',{method:'POST'}, async ctx=>ctx.json({replacement:true})),
}};
const replacementAuth = betterAuth({...options, plugins:[plugin]});
const reset = await post(replacementAuth,'/reset-password',{});
check('Plugin registry replacement overrides native reset POST',reset.status===200 && (await reset.json()).replacement===true);
const verification = await post(replacementAuth,'/verify-email',{});
check('Plugin registry replacement exposes custom verification POST',verification.status===200 && (await verification.json()).replacement===true);
const nativeVerification = await replacementAuth.handler(new Request('http://localhost:5000/api/auth/verify-email?token=research-fixture'));
check('Replacing verifyEmail removes native link-only GET',nativeVerification.status===404 || nativeVerification.status===405);
const fallback = {name:'fallback'};
const transactionAdapter = {name:'transaction'};
let transactionReached=false;
const adapter = {transaction:async fn=>{transactionReached=true; return fn(transactionAdapter);}};
await runWithTransaction(adapter,async()=>{check('Public transaction helper propagates the active adapter',(await getCurrentAdapter(fallback))===transactionAdapter);});
check('Public transaction helper calls configured transaction',transactionReached);
check('Transaction adapter scope ends after callback',(await getCurrentAdapter(fallback))===fallback);
let errorPropagated=false;
try { await runWithTransaction(adapter,async()=>{throw new Error('research rollback sentinel');}); } catch {errorPropagated=true;}
check('Public transaction helper propagates callback failure',errorPropagated);
const seen=[];
const overrideAuth=betterAuth({...options,database:memoryAdapter({user:[],account:[],session:[],verification:[]}), emailAndPassword:{enabled:true,password:{hash:async value=>{seen.push(value);return hashPassword(value);},verify:verifyPassword}}});
const overrideResult=await post(overrideAuth,'/sign-up/email',{name:'Override Fixture',email:'override@example.com',password:alternate});
check('Supported password hash override receives original Unicode input',overrideResult.status===200 && seen.includes(alternate));
console.log(JSON.stringify({passed:checks.length,checks},null,2));
```
