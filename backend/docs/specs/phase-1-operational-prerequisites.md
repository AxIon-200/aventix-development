# Phase 1 operational prerequisites

Issue #55 research, checked 2026-10-19. This note supplies evidence for the
[integration contract](phase-1-integration-contract.md), subject to the
[approved requirements](../../documents/phases/phase-1-authentication.md) and
[fixed-role ADR](../adr/0001-fixed-account-roles.md). Recommendations below are
implementation proposals, not claims that external accounts, documents, or
deployment resources exist. The user subsequently approved localhost-first
scope and mandatory legacy recovery/reset, and confirmed that no sending domain
or approved terms currently exists. See the contract's
[approval record](phase-1-integration-contract.md#approval-record). No application
configuration or database was changed.

## Repository evidence

| Prerequisite | Evidence and conclusion |
| --- | --- |
| Local origins | [.env.example](../../.env.example) declares frontend `http://localhost:3000` and API `http://localhost:5000`. These support a concrete local planning target; they do not establish production hosts. |
| Production deployment | The frontend [README](../../../README.md) contains stock Next.js/Vercel deployment guidance. No owner-confirmed deployed host, trusted proxy topology, or public canonical origin was found in the inspected application source, project READMEs, Prisma files, or backend specs. Template recommendations are not deployment evidence. |
| Email setup | No selected operational sender or verified sending domain was found in those sources. Resend is already proposed by the integration contract; public provider capabilities are checked below. No credentials or private environment values were read or printed. |
| Genuine terms | Frontend [AuthModal](../../../src/components/AuthModal.tsx) renders Terms/Privacy as spans, and [Footer](../../../src/components/Footer.tsx) uses `href="#"` policy links. Neither is a terms document. No authoritative terms text, versioned artifact, or live document URL was found in the inspected files. |
| Existing credentials | [auth configuration](../../src/lib/auth.ts) currently uses Better Auth's default password implementation. [Existing auth tests](../../test/auth.test.ts) create and clean up UUID-named test accounts. No seed command or inserted account data was found in `package.json` or `prisma/`. This does not prove a deployed database has no users; no account inventory was performed. |

## Approved local demonstration scope

Use the two documented localhost origins, direct access with no trusted proxy,
and the contract's fixed API completion landing paths. The approved local cookie
uses `HttpOnly`, `SameSite=Lax`, no `Domain`, and the approved fixed session
lifetime; local HTTP is a development-only exception to production secure
cookies. Restrict credentialed CORS and trusted origins to the exact frontend
origin and require explicit origin/CSRF validation on mutations, including
backend tests. Never mix `localhost` and `127.0.0.1` while diagnosing browser
cookie behavior. The implementation must verify these details; this note does
not claim a browser smoke test occurred.

This chooses a feasible planning target without inventing a production domain.
Public deployment retains the integration contract's HTTPS, cookie-site, origin,
and verified proxy prerequisites. It must be separately verified before exposure.

## Resend feasibility and setup evidence

Resend's current transactional Free plan lists 3,000 emails per month, a 100-email
daily cap, and three domains at $0/month. This is a plausible demonstration
budget; actual account quota and remaining allowance require account verification.
Use the current [pricing page](https://resend.com/pricing), rather than older
announcements with different domain counts.

A domain purchase is not technically necessary for a restricted single-mailbox
smoke test: Resend's `onboarding@resend.dev` test sender can deliver only to the
email address associated with the Resend account. This can demonstrate actual
verification and recovery delivery to that mailbox. It does not support
arbitrary attendee, organizer, or administrator addresses, and must not be
advertised as general delivery. See Resend's
[testing-domain restriction](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

General delivery needs an owned domain or delegated subdomain with DNS access,
added and verified in Resend. Follow the exact DNS records shown for that domain
and wait for sending verification; choose a sender on that verified domain.
Do not invent a sender address, assume ownership, or purchase resources.
See [domain setup](https://resend.com/docs/add-a-domain) and
[verified domains](https://resend.com/docs/dashboard/domains/introduction).

Open/click tracking is disabled by default at domain level. Verify it remains
disabled for authentication mail; click tracking rewrites links through a
tracking subdomain. Resend supports domain-level configuration in its dashboard
and API. See [tracking documentation](https://resend.com/docs/dashboard/domains/tracking).
Use the integration contract's token-safe logging and fixed completion links;
provider delivery necessarily processes message content, so an application-log
redaction claim must not be represented as zero provider retention.

No provider account was created, DNS changed, quota inspected, or email sent in
this research. The owner must provide an account/API credential privately and
confirm the account mailbox for a restricted demo, or verify an owned sender
domain for multiple recipients. Automated tests continue to use controlled mail
capture as required; that substitute is not evidence of real email delivery.

## Terms and legacy credentials

The terms endpoint can be implemented and tested against controlled test data,
but release registration and genuine legacy acceptance require the actual
owner-approved document, its version, and a reachable URL. A made-up version,
placeholder URL, implicit frontend notice, or manufactured historical consent
cannot satisfy the approved requirements. A backend-owned static document path
can avoid production hosting dependency once the owner supplies the actual text;
adding that endpoint/file belongs to later implementation work. No terms text
or purported owner approval is invented here.

For legacy credential transition, do not infer zero accounts from absent seeds.
The user approved recovery/reset into the new exact-password format for existing
default hashes; see the authoritative
[transition requirements](../../documents/phases/phase-1-authentication.md#legacy-credential-transition).
The integration contract supplies the final error and gate-order details.
Existing sessions cannot circumvent recovery. No account deletion, mass
credential update, fabricated consent, or mass verification is authorized.

## Planning resolution versus activation evidence

Local origins, a direct-access topology, a bounded real-email test option, and
the approved legacy transition resolve the local planning choices.
Actual sender activation, genuine terms, public-host verification, and deployed
account inventory are external inputs that this repository cannot prove. They
are recorded as activation/release gates under the user's approved local-first
scope. They have not passed. The consolidated implementation contract received
final approval on 2026-10-19, completing local #55 planning/approval work; the
separate instruction not to start #56 remains in force. No remote issue state
was changed.
