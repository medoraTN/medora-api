# Repository Guidelines

## Sources of Truth and Skills

Use `SPECSDOC.md` for MVP scope, patient fields, statuses, and role intent. Load the applicable instructions from `.agents/skills/`: `medora-git-and-pr` for ticket branches and PRs, and `medora-backend-clean-arch` for API, domain, validation, and RBAC work. Keep one Jira ticket per `feature/med-<id>-<slug>` branch; never work directly on `main`.

## Architecture and Layout

The API uses TypeScript, Express, Prisma, and Clean Architecture. Keep domain entities, errors, and repository interfaces in `src/domain/`; DTOs and use cases in `src/application/`; Prisma adapters and configuration in `src/infrastructure/`; and routes, controllers, Zod validators, and middleware in `src/presentation/`. Dependencies point inward: domain/application must not import Express or Prisma. `src/main.ts` wires concrete repositories and services.

Patient routes require a bearer token. `ADMIN` and `ADMIN_STAFF` can create patients; `ADMIN`, `MEDICAL`, `ADMIN_STAFF`, and `SUPERVISOR` can read/search them. Preserve the standard error envelope `{ error: { code, message, details? } }`: validation `400 VALIDATION_ERROR`, authentication `401 UNAUTHENTICATED`, role denial `403 FORBIDDEN`, missing resource `404 NOT_FOUND`, uniqueness conflict `409 CONFLICT`, and unexpected errors `500 INTERNAL_ERROR`.

`PATCH /api/patients/:id/status` is limited to `ADMIN` and `MEDICAL`. Keep the MED-5 transition policy in `src/domain/value-objects/patient-status.vo.ts`: WAITING progresses to IN_PROGRESS, TRANSFERRED, or CANCELLED; active care statuses may advance among IN_PROGRESS, IN_EXAMINATION, and WAITING_RESULT, then to READY_FOR_DISCHARGE, TRANSFERRED, or CANCELLED; READY_FOR_DISCHARGE may return to IN_PROGRESS or end as DISCHARGED/TRANSFERRED; DISCHARGED, TRANSFERRED, and CANCELLED are terminal. Invalid transitions return `409 INVALID_STATUS_TRANSITION`. Persist the previous status, next status, actor, and timestamp atomically with the patient update in the Prisma repository.

Configure browser origins with `CORS_ORIGINS` (comma-separated; local Angular default `http://localhost:4200`). Keep CORS middleware before JSON parsing and routes so preflight `OPTIONS` requests are answered before authentication. CORS is not authorization; protected routes still require JWT and role checks.

## Development and Validation

- `npm run dev` starts the API in watch mode; `npm run build` compiles `src/`; `npm start` runs `dist/main.js`.
- `npm test -- --runInBand` runs unit and PostgreSQL integration suites. `npm run test:unit` and `npm run test:integration` target each group.
- Set `TEST_DATABASE_URL` to the isolated test database (`localhost:5433/medora_test`) before integration tests. Apply its migrations with `npm run db:migrate:test`; never point destructive test setup at development data.
- Run focused HTTP specs with `npm exec -- jest tests/e2e/<feature>.e2e.spec.ts --runInBand`. Auth and patient E2E tests use in-memory repositories and Supertest.
- `npm run db:generate`, `npm run db:migrate`, and `npm run db:studio` generate the Prisma client, migrate development, and open Prisma Studio.

## Style, Tests, and Security

Use strict TypeScript, two-space indentation, hyphenated filenames, PascalCase types/classes, and camelCase values. Name Jest tests `*.spec.ts`; cover use-case decisions with unit tests, Prisma behavior with integration tests, and HTTP contracts, validation, and role permissions with E2E tests. Keep `.env` and all credentials out of Git; update `.env.example` when adding environment variables. Use concise Conventional Commit messages and describe behavior, tests, and migration/configuration changes in PRs.
