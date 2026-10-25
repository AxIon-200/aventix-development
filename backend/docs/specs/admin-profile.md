# Administrator personal account profile

The `/admin/profile` page uses the existing current-account contracts and validation in [Phase 1](../../documents/phases/phase-1-authentication.md) and [S02](s02-current-account-profile-and-password.md).

- `GET /api/v1/admin/profile` returns `{ data: AdminProfile }` for the authenticated, eligible administrator only. It rejects query parameters, disables caching, and projects public identity fields plus the latest recorded `PASSWORD_CHANGED` or `PASSWORD_RESET` timestamp. No arbitrary user lookup is supported.
- `GET/PATCH /api/v1/me` reads and updates first name, last name, and optional Philippine mobile number. Empty phone input sends `null`; the form sends only changed fields. Email is read-only. Updates remain atomic and preserve protected identity fields.
- `POST /api/auth/change-password` accepts current and new passwords, preserves the requesting session, and invalidates other sessions and reset links. Passwords use the existing 15–128 Unicode character policy.

The page reuses shared account forms, session eligibility checks, save reconciliation, password uncertainty handling, and recovery links. Unsaved drafts warn before navigation, reload, and close. The account summary and topbar display canonical saved names.

Photo uploads remain deferred. Historical login times and two-factor configuration are unavailable and displayed as such, rather than fabricated from mock data. Missing password audit history is shown as no recorded change.

Verification: `npm run typecheck`, `npx vitest run test/admin-profile.test.ts test/profile.test.ts --pool=threads`, and the frontend profile editing/reconciliation tests.
