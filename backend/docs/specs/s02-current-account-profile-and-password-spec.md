# S02 — Current-account profile and password

Status: specification for the S02 design confirmed on 2026-10-23. Implementation is a separate task.

Issue: https://github.com/AxIon-200/aventix-development/issues/117

## Problem Statement

An eligible attendee or administrator cannot yet manage their personal account profile through the current workspaces. The named routes show an unavailable screen, while older administrator components still depend on mock services and allow fields or password rules that conflict with the approved account contract. People cannot reliably save a name or phone change, clear their phone, or change a known password from these screens. A lost response can also leave them unsure whether a change occurred.

The personal account profile belongs to one Aventix account identity. A person with separate attendee, organizer, or administrator identities must see and change only the identity used by the current session. Account screens need to explain confirmed, rejected, and uncertain outcomes without displaying sample personal records.

## Solution

Connect the attendee profile and administrator profile/security screens to the existing current-account and authenticated password-change operations. Provide a password entry point in administrator settings. Read the current identity's full personal account profile, permit explicit saving or discarding of allowed name and phone changes, and offer a known-password change with local confirmation and a link to S01 recovery. Preserve the approved account eligibility, validation, session, and error contracts. Treat lost mutation responses as uncertain and reconcile only where the available read can establish the requested visible result.

## User Stories

1. As an eligible attendee, I want to open my personal account profile from my workspace, so that I can see and manage my own account details.
2. As an eligible administrator, I want to open my personal account profile from my workspace, so that I can manage the identity I use for administration.
3. As an administrator, I want a password entry point in settings, so that I can reach the same account security action from that screen.
4. As an account holder, I want every entry point to show only my current identity's profile, so that separate Aventix identities never appear as one account.
5. As an account holder, I want to see my first name, last name, email, and optional phone number from the live account service, so that the displayed information is current.
6. As an account holder, I want the email address to be read-only, so that the screen does not imply that email changes are supported.
7. As an account holder, I want to edit my first and last names separately, so that the stored fields match the approved profile contract.
8. As an account holder, I want Unicode, punctuation, and internal spaces in my names to be accepted within the approved limits, so that supported names are not rejected by a narrower form rule.
9. As an account holder, I want surrounding whitespace removed from submitted names, so that saved values match the server's canonical profile.
10. As an account holder, I want to add or replace a valid Philippine mobile number, so that my optional contact number is current.
11. As an account holder, I want to clear my phone number, so that the saved profile has no phone when I choose to remove it.
12. As an account holder, I want the form to distinguish an untouched phone from a cleared phone, so that an unrelated name change does not alter my contact number.
13. As an account holder, I want Save and Discard actions, so that I control whether edits are submitted or abandoned.
14. As an account holder, I want Save to send only changed allowed fields, so that untouched fields remain as they were on the server.
15. As an account holder, I want a successful save to display the canonical returned profile, so that normalized values and the derived name are visible.
16. As an account holder, I want invalid input or a rejected save to keep my draft and show useful field or account feedback, so that I can correct it without retyping valid edits.
17. As an account holder, I want the whole save rejected when any submitted field is invalid or forbidden, so that no partial change is mistaken for success.
18. As an account holder, I want fresh account reads to preserve my unsaved draft, so that navigation, focus, or another account refresh does not silently erase my work.
19. As an account holder, I want an in-app warning before leaving a dirty profile form, so that I can keep editing or deliberately discard it.
20. As an account holder, I want the browser's standard warning on reload or close when the form is dirty, so that I have a chance to avoid losing edits.
21. As an account holder, I want clean profile forms to navigate without a warning, so that ordinary navigation stays simple.
22. As an account holder, I want a lost save response checked against a fresh profile read, so that the interface claims success only if my submitted values can be confirmed.
23. As an account holder, I want an unconfirmed save to retain my draft and avoid automatic resubmission, so that I can decide what to do next without hiding an uncertain result.
24. As an account holder, I want a later explicit save to use the fields I choose even if another tab changed one of them, so that the outcome follows the existing partial-update contract.
25. As an account holder, I want to enter my current password, a new password, and its confirmation at every password entry point, so that I can intentionally change a known credential.
26. As an account holder, I want password confirmation checked in the browser and omitted from the API request, so that a mismatch is caught without sending an unsupported field.
27. As an account holder, I want new-password validation to follow the shared exact 15–128 Unicode-code-point policy, so that supported passwords are accepted without trimming or composition rules.
28. As an account holder, I want wrong-current-password, reused-password, and validation errors explained without claiming a change, so that I can correct the submission.
29. As an account holder, I want a forgotten-current-password link to S01 recovery, so that I can reset a password I no longer know.
30. As an account holder, I want a confirmed password change to keep me on the current account page, so that I can continue in my retained session.
31. As an account holder, I want confirmation to explain that my requesting session keeps its original expiry while other sessions and outstanding reset links are invalidated, so that I understand the security effect.
32. As an account holder, I want password inputs cleared after a confirmed change, so that the completed secret is not left in the form.
33. As an account holder, I want a lost password-change response described as uncertain without an automatic retry, so that a second mutation is not sent by accident.
34. As an account holder, I want password inputs cleared after an uncertain response and guidance to try login or S01 recovery if necessary, so that I can establish which password works without a false success claim.
35. As an account holder, I want a current-account read used only to check session availability after an uncertain password change, so that the interface does not pretend it can read the stored password.
36. As an account holder whose session expires or becomes ineligible, I want the existing S01 login, verification, consent, disabled-account, or legacy-reset guidance, so that I reach the right next step.
37. As an account holder, I want an account-service outage shown as unavailable or uncertain, so that I do not see mock personal information or a fabricated success.
38. As an account holder, I want profile and password controls that are labeled, keyboard usable, and readable on mobile and desktop, so that I can complete the tasks in my chosen browser.

## Implementation Decisions

- Reuse the S01 current-account session, eligibility, navigation, error, and recovery flows. The profile form needs the full current-account profile rather than S01's smaller navigation identity projection.
- Expose personal account editing and authenticated password change on the attendee profile screen. Expose the same personal account editing and password action on the administrator profile/security screen, with a password entry point in administrator settings. Do not turn the organizer's organization profile into a personal account form in S02.
- Use the existing `GET/PATCH /api/v1/me` contract for profile reads and partial, atomic updates. Submit only changed `firstName`, `lastName`, and `phoneNumber` fields. An emptied phone submits `null`; an unchanged phone is omitted. Reject empty updates and any protected or unknown fields through the approved contract.
- Email is read-only. Role, status, verification, consent, derived name, avatar, and account activity are not editable through this feature. Keep unrelated administrator settings and mock controls unavailable until their own slices provide live contracts.
- Follow the shared input policy: trim the outer whitespace of names, count 1–100 Unicode code points after trimming, allow Unicode and internal punctuation/space; accept only the approved Philippine mobile formats and display the server's normalized value after saving.
- Keep a saved profile and a separate draft. A fresh current-account read must not overwrite a dirty draft. Explicit Discard restores the latest accepted saved profile. Warn on dirty in-app navigation; use the browser's standard reload/close warning. Clean forms do not warn.
- A confirmed save displays the returned canonical profile. If the response is lost or unusable, perform one fresh `/me` read and compare the submitted fields against canonical values, including trimmed names and normalized phone. Claim the requested visible result only when that comparison succeeds. Otherwise preserve the draft, report uncertainty, and do not automatically submit another patch. The existing contract has no version precondition; a later explicit write to the same field may win over another tab's update.
- Use the existing `POST /api/auth/change-password` contract for all password entry points. Send only `currentPassword` and `newPassword`; keep confirmation local. Preserve exact passwords without trim or Unicode normalization and apply the shared 15–128 Unicode-code-point rule, with no composition rule. Link a forgotten-current-password user to S01 recovery.
- On confirmed password change, stay on the current account screen, clear password inputs, and explain the retained requesting session, original expiry, other-session revocation, and reset-link invalidation. On a lost or unusable response, clear inputs, report uncertainty, and do not retry automatically. `/me` can establish only the current session's availability, not which password is stored; offer login and S01 recovery guidance.
- Preserve server errors and gates: an invalid or forbidden profile patch changes nothing; incorrect or reused passwords change no credential or session; expired sessions go to login; disabled, unverified, missing-consent, and legacy-credential states use their S01 outcomes. Never display mock personal records or expose secrets and provider payloads.
- Reuse Better Auth, the approved cookie-based transport, and existing backend lifecycle operations. No schema change or new identity, credential, or session implementation is planned.

## Testing Decisions

- Good tests assert behavior visible at the public boundary: rendered values and messages, permitted navigation, exact HTTP paths and payload fields, canonical save results, persistence after reload, session access, and safe uncertainty handling. Avoid private helper call counts, component snapshots, and tests that merely restate implementation structure.
- The primary S02 seam is the existing user-facing attendee and administrator routes, with a controlled current-account HTTP boundary. Cover profile load, allowed editing, phone clear, Discard, dirty-navigation warning, validation, canonical save, lost-response reconciliation, account refresh during a draft, password entry from both administrator locations, and uncertain password change. Exercise actual keyboard and mobile/desktop presentation in the browser. This route-level seam was confirmed by the user on 2026-10-23.
- Reuse the frontend's injected-transport contract tests for exact profile/password request and response handling, particularly allowlisted fields, no confirmation sent, exact password preservation, account errors, no automatic mutation replay, and one `/me` reconciliation read for a lost profile save. Existing authentication, recovery, and browser account-switching tests are the closest prior art.
- Reuse the backend's existing public HTTP integration suites for `/me` and authenticated password change. Their real application, Better Auth, Prisma, and guarded dedicated PostgreSQL database already cover atomic profile validation, own-account isolation, allowed roles, wrong/reused passwords, retained requesting session with original expiry, other-session and reset-link invalidation, and audit rollback. Extend them only for a concrete contract gap revealed by S02.
- Acceptance includes frontend contract tests, relevant backend profile/password suites on the guarded test database, frontend type/build checks, and a localhost browser walkthrough of attendee and administrator routes, including another session for password revocation and a lost-response scenario. Report blocked or unrun checks rather than treating a controlled transport as proof of browser cookies or real delivery.

## Out of Scope

- The organizer's organization profile and organizer profile screen; shared current-account backend operations remain available to eligible organizer accounts.
- Email changes, profile photos/avatars, administrator activity data, two-factor controls, other administrator settings preferences, and business workspace integrations.
- Password recovery request/reset implementation, reset-token preflight, a new password policy, a new session system, a sign-out-all-devices control, and versioned profile conflict resolution.
- Application implementation, production deployment, live-account changes, real email sending, or lifting the S01 activation gates as part of this specification task.

## Further Notes

- Repository source: [S02 specification](https://github.com/AxIon-200/aventix-development/blob/feat/S02-edit-the-current-account-and-change-its-password/backend/docs/specs/s02-current-account-profile-and-password-spec.md). The full specification is reproduced in the issue while this new file awaits a commit to the branch.
- The confirmed [S02 design record](s02-current-account-profile-and-password.md) supplies the interaction decisions. [S02 in the project plan](../../../project-plan.md#s02--edit-the-current-account-and-change-its-password) defines the slice and its S01 dependency.
- The [Phase 1 account requirements](../../documents/phases/phase-1-authentication.md) and [approved integration contract](phase-1-integration-contract.md) remain authoritative for validation, HTTP envelopes, session effects, and account gates. The [S01 authentication integration](s01-attendee-authentication.md) owns login, recovery, consent, and account refresh.
- Use [the account glossary](../../GLOSSARY.md) for personal account profile and separate account identity terminology; preserve [the fixed-role decision](../adr/0001-fixed-account-roles.md).
- Earlier issues #14, #72, and #73 overlap portions of this slice. The S02 issue records the current cross-role integration and confirmed uncertainty behavior without claiming those historical tickets were implemented or changing their status.
