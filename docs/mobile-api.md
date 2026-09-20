# API mobile FADAA Santé

## Accès

- Développement local : `http://127.0.0.1:8001/api`
- Swagger : `http://127.0.0.1:8001/docs`
- Contrat OpenAPI : `http://127.0.0.1:8001/openapi.json`
- Format : JSON UTF-8, sauf téléchargements PDF/fichiers
- Authentification : `Authorization: Bearer <access_token>`

L’application doit conserver séparément `access_token`, `refresh_token`, `tenant_id`, `user_id` et `role`. Chaque appareil possède une session indépendante.

## Authentification multi-appareils

```http
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

Connexion :

```json
{
  "email": "user@example.com",
  "password": "mot-de-passe",
  "cabinet_code": "code-cabinet"
}
```

Renouvellement :

```json
{"refresh_token": "..."}
```

Le refresh token est rotatif : après un renouvellement réussi, l’ancien token ne doit plus être utilisé. Un `401` impose de supprimer la session locale et de revenir à la connexion. La déconnexion révoque uniquement l’appareil courant.

## Espace patient

Points d’entrée principaux :

```http
GET /api/patient/dashboard
GET /api/patient/profile
PUT /api/patient/profile
PUT /api/patient/change-password
GET /api/patient/appointments?page=1&page_size=20
GET /api/patient/visits?page=1&page_size=20
GET /api/patient/prescriptions?page=1&page_size=20
GET /api/patient/documents?page=1&page_size=20
GET /api/patient/payments?page=1&page_size=20
GET /api/patient/honoraires?page=1&page_size=20
GET /api/patient/cnss?page=1&page_size=20
GET /api/patient/notifications
```

Actions patient :

```http
POST /api/patient/appointments/request
PUT  /api/patient/appointments/{id}/confirm
PUT  /api/patient/appointments/{id}/cancel
GET  /api/patient/prescriptions/{id}/pdf
GET  /api/patient/documents/{id}/download
GET  /api/patient/receipts/{payment_id}/download
POST /api/patient/cnss
GET  /api/patient/cnss/{id}/detail
PATCH /api/patient/cnss/{id}/action
```

## Accès rapide centré patient

Pour un écran professionnel affichant le dossier d’un patient :

```http
GET /api/patients/{patient_id}/overview
```

La réponse contient les compteurs médicaux et financiers, le prochain rendez-vous, la dernière visite et la dernière ordonnance.

Toutes les collections suivantes acceptent `patient_id`, `page` et `page_size` :

```http
GET /api/appointments?patient_id={id}&page=1&page_size=20
GET /api/visits?patient_id={id}&page=1&page_size=20
GET /api/prescriptions?patient_id={id}&page=1&page_size=20
GET /api/honoraires?patient_id={id}&page=1&page_size=20
GET /api/payments?patient_id={id}&page=1&page_size=20
GET /api/invoices?patient_id={id}&page=1&page_size=20
GET /api/documents?patient_id={id}&page=1&page_size=20
GET /api/cnss?patient_id={id}&page=1&page_size=20
```

## Rendez-vous complet

```http
GET /api/appointments/{appointment_id}/details
```

Retourne toujours les sections `appointment`, `patient`, `doctor`, `cabinet`, `visit`, `honoraires`, `payments`, `prescriptions`, `documents`, `cnss_records` et `activity_history`. Une ressource singulière absente vaut `null`; une collection absente vaut `[]`.

Workflow cabinet :

```http
POST /api/appointments/{id}/mark-arrived
POST /api/appointments/{id}/start
POST /api/appointments/{id}/end
POST /api/appointments/{id}/mark-absent
POST /api/appointments/{id}/cancel
GET  /api/appointments/{id}/history
```

## Finances et documents

```http
GET  /api/patients/{patient_id}/situation-financiere
GET  /api/invoices/{invoice_id}/pdf?action=preview
GET  /api/invoices/{invoice_id}/pdf?action=download
POST /api/invoices/{invoice_id}/echeances
GET  /api/invoices/{invoice_id}/echeances
GET  /api/echeances/{id}
POST /api/echeances/{id}/cancel
```

Les PDF renvoient `application/pdf`. Pour un téléchargement, utiliser `action=download` et lire `Content-Disposition`. Les réponses sensibles utilisent `Cache-Control: private, no-store`.

La création d’échéance est détaillée dans [api-echeances.md](api-echeances.md).

## Pagination

Lorsque `page` est fourni, la réponse standard est :

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 0,
    "total_pages": 1,
    "has_next": false,
    "has_previous": false
  }
}
```

Ne pas télécharger une collection complète pour la filtrer sur le téléphone. Utiliser `patient_id`, `search`, `status`, `sort_by` et `sort_order` lorsqu’ils figurent dans OpenAPI.

## Codes d’erreur

- `400` : requête métier incorrecte.
- `401` : session absente, expirée ou révoquée.
- `403` : rôle, module ou tenant non autorisé.
- `404` : ressource absente du tenant actif.
- `409` : conflit d’état métier.
- `422` : validation de données.

Le détail est renvoyé sous la forme :

```json
{"detail": "Message explicite"}
```

## Recommandations client

1. Générer les modèles depuis `/openapi.json`.
2. Utiliser un stockage sécurisé natif pour les tokens, jamais un stockage en clair.
3. Sérialiser les appels de renouvellement afin qu’un seul refresh soit exécuté à la fois.
4. Remplacer immédiatement les deux tokens après chaque refresh.
5. Respecter les URL de téléchargement renvoyées par l’API.
6. Ne jamais construire ou déduire un `tenant_id` côté client.
7. Afficher `detail` pour les erreurs métier et journaliser un identifiant de requête côté mobile.

