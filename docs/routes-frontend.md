# Routes frontend — FADAA Santé

Ce document décrit les routes d’interface. La référence des routes HTTP du backend se trouve dans [api-reference.md](./api-reference.md).

## Règles générales

- Frontend local : `http://localhost:5180`
- API locale : `http://localhost:8001/api`
- Les espaces protégés utilisent un JWT et un contrôle de rôle.
- Les espaces médecin et secrétaire appliquent aussi les modules inclus dans l’abonnement.
- Le secrétaire cumule les droits de l’abonnement et les permissions accordées par le médecin.
- Le patient n’est pas rattaché à un cabinet principal : il peut avoir des relations actives avec plusieurs cabinets.

## Routes publiques

| Route | Fonction |
|---|---|
| `/` | Vitrine FADAA Santé |
| `/tarifs` | Offres publiques administrées par le Super Admin |
| `/find-doctor` | Recherche publique d’un médecin |
| `/book-appointment` | Demande publique de rendez-vous |
| `/login` | Connexion commune avec redirection selon le rôle |
| `/register-doctor` | Création d’un cabinet et du compte médecin administrateur |
| `/activate-patient/:token` | Activation du compte patient et définition du mot de passe |
| `/activate-staff/:token` | Activation d’un compte secrétaire/responsable |
| `/auth/redirect` | Redirection vers l’espace correspondant au rôle |

## Espace médecin

Rôle : `MEDECIN_ADMIN`.

| Route | Module d’abonnement | Fonction |
|---|---|---|
| `/doctor/dashboard` | Tableau de bord | Synthèse du cabinet |
| `/doctor/appointments` | Rendez-vous | Agenda et gestion des rendez-vous |
| `/doctor/calendar` | Rendez-vous | Alias de l’agenda |
| `/doctor/schedule` | Rendez-vous | Horaires, pauses et indisponibilités |
| `/doctor/appointments/:id/history` | Rendez-vous | Historique d’un rendez-vous |
| `/doctor/patients` | Patients | Liste et création des patients |
| `/doctor/patients/:id` | Patients | Dossier patient |
| `/doctor/patients/:id/history` | Patients | Historique du parcours patient |
| `/doctor/visits` | Visites | Visites rattachées aux rendez-vous |
| `/doctor/honoraires` | Honoraires | Honoraires et facturation médicale |
| `/doctor/honoraires/:id` | Honoraires | Détail, TVA, paiements et RAP |
| `/doctor/payments` | Paiements | Paiements, échéances et reste à payer |
| `/doctor/reminders` | Relances | Relances des impayés |
| `/doctor/whatsapp/conversations` | WhatsApp | Conversations patients |
| `/doctor/whatsapp/templates` | WhatsApp | Modèles Meta |
| `/doctor/whatsapp/journal` | WhatsApp | Historique des envois |
| `/doctor/whatsapp/configuration` | WhatsApp | Configuration du numéro professionnel |
| `/doctor/cnss` | CNSS | Dossiers, documents et remboursements CNSS |
| `/doctor/prescriptions` | Ordonnances | Création, aperçu, PDF et archivage |
| `/doctor/documents` | Documents | Documents patients et scanner |
| `/doctor/staff` | Utilisateurs | Comptes, rôles et matrice CRUD |
| `/doctor/security/audit-logs` | Audit | Traçabilité des consultations et modifications |
| `/doctor/subscription` | Toujours accessible | Essai, offre, règlement et état de l’abonnement |
| `/doctor/support` | Toujours accessible | Échanges avec le Super Admin |
| `/doctor/support/:id` | Toujours accessible | Conversation d’un ticket |
| `/doctor/reviews` | Toujours accessible | Avis reçus |
| `/doctor/settings` | Toujours accessible | Configuration du cabinet |
| `/doctor/cabinet` | Toujours accessible | Alias de la configuration |

## Espace secrétaire/responsable

Rôle : `SECRETAIRE`. Les routes sont filtrées par abonnement et permissions CRUD.

| Route | Fonction |
|---|---|
| `/staff/dashboard` | Tableau de bord |
| `/staff/appointments` | Agenda |
| `/staff/calendar` | Alias de l’agenda |
| `/staff/appointments/:id/history` | Historique d’un rendez-vous |
| `/staff/patients` | Patients autorisés |
| `/staff/patients/:id/history` | Historique patient |
| `/staff/honoraires` | Honoraires |
| `/staff/honoraires/:id` | Détail d’un honoraire |
| `/staff/payments` | Paiements et RAP |
| `/staff/reminders` | Relances d’impayés |
| `/staff/cnss` | Dossiers CNSS |
| `/staff/documents` | Documents |
| `/staff/prescriptions` | Ordonnances |
| `/staff/team` | Gestion des utilisateurs si autorisée |
| `/staff/profile` | Profil de l’utilisateur |

## Espace patient

Rôle : `PATIENT`.

| Route | Fonction |
|---|---|
| `/patient/dashboard` | Tableau de bord et notifications |
| `/patient/find-doctor` | Recherche d’un médecin |
| `/patient/appointments` | Rendez-vous du patient |
| `/patient/appointments/request` | Nouvelle demande de rendez-vous |
| `/patient/visits` | Historique des visites |
| `/patient/documents` | Documents visibles pour le patient |
| `/patient/prescriptions` | Ordonnances |
| `/patient/cnss` | Dossiers CNSS |
| `/patient/payments` | Paiements, échéances et RAP |

## Console Super Admin

Rôles acceptés : `SUPER_ADMIN_IRMA`, `SUPER_ADMIN`, `platform_super_admin`.

Le Super Admin pilote la plateforme SaaS mais ne doit pas consulter les données médicales des cabinets.

| Route | Fonction |
|---|---|
| `/super-admin/dashboard` | Indicateurs SaaS non médicaux |
| `/super-admin/instances` | Cabinets et états des instances |
| `/super-admin/instances/:id` | Détail administratif d’une instance |
| `/super-admin/abonnements` | Abonnements et règlements SaaS |
| `/super-admin/subscription-plans` | Offres, prix et modules inclus |
| `/super-admin/support` | Tickets de support |
| `/super-admin/support/:id` | Conversation d’un ticket |
| `/super-admin/utilisateurs` | Comptes principaux de la plateforme |
| `/super-admin/whatsapp` | Pilotage technique WhatsApp |
| `/super-admin/evenements` | Événements publics |
| `/super-admin/backups` | Sauvegardes et tests de restauration |
| `/super-admin/logs` | Journaux techniques et d’administration |
| `/super-admin/settings` | Paramètres globaux |

## Modules contrôlés par l’abonnement

Codes utilisés dans `SubscriptionPlan.enabled_modules` :

`dashboard`, `appointments`, `patients`, `visits`, `fees`, `payments`, `reminders`, `whatsapp`, `cnss`, `prescriptions`, `documents`, `staff`, `audit`, `statistics`.

Un module non inclus est :

1. retiré des menus ;
2. bloqué par la garde de route frontend ;
3. bloqué par les contrôles API correspondants ;
4. remplacé par une page expliquant que l’offre ne l’inclut pas.

