## What to build

An existing account missing genuine consent can follow the server's gate to a dedicated current-terms page, enter the current password again, explicitly accept, and return to separate login. Legacy credentials lead to the working recovery journey before consent mutation.

Source: [S01 specification](https://github.com/AxIon-200/aventix-development/issues/107#approved-s01-specification). Reuse the current-terms behavior from registration and the existing consent API; never fabricate historical acceptance.

## Acceptance criteria

- [ ] TERMS_ACCEPTANCE_REQUIRED from login or protected access opens a dedicated acceptance page, prefilling email where available and preserving only validated original-browser return context. Require the current password again; never carry it between pages or persist it.
- [ ] Show the current terms document/version, require literal explicit acceptance, and submit only email, currentPassword, termsAccepted, and termsVersion to the approved consent endpoint.
- [ ] Reuse registration's unavailable-terms retry and stale-version behavior: disable acceptance if terms cannot load; on outdated terms reload the pair, clear acceptance, preserve nonsensitive fields, and require explicit renewed submission. Other account operations remain available independently.
- [ ] Present server gate order accurately: disabled, unverified, missing consent, then mandatory legacy reset. Verification and consent may require recovery before mutation; route PASSWORD_RESET_REQUIRED to the working recovery flow and require a fresh password when the account holder returns.
- [ ] Successful acceptance records genuine consent but creates no session; explain separate login. Do not overwrite valid historical acceptance because a newer terms version exists and do not silently switch identities.
- [ ] Lost consent responses show uncertainty with explicit login/recovery actions, without automatic acceptance retry or a completion claim. Preserve safe field errors, throttling, privacy and Retry-After.
- [ ] Verify missing consent, changed/unavailable terms, legacy reset then genuine consent/login, preserved historical records, no session, and uncertain outcomes through frontend contracts, existing backend consent/recovery tests on the guarded dedicated database, relevant static checks, and a localhost browser journey.


## Activation boundary

Fixture-based acceptance does not lift genuine-terms, actual-account inventory, recovery delivery, or production gates.
