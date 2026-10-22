## What to build

Connect the existing frontend account screens and navigation to Aventix's approved authentication and current-account APIs. Attendees can register with explicit current terms, verify with their current password, sign in separately, recover a password, complete missing legacy consent, and sign out. All three role workspaces enforce current account eligibility and exact roles while unfinished business features show truthful unavailable states.

This parent tracks the eight approved S01 implementation tickets. The [approved S01 specification snapshot](https://github.com/AxIon-200/aventix-development/issues/107#approved-s01-specification) contains the detailed contract, scope, and testing decisions. The user approved the breakdown and public HTTP testing seam on 2026-10-21.

## Sub-issues and dependencies

| Ticket | Delivers | Blocked by |
| --- | --- | --- |
| #107 | Sign-in, current-account navigation, and sign-out | None |
| #108 | Account refresh across navigation and tabs | #107 |
| #109 | Role workspace protection and removal of personal sample content | #107 |
| #110 | Attendee registration with current terms | #107 |
| #111 | Password-gated email verification and resend | #107 |
| #112 | Password recovery and reset sign-out effects | #107 |
| #113 | Missing legacy consent | #110, #112 |
| #114 | Joined localhost acceptance evidence | #108, #109, #111, #113 |

Work the frontier: #107 can start first; other tickets become available as their native blocking dependencies complete. The parent groups this work; it does not introduce a prerequisite that blocks its own children.

## Acceptance criteria

- [ ] All eight sub-issues meet their own acceptance criteria, with the joined localhost journey verified by #114.
- [ ] Registration, verification, consent, and reset follow the approved no-session/separate-login behavior; real account identity, safe booking returns, session refresh, and confirmed/uncertain logout are integrated.
- [ ] Guest, ineligible, and wrong-role access is handled at protected page/data boundaries for attendee, organizer, and administrator workspaces, without leaking protected or personal sample content.
- [ ] Updated frontend contracts, backend lifecycle suites on the guarded dedicated test database, relevant static checks, frontend production build, and actual localhost browser evidence are recorded honestly. Missing checks remain visible blockers.
- [ ] Technical acceptance is recorded separately from real-user activation: genuine reviewed terms, actual delivery and its recipient limits, actual-account inventory and working legacy recovery, and separately approved production HTTPS/cookie/proxy verification remain required.

## Scope boundaries

Reuse the existing Better Auth/Prisma identity, sessions, and Aventix lifecycle; no new authentication system or planned schema change. Profile editing and authenticated password change belong to S02. Event, booking, payment, ticket, organizer-onboarding, and administrative business integrations remain later slices. Publication of this tracking parent does not start application implementation, send real email, change live accounts, deploy, or lift activation gates. Historical issues remain unchanged.
