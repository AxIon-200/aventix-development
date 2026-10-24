# S03 organizer application and administrator decision design

Status: shared understanding confirmed by the user on 2026-10-23.
This is the S03 design record; implementation is a separate task.

Implementation specification: [S03 organizer application and administrator decision spec](s03-organizer-application-and-decision-spec.md).

This record refines [S03 in the project plan](../../../project-plan.md#s03--apply-as-an-organizer-and-receive-an-administrator-decision).
Preserve the [Phase 1 account requirements](../../documents/phases/phase-1-authentication.md),
[fixed account roles](../adr/0001-fixed-account-roles.md), and
[S01 authentication decisions](s01-attendee-authentication.md).

## Confirmed decisions

1. Submitting an organizer application creates a separate organizer account
   and its pending organization profile atomically. Existing attendee accounts
   retain their identity and role; normalized email addresses cannot be reused.
2. S03 supports one organization per dedicated organizer account. Shared staff
   accounts, invitations, and multiple organizations per account are outside
   this slice.
3. Organizer applicants must accept the current terms and verify their email
   under S01's requirements. Applications may be saved before verification,
   but enter administrator review only after email verification. Submission
   creates no session; login is a separate step. Approval grants organizer
   capabilities rather than creating the account.
4. Pending and rejected applicants cannot log in. They receive the administrator
   decision by email rather than through an authenticated application-status
   screen. Email verification remains a separate prerequisite to review.
5. Required application fields are first name, last name, email, password,
   organization name, and an organization description explaining intended music
   events. Phone is optional. Username and organization type are omitted.
6. Rejection is final for that organizer account. There is no correction or
   resubmission flow. A rejection requires an applicant-visible reason, included
   in the rejection email and retained in administrator history. The rejected
   account retains its normalized email address, which cannot register again.
7. Approved organizers log in with the password supplied when applying, subject
   to the existing verification, consent, and account-status checks. The approval
   email directs them to login without passwords or automatic sign-in links.
8. S03 includes administrator suspension and reinstatement of approved
   organizations. Suspension blocks organizer login and invalidates existing
   sessions, while password recovery remains available. Reinstatement requires
   fresh login and never overrides a disabled account.
9. Suspension leaves existing events, purchased tickets, and attendee access
   unchanged in S03. Event cancellation, sales stoppage, and refunds require
   their own explicit actions and rules.
10. Allowed administrator transitions are pending to approved or rejected,
    approved to suspended, and suspended to approved. Rejection and suspension
    require reasons. Permanently retain the administrator, timestamp, reason,
    and transition. Competing decisions use a version precondition: the first
    committed decision wins, and the other administrator must refresh.
11. Approval, rejection, suspension, and reinstatement each trigger a decision
    email. A failed email does not reverse the decision. Administrators see
    delivery failures and can retry delivery of the recorded decision without
    applying the decision again.
12. Administrators review an immutable submitted application snapshot.
    Organization details are locked during review; later personal-profile edits
    do not rewrite that snapshot. Organization-profile editing after approval
    belongs to its later slice.
13. Administrator review includes pagination, organization/name/email search,
    status filters and counts, application details, decision history, and recent
    owned events. Unverified applications have a separate awaiting-email-
    verification filter and count; approval and rejection remain unavailable
    until verification. New applicants have no recent owned events.
14. Administrator-only CSV exports include all records matching current search
    and filters, with contact details, organization details, status, and decision
    dates. Exclude credentials, tokens, and internal delivery errors.
15. An uncertain application submission retains non-password form fields and
    explains that creation is unconfirmed, offering login, verification resend,
    and password recovery without automatic resubmission. Repeated submission
    never overwrites an existing account or application. If creation succeeds
    but verification-email delivery fails, explicitly report that the application
    was saved and offer resend.
16. Personal-field validation follows S01. Organization names allow 2–150
    trimmed characters, descriptions 20–2,000, and rejection/suspension reasons
    1–500. Organization names need not be unique. Descriptions and reasons are
    plain text; whitespace-only values fail validation.
17. Correct credentials explain pending, rejected, or suspended status without
    creating a session. Incorrect credentials retain S01's generic error.
    Verification resend and password recovery remain available without login,
    under existing S01 protections. Disabled-account and email-verification
    checks retain their established precedence. This feedback does not provide
    an authenticated application workspace.
18. Email delivery retries send only the current decision; notifications for
    superseded decisions are marked superseded. All decisions remain in history.
    Suspension emails include the suspension reason. Reinstatement emails explain
    that fresh login is required. Already delivered emails cannot be recalled.

## Existing implementation constraints

The current organizer profile is one-to-one with an account and supports
PENDING, APPROVED, REJECTED, and SUSPENDED approval states, but lacks rejection
reasons and decision history. Application submission is a disabled preview;
administrator review uses mocks. Organizer workspace pages are placeholders.
Email verification and organization approval must remain distinct concepts;
the existing frontend's verification terminology conflates them.
