# Catalogue de médicaments

Le module Ordonnances accepte deux sources pour chaque ligne :

- `catalog` : médicament sélectionné dans `medication_catalog` ;
- `custom` : médicament saisi librement par le médecin.

Les ordonnances existantes restent compatibles : une ligne sans
`catalog_medication_id` est automatiquement considérée comme personnalisée.

## Structure extensible

Une entrée du catalogue contient notamment :

- un nom commercial et une dénomination générique ;
- un dosage, une forme et une voie d’administration ;
- une ou plusieurs spécialités (`Pédiatrie`, `Cardiologie`, etc.) ;
- des valeurs de prescription proposées par défaut ;
- une source et un code externe pour les imports futurs ;
- un `tenant_id` facultatif pour distinguer le catalogue global des entrées
  propres à un cabinet.

Les données provenant d’une future base officielle doivent être importées avec
un couple stable `source` / `external_code`. L’API expose ensuite ces données
sans coupler l’interface à un fournisseur précis.

## Conservation des prescriptions

Lorsqu’un médicament du catalogue est prescrit, le backend enregistre dans la
ligne d’ordonnance :

- l’identifiant du médicament ;
- la source ;
- le code externe ;
- le nom et les principales données utilisées ;
- la date de capture.

Cet instantané garantit qu’une ordonnance historique ne change pas si le
catalogue est corrigé ou remplacé ultérieurement.

## API

- `GET /api/medications/catalog`
  - paramètres facultatifs : `q`, `specialty`, `limit` ;
- `GET /api/medications/catalog/specialties`
  - retourne les spécialités présentes dans les catalogues accessibles.

La validation serveur refuse un identifiant de catalogue inexistant, inactif ou
appartenant à un autre cabinet. La saisie personnalisée reste toujours
disponible depuis l’écran Ordonnances.

## Import futur

Le script `backend/scripts/import_medication_catalog.py` accepte un fichier CSV
ou JSON. Exemple :

```bash
python scripts/import_medication_catalog.py catalogue-cardio.csv \
  --source SOURCE_OFFICIELLE \
  --specialty Cardiologie
```

Ajouter `--tenant slug-du-cabinet` crée ou met à jour un catalogue privé. Sans
ce paramètre, les médicaments importés sont disponibles globalement.
