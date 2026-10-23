# S01 account refresh verification (#108)

Scope: [#108](https://github.com/AxIon-200/aventix-development/issues/108),
following the refresh/logout requirements in the
[approved S01 specification](s01-attendee-authentication-spec.md).

## Behavior

The existing `useAccountSession` consumers share one current-account state per
transport. Identity still comes exclusively from the approved uncached `/api/v1/me`
read. Page pathname/query changes, focus, visibility restoration, and account
signals invalidate previous reads. Pending checks remove the previous identity
and hide mounted workspace content. Only the newest read can publish a result.
Confirmed logout clears mounted account UI; uncertain logout retains its existing
reconciliation and explicit-retry policy.
Subsequent defined refreshes may confirm sign-out with an unauthenticated `/me`
response, including after a reset. A remaining profile or another read failure
keeps sign-out uncertain; refresh never repeats the mutation.

Login/logout send a disposable local-storage nonce to other tabs. Receivers ignore
the value and read `/me`; hints carry no identity, credentials, or tokens, and the
nonce is immediately removed. If browser storage is unavailable, local updates
still work and navigation/focus checks remain available. There is no polling and
no promise that remote expiry or disabling updates an idle tab immediately.

The reset integration in #112 must call `notifyAccountChange("reset")` from
`src/lib/auth/session-events.ts` after confirmed reset. This invalidates local
reads, checks `/me`, and wakes other tabs. Reset forms, token handling, and the
reset mutation remain owned by #112. Exact role/page authorization and removal
of workspace sample content remain owned by #109; the mounted-content boundary
here does not replace server or API authorization.
Pending checks unmount workspace content, so local component drafts are discarded
even if the same account is confirmed afterward. Future business slices must own
safe draft preservation without leaving protected content available while account
state is unknown.

## Actual localhost browser walkthrough

`tests/account-switching.browser.test.mjs` builds an isolated production Next
application and opens installed Chrome against a synthetic HTTP API through the
application's same-origin proxy. Its account cookie is HTTP-only. Temporary app
and browser profiles are cleaned up without changing the user's dev server or
environment files. No real credentials, tokens, database writes, or mail are used.

The automated walkthrough exercises these observable behaviors:

- Focus removes the previous account while a delayed `/me` read is pending.
- A newer eligibility rejection survives a late successful profile response.
- Client navigation inside a preserved workspace layout and query-only navigation
  check current eligibility/authentication.
- Pending, expired/revoked, verification-required, terms-required, recovery-required,
  malformed-profile, and service-unavailable states hide workspace content and
  retain their distinct messages/actions.
- A reset signal with cleared browser cookies defeats a read begun before reset.
- Confirmed reset clears earlier logout uncertainty through a fresh unauthenticated
  read without repeating the logout mutation.
- Two tabs share a cookie, while a background tab refreshes on actual storage
  events after logout and replacement login without being focused. Releasing its
  pre-logout response does not restore the old account. Hint payloads are nonces
  and leave no stored value.
- Remote expiry leaves an idle tab unchanged until bringing that tab to the
  foreground triggers the next check.
- Existing safe account-switching returns and uncertain-logout behavior remain
  covered for attendee, organizer, and administrator logins.

The initial focus regression was observed failing before the implementation:
the previous identity remained visible during the pending read. It passed after
account state was shared and invalidated before refresh.

## Verification commands

Run from the repository root:

```text
node node_modules/typescript/bin/tsc --noEmit
node --test tests/auth-integration.test.mjs
node --test tests/account-switching.browser.test.mjs
node --test tests/*.test.mjs
```

The browser test includes `next build --webpack` and needs access to the Google
Fonts used by the unchanged root layout. Scoped ESLint covers the changed frontend
and test files.

Verified on 2026-10-21:

| Check | Result |
| --- | --- |
| Full frontend suite, including actual two-tab Chrome walkthrough | 38 passed; none skipped |
| Frontend TypeScript | Passed |
| Isolated production Next build (`--webpack`), inside browser suite | Passed |
| ESLint on all changed frontend and test files | Passed |
| Git whitespace check | Passed |

This establishes frontend refresh behavior through a real browser and localhost
proxy, using a controlled API. It does not establish live Better Auth/database
lifecycle behavior, genuine terms, real email delivery, production configuration,
or completion of the joined acceptance journey owned by #114.

## Standards

Independent review found no documented-standard violations or actionable baseline
smells. The documented workspace-unmount/draft-loss tradeoff is not a blocker
under the unknown-account-state requirement and #109's sample-screen replacement.

## Spec

Independent review initially found that a reset signal could not recover from an
earlier uncertain logout because the client refused to read `/me`. The regression
was observed failing, then fixed by allowing later reads to confirm unauthenticated
state. The reviewer confirmed the fix and found no remaining requirements missing,
incorrect behavior, or scope creep within #108.

Review totals: Standards 0 findings; Spec 0 remaining findings (1 fixed).
