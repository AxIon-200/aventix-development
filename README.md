# Aventix navbar page-link fix

This update changes only `src/components/Navbar.tsx` from the previously delivered `aventix-updated-develop-frontend.zip`.

The newer team upload intercepted homepage navigation and mapped Events to Trending Events, About to How It Works, and Contact to the organizer section. This fix removes that interception and the scroll-based active-page state. Standard Next.js links now open `/events`, `/about` and `/contact`; the active indicator follows the current route. Mobile menu links close the menu. Styling, responsive sizes, account/session controls and existing demo switchers are retained. Backend files are unchanged.

## Apply

1. Stop `npm run dev` with Ctrl+C.
2. Copy `src/components/Navbar.tsx` from this ZIP into the same path in your project, replacing only that file. Alternatively, apply `navbar-page-links.patch` after running `git apply --check navbar-page-links.patch` against the previous delivered version.
3. Delete the generated `.next` folder to clear old bundles. In Windows Command Prompt from the project root: `rmdir /s /q .next`.
4. Run `npm run dev` and refresh the browser.

No npm dependency installation or backend changes are required for this fix. Preserve your Git folder, environment files and any unrelated changes. Review overlapping local Navbar changes before replacing it.

## Verification

Production build and scoped Navbar ESLint passed. Browser verification results are included in `verification.json`. The first browser attempt used stale production bundles; the final test uses a clean production build. Backend account-service connection errors are expected when that separate service is not running and do not constitute live authentication verification.
