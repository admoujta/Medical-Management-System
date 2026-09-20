# Dossier de synthèse pour rapport — FADAA Santé

## 1. Présentation

FADAA Santé est une plateforme SaaS de gestion médicale multi-cabinet. Elle couvre le parcours du cabinet, du médecin, du personnel et du patient : rendez-vous, dossier patient, visites, honoraires, paiements, échéances, relances, ordonnances, documents, CNSS, WhatsApp, support, audit et abonnement.

L’objectif est de centraliser les opérations administratives et médicales tout en respectant l’isolation entre cabinets, la confidentialité des données médicales et la traçabilité des accès.

## 2. Utilisateurs

### Médecin administrateur

- crée son cabinet avec 30 jours d’essai gratuit par défaut ;
- configure les horaires, le cabinet, le logo et les utilisateurs ;
- gère les patients, rendez-vous, visites et documents ;
- crée les honoraires, factures, échéances et paiements ;
- suit les impayés et envoie des relances ;
- crée les ordonnances et les PDF professionnels ;
- utilise WhatsApp avec consentement patient et modèles Meta ;
- consulte les avis, notifications, traces et tickets de support ;
- choisit une offre après l’essai.

### Secrétaire ou responsable

- reçoit une invitation par e-mail et définit son mot de passe ;
- accède uniquement aux modules inclus dans l’abonnement ;
- dispose d’une matrice de permissions `none`, `read`, `write` ou `admin` ;
- ne voit pas les fonctions qui ne lui sont pas accordées.

### Patient

- obtient son compte à partir d’une demande de rendez-vous ou d’une création par le cabinet ;
- reçoit un lien d’activation par e-mail et change obligatoirement son mot de passe ;
- peut être lié à plusieurs cabinets sans cabinet principal ;
- consulte ses rendez-vous, visites, documents, ordonnances, dossiers CNSS et paiements ;
- reçoit des notifications et relances dans son espace ;
- gère son consentement WhatsApp et sa langue de communication ;
- publie et modifie ses avis.

### Super Admin

- administre la plateforme SaaS sans consulter les données médicales ;
- gère les cabinets, utilisateurs principaux et statuts d’instances ;
- configure les offres, tarifs, périodes d’essai et modules ;
- valide ou refuse les paiements d’abonnement ;
- traite les tickets de support ;
- gère les événements publics, sauvegardes et paramètres techniques ;
- supervise WhatsApp, les journaux et les indicateurs SaaS.

## 3. Architecture technique

### Frontend

- React 19 et TypeScript ;
- Vite 6 ;
- Tailwind CSS ;
- FullCalendar pour l’agenda ;
- i18next pour l’internationalisation ;
- Framer Motion et transitions CSS ;
- icônes Lucide React.

### Backend

- FastAPI ;
- SQLAlchemy 2 ;
- Pydantic ;
- PostgreSQL 16 ;
- Alembic pour les migrations ;
- authentification JWT avec access token et refresh token ;
- ReportLab pour les PDF ;
- APScheduler pour les tâches automatiques ;
- stockage privé des documents ;
- Redis disponible pour les services asynchrones.

### Exécution

Docker Compose orchestre :

- `frontend` sur le port `5180` ;
- `backend` sur le port `8001` ;
- `worker` pour les tâches planifiées ;
- `postgres` ;
- `redis`.

## 4. Modules métier

### Cabinets et multi-tenant

Chaque ressource médicale ou administrative appartient à un cabinet. Le `tenant_id` est déterminé depuis l’utilisateur authentifié et n’est pas librement choisi par le client. Les requêtes sont filtrées par cabinet.

### Rendez-vous et agenda

- recherche de médecins et demande publique ;
- agenda journalier et hebdomadaire ;
- horaires synchronisés avec la configuration du cabinet ;
- pauses, indisponibilités et créneaux bloqués ;
- durée habituelle de consultation utilisée comme aide, sans limiter les consultations plus longues ;
- statuts et historique horodaté ;
- création de visite depuis un rendez-vous.

### Patients

- e-mail obligatoire ;
- sexe limité à Homme ou Femme ;
- dossier patient avec plusieurs cabinets ;
- activation sécurisée par lien ;
- historique rendez-vous, visites, finances, ordonnances et documents ;
- préférences WhatsApp et langue de communication.

### Honoraires, factures et TVA

- plusieurs honoraires possibles par rendez-vous ;
- regroupement sans duplication ;
- type, titre, description et montant ;
- calcul décimal HT, TVA et TTC ;
- paiements associés ;
- calcul du payé et du reste à payer ;
- reçu ou facture contenant cabinet, praticien, patient et honoraire.

### Échéances et paiements

Une échéance est un montant attendu à une date, et non un mode de paiement.

- une facture peut avoir une ou plusieurs échéances ;
- une échéance accepte plusieurs paiements et plusieurs modes ;
- modes : espèces, chèque, carte bancaire et virement ;
- liaison nullable `echeance_id` sur le paiement ;
- montants financiers stockés en décimal ;
- statuts : `A_VENIR`, `EN_ATTENTE`, `PARTIELLEMENT_PAYEE`, `PAYEE`, `EN_RETARD`, `ANNULEE` ;
- contrôle du dépassement du reste à payer ;
- données spécifiques au chèque : numéro, banque, émission, encaissement prévu et statut.

### Relances d’impayés

- relance individuelle ou en masse ;
- envoi vers l’espace patient ou WhatsApp ;
- planification ;
- historique et statut ;
- notification visible par le patient ;
- délais automatiques configurables.

### WhatsApp Cloud API

- configuration par cabinet ;
- webhook Meta ;
- conversations par patient ;
- messages entrants et sortants ;
- modèles de rappel, confirmation, relance, CNSS et message général ;
- synchronisation avec l’état Meta ;
- respect de la fenêtre de conversation de 24 heures ;
- consentement explicite, retrait et journal du consentement ;
- recherche des patients par nom ou numéro ;
- notifications de nouveaux messages.

### Ordonnances

- prescriptions structurées avec médicaments et instructions ;
- aperçu A4 ;
- logo et coordonnées du cabinet/praticien ;
- données patient ;
- impression couleur et noir et blanc lisible ;
- génération PDF serveur ;
- archivage automatique dans le dossier patient ;
- historique de création, modification, impression et téléchargement.

### Documents et scanner

- scan/import lancé depuis la fiche patient ;
- rattachement automatique au bon patient ;
- catégories : analyses, radios, courriers, CNSS et autres ;
- stockage privé ;
- aperçu, téléchargement, versions, archivage et restauration ;
- traçabilité des consultations.

### CNSS

- dossiers rattachés au patient et au cabinet ;
- documents associés ;
- statuts et historique des changements ;
- consultation par le médecin et le patient ;
- suivi du remboursement.

### Support et avis

- tickets du médecin vers le Super Admin ;
- réponses et notifications avec accès direct ;
- avis multiples du patient ;
- modification de ses propres avis ;
- consultation des avis par le médecin.

### Notifications

La cloche du médecin regroupe :

- messages WhatsApp ;
- réponses du support ;
- avis patients ;
- fin d’essai proche ;
- délai de grâce ou suspension ;
- paiement d’abonnement accepté ou refusé.

Le patient reçoit notamment les relances, changements CNSS et autres messages utiles dans son espace.

## 5. Abonnements et commercialisation

- page publique de tarification ;
- offres administrées sans modification du code ;
- Essentiel et Professionnel configurées avec 30 jours d’essai ;
- un cabinet possède un seul abonnement actif à la fois ;
- changement d’offre possible ;
- chaque cabinet supplémentaire possède son abonnement ;
- paiement SaaS séparé des paiements médicaux ;
- validation manuelle d’un virement ou chèque ;
- bascule entre essai, actif, délai de grâce, suspendu et expiré ;
- modules réellement activés ou bloqués selon l’offre ;
- compatibilité conservée pour les cabinets existants.

## 6. Sécurité et traçabilité

- JWT, refresh token et révocation par version d’authentification ;
- RBAC par rôle ;
- permissions CRUD du personnel ;
- isolation stricte par `tenant_id` ;
- contrôle des modules de l’abonnement côté interface et API ;
- journalisation des créations, modifications et suppressions ;
- journalisation des consultations de dossiers médicaux ;
- stockage privé des documents et PDF ;
- Super Admin séparé des données médicales ;
- confirmation des actions sensibles ;
- erreurs utilisateur affichées avec des messages propres.

## 7. Sauvegardes

- sauvegarde automatique ;
- rétention ;
- checksum ;
- journal de sauvegarde ;
- test périodique de restauration ;
- principe appliqué : une sauvegarde non restaurée et non vérifiée n’est pas considérée comme fiable.

## 8. Design et expérience utilisateur

- identité visuelle médicale cohérente ;
- interfaces horizontales et responsives ;
- cartes, tableaux, formulaires, modales et statuts harmonisés ;
- couleurs sémantiques par état ;
- notifications non bloquantes ;
- transitions sobres ;
- focus clavier visible ;
- prise en charge de `prefers-reduced-motion` ;
- langue déterminée automatiquement depuis le navigateur, sans bouton visible.

## 9. Documentation et tests

- Swagger : `http://localhost:8001/docs`
- ReDoc : `http://localhost:8001/redoc`
- référence écrite : [api-reference.md](./api-reference.md)
- schéma OpenAPI : [openapi.json](./openapi.json)
- routes frontend : [routes-frontend.md](./routes-frontend.md)
- architecture multi-tenant : [multi-tenancy.md](./multi-tenancy.md)
- sauvegardes : [backup-restore.md](./backup-restore.md)
- conformité : [compliance-audit-2026-07-13.md](./compliance-audit-2026-07-13.md)

La documentation API actuelle contient 218 routes FastAPI et 291 opérations HTTP. Chaque opération indique les paramètres, le corps de requête, un exemple `curl`, l’authentification et les réponses.

## 10. Commandes principales

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend worker
```

```bash
cd frontend
npm run build
```

```bash
docker compose exec -T backend alembic current
docker compose exec -T backend python scripts/export_api_docs.py
```

## 11. Prompt prêt à donner à ChatGPT

Copier le texte suivant dans une nouvelle conversation, puis joindre ce document, `routes-frontend.md` et `api-reference.md`.

```text
Tu es consultant senior en architecture logicielle, gestion de projet et systèmes d’information de santé.

À partir des documents FADAA Santé joints, rédige un rapport professionnel, structuré et cohérent en français.

Le rapport doit contenir :
1. une page de garde ;
2. un résumé exécutif ;
3. le contexte et la problématique ;
4. les objectifs généraux et spécifiques ;
5. les acteurs et leurs responsabilités ;
6. les besoins fonctionnels et non fonctionnels ;
7. l’architecture technique frontend, backend, base de données, worker et déploiement ;
8. l’architecture multi-tenant et les règles d’isolation ;
9. une description détaillée de chaque module ;
10. les principaux workflows : création cabinet et essai, activation patient, rendez-vous, consultation, facturation, échéance, paiement, relance, ordonnance, documents, CNSS, WhatsApp, support et abonnement ;
11. la sécurité, le RBAC, les permissions CRUD et la traçabilité ;
12. la stratégie de sauvegarde et de restauration ;
13. la documentation des API et quelques exemples représentatifs de requêtes ;
14. les choix UX/UI et l’accessibilité ;
15. les tests, la validation et les critères d’acceptation ;
16. les limites actuelles, risques et recommandations ;
17. une conclusion et des perspectives d’évolution.

Contraintes :
- ne pas inventer de fonctionnalité absente des documents ;
- distinguer ce qui est implémenté de ce qui constitue une recommandation ;
- utiliser un style académique et professionnel ;
- expliquer les termes techniques ;
- intégrer des tableaux lorsque cela améliore la compréhension ;
- proposer des diagrammes Mermaid pour l’architecture, les rôles, le workflow rendez-vous et le workflow paiement/échéance ;
- mentionner que le Super Admin ne consulte jamais les données médicales ;
- mentionner que chaque cabinet a un seul abonnement actif et que les modules sont contrôlés par l’offre ;
- ne jamais exposer de mots de passe, jetons, secrets Meta ou données personnelles réelles.

Produis un rapport complet avec une table des matières et une numérotation hiérarchique.
```

## 12. Précautions avant diffusion

- remplacer les domaines locaux par les domaines de production ;
- ne jamais inclure `.env`, mot de passe, JWT, token Meta ou token ngrok ;
- anonymiser les captures d’écran et patients ;
- vérifier les mentions légales, la politique de confidentialité et les obligations applicables au Maroc ;
- distinguer les résultats de tests locaux des garanties d’un audit de production.
