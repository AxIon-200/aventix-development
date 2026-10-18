# Abrigo frontend update — based on new develop.zip

## What this update does

This package starts from the exact files in `new develop.zip`, not the older develop upload. It adds the missing frontend Better Auth adapter, same-origin auth forwarding, login/registration availability checks, verified-session redirects and shared logout. It also carries the compact responsive auth/landing sizing and the development-only sample booking walkthrough from the previous delivery.

## Newer team work preserved

- Retained the upload's section-aware navigation, smooth section links, active navigation indicators, landing section IDs and hover/focus styling.
- Retained all three updated mobile sidebar drawers, route matching, collapse controls, icons, classes and navigation handlers. Only each previously inert Sign Out button now uses the shared logout component.
- Kept the existing demo role switchers, click effects, section navigator, global stylesheet and root layout unchanged. These existing demo controls navigate to pages; they do not authenticate users or grant roles. Dashboard content remains the teammates' implementation.
- Existing files already matching the previous result were left untouched, including `.env.local.example`. Preserved original line endings in modified existing files.
- Backend, supplied imagery, package manifests, lockfiles, Tailwind configuration and unrelated page files are byte-for-byte unchanged.

## Interaction status and backend dependencies

The frontend implements required-field feedback, phone/email/password validation, password visibility, safe booking returns, pending/error states, cookie-session validation and server-confirmed logout. Registration sends only the agreed attendee fields, never password confirmation or client-selected privileges. Remember Me is forwarded through the existing Better Auth behavior.

Live signup/login remain blocked in the supplied backend: `backend/src/app.ts` does not mount the existing Better Auth handler. Moyamoy must mount it, provide the running database/auth configuration and connect session authorization. See `MOYAMOY-AUTH-HANDOFF.md`; these are instructions only and were not applied to backend source.

Password-recovery email/token verification, persisted consent policy, live event details/inventory, reservations and payment integration still require agreed backend services. Nothing here claims successful message delivery, real account creation, reservation or payment without a backend response. Existing event API contracts were not changed.

At `/preview/booking`, `npm run dev` exposes an explicitly labeled sample walkthrough of quantities, numbered seats, summary, payment UI and sample confirmation. It creates no real account, reservation, payment or ticket. The route returns 404 in a production build.

## Verification

- `npm run build`: passed with the supplied production script, including TypeScript and page generation. An initial attempt with a cross-project dependency symlink hit Turbopack's filesystem-root restriction; using a local dependency directory resolved that environment issue without source changes.
- `node --test tests/*.test.mjs`: 27 passed.
- ESLint on changed public/auth/booking/config/test files, excluding teammate sidebar files: passed without diagnostics.
- Full `npm run lint`: fails with 18 errors and 9 warnings already present in this exact upload. Compared rule, severity, message and file against an untouched extraction; no new diagnostics. The three sidebar imports shift their existing lint source line numbers by one. No teammate lint issues were changed or suppressed.
- Browser checks: 17 checks passed, including cookie-based redirects/logout, production preview exclusion, sample seat flow and landing/auth/preview overflow checks at 1366, 390 and 320 pixels.
- Browser auth uses a test-only service and HttpOnly cookies through the frontend proxy. It does not validate the real database/Better Auth backend. Development browser checks use test-only offline font responses; no font configuration was changed in source.
- The first extended browser sweep timed out waiting for the landing page's network to become idle. Content-based checks then exposed a 320px header overflow caused by the newly supplied role selector; compact logo width and header gaps were adjusted without removing that selector. The final sweep passed.
- Some development browser reruns stopped during client JavaScript loading before any auth requests; the final completed rerun is the reported result. These test-environment failures were not represented as passed checks.
- Packaging excludes dependencies, build outputs, Git metadata and real environment files. Example environment files are retained.

## Figma and visual scope

This is a selective port of the previously reviewed frontend work onto the newer upload. No new Figma fidelity claim is made for the team's newer UI. The responsive changes target header sizing, landing hero/mockups, account choice, form/card widths and event tab positioning. Long pages still scroll naturally. Backend-dependent success states remain unverified against live services.

## Apply and review safely

1. Keep your current working changes safe. Use an updated local `develop` as the source for your feature branch, per your PM.
2. Use this package's `review/updated-develop-changes.patch` or copy only the files listed below into that feature branch. Do not replace your `.git` directory, real `.env` files or other work with an entire folder overwrite.
3. The patch is based specifically on `new develop.zip`. Run `git apply --check` before applying; if develop has changed again, review the overlap instead of forcing the patch.
4. Run `npm ci` and `npm run dev` in the project root. `.env.local.example` describes the frontend backend-origin setting; adding this setting does not enable the backend handler.
5. Review your diff. The smallest shared changes are `next.config.ts`, `Navbar.tsx`, `Hero.tsx`/`HeroMockups.tsx` and the three Sign Out integrations. These can overlap with ongoing work. Zero future merge conflicts cannot be guaranteed.
6. Open a PR with **base: develop**, **compare: your feature branch**. No commit, push, PR or merge was performed here.

## Exact source/document change list

| File | Status |
| --- | --- |
| `ABRIGO-UPDATED-DEVELOP-REPORT.md` | Added |
| `MOYAMOY-AUTH-HANDOFF.md` | Added |
| `next.config.ts` | Modified |
| `src/app/admin/components/layout/AdminSidebar.tsx` | Modified |
| `src/app/preview/booking/page.tsx` | Added |
| `src/app/register/attendee/page.tsx` | Modified |
| `src/components/Hero.module.css` | Added |
| `src/components/Hero.tsx` | Modified |
| `src/components/HeroMockups.tsx` | Modified |
| `src/components/Navbar.tsx` | Modified |
| `src/components/auth/AccountChoice.tsx` | Modified |
| `src/components/auth/AuthForm.tsx` | Modified |
| `src/components/auth/AuthShell.module.css` | Added |
| `src/components/auth/AuthShell.tsx` | Modified |
| `src/components/auth/FormField.tsx` | Modified |
| `src/components/auth/SignOutButton.tsx` | Added |
| `src/components/auth/useAccountSession.ts` | Modified |
| `src/components/booking/SeatSelection.tsx` | Modified |
| `src/components/booking/TicketSelection.tsx` | Modified |
| `src/components/booking/preview/BookingPreview.tsx` | Added |
| `src/components/dashboard/DashboardSidebar.tsx` | Modified |
| `src/components/event/EventSectionNav.tsx` | Modified |
| `src/components/organizer/OrganizerSidebar.tsx` | Modified |
| `src/lib/auth/better-auth.ts` | Added |
| `src/lib/auth/client.ts` | Modified |
| `src/lib/auth/errors.ts` | Added |
| `tests/auth-integration.test.mjs` | Added |

Generated review aids are `review/updated-develop-changes.patch`, `review/updated-develop-file-changes.json` and `review/updated-develop-verification.json`. Existing review files in the upload are retained as historical records; use these newly named files for this update.
