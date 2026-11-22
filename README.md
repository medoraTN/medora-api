# Architecture Technique — Medora

## Configuration de la base de données

Copiez `.env.example` vers `.env`, renseignez `DATABASE_URL`, puis lancez `npm run db:generate` et `npm run db:migrate`. Une base PostgreSQL isolée pour l’intégration est définie dans `docker-compose.test.yml`; démarrez-la avec `docker compose -f docker-compose.test.yml up -d`, puis exécutez `npm run db:migrate:test` avec `TEST_DATABASE_URL` configuré sur le port `5433`. Les migrations de test ne touchent pas à la base de développement.

Le schéma et les migrations se trouvent dans `src/infrastructure/database/prisma/`. Le numéro de dossier et le téléphone patient sont uniques. Ne versionnez jamais `.env` ou des données de patients réelles.

## 1. Architecture backend — Node + Express

Le backend suit la **Clean Architecture** : les règles métier sont isolées des frameworks, de la base de données et d’Express. Les dépendances pointent toujours de l’extérieur vers le domaine.

```text
medora-api/
├── src/
│   ├── domain/                     # Cœur métier : indépendant d’Express et de la DB
│   │   ├── entities/
│   │   │   ├── patient.entity.ts
│   │   │   ├── reservation.entity.ts
│   │   │   └── user.entity.ts
│   │   ├── repositories/           # Interfaces / contrats
│   │   │   ├── patient.repository.ts
│   │   │   ├── reservation.repository.ts
│   │   │   └── user.repository.ts
│   │   ├── value-objects/
│   │   │   ├── patient-status.vo.ts
│   │   │   └── reservation-status.vo.ts
│   │   └── errors/
│   │       ├── domain-error.ts
│   │       └── not-found-error.ts
│   │
│   ├── application/                # Cas d’usage métier
│   │   ├── use-cases/
│   │   │   ├── create-patient.use-case.ts
│   │   │   ├── update-patient-status.use-case.ts
│   │   │   ├── list-patients.use-case.ts
│   │   │   ├── create-reservation.use-case.ts
│   │   │   ├── cancel-reservation.use-case.ts
│   │   │   └── get-dashboard.use-case.ts
│   │   └── dto/
│   │       ├── create-patient.dto.ts
│   │       └── create-reservation.dto.ts
│   │
│   ├── infrastructure/             # Implémentations techniques
│   │   ├── database/
│   │   │   ├── prisma/
│   │   │   │   ├── client.ts
│   │   │   │   └── migrations/
│   │   │   └── repositories/
│   │   │       ├── prisma-patient.repository.ts
│   │   │       └── prisma-reservation.repository.ts
│   │   ├── auth/
│   │   │   ├── jwt.service.ts
│   │   │   └── password.service.ts
│   │   ├── logging/
│   │   │   └── logger.ts
│   │   └── config/
│   │       └── env.ts
│   │
│   ├── presentation/               # Couche HTTP Express
│   │   ├── http/
│   │   │   ├── controllers/
│   │   │   │   ├── patient.controller.ts
│   │   │   │   ├── reservation.controller.ts
│   │   │   │   ├── dashboard.controller.ts
│   │   │   │   └── auth.controller.ts
│   │   │   ├── routes/
│   │   │   │   ├── patient.routes.ts
│   │   │   │   ├── reservation.routes.ts
│   │   │   │   └── index.routes.ts
│   │   │   ├── middlewares/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── role.middleware.ts
│   │   │   │   ├── error-handler.middleware.ts
│   │   │   │   └── request-logger.middleware.ts
│   │   │   └── validators/
│   │   │       ├── patient.validator.ts
│   │   │       └── reservation.validator.ts
│   │   └── server.ts
│   │
│   ├── main.ts                     # Composition root / démarrage
│   └── app.ts                      # Création de l’application Express
│
├── tests/
│   ├── unit/                       # Entités, Value Objects, Use Cases
│   │   ├── domain/
│   │   └── application/
│   ├── integration/                # Use Cases + repositories + DB de test
│   │   ├── repositories/
│   │   └── use-cases/
│   └── e2e/                        # API HTTP complète via Supertest
│       ├── auth.e2e.spec.ts
│       ├── patients.e2e.spec.ts
│       └── reservations.e2e.spec.ts
│
├── .env.example
├── package.json
├── tsconfig.json
├── jest.config.ts
├── playwright.config.ts
└── README.md
```

### Flux d’une requête

```text
Client Angular
      │  HTTP JSON
      ▼
Presentation (Express)
  Route → Middleware → Controller → Validator
      │
      ▼
Application
  Use Case → DTO / règles métier
      │
      ▼
Domain
  Entity + Repository interface
      │
      ▼
Infrastructure
  Prisma repository → PostgreSQL
      │
      ▼
Réponse HTTP JSON → Angular
```

### Règle de dépendance

| Couche | Dépend de | Ne doit jamais dépendre de |
| :--- | :--- | :--- |
| **`domain`** | Rien, sauf utilitaires métier purs | Express, Prisma, HTTP, base de données |
| **`application`** | `domain` | Express, Prisma, HTTP |
| **`infrastructure`** | `domain`, `application` | Doit implémenter les interfaces du domaine |
| **`presentation`** | `application`, `domain` | Ne contient aucune règle métier |
| **`main.ts`** | Toutes les couches | Composition et injection des dépendances |

### Tests backend

| Type | Cible | Outil recommandé | Exemple |
| :--- | :--- | :--- | :--- |
| **Unitaires** | Entités, Value Objects, Use Cases | Jest | `update-patient-status.use-case.spec.ts` |
| **Intégration** | Repository Prisma, base de test, authentification | Jest + Testcontainers ou SQLite/PostgreSQL de test | `prisma-patient.repository.spec.ts` |
| **E2E** | Routes HTTP, middlewares, validation, réponses API | Supertest + Jest | `POST /api/patients` |
