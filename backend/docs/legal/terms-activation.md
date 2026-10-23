# Prototype terms: owner review and local activation

Status: owner-approved and activated for the local school demonstration on
2026-10-22. Public-service activation is not asserted.

The project owner explicitly approved the linked document in this session with
“i approve it”. Approval covers the invited school-project demonstration,
operation by the Aventix student project team, and contact through the member
who invited each participant. No commercial operator or unverified support
email address has been invented. This is project-owner approval, not a legal
opinion or regulatory certification.

The [prototype terms](../../../public/legal/aventix-prototype-terms-2026-10-22-v1.html)
are served by the frontend at:

<http://localhost:3000/legal/aventix-prototype-terms-2026-10-22-v1.html>

The authoritative [Phase 1 requirements](../../documents/phases/phase-1-authentication.md)
identify Aventix as a school project. These terms therefore cover a controlled
demonstration, excludes real ticket sales, and does not invent refund policies
or a commercial operator. They are original text, not a claim of legal
approval or a complete privacy notice.

## Approved scope and remaining participant-readiness work

The approved document addresses:

- The school-project scope and the restriction against real payments and real
  admission tickets.
- The responsible operator and a functioning way for each participant to make
  account, privacy, and security requests. Existing website support addresses
  have not been verified and are not used in the document.
- The account and provider disclosures against the environment being used.
  Confirm the privacy notice, processing basis, provider locations, retention
  schedule, and deletion arrangements before inviting participants to submit
  personal information. No automated retention cleanup is claimed or added.
- The rules for participation, restrictions, submissions, and version changes.

The [integration contract](../specs/phase-1-integration-contract.md) requires:
“Do not enable fixture terms outside tests.” It also requires an owner-reviewed
document and version. Owner approval is now recorded above. Configuring these
terms does not record any participant's acceptance or change existing accounts;
each participant must still explicitly accept them during registration or the
dedicated legacy-consent flow.

## Local configuration

The document's status and effective date were finalized after owner approval.
The ignored `backend/.env` contains only these local terms settings. The
existing backend launch uses `.env.test` for its test environment and database;
that environment source and its credentials were preserved:

```dotenv
CURRENT_TERMS_VERSION=aventix-prototype-2026-10-22-v1
CURRENT_TERMS_DOCUMENT_URL=http://localhost:3000/legal/aventix-prototype-terms-2026-10-22-v1.html
```

Do not replace an existing environment file or copy database or email secrets
into this document. Set both values together in the environment used to launch
the backend. Restart that backend: it loads one immutable terms snapshot when
the application is created. No frontend code change is needed; registration
already reads the version and URL from the terms endpoint. The running backend
was restarted using its existing command from `backend/`:

```powershell
node --env-file=.env.test --import tsx src/server.ts
```

The backend's existing `dotenv/config` import also loads the terms-only `.env`.
This does not switch database targets or enable a fixture terms fallback.

Verify that the document URL loads, and that both of these return HTTP 200 with
the exact approved `data.version` and `data.documentUrl`:

```powershell
curl.exe -i http://localhost:5000/api/v1/terms
curl.exe -i http://localhost:3000/api/v1/terms
```

Retry current terms on attendee registration. Confirm the document opens in a
separate tab, returning preserves the form, the checkbox starts unchecked, and
submission requires explicit acceptance. Do not submit a real registration
merely to test document delivery. Verify transactional email configuration
separately before inviting participants; available terms do not prove delivery.

Once anyone accepts this version, preserve its text and URL. Changes require a
new version and a new document path. Existing acceptance history must remain
unchanged. The localhost URL is only for participants using the same machine;
do not carry it into a public deployment.

## Verification evidence

Verified against the running local application on 2026-10-22:

- Both the direct backend and frontend-proxied `GET /api/v1/terms` returned HTTP
  200 with the exact approved version and document URL above.
- The document URL returned HTTP 200 and the finalized HTML, with the effective
  date and owner-approved status instead of a draft banner.
- A fresh headless Chrome session loaded attendee registration with no terms
  outage message. Its terms link selected the approved document and opened in
  a separate tab. The checkbox started unchecked; selecting it enabled the
  submit button, and clearing it disabled the button again.
- No registration was submitted and no account or participant consent record
  was created by these checks. No application source code changed.

The existing test launch has no configured Resend key and sender pair. Actual
verification/recovery email delivery remains unverified and needs separate
configuration before an end-to-end participant registration demonstration.
The separate privacy notice and participant-readiness work described in the
approved document also remain applicable.

## Drafting references

Consulted on 2026-10-22:

- [National Privacy Commission: right to be informed](https://privacy.gov.ph/the-right-to-be-informed/)
  for the identity/contact, purpose, recipient, retention, and rights information
  a privacy notice needs. This is why the terms do not claim to replace one.
- [National Privacy Commission: data subject rights](https://privacy.gov.ph/data-subject-rights/)
  for the privacy-rights summary.
- [Republic Act No. 11967, Senate legislative record](https://issuances-library.senate.gov.ph/legislative-issuance/republic-act-no-11967)
  as a reference for future commercial internet transactions. These terms do
  not claim commercial launch readiness or determine statutory applicability.
