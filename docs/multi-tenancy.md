# Multi-Tenancy

La Phase 1 utilise une base PostgreSQL partagee avec `tenant_id` obligatoire sur toutes les tables metier. Les tables plateforme comme `tenants` n'ont pas de parent tenant; les tables utilisateur, roles, permissions et futurs modules cabinet sont cloisonnees.

## Regle backend

Les endpoints metier devront utiliser une dependency FastAPI qui resout le tenant depuis le JWT ou `X-Tenant-Id`, puis appliquer systematiquement `WHERE tenant_id = current_tenant_id`.

Un endpoint ne doit jamais lister, modifier ou supprimer une ressource metier sans filtre tenant. Les tests de securite devront verifier qu'un utilisateur d'un cabinet ne peut pas lire une ressource d'un autre cabinet.

## Migration future schema-par-cabinet

Si l'isolation doit augmenter, on peut migrer vers un schema PostgreSQL par cabinet:

1. garder `tenants` dans le schema public,
2. creer un schema par `tenant.slug`,
3. router la session SQLAlchemy vers le schema tenant,
4. migrer les tables metier en conservant les tables plateforme globales.

Le modele actuel avec `tenant_id` garde cette migration possible car toutes les donnees metier sont deja identifiees par cabinet.
