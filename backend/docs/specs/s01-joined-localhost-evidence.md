# S01 joined localhost verification (#114)

Verified on 2026-10-22 against the approved [S01 specification](s01-attendee-authentication-spec.md). This record distinguishes controlled technical checks from real-user activation. No production account, provider mailbox, or live sending credential was used.

## Test boundary and cleanup

The frontend contracts use injected fetch at the public HTTP boundary. The browser tests start headless Chrome and an isolated production Next build, pass same-origin requests through the Next proxy, and use either a synthetic HTTP account service for navigation races or real Express, Better Auth, and Prisma for account lifecycles. The latter loads `backend/.env.test`, checks development/test URL separation and the expected test-project identity, then checks the `aventix-test` database marker before writes. Synthetic accounts and their cooldown/throttle rows are removed at fixture shutdown. Mail is captured in memory. The browser document is explicitly a prototype fixture, served from the frontend's static legal path; its reachability is part of the joined test, but it is not genuine reviewed terms.

## Commands and results

| Working directory | Command | Result |
| --- | --- | --- |
| Repository root | `node --test tests/auth-integration.test.mjs tests/registration.test.mjs tests/consent.test.mjs tests/recovery.test.mjs tests/verification.test.mjs` | 22 frontend contract tests passed. |
| Repository root | `node node_modules/typescript/bin/tsc --noEmit` | Passed. |
| Repository root | `npm.cmd run build` | Passed with Next 16.3.8 and all production routes generated. |
| Backend | `npm run typecheck` | Passed after the browser fixture change. |
| Backend | `npm.cmd test -- --run test/registration.test.ts` | 49 tests passed on the guarded dedicated test database. |
| Backend | `npm.cmd test` | 257 passed, 2 timed out in `terms-acceptance.test.ts` at the configured 15-second limit; 11 of 12 files passed. This is a failed full run. |
| Backend | `npm.cmd test -- --run test/terms-acceptance.test.ts` | All 17 passed in isolation, including both timed-out checks. This does not turn the full run into a pass. |
| Backend | `npm.cmd test -- --testTimeout=30000` | 258 passed, 1 timed out in `account-maintenance.test.ts` at the 30-second limit; 11 of 12 files passed. This is another failed full run. |
| Backend | `npm.cmd test -- --run test/account-maintenance.test.ts` | All 9 passed in isolation, including the timed-out check. This does not turn either full run into a pass. |
| Backend | `npm.cmd test -- --run test/account-maintenance.test.ts test/terms-acceptance.test.ts --reporter=verbose` | All 26 tests passed across both previously timeout-prone files. |
| Backend | `npm.cmd test -- --reporter=verbose` | All 259 tests passed across 12 of 12 files with the repository's unchanged 15-second timeout; the full run took 553.58 seconds. |
| Repository root | `node node_modules/eslint/bin/eslint.js tests/verification.browser.test.mjs` | No errors; one existing warning at line 30 in the test helper. |
| Repository root | `node --test tests/verification.browser.test.mjs` | All 25 browser checks passed against real Express/Better Auth/Prisma and the guarded database. |
| Repository root | `node --test --test-concurrency=1 tests/*.test.mjs` | All 90 frontend tests passed, including the account-switching and real-backend browser suites. |

The first backend registration attempt ran inside the default sandbox and received `EACCES` from Prisma when contacting the guarded test database. The test database identity check succeeded before that connection attempt. Rerunning with database network access passed all 49 registration tests. The first two full backend runs failed at different tests despite clean focused reruns; the third full run passed at the unchanged 15-second timeout. The earlier timeouts were intermittent, and their cause remains unexplained. One password-change case in the passing run took 14.4 seconds, close to that timeout. The passing run establishes a complete suite result, not a fix for the timing variability; no activation claim depends on it.

## Parent #115 revalidation on 2026-10-22

All eight S01 child issues (#107-#114) are closed. Revalidation on the parent
branch produced these results without application-code changes:

| Working directory | Command | Result |
| --- | --- | --- |
| Repository root | `node --test tests/auth-integration.test.mjs tests/registration.test.mjs tests/consent.test.mjs tests/recovery.test.mjs tests/verification.test.mjs` | 22/22 frontend account contracts passed. |
| Repository root | `node node_modules/typescript/bin/tsc --noEmit` | Passed. |
| Repository root | `npm.cmd run build` | Passed with Next 16.3.8. |
| Repository root | `node --test --test-concurrency=1 tests/*.test.mjs` | 90/90 frontend tests passed, including both browser suites. |
| Backend | `npm.cmd run typecheck` | Passed. |
| Backend | `npm.cmd test -- --reporter=verbose` | Failed: 258/259 tests passed across 12 files; one profile test timed out. Duration: 785.12 seconds. |
| Backend | `npm.cmd test -- --run test/profile.test.ts --reporter=verbose` | All 16 profile tests passed, including the timed-out case. Duration: 93.52 seconds. |
| Backend | `npm.cmd test -- --reporter=dot` | All 259 tests passed across 12 files. Duration: 581.76 seconds. |

The failed full-run profile case took 19.1 seconds in the focused file before
the complete rerun passed. The full-run timeout remains intermittent and its
cause is not established. The tests used the same guarded dedicated database;
these results do not change the activation requirements below.

## Browser observations

The new joined browser path submits registration from the attendee form after loading the current fixture terms and checking that its same-origin document returns HTTP 200. It observes account creation without a cookie and one captured verification message. The email opens in a fresh browser tab: the fragment is immediately stripped, explicit password-gated verification issues no cookie, and separate login issues the persistent Better Auth cookie and reaches `/events`. The proxy records the original browser Origin on the registration, verification, and login mutations. A second browser path observes account creation despite failed controlled delivery, rejection of duplicate registration, and a fresh captured link after explicit resend. Reloading the authenticated page retains the original cookie and expiry. A separate Chrome restart with the same browser profile also retains that cookie and expiry and renders the protected attendee unavailable screen with that account's real fixture identity.

The existing real-backend browser scenarios exercise missing and changed consent, mandatory legacy recovery, wrong-password verification retry, fresh and legacy verification/reset links and explicit bridge Continue, reload/reopen instructions, invalid/expired/used links, privacy-preserving resend/recovery cooldowns, `Retry-After`, lost mutation responses without automatic retries, reset password reuse, account restrictions, reset revocation, and resetting one account while another account's browser cookie is present. The synthetic account browser scenarios exercise direct and client navigation through nested workspaces, guest and all role pairings, gate/outage states, protected-content absence, safe/rejected returns, focus/navigation/cross-tab refresh, late responses, and confirmed or uncertain logout.

The local proxy forwards credentials to Express. Express keeps `trust proxy=false` and selects the direct socket peer for IP limits. The browser test lowers only the guarded fixture's registration limit to one, completes one registration through the proxy, and sends a second from the browser with spoofed `X-Forwarded-For` and `X-Real-IP` headers. The second request receives the backend's `RATE_LIMITED` response and positive `Retry-After`, with no verification mail. Requests sharing the local proxy intentionally aggregate under its loopback IP; spoofed forwarding headers do not select another bucket. The backend session and registration suites cover the same durable limit independently. Localhost does not establish a production trusted-proxy arrangement.

## Real-user activation remains pending

- An owner must supply and review genuine terms, with an accessible matching document and version. The prototype fixture is not legal acceptance evidence.
- Real sending configuration and an inbox smoke check remain required. Any restricted owner-mailbox demonstration must be distinguished from delivery to arbitrary recipients. Captured mail proves no external delivery.
- Actual accounts must be inventoried and recovery must work before activating the mandatory legacy transition. This run uses disposable synthetic identities only.
- Production HTTPS origin, cookie behavior, and trusted proxy/IP handling require separate approval and verification. No deployment or live-account operation was performed.
