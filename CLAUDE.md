@AGENTS.md

## Agent skills

### Matt Pocock skills

The project's Matt Pocock skills live in `.agents/skills/` at the repository
root and apply to both frontend and backend work. Their source is
[mattpocock/skills](https://github.com/mattpocock/skills), recorded in the root
`skills-lock.json`. Keep one shared installation at the root.

When a skill is requested or applies to the task, read its `SKILL.md` and the
supporting files it references before following it. Respect skills marked
`disable-model-invocation: true`: use those only when explicitly requested.

Ask for `ask-matt` to choose a workflow. Common entry points include
`grill-with-docs` for refining an idea, `to-spec` and `to-tickets` for planning,
`implement` for a ticket, `tdd` for implementation discipline, and `code-review`
for reviewing changes.

Read the shared configuration below before engineering workflows. Preserve
the existing tracker, label mapping, and backend documentation locations.
To update the installed skills, run `npx skills@latest update` from the
repository root and review the resulting changes.

### Issue tracker

GitHub Issues: AxIon-200/aventix-development.
Before tracker operations, read docs/agents/issue-tracker.md.

### Triage labels

Before triage or label changes, read docs/agents/triage-labels.md.

### Domain docs

Before engineering exploration or specification work, read docs/agents/domain.md.
Reuse the existing backend documentation locations.
