# Audit de conformité FADAA Santé — 13 juillet 2026

## État vérifié

- Architecture FastAPI, SQLAlchemy, PostgreSQL, Alembic, React/Vite et Docker conservée.
- Isolation par `tenant_id` présente dans les services médicaux et vérifiée par scénario cross-tenant.
- Espaces médecin, secrétaire, patient et Super Admin IRMA protégés par rôle.
- Permissions secrétaire `none/read/write/admin` contrôlées côté backend et reflétées côté frontend.
- Instances `trial/active/expired/suspended` et blocage des écritures pris en charge.
- Portail patient limité à ses propres données et aux paramètres du cabinet.
- Migrations exécutées automatiquement au démarrage du backend Docker.

## Corrections réalisées pendant l’audit

- Refus des refresh tokens sur les endpoints protégés.
- Canonicalisation du rôle `SUPER_ADMIN_IRMA`.
- Fermeture des CRUD génériques aux patients : utilisation obligatoire de `/patient/*`.
- Ajout des permissions manquantes sur les détails et téléchargements CNSS/documents/paiements/honoraires/visites.
- Validation des permissions avant écriture d’un fichier uploadé.
- Partage explicite des documents avec le patient (`shared_with_patient`).
- Consentement WhatsApp explicite et horodaté par patient.
- Recalcul automatique du RAP après création, modification ou suppression d’un paiement.
- Interdiction des surpaiements et des paiements liés au mauvais patient.
- Protection de la suppression d’un honoraire possédant des paiements.
- Lien persistant et unique entre visite et rendez-vous, avec contrôle du patient.
- Transitions de statuts des rendez-vous contrôlées et statut `requested` ajouté.
- Expiration automatique des essais et abonnements actifs arrivés à échéance.
- Création automatique de l’abonnement lors du provisioning d’un cabinet.
- Ajout de `/doctor/subscription` et de la page médecin correspondante.
- Validation de `SECRET_KEY` en environnement de production.
- Rotation automatique des refresh tokens, anti-rejeu, révocation au logout et renouvellement transparent côté frontend.

## Migrations ajoutées

- `20260713_0012_document_sharing.py`
- `20260713_0013_visit_appointment_status.py`
- `20260713_0014_patient_whatsapp_consent.py`
- `20260713_0015_auth_session_version.py`

## Contrôles exécutés

- `npm run typecheck` : OK
- `npm run lint` : OK
- `python3 -m compileall -q app alembic` : OK
- migrations Alembic PostgreSQL : OK
- patient sur `/api/documents` : 403
- patient sur `/api/patient/documents` : 200
- refresh token sur `/api/auth/me` : 401
- Super Admin sur `/api/super-admin/instances` : 200
- Super Admin sur `/api/documents` : 403
- médecin cabinet A sur patient cabinet B : 404

## Travaux restant avant une conformité intégrale de production

- Génération PDF réelle des ordonnances avec logo et informations du cabinet (endpoint actuellement préparatoire).
- Connexion réelle à WhatsApp Cloud API, gestion des templates et historique de conversation. Aucun message n’est envoyé tant que cette intégration n’est pas configurée.
- Association plusieurs-à-plusieurs entre honoraires et visites.
- Déplacement visuel par glisser-déposer dans le calendrier.
- Audit métier systématique de toutes les mutations médicales, avec politique de rétention.
- Gestion optionnelle de plusieurs sessions simultanées par appareil (le mode actuel privilégie une seule session active par compte).
- Suite automatisée pytest d’intégration et tests frontend de composants/parcours.
- Durcissement production : HTTPS au reverse proxy, secrets gérés hors dépôt, sauvegardes chiffrées et supervision.

Ces éléments ne doivent pas être présentés comme terminés tant que les intégrations, tests et contraintes d’exploitation correspondants ne sont pas en place.
