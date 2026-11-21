# Medora API

- Suivre la Clean Architecture du README. Le domaine porte les entités, invariants, erreurs métier et contrats de dépôt. Les cas d’usage dépendent du domaine. L’infrastructure implémente les contrats avec Prisma/PostgreSQL. La présentation Express valide les entrées et traduit les résultats en HTTP. Assembler les dépendances dans `src/main.ts` et construire l’application dans `src/app.ts`.
- Valider les entrées côté serveur, par exemple avec Zod. Appliquer l’authentification JWT et les permissions côté API. Restreindre les champs sensibles aux utilisateurs autorisés et exclure les données patient des logs techniques.
- Enregistrer chaque changement de statut avec la date, l’heure et l’auteur. Persister le statut et son historique dans la même transaction. Journaliser les actions sensibles, dont la création, la modification et l’annulation de réservations.
- Aligner le contrat HTTP JSON sous `/api` avec `medora-web` pour les changements de payload, de statut HTTP, de format d’erreur ou d’autorisation.
- Appliquer la DoD aux changements concernés. Tests unitaires pour le métier, intégration pour les dépôts ou la base, E2E HTTP pour les routes touchées. Vérifier les critères d’acceptation, les cas limites, le parcours en développement et la documentation pertinente. Écarter secrets, artefacts générés et dépendances inutiles des commits.
- Suivre GitHub Flow. Une branche par ticket Jira depuis `main`, des commits atomiques et une PR avec le ticket, les changements et les vérifications. La DoD demande une revue par un autre développeur, des tests verts, un squash merge dans `main` et le ticket Jira dans Done.

Pour modifier une fonctionnalité, utiliser [medora-api-feature](.agents/skills/medora-api-feature/SKILL.md).
