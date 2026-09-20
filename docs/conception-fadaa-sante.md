# Dossier de conception — FADAA Santé

## 1. Objet du document

Ce document présente la conception fonctionnelle et technique de FADAA Santé. Il complète le rapport de stage avec les modèles nécessaires à la compréhension du système avant et pendant sa réalisation : acteurs, cas d’utilisation, architecture, données, workflows, sécurité et déploiement.

La notation utilisée est principalement UML, représentée avec Mermaid afin que les diagrammes restent modifiables dans un fichier texte.

## 2. Périmètre du système

FADAA Santé est une plateforme SaaS multi-cabinets couvrant :

- gestion des cabinets et abonnements ;
- authentification et permissions ;
- patients, médecins et personnel ;
- rendez-vous, agenda, QR et visites ;
- honoraires, factures, paiements, RAP et échéances ;
- dépenses, achats et rapports financiers ;
- ordonnances, médicaments et documents ;
- dossiers CNSS/CNOPS ;
- notifications et WhatsApp ;
- blogs, événements et galeries ;
- support, audit et sauvegardes.

## 3. Acteurs du système

| Acteur | Responsabilité |
|---|---|
| Visiteur | Consulte la vitrine, les médecins, blogs et événements ; demande un rendez-vous ou s’inscrit à un événement |
| Patient | Consulte ses rendez-vous, QR, documents, ordonnances, paiements et dossiers CNSS/CNOPS |
| Médecin administrateur | Pilote le cabinet, les consultations, les finances, les utilisateurs et la configuration |
| Personnel | Utilise uniquement les modules autorisés par la matrice de permissions |
| Super administrateur | Administre la plateforme SaaS, les plans, cabinets, contenus publics, support et sauvegardes |
| Worker | Exécute les rappels, échéances et tâches automatiques |
| Services externes | E-mail, WhatsApp Meta, cartographie et éventuelles visioconférences |

## 4. Diagramme de contexte

```mermaid
flowchart LR
    V[Visiteur]
    P[Patient]
    M[Médecin]
    S[Personnel]
    A[Super administrateur]
    SYS((FADAA Santé))
    MAIL[Service e-mail]
    WA[WhatsApp Cloud API]
    MAP[OpenStreetMap]

    V <--> SYS
    P <--> SYS
    M <--> SYS
    S <--> SYS
    A <--> SYS
    SYS <--> MAIL
    SYS <--> WA
    SYS <--> MAP
```

## 5. Diagramme global des cas d’utilisation

```mermaid
flowchart TB
    subgraph VISITEUR[Visiteur]
      UC1[Consulter la vitrine]
      UC2[Rechercher un médecin]
      UC3[Demander un rendez-vous]
      UC4[Consulter blogs et événements]
      UC5[S'inscrire à un événement]
    end

    subgraph PATIENT[Patient]
      UC6[Activer son compte]
      UC7[Consulter ses rendez-vous]
      UC8[Afficher le QR]
      UC9[Consulter documents et ordonnances]
      UC10[Suivre paiements et RAP]
      UC11[Suivre CNSS/CNOPS]
      UC12[Gérer son consentement]
    end

    subgraph CABINET[Médecin / personnel autorisé]
      UC13[Gérer les patients]
      UC14[Gérer l'agenda]
      UC15[Scanner le QR]
      UC16[Réaliser une consultation]
      UC17[Gérer honoraires et paiements]
      UC18[Générer facture et reçu]
      UC19[Gérer documents et ordonnances]
      UC20[Gérer CNSS/CNOPS]
      UC21[Gérer dépenses et rapports]
      UC22[Configurer le cabinet]
    end

    subgraph ADMIN[Super administrateur]
      UC23[Gérer les cabinets]
      UC24[Gérer plans et abonnements]
      UC25[Gérer médias et contenus]
      UC26[Traiter le support]
      UC27[Superviser les sauvegardes]
    end
```

## 6. Cas d’utilisation détaillés

### 6.1 UC-RDV-01 — Créer un rendez-vous

| Élément | Description |
|---|---|
| Acteur principal | Médecin ou personnel autorisé |
| Préconditions | Utilisateur authentifié, cabinet actif, permission rendez-vous en écriture |
| Déclencheur | L’acteur choisit « Créer un rendez-vous » |
| Scénario nominal | Sélection du patient et du médecin ; choix de la date et du créneau ; saisie du motif ; validation de disponibilité ; création ; génération d’un QR unique |
| Alternatives | Créneau occupé ; médecin indisponible ; patient introuvable ; abonnement en lecture seule |
| Postconditions | Rendez-vous enregistré, historique créé, QR disponible au patient |

### 6.2 UC-RDV-02 — Confirmer la présence par QR

| Élément | Description |
|---|---|
| Acteur principal | Médecin |
| Préconditions | Rendez-vous existant, QR actif, médecin du même cabinet et affecté au rendez-vous |
| Scénario nominal | Scan ; résolution du jeton ; affichage patient/date/heure ; confirmation ; enregistrement de l’heure réelle ; passage en attente |
| Alternatives | QR inconnu ; rendez-vous annulé ; autre médecin ; demande non acceptée |
| Postconditions | Présence horodatée et historisée sans doublon |

### 6.3 UC-FIN-01 — Encaisser un paiement

| Élément | Description |
|---|---|
| Acteur principal | Médecin ou personnel financier autorisé |
| Préconditions | Honoraire existant et non annulé |
| Scénario nominal | Sélection de l’honoraire ; montant ; mode ; compte bancaire si nécessaire ; contrôle du RAP ; création du versement ; recalcul financier |
| Alternatives | Montant supérieur au RAP ; chèque incomplet ; compte bancaire obligatoire absent |
| Postconditions | Versement visible dans l’historique, RAP mis à jour, reçu disponible |

### 6.4 UC-FIN-02 — Annuler un paiement

| Élément | Description |
|---|---|
| Acteur principal | Médecin autorisé |
| Préconditions | Paiement valide et non déjà annulé |
| Scénario nominal | Confirmation ; statut `ANNULE` ; conservation du paiement ; recalcul honoraire, facture, RAP et échéance |
| Postconditions | Paiement exclu des encaissements mais toujours traçable |

### 6.5 UC-CNSS-01 — Suivre un dossier CNSS/CNOPS

| Élément | Description |
|---|---|
| Acteurs | Cabinet puis patient |
| Scénario nominal | Création ; traitement ; mise à disposition ; réception patient ; dépôt organisme ; décision ; remboursement ou rejet |
| Règle particulière | Un rejet exige un commentaire explicatif |
| Postconditions | Statut et historique visibles selon l’espace |

## 7. Architecture logique

```mermaid
flowchart TB
    subgraph PRESENTATION[Couche présentation]
      PUBLIC[Vitrine publique]
      DOCTOR[Espace médecin]
      STAFF[Espace personnel]
      PATIENT[Espace patient]
      ADMIN[Espace super admin]
    end

    subgraph CLIENT[Frontend React]
      ROUTER[Navigation et routes protégées]
      UI[Composants UI]
      STATE[État local et formulaires]
      API_CLIENT[Client HTTP avec renouvellement JWT]
      I18N[i18next FR / EN / AR]
    end

    subgraph SERVER[Backend FastAPI]
      ROUTES[Routes API]
      DEPS[Dépendances auth / tenant]
      SCHEMAS[Validation Pydantic]
      SERVICES[Services métier]
      ORM[Modèles SQLAlchemy]
    end

    subgraph DATA[Données et infrastructure]
      DB[(PostgreSQL)]
      REDIS[(Redis)]
      FILES[(Stockage privé)]
      WORKER[Worker planifié]
    end

    PRESENTATION --> CLIENT
    ROUTER --> UI
    UI --> STATE
    STATE --> API_CLIENT
    API_CLIENT --> ROUTES
    ROUTES --> DEPS
    ROUTES --> SCHEMAS
    ROUTES --> SERVICES
    SERVICES --> ORM
    ORM --> DB
    SERVICES --> FILES
    WORKER --> SERVICES
    WORKER --> REDIS
```

## 8. Diagramme de composants

```mermaid
flowchart LR
    subgraph Frontend
      APP[App / Router]
      AUTH_UI[Authentification]
      MED_UI[Modules médicaux]
      FIN_UI[Modules financiers]
      PAT_UI[Espace patient]
      ADM_UI[Administration]
      LIB_API[lib/api]
    end

    subgraph Backend
      API_AUTH[API Auth]
      API_CRUD[API métier]
      API_PUBLIC[API publique]
      API_WA[API WhatsApp]
      S_AUTH[Auth Service]
      S_CRUD[CRUD Service]
      S_PAY[Payment Document Service]
      S_REPORT[Financial Report Service]
      S_PATIENT[Patient Service]
      S_BACKUP[Backup Service]
    end

    APP --> AUTH_UI
    APP --> MED_UI
    APP --> FIN_UI
    APP --> PAT_UI
    APP --> ADM_UI
    AUTH_UI --> LIB_API
    MED_UI --> LIB_API
    FIN_UI --> LIB_API
    PAT_UI --> LIB_API
    ADM_UI --> LIB_API
    LIB_API --> API_AUTH
    LIB_API --> API_CRUD
    LIB_API --> API_PUBLIC
    LIB_API --> API_WA
    API_AUTH --> S_AUTH
    API_CRUD --> S_CRUD
    API_CRUD --> S_PAY
    API_CRUD --> S_REPORT
    API_CRUD --> S_PATIENT
    API_CRUD --> S_BACKUP
```

## 9. Diagramme de classes métier simplifié

```mermaid
classDiagram
    class Tenant {
      +String id
      +String name
      +String slug
      +String status
      +String specialty
    }
    class User {
      +String id
      +String email
      +String password_hash
      +Boolean is_active
    }
    class AuthSession {
      +String id
      +String user_id
      +String tenant_id
      +DateTime expires_at
      +DateTime revoked_at
    }
    class PatientProfile {
      +String id
      +Date birth_date
      +String cin
      +String status
    }
    class DoctorProfile {
      +String id
      +String specialty
      +String professional_email
    }
    class Appointment {
      +String id
      +Date date
      +Time start_time
      +Time end_time
      +String status
      +String qr_token
      +DateTime qr_scanned_at
    }
    class Visit {
      +String id
      +Date visit_date
      +String attendance_status
      +Integer duration_seconds
    }
    class Fee {
      +String id
      +Decimal amount
      +Decimal paid_amount
      +String status
    }
    class Invoice {
      +String id
      +String invoice_number
      +Decimal amount_total
      +Decimal amount_due
    }
    class Payment {
      +String id
      +Decimal amount
      +String method
      +String status
      +DateTime paid_at
    }
    class PaymentDueDate {
      +String id
      +Decimal amount
      +Decimal paid_amount
      +Date due_date
      +String status
    }
    class MedicalDocument {
      +String id
      +String title
      +String document_type
      +String file_url
      +Boolean shared_with_patient
    }
    class Prescription {
      +String id
      +String prescription_number
      +JSON items
    }
    class CNSSCase {
      +String id
      +String reference
      +String status
      +Date deadline
    }

    Tenant "1" --> "*" User
    User "1" --> "*" AuthSession
    User "1" --> "0..1" PatientProfile
    User "1" --> "0..1" DoctorProfile
    Tenant "1" --> "*" Appointment
    PatientProfile "1" --> "*" Appointment
    DoctorProfile "1" --> "*" Appointment
    Appointment "1" --> "0..1" Visit
    PatientProfile "1" --> "*" Fee
    Fee "1" --> "*" Invoice
    Fee "1" --> "*" Payment
    Invoice "1" --> "*" PaymentDueDate
    PaymentDueDate "0..1" --> "*" Payment
    PatientProfile "1" --> "*" MedicalDocument
    PatientProfile "1" --> "*" Prescription
    PatientProfile "1" --> "*" CNSSCase
```

## 10. Modèle relationnel principal

| Table | Clé primaire | Clés étrangères principales | Rôle |
|---|---|---|---|
| `tenants` | `id` | — | Cabinet client SaaS |
| `users` | `id` | `tenant_id` | Identité et connexion |
| `auth_sessions` | `id` | `user_id`, `tenant_id` | Sessions par appareil |
| `patient_profiles` | `id` | `user_id`, `tenant_id` | Informations patient |
| `patient_cabinet_memberships` | `id` | `patient_id`, `tenant_id` | Patient multi-cabinets |
| `doctor_profiles` | `id` | `user_id`, `tenant_id` | Informations médecin |
| `appointments` | `id` | `tenant_id`, `patient_id`, `doctor_id` | Rendez-vous et QR |
| `visits` | `id` | `appointment_id`, patient, médecin | Consultation réalisée |
| `fees` | `id` | tenant, patient, médecin | Honoraire |
| `invoices` | `id` | `fee_id`, patient | Facture |
| `payments` | `id` | fee, invoice, échéance, patient | Versement financier |
| `payment_due_dates` | `id` | invoice, fee, patient | Échéance attendue |
| `payment_documents` | `id` | payment, fee, patient | Reçu ou facture PDF |
| `expenses` | `id` | tenant, fournisseur, compte | Sortie financière |
| `medical_documents` | `id` | tenant, patient, médecin | Document privé |
| `prescriptions` | `id` | tenant, patient, médecin | Ordonnance |
| `cnss_cases` | `id` | tenant, patient | Dossier CNSS/CNOPS |
| `operation_history` | `id` | ressources métier | Historique fonctionnel |
| `audit_logs` | `id` | tenant, utilisateur | Audit technique |

## 11. Conception du workflow rendez-vous

### 11.1 Machine à états

```mermaid
stateDiagram-v2
    [*] --> requested: demande patient
    [*] --> planned: création cabinet
    requested --> planned: accepter
    requested --> rejected: refuser
    requested --> cancelled: annuler
    planned --> confirmed: confirmer
    planned --> waiting: QR / arrivée
    planned --> absent: absence
    planned --> cancelled: annuler
    confirmed --> waiting: QR / arrivée
    confirmed --> in_progress: démarrer
    confirmed --> absent: absence
    confirmed --> cancelled: annuler
    waiting --> in_progress: démarrer
    waiting --> absent: absence
    waiting --> cancelled: annuler
    in_progress --> completed: terminer
    completed --> [*]
    rejected --> [*]
    absent --> [*]
    cancelled --> [*]
```

### 11.2 Séquence de création et consultation

```mermaid
sequenceDiagram
    actor U as Médecin/Personnel
    participant UI as Agenda React
    participant API as FastAPI
    participant SCH as Schedule Service
    participant DB as PostgreSQL

    U->>UI: Saisit patient, médecin et créneau
    UI->>API: POST /appointments
    API->>SCH: validate_availability()
    SCH->>DB: Vérifie horaire, congé, blocage et conflit
    DB-->>SCH: Créneau libre
    SCH-->>API: Disponible
    API->>DB: INSERT appointment + QR + historique
    DB-->>API: Rendez-vous créé
    API-->>UI: AppointmentOut
    U->>UI: Démarre la consultation
    UI->>API: POST /appointments/id/start
    API->>DB: status=in_progress, actual_start_time
    U->>UI: Termine
    UI->>API: POST /appointments/id/end
    API->>DB: status=completed, durée, visite unique
```

## 12. Conception du workflow financier

### 12.1 États d’un paiement

```mermaid
stateDiagram-v2
    [*] --> PAYE: espèces/carte/virement validé
    [*] --> EN_ATTENTE: chèque reçu
    EN_ATTENTE --> PAYE: chèque encaissé
    EN_ATTENTE --> ANNULE: annulation
    PAYE --> ANNULE: annulation métier
    PAYE --> REMBOURSE: remboursement
    ANNULE --> [*]
    REMBOURSE --> [*]
```

### 12.2 Calculs

```text
paiement_valide = statut non annulé/remboursé
                   ET (mode différent de chèque OU chèque encaissé)

total_paye = somme(paiements_valides.amount)
RAP = max(0, honoraire.amount - total_paye)
reste_echeance = max(0, echeance.amount - paiements_valides_de_echeance)
```

### 12.3 Séquence d’encaissement

```mermaid
sequenceDiagram
    actor C as Cabinet
    participant UI as Paiements React
    participant API as FastAPI
    participant FIN as Service financier
    participant DB as PostgreSQL
    participant PDF as ReportLab

    C->>UI: Saisit montant et mode
    UI->>API: POST paiement
    API->>FIN: Contrôle honoraire et RAP
    FIN->>DB: Charge paiements valides
    DB-->>FIN: Historique financier
    FIN->>FIN: Vérifie dépassement et compte bancaire
    FIN->>DB: Enregistre versement
    FIN->>DB: Recalcule fee, facture et échéance
    API-->>UI: Paiement créé + nouveaux totaux
    C->>UI: Générer le reçu
    UI->>API: POST document type recu
    API->>PDF: Génère ticket 80 mm
    PDF->>DB: Archive numéro et chemin
    API-->>UI: PDF imprimable
```

## 13. Conception du workflow CNSS/CNOPS

```mermaid
stateDiagram-v2
    [*] --> REQUESTED: dossier créé
    REQUESTED --> PROCESSING: cabinet commence
    PROCESSING --> READY_FOR_PICKUP: dossier traité
    READY_FOR_PICKUP --> DELIVERED_TO_PATIENT: patient confirme réception
    DELIVERED_TO_PATIENT --> SUBMITTED_TO_CNSS: patient confirme dépôt
    SUBMITTED_TO_CNSS --> APPROVED: organisme accepte
    SUBMITTED_TO_CNSS --> REJECTED: organisme rejette + commentaire
    APPROVED --> [*]
    REJECTED --> [*]
```

Chaque transition produit une entrée d’historique contenant le statut précédent, le nouveau statut, l’auteur, la date et éventuellement un commentaire.

## 14. Conception de la sécurité

### 14.1 Chaîne de décision d’autorisation

```mermaid
flowchart TD
    REQ[Requête authentifiée] --> JWT{JWT valide ?}
    JWT -->|Non| R401[401 Non authentifié]
    JWT -->|Oui| SESSION{Session active ?}
    SESSION -->|Non| R401
    SESSION -->|Oui| TENANT{Tenant de session cohérent ?}
    TENANT -->|Non| R403[403 Accès refusé]
    TENANT -->|Oui| ROLE{Rôle autorisé ?}
    ROLE -->|Non| R403
    ROLE -->|Oui| PLAN{Module inclus dans le plan ?}
    PLAN -->|Non| R403
    PLAN -->|Oui| PERM{Permission suffisante ?}
    PERM -->|Non| R403
    PERM -->|Oui| SCOPE{Ressource du tenant/patient ?}
    SCOPE -->|Non| R404[404 Ressource introuvable]
    SCOPE -->|Oui| OK[Exécuter le service métier]
```

### 14.2 Matrice simplifiée

| Ressource | Médecin | Personnel | Patient | Super Admin |
|---|---|---|---|---|
| Patients du cabinet | CRUD | Selon permission | Son propre profil | Aucun contenu médical |
| Rendez-vous | CRUD | Selon permission | Ses rendez-vous | Aucun contenu médical |
| Paiements | CRUD/annulation | Selon permission | Lecture autorisée | Aucun paiement médical |
| Documents | CRUD/partage | Selon permission | Documents partagés | Aucun contenu médical |
| Configuration cabinet | Administration | Généralement aucun accès | Préférences patient | Statut plateforme seulement |
| Plans SaaS | Lecture | Aucun | Aucun | CRUD |
| Sauvegardes | Aucun | Aucun | Aucun | Administration |

## 15. Conception de la pagination

Les listes à croissance continue utilisent les paramètres :

```text
page=1
page_size=10
search=...
sort_by=created_at
sort_order=desc
```

```mermaid
sequenceDiagram
    participant UI as Liste React
    participant API as Endpoint paginé
    participant DB as PostgreSQL
    UI->>API: GET ?page=2&page_size=10&search=adam
    API->>DB: COUNT avec tenant + filtres
    DB-->>API: total_items
    API->>DB: SELECT filtré, trié, OFFSET/LIMIT
    DB-->>API: 10 éléments
    API-->>UI: items + pagination
```

La recherche est exécutée avant `OFFSET/LIMIT`, garantissant qu’elle porte sur toutes les données autorisées.

## 16. Conception documentaire

```mermaid
flowchart LR
    ACTION[Action métier] --> VALIDATE[Contrôle statut et permission]
    VALIDATE --> NUMBER[Numéro unique par tenant et année]
    NUMBER --> RENDER[Génération ReportLab]
    RENDER --> PRIVATE[Stockage privé]
    PRIVATE --> RECORD[Enregistrement document]
    RECORD --> HISTORY[Historique / audit]
    HISTORY --> ACCESS[Aperçu ou téléchargement authentifié]
```

Documents générés :

- facture A4 ;
- reçu/ticket de caisse 80 mm ;
- ordonnance A4 ;
- rapport financier PDF ;
- rapport financier Excel.

## 17. Conception des interfaces

### 17.1 Principes

- une action principale clairement identifiable par écran ;
- statuts représentés par un libellé et une couleur ;
- formulaires regroupés selon le métier ;
- détails secondaires repliables ;
- listes paginées et filtrables ;
- modales fermables par bouton et clic extérieur lorsque sans risque ;
- boutons désactivés selon le statut ;
- affichage des noms, jamais des UUID comme valeur principale ;
- responsive desktop, tablette et mobile ;
- traductions FR, EN, AR et RTL.

### 17.2 Arborescence de navigation

```mermaid
flowchart TB
    ROOT[Application]
    ROOT --> PUBLIC[Public]
    ROOT --> AUTH[Authentification]
    ROOT --> DOC[Docteur]
    ROOT --> STAFF[Personnel]
    ROOT --> PAT[Patient]
    ROOT --> ADM[Super Admin]

    PUBLIC --> HOME[Accueil]
    PUBLIC --> DOCTORS[Médecins / carte]
    PUBLIC --> EVENTS[Événements]
    PUBLIC --> BLOGS[Blogs / galeries]

    DOC --> DASH[Tableau de bord]
    DOC --> RDV[Rendez-vous]
    DOC --> PATIENTS[Patients]
    DOC --> MEDICAL[Visites / ordonnances / documents]
    DOC --> FINANCE[Honoraires / paiements / finance]
    DOC --> CNSS[CNSS/CNOPS]
    DOC --> CONFIG[Configuration]

    PAT --> P_RDV[Mes rendez-vous]
    PAT --> P_DOC[Documents / ordonnances]
    PAT --> P_PAY[Paiements]
    PAT --> P_CNSS[CNSS/CNOPS]
    PAT --> P_PROFILE[Profil]
```

## 18. Conception du déploiement

```mermaid
flowchart TB
    INTERNET[Utilisateur]
    subgraph HOST[Serveur Docker]
      FRONT[frontend : React/Vite]
      BACK[backend : FastAPI/Uvicorn]
      WORK[worker : tâches planifiées]
      POSTGRES[(PostgreSQL 16)]
      REDIS[(Redis 7)]
      V_UPLOAD[(Volume uploads)]
      V_BACKUP[(Volume backups)]
      V_DB[(Volume postgres)]
    end

    INTERNET --> FRONT
    FRONT --> BACK
    BACK --> POSTGRES
    BACK --> REDIS
    BACK --> V_UPLOAD
    WORK --> POSTGRES
    WORK --> REDIS
    WORK --> V_BACKUP
    POSTGRES --> V_DB
```

En production, un reverse proxy TLS doit être placé devant le frontend et le backend. Les secrets doivent être injectés par l’environnement et les volumes doivent être sauvegardés hors du serveur principal.

## 19. Règles métier centrales

| Code | Règle |
|---|---|
| RM-01 | Toute ressource médicale appartient à un cabinet |
| RM-02 | Un patient peut être rattaché à plusieurs cabinets |
| RM-03 | Un rendez-vous ne peut pas chevaucher un autre rendez-vous actif du même médecin |
| RM-04 | Un QR appartient à un seul rendez-vous et son scan est idempotent |
| RM-05 | Une visite liée à un rendez-vous est unique |
| RM-06 | Un paiement annulé reste visible mais est exclu des totaux |
| RM-07 | Un chèque non encaissé n’est pas une entrée de trésorerie réelle |
| RM-08 | Le montant cumulé valide ne dépasse pas le montant dû |
| RM-09 | Un reçu ne peut pas être généré pour un paiement annulé/remboursé |
| RM-10 | Un document patient n’est visible que s’il est explicitement partagé |
| RM-11 | Un rejet CNSS/CNOPS exige un commentaire |
| RM-12 | Le personnel agit selon sa permission par module |
| RM-13 | Le Super Admin n’accède pas aux données médicales |
| RM-14 | Les actions sensibles sont historisées |

## 20. Contraintes de base de données

- clés primaires UUID afin d’éviter les identifiants séquentiels exposés ;
- clés étrangères pour assurer les rattachements ;
- suppression en cascade uniquement lorsque la dépendance le justifie ;
- `SET NULL` pour préserver un historique lorsque l’acteur associé disparaît ;
- index sur `tenant_id`, dates, statuts et champs de recherche ;
- unicité du QR de rendez-vous ;
- unicité d’une visite par rendez-vous ;
- unicité des numéros de document dans le tenant ;
- montants en `NUMERIC(12,2)` ;
- migrations Alembic pour toute évolution structurelle.

## 21. Exigences de performance

- pagination côté serveur pour les listes longues ;
- index composites tenant/date/statut ;
- chargement parallèle des données indépendantes côté frontend ;
- limitation du nombre de résultats de recherche instantanée ;
- réutilisation des documents générés lorsqu’ils sont immuables ;
- worker séparé pour les rappels automatiques ;
- possibilité future de cache Redis sur les données publiques.

## 22. Exigences de qualité

| Attribut | Décision de conception |
|---|---|
| Maintenabilité | Séparation routes, services, schémas et modèles |
| Testabilité | Services métier appelables indépendamment de l’interface |
| Portabilité | Conteneurs Docker et configuration par variables |
| Sécurité | Défense en profondeur : JWT, session, rôle, tenant, permission, statut |
| Auditabilité | Journaux techniques et historiques métier |
| Extensibilité | Modules frontend/backend et schéma migrable |
| Interopérabilité | API REST/OpenAPI réutilisable par mobile |

## 23. Matrice de traçabilité des besoins

| Besoin | Composants de conception | Validation |
|---|---|---|
| Agenda médical | Appointment, Schedule, FullCalendar | Conflits et transitions testés |
| QR patient | qr_token, endpoints resolve/confirm, scanner | Unicité et second scan sans doublon |
| Paiements partiels | Payment, Fee, Invoice, DueDate | RAP recalculé |
| Reçu | PaymentDocument, ReportLab 80 mm | PDF numéroté et imprimable |
| Rapport mensuel | FinancialReportService, OpenPyXL | PDF/Excel entrées-sorties |
| Isolation cabinet | tenant_id, dépendances auth | Accès inter-tenant refusé |
| Personnel limité | StaffPermission | Boutons et API contrôlés |
| Espace patient | routes patient scoped | Données propres uniquement |
| CNSS/CNOPS | CNSSCase, historique, agenda | Transition et commentaire rejet |
| Documents privés | MedicalDocument, routes protégées | Partage patient vérifié |

## 24. Conclusion de conception

La conception de FADAA Santé repose sur trois principes directeurs : **isolation**, **traçabilité** et **cohérence métier**. L’isolation multi-tenant protège chaque cabinet. La traçabilité conserve l’historique des opérations médicales, financières et administratives. La cohérence métier est assurée par des états contrôlés, des contraintes relationnelles et des calculs réalisés côté serveur.

L’architecture en couches et l’orientation API réduisent le couplage entre l’interface et les règles métier. Cette base permet de faire évoluer la plateforme vers une application mobile, un déploiement distribué ou de nouvelles intégrations sans remettre en cause les concepts centraux.

## 25. Utilisation dans le rapport de stage

Pour le rapport final :

1. intégrer les sections 3 à 6 dans le chapitre « Analyse fonctionnelle » ;
2. intégrer les sections 7 à 10 dans le chapitre « Conception générale et détaillée » ;
3. choisir quatre diagrammes principaux dans le corps du rapport ;
4. placer les autres diagrammes en annexes ;
5. ajouter sous chaque diagramme une phrase d’interprétation ;
6. numéroter les figures : « Figure 1 », « Figure 2 », etc. ;
7. exporter les diagrammes Mermaid en PNG ou SVG avant l’intégration dans Word si l’établissement n’accepte pas Mermaid.
