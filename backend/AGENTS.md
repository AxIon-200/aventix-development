# Aventix backend

## Project context

Aventix is a concert, gig, and music festival ticketing platform. This directory contains its Express 5 and TypeScript backend, using PostgreSQL, Prisma, and Better Auth. The Next.js frontend is a separate concern; backend behavior must be testable independently.

The README's NestJS layout and the package description's Next.js reference are outdated. Use the installed dependencies, configuration, and source files to establish the current implementation. Surface conflicts between requirements and implementation before choosing new behavior.

## Documentation to consult

- Before designing, implementing, or reviewing authentication, user accounts, sessions, or authorization, read [the Phase 1 requirements](documents/phases/phase-1-authentication.md). These describe intended behavior; verify implementation rather than assuming every requirement is complete.
- For a feature task, read its linked spec or issue and the documents it references before changing behavior.
- When resolving domain terminology, consult `GLOSSARY.md` if present. Record agreed definitions there; keep implementation details in specs or decision records.
- Before revisiting an architectural decision, consult relevant records in `docs/adr/` if present. Create a record when a decision has meaningful reversal cost, needs explanation, and involves a real trade-off.
- When documentation and code disagree, explain the discrepancy and establish which behavior the task requires. Keep each rule in one authoritative document and link to it elsewhere.

## Code navigation

- `src/app.ts` assembles Express middleware and mounts Better Auth and application routes. `src/server.ts` starts the listener.
- `src/routes/` and `src/controllers/` contain application HTTP endpoints, mounted under `/api/v1`.
- `src/lib/auth.ts` configures Better Auth; its handler is mounted under `/api/auth` before the JSON body parser. Preserve this ordering when changing middleware.
- `src/lib/prisma.ts`, `prisma/schema.prisma`, and `prisma.config.ts` define database access and schema configuration. Generate changes to `src/generated/prisma/` through Prisma tooling.
- `test/` contains Vitest tests, including database integration tests. Follow the existing TypeScript ESM import style, including `.js` extensions in source imports.

## Commands and verification

Use `package.json` as the command source of truth:

- `npm run dev`: start the development server.
- `npm run typecheck`: check TypeScript without emitting files.
- `npm test`: run the Vitest suite. For a targeted check, use `npx vitest run test/<file>.test.ts`.
- `npm run build`: compile TypeScript; `npm start` runs the compiled server.

For code changes, run typechecking and tests relevant to the changed behavior. Report checks that could not run and their blockers. Documentation-only edits need link and content checks.

Tests load `.env.test` through `test/setup.ts`. They require `NODE_ENV=test`, `DATABASE_URL`, `DEV_DATABASE_URL`, and `TEST_DATABASE_PROJECT_REF`. The test database must differ from development and match the expected Supabase test project. Preserve these checks and use a dedicated test database.

Use `.env.example` to identify application configuration. Keep credentials and environment values out of committed documents and tool output. Verify the target database before applying migrations or running data-changing commands.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project Guidelines

### Frontend-Driven Backend Development
Implement backend functionality based on the existing frontend features, pages, and user flows.
Prioritize making existing frontend features functional before introducing additional features.

### Keep the Project Simple
This is a school project, not a production-scale commercial application.
    
Avoid overengineering, unnecessary abstractions, excessive dependencies, and overly complex architectures.

Prefer simple, maintainable, and straightforward solutions that satisfy the project requirements.