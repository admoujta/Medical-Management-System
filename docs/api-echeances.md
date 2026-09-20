# API de création d’une échéance

## Endpoint

```http
POST /api/invoices/{invoice_id}/echeances
Authorization: Bearer <access_token>
Content-Type: application/json
```

L’utilisateur doit appartenir au cabinet actif et disposer d’un accès en écriture au module `payments`. La facture, le patient et l’honoraire sont toujours résolus côté serveur dans ce même cabinet.

## Requête simple

```json
{
  "amount": "500.00",
  "due_date": "2026-09-30",
  "comment": "Deuxième tranche",
  "guarantee_type": "NORMAL"
}
```

`amount` est exprimé en MAD, doit être strictement positif et comporte au maximum deux décimales. La somme des échéances non annulées ne peut pas dépasser le montant total de la facture.

## Types de garantie

- `NORMAL` : aucun champ de garantie supplémentaire.
- `GUARANTOR` : `guarantor_name` et `guarantor_cin` sont obligatoires.
- `CHEQUE` : banque, numéro, date d’émission et date d’échéance du chèque sont obligatoires.

Exemple avec garant :

```json
{
  "amount": "1200.00",
  "due_date": "2026-10-15",
  "guarantee_type": "GUARANTOR",
  "guarantor_name": "Ahmed Exemple",
  "guarantor_cin": "AB123456"
}
```

Exemple avec chèque de garantie :

```json
{
  "amount": "800.00",
  "due_date": "2026-11-01",
  "guarantee_type": "CHEQUE",
  "guarantee_cheque_bank": "Banque Exemple",
  "guarantee_cheque_number": "CHQ-00125",
  "guarantee_cheque_issue_date": "2026-08-01",
  "guarantee_cheque_due_date": "2026-11-01"
}
```

## Réponse `201 Created`

```json
{
  "id": "due-date-uuid",
  "invoice_id": "invoice-uuid",
  "tenant_id": "tenant-uuid",
  "patient_id": "patient-uuid",
  "fee_id": "fee-uuid",
  "amount": "500.00",
  "due_date": "2026-09-30",
  "paid_amount": "0.00",
  "remaining_amount": "500.00",
  "status": "A_VENIR",
  "comment": "Deuxième tranche",
  "guarantee_type": "NORMAL",
  "guarantor_name": null,
  "guarantor_cin": null,
  "guarantee_cheque_bank": null,
  "guarantee_cheque_number": null,
  "guarantee_cheque_issue_date": null,
  "guarantee_cheque_due_date": null,
  "created_by_user_id": "user-uuid",
  "updated_by_user_id": null,
  "created_at": "2026-07-31T21:30:00Z",
  "updated_at": "2026-07-31T21:30:00Z"
}
```

Le statut initial est calculé automatiquement : `A_VENIR`, `EN_ATTENTE` ou `EN_RETARD` selon la date. Il évolue ensuite vers `PARTIELLEMENT_PAYEE`, `PAYEE` ou `ANNULEE` selon les opérations financières.

## Exemple cURL

```bash
curl -X POST "http://127.0.0.1:8001/api/invoices/INVOICE_ID/echeances" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":"500.00","due_date":"2026-09-30","guarantee_type":"NORMAL"}'
```

## Erreurs

- `401` : jeton absent ou invalide.
- `403` : accès en écriture au module Paiements refusé.
- `404` : facture absente du cabinet actif.
- `422` : validation incorrecte ou somme des échéances supérieure au total facturé.

La documentation interactive est disponible dans Swagger à `/docs`.
