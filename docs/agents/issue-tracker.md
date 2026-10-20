# Issue tracker: GitHub

Use GitHub Issues in AxIon-200/aventix-development.
This configuration applies to the entire repository, including backend work.

Use the GitHub CLI with explicit --repo AxIon-200/aventix-development.
Read operations may proceed without publication approval.
Use --body-file for multiline issue bodies and comments.

Before publishing, search for an existing matching issue to avoid duplicates.
When publication is authorized, create or update the appropriate GitHub issue.
Use the label mapping in triage-labels.md.

PRs as a request surface: no.

For child work, use native sub-issues and issue dependencies where supported.
Otherwise, record Part of #N and Blocked by #N relationships explicitly.

A skill invocation or ready-for-agent label does not override explicit user
restrictions on publication or implementation. Preserve unresolved prerequisites
and approval gates in published specifications.

Backend specifications remain in backend/docs/specs/.
Link published issues to their source specification and record the issue URL
there rather than creating another local specification directory.
