# Aventix Development: Team Instructions

This README describes how the Aventix team should manage development issues, feature branches, and pull requests. Repository shown in the supplied issue screenshot: `Axlon-200/aventix-development`.

Frontend: Next.js with TypeScript and Tailwind CSS. Backend: NestJS with PostgreSQL and Prisma ORM. Reuse the existing application, components, API conventions, and database work.

## Team Responsibilities

| Member | Development Responsibility |
| --- | --- |
| Abrigo | Public pages, shared login/register, and booking-flow frontend |
| Moyamoy | NestJS backend APIs and PostgreSQL/Prisma database implementation |
| Sherwin | Attendee pages |
| Mary | Organizer pages; landing-page UI already developed |
| Shai | Administrator pages |

The public and booking areas use the same authentication pages. Mary's revised development assignments apply even where an older document names a different owner.

## Detailed Issue Descriptions

Each linked file is the Markdown description for its corresponding main GitHub issue. Its contents start directly with the description body and have no surrounding code fence. Set the issue title separately to the title in this table, select the assignee's actual GitHub account, and add it to the Aventix Development project.

| Main Issue Title | Assignee | Description File |
| --- | --- | --- |
| Public Pages Frontend Development | Abrigo | [Public pages description](planning/issue-descriptions/public-pages-frontend-development.md) |
| Booking Flow Frontend Development | Abrigo | [Booking flow description](planning/issue-descriptions/booking-flow-frontend-development.md) |
| Attendee Pages Frontend Development | Sherwin | [Attendee pages description](planning/issue-descriptions/attendee-pages-frontend-development.md) |
| Organizer Pages Frontend Development | Mary | [Organizer pages description](planning/issue-descriptions/organizer-pages-frontend-development.md) |
| Administrator Pages Frontend Development | Shai | [Administrator pages description](planning/issue-descriptions/administrator-pages-frontend-development.md) |
| Prisma Schema and Database Implementation | Moyamoy | [Database description](planning/issue-descriptions/prisma-schema-and-database-implementation.md) |
| NestJS Backend API Development | Moyamoy | [Backend description](planning/issue-descriptions/nestjs-backend-api-development.md) |
| Landing Page UI Implementation | Mary | [Completed landing-page record](planning/issue-descriptions/landing-page-ui-implementation.md) |

Use the page/API task titles in [the development task catalog](planning/aventix-task-backlog.md) as sub-issues beneath these main issues. Add existing implementation issues when they already represent the work. A parent issue's checkboxes describe acceptance criteria; actual sub-issues provide GitHub's Sub-issue progress field.

### Add the Descriptions to GitHub

1. In the organization project, choose to create a new issue in `Axlon-200/aventix-development`, as shown in the supplied screenshot. Alternatively, open that repository's **Issues > New issue**.
2. Enter the matching main issue title and place the linked description file's complete Markdown contents into **Add a description**. Use **Preview** to check headings and checkboxes.
3. Select the named member's actual GitHub account under **Assignee**, apply label **story**, and select the **Aventix Development** project. Create the `story` label in the repository if it does not exist.
4. After creation, set Workstream, Priority, Phase, and the actual Status using the main-story table in the task catalog. Use **Development** for Phase; set Sprint on the work actually selected for that sprint.
5. Open the main issue and use **Create sub-issue**, or **Add existing issue** when the page/API task already exists. Use the listed implementation task titles only for remaining work.
6. For a sub-issue's description, use its corresponding page/API section plus the relevant completion criteria and Branch and Pull Request Requirement from the main description. This preserves the detailed behavior without duplicating an entire multi-page story.
7. Apply label **task** to each implementation sub-issue, add it to the project, and explicitly set its assignee, Workstream, Priority, Phase, Status, and selected Sprint. Do not assume the parent automatically supplies these fields.

Use the existing [Kanban setup guide](planning/aventix-kanban-setup.md) for the project views and workflows. Main stories appear in **All Stories**; implementation sub-issues drive **Current Sprint**, **Sprint Planning**, **Workstreams**, and **Team Workload**.

## Branch and Pull Request Workflow

Every implementation task follows this sequence:

`Task issue -> New branch -> Implementation -> Commits -> Push -> Pull request -> Review -> Merge -> Done`

Create a branch for a specific page or API task. Prefer one focused pull request per implementation task so reviewers can assess it and completed work can be tracked independently.

### 1. Select the Task

1. Open the relevant task/sub-issue in GitHub.
2. Read its page/API requirements and completion criteria.
3. Assign yourself if needed and set its actual Sprint.
4. Move the task to **In Progress** when you begin.
5. Identify any related frontend/backend issue needed for integration. Put a specific blocker in the issue if selected work cannot continue.

Use the main story to track the complete area, such as Organizer Pages. Use its sub-issue for the page or endpoint you are currently implementing.

### 2. Create a New Branch

Use the team's existing base/integration branch. If no other integration branch is established, use the repository's default branch. Confirm the actual branch name before running commands; `main` is only the example below.

Suggested naming:

| Change | Branch Pattern | Example |
| --- | --- | --- |
| Feature/page/API | `feature/<issue-number>-<short-name>` | `feature/123-events-page` |
| Bug fix | `fix/<issue-number>-<short-name>` | `fix/124-ticket-quantity` |

The issue numbers in these examples are placeholders, not actual Aventix issue numbers.

**Option A: Create the branch from GitHub's issue page.**

1. Open the task issue.
2. In the right sidebar, find **Development**.
3. Click **Create a branch**. If there is already a linked item, use the Development section's menu to find that action.
4. Enter the branch name and select the repository containing the relevant code.
5. Create the branch and follow GitHub's displayed instructions to work locally or in GitHub Desktop.

GitHub creates this branch from the default branch by default. If the team uses a different base, use the local method below with that agreed branch.

**Option B: Create the branch locally.**

Check your working tree first and preserve any unrelated unfinished work before switching branches. Replace `main` and the example feature name with your actual base branch and task branch:

```bash
git status --short
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c feature/123-events-page
```

If the feature branch was already created through GitHub, fetch it and switch to that existing branch instead of creating a second branch:

```bash
git fetch origin
git switch --track origin/feature/123-events-page
```

If the local tracking branch already exists, use `git switch feature/123-events-page`.

### 3. Implement and Check the Task

- Keep the branch focused on its issue's page/API behavior.
- Reuse existing layouts, forms, styles, and helper APIs.
- Connect relevant frontend behavior to the agreed backend endpoints.
- Check required actions, validation, permissions, and applicable success/error states.
- For pages, check desktop/mobile layouts and navigation.
- For booking/payment/scanning APIs, check the relevant stock, retry, and repeated-entry behavior.
- Run the repository's existing applicable checks and record the results in the pull request.

These checks are part of implementation acceptance. They do not require additional project-management issues for each step.

### 4. Commit and Push the Feature Branch

Review the changed files and stage the files belonging to this task. Use your editor/GitHub Desktop or `git add -- "path/to/changed-file"` with an actual changed file path.

Example commit and push after the relevant files are staged:

```bash
git status --short
git diff --cached
git commit -m "feat: implement public event browsing"
git push -u origin feature/123-events-page
```

Additional review corrections are committed and pushed to the same feature branch and pull request.

### 5. Open a Pull Request

1. Open the repository on GitHub after pushing.
2. Click **Compare & pull request**. Alternatively, use **Pull requests > New pull request**.
3. Set **base** to the team's agreed integration/default branch.
4. Set **compare** to the feature branch you worked on.
5. Review **Files changed** and confirm the proposed changes belong to this task.
6. Use a clear title, such as `Implement public events browsing and filters`.
7. Describe the delivered behavior, related task, and checks performed using the template below.
8. Request review from Mary or the teammate assigned to review the feature. For Mary's pull requests, choose another assigned teammate; the author must not be their own reviewer.
9. Create the pull request and move the task to **For Review** when ready.

### Pull Request Description Template

```markdown
## Changes
- [Describe the behavior implemented]
- [Describe relevant API/database connections]

## Related Issues
Closes #123
Related to #45

## Verification
- [ ] Required behavior and relevant error states checked
- [ ] Relevant permissions and validations checked
- [ ] Desktop/mobile checked, if this changes a page
- [ ] Applicable repository checks passed

Results: [Briefly state what was checked and any remaining limitation]

## Screenshots or API Examples
[Include screenshots for page changes or examples for API changes]
```

Replace the numbers and text with the actual task and main story. Use `Closes #123` only when this pull request completes that task. Use `Related to #45` for a parent story that still has other unfinished pages or APIs. Do not close an entire multi-page story with a pull request for only one of its tasks.

GitHub interprets closing keywords when a pull request targets the repository's **default branch**. If the agreed integration branch is different, link the issue through the Development section and close the completed task under the team's acceptance process; do not assume a merge into that branch automatically closes it. For an issue in another repository, a supported closing reference uses `Closes OWNER/REPOSITORY#ISSUE-NUMBER`.

### 6. Review, Merge, and Update the Project

1. The reviewer checks the task's behavior, acceptance criteria, and relevant code changes.
2. The developer addresses requested changes on the same branch and pushes new commits.
3. Confirm the intended base branch, required checks, and review approval before merging.
4. The team member responsible for merging merges the pull request.
5. Close the completed task if it was not automatically closed, and confirm its Status is **Done**.
6. Keep the parent story open until all applicable required sub-issues are complete.

Use feature branches and reviewed pull requests for shared development. Implementation changes should reach the agreed base branch through this workflow.

## Project Status Rules

| Status | When to Use It |
| --- | --- |
| Todo | Remaining implementation that has not started |
| In Progress | The developer is implementing it on a task branch |
| For Review | A reviewable pull request and verification notes are available |
| Blocked | Selected work cannot proceed; the issue names the blocker and related work |
| Done | Implementation accepted and merged, with the task issue closed |

Mary's landing-page UI is already developed and is recorded as completed work. New tasks should represent remaining development, and existing issue/branch work should be reused where applicable.

## References

- [System requirements](https://docs.google.com/document/d/11IcYLILiV19FGoiWaywaLEf_jjV9-M6d7zo4qgBITcc/edit)
- [Figma design](https://www.figma.com/design/YFlJ4H17C0BhTcGy1fD3Rv/CLONE---AVENTIX?node-id=0-1)
- [Project views and field setup](planning/aventix-kanban-setup.md)
- [Create a branch from an issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-a-branch-for-an-issue)
- [Create a pull request](https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-a-pull-request)
- [Link pull requests and issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue)

The detailed descriptions use the supplied requirements and Mary's revised ownership. Figma frame details were not accessible through the web reader; refer to the team's actual frames when implementing the pages. Payment, seating, map, storage, and email-provider details follow the agreed implementation and do not introduce extra standalone planning tasks.
