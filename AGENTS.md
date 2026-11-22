# Repository Guidelines

## Sources of Truth and Skills

Use `SPECSDOC.md` for MVP scope, patient fields, statuses, and role intent. Load the applicable instructions from `.agents/skills/`: `medora-git-and-pr` for ticket branches and PRs, and `medora-backend-clean-arch` for API, domain, validation, and RBAC work. Keep one Jira ticket per `feature/med-<id>-<slug>` branch; never work directly on `main`.

## Architecture and Layout

The API uses TypeScript, Express, Prisma, and Clean Architecture. Keep domain entities, errors, and repository interfaces in `src/domain/`; DTOs and use cases in `src/application/`; Prisma adapters and configuration in `src/infrastructure/`; and routes, controllers, Zod validators, and middleware in `src/presentation/`. Dependencies point inward: domain/application must not import Express or Prisma. `src/main.ts` wires concrete repositories and services.

Patient routes require a bearer token. `ADMIN` and `ADMIN_STAFF` can create patients; `ADMIN`, `MEDICAL`, `ADMIN_STAFF`, and `SUPERVISOR` can read/search them. Preserve the standard error envelope `{ error: { code, message, details? } }`: validation `400 VALIDATION_ERROR`, authentication `401 UNAUTHENTICATED`, role denial `403 FORBIDDEN`, missing resource `404 NOT_FOUND`, uniqueness conflict `409 CONFLICT`, and unexpected errors `500 INTERNAL_ERROR`.

## Development and Validation

- `npm run dev` starts the API in watch mode; `npm run build` compiles `src/`; `npm start` runs `dist/main.js`.
- `npm test -- --runInBand` runs unit and PostgreSQL integration suites. `npm run test:unit` and `npm run test:integration` target each group.
- Set `TEST_DATABASE_URL` to the isolated test database (`localhost:5433/medora_test`) before integration tests. Apply its migrations with `npm run db:migrate:test`; never point destructive test setup at development data.
- Run focused HTTP specs with `npm exec -- jest tests/e2e/<feature>.e2e.spec.ts --runInBand`. Auth and patient E2E tests use in-memory repositories and Supertest.
- `npm run db:generate`, `npm run db:migrate`, and `npm run db:studio` generate the Prisma client, migrate development, and open Prisma Studio.

## Style, Tests, and Security

Use strict TypeScript, two-space indentation, hyphenated filenames, PascalCase types/classes, and camelCase values. Name Jest tests `*.spec.ts`; cover use-case decisions with unit tests, Prisma behavior with integration tests, and HTTP contracts, validation, and role permissions with E2E tests. Keep `.env` and all credentials out of Git; update `.env.example` when adding environment variables. Use concise Conventional Commit messages and describe behavior, tests, and migration/configuration changes in PRs.
