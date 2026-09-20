# Sauvegardes et restauration vérifiée

FADAA Santé sauvegarde la base PostgreSQL et le volume privé des documents dans une archive complète. Les archives sont conservées dans le volume Docker privé `backups_data` et ne sont jamais servies publiquement.

## Automatisation

- sauvegarde complète quotidienne à 02:15 (Africa/Casablanca) ;
- rétention par défaut : 30 jours ;
- test réel de restauration le premier jour de chaque mois à 04:00 ;
- sauvegarde et test manuel depuis `/super-admin/backups` ;
- journalisation dans `backup_logs` et `restore_logs`.

Le test extrait l’archive, vérifie les empreintes SHA-256, crée une base PostgreSQL temporaire, exécute `pg_restore`, contrôle les tables principales et les relations, puis supprime la base temporaire.

## Sauvegarde locale

```bash
docker compose exec postgres pg_dump -U postgres gestion_medical > backup.sql
```

## Restauration locale

```bash
docker compose exec -T postgres psql -U postgres gestion_medical < backup.sql
```

## Production

Prevoir:

- sauvegarde quotidienne chiffree,
- retention 30 jours minimum,
- test de restauration mensuel réellement exécuté dans une base isolée,
- journalisation des operations de restauration,
- stockage separe de la base principale.

La restauration destructive de production n’est pas exposée comme une action ordinaire. Elle doit être réalisée en fenêtre de maintenance, après sauvegarde de sécurité, validation explicite et contrôle d’un second administrateur.
