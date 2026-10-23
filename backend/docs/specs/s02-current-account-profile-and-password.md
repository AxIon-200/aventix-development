# S02 current-account profile and password design

Status: shared understanding confirmed by the user on 2026-10-23. This is the S02 design record; implementation is a separate task.

Implementation specification: [S02 current-account profile and password spec](s02-current-account-profile-and-password-spec.md).

This record refines [S02 in the project plan](../../../project-plan.md#s02--edit-the-current-account-and-change-its-password). The [Phase 1 account requirements](../../documents/phases/phase-1-authentication.md), [approved HTTP contract](phase-1-integration-contract.md), and [S01 authentication integration](s01-attendee-authentication.md) remain authoritative for field validation, password and session behavior, current-account access, and recovery.

## Confirmed decisions

1. `/dashboard/profile` will expose both personal account editing and authenticated password change. Both use the existing current-account operations.
2. S02 will leave `/organizer/profile` for the later organizer-profile slice. The shared backend operations remain available to eligible organizer accounts; S02 does not add an organizer profile screen.
3. `/admin/profile` will expose personal account editing and password security. `/admin/settings` will expose its password entry point. Other mock preferences and security controls remain unavailable until their respective slices.
4. The personal account profile form will have explicit Save and Discard actions. Save sends only changed fields; an emptied phone field sends `null`. Validation failure retains the draft, and a confirmed save displays the returned canonical profile.
5. If a profile-save response is lost, read `/me` and compare the submitted fields before claiming success. If the read also fails or does not establish the requested result, keep the draft and describe the save as unconfirmed; do not resubmit automatically.
6. If a password-change response is lost, do not claim success or automatically retry. Clear password inputs and explain that `/me` can confirm the session but not the stored password. Offer login and S01 recovery guidance if the user cannot establish which password works.
7. Use **personal account profile** for the name, email, and phone belonging to one identity, distinct from an organizer's organization profile. The term is recorded in the [account glossary](../../GLOSSARY.md).
8. A fresh `/me` result must not silently replace unsaved edits. Save sends only changed fields; if another tab changed one of those same fields, the explicit later save may win. S02 does not add a versioned conflict protocol.
9. Ask before discarding a dirty profile draft during in-app navigation. Use the browser's standard warning for reload or close. Clean forms need no warning.
10. On a confirmed password change, stay on the current account page, clear the password inputs, and explain that the requesting session remains signed in to its original expiry while other sessions and outstanding reset links are invalidated.
11. Every S02 password entry point requests current password, new password, and confirmation, and links to S01 recovery for a forgotten current password. Confirmation stays in the client; the API receives only current and new passwords.

## Established contract to preserve

- The editable personal fields are first name, last name, and optional phone. Email is read-only; role, status, verification, and consent are not editable.
- `GET/PATCH /api/v1/me` reads and atomically edits the requesting account. `POST /api/auth/change-password` changes a known password and preserves only the requesting session with its original expiry.
- S01 owns forgot-password and reset integration. A user who does not know the current password uses that flow.

## Integration consequences

The three named routes currently render S01's unavailable workspace screen. Older admin profile and settings components still exist but use mock services, editable email/full-name fields, and password rules that conflict with the approved contract. S02 must connect only the confirmed account controls to the live current-account API and use the shared validation policy. The existing account navigation session is a small identity projection; the edit form needs the full `/me` profile.

Profile reconciliation compares submitted fields with their canonical server values, including trimmed names and normalized phone numbers. A successful comparison establishes the requested visible result; a failed comparison or unavailable read does not prove whether the original request committed. An explicit later save may overwrite a concurrent edit to the same field because the approved profile contract has no version precondition.

Known server failures keep their established meanings: invalid or forbidden profile fields reject the whole patch; wrong current password and password reuse leave credentials and sessions unchanged; expired sessions require login; disabled, unverified, missing-consent, and legacy-credential gates follow the S01 account flow. The profile and password screens must show unavailable or uncertain outcomes truthfully, without displaying mock personal records or claiming an unconfirmed mutation succeeded.
