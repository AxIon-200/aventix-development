# Administrator settings

`GET /api/v1/admin/settings` returns `{ settings, updatedAt }` for the signed-in
administrator. Defaults have `updatedAt: null`; reading defaults does not write
to the database. `PUT` accepts the full settings object and returns the persisted
values and server save timestamp. Preferences belong to the authenticated account;
account IDs and query parameters are not accepted.

Both routes require a live, eligible `ADMINISTRATOR` session and return
`Cache-Control: no-store`. Writes require the configured frontend Origin and JSON
content type. Strict validation rejects unknown fields, invalid values, and
unavailable options. Saving preferences and the `ADMIN_SETTINGS_UPDATED` audit
entry is transactional. Preferences are deleted when their account is deleted.

The frontend uses the existing Next.js `/api/v1` proxy. Saved preferences apply
to admin timestamp formatting, workspace spacing, table spacing, sidebar state,
reduced motion, and visible-dashboard refresh. Refresh is opt-in for dashboard
requests; editable settings and account forms do not refresh automatically.
Dark theme and English are currently supported.

Notification preferences persist, but automated notification delivery and summary
scheduling are not implemented. The page states this limitation. Two-factor
authentication, login alerts, inactivity logout, other themes/languages, and
platform maintenance are unavailable; their controls are disabled and the API
rejects enabling them. Sessions retain the approved fixed seven-day lifetime.

Password changes use the existing `/api/auth/change-password` operation, including
current-password verification, 15–128 Unicode-code-point length validation,
password-reuse rejection, reset-link invalidation, and revocation of other sessions.
The current session remains signed in. No demo password is used.

Apply `20261025000000_admin_preferences` before running the updated backend, then
regenerate the Prisma client. Targeted verification:
`npx vitest run test/admin-settings.test.ts test/admin-profile.test.ts`.
