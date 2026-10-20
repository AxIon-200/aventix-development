# Aventix domain documentation

Paths in this document are relative to the Git repository root.

For backend work:
- Read backend/AGENTS.md.
- Use backend/GLOSSARY.md when present.
- If backend/GLOSSARY-MAP.md exists, follow its context references.
- Consult relevant decisions in backend/docs/adr/.
- Read the task's specification in backend/docs/specs/.
- For authentication, accounts, sessions, or authorization, read
  backend/documents/phases/phase-1-authentication.md.

Use glossary terminology and surface conflicts with accepted ADRs or requirements.
The Phase 1 requirements remain authoritative; its specification synthesizes
those requirements and records implementation/testing decisions.

Keep glossary entries about domain concepts. Keep behavioral requirements in
their authoritative document and architectural rationale in ADRs.

The backend glossary does not currently exist. Create it only when confirmed
domain terminology needs recording.

Reuse these locations. Do not create parallel root-level glossary, ADR, or
specification directories as part of setup. Root docs/agents/ holds shared
engineering-workflow configuration only.
