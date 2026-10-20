## What to build

Guests and ineligible accounts cannot see protected workspaces. Each eligible account can enter only its exact role's workspace, showing real identity and an honest unavailable screen wherever business functionality is unfinished.

Source: [S01 specification](https://github.com/AxIon-200/aventix-development/issues/107#approved-s01-specification). Attendee, organizer, and administrator accounts remain separate fixed-role identities.

## Acceptance criteria

- [ ] Enforce live current-account eligibility and explicit role checks at every protected page/data entry point, including nested pages, direct requests, and client navigation. Read the installed Next.js authentication guide; layout-only checks are insufficient.
- [ ] Missing, expired, or revoked authentication directs to login using only validated allowed return context. Wrong-role access shows denial with a link to the permitted area and does not sign the account out.
- [ ] Disabled, unverified, missing-consent, and legacy-credential outcomes follow backend policy. Account-service failures show retryable unavailability and expose no protected content.
- [ ] Eligible users see real account identity, public navigation, logout, and unavailable content on unfinished workspace pages. Remove personal sample tickets, payments, statistics, and working-looking mutations throughout these protected areas.
- [ ] Remove connected role-demo switches/dropdowns and any URL/local-state role override. Retained explicit development previews cannot bypass authentication. Public event fixtures remain clearly within their later integration boundary and do not become live inventory.
- [ ] Express remains authoritative for every protected API request. Existing stub business routers and test-only authorization demonstrations are not evidence of completed business authorization; do not expose unfinished operations as part of this slice.
- [ ] Verify guests and all allowed/denied role pairings through direct and client-navigated nested routes, plus stale/revoked/disabled sessions and outages. Assert absence of protected rendered content; reuse backend authorization tests on the guarded dedicated database and run frontend type/build checks.
