# Repository Guidelines

## Source of Truth
- Always read `docs/SPECIFICATIONS.md` before making assumptions about scope, roles, patient statuses, or MVP exclusions.
- Reject or flag any request that falls under **Exclus du MVP** unless explicitly approved.

## Skill Routing
Load the relevant skill from `.github/skills/` before acting:
1. **Starting a ticket, branching, committing, or writing a PR:** load `medora-git-and-pr`.
2. **Building/editing API routes, use cases, Zod schemas, or auth/RBAC:** load `medora-backend-clean-arch`.
3. **Editing `schema.prisma`, migrations, or repository queries/transactions:** load `medora-prisma-db`.
4. **Building/editing Angular views, services, or forms:** load `medora-angular-mvvm`.
5. **Writing tests or verifying a ticket before PR:** load `medora-testing-and-dod`.

## Non-Negotiable Rules
- Never work on `main`. Always branch from updated `main` using `feature/med-<id>-<short-name>`.
- One branch = one Jira ticket.
- Never commit `.env`, secrets, generated build artifacts, or unused dependencies.

## Project Structure & Module Organization

This is a TypeScript/Express API organized around Clean Architecture. `src/domain/` contains entities, repository contracts, value objects, and domain errors; `src/application/` holds DTOs and use cases; `src/infrastructure/` contains Prisma persistence, authentication, configuration, and logging; and `src/presentation/` contains HTTP routes, controllers, middleware, validators, and server setup. `src/main.ts` is the composition root, while `src/app.ts` creates the Express app. Tests are grouped under `tests/unit/`, `tests/integration/`, and `tests/e2e/`; current E2E specs cover auth, patients, and reservations. Keep dependencies pointing inward: domain and application code should not import Express or Prisma.

## Build, Test, and Development Commands

- `npm run dev` starts the API with `tsx` watch mode.
- `npm run build` type-checks and compiles using `tsconfig.json`.
- `npm start` runs the compiled `dist/main.js` entry point (after building).
- `npm test` runs Jest; `npm run test:e2e` runs only `tests/e2e`.
- `npm run test:unit` and `npm run test:integration` target their respective test directories.
- `npm run test:e2e:ui` runs Playwright tests.
- `npm run db:migrate` applies Prisma development migrations; `npm run db:studio` opens Prisma Studio.

## Coding Style & Naming Conventions

Use TypeScript with strict checking and two-space indentation. Follow the existing lowercase, hyphenated filenames and suffixes, such as `create-patient.use-case.ts`, `patient.validator.ts`, and `patients.e2e.spec.ts`. Use descriptive PascalCase for classes/types and camelCase for values/functions. Keep business rules in domain/application layers and HTTP/database details in their outer layers. ESLint and Prettier are dependencies, but no repository config or lint/format script is currently present; match neighboring code and avoid introducing formatting configuration without need.

## Testing Guidelines

Jest is the configured test runner dependency, with Supertest for API-level coverage and Playwright available for UI-style E2E. Place tests in the matching `tests/<unit|integration|e2e>/` area and use `*.spec.ts` naming, consistent with current E2E files. Cover domain rules and use cases with unit tests, persistence boundaries with integration tests, and HTTP behavior with E2E tests. No coverage threshold is defined. The unit and integration directories currently have no tracked test files, so add tests alongside new behavior.

## Commit & Pull Request Guidelines

Recent commits use Conventional Commit prefixes, for example `feat: ...` and `chore: ...`; continue with concise imperative summaries. Pull requests should explain the behavior and architectural layers changed, link a related issue when available, list validation commands and results, and include request/response examples for API changes. Call out migrations or configuration changes explicitly.

## Security & Configuration

Keep credentials and local settings in `.env`, which is ignored by Git. Never commit secrets; share required variable names and safe defaults through documentation or an `.env.example` file. Review Prisma migrations and authentication changes carefully.
