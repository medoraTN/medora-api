---
name: medora-api-feature
description: Implémente et vérifie les fonctionnalités de Medora API. À utiliser pour modifier une route Express, un cas d’usage, un dépôt Prisma, les permissions, le suivi patient, les réservations ou le tableau de bord.
---

# Développer une fonctionnalité Medora API

1. Lire [les règles](../../../AGENTS.md) et [l’architecture](../../../README.md). Si le dossier parent contient les PDFs du projet, consulter le cahier des charges pour les critères métier, Communication Front-end Backend pour le flux, et Definition Of Done et Workflow Git pour la livraison. Inspecter les fichiers et scripts du dépôt pour repérer les éléments déjà opérationnels.
2. Définir le contrat HTTP JSON sous `/api` avec le frontend. Vérifier méthode, chemin, entrées, pagination ou filtres applicables, champs retournés, réponses d’erreur et permissions. Le cahier des charges donne deux listes de statuts patient qui diffèrent. Pour un nouveau statut ou une transition non définie, vérifier les critères du ticket et le contrat partagé.
3. Placer les invariants dans le domaine et l’orchestration dans le cas d’usage. Injecter le contrat de dépôt, puis adapter Prisma à ce contrat. Si le schéma change, livrer la migration correspondante et la vérifier sur une base de développement ou de test.
4. Brancher validation, authentification et autorisation dans la couche HTTP selon le contrat. Mapper les erreurs métier vers le statut HTTP approprié. Vérifier qu’une requête invalide ou interdite ne modifie aucune donnée.
5. Depuis la racine API, exécuter `npm run build`, puis les suites pertinentes, `npm run test:unit`, `npm run test:integration` et `npm run test:e2e`. Utiliser Jest/Supertest pour les routes HTTP. Vérifier manuellement le parcours concerné avec des données fictives et signaler les vérifications bloquées par une configuration manquante.

## Exemple

Pour un changement de statut patient, tester la transition dans le cas d’usage, la persistance atomique du statut et de l’historique dans le dépôt, puis les réponses HTTP d’un utilisateur autorisé et d’un utilisateur sans permission.
