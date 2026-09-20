# Audit global des API mobiles

Date de contrôle : 31 juillet 2026.

## Résumé

- 266 chemins OpenAPI.
- 351 opérations HTTP.
- 323 opérations protégées par Bearer.
- 28 opérations publiques attendues : santé, authentification initiale, contenus publics, inscription et webhook WhatsApp.
- Aucun `operationId` dupliqué.
- Toutes les opérations possèdent un résumé OpenAPI.
- Migration courante : `20260731_0076`.

## Garanties validées

- Isolation par tenant appliquée aux ressources métier.
- Contrôle du rôle et des permissions de module.
- Filtrage et pagination serveur par patient sur les huit collections principales.
- Détail opérationnel complet d’un rendez-vous.
- Facture PDF authentifiée, non mise en cache publiquement.
- Création d’échéance documentée et validée.
- Sessions simultanées multi-appareils avec déconnexion par appareil.
- Rotation anti-rejeu des refresh tokens.
- API et base PostgreSQL opérationnelles.

## Surface publique contrôlée

Les routes publiques concernent uniquement :

- `/api/health` et `/api/db-check` ;
- `/api/auth/*` nécessaires avant authentification ;
- `/api/public/*` ;
- le webhook WhatsApp ;
- la racine informative de l’API.

Les routes médicales, financières, administratives et documentaires sont protégées.

## Compatibilité mobile

Le backend fournit les éléments nécessaires aux applications patient et cabinet : authentification, profil, tableau de bord, rendez-vous, visites, ordonnances, médicaments, documents, paiements, honoraires, factures, reçus, échéances, CNSS/CNOPS, notifications et consentement WhatsApp.

Les noms historiques français (`honoraires`, `echeances`, certaines routes `paiements`) doivent être conservés pour compatibilité. L’application mobile doit consommer les chemins documentés plutôt que les traduire.

## Points de vigilance

- L’image backend ne contient pas `pytest`; les contrôles ont donc été réalisés par compilation, introspection OpenAPI et tests HTTP authentifiés. Ajouter les dépendances de test dans une image CI dédiée est recommandé.
- Aucun compte patient actif de démonstration n’était disponible lors de l’audit. Les règles patient ont été contrôlées au niveau du code et des contrats, tandis que les parcours professionnels ont été testés avec authentification réelle.
- Le frontend possède des erreurs TypeScript historiques indépendantes de l’API. La compilation Vite réussit, mais une remise à zéro du `typecheck` est recommandée.
- Le bundle web principal est volumineux ; cela n’affecte pas directement l’API mobile, mais un découpage du frontend web améliorera son chargement.

## Recommandations de production

1. Publier l’API exclusivement derrière HTTPS.
2. Remplacer les secrets de développement et utiliser un gestionnaire de secrets.
3. Limiter le débit des routes de connexion, refresh, inscription et webhook.
4. Ajouter un identifiant de corrélation à chaque réponse et aux journaux.
5. Mettre en place une image/test CI avec tests d’intégration PostgreSQL.
6. Générer et versionner un SDK mobile depuis OpenAPI à chaque livraison.
7. Ajouter une politique de compatibilité `/api/v1` avant l’ouverture à des clients mobiles distribués.

