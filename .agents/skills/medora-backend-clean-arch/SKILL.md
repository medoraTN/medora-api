### 3. `.agents/skills/medora-backend-clean-arch/SKILL.md`

```markdown
---
name: medora-backend-clean-arch
description: Enforce Clean Architecture boundaries, TypeScript strictness, Zod validation, and role-based access control (RBAC) in medora-api.
---

## When to Use
Load this skill when building or modifying backend endpoints, use cases, domain entities, validation schemas, or authorization middleware in `medora-api`.

## Architecture & Layer Rules
Respect strict Clean Architecture dependency direction (outer layers depend on inner layers, never the reverse):
1. **Domain Layer:** Pure TypeScript entities, domain types, and repository interfaces. Zero imports from Express, Prisma, or HTTP libraries.
2. **Application / Use Cases Layer:** Business rules, orchestration, and DTOs. Depends only on Domain interfaces.
3. **Infrastructure Layer:** Prisma repository implementations, password hashing, JWT utilities, and external adapters.
4. **Presentation / HTTP Layer:** Express controllers/routes, Zod request validation, and error-mapping middleware. Never write Prisma queries directly inside controllers or route handlers.

## Domain & Security Rules (`docs/SPECIFICATIONS.md`)
- **Mandatory Authentication:** Protect all operational routes with JWT authentication.
- **Role-Based Access Control (RBAC):** Enforce permissions per role (`Administrateur`, `Personnel médical`, `Personnel administratif`, `Superviseur Urgence`) according to `docs/SPECIFICATIONS.md` §3.
- **Input Validation:** Validate all request params, query strings, and bodies using Zod schemas before executing use cases.
- **Error Handling:** Return explicit, structured HTTP status codes (`400` validation error, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict) without leaking stack traces or sensitive patient details.