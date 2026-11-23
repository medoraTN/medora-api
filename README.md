# Architecture Technique — Medora



## Configuration de la base de données

Copiez `.env.example` vers `.env`, renseignez `DATABASE_URL`, puis lancez `npm run db:generate` et `npm run db:migrate`. Une base PostgreSQL isolée pour l’intégration est définie dans `docker-compose.test.yml`; démarrez-la avec `docker compose -f docker-compose.test.yml up -d`, puis exécutez `npm run db:migrate:test` avec `TEST_DATABASE_URL` configuré sur le port `5433`. Les migrations de test ne touchent pas à la base de développement.

Le schéma et les migrations se trouvent dans `src/infrastructure/database/prisma/`. Le numéro de dossier et le téléphone patient sont uniques. Ne versionnez jamais `.env` ou des données de patients réelles.

## Authentification et rôles (MED-3)

L’API utilise un JWT (HS256) transmis dans l’en-tête `Authorization: Bearer <token>`. Les mots de passe sont hachés avec `scrypt` (sel aléatoire par mot de passe) et ne sont jamais stockés ni renvoyés en clair.

Configuration : `JWT_SECRET` (obligatoire, 32 caractères minimum — l’API refuse de démarrer sinon) et `JWT_EXPIRES_IN` (durée de vie du jeton, `1h` par défaut).

En développement, le CORS autorise `http://localhost:4200` pour le frontend Angular. Configurez `CORS_ORIGINS` avec une liste d’origines séparées par des virgules pour les autres environnements. Les requêtes preflight `OPTIONS` autorisent `GET`, `POST`, `PATCH`, les en-têtes `Authorization` et `Content-Type`, sans cookies inter-origines. CORS ne remplace pas l’authentification JWT.

| Route | Accès | Réponse |
| :--- | :--- | :--- |
| `POST /api/auth/login` | Public | `200 { token, user: { id, email, firstName, lastName, role } }` ; `401` si identifiants incorrects, compte inconnu ou désactivé (même réponse dans les trois cas) ; `400` si le corps est invalide |
| `GET /api/auth/me` | JWT valide | `200 { user }` ; `401` si le jeton est absent, invalide, expiré ou si le compte est désactivé |

Rôles gérés : `ADMIN`, `MEDICAL`, `ADMIN_STAFF`, `SUPERVISOR` (type `UserRole`, enum Prisma `UserRole`). Pour protéger une route, montez les middlewares dans cet ordre :

```ts
router.post("/patients", authenticate(tokens), requireRole("ADMIN", "ADMIN_STAFF"), controller.create);
```

- `authenticate` répond `401 Unauthorized` sans JWT valide ;
- `requireRole(...)` répond `403 Forbidden` si le rôle de l’utilisateur n’est pas autorisé.

Les erreurs ont toujours la forme `{ "error": { "code", "message", "details"? } }`. Les e-mails sont comparés en minuscules : enregistrez-les en minuscules lors de la création d’un compte. La migration `rename_user_roles` renomme les anciennes valeurs d’enum (`MEDICAL_STAFF`, `ADMINISTRATIVE_STAFF`, `EMERGENCY_SUPERVISOR`) sans perdre les comptes existants.

Tests : `npm run test:unit` et `npx jest tests/e2e/auth.e2e.spec.ts` (les tests E2E d’authentification utilisent un dépôt utilisateur en mémoire : aucune base de données n’est requise).

## Statut des patients (MED-5)

`PATCH /api/patients/:id/status` requiert un JWT et est réservé aux rôles `ADMIN` et `MEDICAL`. Le corps contient un statut parmi `WAITING`, `IN_PROGRESS`, `IN_EXAMINATION`, `WAITING_RESULT`, `READY_FOR_DISCHARGE`, `DISCHARGED`, `TRANSFERRED` et `CANCELLED`. Une transition non autorisée renvoie `409 INVALID_STATUS_TRANSITION`; un patient absent renvoie `404 NOT_FOUND` et une valeur invalide `400 VALIDATION_ERROR`.

Transitions autorisées : `WAITING` → `IN_PROGRESS`, `TRANSFERRED` ou `CANCELLED`; `IN_PROGRESS`, `IN_EXAMINATION` et `WAITING_RESULT` peuvent progresser entre ces trois statuts, vers `READY_FOR_DISCHARGE`, `TRANSFERRED` ou `CANCELLED`; `READY_FOR_DISCHARGE` → `IN_PROGRESS`, `DISCHARGED` ou `TRANSFERRED`. `DISCHARGED`, `TRANSFERRED` et `CANCELLED` sont terminaux. Chaque mise à jour et son historique (ancien/nouveau statut, utilisateur et horodatage) sont écrits dans une transaction Prisma. La migration MED-5 renomme les valeurs de statut existantes et ajoute l’ancien statut nullable; les événements historiques antérieurs ne permettent pas de reconstituer cet ancien statut.

## 1. Architecture backend — Node + Express

Le backend suit la **Clean Architecture** : les règles métier sont isolées des frameworks, de la base de données et d’Express. Les dépendances pointent toujours de l’extérieur vers le domaine.

## Réservations (MED-9)

Les réservations représentent une prestation unique (`service`), avec `practitioner` et `examination` facultatifs. Les routes sous `/api/reservations` exigent un JWT. `ADMIN`, `ADMIN_STAFF` et `MEDICAL` peuvent créer, modifier et annuler; les quatre rôles (`ADMIN`, `MEDICAL`, `ADMIN_STAFF`, `SUPERVISOR`) peuvent consulter. `POST` retourne `201 { reservation }`, `GET` retourne `200 { items }`, et `PATCH`/`DELETE` retournent `200 { reservation }`. L’annulation est logique et conserve la ligne avec le statut `CANCELLED`.

La création requiert `patientId`, `service`, `scheduledAt` (date ISO 8601 avec fuseau) et `durationMinutes` (entier positif); `practitioner` et `examination` sont facultatifs/nullables. Le statut initial est `PENDING`. `GET /api/reservations` accepte les filtres facultatifs `date=YYYY-MM-DD`, `status` et `patientId`; `date` couvre la journée UTC. Une création ou modification planifiée dans le passé renvoie `400 VALIDATION_ERROR`; un patient ou une réservation absent renvoie `404 NOT_FOUND`.

Statuts : `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`. Transitions autorisées : `PENDING` → `CONFIRMED` ou `CANCELLED`; `CONFIRMED` → `CANCELLED` ou `COMPLETED`. `CANCELLED` et `COMPLETED` sont terminaux. Une transition interdite, ou la modification d’une réservation terminale, renvoie `409 INVALID_RESERVATION_TRANSITION`.

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
