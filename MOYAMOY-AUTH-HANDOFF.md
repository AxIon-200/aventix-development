# Backend handoff — enable the existing authentication instance

The supplied project already defines Better Auth in `backend/src/lib/auth.ts`, but `backend/src/app.ts` never mounts it. Creating the instance does not expose its HTTP handler. No backend file was changed by this frontend delivery.

Moyamoy should review and apply the Express 5 integration below in `backend/src/app.ts`, before the existing `express.json()` middleware:

```ts
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";

// After `const app = express()` and before `app.use(express.json())`:
app.all("/api/auth/*splat", toNodeHandler(auth));
```

Keep the existing `/api/v1` router. This mounts the configured library; it does not replace its authentication logic or change the role defaults.

Primary reference: https://better-auth.com/docs/integrations/express . Express 5 uses the named wildcard `*splat`, and the handler must precede body parsing. Verify `/api/auth/ok` responds with `{ "ok": true }`.

Before live account acceptance:

- Run the backend using its existing environment, database connection and agreed schema. Confirm user, account and session tables exist and match the Prisma schema. No migration or database write was run in this task.
- For the default local setup, use frontend `http://localhost:3000` and backend `http://localhost:5000`. The backend's `FRONTEND_URL` must match the actual frontend origin; keep the correct Better Auth URL/secret in backend-only environment configuration.
- Verify registration, session-cookie issuance, login, logout, duplicate-email responses and effective account status against the real database.
- `termsAcceptedAt` and `termsVersion` are explicitly `input: false` in the current backend. The frontend validates checkbox acceptance, but the signup contract cannot persist it. Agree the server-side recording policy; the frontend does not forge these fields or assign a role.
- The role middleware expects `req.user`, but no supplied middleware populates it from the Better Auth session. Moyamoy must connect server-side session validation before protected role APIs can work. Frontend navigation is not authorization.
- Password reset requires the missing `sendResetPassword` delivery implementation and an agreed verification flow. Frontend recovery remains unavailable; no fake email/OTP service was added.

The frontend now uses a same-origin Next rewrite from `/api/auth/*` to `AUTH_BACKEND_URL` + `/api/auth/*`. Its default backend origin is `http://localhost:5000`; `.env.local.example` documents the setting. Cookies are sent with requests and tokens are not stored in browser storage.

The frontend calls only documented Better Auth operations: `ok`, `sign-up/email`, `sign-in/email`, `get-session` and `sign-out`. References: https://better-auth.com/docs/authentication/email-password and https://better-auth.com/docs/concepts/session-management .

Booking still needs separate, agreed APIs for current ticket options, numbered-seat availability, cumulative limits, atomic booking creation, original expiry, owner-authorized retrieval/cancellation, payment methods/results and issued tickets. The uploaded guest event list uses a different DTO and has no event-detail route; database models alone do not expose these operations. No speculative booking endpoints were added.
