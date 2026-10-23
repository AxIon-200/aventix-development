# Implementation handoff: S01 joined localhost account journey

Snapshot: 2026-10-22 (Asia/Manila). This document is for continuing [GitHub sub-issue #114, “S01: Verify the joined S01 localhost account journey”](https://github.com/AxIon-200/aventix-development/issues/114), a child of #115.

## Repository state

- Branch: `v2-feat/33-authentication-and-user-account-management`.
- Latest commit: `8a5f4740 Verify joined S01 localhost account journey (#114)`. The branch is one commit ahead of its `origin` tracking branch. It has not been pushed during this work.
- At the start of this handoff request, the tracked working tree was clean. This handoff document is the only file created or edited for the request.
- A third complete backend run passed after two earlier runs timed out in different tests. The committed evidence record predates that pass and still needs its test table updated before #114 is assessed for technical completion. Do not close the issue based only on this handoff; real-user activation remains separate.

## Original task and acceptance criteria

The requested workflow was `$implement sub-issue#114`: fetch the ticket, implement it, test, review, and commit on the current branch. The issue asks for reproducible evidence that the connected S01 account journeys and protected workspaces work together in a real localhost browser. It separates technical completion from real-user activation. The approved test seam is the existing public application HTTP boundary: injected `fetch` for frontend contracts; the backend application factory with real Better Auth and Prisma on the guarded dedicated PostgreSQL test database; and actual browser checks. The source is the [S01 specification](../backend/docs/specs/s01-attendee-authentication-spec.md), with [Phase 1 requirements](../backend/documents/phases/phase-1-authentication.md) authoritative for account policy.

The issue's acceptance checklist, condensed without changing its scope:

1. Run updated frontend authentication/public tests, frontend typechecking and production build, backend authentication lifecycle tests on the guarded test database, and appropriate backend static checks. Preserve the development/test database separation and identity guards. Record unavailable infrastructure as a blocker.
2. Walk registration with current terms, captured verification mail, separate login, failed initial delivery and resend, duplicate registration, legacy consent and mandatory reset, recovery/reset, password reuse, verification with the new password, and disabled/unverified restrictions.
3. Exercise new and legacy verification/reset links, immediate fragment stripping, explicit bridge Continue, reload/reopen guidance, wrong-password retry, invalid/expired/used links, signed-in completion, and reset with another account's cookie in the browser.
4. Verify browser-to-Next-proxy-to-API credentials, cookie persistence after reload and browser reopening within its original expiry, mutation Origin, real IP throttling and spoofing resistance. Document localhost IP aggregation without claiming production proxy trust.
5. Exercise safe and rejected returns in original-browser and fresh email-tab flows, account choices while signed in, navigation/focus/cross-tab refresh and late-response races, confirmed logout, lost-logout reconciliation, and unresolved uncertainty when reconciliation also fails.
6. Cover direct and client-navigated nested protected pages for guests and all role pairings, stale/revoked/disabled sessions, outages, no protected content leakage or role switches, and unavailable unfinished workspaces showing real identity without personal sample records.
7. Check lost mutation responses without automatic retry, privacy-preserving resend/recovery cooldowns, and `Retry-After`. Retain backend rollback, replay, concurrency, and native-route-denial coverage.
8. Record commands and browser observations without secrets or provider payloads; fix S01 integration defects found and record blockers honestly.
9. Keep real-user activation separate: genuine reviewed terms/version/document, real sending configuration and inbox smoke evidence, owner-mailbox versus arbitrary-recipient delivery, actual-account inventory and working recovery before legacy activation, and separately approved production HTTPS/cookie/proxy verification. This ticket does not authorize creating legal terms, configuring real credentials, sending provider mail, using live accounts, or deploying.

## Implemented and verified so far

Commit `8a5f4740` added joined browser coverage and an [evidence record](../backend/docs/specs/s01-joined-localhost-evidence.md). No production application code was changed by #114. Earlier S01 sub-issues supplied the account journeys and workspace behavior; #114 joins and verifies them.

- Registration through the attendee form loads a reachable same-origin prototype terms document, creates an unverified account without a session, captures one verification message, then verifies and logs in separately from a fresh email tab.
- Controlled failed initial delivery retains the account and consent; duplicate registration is rejected; explicit resend supplies a fresh captured link.
- Browser checks cover fragment stripping, legacy bridge Continue, verification and recovery paths, wrong-password retry, link errors, legacy consent/reset, cooldown and lost-response handling, signed-in completion, account restrictions, and other-account cookie behavior. Existing account-switching browser checks cover protected workspace and navigation races.
- An authenticated page reload and a full Chrome restart with the same profile retain the original persistent session cookie and expiry, and the protected attendee page shows the fixture account's identity.
- A real browser request through the Next proxy triggers the backend's registration IP limit and positive `Retry-After`; spoofed `X-Forwarded-For` and `X-Real-IP` headers do not bypass the loopback peer's shared bucket.
- The evidence clearly labels captured mail and prototype terms as controlled technical fixtures, not activation evidence.

Files created or modified in commit `8a5f4740`:

| File | Purpose |
| --- | --- |
| [`backend/docs/specs/s01-joined-localhost-evidence.md`](../backend/docs/specs/s01-joined-localhost-evidence.md) | Commands, outcomes, browser observations, cleanup, and activation boundaries. |
| [`backend/test/fixtures/verification-browser-server.ts`](../backend/test/fixtures/verification-browser-server.ts) | Guarded registration fixtures, prototype terms URL, and a test-only one-request registration limit for the proxy/IP check. |
| [`tests/verification.browser.test.mjs`](../tests/verification.browser.test.mjs) | Joined registration, fresh email tab, failed-delivery/resend, cookie reload/restart, mutation Origin, and real localhost throttle browser scenarios. |

This handoff creates `docs/implementation-handoff.md` only. No implementation file was changed during the handoff request or the immediately preceding timeout investigation.

## Test and review results

The [evidence record](../backend/docs/specs/s01-joined-localhost-evidence.md) contains the exact commands and initial results. Key results:

| Check | Result |
| --- | --- |
| Frontend contracts | 22 passed. |
| Frontend TypeScript and Next 16.3.8 production build | Passed. |
| Full frontend suite: `node --test --test-concurrency=1 tests/*.test.mjs` | **90/90 passed**, including both browser suites. |
| Real-backend browser file: `node --test tests/verification.browser.test.mjs` | **25/25 passed**. |
| Backend typecheck | Passed. |
| Backend registration file | 49/49 passed. |
| Backend terms-acceptance file | 17/17 passed in isolation. |
| Backend account-maintenance file | 9/9 passed in isolation. |
| Both timeout-prone files together | 26/26 passed with `npm.cmd test -- --run test/account-maintenance.test.ts test/terms-acceptance.test.ts --reporter=verbose`. |
| Full backend suite at configured 15-second timeout | **Failed:** 257/259 passed; two `terms-acceptance.test.ts` timeouts. |
| Full backend suite with `--testTimeout=30000` | **Failed:** 258/259 passed; one `account-maintenance.test.ts` timeout. |
| Full backend suite with the repository's unchanged 15-second timeout: `npm.cmd test -- --reporter=verbose` | **Passed:** 259/259 tests across 12/12 files. The run took 553.58 seconds. |
| ESLint on the browser file | No errors; one pre-existing warning in the helper at line 30. |

The first backend test attempt inside the default sandbox failed with Prisma `EACCES` when connecting to the test database. The guarded environment check had passed; rerunning with database network access passed. Use `backend/.env.test` only through the repository's test setup and do not print its values. On this Windows PowerShell host, `npm.cmd` works where `npm.ps1`/`npx.ps1` may be blocked by execution policy.

The required two-axis review of commit `8a5f4740` found **0 standards findings** and **1 spec finding at the time**: no complete backend run had passed. The third full run now addresses that finding, but the committed evidence record has not yet been updated or reviewed against the final test result.

The third full backend attempt exited successfully with 259/259 passing. Earlier focused timing checks showed the account-maintenance race case passing in about 3.5 seconds and the terms validation case in about 4.7 seconds; the two files together passed in 76 seconds. The successful full run still showed database cases close to the configured 15-second limit (one password-change case took 14.4 seconds). The cause of the earlier intermittent timeouts is **not established**. Preserve both failed-run history and the final pass in the evidence; do not claim that the underlying timing variability was fixed.

## Architecture and safety boundaries

- The frontend contract seam uses injected `fetch` at public HTTP APIs. Browser tests run Chrome against an isolated production Next build and its same-origin rewrite proxy. Account lifecycle browser tests reach real Express, Better Auth, Prisma, and the guarded PostgreSQL database; navigation race tests use a synthetic HTTP account service. These tests do not mock internal lifecycle methods.
- The backend test setup checks `NODE_ENV=test`, required database configuration, development/test URL separation, and expected Supabase test-project identity. The browser fixture additionally checks the `aventix-test` database marker before writes and cleans synthetic identities, cooldowns, and throttle rows after the run. Preserve these checks.
- Backend Express sets `trust proxy=false`; durable IP limits use the direct socket peer. All local Next-proxy requests intentionally aggregate under loopback. This is not proof of a production trusted-proxy deployment.
- S01 keeps separate attendee, organizer, and administrator accounts; no role conversion is part of this ticket. Verification and reset require explicit browser actions and do not create replacement sessions. Lost mutations are not automatically retried.
- Prototype terms and captured mail are controlled fixtures. Genuine terms, real delivery, actual-account inventory/recovery, production HTTPS/cookie/proxy checks, and any deployment remain separate activation work requiring the appropriate owner decisions.

## Exact next steps

1. **Update the committed evidence record.** In [`backend/docs/specs/s01-joined-localhost-evidence.md`](../backend/docs/specs/s01-joined-localhost-evidence.md), add `npm.cmd test -- --reporter=verbose` with **259/259 passed, 12/12 files, 553.58 seconds**, and explain that the two earlier full-run timeouts were intermittent and remain unexplained. Keep the failed results visible; do not claim a fix for timing variability.
2. **Review the final evidence against #114.** Repeat the repository `code-review` skill's Standards and Spec axes for the evidence update. The prior Spec finding was the missing passing backend run; verify that the final document resolves it without overstating activation. Keep the test database and privacy guards intact.
3. **Commit the evidence-only follow-up on the current branch.** No production-code change or blanket timeout increase is supported by these results. The full frontend suite, build, frontend typecheck, backend typecheck, browser test, and full backend suite have now passed on this branch; rerun only if the follow-up changes executable behavior or a required repository gate calls for it.
4. **Assess technical closure separately from activation.** After the evidence update and review, #114 can be considered for technical completion. Genuine owner-reviewed terms, real sending and inbox smoke evidence, actual-account recovery inventory, and approved production HTTPS/cookie/proxy checks remain outside this ticket's executed work. Do not push, close the issue, deploy, or operate on live accounts without the appropriate instruction.
5. **If the suite flakes again later, diagnose before editing.** Use the full verbose run as the red-capable signal, compare the failing case with an isolated run and the 26-test combined run, and look for a reproducible database wait, lock, resource, or file-order effect. Keep the 15-second default and lifecycle assertions unless measurements justify a bounded change. Do not log credentials, tokens, mail bodies, or provider responses.
