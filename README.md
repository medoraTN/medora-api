# Architecture Technique — Medora

## Démarrage local — Sprint 1

1. Installer les dépendances avec `npm ci`. Créer une base PostgreSQL de développement et une base séparée pour les tests.
2. Copier `.env.example` vers `.env`. Renseigner les connexions et générer `JWT_SECRET` avec `openssl rand -hex 32`.
3. Appliquer les migrations avec `npm run db:migrate` et générer le client avec `npm run db:generate`.
4. Fournir `MEDORA_ADMIN_EMAIL` et `MEDORA_ADMIN_PASSWORD` dans l’environnement local, puis lancer `npm run db:create-admin`. Utiliser des identifiants et des dossiers fictifs en développement.
5. Démarrer l’API avec `npm run dev`. Vérifier `GET /api/health` sur le port 3000.

`POST /api/auth/login` accepte `email` et `password`, puis renvoie `token` et `user`. Les routes patients exigent un en-tête `Authorization: Bearer <token>`. Les quatre rôles peuvent consulter les dossiers. `ADMIN`, `MEDICAL` et `ADMIN_STAFF` peuvent créer et modifier les dossiers. `ADMIN` et `MEDICAL` peuvent modifier le statut.

- `GET /api/patients` accepte `search`, `status`, `page` et `pageSize`.
- `POST /api/patients` crée un dossier au statut `WAITING`.
- `GET /api/patients/:id` inclut l’historique des statuts.
- `PATCH /api/patients/:id` modifie les données du dossier.
- `PATCH /api/patients/:id/status` accepte `{ "status": "IN_PROGRESS" }` et écrit l’historique dans la même transaction.

Exécuter `npm run build` et `npm run test:unit`. Pour les tests d’intégration et HTTP, exporter `TEST_DATABASE_URL` dans le shell, appliquer d’abord les migrations à cette base avec `DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy`, puis lancer `npm run test:integration` et `npm run test:e2e`.


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
