# Référence complète des API — FADAA Santé

> Document généré automatiquement depuis le schéma OpenAPI réel de FastAPI. Ne modifiez pas manuellement l’inventaire des routes.

## Accès à l’API

| Environnement | URL |
|---|---|
| Développement | `http://localhost:8001/api` |
| Production | `https://<domaine-api>/api` |
| Swagger interactif | `http://localhost:8001/docs` |
| ReDoc | `http://localhost:8001/redoc` |
| Schéma OpenAPI | `http://localhost:8001/openapi.json` |

En production, HTTPS est obligatoire. Le domaine exact est fourni par la configuration de déploiement.

## Authentification et isolation des cabinets

Les routes protégées utilisent un jeton JWT :

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

Le `tenant_id` est déduit de l’utilisateur authentifié. Un client ne doit jamais tenter de choisir le cabinet d’une ressource protégée.

## Exemple de requête HTTPS

```bash
curl -X POST 'https://<domaine-api>/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"medecin@example.com","password":"mot-de-passe","role":"MEDECIN_ADMIN"}'
```

## Préparer les tests avec curl

```bash
export BASE_URL='http://localhost:8001'
export ACCESS_TOKEN='<collez_access_token_retourné_par_login>'
```

Les exemples générés utilisent des valeurs indicatives. Remplacez les identifiants UUID, dates, e-mails et fichiers par des valeurs existantes dans votre environnement de test.

## Inventaire (358 opérations HTTP)

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Health Check |
| `GET` | `/api/db-check` | Database Check |
| `GET` | `/api/public/cabinets/{cabinet_slug}/seo` | Public Cabinet Seo |
| `GET` | `/api/public/doctors` | Public Doctors |
| `GET` | `/api/public/doctors/{doctor_id}/logo` | Public Doctor Logo |
| `GET` | `/api/public/doctors/{doctor_id}/availability` | Public Doctor Availability |
| `POST` | `/api/public/appointments` | Public Appointment |
| `GET` | `/api/patient/doctors/{doctor_id}/reviews` | Patient Doctor Reviews |
| `POST` | `/api/patient/doctors/{doctor_id}/reviews` | Create Doctor Review |
| `GET` | `/api/patient/reviews` | Patient Reviews |
| `PUT` | `/api/patient/reviews/{review_id}` | Patient Review Update |
| `GET` | `/api/doctor/reviews` | Doctor Reviews |
| `POST` | `/api/auth/register-doctor` | Register Doctor |
| `POST` | `/api/auth/register-patient` | Patient Signup |
| `GET` | `/api/auth/staff-activation` | Auth Staff Activation Info |
| `POST` | `/api/auth/staff-activation` | Auth Staff Activate |
| `GET` | `/api/auth/patient-activation` | Auth Patient Activation Info |
| `POST` | `/api/auth/patient-activation` | Auth Patient Activate |
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/refresh` | Refresh |
| `POST` | `/api/auth/logout` | Logout |
| `POST` | `/api/auth/logout-all` | Logout All |
| `GET` | `/api/auth/me` | Auth Me |
| `GET` | `/api/doctor/dashboard` | Doctor Dashboard |
| `GET` | `/api/doctor/cabinet` | Doctor Cabinet |
| `PUT` | `/api/doctor/cabinet` | Doctor Cabinet Update |
| `GET` | `/api/doctor/cabinet/logo` | Doctor Cabinet Logo Get |
| `POST` | `/api/doctor/cabinet/logo` | Doctor Cabinet Logo |
| `GET` | `/api/medecin/statistics` | Medecin Statistics |
| `GET` | `/api/staff/dashboard` | Staff Dashboard |
| `GET` | `/api/doctor/patient-settings` | Doctor Patient Settings |
| `PUT` | `/api/doctor/patient-settings` | Doctor Patient Settings Update |
| `GET` | `/api/doctor/reminder-settings` | Reminder Settings Get |
| `PUT` | `/api/doctor/reminder-settings` | Reminder Settings Update |
| `GET` | `/api/doctor/subscription` | Doctor Subscription |
| `GET` | `/api/cabinet/modules` | Cabinet Modules |
| `POST` | `/api/doctor/subscription/select-plan` | Doctor Subscription Select Plan |
| `POST` | `/api/doctor/subscription/pay` | Doctor Subscription Pay |
| `GET` | `/api/doctor/subscription/payments` | Doctor Subscription Payments |
| `POST` | `/api/doctor/subscription/cancel-renewal` | Doctor Subscription Cancel Renewal |
| `GET` | `/api/patient/dashboard` | Patient Dashboard |
| `GET` | `/api/patient/profile` | Patient Profile |
| `PUT` | `/api/patient/profile` | Patient Profile Update |
| `PUT` | `/api/patient/change-password` | Patient Password |
| `GET` | `/api/patient/appointments` | Patient Appointments |
| `GET` | `/api/patient/appointments/{item_id}` | Patient Appointment |
| `GET` | `/api/patient/appointments/{item_id}/qr` | Patient Appointment Qr |
| `POST` | `/api/patient/appointments/request` | Patient Appointment Request |
| `PUT` | `/api/patient/appointments/{item_id}/confirm` | Patient Appointment Confirm |
| `PUT` | `/api/patient/appointments/{item_id}/cancel` | Patient Appointment Cancel |
| `GET` | `/api/patient/visits` | Patient Visits |
| `GET` | `/api/patient/visits/{item_id}` | Patient Visit |
| `GET` | `/api/patient/documents` | Patient Documents |
| `GET` | `/api/patient/documents/{item_id}` | Patient Document |
| `GET` | `/api/patient/documents/{item_id}/download` | Patient Document Download |
| `GET` | `/api/patient/prescriptions` | Patient Prescriptions |
| `GET` | `/api/patient/prescriptions/{item_id}` | Patient Prescription |
| `GET` | `/api/patient/prescriptions/{item_id}/pdf` | Patient Prescription Pdf |
| `GET` | `/api/patient/cnss` | Patient Cnss |
| `POST` | `/api/patient/cnss` | Patient Cnss Create |
| `GET` | `/api/patient/cnss/{item_id}` | Patient Cnss Item |
| `GET` | `/api/patient/cnss/{item_id}/detail` | Patient Cnss Detail |
| `PATCH` | `/api/patient/cnss/{item_id}/action` | Patient Cnss Action |
| `POST` | `/api/patient/cnss/{item_id}/documents` | Patient Cnss Document Add |
| `GET` | `/api/patient/notifications` | Patient Notifications |
| `PATCH` | `/api/patient/notifications/read-all` | Patient Notifications Read All |
| `PATCH` | `/api/patient/notifications/{item_id}/read` | Patient Notification Read |
| `GET` | `/api/patient/payments` | Patient Payments |
| `GET` | `/api/patient/honoraires` | Patient Honoraires |
| `GET` | `/api/patient/receipts/{item_id}/download` | Patient Receipt |
| `GET` | `/api/staff/me/permissions` | Staff My Permissions |
| `GET` | `/api/payment-reminders/summary` | Payment Reminder Summary |
| `GET` | `/api/payment-reminders/{patient_id}` | Payment Reminder History |
| `POST` | `/api/payment-reminders` | Payment Reminder Create |
| `POST` | `/api/payment-reminders/bulk` | Payment Reminder Bulk |
| `GET` | `/api/doctor/support-tickets` | Doctor Support Tickets |
| `POST` | `/api/doctor/support-tickets` | Doctor Support Create |
| `POST` | `/api/doctor/support-tickets/{item_id}/reply` | Doctor Support Reply |
| `GET` | `/api/doctor/notifications` | Doctor Notifications |
| `PATCH` | `/api/doctor/notifications/read-all` | Doctor Notifications Read All |
| `PATCH` | `/api/doctor/notifications/{item_id}/read` | Doctor Notification Read |
| `GET` | `/api/doctor/schedule` | Doctor Schedule |
| `PUT` | `/api/doctor/schedule` | Doctor Schedule Update |
| `GET` | `/api/doctor/time-offs` | Doctor Time Offs |
| `POST` | `/api/doctor/time-offs` | Doctor Time Off Create |
| `DELETE` | `/api/doctor/time-offs/{item_id}` | Doctor Time Off Delete |
| `GET` | `/api/doctor/blocked-slots` | Doctor Blocked Slots |
| `POST` | `/api/doctor/blocked-slots` | Doctor Blocked Slot Create |
| `DELETE` | `/api/doctor/blocked-slots/{item_id}` | Doctor Blocked Slot Delete |
| `GET` | `/api/super-admin/dashboard` | Admin Dashboard |
| `GET` | `/api/super-admin/instances/expiring-soon` | Admin Tenants Expiring |
| `GET` | `/api/super-admin/instances/status-summary` | Admin Tenants Summary |
| `POST` | `/api/super-admin/instances/check-expiration` | Admin Check Expiration |
| `GET` | `/api/super-admin/instances` | Admin Tenants |
| `GET` | `/api/super-admin/instances/{tenant_id}` | Admin Tenant Detail |
| `PUT` | `/api/super-admin/instances/{tenant_id}` | Admin Tenant Update |
| `PUT` | `/api/super-admin/instances/{tenant_id}/status` | Admin Tenant Status |
| `PATCH` | `/api/super-admin/instances/{tenant_id}/activate` | Super Admin Instance Activate |
| `PATCH` | `/api/super-admin/instances/{tenant_id}/suspend` | Super Admin Instance Suspend |
| `PATCH` | `/api/super-admin/instances/{tenant_id}/extend-trial` | Super Admin Instance Extend |
| `GET` | `/api/super-admin/subscriptions` | Admin Subscriptions |
| `POST` | `/api/super-admin/subscriptions` | Super Admin Subscription Create |
| `GET` | `/api/super-admin/subscriptions/{item_id}` | Admin Subscription |
| `PUT` | `/api/super-admin/subscriptions/{item_id}` | Admin Subscription Update |
| `POST` | `/api/super-admin/subscriptions/{item_id}/activate` | Admin Subscription Activate |
| `POST` | `/api/super-admin/subscriptions/{item_id}/cancel` | Admin Subscription Cancel |
| `PATCH` | `/api/super-admin/subscriptions/{item_id}/renew` | Super Admin Subscription Renew |
| `GET` | `/api/super-admin/support-tickets` | Admin Support Tickets |
| `GET` | `/api/super-admin/support-tickets/{item_id}` | Admin Support Ticket |
| `PUT` | `/api/super-admin/support-tickets/{item_id}` | Admin Support Update |
| `POST` | `/api/super-admin/support-tickets/{item_id}/reply` | Admin Support Reply |
| `POST` | `/api/super-admin/support-tickets/{item_id}/close` | Admin Support Close |
| `GET` | `/api/super-admin/audit-logs` | Admin System Logs |
| `GET` | `/api/super-admin/backups` | Super Admin Backups |
| `POST` | `/api/super-admin/backups` | Super Admin Backup Create |
| `GET` | `/api/super-admin/restores` | Super Admin Restores |
| `POST` | `/api/super-admin/backups/{backup_id}/test-restore` | Super Admin Backup Test |
| `GET` | `/api/super-admin/backups/{backup_id}/download` | Super Admin Backup Download |
| `GET` | `/api/super-admin/analytics` | Admin Analytics |
| `GET` | `/api/public/subscription-plans` | Public Subscription Plans |
| `GET` | `/api/public/subscription-plans/{slug}` | Public Subscription Plan |
| `GET` | `/api/super-admin/subscription-plans` | Super Admin Subscription Plans |
| `POST` | `/api/super-admin/subscription-plans` | Super Admin Subscription Plan Create |
| `PATCH` | `/api/super-admin/subscription-plans/{item_id}` | Super Admin Subscription Plan Patch |
| `DELETE` | `/api/super-admin/subscription-plans/{item_id}` | Super Admin Subscription Plan Disable |
| `GET` | `/api/super-admin/subscription-payments` | Super Admin Subscription Payments |
| `PATCH` | `/api/super-admin/subscription-payments/{item_id}/validate` | Super Admin Subscription Payment Validate |
| `PATCH` | `/api/super-admin/subscription-payments/{item_id}/reject` | Super Admin Subscription Payment Reject |
| `GET` | `/api/super-admin/users` | Super Admin Users |
| `PUT` | `/api/super-admin/users/{item_id}/activate` | Super Admin User Activate |
| `PUT` | `/api/super-admin/users/{item_id}/disable` | Super Admin User Disable |
| `GET` | `/api/super-admin/settings` | Super Admin Settings |
| `PUT` | `/api/super-admin/settings` | Super Admin Settings Update |
| `GET` | `/api/public/events` | Public Events |
| `GET` | `/api/public/blog` | Public Blog |
| `GET` | `/api/public/media/{asset_id}` | Public Media Image |
| `GET` | `/api/public/blog/gallery/{image_id}` | Public Blog Gallery Image |
| `GET` | `/api/public/blog/{slug}` | Public Blog Detail |
| `GET` | `/api/public/events/gallery/{image_id}` | Public Event Gallery Image |
| `POST` | `/api/public/events/{event_id}/registrations` | Public Event Registration |
| `GET` | `/api/public/events/{slug_or_id}` | Public Event Detail |
| `GET` | `/api/super-admin/events` | Super Admin Events |
| `POST` | `/api/super-admin/events` | Super Admin Event Create |
| `GET` | `/api/super-admin/blog` | Super Admin Blog |
| `POST` | `/api/super-admin/blog` | Super Admin Blog Create |
| `PUT` | `/api/super-admin/blog/{item_id}` | Super Admin Blog Update |
| `DELETE` | `/api/super-admin/blog/{item_id}` | Super Admin Blog Archive |
| `GET` | `/api/super-admin/media` | Super Admin Media List |
| `POST` | `/api/super-admin/media` | Super Admin Media Upload |
| `DELETE` | `/api/super-admin/media/{asset_id}` | Super Admin Media Archive |
| `POST` | `/api/super-admin/blog/{post_id}/gallery/from-media` | Super Admin Blog Gallery From Media |
| `POST` | `/api/super-admin/blog/{post_id}/gallery` | Super Admin Blog Gallery Add |
| `DELETE` | `/api/super-admin/blog/{post_id}/gallery/{image_id}` | Super Admin Blog Gallery Delete |
| `GET` | `/api/super-admin/events/{event_id}/registrations` | Super Admin Event Registrations |
| `PUT` | `/api/super-admin/events/{item_id}` | Super Admin Event Update |
| `DELETE` | `/api/super-admin/events/{item_id}` | Super Admin Event Cancel |
| `POST` | `/api/super-admin/events/{event_id}/gallery/from-media` | Super Admin Event Gallery From Media |
| `POST` | `/api/super-admin/events/{event_id}/gallery` | Super Admin Event Gallery Add |
| `DELETE` | `/api/super-admin/events/{event_id}/gallery/{image_id}` | Super Admin Event Gallery Delete |
| `GET` | `/api/users` | Users List |
| `POST` | `/api/users` | Users Create |
| `GET` | `/api/users/{user_id}` | Users Get |
| `PUT` | `/api/users/{user_id}` | Users Update |
| `DELETE` | `/api/users/{user_id}` | Users Delete |
| `POST` | `/api/users/{user_id}/resend-invitation` | Staff Invitation Resend |
| `GET` | `/api/patients` | Patients List |
| `POST` | `/api/patients` | Patients Create |
| `GET` | `/api/patients/{patient_id}` | Patients Get |
| `PUT` | `/api/patients/{patient_id}` | Patients Update |
| `DELETE` | `/api/patients/{patient_id}` | Patients Delete |
| `GET` | `/api/patients/{patient_id}/medical-summary` | Patient Medical Summary Get |
| `PUT` | `/api/patients/{patient_id}/medical-summary` | Patient Medical Summary Update |
| `GET` | `/api/patients/{patient_id}/report/{file_format}` | Patient Consolidated Report |
| `GET` | `/api/patients/{patient_id}/overview` | Patient Overview |
| `GET` | `/api/appointments` | Appointments List |
| `POST` | `/api/appointments` | Appointments Create |
| `POST` | `/api/appointments/qr/resolve` | Appointments Qr Resolve |
| `POST` | `/api/appointments/qr/confirm` | Appointments Qr Confirm |
| `GET` | `/api/appointments/{appointment_id}` | Appointments Get |
| `PUT` | `/api/appointments/{appointment_id}` | Appointments Update |
| `DELETE` | `/api/appointments/{appointment_id}` | Appointments Delete |
| `GET` | `/api/appointments/{appointment_id}/details` | Contexte opérationnel complet d’un rendez-vous |
| `PATCH` | `/api/appointments/{appointment_id}/status` | Appointments Status |
| `GET` | `/api/appointments/{appointment_id}/preparation` | Appointment Preparation Get |
| `PUT` | `/api/appointments/{appointment_id}/preparation` | Appointment Preparation Update |
| `POST` | `/api/appointments/{appointment_id}/preparation/validate` | Appointment Preparation Validate |
| `POST` | `/api/appointments/{appointment_id}/mark-arrived` | Appointments Mark Arrived |
| `POST` | `/api/appointments/{appointment_id}/start` | Appointments Start |
| `POST` | `/api/appointments/{appointment_id}/end` | Appointments End |
| `POST` | `/api/appointments/{appointment_id}/mark-absent` | Appointments Mark Absent |
| `POST` | `/api/appointments/{appointment_id}/cancel` | Appointments Cancel |
| `GET` | `/api/history` | History List |
| `GET` | `/api/appointments/{appointment_id}/history` | Appointment History |
| `GET` | `/api/patients/{patient_id}/appointment-history` | Patient Appointment History |
| `GET` | `/api/history/honoraire/{fee_id}` | Fee History |
| `GET` | `/api/security/audit-logs` | Medical Audit Logs |
| `GET` | `/api/patients/{patient_id}/access-logs` | Patient Access Logs |
| `GET` | `/api/security/audit-logs/users/{user_id}` | Medical Audit User Logs |
| `GET` | `/api/security/audit-logs/export` | Medical Audit Export |
| `GET` | `/api/invoices` | Invoices List |
| `POST` | `/api/invoices` | Invoices Create |
| `POST` | `/api/invoices/from-honoraire/{fee_id}` | Invoices From Fee |
| `GET` | `/api/invoices/{invoice_id}` | Invoices Get |
| `GET` | `/api/invoices/{invoice_id}/pdf` | Afficher ou télécharger une facture PDF authentifiée |
| `POST` | `/api/invoices/{invoice_id}/cancel` | Invoices Cancel |
| `GET` | `/api/invoices/{invoice_id}/echeances` | Invoice Due Dates |
| `POST` | `/api/invoices/{invoice_id}/echeances` | Créer une échéance de paiement |
| `GET` | `/api/echeances` | Due Dates List |
| `GET` | `/api/echeances/{item_id}` | Due Date Get |
| `PUT` | `/api/echeances/{item_id}` | Invoice Due Date Update |
| `POST` | `/api/echeances/{item_id}/cancel` | Invoice Due Date Cancel |
| `GET` | `/api/echeances/{item_id}/documents` | Due Date Documents List |
| `POST` | `/api/echeances/{item_id}/documents` | Due Date Document Create |
| `GET` | `/api/documents-echeance/{document_id}/download` | Due Date Document Download |
| `GET` | `/api/documents-echeance/{document_id}/preview` | Due Date Document Preview |
| `DELETE` | `/api/documents-echeance/{document_id}` | Due Date Document Delete |
| `GET` | `/api/payment-methods` | Payment Methods List |
| `POST` | `/api/payment-methods` | Payment Methods Create |
| `PUT` | `/api/payment-methods/{item_id}` | Payment Methods Update |
| `GET` | `/api/bank-accounts` | Bank Accounts List |
| `POST` | `/api/bank-accounts` | Bank Accounts Create |
| `PUT` | `/api/bank-accounts/{item_id}` | Bank Accounts Update |
| `GET` | `/api/visits` | Visits List |
| `POST` | `/api/visits` | Visits Create |
| `POST` | `/api/visits/from-appointment/{appointment_id}` | Visits From Appointment |
| `GET` | `/api/visits/{visit_id}` | Visits Get |
| `PUT` | `/api/visits/{visit_id}` | Visits Update |
| `DELETE` | `/api/visits/{visit_id}` | Visits Delete |
| `GET` | `/api/honoraires` | Honoraires List |
| `POST` | `/api/honoraires` | Honoraires Create |
| `GET` | `/api/honoraires/{fee_id}` | Honoraires Get |
| `PUT` | `/api/honoraires/{fee_id}` | Honoraires Update |
| `DELETE` | `/api/honoraires/{fee_id}` | Honoraires Delete |
| `GET` | `/api/doctor/fee-settings` | Fee Settings Get |
| `PUT` | `/api/doctor/fee-settings` | Fee Settings Update |
| `GET` | `/api/doctor/payment-settings` | Payment Settings Get |
| `PUT` | `/api/doctor/payment-settings` | Payment Settings Update |
| `POST` | `/api/honoraires/{fee_id}/rendez-vous/{appointment_id}` | Honoraires Link Appointment |
| `DELETE` | `/api/honoraires/{fee_id}/rendez-vous/{appointment_id}` | Honoraires Unlink Appointment |
| `POST` | `/api/honoraires/{fee_id}/visites/{visit_id}` | Honoraires Link Visit |
| `DELETE` | `/api/honoraires/{fee_id}/visites/{visit_id}` | Honoraires Unlink Visit |
| `GET` | `/api/honoraires/{fee_id}/paiements` | Honoraires Payments |
| `POST` | `/api/honoraires/{fee_id}/paiements` | Honoraires Add Payment |
| `GET` | `/api/honoraires/{fee_id}/resume` | Honoraires Summary |
| `GET` | `/api/patients/{patient_id}/situation-financiere` | Patient Financial Situation |
| `GET` | `/api/payments` | Payments List |
| `POST` | `/api/payments` | Payments Create |
| `POST` | `/api/payments/{payment_id}/cheque-documents` | Payment Cheque Documents Upload |
| `GET` | `/api/payments/{payment_id}/cheque-documents/{document_type}/preview` | Payment Cheque Document Preview |
| `GET` | `/api/payments/{payment_id}` | Payments Get |
| `PUT` | `/api/payments/{payment_id}` | Payments Update |
| `DELETE` | `/api/payments/{payment_id}` | Payments Delete |
| `GET` | `/api/finance/reports/monthly/{file_format}` | Finance Monthly Report |
| `GET` | `/api/expense-suppliers` | Expense Suppliers List |
| `POST` | `/api/expense-suppliers` | Expense Suppliers Create |
| `GET` | `/api/supplier-products` | Supplier Products List |
| `POST` | `/api/supplier-products` | Supplier Products Create |
| `GET` | `/api/expenses` | Expenses List |
| `POST` | `/api/expenses` | Expenses Create |
| `PUT` | `/api/expenses/{item_id}` | Expenses Update |
| `DELETE` | `/api/expenses/{item_id}` | Expenses Delete |
| `GET` | `/api/purchase-orders` | Purchase Orders List |
| `POST` | `/api/purchase-orders` | Purchase Orders Create |
| `PUT` | `/api/purchase-orders/{item_id}` | Purchase Orders Update |
| `DELETE` | `/api/purchase-orders/{item_id}` | Purchase Orders Delete |
| `GET` | `/api/paiements/{payment_id}/documents` | Payment Documents List |
| `POST` | `/api/paiements/{payment_id}/documents` | Payment Documents Create |
| `GET` | `/api/documents-paiement/{document_id}/download` | Payment Document Download |
| `GET` | `/api/documents-paiement/{document_id}/preview` | Payment Document Preview |
| `GET` | `/api/cnss` | Cnss List |
| `POST` | `/api/cnss` | Cnss Create |
| `POST` | `/api/cnss/upload` | Cnss Upload |
| `GET` | `/api/cnss/stats` | Cnss Stats |
| `GET` | `/api/cnss/{cnss_id}/history` | Cnss History |
| `GET` | `/api/cnss/{cnss_id}/documents` | Cnss Documents |
| `POST` | `/api/cnss/{cnss_id}/documents` | Cnss Document Add |
| `PATCH` | `/api/cnss/{cnss_id}/status` | Cnss Status Update |
| `GET` | `/api/cnss/{cnss_id}` | Cnss Get |
| `PUT` | `/api/cnss/{cnss_id}` | Cnss Update |
| `DELETE` | `/api/cnss/{cnss_id}` | Cnss Delete |
| `GET` | `/api/cnss/{cnss_id}/download` | Cnss Download |
| `GET` | `/api/medications/catalog/specialties` | Medications Specialties |
| `GET` | `/api/medications/catalog` | Medications Catalog |
| `GET` | `/api/prescriptions` | Prescriptions List |
| `POST` | `/api/prescriptions` | Prescriptions Create |
| `GET` | `/api/prescriptions/{prescription_id}` | Prescriptions Get |
| `PUT` | `/api/prescriptions/{prescription_id}` | Prescriptions Update |
| `DELETE` | `/api/prescriptions/{prescription_id}` | Prescriptions Delete |
| `GET` | `/api/prescriptions/{prescription_id}/pdf` | Prescriptions Pdf |
| `DELETE` | `/api/cnss/{cnss_id}/documents/{document_id}` | Cnss Document Delete |
| `GET` | `/api/cnss/{cnss_id}/documents/{document_id}/preview` | Cnss Document Preview |
| `GET` | `/api/cnss/{cnss_id}/documents/{document_id}/download` | Cnss Document Download |
| `GET` | `/api/doctor/patients/{patient_id}/documents` | Patient Documents List |
| `POST` | `/api/doctor/patients/{patient_id}/documents` | Patient Document Upload |
| `POST` | `/api/doctor/patients/{patient_id}/documents/scan` | Patient Document Scan |
| `GET` | `/api/documents` | Documents List |
| `GET` | `/api/doctor/documents` | Documents List |
| `GET` | `/api/doctor/documents/categories` | Document Categories List |
| `POST` | `/api/doctor/documents/categories` | Document Categories Create |
| `GET` | `/api/doctor/documents/{document_id}` | Documents Get |
| `PUT` | `/api/doctor/documents/{document_id}` | Documents Update |
| `DELETE` | `/api/doctor/documents/{document_id}` | Documents Delete |
| `POST` | `/api/doctor/documents/{document_id}/restore` | Documents Restore |
| `POST` | `/api/doctor/documents/{document_id}/versions` | Document New Version |
| `GET` | `/api/doctor/documents/{document_id}/history` | Document History |
| `GET` | `/api/doctor/documents/{document_id}/download` | Documents Download |
| `GET` | `/api/doctor/documents/{document_id}/preview` | Documents Preview |
| `GET` | `/api/users/{staff_id}/permissions` | Staff Permissions Get |
| `PUT` | `/api/users/{staff_id}/permissions` | Staff Permissions Update |
| `GET` | `/api/whatsapp/configuration` | Configuration Get |
| `POST` | `/api/whatsapp/configuration` | Configuration Save |
| `PUT` | `/api/whatsapp/configuration` | Configuration Save |
| `PATCH` | `/api/whatsapp/configuration` | Configuration Save |
| `POST` | `/api/whatsapp/test-connection` | Connection Test |
| `POST` | `/api/whatsapp/disable` | Configuration Disable |
| `GET` | `/api/super-admin/whatsapp/configuration` | Platform Configuration Get |
| `POST` | `/api/super-admin/whatsapp/configuration` | Platform Configuration Save |
| `PUT` | `/api/super-admin/whatsapp/configuration` | Platform Configuration Save |
| `PATCH` | `/api/super-admin/whatsapp/configuration` | Platform Configuration Save |
| `POST` | `/api/super-admin/whatsapp/webhook-setup` | Platform Webhook Setup |
| `POST` | `/api/super-admin/whatsapp/test-connection` | Platform Connection Test |
| `GET` | `/api/whatsapp/templates` | Templates List |
| `POST` | `/api/whatsapp/templates` | Templates Create |
| `PATCH` | `/api/whatsapp/templates/{item_id}` | Templates Update |
| `DELETE` | `/api/whatsapp/templates/{item_id}` | Templates Delete |
| `POST` | `/api/whatsapp/templates/{item_id}/submit` | Templates Submit |
| `POST` | `/api/whatsapp/templates/{item_id}/sync` | Templates Sync |
| `GET` | `/api/whatsapp/messages` | Messages List |
| `GET` | `/api/patients/{patient_id}/whatsapp/messages` | Patient Messages |
| `GET` | `/api/patients/{patient_id}/whatsapp-consent` | Patient Whatsapp Consent |
| `POST` | `/api/patients/{patient_id}/whatsapp-consent/accept` | Patient Whatsapp Consent Grant |
| `POST` | `/api/patients/{patient_id}/whatsapp-consent/grant` | Patient Whatsapp Consent Grant |
| `POST` | `/api/patients/{patient_id}/whatsapp-consent/refuse` | Patient Whatsapp Consent Refuse |
| `POST` | `/api/patients/{patient_id}/whatsapp-consent/withdraw` | Patient Whatsapp Consent Withdraw |
| `PATCH` | `/api/patients/{patient_id}/whatsapp-consent/preferences` | Patient Whatsapp Consent Preferences |
| `GET` | `/api/patients/{patient_id}/whatsapp-consent/history` | Patient Whatsapp Consent History |
| `GET` | `/api/whatsapp/consents` | Whatsapp Consents |
| `GET` | `/api/patient/me/whatsapp-consent` | My Whatsapp Consent |
| `POST` | `/api/patient/me/whatsapp-consent/accept` | My Whatsapp Consent Accept |
| `POST` | `/api/patient/me/whatsapp-consent/refuse` | My Whatsapp Consent Refuse |
| `POST` | `/api/patient/me/whatsapp-consent/withdraw` | My Whatsapp Consent Withdraw |
| `PATCH` | `/api/patient/me/whatsapp-consent/preferences` | My Whatsapp Consent Preferences |
| `GET` | `/api/patient/me/whatsapp-consent/history` | My Whatsapp Consent History |
| `POST` | `/api/rendez-vous/{item_id}/send-whatsapp-reminder` | Appointment Reminder |
| `POST` | `/api/honoraires/{item_id}/send-payment-reminder` | Fee Reminder |
| `POST` | `/api/patients/{patient_id}/send-whatsapp-payment-reminder` | Patient Payment Reminder |
| `POST` | `/api/whatsapp/messages/{item_id}/retry` | Retry Message |
| `GET` | `/api/whatsapp/conversations` | Conversations List |
| `POST` | `/api/whatsapp/conversations/patient/{patient_id}` | Conversation Create |
| `GET` | `/api/whatsapp/conversations/{conversation_id}/messages` | Conversation Messages |
| `POST` | `/api/whatsapp/conversations/{conversation_id}/messages` | Conversation Send |
| `PUT` | `/api/whatsapp/conversations/{conversation_id}` | Conversation Update |
| `PATCH` | `/api/whatsapp/conversations/{conversation_id}` | Conversation Update |
| `GET` | `/api/whatsapp/unknown-numbers` | Unknown Numbers |
| `POST` | `/api/whatsapp/unknown-numbers/{item_id}/link/{patient_id}` | Unknown Link |
| `GET` | `/api/webhooks/whatsapp` | Webhook Verify |
| `POST` | `/api/webhooks/whatsapp` | Webhook Receive |
| `GET` | `/` | Root |

## Détail des routes

### `GET /api/health`

Health Check

- Authentification : publique ou contrôlée par la route

Requête de test :

```bash
curl -X GET "$BASE_URL/api/health"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | HealthResponse |

---

### `GET /api/db-check`

Database Check

- Authentification : publique ou contrôlée par la route

Requête de test :

```bash
curl -X GET "$BASE_URL/api/db-check"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Database Check Api Db Check Get |

---

### `GET /api/public/cabinets/{cabinet_slug}/seo`

Public Cabinet Seo

- Authentification : publique ou contrôlée par la route

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `cabinet_slug` | path | Cabinet Slug | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/public/cabinets/string/seo"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Public Cabinet Seo Api Public Cabinets  Cabinet Slug  Seo Get |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/public/doctors`

Public Doctors

- Authentification : publique ou contrôlée par la route

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `cabinet_slug` | query | Cabinet Slug | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/public/doctors?cabinet_slug=string"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de object |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/public/doctors/{doctor_id}/logo`

Public Doctor Logo

- Authentification : publique ou contrôlée par la route

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `doctor_id` | path | Doctor Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/public/doctors/string/logo"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/public/doctors/{doctor_id}/availability`

Public Doctor Availability

- Authentification : publique ou contrôlée par la route

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `doctor_id` | path | Doctor Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/public/doctors/string/availability"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de object |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/public/appointments`

Public Appointment

- Authentification : publique ou contrôlée par la route

Corps de requête — `application/json` (PublicAppointmentCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `doctor_id` | Doctor Id | oui | — | `string` |
| `first_name` | First Name | oui | — | `string` |
| `last_name` | Last Name | oui | — | `string` |
| `email` | Email | oui | — | `utilisateur@example.com` |
| `phone` | Phone | oui | — | `string` |
| `birth_date` | Birth Date | oui | — | `2026-07-21` |
| `gender` | Gender | oui | — | `M` |
| `whatsapp_opt_in` | Whatsapp Opt In | oui | — | `False` |
| `date` | Date | oui | — | `2026-07-21` |
| `start_time` | Start Time | oui | — | `string` |
| `end_time` | End Time ou null | non | — | `string` |
| `reason` | Reason ou null | non | — | `string` |

```json
{
  "doctor_id": "string",
  "first_name": "string",
  "last_name": "string",
  "email": "utilisateur@example.com",
  "phone": "string",
  "birth_date": "2026-07-21",
  "gender": "M",
  "whatsapp_opt_in": false,
  "date": "2026-07-21",
  "start_time": "string",
  "end_time": "string",
  "reason": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/public/appointments" \
  -H "Content-Type: application/json" \
  --data-raw '{"doctor_id":"string","first_name":"string","last_name":"string","email":"utilisateur@example.com","phone":"string","birth_date":"2026-07-21","gender":"M","whatsapp_opt_in":false,"date":"2026-07-21","start_time":"string","end_time":"string","reason":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | Response Public Appointment Api Public Appointments Post |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/doctors/{doctor_id}/reviews`

Patient Doctor Reviews

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `doctor_id` | path | Doctor Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/doctors/string/reviews" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/patient/doctors/{doctor_id}/reviews`

Create Doctor Review

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `doctor_id` | path | Doctor Id | oui |

Corps de requête — `application/json` (DoctorReviewCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `rating` | Rating | oui | — | `1.0` |
| `comment` | Comment | oui | — | `string` |

```json
{
  "rating": 1.0,
  "comment": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/patient/doctors/string/reviews" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"rating":1.0,"comment":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | Response Create Doctor Review Api Patient Doctors  Doctor Id  Reviews Post |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/reviews`

Patient Reviews

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/reviews" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `PUT /api/patient/reviews/{review_id}`

Patient Review Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `review_id` | path | Review Id | oui |

Corps de requête — `application/json` (DoctorReviewCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `rating` | Rating | oui | — | `1.0` |
| `comment` | Comment | oui | — | `string` |

```json
{
  "rating": 1.0,
  "comment": "string"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/patient/reviews/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"rating":1.0,"comment":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/reviews`

Doctor Reviews

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/reviews" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `POST /api/auth/register-doctor`

Register Doctor

- Authentification : publique ou contrôlée par la route

Corps de requête — `application/json` (SignupRequest) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `first_name` | First Name | oui | — | `string` |
| `last_name` | Last Name | oui | — | `string` |
| `specialty` | Specialty | oui | — | `string` |
| `address` | Address | oui | — | `string` |
| `city` | City | oui | — | `string` |
| `phone` | Phone | oui | — | `string` |
| `cabinet_phone` | Cabinet Phone ou null | non | — | `string` |
| `email` | Email | oui | — | `utilisateur@example.com` |
| `cabinet_name` | Cabinet Name | oui | — | `string` |
| `instance_slug` | Instance Slug ou null | non | — | `string` |
| `plan_slug` | Plan Slug ou null | non | — | `string` |
| `primary_color` | Primary Color | non | — | `#0f766e` |
| `logo_url` | Logo Url ou null | non | — | `string` |
| `admin_username` | Admin Username | oui | — | `utilisateur@example.com` |
| `password` | Password | oui | — | `string` |
| `password_confirmation` | Password Confirmation ou null | non | — | `string` |
| `initial_role` | Initial Role | non | — | `doctor_admin` |
| `accept_terms` | Accept Terms | oui | — | `False` |
| `accept_privacy` | Accept Privacy | non | — | `True` |
| `working_days` | liste de integer | non | — | `[0]` |
| `work_start_time` | Work Start Time | non | — | `09:00` |
| `work_end_time` | Work End Time | non | — | `17:00` |
| `break_start_time` | Break Start Time ou null | non | — | `12:30` |
| `break_end_time` | Break End Time ou null | non | — | `13:30` |
| `consultation_duration_minutes` | Consultation Duration Minutes | non | — | `30` |

```json
{
  "first_name": "string",
  "last_name": "string",
  "specialty": "string",
  "address": "string",
  "city": "string",
  "phone": "string",
  "cabinet_phone": "string",
  "email": "utilisateur@example.com",
  "cabinet_name": "string",
  "instance_slug": "string",
  "plan_slug": "string",
  "primary_color": "#0f766e",
  "logo_url": "string",
  "admin_username": "utilisateur@example.com",
  "password": "string",
  "password_confirmation": "string",
  "initial_role": "doctor_admin",
  "accept_terms": false,
  "accept_privacy": true,
  "working_days": [
    0
  ],
  "work_start_time": "09:00",
  "work_end_time": "17:00",
  "break_start_time": "12:30",
  "break_end_time": "13:30",
  "consultation_duration_minutes": 30
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/auth/register-doctor" \
  -H "Content-Type: application/json" \
  --data-raw '{"first_name":"string","last_name":"string","specialty":"string","address":"string","city":"string","phone":"string","cabinet_phone":"string","email":"utilisateur@example.com","cabinet_name":"string","instance_slug":"string","plan_slug":"string","primary_color":"#0f766e","logo_url":"string","admin_username":"utilisateur@example.com","password":"string","password_confirmation":"string","initial_role":"doctor_admin","accept_terms":false,"accept_privacy":true,"working_days":[0],"work_start_time":"09:00","work_end_time":"17:00","break_start_time":"12:30","break_end_time":"13:30","consultation_duration_minutes":30}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | SignupResponse |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/auth/register-patient`

Patient Signup

- Authentification : publique ou contrôlée par la route

Corps de requête — `application/json` (PatientRegisterRequest) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `cabinet_code` | Cabinet Code | oui | — | `string` |
| `first_name` | First Name | oui | — | `string` |
| `last_name` | Last Name | oui | — | `string` |
| `email` | Email | oui | — | `utilisateur@example.com` |
| `phone` | Phone | oui | — | `string` |
| `birth_date` | Birth Date | oui | — | `2026-07-21` |
| `gender` | Gender | oui | — | `M` |
| `address` | Address ou null | non | — | `string` |
| `password` | Password | oui | — | `string` |
| `password_confirmation` | Password Confirmation | oui | — | `string` |
| `accept_terms` | Accept Terms | oui | — | `False` |
| `accept_privacy` | Accept Privacy | oui | — | `False` |

```json
{
  "cabinet_code": "string",
  "first_name": "string",
  "last_name": "string",
  "email": "utilisateur@example.com",
  "phone": "string",
  "birth_date": "2026-07-21",
  "gender": "M",
  "address": "string",
  "password": "string",
  "password_confirmation": "string",
  "accept_terms": false,
  "accept_privacy": false
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/auth/register-patient" \
  -H "Content-Type: application/json" \
  --data-raw '{"cabinet_code":"string","first_name":"string","last_name":"string","email":"utilisateur@example.com","phone":"string","birth_date":"2026-07-21","gender":"M","address":"string","password":"string","password_confirmation":"string","accept_terms":false,"accept_privacy":false}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | PatientRegisterResponse |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/auth/staff-activation`

Auth Staff Activation Info

- Authentification : publique ou contrôlée par la route

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `token` | query | Token | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/auth/staff-activation?token=string"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | StaffActivationInfo |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/auth/staff-activation`

Auth Staff Activate

- Authentification : publique ou contrôlée par la route

Corps de requête — `application/json` (StaffActivationRequest) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `token` | Token | oui | — | `string` |
| `password` | Password | oui | — | `string` |
| `password_confirmation` | Password Confirmation | oui | — | `string` |

```json
{
  "token": "string",
  "password": "string",
  "password_confirmation": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/auth/staff-activation" \
  -H "Content-Type: application/json" \
  --data-raw '{"token":"string","password":"string","password_confirmation":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | MessageResponse |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/auth/patient-activation`

Auth Patient Activation Info

- Authentification : publique ou contrôlée par la route

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `token` | query | Token | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/auth/patient-activation?token=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PatientActivationInfo |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/auth/patient-activation`

Auth Patient Activate

- Authentification : publique ou contrôlée par la route

Corps de requête — `application/json` (PatientActivationRequest) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `token` | Token | oui | — | `string` |
| `password` | Password | oui | — | `string` |
| `password_confirmation` | Password Confirmation | oui | — | `string` |

```json
{
  "token": "string",
  "password": "string",
  "password_confirmation": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/auth/patient-activation" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"token":"string","password":"string","password_confirmation":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | MessageResponse |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/auth/login`

Login

- Authentification : publique ou contrôlée par la route

Corps de requête — `application/json` (LoginRequest) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `email` | Email | oui | — | `utilisateur@example.com` |
| `password` | Password | oui | — | `string` |
| `cabinet_code` | Cabinet Code ou null | non | — | `string` |
| `role` | Role ou null | non | — | `MEDECIN_ADMIN` |
| `device_name` | Device Name ou null | non | — | `string` |

```json
{
  "email": "utilisateur@example.com",
  "password": "string",
  "cabinet_code": "string",
  "role": "MEDECIN_ADMIN",
  "device_name": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  --data-raw '{"email":"utilisateur@example.com","password":"string","cabinet_code":"string","role":"MEDECIN_ADMIN","device_name":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | LoginResponse |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/auth/refresh`

Refresh

- Authentification : publique ou contrôlée par la route

Corps de requête — `application/json` (RefreshRequest) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `refresh_token` | Refresh Token | oui | — | `string` |

```json
{
  "refresh_token": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/auth/refresh" \
  -H "Content-Type: application/json" \
  --data-raw '{"refresh_token":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | LoginResponse |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/auth/logout`

Logout

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X POST "$BASE_URL/api/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Logout Api Auth Logout Post |

---

### `POST /api/auth/logout-all`

Logout All

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X POST "$BASE_URL/api/auth/logout-all" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Logout All Api Auth Logout All Post |

---

### `GET /api/auth/me`

Auth Me

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AuthMeResponse |

---

### `GET /api/doctor/dashboard`

Doctor Dashboard

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/dashboard" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | DoctorDashboardResponse |

---

### `GET /api/doctor/cabinet`

Doctor Cabinet

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/cabinet" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `PUT /api/doctor/cabinet`

Doctor Cabinet Update

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (TenantUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `name` | Name ou null | non | — | `string` |
| `specialty` | Specialty ou null | non | — | `string` |
| `logo_url` | Logo Url ou null | non | — | `string` |
| `primary_color` | Primary Color ou null | non | — | `string` |
| `city` | City ou null | non | — | `string` |
| `address` | Address ou null | non | — | `string` |
| `phone` | Phone ou null | non | — | `string` |
| `website` | Website ou null | non | — | `string` |
| `seo_title` | Seo Title ou null | non | — | `string` |
| `seo_description` | Seo Description ou null | non | — | `string` |
| `seo_keywords` | Seo Keywords ou null | non | — | `string` |
| `seo_canonical_url` | Seo Canonical Url ou null | non | — | `string` |
| `seo_social_image_url` | Seo Social Image Url ou null | non | — | `string` |
| `seo_indexable` | Seo Indexable ou null | non | — | `False` |
| `tax_identifier` | Tax Identifier ou null | non | — | `string` |
| `ice` | Ice ou null | non | — | `string` |

```json
{
  "name": "string",
  "specialty": "string",
  "logo_url": "string",
  "primary_color": "string",
  "city": "string",
  "address": "string",
  "phone": "string",
  "website": "string",
  "seo_title": "string",
  "seo_description": "string",
  "seo_keywords": "string",
  "seo_canonical_url": "string",
  "seo_social_image_url": "string",
  "seo_indexable": false,
  "tax_identifier": "string",
  "ice": "string"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/doctor/cabinet" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"string","specialty":"string","logo_url":"string","primary_color":"string","city":"string","address":"string","phone":"string","website":"string","seo_title":"string","seo_description":"string","seo_keywords":"string","seo_canonical_url":"string","seo_social_image_url":"string","seo_indexable":false,"tax_identifier":"string","ice":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/cabinet/logo`

Doctor Cabinet Logo Get

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/cabinet/logo" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `POST /api/doctor/cabinet/logo`

Doctor Cabinet Logo

- Authentification : Bearer JWT requis

Corps de requête — `multipart/form-data` (Body_doctor_cabinet_logo_api_doctor_cabinet_logo_post) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `file` | File | oui | — | `string` |

Utiliser un formulaire multipart ; les champs exacts sont disponibles dans Swagger.

Requête de test :

```bash
curl -X POST "$BASE_URL/api/doctor/cabinet/logo" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -F "file=@/chemin/vers/fichier.pdf"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/medecin/statistics`

Medecin Statistics

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/medecin/statistics" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | DashboardStats |

---

### `GET /api/staff/dashboard`

Staff Dashboard

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/staff/dashboard" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | StaffDashboardResponse |

---

### `GET /api/doctor/patient-settings`

Doctor Patient Settings

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/patient-settings" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PatientPortalSettings |

---

### `PUT /api/doctor/patient-settings`

Doctor Patient Settings Update

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (PatientPortalSettings) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `patient_can_request_appointment` | Patient Can Request Appointment | non | — | `True` |
| `patient_can_confirm_appointment` | Patient Can Confirm Appointment | non | — | `False` |
| `patient_can_cancel_appointment` | Patient Can Cancel Appointment | non | — | `True` |
| `patient_can_view_payments` | Patient Can View Payments | non | — | `True` |
| `patient_can_download_documents` | Patient Can Download Documents | non | — | `True` |
| `patient_requires_validation` | Patient Requires Validation | non | — | `True` |
| `patient_cin_required` | Patient Cin Required | non | — | `False` |
| `patient_cin_document_required` | Patient Cin Document Required | non | — | `False` |

```json
{
  "patient_can_request_appointment": true,
  "patient_can_confirm_appointment": false,
  "patient_can_cancel_appointment": true,
  "patient_can_view_payments": true,
  "patient_can_download_documents": true,
  "patient_requires_validation": true,
  "patient_cin_required": false,
  "patient_cin_document_required": false
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/doctor/patient-settings" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"patient_can_request_appointment":true,"patient_can_confirm_appointment":false,"patient_can_cancel_appointment":true,"patient_can_view_payments":true,"patient_can_download_documents":true,"patient_requires_validation":true,"patient_cin_required":false,"patient_cin_document_required":false}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PatientPortalSettings |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/reminder-settings`

Reminder Settings Get

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/reminder-settings" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AutomaticReminderSettings |

---

### `PUT /api/doctor/reminder-settings`

Reminder Settings Update

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (AutomaticReminderSettings) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `appointments` | AppointmentReminderRule | non | — | `{"enabled":true,"offset_minutes":1440,"channels":["WHATSAPP"]}` |
| `appointments.enabled` | Enabled | non | — | `True` |
| `appointments.offset_minutes` | Offset Minutes | non | — | `1440` |
| `appointments.channels` | liste de string | non | — | `["WHATSAPP"]` |
| `payments` | PaymentAutomaticReminderRule | non | — | `{"enabled":false,"overdue_days":1,"repeat_days":7,"channels":["WHATSAPP"]}` |
| `payments.enabled` | Enabled | non | — | `False` |
| `payments.overdue_days` | Overdue Days | non | — | `1` |
| `payments.repeat_days` | Repeat Days | non | — | `7` |
| `payments.channels` | liste de string | non | — | `["WHATSAPP"]` |
| `cnss` | CNSSAutomaticReminderRule | non | — | `{"enabled":false,"pending_days":7,"repeat_days":7,"channels":["WHATSAPP"]}` |
| `cnss.enabled` | Enabled | non | — | `False` |
| `cnss.pending_days` | Pending Days | non | — | `7` |
| `cnss.repeat_days` | Repeat Days | non | — | `7` |
| `cnss.channels` | liste de string | non | — | `["WHATSAPP"]` |
| `cheques` | ChequeAutomaticReminderRule | non | — | `{"enabled":true,"days_before":1,"repeat_days":1}` |
| `cheques.enabled` | Enabled | non | — | `True` |
| `cheques.days_before` | Days Before | non | — | `1` |
| `cheques.repeat_days` | Repeat Days | non | — | `1` |

```json
{
  "appointments": {
    "enabled": true,
    "offset_minutes": 1440,
    "channels": [
      "WHATSAPP"
    ]
  },
  "payments": {
    "enabled": false,
    "overdue_days": 1,
    "repeat_days": 7,
    "channels": [
      "WHATSAPP"
    ]
  },
  "cnss": {
    "enabled": false,
    "pending_days": 7,
    "repeat_days": 7,
    "channels": [
      "WHATSAPP"
    ]
  },
  "cheques": {
    "enabled": true,
    "days_before": 1,
    "repeat_days": 1
  }
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/doctor/reminder-settings" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"appointments":{"enabled":true,"offset_minutes":1440,"channels":["WHATSAPP"]},"payments":{"enabled":false,"overdue_days":1,"repeat_days":7,"channels":["WHATSAPP"]},"cnss":{"enabled":false,"pending_days":7,"repeat_days":7,"channels":["WHATSAPP"]},"cheques":{"enabled":true,"days_before":1,"repeat_days":1}}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AutomaticReminderSettings |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/subscription`

Doctor Subscription

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/subscription" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `GET /api/cabinet/modules`

Cabinet Modules

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/cabinet/modules" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `POST /api/doctor/subscription/select-plan`

Doctor Subscription Select Plan

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (PlanSelection) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `plan_id` | Plan Id | oui | — | `string` |

```json
{
  "plan_id": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/doctor/subscription/select-plan" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"plan_id":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/doctor/subscription/pay`

Doctor Subscription Pay

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (SubscriptionPaymentCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `plan_id` | Plan Id | oui | — | `string` |
| `payment_method` | Payment Method | oui | — | `card` |
| `transaction_reference` | Transaction Reference ou null | non | — | `string` |
| `proof_url` | Proof Url ou null | non | — | `string` |

```json
{
  "plan_id": "string",
  "payment_method": "card",
  "transaction_reference": "string",
  "proof_url": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/doctor/subscription/pay" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"plan_id":"string","payment_method":"card","transaction_reference":"string","proof_url":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | SubscriptionPaymentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/subscription/payments`

Doctor Subscription Payments

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/subscription/payments" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de SubscriptionPaymentOut |

---

### `POST /api/doctor/subscription/cancel-renewal`

Doctor Subscription Cancel Renewal

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X POST "$BASE_URL/api/doctor/subscription/cancel-renewal" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `GET /api/patient/dashboard`

Patient Dashboard

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/dashboard" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `GET /api/patient/profile`

Patient Profile

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `PUT /api/patient/profile`

Patient Profile Update

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (PatientProfileUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `email` | Email ou null | non | — | `utilisateur@example.com` |
| `phone` | Phone ou null | non | — | `string` |
| `address` | Address ou null | non | — | `string` |
| `cnss_deposit_reminder_days` | Cnss Deposit Reminder Days ou null | non | — | `0.0` |

```json
{
  "email": "utilisateur@example.com",
  "phone": "string",
  "address": "string",
  "cnss_deposit_reminder_days": 0.0
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/patient/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"email":"utilisateur@example.com","phone":"string","address":"string","cnss_deposit_reminder_days":0.0}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/patient/change-password`

Patient Password

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (PasswordChange) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `current_password` | Current Password | oui | — | `string` |
| `new_password` | New Password | oui | — | `string` |

```json
{
  "current_password": "string",
  "new_password": "string"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/patient/change-password" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"current_password":"string","new_password":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/appointments`

Patient Appointments

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/appointments?page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Patient Appointments Api Patient Appointments Get |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/appointments/{item_id}`

Patient Appointment

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/appointments/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/appointments/{item_id}/qr`

Patient Appointment Qr

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/appointments/string/qr" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentQrOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/patient/appointments/request`

Patient Appointment Request

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (AppointmentRequest) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `doctor_id` | Doctor Id ou null | non | — | `string` |
| `date` | Date | oui | — | `2026-07-21` |
| `start_time` | Start Time | oui | — | `string` |
| `end_time` | End Time ou null | non | — | `string` |
| `reason` | Reason ou null | non | — | `string` |

```json
{
  "doctor_id": "string",
  "date": "2026-07-21",
  "start_time": "string",
  "end_time": "string",
  "reason": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/patient/appointments/request" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"doctor_id":"string","date":"2026-07-21","start_time":"string","end_time":"string","reason":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | AppointmentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/patient/appointments/{item_id}/confirm`

Patient Appointment Confirm

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/patient/appointments/string/confirm" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/patient/appointments/{item_id}/cancel`

Patient Appointment Cancel

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/patient/appointments/string/cancel" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/visits`

Patient Visits

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/visits?page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/visits/{item_id}`

Patient Visit

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/visits/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/documents`

Patient Documents

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/documents?page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Patient Documents Api Patient Documents Get |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/documents/{item_id}`

Patient Document

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/documents/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | DocumentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/documents/{item_id}/download`

Patient Document Download

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/documents/string/download" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/prescriptions`

Patient Prescriptions

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/prescriptions?page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Patient Prescriptions Api Patient Prescriptions Get |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/prescriptions/{item_id}`

Patient Prescription

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/prescriptions/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PrescriptionOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/prescriptions/{item_id}/pdf`

Patient Prescription Pdf

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/prescriptions/string/pdf" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/cnss`

Patient Cnss

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/cnss?page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Patient Cnss Api Patient Cnss Get |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/patient/cnss`

Patient Cnss Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (PatientCNSSCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `appointment_id` | Appointment Id ou null | non | — | `string` |
| `visit_id` | Visit Id ou null | non | — | `string` |
| `fee_id` | Fee Id ou null | non | — | `string` |
| `comment` | Comment ou null | non | — | `string` |
| `deposit_deadline` | Deposit Deadline ou null | non | — | `2026-07-21` |

```json
{
  "appointment_id": "string",
  "visit_id": "string",
  "fee_id": "string",
  "comment": "string",
  "deposit_deadline": "2026-07-21"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/patient/cnss" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"appointment_id":"string","visit_id":"string","fee_id":"string","comment":"string","deposit_deadline":"2026-07-21"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | CNSSOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/cnss/{item_id}`

Patient Cnss Item

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/cnss/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | CNSSOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/cnss/{item_id}/detail`

Patient Cnss Detail

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/cnss/string/detail" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `PATCH /api/patient/cnss/{item_id}/action`

Patient Cnss Action

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `application/json` (PatientCNSSAction) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `action` | Action | oui | — | `confirm_pickup` |
| `deposit_date` | Deposit Date ou null | non | — | `2026-07-21` |
| `deposit_reference` | Deposit Reference ou null | non | — | `string` |
| `decision_date` | Decision Date ou null | non | — | `2026-07-21` |
| `reimbursed_amount` | Reimbursed Amount ou null | non | — | `0.0` |
| `rejection_code` | Rejection Code ou null | non | — | `INCOMPLETE` |
| `comment` | Comment ou null | non | — | `string` |

```json
{
  "action": "confirm_pickup",
  "deposit_date": "2026-07-21",
  "deposit_reference": "string",
  "decision_date": "2026-07-21",
  "reimbursed_amount": 0.0,
  "rejection_code": "INCOMPLETE",
  "comment": "string"
}
```

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/patient/cnss/string/action" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"action":"confirm_pickup","deposit_date":"2026-07-21","deposit_reference":"string","decision_date":"2026-07-21","reimbursed_amount":0.0,"rejection_code":"INCOMPLETE","comment":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | CNSSOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/patient/cnss/{item_id}/documents`

Patient Cnss Document Add

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `multipart/form-data` (Body_patient_cnss_document_add_api_patient_cnss__item_id__documents_post) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `title` | Title | oui | — | `string` |
| `phase` | Phase | non | — | `demande` |
| `file` | File | oui | — | `string` |

Utiliser un formulaire multipart ; les champs exacts sont disponibles dans Swagger.

Requête de test :

```bash
curl -X POST "$BASE_URL/api/patient/cnss/string/documents" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -F "title=string" \
  -F "phase=demande" \
  -F "file=@/chemin/vers/fichier.pdf"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | DocumentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/notifications`

Patient Notifications

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/notifications" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `PATCH /api/patient/notifications/read-all`

Patient Notifications Read All

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/patient/notifications/read-all" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `PATCH /api/patient/notifications/{item_id}/read`

Patient Notification Read

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/patient/notifications/string/read" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/payments`

Patient Payments

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/payments?page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Patient Payments Api Patient Payments Get |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/honoraires`

Patient Honoraires

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/honoraires?page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Patient Honoraires Api Patient Honoraires Get |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/receipts/{item_id}/download`

Patient Receipt

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/receipts/string/download" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/staff/me/permissions`

Staff My Permissions

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/staff/me/permissions" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PermissionMatrix |

---

### `GET /api/payment-reminders/summary`

Payment Reminder Summary

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/payment-reminders/summary" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de object |

---

### `GET /api/payment-reminders/{patient_id}`

Payment Reminder History

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/payment-reminders/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de PaymentReminderOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/payment-reminders`

Payment Reminder Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (PaymentReminderCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `patient_id` | Patient Id | oui | — | `string` |
| `fee_id` | Fee Id ou null | non | — | `string` |
| `due_date_id` | Due Date Id ou null | non | — | `string` |
| `channel` | Channel | oui | — | `WHATSAPP` |
| `message` | Message | oui | — | `string` |
| `scheduled_at` | Scheduled At ou null | non | — | `2026-07-21T10:00:00Z` |

```json
{
  "patient_id": "string",
  "fee_id": "string",
  "due_date_id": "string",
  "channel": "WHATSAPP",
  "message": "string",
  "scheduled_at": "2026-07-21T10:00:00Z"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/payment-reminders" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"patient_id":"string","fee_id":"string","due_date_id":"string","channel":"WHATSAPP","message":"string","scheduled_at":"2026-07-21T10:00:00Z"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | PaymentReminderOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/payment-reminders/bulk`

Payment Reminder Bulk

Create one reminder per unpaid patient, scoped strictly to the current cabinet.

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (PaymentReminderBulkCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `channel` | Channel | oui | — | `WHATSAPP` |
| `message_template` | Message Template | non | — | `Bonjour {patient}, nous vous rappelons qu’un montant de {montant} MAD reste à régler auprès du cabinet. Merci de nous contacter pour régulariser votre situation.` |

```json
{
  "channel": "WHATSAPP",
  "message_template": "Bonjour {patient}, nous vous rappelons qu’un montant de {montant} MAD reste à régler auprès du cabinet. Merci de nous contacter pour régulariser votre situation."
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/payment-reminders/bulk" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"channel":"WHATSAPP","message_template":"Bonjour {patient}, nous vous rappelons qu’un montant de {montant} MAD reste à régler auprès du cabinet. Merci de nous contacter pour régulariser votre situation."}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | PaymentReminderBulkOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/support-tickets`

Doctor Support Tickets

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/support-tickets" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `POST /api/doctor/support-tickets`

Doctor Support Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (DoctorSupportTicketCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `subject` | Subject | oui | — | `string` |
| `message` | Message | oui | — | `string` |
| `priority` | Priority | non | — | `normal` |

```json
{
  "subject": "string",
  "message": "string",
  "priority": "normal"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/doctor/support-tickets" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"subject":"string","message":"string","priority":"normal"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/doctor/support-tickets/{item_id}/reply`

Doctor Support Reply

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `application/json` (SupportReplyCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `message` | Message | oui | — | `string` |
| `internal` | Internal | non | — | `False` |

```json
{
  "message": "string",
  "internal": false
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/doctor/support-tickets/string/reply" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"message":"string","internal":false}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/notifications`

Doctor Notifications

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/notifications" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `PATCH /api/doctor/notifications/read-all`

Doctor Notifications Read All

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/doctor/notifications/read-all" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `PATCH /api/doctor/notifications/{item_id}/read`

Doctor Notification Read

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/doctor/notifications/string/read" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/schedule`

Doctor Schedule

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/schedule" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | ScheduleResponse |

---

### `PUT /api/doctor/schedule`

Doctor Schedule Update

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (ScheduleUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `days` | liste de ScheduleDay | oui | — | `[{"weekday":0.0,"is_working":true,"start_time":"string","end_time":"string","break_start_time":"string","break_end_time":"string"}]` |
| `days[].weekday` | Weekday | oui | — | `0.0` |
| `days[].is_working` | Is Working | non | — | `True` |
| `days[].start_time` | Start Time ou null | non | — | `string` |
| `days[].end_time` | End Time ou null | non | — | `string` |
| `days[].break_start_time` | Break Start Time ou null | non | — | `string` |
| `days[].break_end_time` | Break End Time ou null | non | — | `string` |
| `config` | ScheduleConfigIn | oui | — | `{"default_duration_minutes":30,"minimum_booking_delay_minutes":0,"maximum_appointments_per_day":1.0}` |
| `config.default_duration_minutes` | Default Duration Minutes | non | — | `30` |
| `config.minimum_booking_delay_minutes` | Minimum Booking Delay Minutes | non | — | `0` |
| `config.maximum_appointments_per_day` | Maximum Appointments Per Day ou null | non | — | `1.0` |

```json
{
  "days": [
    {
      "weekday": 0.0,
      "is_working": true,
      "start_time": "string",
      "end_time": "string",
      "break_start_time": "string",
      "break_end_time": "string"
    }
  ],
  "config": {
    "default_duration_minutes": 30,
    "minimum_booking_delay_minutes": 0,
    "maximum_appointments_per_day": 1.0
  }
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/doctor/schedule" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"days":[{"weekday":0.0,"is_working":true,"start_time":"string","end_time":"string","break_start_time":"string","break_end_time":"string"}],"config":{"default_duration_minutes":30,"minimum_booking_delay_minutes":0,"maximum_appointments_per_day":1.0}}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | ScheduleResponse |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/time-offs`

Doctor Time Offs

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/time-offs" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de TimeOffOut |

---

### `POST /api/doctor/time-offs`

Doctor Time Off Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (TimeOffCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `start_date` | Start Date | oui | — | `2026-07-21` |
| `end_date` | End Date | oui | — | `2026-07-21` |
| `reason` | Reason ou null | non | — | `string` |

```json
{
  "start_date": "2026-07-21",
  "end_date": "2026-07-21",
  "reason": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/doctor/time-offs" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"start_date":"2026-07-21","end_date":"2026-07-21","reason":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | TimeOffOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/doctor/time-offs/{item_id}`

Doctor Time Off Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/doctor/time-offs/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `204` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/blocked-slots`

Doctor Blocked Slots

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/blocked-slots" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de BlockedSlotOut |

---

### `POST /api/doctor/blocked-slots`

Doctor Blocked Slot Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (BlockedSlotCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `date` | Date | oui | — | `2026-07-21` |
| `start_time` | Start Time | oui | — | `string` |
| `end_time` | End Time | oui | — | `string` |
| `reason` | Reason ou null | non | — | `string` |

```json
{
  "date": "2026-07-21",
  "start_time": "string",
  "end_time": "string",
  "reason": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/doctor/blocked-slots" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"date":"2026-07-21","start_time":"string","end_time":"string","reason":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | BlockedSlotOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/doctor/blocked-slots/{item_id}`

Doctor Blocked Slot Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/doctor/blocked-slots/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `204` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/dashboard`

Admin Dashboard

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/dashboard" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AdminDashboardOut |

---

### `GET /api/super-admin/instances/expiring-soon`

Admin Tenants Expiring

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/instances/expiring-soon" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de AdminTenantOut |

---

### `GET /api/super-admin/instances/status-summary`

Admin Tenants Summary

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/instances/status-summary" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `POST /api/super-admin/instances/check-expiration`

Admin Check Expiration

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/instances/check-expiration" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `GET /api/super-admin/instances`

Admin Tenants

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/instances?page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Admin Tenants Api Super Admin Instances Get |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/instances/{tenant_id}`

Admin Tenant Detail

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `tenant_id` | path | Tenant Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/instances/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AdminTenantOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/super-admin/instances/{tenant_id}`

Admin Tenant Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `tenant_id` | path | Tenant Id | oui |

Corps de requête — `application/json` (AdminTenantUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `name` | Name ou null | non | — | `string` |
| `city` | City ou null | non | — | `string` |
| `address` | Address ou null | non | — | `string` |

```json
{
  "name": "string",
  "city": "string",
  "address": "string"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/super-admin/instances/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"string","city":"string","address":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AdminTenantOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/super-admin/instances/{tenant_id}/status`

Admin Tenant Status

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `tenant_id` | path | Tenant Id | oui |

Corps de requête — `application/json` (AdminStatusUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `status` | Status | oui | — | `trial` |

```json
{
  "status": "trial"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/super-admin/instances/string/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"status":"trial"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AdminTenantOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PATCH /api/super-admin/instances/{tenant_id}/activate`

Super Admin Instance Activate

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `tenant_id` | path | Tenant Id | oui |

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/super-admin/instances/string/activate" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AdminTenantOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PATCH /api/super-admin/instances/{tenant_id}/suspend`

Super Admin Instance Suspend

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `tenant_id` | path | Tenant Id | oui |

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/super-admin/instances/string/suspend" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AdminTenantOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PATCH /api/super-admin/instances/{tenant_id}/extend-trial`

Super Admin Instance Extend

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `tenant_id` | path | Tenant Id | oui |
| `days` | query | Days | non |

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/super-admin/instances/string/extend-trial?days=30" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AdminTenantOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/subscriptions`

Admin Subscriptions

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/subscriptions?page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Admin Subscriptions Api Super Admin Subscriptions Get |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/super-admin/subscriptions`

Super Admin Subscription Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (AdminSubscriptionCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `tenant_id` | Tenant Id | oui | — | `string` |
| `plan_id` | Plan Id ou null | non | — | `string` |
| `plan_name` | Plan Name | non | — | `FADAA Cabinet` |
| `status` | Status | non | — | `active` |
| `start_date` | Start Date | oui | — | `2026-07-21T10:00:00Z` |
| `end_date` | End Date | oui | — | `2026-07-21T10:00:00Z` |
| `amount` | Amount | oui | — | `0.0` |
| `payment_status` | Payment Status | non | — | `pending` |
| `payment_method` | Payment Method ou null | non | — | `string` |

```json
{
  "tenant_id": "string",
  "plan_id": "string",
  "plan_name": "FADAA Cabinet",
  "status": "active",
  "start_date": "2026-07-21T10:00:00Z",
  "end_date": "2026-07-21T10:00:00Z",
  "amount": 0.0,
  "payment_status": "pending",
  "payment_method": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/subscriptions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"tenant_id":"string","plan_id":"string","plan_name":"FADAA Cabinet","status":"active","start_date":"2026-07-21T10:00:00Z","end_date":"2026-07-21T10:00:00Z","amount":0.0,"payment_status":"pending","payment_method":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | AdminSubscriptionOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/subscriptions/{item_id}`

Admin Subscription

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/subscriptions/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AdminSubscriptionOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/super-admin/subscriptions/{item_id}`

Admin Subscription Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `application/json` (AdminSubscriptionUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `plan_name` | Plan Name ou null | non | — | `string` |
| `status` | Status ou null | non | — | `trial` |
| `start_date` | Start Date ou null | non | — | `2026-07-21T10:00:00Z` |
| `end_date` | End Date ou null | non | — | `2026-07-21T10:00:00Z` |
| `amount` | Amount ou null | non | — | `0.0` |
| `payment_status` | Payment Status ou null | non | — | `string` |
| `admin_note` | Admin Note ou null | non | — | `string` |

```json
{
  "plan_name": "string",
  "status": "trial",
  "start_date": "2026-07-21T10:00:00Z",
  "end_date": "2026-07-21T10:00:00Z",
  "amount": 0.0,
  "payment_status": "string",
  "admin_note": "string"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/super-admin/subscriptions/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"plan_name":"string","status":"trial","start_date":"2026-07-21T10:00:00Z","end_date":"2026-07-21T10:00:00Z","amount":0.0,"payment_status":"string","admin_note":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AdminSubscriptionOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/super-admin/subscriptions/{item_id}/activate`

Admin Subscription Activate

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/subscriptions/string/activate" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AdminSubscriptionOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/super-admin/subscriptions/{item_id}/cancel`

Admin Subscription Cancel

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/subscriptions/string/cancel" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AdminSubscriptionOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PATCH /api/super-admin/subscriptions/{item_id}/renew`

Super Admin Subscription Renew

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/super-admin/subscriptions/string/renew" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AdminSubscriptionOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/support-tickets`

Admin Support Tickets

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/support-tickets?page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Admin Support Tickets Api Super Admin Support Tickets Get |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/support-tickets/{item_id}`

Admin Support Ticket

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/support-tickets/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | SupportTicketOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/super-admin/support-tickets/{item_id}`

Admin Support Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `application/json` (SupportTicketUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `status` | Status ou null | non | — | `open` |
| `priority` | Priority ou null | non | — | `low` |
| `internal_note` | Internal Note ou null | non | — | `string` |

```json
{
  "status": "open",
  "priority": "low",
  "internal_note": "string"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/super-admin/support-tickets/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"status":"open","priority":"low","internal_note":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | SupportTicketOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/super-admin/support-tickets/{item_id}/reply`

Admin Support Reply

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `application/json` (SupportReplyCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `message` | Message | oui | — | `string` |
| `internal` | Internal | non | — | `False` |

```json
{
  "message": "string",
  "internal": false
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/support-tickets/string/reply" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"message":"string","internal":false}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/super-admin/support-tickets/{item_id}/close`

Admin Support Close

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/support-tickets/string/close" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | SupportTicketOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/audit-logs`

Admin System Logs

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/audit-logs?page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/backups`

Super Admin Backups

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/backups?page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/super-admin/backups`

Super Admin Backup Create

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/backups" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | — |

---

### `GET /api/super-admin/restores`

Super Admin Restores

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/restores?page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/super-admin/backups/{backup_id}/test-restore`

Super Admin Backup Test

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `backup_id` | path | Backup Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/backups/string/test-restore" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/backups/{backup_id}/download`

Super Admin Backup Download

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `backup_id` | path | Backup Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/backups/string/download" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/analytics`

Admin Analytics

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/analytics" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `GET /api/public/subscription-plans`

Public Subscription Plans

- Authentification : publique ou contrôlée par la route

Requête de test :

```bash
curl -X GET "$BASE_URL/api/public/subscription-plans"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de SubscriptionPlanOut |

---

### `GET /api/public/subscription-plans/{slug}`

Public Subscription Plan

- Authentification : publique ou contrôlée par la route

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `slug` | path | Slug | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/public/subscription-plans/string"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | SubscriptionPlanOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/subscription-plans`

Super Admin Subscription Plans

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/subscription-plans" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de SubscriptionPlanOut |

---

### `POST /api/super-admin/subscription-plans`

Super Admin Subscription Plan Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (SubscriptionPlanCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `name` | Name | oui | — | `string` |
| `slug` | Slug ou null | non | — | `string` |
| `description` | Description ou null | non | — | `string` |
| `price` | Price | oui | — | `0.0` |
| `currency` | Currency | non | — | `MAD` |
| `billing_interval` | Billing Interval | non | — | `monthly` |
| `duration_months` | Duration Months | non | — | `1` |
| `trial_days` | Trial Days | non | — | `30` |
| `features` | liste de string | non | — | `["string"]` |
| `enabled_modules` | liste de string | non | — | `["dashboard"]` |
| `max_doctors` | Max Doctors ou null | non | — | `1.0` |
| `max_secretaries` | Max Secretaries ou null | non | — | `0.0` |
| `max_patients` | Max Patients ou null | non | — | `1.0` |
| `whatsapp_enabled` | Whatsapp Enabled | non | — | `False` |
| `cnss_enabled` | Cnss Enabled | non | — | `False` |
| `statistics_enabled` | Statistics Enabled | non | — | `False` |
| `is_featured` | Is Featured | non | — | `False` |
| `is_active` | Is Active | non | — | `True` |
| `display_order` | Display Order | non | — | `0` |

```json
{
  "name": "string",
  "slug": "string",
  "description": "string",
  "price": 0.0,
  "currency": "MAD",
  "billing_interval": "monthly",
  "duration_months": 1,
  "trial_days": 30,
  "features": [
    "string"
  ],
  "enabled_modules": [
    "dashboard"
  ],
  "max_doctors": 1.0,
  "max_secretaries": 0.0,
  "max_patients": 1.0,
  "whatsapp_enabled": false,
  "cnss_enabled": false,
  "statistics_enabled": false,
  "is_featured": false,
  "is_active": true,
  "display_order": 0
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/subscription-plans" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"string","slug":"string","description":"string","price":0.0,"currency":"MAD","billing_interval":"monthly","duration_months":1,"trial_days":30,"features":["string"],"enabled_modules":["dashboard"],"max_doctors":1.0,"max_secretaries":0.0,"max_patients":1.0,"whatsapp_enabled":false,"cnss_enabled":false,"statistics_enabled":false,"is_featured":false,"is_active":true,"display_order":0}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | SubscriptionPlanOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PATCH /api/super-admin/subscription-plans/{item_id}`

Super Admin Subscription Plan Patch

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `application/json` (SubscriptionPlanUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `name` | Name ou null | non | — | `string` |
| `slug` | Slug ou null | non | — | `string` |
| `description` | Description ou null | non | — | `string` |
| `price` | Price ou null | non | — | `0.0` |
| `currency` | Currency ou null | non | — | `string` |
| `billing_interval` | Billing Interval ou null | non | — | `monthly` |
| `duration_months` | Duration Months ou null | non | — | `1.0` |
| `trial_days` | Trial Days ou null | non | — | `0.0` |
| `features` | Features ou null | non | — | `["string"]` |
| `enabled_modules` | Enabled Modules ou null | non | — | `["dashboard"]` |
| `max_doctors` | Max Doctors ou null | non | — | `1.0` |
| `max_secretaries` | Max Secretaries ou null | non | — | `0.0` |
| `max_patients` | Max Patients ou null | non | — | `1.0` |
| `whatsapp_enabled` | Whatsapp Enabled ou null | non | — | `False` |
| `cnss_enabled` | Cnss Enabled ou null | non | — | `False` |
| `statistics_enabled` | Statistics Enabled ou null | non | — | `False` |
| `is_featured` | Is Featured ou null | non | — | `False` |
| `is_active` | Is Active ou null | non | — | `False` |
| `display_order` | Display Order ou null | non | — | `0` |

```json
{
  "name": "string",
  "slug": "string",
  "description": "string",
  "price": 0.0,
  "currency": "string",
  "billing_interval": "monthly",
  "duration_months": 1.0,
  "trial_days": 0.0,
  "features": [
    "string"
  ],
  "enabled_modules": [
    "dashboard"
  ],
  "max_doctors": 1.0,
  "max_secretaries": 0.0,
  "max_patients": 1.0,
  "whatsapp_enabled": false,
  "cnss_enabled": false,
  "statistics_enabled": false,
  "is_featured": false,
  "is_active": false,
  "display_order": 0
}
```

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/super-admin/subscription-plans/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"string","slug":"string","description":"string","price":0.0,"currency":"string","billing_interval":"monthly","duration_months":1.0,"trial_days":0.0,"features":["string"],"enabled_modules":["dashboard"],"max_doctors":1.0,"max_secretaries":0.0,"max_patients":1.0,"whatsapp_enabled":false,"cnss_enabled":false,"statistics_enabled":false,"is_featured":false,"is_active":false,"display_order":0}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | SubscriptionPlanOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/super-admin/subscription-plans/{item_id}`

Super Admin Subscription Plan Disable

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/super-admin/subscription-plans/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/subscription-payments`

Super Admin Subscription Payments

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/subscription-payments?page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Super Admin Subscription Payments Api Super Admin Subscription Payments Get |
| `422` | Validation Error | HTTPValidationError |

---

### `PATCH /api/super-admin/subscription-payments/{item_id}/validate`

Super Admin Subscription Payment Validate

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/super-admin/subscription-payments/string/validate" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | SubscriptionPaymentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PATCH /api/super-admin/subscription-payments/{item_id}/reject`

Super Admin Subscription Payment Reject

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `application/json` (SubscriptionPaymentDecision) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `reason` | Reason ou null | non | — | `string` |

```json
{
  "reason": "string"
}
```

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/super-admin/subscription-payments/string/reject" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"reason":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | SubscriptionPaymentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/users`

Super Admin Users

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/users?page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/super-admin/users/{item_id}/activate`

Super Admin User Activate

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/super-admin/users/string/activate" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/super-admin/users/{item_id}/disable`

Super Admin User Disable

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/super-admin/users/string/disable" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/settings`

Super Admin Settings

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/settings" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PlatformSettingsOut |

---

### `PUT /api/super-admin/settings`

Super Admin Settings Update

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (PlatformSettingsUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `trial_days` | Trial Days ou null | non | — | `1.0` |
| `reminder_days` | Reminder Days ou null | non | — | `[0]` |
| `reminder_message` | Reminder Message ou null | non | — | `string` |
| `maintenance_mode` | Maintenance Mode ou null | non | — | `False` |
| `support_email` | Support Email ou null | non | — | `string` |
| `terms_url` | Terms Url ou null | non | — | `string` |
| `privacy_url` | Privacy Url ou null | non | — | `string` |

```json
{
  "trial_days": 1.0,
  "reminder_days": [
    0
  ],
  "reminder_message": "string",
  "maintenance_mode": false,
  "support_email": "string",
  "terms_url": "string",
  "privacy_url": "string"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/super-admin/settings" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"trial_days":1.0,"reminder_days":[0],"reminder_message":"string","maintenance_mode":false,"support_email":"string","terms_url":"string","privacy_url":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PlatformSettingsOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/public/events`

Public Events

- Authentification : publique ou contrôlée par la route

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `include_past` | query | Include Past | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/public/events?include_past=False"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de PublicPlatformEventOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/public/blog`

Public Blog

- Authentification : publique ou contrôlée par la route

Requête de test :

```bash
curl -X GET "$BASE_URL/api/public/blog"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de PublicBlogPostOut |

---

### `GET /api/public/media/{asset_id}`

Public Media Image

- Authentification : publique ou contrôlée par la route

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `asset_id` | path | Asset Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/public/media/string"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/public/blog/gallery/{image_id}`

Public Blog Gallery Image

- Authentification : publique ou contrôlée par la route

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `image_id` | path | Image Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/public/blog/gallery/string"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/public/blog/{slug}`

Public Blog Detail

- Authentification : publique ou contrôlée par la route

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `slug` | path | Slug | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/public/blog/string"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PublicBlogPostOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/public/events/gallery/{image_id}`

Public Event Gallery Image

- Authentification : publique ou contrôlée par la route

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `image_id` | path | Image Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/public/events/gallery/string"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/public/events/{event_id}/registrations`

Public Event Registration

- Authentification : publique ou contrôlée par la route

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `event_id` | path | Event Id | oui |

Corps de requête — `application/json` (PublicEventRegistrationCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `contact_first_name` | Contact First Name | oui | — | `string` |
| `contact_last_name` | Contact Last Name | oui | — | `string` |
| `contact_email` | Contact Email | oui | — | `utilisateur@example.com` |
| `contact_phone` | Contact Phone | oui | — | `string` |
| `participants` | liste de EventParticipantCreate | oui | — | `[{"first_name":"string","last_name":"string","email":"utilisateur@example.com","phone":"string"}]` |
| `participants[].first_name` | First Name | oui | — | `string` |
| `participants[].last_name` | Last Name | oui | — | `string` |
| `participants[].email` | Email ou null | non | — | `utilisateur@example.com` |
| `participants[].phone` | Phone ou null | non | — | `string` |
| `notes` | Notes ou null | non | — | `string` |
| `consent_accepted` | Consent Accepted | oui | — | `False` |

```json
{
  "contact_first_name": "string",
  "contact_last_name": "string",
  "contact_email": "utilisateur@example.com",
  "contact_phone": "string",
  "participants": [
    {
      "first_name": "string",
      "last_name": "string",
      "email": "utilisateur@example.com",
      "phone": "string"
    }
  ],
  "notes": "string",
  "consent_accepted": false
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/public/events/string/registrations" \
  -H "Content-Type: application/json" \
  --data-raw '{"contact_first_name":"string","contact_last_name":"string","contact_email":"utilisateur@example.com","contact_phone":"string","participants":[{"first_name":"string","last_name":"string","email":"utilisateur@example.com","phone":"string"}],"notes":"string","consent_accepted":false}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | PublicEventRegistrationConfirmation |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/public/events/{slug_or_id}`

Public Event Detail

- Authentification : publique ou contrôlée par la route

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `slug_or_id` | path | Slug Or Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/public/events/string"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PublicPlatformEventOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/events`

Super Admin Events

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `status` | query | Status | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/events?page=1&page_size=20&search=string&status=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Super Admin Events Api Super Admin Events Get |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/super-admin/events`

Super Admin Event Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (PlatformEventCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `title` | Title | oui | — | `string` |
| `event_type` | Event Type | oui | — | `string` |
| `description` | Description ou null | non | — | `string` |
| `article_content` | Article Content ou null | non | — | `string` |
| `start_at` | Start At | oui | — | `2026-07-21T10:00:00Z` |
| `end_at` | End At | oui | — | `2026-07-21T10:00:00Z` |
| `location` | Location | non | — | `En ligne` |
| `is_online` | Is Online | non | — | `False` |
| `attendance_mode` | Attendance Mode | non | — | `in_person` |
| `venue_name` | Venue Name ou null | non | — | `string` |
| `address` | Address ou null | non | — | `string` |
| `city` | City ou null | non | — | `string` |
| `country` | Country ou null | non | — | `Maroc` |
| `map_url` | Map Url ou null | non | — | `string` |
| `online_provider` | Online Provider ou null | non | — | `string` |
| `online_url` | Online Url ou null | non | — | `string` |
| `registration_mode` | Registration Mode | non | — | `internal` |
| `registration_url` | Registration Url ou null | non | — | `string` |
| `capacity` | Capacity ou null | non | — | `1.0` |
| `status` | Status | non | — | `draft` |
| `is_featured` | Is Featured | non | — | `False` |
| `notification_audience` | Notification Audience | non | — | `both` |

```json
{
  "title": "string",
  "event_type": "string",
  "description": "string",
  "article_content": "string",
  "start_at": "2026-07-21T10:00:00Z",
  "end_at": "2026-07-21T10:00:00Z",
  "location": "En ligne",
  "is_online": false,
  "attendance_mode": "in_person",
  "venue_name": "string",
  "address": "string",
  "city": "string",
  "country": "Maroc",
  "map_url": "string",
  "online_provider": "string",
  "online_url": "string",
  "registration_mode": "internal",
  "registration_url": "string",
  "capacity": 1.0,
  "status": "draft",
  "is_featured": false,
  "notification_audience": "both"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/events" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"title":"string","event_type":"string","description":"string","article_content":"string","start_at":"2026-07-21T10:00:00Z","end_at":"2026-07-21T10:00:00Z","location":"En ligne","is_online":false,"attendance_mode":"in_person","venue_name":"string","address":"string","city":"string","country":"Maroc","map_url":"string","online_provider":"string","online_url":"string","registration_mode":"internal","registration_url":"string","capacity":1.0,"status":"draft","is_featured":false,"notification_audience":"both"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | PlatformEventOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/blog`

Super Admin Blog

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `status` | query | Status | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/blog?page=1&page_size=10&search=string&status=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Super Admin Blog Api Super Admin Blog Get |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/super-admin/blog`

Super Admin Blog Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (BlogPostCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `title` | Title | oui | — | `string` |
| `excerpt` | Excerpt ou null | non | — | `string` |
| `content` | Content | oui | — | `string` |
| `category` | Category | non | — | `Actualités` |
| `author_name` | Author Name | non | — | `Équipe FADAA Santé` |
| `status` | Status | non | — | `draft` |
| `is_featured` | Is Featured | non | — | `False` |

```json
{
  "title": "string",
  "excerpt": "string",
  "content": "string",
  "category": "Actualités",
  "author_name": "Équipe FADAA Santé",
  "status": "draft",
  "is_featured": false
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/blog" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"title":"string","excerpt":"string","content":"string","category":"Actualités","author_name":"Équipe FADAA Santé","status":"draft","is_featured":false}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | BlogPostOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/super-admin/blog/{item_id}`

Super Admin Blog Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `application/json` (BlogPostUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `title` | Title ou null | non | — | `string` |
| `excerpt` | Excerpt ou null | non | — | `string` |
| `content` | Content ou null | non | — | `string` |
| `category` | Category ou null | non | — | `string` |
| `author_name` | Author Name ou null | non | — | `string` |
| `status` | Status ou null | non | — | `draft` |
| `is_featured` | Is Featured ou null | non | — | `False` |

```json
{
  "title": "string",
  "excerpt": "string",
  "content": "string",
  "category": "string",
  "author_name": "string",
  "status": "draft",
  "is_featured": false
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/super-admin/blog/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"title":"string","excerpt":"string","content":"string","category":"string","author_name":"string","status":"draft","is_featured":false}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | BlogPostOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/super-admin/blog/{item_id}`

Super Admin Blog Archive

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/super-admin/blog/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/media`

Super Admin Media List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/media?page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Super Admin Media List Api Super Admin Media Get |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/super-admin/media`

Super Admin Media Upload

- Authentification : Bearer JWT requis

Corps de requête — `multipart/form-data` (Body_super_admin_media_upload_api_super_admin_media_post) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `file` | File | oui | — | `string` |
| `alt_text` | Alt Text | oui | — | `string` |
| `caption` | Caption ou null | non | — | `string` |

Utiliser un formulaire multipart ; les champs exacts sont disponibles dans Swagger.

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/media" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -F "file=@/chemin/vers/fichier.pdf" \
  -F "alt_text=string" \
  -F "caption=string"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | PlatformMediaAssetOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/super-admin/media/{asset_id}`

Super Admin Media Archive

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `asset_id` | path | Asset Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/super-admin/media/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/super-admin/blog/{post_id}/gallery/from-media`

Super Admin Blog Gallery From Media

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `post_id` | path | Post Id | oui |

Corps de requête — `application/json` (BlogGalleryFromMediaCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `media_asset_ids` | liste de string | oui | — | `["string"]` |
| `is_cover_id` | Is Cover Id ou null | non | — | `string` |

```json
{
  "media_asset_ids": [
    "string"
  ],
  "is_cover_id": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/blog/string/gallery/from-media" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"media_asset_ids":["string"],"is_cover_id":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | liste de BlogGalleryImageOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/super-admin/blog/{post_id}/gallery`

Super Admin Blog Gallery Add

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `post_id` | path | Post Id | oui |

Corps de requête — `multipart/form-data` (Body_super_admin_blog_gallery_add_api_super_admin_blog__post_id__gallery_post) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `file` | File | oui | — | `string` |
| `alt_text` | Alt Text | oui | — | `string` |
| `caption` | Caption ou null | non | — | `string` |
| `is_cover` | Is Cover | non | — | `False` |
| `display_order` | Display Order | non | — | `0` |

Utiliser un formulaire multipart ; les champs exacts sont disponibles dans Swagger.

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/blog/string/gallery" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -F "file=@/chemin/vers/fichier.pdf" \
  -F "alt_text=string" \
  -F "caption=string" \
  -F "is_cover=false" \
  -F "display_order=0"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | BlogGalleryImageOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/super-admin/blog/{post_id}/gallery/{image_id}`

Super Admin Blog Gallery Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `post_id` | path | Post Id | oui |
| `image_id` | path | Image Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/super-admin/blog/string/gallery/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/super-admin/events/{event_id}/registrations`

Super Admin Event Registrations

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `event_id` | path | Event Id | oui |
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/events/string/registrations?page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Super Admin Event Registrations Api Super Admin Events  Event Id  Registrations Get |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/super-admin/events/{item_id}`

Super Admin Event Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `application/json` (PlatformEventUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `title` | Title ou null | non | — | `string` |
| `event_type` | Event Type ou null | non | — | `string` |
| `description` | Description ou null | non | — | `string` |
| `article_content` | Article Content ou null | non | — | `string` |
| `start_at` | Start At ou null | non | — | `2026-07-21T10:00:00Z` |
| `end_at` | End At ou null | non | — | `2026-07-21T10:00:00Z` |
| `location` | Location ou null | non | — | `string` |
| `is_online` | Is Online ou null | non | — | `False` |
| `attendance_mode` | Attendance Mode ou null | non | — | `in_person` |
| `venue_name` | Venue Name ou null | non | — | `string` |
| `address` | Address ou null | non | — | `string` |
| `city` | City ou null | non | — | `string` |
| `country` | Country ou null | non | — | `string` |
| `map_url` | Map Url ou null | non | — | `string` |
| `online_provider` | Online Provider ou null | non | — | `string` |
| `online_url` | Online Url ou null | non | — | `string` |
| `registration_mode` | Registration Mode ou null | non | — | `internal` |
| `registration_url` | Registration Url ou null | non | — | `string` |
| `capacity` | Capacity ou null | non | — | `1.0` |
| `status` | Status ou null | non | — | `draft` |
| `is_featured` | Is Featured ou null | non | — | `False` |
| `notification_audience` | Notification Audience ou null | non | — | `doctors` |

```json
{
  "title": "string",
  "event_type": "string",
  "description": "string",
  "article_content": "string",
  "start_at": "2026-07-21T10:00:00Z",
  "end_at": "2026-07-21T10:00:00Z",
  "location": "string",
  "is_online": false,
  "attendance_mode": "in_person",
  "venue_name": "string",
  "address": "string",
  "city": "string",
  "country": "string",
  "map_url": "string",
  "online_provider": "string",
  "online_url": "string",
  "registration_mode": "internal",
  "registration_url": "string",
  "capacity": 1.0,
  "status": "draft",
  "is_featured": false,
  "notification_audience": "doctors"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/super-admin/events/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"title":"string","event_type":"string","description":"string","article_content":"string","start_at":"2026-07-21T10:00:00Z","end_at":"2026-07-21T10:00:00Z","location":"string","is_online":false,"attendance_mode":"in_person","venue_name":"string","address":"string","city":"string","country":"string","map_url":"string","online_provider":"string","online_url":"string","registration_mode":"internal","registration_url":"string","capacity":1.0,"status":"draft","is_featured":false,"notification_audience":"doctors"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PlatformEventOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/super-admin/events/{item_id}`

Super Admin Event Cancel

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/super-admin/events/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/super-admin/events/{event_id}/gallery/from-media`

Super Admin Event Gallery From Media

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `event_id` | path | Event Id | oui |

Corps de requête — `application/json` (BlogGalleryFromMediaCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `media_asset_ids` | liste de string | oui | — | `["string"]` |
| `is_cover_id` | Is Cover Id ou null | non | — | `string` |

```json
{
  "media_asset_ids": [
    "string"
  ],
  "is_cover_id": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/events/string/gallery/from-media" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"media_asset_ids":["string"],"is_cover_id":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | liste de EventGalleryImageOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/super-admin/events/{event_id}/gallery`

Super Admin Event Gallery Add

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `event_id` | path | Event Id | oui |

Corps de requête — `multipart/form-data` (Body_super_admin_event_gallery_add_api_super_admin_events__event_id__gallery_post) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `file` | File | oui | — | `string` |
| `alt_text` | Alt Text | oui | — | `string` |
| `caption` | Caption ou null | non | — | `string` |
| `is_cover` | Is Cover | non | — | `False` |
| `display_order` | Display Order | non | — | `0` |

Utiliser un formulaire multipart ; les champs exacts sont disponibles dans Swagger.

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/events/string/gallery" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -F "file=@/chemin/vers/fichier.pdf" \
  -F "alt_text=string" \
  -F "caption=string" \
  -F "is_cover=false" \
  -F "display_order=0"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | EventGalleryImageOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/super-admin/events/{event_id}/gallery/{image_id}`

Super Admin Event Gallery Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `event_id` | path | Event Id | oui |
| `image_id` | path | Image Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/super-admin/events/string/gallery/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/users`

Users List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `sort_by` | query | Sort By | non |
| `sort_order` | query | Sort Order | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/users?page=1&page_size=20&search=string&sort_by=created_at&sort_order=desc" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Users List Api Users Get |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/users`

Users Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (UserCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `first_name` | First Name | oui | — | `string` |
| `last_name` | Last Name | oui | — | `string` |
| `email` | Email | oui | — | `utilisateur@example.com` |
| `phone` | Phone ou null | non | — | `string` |
| `role` | Role | non | — | `SECRETAIRE` |
| `permissions` | Permissions ou null | non | — | `{}` |
| `staff_level` | Staff Level | non | — | `standard` |

```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "utilisateur@example.com",
  "phone": "string",
  "role": "SECRETAIRE",
  "permissions": {},
  "staff_level": "standard"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/users" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"first_name":"string","last_name":"string","email":"utilisateur@example.com","phone":"string","role":"SECRETAIRE","permissions":{},"staff_level":"standard"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | UserOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/users/{user_id}`

Users Get

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `user_id` | path | User Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/users/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | UserOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/users/{user_id}`

Users Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `user_id` | path | User Id | oui |

Corps de requête — `application/json` (UserUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `first_name` | First Name ou null | non | — | `string` |
| `last_name` | Last Name ou null | non | — | `string` |
| `phone` | Phone ou null | non | — | `string` |
| `is_active` | Is Active ou null | non | — | `False` |

```json
{
  "first_name": "string",
  "last_name": "string",
  "phone": "string",
  "is_active": false
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/users/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"first_name":"string","last_name":"string","phone":"string","is_active":false}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | UserOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/users/{user_id}`

Users Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `user_id` | path | User Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/users/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Users Delete Api Users  User Id  Delete |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/users/{user_id}/resend-invitation`

Staff Invitation Resend

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `user_id` | path | User Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/users/string/resend-invitation" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Staff Invitation Resend Api Users  User Id  Resend Invitation Post |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patients`

Patients List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `sort_by` | query | Sort By | non |
| `sort_order` | query | Sort Order | non |
| `status` | query | Status | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patients?page=1&page_size=20&search=string&sort_by=created_at&sort_order=desc&status=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Patients List Api Patients Get |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/patients`

Patients Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (PatientCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `first_name` | First Name | oui | — | `string` |
| `last_name` | Last Name | oui | — | `string` |
| `email` | Email | oui | — | `utilisateur@example.com` |
| `phone` | Phone ou null | non | — | `string` |
| `birth_date` | Birth Date | oui | — | `2026-07-21` |
| `gender` | Gender | oui | — | `M` |
| `address` | Address ou null | non | — | `string` |
| `preferred_whatsapp_language` | Preferred Whatsapp Language | non | — | `fr` |
| `cin` | Cin ou null | non | — | `string` |
| `cin_document_url` | Cin Document Url ou null | non | — | `string` |

```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "utilisateur@example.com",
  "phone": "string",
  "birth_date": "2026-07-21",
  "gender": "M",
  "address": "string",
  "preferred_whatsapp_language": "fr",
  "cin": "string",
  "cin_document_url": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/patients" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"first_name":"string","last_name":"string","email":"utilisateur@example.com","phone":"string","birth_date":"2026-07-21","gender":"M","address":"string","preferred_whatsapp_language":"fr","cin":"string","cin_document_url":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | PatientOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patients/{patient_id}`

Patients Get

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patients/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PatientOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/patients/{patient_id}`

Patients Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Corps de requête — `application/json` (PatientUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `first_name` | First Name ou null | non | — | `string` |
| `last_name` | Last Name ou null | non | — | `string` |
| `phone` | Phone ou null | non | — | `string` |
| `birth_date` | Birth Date ou null | non | — | `2026-07-21` |
| `gender` | Gender ou null | non | — | `M` |
| `email` | Email ou null | non | — | `utilisateur@example.com` |
| `address` | Address ou null | non | — | `string` |
| `status` | Status ou null | non | — | `active` |
| `preferred_whatsapp_language` | Preferred Whatsapp Language ou null | non | — | `fr` |
| `cin` | Cin ou null | non | — | `string` |
| `cin_document_url` | Cin Document Url ou null | non | — | `string` |

```json
{
  "first_name": "string",
  "last_name": "string",
  "phone": "string",
  "birth_date": "2026-07-21",
  "gender": "M",
  "email": "utilisateur@example.com",
  "address": "string",
  "status": "active",
  "preferred_whatsapp_language": "fr",
  "cin": "string",
  "cin_document_url": "string"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/patients/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"first_name":"string","last_name":"string","phone":"string","birth_date":"2026-07-21","gender":"M","email":"utilisateur@example.com","address":"string","status":"active","preferred_whatsapp_language":"fr","cin":"string","cin_document_url":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PatientOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/patients/{patient_id}`

Patients Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/patients/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Patients Delete Api Patients  Patient Id  Delete |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patients/{patient_id}/medical-summary`

Patient Medical Summary Get

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patients/string/medical-summary" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PatientMedicalSummaryOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/patients/{patient_id}/medical-summary`

Patient Medical Summary Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Corps de requête — `application/json` (PatientMedicalSummaryUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `primary_condition` | Primary Condition ou null | non | — | `string` |
| `active_conditions` | liste de string | non | — | `["string"]` |
| `allergies` | liste de string | non | — | `["string"]` |
| `current_treatments` | liste de string | non | — | `["string"]` |
| `next_step` | Next Step ou null | non | — | `string` |

```json
{
  "primary_condition": "string",
  "active_conditions": [
    "string"
  ],
  "allergies": [
    "string"
  ],
  "current_treatments": [
    "string"
  ],
  "next_step": "string"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/patients/string/medical-summary" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"primary_condition":"string","active_conditions":["string"],"allergies":["string"],"current_treatments":["string"],"next_step":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PatientMedicalSummaryOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patients/{patient_id}/report/{file_format}`

Patient Consolidated Report

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |
| `file_format` | path | File Format | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patients/string/report/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patients/{patient_id}/overview`

Patient Overview

Compact patient-centric dashboard payload for mobile clients.

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patients/string/overview" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Patient Overview Api Patients  Patient Id  Overview Get |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/appointments`

Appointments List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | query | Patient Id | non |
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `sort_by` | query | Sort By | non |
| `sort_order` | query | Sort Order | non |
| `status` | query | Status | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/appointments?patient_id=string&page=1&page_size=20&search=string&sort_by=date&sort_order=desc&status=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Appointments List Api Appointments Get |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/appointments`

Appointments Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (AppointmentCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `patient_id` | Patient Id | oui | — | `string` |
| `doctor_id` | Doctor Id ou null | non | — | `string` |
| `date` | Date | oui | — | `2026-07-21` |
| `start_time` | Start Time | oui | — | `string` |
| `end_time` | End Time | oui | — | `string` |
| `reason` | Reason ou null | non | — | `string` |
| `notes` | Notes ou null | non | — | `string` |
| `status` | Status | non | — | `planned` |
| `reminder_enabled` | Reminder Enabled ou null | non | — | `False` |
| `reminder_offset_minutes` | Reminder Offset Minutes ou null | non | — | `60.0` |
| `reminder_channels` | Reminder Channels ou null | non | — | `["WHATSAPP"]` |

```json
{
  "patient_id": "string",
  "doctor_id": "string",
  "date": "2026-07-21",
  "start_time": "string",
  "end_time": "string",
  "reason": "string",
  "notes": "string",
  "status": "planned",
  "reminder_enabled": false,
  "reminder_offset_minutes": 60.0,
  "reminder_channels": [
    "WHATSAPP"
  ]
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/appointments" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"patient_id":"string","doctor_id":"string","date":"2026-07-21","start_time":"string","end_time":"string","reason":"string","notes":"string","status":"planned","reminder_enabled":false,"reminder_offset_minutes":60.0,"reminder_channels":["WHATSAPP"]}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | AppointmentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/appointments/qr/resolve`

Appointments Qr Resolve

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (AppointmentQrScanRequest) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `code` | Code | oui | — | `string` |

```json
{
  "code": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/appointments/qr/resolve" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"code":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentQrScanOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/appointments/qr/confirm`

Appointments Qr Confirm

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (AppointmentQrScanRequest) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `code` | Code | oui | — | `string` |

```json
{
  "code": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/appointments/qr/confirm" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"code":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentQrScanOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/appointments/{appointment_id}`

Appointments Get

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `appointment_id` | path | Appointment Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/appointments/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/appointments/{appointment_id}`

Appointments Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `appointment_id` | path | Appointment Id | oui |

Corps de requête — `application/json` (AppointmentUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `patient_id` | Patient Id ou null | non | — | `string` |
| `doctor_id` | Doctor Id ou null | non | — | `string` |
| `date` | Date ou null | non | — | `2026-07-21` |
| `start_time` | Start Time ou null | non | — | `string` |
| `end_time` | End Time ou null | non | — | `string` |
| `reason` | Reason ou null | non | — | `string` |
| `notes` | Notes ou null | non | — | `string` |
| `status` | Status ou null | non | — | `requested` |
| `reminder_enabled` | Reminder Enabled ou null | non | — | `False` |
| `reminder_offset_minutes` | Reminder Offset Minutes ou null | non | — | `60.0` |
| `reminder_channels` | Reminder Channels ou null | non | — | `["WHATSAPP"]` |

```json
{
  "patient_id": "string",
  "doctor_id": "string",
  "date": "2026-07-21",
  "start_time": "string",
  "end_time": "string",
  "reason": "string",
  "notes": "string",
  "status": "requested",
  "reminder_enabled": false,
  "reminder_offset_minutes": 60.0,
  "reminder_channels": [
    "WHATSAPP"
  ]
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/appointments/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"patient_id":"string","doctor_id":"string","date":"2026-07-21","start_time":"string","end_time":"string","reason":"string","notes":"string","status":"requested","reminder_enabled":false,"reminder_offset_minutes":60.0,"reminder_channels":["WHATSAPP"]}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/appointments/{appointment_id}`

Appointments Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `appointment_id` | path | Appointment Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/appointments/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Appointments Delete Api Appointments  Appointment Id  Delete |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/appointments/{appointment_id}/details`

Contexte opérationnel complet d’un rendez-vous

Retourne le rendez-vous et ses ressources liées. L’accès est limité au cabinet actif et aux utilisateurs autorisés. Pour un patient, les notes internes sont masquées, les documents doivent être partagés et les données financières respectent la configuration du cabinet. Les objets absents valent null et les collections absentes sont toujours des tableaux vides.

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `appointment_id` | path | Appointment Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/appointments/string/details" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentDetailsResponse |
| `401` | Authentification requise. | — |
| `403` | Utilisateur authentifié mais non autorisé. | — |
| `404` | Rendez-vous introuvable dans le cabinet actif. | — |
| `422` | Validation Error | HTTPValidationError |

---

### `PATCH /api/appointments/{appointment_id}/status`

Appointments Status

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `appointment_id` | path | Appointment Id | oui |

Corps de requête — `application/json` (AppointmentStatusUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `status` | Status | oui | — | `requested` |

```json
{
  "status": "requested"
}
```

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/appointments/string/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"status":"requested"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/appointments/{appointment_id}/preparation`

Appointment Preparation Get

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `appointment_id` | path | Appointment Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/appointments/string/preparation" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentPreparationOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/appointments/{appointment_id}/preparation`

Appointment Preparation Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `appointment_id` | path | Appointment Id | oui |

Corps de requête — `application/json` (AppointmentPreparationUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `chief_complaint` | Chief Complaint ou null | non | — | `string` |
| `reported_allergies` | liste de string | non | — | `["string"]` |
| `reported_treatments` | liste de string | non | — | `["string"]` |
| `blood_pressure` | Blood Pressure ou null | non | — | `string` |
| `temperature` | Temperature ou null | non | — | `string` |
| `weight` | Weight ou null | non | — | `string` |
| `height` | Height ou null | non | — | `string` |
| `reception_notes` | Reception Notes ou null | non | — | `string` |
| `status` | Status | non | — | `draft` |

```json
{
  "chief_complaint": "string",
  "reported_allergies": [
    "string"
  ],
  "reported_treatments": [
    "string"
  ],
  "blood_pressure": "string",
  "temperature": "string",
  "weight": "string",
  "height": "string",
  "reception_notes": "string",
  "status": "draft"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/appointments/string/preparation" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"chief_complaint":"string","reported_allergies":["string"],"reported_treatments":["string"],"blood_pressure":"string","temperature":"string","weight":"string","height":"string","reception_notes":"string","status":"draft"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentPreparationOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/appointments/{appointment_id}/preparation/validate`

Appointment Preparation Validate

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `appointment_id` | path | Appointment Id | oui |

Corps de requête — `application/json` (AppointmentPreparationValidate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `chief_complaint` | Chief Complaint ou null | non | — | `string` |
| `reported_allergies` | liste de string | non | — | `["string"]` |
| `reported_treatments` | liste de string | non | — | `["string"]` |
| `doctor_diagnosis` | Doctor Diagnosis | oui | — | `string` |
| `next_step` | Next Step ou null | non | — | `string` |
| `update_medical_summary` | Update Medical Summary | non | — | `True` |

```json
{
  "chief_complaint": "string",
  "reported_allergies": [
    "string"
  ],
  "reported_treatments": [
    "string"
  ],
  "doctor_diagnosis": "string",
  "next_step": "string",
  "update_medical_summary": true
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/appointments/string/preparation/validate" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"chief_complaint":"string","reported_allergies":["string"],"reported_treatments":["string"],"doctor_diagnosis":"string","next_step":"string","update_medical_summary":true}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentPreparationOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/appointments/{appointment_id}/mark-arrived`

Appointments Mark Arrived

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `appointment_id` | path | Appointment Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/appointments/string/mark-arrived" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/appointments/{appointment_id}/start`

Appointments Start

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `appointment_id` | path | Appointment Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/appointments/string/start" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/appointments/{appointment_id}/end`

Appointments End

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `appointment_id` | path | Appointment Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/appointments/string/end" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/appointments/{appointment_id}/mark-absent`

Appointments Mark Absent

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `appointment_id` | path | Appointment Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/appointments/string/mark-absent" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/appointments/{appointment_id}/cancel`

Appointments Cancel

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `appointment_id` | path | Appointment Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/appointments/string/cancel" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | AppointmentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/history`

History List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | query | Patient Id | non |
| `appointment_id` | query | Appointment Id | non |
| `visit_id` | query | Visit Id | non |
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/history?patient_id=string&appointment_id=string&visit_id=string&page=1&page_size=20&search=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response History List Api History Get |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/appointments/{appointment_id}/history`

Appointment History

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `appointment_id` | path | Appointment Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/appointments/string/history" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de OperationHistoryOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patients/{patient_id}/appointment-history`

Patient Appointment History

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patients/string/appointment-history" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de OperationHistoryOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/history/honoraire/{fee_id}`

Fee History

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `fee_id` | path | Fee Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/history/honoraire/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de OperationHistoryOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/security/audit-logs`

Medical Audit Logs

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/security/audit-logs" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `GET /api/patients/{patient_id}/access-logs`

Patient Access Logs

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patients/string/access-logs" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/security/audit-logs/users/{user_id}`

Medical Audit User Logs

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `user_id` | path | User Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/security/audit-logs/users/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/security/audit-logs/export`

Medical Audit Export

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/security/audit-logs/export" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `GET /api/invoices`

Invoices List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | query | Patient Id | non |
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `sort_by` | query | Sort By | non |
| `sort_order` | query | Sort Order | non |
| `status` | query | Status | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/invoices?patient_id=string&page=1&page_size=20&search=string&sort_by=issued_at&sort_order=desc&status=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Invoices List Api Invoices Get |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/invoices`

Invoices Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (InvoiceCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `fee_id` | Fee Id | oui | — | `string` |

```json
{
  "fee_id": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/invoices" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"fee_id":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | InvoiceOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/invoices/from-honoraire/{fee_id}`

Invoices From Fee

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `fee_id` | path | Fee Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/invoices/from-honoraire/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | InvoiceOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/invoices/{invoice_id}`

Invoices Get

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `invoice_id` | path | Invoice Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/invoices/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | InvoiceOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/invoices/{invoice_id}/pdf`

Afficher ou télécharger une facture PDF authentifiée

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `invoice_id` | path | Invoice Id | oui |
| `action` | query | Action | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/invoices/string/pdf?action=preview" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Facture PDF. | — |
| `401` | Authentification requise. | — |
| `403` | Accès financier non autorisé. | — |
| `404` | Facture introuvable dans le cabinet actif. | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/invoices/{invoice_id}/cancel`

Invoices Cancel

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `invoice_id` | path | Invoice Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/invoices/string/cancel" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | InvoiceOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/invoices/{invoice_id}/echeances`

Invoice Due Dates

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `invoice_id` | path | Invoice Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/invoices/string/echeances" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de DueDateOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/invoices/{invoice_id}/echeances`

Créer une échéance de paiement

Crée une échéance rattachée à une facture du cabinet actif. Le patient et l’honoraire sont déduits de la facture. La somme des échéances non annulées ne peut pas dépasser le montant total facturé. L’opération exige un accès en écriture au module Paiements et est inscrite dans l’historique.

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `invoice_id` | path | Invoice Id | oui |

Corps de requête — `application/json` (DueDateCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `amount` | Amount | oui | Montant attendu en MAD. La somme des échéances actives ne peut pas dépasser le total de la facture. | `0` |
| `due_date` | Due Date | oui | Date calendaire d’exigibilité au format ISO 8601 (YYYY-MM-DD). | `2026-07-21` |
| `comment` | Comment ou null | non | Note interne facultative liée à l’échéance. | `string` |
| `guarantee_type` | Guarantee Type | non | Type de garantie : aucune, garant physique, ou chèque de garantie. | `NORMAL` |
| `guarantor_name` | Guarantor Name ou null | non | Obligatoire lorsque guarantee_type vaut GUARANTOR. | `string` |
| `guarantor_cin` | Guarantor Cin ou null | non | CIN obligatoire lorsque guarantee_type vaut GUARANTOR. | `string` |
| `guarantee_cheque_bank` | Guarantee Cheque Bank ou null | non | Banque obligatoire lorsque guarantee_type vaut CHEQUE. | `string` |
| `guarantee_cheque_number` | Guarantee Cheque Number ou null | non | Numéro obligatoire lorsque guarantee_type vaut CHEQUE. | `string` |
| `guarantee_cheque_issue_date` | Guarantee Cheque Issue Date ou null | non | Date d’émission obligatoire pour un chèque de garantie. | `2026-07-21` |
| `guarantee_cheque_due_date` | Guarantee Cheque Due Date ou null | non | Date d’échéance du chèque, postérieure ou égale à sa date d’émission. | `2026-07-21` |

```json
{
  "amount": 0,
  "due_date": "2026-07-21",
  "comment": "string",
  "guarantee_type": "NORMAL",
  "guarantor_name": "string",
  "guarantor_cin": "string",
  "guarantee_cheque_bank": "string",
  "guarantee_cheque_number": "string",
  "guarantee_cheque_issue_date": "2026-07-21",
  "guarantee_cheque_due_date": "2026-07-21"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/invoices/string/echeances" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"amount":0,"due_date":"2026-07-21","comment":"string","guarantee_type":"NORMAL","guarantor_name":"string","guarantor_cin":"string","guarantee_cheque_bank":"string","guarantee_cheque_number":"string","guarantee_cheque_issue_date":"2026-07-21","guarantee_cheque_due_date":"2026-07-21"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Échéance créée avec son statut initial calculé automatiquement. | DueDateOut |
| `401` | Authentification Bearer requise. | — |
| `403` | Permission d’écriture Paiements insuffisante. | — |
| `404` | Facture introuvable dans le cabinet actif. | — |
| `422` | Données invalides, garantie incomplète ou dépassement du total facturé. | — |

---

### `GET /api/echeances`

Due Dates List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `sort_order` | query | Sort Order | non |
| `status` | query | Status | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/echeances?page=1&page_size=20&search=string&sort_order=asc&status=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Due Dates List Api Echeances Get |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/echeances/{item_id}`

Due Date Get

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/echeances/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | DueDateOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/echeances/{item_id}`

Invoice Due Date Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `application/json` (DueDateUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `amount` | Amount ou null | non | — | `0` |
| `due_date` | Due Date ou null | non | — | `2026-07-21` |
| `comment` | Comment ou null | non | — | `string` |
| `status` | Status ou null | non | — | `A_VENIR` |

```json
{
  "amount": 0,
  "due_date": "2026-07-21",
  "comment": "string",
  "status": "A_VENIR"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/echeances/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"amount":0,"due_date":"2026-07-21","comment":"string","status":"A_VENIR"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | DueDateOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/echeances/{item_id}/cancel`

Invoice Due Date Cancel

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/echeances/string/cancel" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | DueDateOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/echeances/{item_id}/documents`

Due Date Documents List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/echeances/string/documents" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de DueDateDocumentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/echeances/{item_id}/documents`

Due Date Document Create

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `multipart/form-data` (Body_due_date_document_create_api_echeances__item_id__documents_post) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `document_type` | Document Type | oui | — | `string` |
| `title` | Title ou null | non | — | `string` |
| `file` | File | oui | — | `string` |

Utiliser un formulaire multipart ; les champs exacts sont disponibles dans Swagger.

Requête de test :

```bash
curl -X POST "$BASE_URL/api/echeances/string/documents" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -F "document_type=string" \
  -F "title=string" \
  -F "file=@/chemin/vers/fichier.pdf"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | DueDateDocumentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/documents-echeance/{document_id}/download`

Due Date Document Download

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `document_id` | path | Document Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/documents-echeance/string/download" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/documents-echeance/{document_id}/preview`

Due Date Document Preview

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `document_id` | path | Document Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/documents-echeance/string/preview" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/documents-echeance/{document_id}`

Due Date Document Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `document_id` | path | Document Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/documents-echeance/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `204` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/payment-methods`

Payment Methods List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `main_type` | query | Main Type | non |
| `active` | query | Active | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/payment-methods?main_type=string&active=False" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de PaymentMethodOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/payment-methods`

Payment Methods Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (PaymentMethodCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `name` | Name | oui | — | `string` |
| `code` | Code | oui | — | `string` |
| `main_type` | Main Type | oui | — | `ESPECE` |
| `subtype` | Subtype ou null | non | — | `CARTE` |
| `is_active` | Is Active | non | — | `True` |

```json
{
  "name": "string",
  "code": "string",
  "main_type": "ESPECE",
  "subtype": "CARTE",
  "is_active": true
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/payment-methods" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"string","code":"string","main_type":"ESPECE","subtype":"CARTE","is_active":true}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | PaymentMethodOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/payment-methods/{item_id}`

Payment Methods Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `application/json` (PaymentMethodUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `name` | Name ou null | non | — | `string` |
| `main_type` | Main Type ou null | non | — | `ESPECE` |
| `subtype` | Subtype ou null | non | — | `CARTE` |
| `is_active` | Is Active ou null | non | — | `False` |

```json
{
  "name": "string",
  "main_type": "ESPECE",
  "subtype": "CARTE",
  "is_active": false
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/payment-methods/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"string","main_type":"ESPECE","subtype":"CARTE","is_active":false}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PaymentMethodOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/bank-accounts`

Bank Accounts List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `active` | query | Active | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/bank-accounts?active=False" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de BankAccountOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/bank-accounts`

Bank Accounts Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (BankAccountCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `label` | Label | oui | — | `string` |
| `bank_name` | Bank Name | oui | — | `string` |
| `account_holder` | Account Holder | oui | — | `string` |
| `rib` | Rib | oui | — | `string` |
| `iban` | Iban ou null | non | — | `string` |
| `is_default` | Is Default | non | — | `False` |
| `is_active` | Is Active | non | — | `True` |

```json
{
  "label": "string",
  "bank_name": "string",
  "account_holder": "string",
  "rib": "string",
  "iban": "string",
  "is_default": false,
  "is_active": true
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/bank-accounts" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"label":"string","bank_name":"string","account_holder":"string","rib":"string","iban":"string","is_default":false,"is_active":true}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | BankAccountOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/bank-accounts/{item_id}`

Bank Accounts Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `application/json` (BankAccountUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `label` | Label ou null | non | — | `string` |
| `bank_name` | Bank Name ou null | non | — | `string` |
| `account_holder` | Account Holder ou null | non | — | `string` |
| `rib` | Rib ou null | non | — | `string` |
| `iban` | Iban ou null | non | — | `string` |
| `is_default` | Is Default ou null | non | — | `False` |
| `is_active` | Is Active ou null | non | — | `False` |

```json
{
  "label": "string",
  "bank_name": "string",
  "account_holder": "string",
  "rib": "string",
  "iban": "string",
  "is_default": false,
  "is_active": false
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/bank-accounts/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"label":"string","bank_name":"string","account_holder":"string","rib":"string","iban":"string","is_default":false,"is_active":false}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | BankAccountOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/visits`

Visits List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | query | Patient Id | non |
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `sort_by` | query | Sort By | non |
| `sort_order` | query | Sort Order | non |
| `status` | query | Status | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/visits?patient_id=string&page=1&page_size=20&search=string&sort_by=visit_date&sort_order=desc&status=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Visits List Api Visits Get |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/visits`

Visits Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (VisitCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `patient_id` | Patient Id | oui | — | `string` |
| `doctor_id` | Doctor Id ou null | non | — | `string` |
| `appointment_id` | Appointment Id ou null | non | — | `string` |
| `visit_date` | Visit Date | oui | — | `2026-07-21` |
| `reason` | Reason ou null | non | — | `string` |
| `notes` | Notes ou null | non | — | `string` |
| `attendance_status` | Attendance Status | non | — | `present` |

```json
{
  "patient_id": "string",
  "doctor_id": "string",
  "appointment_id": "string",
  "visit_date": "2026-07-21",
  "reason": "string",
  "notes": "string",
  "attendance_status": "present"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/visits" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"patient_id":"string","doctor_id":"string","appointment_id":"string","visit_date":"2026-07-21","reason":"string","notes":"string","attendance_status":"present"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | VisitOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/visits/from-appointment/{appointment_id}`

Visits From Appointment

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `appointment_id` | path | Appointment Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/visits/from-appointment/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | VisitOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/visits/{visit_id}`

Visits Get

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `visit_id` | path | Visit Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/visits/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | VisitOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/visits/{visit_id}`

Visits Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `visit_id` | path | Visit Id | oui |

Corps de requête — `application/json` (VisitUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `visit_date` | Visit Date ou null | non | — | `2026-07-21` |
| `reason` | Reason ou null | non | — | `string` |
| `notes` | Notes ou null | non | — | `string` |
| `attendance_status` | Attendance Status ou null | non | — | `present` |

```json
{
  "visit_date": "2026-07-21",
  "reason": "string",
  "notes": "string",
  "attendance_status": "present"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/visits/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"visit_date":"2026-07-21","reason":"string","notes":"string","attendance_status":"present"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | VisitOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/visits/{visit_id}`

Visits Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `visit_id` | path | Visit Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/visits/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Visits Delete Api Visits  Visit Id  Delete |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/honoraires`

Honoraires List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | query | Patient Id | non |
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `sort_by` | query | Sort By | non |
| `sort_order` | query | Sort Order | non |
| `status` | query | Status | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/honoraires?patient_id=string&page=1&page_size=20&search=string&sort_by=created_at&sort_order=desc&status=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Honoraires List Api Honoraires Get |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/honoraires`

Honoraires Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (FeeCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `patient_id` | Patient Id | oui | — | `string` |
| `amount` | Amount ou null | non | — | `0` |
| `amount_ht` | Amount Ht ou null | non | — | `0` |
| `tax_rate` | Tax Rate | non | — | `0` |
| `doctor_id` | Doctor Id ou null | non | — | `string` |
| `title` | Title | non | — | `Consultation` |
| `description` | Description ou null | non | — | `string` |
| `fee_type` | Fee Type | non | — | `CONSULTATION` |
| `due_date` | Due Date ou null | non | — | `2026-07-21` |
| `appointment_ids` | liste de string | non | — | `["string"]` |
| `visit_ids` | liste de string | non | — | `["string"]` |

```json
{
  "patient_id": "string",
  "amount": 0,
  "amount_ht": 0,
  "tax_rate": 0,
  "doctor_id": "string",
  "title": "Consultation",
  "description": "string",
  "fee_type": "CONSULTATION",
  "due_date": "2026-07-21",
  "appointment_ids": [
    "string"
  ],
  "visit_ids": [
    "string"
  ]
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/honoraires" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"patient_id":"string","amount":0,"amount_ht":0,"tax_rate":0,"doctor_id":"string","title":"Consultation","description":"string","fee_type":"CONSULTATION","due_date":"2026-07-21","appointment_ids":["string"],"visit_ids":["string"]}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | FeeOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/honoraires/{fee_id}`

Honoraires Get

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `fee_id` | path | Fee Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/honoraires/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | FeeOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/honoraires/{fee_id}`

Honoraires Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `fee_id` | path | Fee Id | oui |

Corps de requête — `application/json` (FeeUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `amount` | Amount ou null | non | — | `0` |
| `amount_ht` | Amount Ht ou null | non | — | `0` |
| `tax_rate` | Tax Rate ou null | non | — | `0.0` |
| `title` | Title ou null | non | — | `string` |
| `description` | Description ou null | non | — | `string` |
| `fee_type` | Fee Type ou null | non | — | `string` |
| `due_date` | Due Date ou null | non | — | `2026-07-21` |
| `status` | Status ou null | non | — | `draft` |

```json
{
  "amount": 0,
  "amount_ht": 0,
  "tax_rate": 0.0,
  "title": "string",
  "description": "string",
  "fee_type": "string",
  "due_date": "2026-07-21",
  "status": "draft"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/honoraires/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"amount":0,"amount_ht":0,"tax_rate":0.0,"title":"string","description":"string","fee_type":"string","due_date":"2026-07-21","status":"draft"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | FeeOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/honoraires/{fee_id}`

Honoraires Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `fee_id` | path | Fee Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/honoraires/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Honoraires Delete Api Honoraires  Fee Id  Delete |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/fee-settings`

Fee Settings Get

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/fee-settings" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | FeeTypePrices |

---

### `PUT /api/doctor/fee-settings`

Fee Settings Update

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (FeeTypePrices) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `prices` | Prices | oui | — | `{}` |
| `tax_rates` | Tax Rates | non | — | `{}` |

```json
{
  "prices": {},
  "tax_rates": {}
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/doctor/fee-settings" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"prices":{},"tax_rates":{}}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | FeeTypePrices |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/payment-settings`

Payment Settings Get

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/payment-settings" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PaymentSettings |

---

### `PUT /api/doctor/payment-settings`

Payment Settings Update

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (PaymentSettings) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `methods` | liste de string | oui | — | `["cash"]` |
| `settlement_types` | liste de string | oui | — | `["immediate"]` |
| `default_method` | Default Method | non | — | `cash` |
| `default_settlement_type` | Default Settlement Type | non | — | `immediate` |
| `default_due_days` | Default Due Days | non | — | `30` |
| `default_installments` | Default Installments | non | — | `3` |
| `grace_days` | Grace Days | non | — | `0` |

```json
{
  "methods": [
    "cash"
  ],
  "settlement_types": [
    "immediate"
  ],
  "default_method": "cash",
  "default_settlement_type": "immediate",
  "default_due_days": 30,
  "default_installments": 3,
  "grace_days": 0
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/doctor/payment-settings" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"methods":["cash"],"settlement_types":["immediate"],"default_method":"cash","default_settlement_type":"immediate","default_due_days":30,"default_installments":3,"grace_days":0}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PaymentSettings |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/honoraires/{fee_id}/rendez-vous/{appointment_id}`

Honoraires Link Appointment

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `fee_id` | path | Fee Id | oui |
| `appointment_id` | path | Appointment Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/honoraires/string/rendez-vous/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | FeeOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/honoraires/{fee_id}/rendez-vous/{appointment_id}`

Honoraires Unlink Appointment

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `fee_id` | path | Fee Id | oui |
| `appointment_id` | path | Appointment Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/honoraires/string/rendez-vous/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | FeeOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/honoraires/{fee_id}/visites/{visit_id}`

Honoraires Link Visit

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `fee_id` | path | Fee Id | oui |
| `visit_id` | path | Visit Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/honoraires/string/visites/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | FeeOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/honoraires/{fee_id}/visites/{visit_id}`

Honoraires Unlink Visit

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `fee_id` | path | Fee Id | oui |
| `visit_id` | path | Visit Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/honoraires/string/visites/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | FeeOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/honoraires/{fee_id}/paiements`

Honoraires Payments

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `fee_id` | path | Fee Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/honoraires/string/paiements" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de PaymentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/honoraires/{fee_id}/paiements`

Honoraires Add Payment

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `fee_id` | path | Fee Id | oui |

Corps de requête — `application/json` (HonorairePaymentCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `amount` | Amount | oui | — | `0` |
| `method` | Method | non | — | `cash` |
| `payment_type` | Payment Type | non | — | `immediate` |
| `due_date` | Due Date ou null | non | — | `2026-07-21` |
| `installment_count` | Installment Count ou null | non | — | `2.0` |
| `cheque_bank` | Cheque Bank ou null | non | — | `string` |
| `cheque_number` | Cheque Number ou null | non | — | `string` |
| `cheque_owner_name` | Cheque Owner Name ou null | non | — | `string` |
| `cheque_owner_cin` | Cheque Owner Cin ou null | non | — | `string` |
| `cheque_deposit_date` | Cheque Deposit Date ou null | non | — | `2026-07-21` |
| `cheque_issue_date` | Cheque Issue Date ou null | non | — | `2026-07-21` |
| `cheque_cashing_date` | Cheque Cashing Date ou null | non | — | `2026-07-21` |
| `cheque_status` | Cheque Status ou null | non | — | `RECU` |
| `cheque_expected_cashing_date` | Cheque Expected Cashing Date ou null | non | — | `2026-07-21` |
| `cheque_collection_method` | Cheque Collection Method ou null | non | — | `DEPOT_BANCAIRE` |
| `cheque_rejection_reason` | Cheque Rejection Reason ou null | non | — | `string` |
| `cheque_rejected_at` | Cheque Rejected At ou null | non | — | `2026-07-21` |
| `note` | Note ou null | non | — | `string` |
| `reference` | Reference ou null | non | — | `string` |
| `due_date_id` | Due Date Id ou null | non | — | `string` |
| `bank_account_id` | Bank Account Id ou null | non | — | `string` |

```json
{
  "amount": 0,
  "method": "cash",
  "payment_type": "immediate",
  "due_date": "2026-07-21",
  "installment_count": 2.0,
  "cheque_bank": "string",
  "cheque_number": "string",
  "cheque_owner_name": "string",
  "cheque_owner_cin": "string",
  "cheque_deposit_date": "2026-07-21",
  "cheque_issue_date": "2026-07-21",
  "cheque_cashing_date": "2026-07-21",
  "cheque_status": "RECU",
  "cheque_expected_cashing_date": "2026-07-21",
  "cheque_collection_method": "DEPOT_BANCAIRE",
  "cheque_rejection_reason": "string",
  "cheque_rejected_at": "2026-07-21",
  "note": "string",
  "reference": "string",
  "due_date_id": "string",
  "bank_account_id": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/honoraires/string/paiements" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"amount":0,"method":"cash","payment_type":"immediate","due_date":"2026-07-21","installment_count":2.0,"cheque_bank":"string","cheque_number":"string","cheque_owner_name":"string","cheque_owner_cin":"string","cheque_deposit_date":"2026-07-21","cheque_issue_date":"2026-07-21","cheque_cashing_date":"2026-07-21","cheque_status":"RECU","cheque_expected_cashing_date":"2026-07-21","cheque_collection_method":"DEPOT_BANCAIRE","cheque_rejection_reason":"string","cheque_rejected_at":"2026-07-21","note":"string","reference":"string","due_date_id":"string","bank_account_id":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | PaymentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/honoraires/{fee_id}/resume`

Honoraires Summary

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `fee_id` | path | Fee Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/honoraires/string/resume" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Honoraires Summary Api Honoraires  Fee Id  Resume Get |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patients/{patient_id}/situation-financiere`

Patient Financial Situation

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patients/string/situation-financiere" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Patient Financial Situation Api Patients  Patient Id  Situation Financiere Get |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/payments`

Payments List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | query | Patient Id | non |
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `sort_by` | query | Sort By | non |
| `sort_order` | query | Sort Order | non |
| `status` | query | Status | non |
| `method` | query | Method | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/payments?patient_id=string&page=1&page_size=20&search=string&sort_by=created_at&sort_order=desc&status=string&method=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Payments List Api Payments Get |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/payments`

Payments Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (PaymentCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `patient_id` | Patient Id | oui | — | `string` |
| `fee_id` | Fee Id | oui | — | `string` |
| `amount` | Amount | oui | — | `0` |
| `method` | Method | non | — | `cash` |
| `payment_type` | Payment Type | non | — | `immediate` |
| `due_date` | Due Date ou null | non | — | `2026-07-21` |
| `installment_count` | Installment Count ou null | non | — | `2.0` |
| `cheque_bank` | Cheque Bank ou null | non | — | `string` |
| `cheque_number` | Cheque Number ou null | non | — | `string` |
| `cheque_owner_name` | Cheque Owner Name ou null | non | — | `string` |
| `cheque_owner_cin` | Cheque Owner Cin ou null | non | — | `string` |
| `cheque_deposit_date` | Cheque Deposit Date ou null | non | — | `2026-07-21` |
| `cheque_issue_date` | Cheque Issue Date ou null | non | — | `2026-07-21` |
| `cheque_cashing_date` | Cheque Cashing Date ou null | non | — | `2026-07-21` |
| `cheque_status` | Cheque Status ou null | non | — | `RECU` |
| `cheque_expected_cashing_date` | Cheque Expected Cashing Date ou null | non | — | `2026-07-21` |
| `cheque_collection_method` | Cheque Collection Method ou null | non | — | `DEPOT_BANCAIRE` |
| `cheque_rejection_reason` | Cheque Rejection Reason ou null | non | — | `string` |
| `cheque_rejected_at` | Cheque Rejected At ou null | non | — | `2026-07-21` |
| `invoice_id` | Invoice Id ou null | non | — | `string` |
| `note` | Note ou null | non | — | `string` |
| `reference` | Reference ou null | non | — | `string` |
| `payment_method_id` | Payment Method Id ou null | non | — | `string` |
| `bank_account_id` | Bank Account Id ou null | non | — | `string` |
| `due_date_id` | Due Date Id ou null | non | — | `string` |

```json
{
  "patient_id": "string",
  "fee_id": "string",
  "amount": 0,
  "method": "cash",
  "payment_type": "immediate",
  "due_date": "2026-07-21",
  "installment_count": 2.0,
  "cheque_bank": "string",
  "cheque_number": "string",
  "cheque_owner_name": "string",
  "cheque_owner_cin": "string",
  "cheque_deposit_date": "2026-07-21",
  "cheque_issue_date": "2026-07-21",
  "cheque_cashing_date": "2026-07-21",
  "cheque_status": "RECU",
  "cheque_expected_cashing_date": "2026-07-21",
  "cheque_collection_method": "DEPOT_BANCAIRE",
  "cheque_rejection_reason": "string",
  "cheque_rejected_at": "2026-07-21",
  "invoice_id": "string",
  "note": "string",
  "reference": "string",
  "payment_method_id": "string",
  "bank_account_id": "string",
  "due_date_id": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/payments" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"patient_id":"string","fee_id":"string","amount":0,"method":"cash","payment_type":"immediate","due_date":"2026-07-21","installment_count":2.0,"cheque_bank":"string","cheque_number":"string","cheque_owner_name":"string","cheque_owner_cin":"string","cheque_deposit_date":"2026-07-21","cheque_issue_date":"2026-07-21","cheque_cashing_date":"2026-07-21","cheque_status":"RECU","cheque_expected_cashing_date":"2026-07-21","cheque_collection_method":"DEPOT_BANCAIRE","cheque_rejection_reason":"string","cheque_rejected_at":"2026-07-21","invoice_id":"string","note":"string","reference":"string","payment_method_id":"string","bank_account_id":"string","due_date_id":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | PaymentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/payments/{payment_id}/cheque-documents`

Payment Cheque Documents Upload

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `payment_id` | path | Payment Id | oui |

Corps de requête — `multipart/form-data` (Body_payment_cheque_documents_upload_api_payments__payment_id__cheque_documents_post) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `cheque_file` | Cheque File | oui | — | `string` |
| `owner_cin_file` | Owner Cin File | oui | — | `string` |

Utiliser un formulaire multipart ; les champs exacts sont disponibles dans Swagger.

Requête de test :

```bash
curl -X POST "$BASE_URL/api/payments/string/cheque-documents" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -F "cheque_file=@/chemin/vers/fichier.pdf" \
  -F "owner_cin_file=@/chemin/vers/fichier.pdf"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/payments/{payment_id}/cheque-documents/{document_type}/preview`

Payment Cheque Document Preview

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `payment_id` | path | Payment Id | oui |
| `document_type` | path | Document Type | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/payments/string/cheque-documents/string/preview" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/payments/{payment_id}`

Payments Get

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `payment_id` | path | Payment Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/payments/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PaymentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/payments/{payment_id}`

Payments Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `payment_id` | path | Payment Id | oui |

Corps de requête — `application/json` (PaymentUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `amount` | Amount ou null | non | — | `0` |
| `method` | Method ou null | non | — | `string` |
| `payment_type` | Payment Type ou null | non | — | `immediate` |
| `due_date` | Due Date ou null | non | — | `2026-07-21` |
| `installment_count` | Installment Count ou null | non | — | `2.0` |
| `cheque_bank` | Cheque Bank ou null | non | — | `string` |
| `cheque_number` | Cheque Number ou null | non | — | `string` |
| `cheque_owner_name` | Cheque Owner Name ou null | non | — | `string` |
| `cheque_owner_cin` | Cheque Owner Cin ou null | non | — | `string` |
| `cheque_deposit_date` | Cheque Deposit Date ou null | non | — | `2026-07-21` |
| `cheque_issue_date` | Cheque Issue Date ou null | non | — | `2026-07-21` |
| `cheque_cashing_date` | Cheque Cashing Date ou null | non | — | `2026-07-21` |
| `cheque_status` | Cheque Status ou null | non | — | `RECU` |
| `cheque_expected_cashing_date` | Cheque Expected Cashing Date ou null | non | — | `2026-07-21` |
| `cheque_collection_method` | Cheque Collection Method ou null | non | — | `DEPOT_BANCAIRE` |
| `cheque_rejection_reason` | Cheque Rejection Reason ou null | non | — | `string` |
| `cheque_rejected_at` | Cheque Rejected At ou null | non | — | `2026-07-21` |
| `note` | Note ou null | non | — | `string` |
| `status` | Status ou null | non | — | `EN_ATTENTE` |
| `due_date_id` | Due Date Id ou null | non | — | `string` |
| `bank_account_id` | Bank Account Id ou null | non | — | `string` |

```json
{
  "amount": 0,
  "method": "string",
  "payment_type": "immediate",
  "due_date": "2026-07-21",
  "installment_count": 2.0,
  "cheque_bank": "string",
  "cheque_number": "string",
  "cheque_owner_name": "string",
  "cheque_owner_cin": "string",
  "cheque_deposit_date": "2026-07-21",
  "cheque_issue_date": "2026-07-21",
  "cheque_cashing_date": "2026-07-21",
  "cheque_status": "RECU",
  "cheque_expected_cashing_date": "2026-07-21",
  "cheque_collection_method": "DEPOT_BANCAIRE",
  "cheque_rejection_reason": "string",
  "cheque_rejected_at": "2026-07-21",
  "note": "string",
  "status": "EN_ATTENTE",
  "due_date_id": "string",
  "bank_account_id": "string"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/payments/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"amount":0,"method":"string","payment_type":"immediate","due_date":"2026-07-21","installment_count":2.0,"cheque_bank":"string","cheque_number":"string","cheque_owner_name":"string","cheque_owner_cin":"string","cheque_deposit_date":"2026-07-21","cheque_issue_date":"2026-07-21","cheque_cashing_date":"2026-07-21","cheque_status":"RECU","cheque_expected_cashing_date":"2026-07-21","cheque_collection_method":"DEPOT_BANCAIRE","cheque_rejection_reason":"string","cheque_rejected_at":"2026-07-21","note":"string","status":"EN_ATTENTE","due_date_id":"string","bank_account_id":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PaymentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/payments/{payment_id}`

Payments Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `payment_id` | path | Payment Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/payments/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Payments Delete Api Payments  Payment Id  Delete |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/finance/reports/monthly/{file_format}`

Finance Monthly Report

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `file_format` | path | File Format | oui |
| `year` | query | Year | oui |
| `month` | query | Month | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/finance/reports/monthly/string?year=2000&month=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/expense-suppliers`

Expense Suppliers List

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/expense-suppliers" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de ExpenseSupplierOut |

---

### `POST /api/expense-suppliers`

Expense Suppliers Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (ExpenseSupplierCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `name` | Name | oui | — | `string` |
| `supplier_type` | Supplier Type | oui | — | `string` |
| `tax_id` | Tax Id ou null | non | — | `string` |
| `phone` | Phone ou null | non | — | `string` |
| `email` | Email ou null | non | — | `string` |
| `address` | Address ou null | non | — | `string` |
| `is_active` | Is Active | non | — | `True` |

```json
{
  "name": "string",
  "supplier_type": "string",
  "tax_id": "string",
  "phone": "string",
  "email": "string",
  "address": "string",
  "is_active": true
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/expense-suppliers" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"string","supplier_type":"string","tax_id":"string","phone":"string","email":"string","address":"string","is_active":true}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | ExpenseSupplierOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/supplier-products`

Supplier Products List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `supplier_id` | query | Supplier Id | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/supplier-products?supplier_id=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de SupplierProductOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/supplier-products`

Supplier Products Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (SupplierProductCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `supplier_id` | Supplier Id | oui | — | `string` |
| `name` | Name | oui | — | `string` |
| `category` | Category | oui | — | `string` |
| `unit` | Unit | non | — | `unité` |
| `default_unit_price_ht` | Default Unit Price Ht | oui | — | `0.0` |
| `tax_rate` | Tax Rate | non | — | `0` |
| `is_active` | Is Active | non | — | `True` |

```json
{
  "supplier_id": "string",
  "name": "string",
  "category": "string",
  "unit": "unité",
  "default_unit_price_ht": 0.0,
  "tax_rate": 0,
  "is_active": true
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/supplier-products" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"supplier_id":"string","name":"string","category":"string","unit":"unité","default_unit_price_ht":0.0,"tax_rate":0,"is_active":true}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | SupplierProductOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/expenses`

Expenses List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `date_from` | query | Date From | non |
| `date_to` | query | Date To | non |
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `sort_by` | query | Sort By | non |
| `sort_order` | query | Sort Order | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/expenses?date_from=2026-07-21&date_to=2026-07-21&page=1&page_size=20&search=string&sort_by=created_at&sort_order=desc" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Expenses List Api Expenses Get |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/expenses`

Expenses Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (ExpenseCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `label` | Label | oui | — | `string` |
| `category` | Category | oui | — | `string` |
| `expense_type` | Expense Type | oui | — | `FIXE` |
| `amount` | Amount ou null | non | — | `0` |
| `expense_date` | Expense Date | oui | — | `2026-07-21` |
| `supplier_id` | Supplier Id ou null | non | — | `string` |
| `supplier` | Supplier ou null | non | — | `string` |
| `description` | Description ou null | non | — | `string` |
| `items` | Items ou null | non | — | `[{"product_id":"string","description":"string","quantity":0,"unit":"string","unit_price_ht":0.0,"tax_rate":0.0}]` |
| `items[].product_id` | Product Id | oui | — | `string` |
| `items[].description` | Description | oui | — | `string` |
| `items[].quantity` | Quantity | oui | — | `0` |
| `items[].unit` | Unit | oui | — | `string` |
| `items[].unit_price_ht` | Unit Price Ht | oui | — | `0.0` |
| `items[].tax_rate` | Tax Rate | oui | — | `0.0` |
| `amount_ht` | Amount Ht ou null | non | — | `0` |
| `tax_amount` | Tax Amount ou null | non | — | `0` |
| `amount_ttc` | Amount Ttc ou null | non | — | `0` |
| `payment_method` | Payment Method ou null | non | — | `string` |
| `bank_account_id` | Bank Account Id ou null | non | — | `string` |
| `reference` | Reference ou null | non | — | `string` |
| `note` | Note ou null | non | — | `string` |

```json
{
  "label": "string",
  "category": "string",
  "expense_type": "FIXE",
  "amount": 0,
  "expense_date": "2026-07-21",
  "supplier_id": "string",
  "supplier": "string",
  "description": "string",
  "items": [
    {
      "product_id": "string",
      "description": "string",
      "quantity": 0,
      "unit": "string",
      "unit_price_ht": 0.0,
      "tax_rate": 0.0
    }
  ],
  "amount_ht": 0,
  "tax_amount": 0,
  "amount_ttc": 0,
  "payment_method": "string",
  "bank_account_id": "string",
  "reference": "string",
  "note": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/expenses" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"label":"string","category":"string","expense_type":"FIXE","amount":0,"expense_date":"2026-07-21","supplier_id":"string","supplier":"string","description":"string","items":[{"product_id":"string","description":"string","quantity":0,"unit":"string","unit_price_ht":0.0,"tax_rate":0.0}],"amount_ht":0,"tax_amount":0,"amount_ttc":0,"payment_method":"string","bank_account_id":"string","reference":"string","note":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | ExpenseOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/expenses/{item_id}`

Expenses Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `application/json` (ExpenseCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `label` | Label | oui | — | `string` |
| `category` | Category | oui | — | `string` |
| `expense_type` | Expense Type | oui | — | `FIXE` |
| `amount` | Amount ou null | non | — | `0` |
| `expense_date` | Expense Date | oui | — | `2026-07-21` |
| `supplier_id` | Supplier Id ou null | non | — | `string` |
| `supplier` | Supplier ou null | non | — | `string` |
| `description` | Description ou null | non | — | `string` |
| `items` | Items ou null | non | — | `[{"product_id":"string","description":"string","quantity":0,"unit":"string","unit_price_ht":0.0,"tax_rate":0.0}]` |
| `items[].product_id` | Product Id | oui | — | `string` |
| `items[].description` | Description | oui | — | `string` |
| `items[].quantity` | Quantity | oui | — | `0` |
| `items[].unit` | Unit | oui | — | `string` |
| `items[].unit_price_ht` | Unit Price Ht | oui | — | `0.0` |
| `items[].tax_rate` | Tax Rate | oui | — | `0.0` |
| `amount_ht` | Amount Ht ou null | non | — | `0` |
| `tax_amount` | Tax Amount ou null | non | — | `0` |
| `amount_ttc` | Amount Ttc ou null | non | — | `0` |
| `payment_method` | Payment Method ou null | non | — | `string` |
| `bank_account_id` | Bank Account Id ou null | non | — | `string` |
| `reference` | Reference ou null | non | — | `string` |
| `note` | Note ou null | non | — | `string` |

```json
{
  "label": "string",
  "category": "string",
  "expense_type": "FIXE",
  "amount": 0,
  "expense_date": "2026-07-21",
  "supplier_id": "string",
  "supplier": "string",
  "description": "string",
  "items": [
    {
      "product_id": "string",
      "description": "string",
      "quantity": 0,
      "unit": "string",
      "unit_price_ht": 0.0,
      "tax_rate": 0.0
    }
  ],
  "amount_ht": 0,
  "tax_amount": 0,
  "amount_ttc": 0,
  "payment_method": "string",
  "bank_account_id": "string",
  "reference": "string",
  "note": "string"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/expenses/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"label":"string","category":"string","expense_type":"FIXE","amount":0,"expense_date":"2026-07-21","supplier_id":"string","supplier":"string","description":"string","items":[{"product_id":"string","description":"string","quantity":0,"unit":"string","unit_price_ht":0.0,"tax_rate":0.0}],"amount_ht":0,"tax_amount":0,"amount_ttc":0,"payment_method":"string","bank_account_id":"string","reference":"string","note":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | ExpenseOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/expenses/{item_id}`

Expenses Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/expenses/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/purchase-orders`

Purchase Orders List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `sort_by` | query | Sort By | non |
| `sort_order` | query | Sort Order | non |
| `status` | query | Status | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/purchase-orders?page=1&page_size=20&search=string&sort_by=created_at&sort_order=desc&status=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Purchase Orders List Api Purchase Orders Get |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/purchase-orders`

Purchase Orders Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (PurchaseOrderCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `supplier` | Supplier | oui | — | `string` |
| `description` | Description | oui | — | `string` |
| `amount` | Amount | oui | — | `0` |
| `order_date` | Order Date | oui | — | `2026-07-21` |
| `expected_date` | Expected Date ou null | non | — | `2026-07-21` |
| `status` | Status | non | — | `BROUILLON` |
| `note` | Note ou null | non | — | `string` |

```json
{
  "supplier": "string",
  "description": "string",
  "amount": 0,
  "order_date": "2026-07-21",
  "expected_date": "2026-07-21",
  "status": "BROUILLON",
  "note": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/purchase-orders" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"supplier":"string","description":"string","amount":0,"order_date":"2026-07-21","expected_date":"2026-07-21","status":"BROUILLON","note":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | PurchaseOrderOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/purchase-orders/{item_id}`

Purchase Orders Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `application/json` (PurchaseOrderCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `supplier` | Supplier | oui | — | `string` |
| `description` | Description | oui | — | `string` |
| `amount` | Amount | oui | — | `0` |
| `order_date` | Order Date | oui | — | `2026-07-21` |
| `expected_date` | Expected Date ou null | non | — | `2026-07-21` |
| `status` | Status | non | — | `BROUILLON` |
| `note` | Note ou null | non | — | `string` |

```json
{
  "supplier": "string",
  "description": "string",
  "amount": 0,
  "order_date": "2026-07-21",
  "expected_date": "2026-07-21",
  "status": "BROUILLON",
  "note": "string"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/purchase-orders/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"supplier":"string","description":"string","amount":0,"order_date":"2026-07-21","expected_date":"2026-07-21","status":"BROUILLON","note":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PurchaseOrderOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/purchase-orders/{item_id}`

Purchase Orders Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/purchase-orders/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/paiements/{payment_id}/documents`

Payment Documents List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `payment_id` | path | Payment Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/paiements/string/documents" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de PaymentDocumentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/paiements/{payment_id}/documents`

Payment Documents Create

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `payment_id` | path | Payment Id | oui |

Corps de requête — `application/json` (PaymentDocumentCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `document_type` | Document Type | oui | — | `recu` |

```json
{
  "document_type": "recu"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/paiements/string/documents" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"document_type":"recu"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | PaymentDocumentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/documents-paiement/{document_id}/download`

Payment Document Download

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `document_id` | path | Document Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/documents-paiement/string/download" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/documents-paiement/{document_id}/preview`

Payment Document Preview

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `document_id` | path | Document Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/documents-paiement/string/preview" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/cnss`

Cnss List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | query | Patient Id | non |
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `sort_by` | query | Sort By | non |
| `sort_order` | query | Sort Order | non |
| `status` | query | Status | non |
| `doctor_id` | query | Doctor Id | non |
| `cabinet_name` | query | Cabinet Name | non |
| `date_from` | query | Date From | non |
| `date_to` | query | Date To | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/cnss?patient_id=string&page=1&page_size=20&search=string&sort_by=created_at&sort_order=desc&status=string&doctor_id=string&cabinet_name=string&date_from=2026-07-21&date_to=2026-07-21" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Cnss List Api Cnss Get |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/cnss`

Cnss Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (CNSSCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `patient_id` | Patient Id | oui | — | `string` |
| `fee_id` | Fee Id ou null | non | — | `string` |
| `visit_id` | Visit Id ou null | non | — | `string` |
| `appointment_id` | Appointment Id ou null | non | — | `string` |
| `reference` | Reference ou null | non | — | `string` |
| `label` | Label | non | — | `Dossier CNSS/CNOPS` |
| `description` | Description ou null | non | — | `string` |
| `internal_notes` | Internal Notes ou null | non | — | `string` |
| `requested_amount` | Requested Amount | non | — | `0.00` |
| `total_amount` | Total Amount ou null | non | — | `0.0` |
| `estimated_reimbursable_amount` | Estimated Reimbursable Amount ou null | non | — | `0.0` |
| `reimbursed_amount` | Reimbursed Amount ou null | non | — | `0.0` |
| `status` | Status | non | — | `REQUESTED` |
| `delivery_confirmed_at` | Delivery Confirmed At ou null | non | — | `2026-07-21T10:00:00Z` |
| `deposit_date` | Deposit Date ou null | non | — | `2026-07-21` |
| `deposit_deadline` | Deposit Deadline ou null | non | — | `2026-07-21` |
| `deposit_reference` | Deposit Reference ou null | non | — | `string` |
| `decision_date` | Decision Date ou null | non | — | `2026-07-21` |
| `rejection_code` | Rejection Code ou null | non | — | `string` |
| `reimbursement_date` | Reimbursement Date ou null | non | — | `2026-07-21` |
| `rejection_reason` | Rejection Reason ou null | non | — | `string` |
| `file_url` | File Url ou null | non | — | `string` |

```json
{
  "patient_id": "string",
  "fee_id": "string",
  "visit_id": "string",
  "appointment_id": "string",
  "reference": "string",
  "label": "Dossier CNSS/CNOPS",
  "description": "string",
  "internal_notes": "string",
  "requested_amount": "0.00",
  "total_amount": 0.0,
  "estimated_reimbursable_amount": 0.0,
  "reimbursed_amount": 0.0,
  "status": "REQUESTED",
  "delivery_confirmed_at": "2026-07-21T10:00:00Z",
  "deposit_date": "2026-07-21",
  "deposit_deadline": "2026-07-21",
  "deposit_reference": "string",
  "decision_date": "2026-07-21",
  "rejection_code": "string",
  "reimbursement_date": "2026-07-21",
  "rejection_reason": "string",
  "file_url": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/cnss" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"patient_id":"string","fee_id":"string","visit_id":"string","appointment_id":"string","reference":"string","label":"Dossier CNSS/CNOPS","description":"string","internal_notes":"string","requested_amount":"0.00","total_amount":0.0,"estimated_reimbursable_amount":0.0,"reimbursed_amount":0.0,"status":"REQUESTED","delivery_confirmed_at":"2026-07-21T10:00:00Z","deposit_date":"2026-07-21","deposit_deadline":"2026-07-21","deposit_reference":"string","decision_date":"2026-07-21","rejection_code":"string","reimbursement_date":"2026-07-21","rejection_reason":"string","file_url":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | CNSSOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/cnss/upload`

Cnss Upload

- Authentification : Bearer JWT requis

Corps de requête — `multipart/form-data` (Body_cnss_upload_api_cnss_upload_post) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `patient_id` | Patient Id | oui | — | `string` |
| `reference` | Reference ou null | non | — | `string` |
| `status_value` | Status Value | non | — | `REQUESTED` |
| `file` | File | oui | — | `string` |

Utiliser un formulaire multipart ; les champs exacts sont disponibles dans Swagger.

Requête de test :

```bash
curl -X POST "$BASE_URL/api/cnss/upload" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -F "patient_id=string" \
  -F "reference=string" \
  -F "status_value=REQUESTED" \
  -F "file=@/chemin/vers/fichier.pdf"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | CNSSOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/cnss/stats`

Cnss Stats

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/cnss/stats" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `GET /api/cnss/{cnss_id}/history`

Cnss History

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `cnss_id` | path | Cnss Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/cnss/string/history" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/cnss/{cnss_id}/documents`

Cnss Documents

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `cnss_id` | path | Cnss Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/cnss/string/documents" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de DocumentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/cnss/{cnss_id}/documents`

Cnss Document Add

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `cnss_id` | path | Cnss Id | oui |

Corps de requête — `multipart/form-data` (Body_cnss_document_add_api_cnss__cnss_id__documents_post) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `title` | Title | oui | — | `string` |
| `document_type` | Document Type | non | — | `CNSS` |
| `shared_with_patient` | Shared With Patient | non | — | `False` |
| `description` | Description ou null | non | — | `string` |
| `document_date` | Document Date ou null | non | — | `2026-07-21` |
| `file` | File | oui | — | `string` |

Utiliser un formulaire multipart ; les champs exacts sont disponibles dans Swagger.

Requête de test :

```bash
curl -X POST "$BASE_URL/api/cnss/string/documents" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -F "title=string" \
  -F "document_type=CNSS" \
  -F "shared_with_patient=false" \
  -F "description=string" \
  -F "document_date=2026-07-21" \
  -F "file=@/chemin/vers/fichier.pdf"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | DocumentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PATCH /api/cnss/{cnss_id}/status`

Cnss Status Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `cnss_id` | path | Cnss Id | oui |

Corps de requête — `application/json` (CNSSUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `fee_id` | Fee Id ou null | non | — | `string` |
| `visit_id` | Visit Id ou null | non | — | `string` |
| `appointment_id` | Appointment Id ou null | non | — | `string` |
| `reference` | Reference ou null | non | — | `string` |
| `label` | Label ou null | non | — | `string` |
| `description` | Description ou null | non | — | `string` |
| `internal_notes` | Internal Notes ou null | non | — | `string` |
| `requested_amount` | Requested Amount ou null | non | — | `0.0` |
| `total_amount` | Total Amount ou null | non | — | `0.0` |
| `estimated_reimbursable_amount` | Estimated Reimbursable Amount ou null | non | — | `0.0` |
| `reimbursed_amount` | Reimbursed Amount ou null | non | — | `0.0` |
| `status` | Status ou null | non | — | `REQUESTED` |
| `delivery_confirmed_at` | Delivery Confirmed At ou null | non | — | `2026-07-21T10:00:00Z` |
| `deposit_date` | Deposit Date ou null | non | — | `2026-07-21` |
| `deposit_deadline` | Deposit Deadline ou null | non | — | `2026-07-21` |
| `deposit_reference` | Deposit Reference ou null | non | — | `string` |
| `decision_date` | Decision Date ou null | non | — | `2026-07-21` |
| `rejection_code` | Rejection Code ou null | non | — | `string` |
| `reimbursement_date` | Reimbursement Date ou null | non | — | `2026-07-21` |
| `rejection_reason` | Rejection Reason ou null | non | — | `string` |
| `status_comment` | Status Comment ou null | non | — | `string` |
| `correction_reason` | Correction Reason ou null | non | — | `string` |
| `file_url` | File Url ou null | non | — | `string` |

```json
{
  "fee_id": "string",
  "visit_id": "string",
  "appointment_id": "string",
  "reference": "string",
  "label": "string",
  "description": "string",
  "internal_notes": "string",
  "requested_amount": 0.0,
  "total_amount": 0.0,
  "estimated_reimbursable_amount": 0.0,
  "reimbursed_amount": 0.0,
  "status": "REQUESTED",
  "delivery_confirmed_at": "2026-07-21T10:00:00Z",
  "deposit_date": "2026-07-21",
  "deposit_deadline": "2026-07-21",
  "deposit_reference": "string",
  "decision_date": "2026-07-21",
  "rejection_code": "string",
  "reimbursement_date": "2026-07-21",
  "rejection_reason": "string",
  "status_comment": "string",
  "correction_reason": "string",
  "file_url": "string"
}
```

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/cnss/string/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"fee_id":"string","visit_id":"string","appointment_id":"string","reference":"string","label":"string","description":"string","internal_notes":"string","requested_amount":0.0,"total_amount":0.0,"estimated_reimbursable_amount":0.0,"reimbursed_amount":0.0,"status":"REQUESTED","delivery_confirmed_at":"2026-07-21T10:00:00Z","deposit_date":"2026-07-21","deposit_deadline":"2026-07-21","deposit_reference":"string","decision_date":"2026-07-21","rejection_code":"string","reimbursement_date":"2026-07-21","rejection_reason":"string","status_comment":"string","correction_reason":"string","file_url":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | CNSSOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/cnss/{cnss_id}`

Cnss Get

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `cnss_id` | path | Cnss Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/cnss/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | CNSSOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/cnss/{cnss_id}`

Cnss Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `cnss_id` | path | Cnss Id | oui |

Corps de requête — `application/json` (CNSSUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `fee_id` | Fee Id ou null | non | — | `string` |
| `visit_id` | Visit Id ou null | non | — | `string` |
| `appointment_id` | Appointment Id ou null | non | — | `string` |
| `reference` | Reference ou null | non | — | `string` |
| `label` | Label ou null | non | — | `string` |
| `description` | Description ou null | non | — | `string` |
| `internal_notes` | Internal Notes ou null | non | — | `string` |
| `requested_amount` | Requested Amount ou null | non | — | `0.0` |
| `total_amount` | Total Amount ou null | non | — | `0.0` |
| `estimated_reimbursable_amount` | Estimated Reimbursable Amount ou null | non | — | `0.0` |
| `reimbursed_amount` | Reimbursed Amount ou null | non | — | `0.0` |
| `status` | Status ou null | non | — | `REQUESTED` |
| `delivery_confirmed_at` | Delivery Confirmed At ou null | non | — | `2026-07-21T10:00:00Z` |
| `deposit_date` | Deposit Date ou null | non | — | `2026-07-21` |
| `deposit_deadline` | Deposit Deadline ou null | non | — | `2026-07-21` |
| `deposit_reference` | Deposit Reference ou null | non | — | `string` |
| `decision_date` | Decision Date ou null | non | — | `2026-07-21` |
| `rejection_code` | Rejection Code ou null | non | — | `string` |
| `reimbursement_date` | Reimbursement Date ou null | non | — | `2026-07-21` |
| `rejection_reason` | Rejection Reason ou null | non | — | `string` |
| `status_comment` | Status Comment ou null | non | — | `string` |
| `correction_reason` | Correction Reason ou null | non | — | `string` |
| `file_url` | File Url ou null | non | — | `string` |

```json
{
  "fee_id": "string",
  "visit_id": "string",
  "appointment_id": "string",
  "reference": "string",
  "label": "string",
  "description": "string",
  "internal_notes": "string",
  "requested_amount": 0.0,
  "total_amount": 0.0,
  "estimated_reimbursable_amount": 0.0,
  "reimbursed_amount": 0.0,
  "status": "REQUESTED",
  "delivery_confirmed_at": "2026-07-21T10:00:00Z",
  "deposit_date": "2026-07-21",
  "deposit_deadline": "2026-07-21",
  "deposit_reference": "string",
  "decision_date": "2026-07-21",
  "rejection_code": "string",
  "reimbursement_date": "2026-07-21",
  "rejection_reason": "string",
  "status_comment": "string",
  "correction_reason": "string",
  "file_url": "string"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/cnss/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"fee_id":"string","visit_id":"string","appointment_id":"string","reference":"string","label":"string","description":"string","internal_notes":"string","requested_amount":0.0,"total_amount":0.0,"estimated_reimbursable_amount":0.0,"reimbursed_amount":0.0,"status":"REQUESTED","delivery_confirmed_at":"2026-07-21T10:00:00Z","deposit_date":"2026-07-21","deposit_deadline":"2026-07-21","deposit_reference":"string","decision_date":"2026-07-21","rejection_code":"string","reimbursement_date":"2026-07-21","rejection_reason":"string","status_comment":"string","correction_reason":"string","file_url":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | CNSSOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/cnss/{cnss_id}`

Cnss Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `cnss_id` | path | Cnss Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/cnss/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Cnss Delete Api Cnss  Cnss Id  Delete |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/cnss/{cnss_id}/download`

Cnss Download

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `cnss_id` | path | Cnss Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/cnss/string/download" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/medications/catalog/specialties`

Medications Specialties

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/medications/catalog/specialties" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de string |

---

### `GET /api/medications/catalog`

Medications Catalog

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `q` | query | Q | non |
| `specialty` | query | Specialty | non |
| `limit` | query | Limit | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/medications/catalog?q=string&specialty=string&limit=50" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de MedicationCatalogOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/prescriptions`

Prescriptions List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | query | Patient Id | non |
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `sort_by` | query | Sort By | non |
| `sort_order` | query | Sort Order | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/prescriptions?patient_id=string&page=1&page_size=20&search=string&sort_by=created_at&sort_order=desc" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Prescriptions List Api Prescriptions Get |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/prescriptions`

Prescriptions Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (PrescriptionCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `patient_id` | Patient Id | oui | — | `string` |
| `doctor_id` | Doctor Id ou null | non | — | `string` |
| `content` | Content | oui | — | `string` |
| `appointment_id` | Appointment Id ou null | non | — | `string` |
| `visit_id` | Visit Id ou null | non | — | `string` |
| `consultation_date` | Consultation Date ou null | non | — | `2026-07-21` |
| `location` | Location ou null | non | — | `string` |
| `items` | Items ou null | non | — | `[{"catalog_medication_id":"string","medication_source":"custom","medication":"string","dosage":"string","form":"string","route":"string","quantity":"string","frequency":"string","duration":"string","instructions":"string","notes":"string","catalog_snapshot":{}}]` |
| `items[].catalog_medication_id` | Catalog Medication Id ou null | non | — | `string` |
| `items[].medication_source` | Medication Source | non | — | `custom` |
| `items[].medication` | Medication | oui | — | `string` |
| `items[].dosage` | Dosage ou null | non | — | `string` |
| `items[].form` | Form ou null | non | — | `string` |
| `items[].route` | Route ou null | non | — | `string` |
| `items[].quantity` | Quantity ou null | non | — | `string` |
| `items[].frequency` | Frequency ou null | non | — | `string` |
| `items[].duration` | Duration ou null | non | — | `string` |
| `items[].instructions` | Instructions ou null | non | — | `string` |
| `items[].notes` | Notes ou null | non | — | `string` |
| `items[].catalog_snapshot` | Catalog Snapshot ou null | non | — | `{}` |

```json
{
  "patient_id": "string",
  "doctor_id": "string",
  "content": "string",
  "appointment_id": "string",
  "visit_id": "string",
  "consultation_date": "2026-07-21",
  "location": "string",
  "items": [
    {
      "catalog_medication_id": "string",
      "medication_source": "custom",
      "medication": "string",
      "dosage": "string",
      "form": "string",
      "route": "string",
      "quantity": "string",
      "frequency": "string",
      "duration": "string",
      "instructions": "string",
      "notes": "string",
      "catalog_snapshot": {}
    }
  ]
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/prescriptions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"patient_id":"string","doctor_id":"string","content":"string","appointment_id":"string","visit_id":"string","consultation_date":"2026-07-21","location":"string","items":[{"catalog_medication_id":"string","medication_source":"custom","medication":"string","dosage":"string","form":"string","route":"string","quantity":"string","frequency":"string","duration":"string","instructions":"string","notes":"string","catalog_snapshot":{}}]}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | PrescriptionOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/prescriptions/{prescription_id}`

Prescriptions Get

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `prescription_id` | path | Prescription Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/prescriptions/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PrescriptionOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/prescriptions/{prescription_id}`

Prescriptions Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `prescription_id` | path | Prescription Id | oui |

Corps de requête — `application/json` (PrescriptionUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `content` | Content ou null | non | — | `string` |
| `consultation_date` | Consultation Date ou null | non | — | `2026-07-21` |
| `location` | Location ou null | non | — | `string` |
| `items` | Items ou null | non | — | `[{"catalog_medication_id":"string","medication_source":"custom","medication":"string","dosage":"string","form":"string","route":"string","quantity":"string","frequency":"string","duration":"string","instructions":"string","notes":"string","catalog_snapshot":{}}]` |
| `items[].catalog_medication_id` | Catalog Medication Id ou null | non | — | `string` |
| `items[].medication_source` | Medication Source | non | — | `custom` |
| `items[].medication` | Medication | oui | — | `string` |
| `items[].dosage` | Dosage ou null | non | — | `string` |
| `items[].form` | Form ou null | non | — | `string` |
| `items[].route` | Route ou null | non | — | `string` |
| `items[].quantity` | Quantity ou null | non | — | `string` |
| `items[].frequency` | Frequency ou null | non | — | `string` |
| `items[].duration` | Duration ou null | non | — | `string` |
| `items[].instructions` | Instructions ou null | non | — | `string` |
| `items[].notes` | Notes ou null | non | — | `string` |
| `items[].catalog_snapshot` | Catalog Snapshot ou null | non | — | `{}` |

```json
{
  "content": "string",
  "consultation_date": "2026-07-21",
  "location": "string",
  "items": [
    {
      "catalog_medication_id": "string",
      "medication_source": "custom",
      "medication": "string",
      "dosage": "string",
      "form": "string",
      "route": "string",
      "quantity": "string",
      "frequency": "string",
      "duration": "string",
      "instructions": "string",
      "notes": "string",
      "catalog_snapshot": {}
    }
  ]
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/prescriptions/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"content":"string","consultation_date":"2026-07-21","location":"string","items":[{"catalog_medication_id":"string","medication_source":"custom","medication":"string","dosage":"string","form":"string","route":"string","quantity":"string","frequency":"string","duration":"string","instructions":"string","notes":"string","catalog_snapshot":{}}]}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PrescriptionOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/prescriptions/{prescription_id}`

Prescriptions Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `prescription_id` | path | Prescription Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/prescriptions/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Prescriptions Delete Api Prescriptions  Prescription Id  Delete |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/prescriptions/{prescription_id}/pdf`

Prescriptions Pdf

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `prescription_id` | path | Prescription Id | oui |
| `action` | query | Action | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/prescriptions/string/pdf?action=preview" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/cnss/{cnss_id}/documents/{document_id}`

Cnss Document Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `cnss_id` | path | Cnss Id | oui |
| `document_id` | path | Document Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/cnss/string/documents/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/cnss/{cnss_id}/documents/{document_id}/preview`

Cnss Document Preview

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `cnss_id` | path | Cnss Id | oui |
| `document_id` | path | Document Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/cnss/string/documents/string/preview" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/cnss/{cnss_id}/documents/{document_id}/download`

Cnss Document Download

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `cnss_id` | path | Cnss Id | oui |
| `document_id` | path | Document Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/cnss/string/documents/string/download" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/patients/{patient_id}/documents`

Patient Documents List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |
| `include_archived` | query | Include Archived | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/patients/string/documents?include_archived=False" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de DocumentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/doctor/patients/{patient_id}/documents`

Patient Document Upload

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Corps de requête — `multipart/form-data` (Body_patient_document_upload_api_doctor_patients__patient_id__documents_post) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `title` | Title | oui | — | `string` |
| `document_type` | Document Type | oui | — | `string` |
| `shared_with_patient` | Shared With Patient | non | — | `False` |
| `description` | Description ou null | non | — | `string` |
| `document_date` | Document Date ou null | non | — | `2026-07-21` |
| `confidential` | Confidential | non | — | `False` |
| `category_id` | Category Id ou null | non | — | `string` |
| `doctor_id` | Doctor Id ou null | non | — | `string` |
| `appointment_id` | Appointment Id ou null | non | — | `string` |
| `visit_id` | Visit Id ou null | non | — | `string` |
| `file` | File | oui | — | `string` |

Utiliser un formulaire multipart ; les champs exacts sont disponibles dans Swagger.

Requête de test :

```bash
curl -X POST "$BASE_URL/api/doctor/patients/string/documents" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -F "title=string" \
  -F "document_type=string" \
  -F "shared_with_patient=false" \
  -F "description=string" \
  -F "document_date=2026-07-21" \
  -F "confidential=false" \
  -F "category_id=string" \
  -F "doctor_id=string" \
  -F "appointment_id=string" \
  -F "visit_id=string" \
  -F "file=@/chemin/vers/fichier.pdf"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | DocumentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/doctor/patients/{patient_id}/documents/scan`

Patient Document Scan

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Corps de requête — `multipart/form-data` (Body_patient_document_scan_api_doctor_patients__patient_id__documents_scan_post) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `title` | Title | oui | — | `string` |
| `document_type` | Document Type | oui | — | `string` |
| `shared_with_patient` | Shared With Patient | non | — | `False` |
| `description` | Description ou null | non | — | `string` |
| `document_date` | Document Date ou null | non | — | `2026-07-21` |
| `confidential` | Confidential | non | — | `False` |
| `category_id` | Category Id ou null | non | — | `string` |
| `doctor_id` | Doctor Id ou null | non | — | `string` |
| `appointment_id` | Appointment Id ou null | non | — | `string` |
| `visit_id` | Visit Id ou null | non | — | `string` |
| `file` | File | oui | — | `string` |

Utiliser un formulaire multipart ; les champs exacts sont disponibles dans Swagger.

Requête de test :

```bash
curl -X POST "$BASE_URL/api/doctor/patients/string/documents/scan" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -F "title=string" \
  -F "document_type=string" \
  -F "shared_with_patient=false" \
  -F "description=string" \
  -F "document_date=2026-07-21" \
  -F "confidential=false" \
  -F "category_id=string" \
  -F "doctor_id=string" \
  -F "appointment_id=string" \
  -F "visit_id=string" \
  -F "file=@/chemin/vers/fichier.pdf"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | DocumentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/documents`

Documents List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | query | Patient Id | non |
| `include_archived` | query | Include Archived | non |
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `sort_by` | query | Sort By | non |
| `sort_order` | query | Sort Order | non |
| `document_type` | query | Document Type | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/documents?patient_id=string&include_archived=False&page=1&page_size=20&search=string&sort_by=created_at&sort_order=desc&document_type=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Documents List Api Documents Get |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/documents`

Documents List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | query | Patient Id | non |
| `include_archived` | query | Include Archived | non |
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `sort_by` | query | Sort By | non |
| `sort_order` | query | Sort Order | non |
| `document_type` | query | Document Type | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/documents?patient_id=string&include_archived=False&page=1&page_size=20&search=string&sort_by=created_at&sort_order=desc&document_type=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Documents List Api Doctor Documents Get |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/documents/categories`

Document Categories List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `include_inactive` | query | Include Inactive | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/documents/categories?include_inactive=False" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de DocumentCategoryOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/doctor/documents/categories`

Document Categories Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (DocumentCategoryCreate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `name` | Name | oui | — | `string` |
| `code` | Code | oui | — | `string` |
| `description` | Description ou null | non | — | `string` |
| `category_type` | Category Type | oui | — | `MEDICAL` |
| `is_active` | Is Active | non | — | `True` |
| `display_order` | Display Order | non | — | `0` |

```json
{
  "name": "string",
  "code": "string",
  "description": "string",
  "category_type": "MEDICAL",
  "is_active": true,
  "display_order": 0
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/doctor/documents/categories" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"string","code":"string","description":"string","category_type":"MEDICAL","is_active":true,"display_order":0}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | DocumentCategoryOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/documents/{document_id}`

Documents Get

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `document_id` | path | Document Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/documents/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | DocumentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/doctor/documents/{document_id}`

Documents Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `document_id` | path | Document Id | oui |

Corps de requête — `application/json` (DocumentUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `title` | Title ou null | non | — | `string` |
| `document_type` | Document Type ou null | non | — | `Analyse` |
| `shared_with_patient` | Shared With Patient ou null | non | — | `False` |
| `category_id` | Category Id ou null | non | — | `string` |
| `description` | Description ou null | non | — | `string` |
| `doctor_id` | Doctor Id ou null | non | — | `string` |
| `appointment_id` | Appointment Id ou null | non | — | `string` |
| `visit_id` | Visit Id ou null | non | — | `string` |
| `fee_id` | Fee Id ou null | non | — | `string` |
| `invoice_id` | Invoice Id ou null | non | — | `string` |
| `document_date` | Document Date ou null | non | — | `2026-07-21` |
| `confidential` | Confidential ou null | non | — | `False` |

```json
{
  "title": "string",
  "document_type": "Analyse",
  "shared_with_patient": false,
  "category_id": "string",
  "description": "string",
  "doctor_id": "string",
  "appointment_id": "string",
  "visit_id": "string",
  "fee_id": "string",
  "invoice_id": "string",
  "document_date": "2026-07-21",
  "confidential": false
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/doctor/documents/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"title":"string","document_type":"Analyse","shared_with_patient":false,"category_id":"string","description":"string","doctor_id":"string","appointment_id":"string","visit_id":"string","fee_id":"string","invoice_id":"string","document_date":"2026-07-21","confidential":false}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | DocumentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/doctor/documents/{document_id}`

Documents Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `document_id` | path | Document Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/doctor/documents/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Documents Delete Api Doctor Documents  Document Id  Delete |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/doctor/documents/{document_id}/restore`

Documents Restore

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `document_id` | path | Document Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/doctor/documents/string/restore" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | DocumentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/doctor/documents/{document_id}/versions`

Document New Version

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `document_id` | path | Document Id | oui |

Corps de requête — `multipart/form-data` (Body_document_new_version_api_doctor_documents__document_id__versions_post) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `file` | File | oui | — | `string` |
| `comment` | Comment ou null | non | — | `string` |

Utiliser un formulaire multipart ; les champs exacts sont disponibles dans Swagger.

Requête de test :

```bash
curl -X POST "$BASE_URL/api/doctor/documents/string/versions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -F "file=@/chemin/vers/fichier.pdf" \
  -F "comment=string"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | DocumentOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/documents/{document_id}/history`

Document History

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `document_id` | path | Document Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/documents/string/history" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de OperationHistoryOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/documents/{document_id}/download`

Documents Download

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `document_id` | path | Document Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/documents/string/download" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/doctor/documents/{document_id}/preview`

Documents Preview

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `document_id` | path | Document Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/doctor/documents/string/preview" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/users/{staff_id}/permissions`

Staff Permissions Get

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `staff_id` | path | Staff Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/users/string/permissions" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PermissionMatrix |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/users/{staff_id}/permissions`

Staff Permissions Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `staff_id` | path | Staff Id | oui |

Corps de requête — `application/json` (PermissionMatrix) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `permissions` | Permissions | oui | — | `{}` |

```json
{
  "permissions": {}
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/users/string/permissions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"permissions":{}}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | PermissionMatrix |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/whatsapp/configuration`

Configuration Get

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/whatsapp/configuration" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | CabinetWhatsAppOut |

---

### `POST /api/whatsapp/configuration`

Configuration Save

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (CabinetWhatsAppWrite) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `business_account_name` | Business Account Name | oui | — | `string` |
| `phone_number` | Phone Number | oui | — | `string` |
| `phone_number_id` | Phone Number Id | oui | — | `string` |
| `whatsapp_business_account_id` | Whatsapp Business Account Id | oui | — | `string` |
| `access_token` | Access Token | oui | — | `string` |
| `webhook_verify_token` | Webhook Verify Token | oui | — | `string` |
| `webhook_url` | Webhook Url ou null | non | — | `string` |

```json
{
  "business_account_name": "string",
  "phone_number": "string",
  "phone_number_id": "string",
  "whatsapp_business_account_id": "string",
  "access_token": "string",
  "webhook_verify_token": "string",
  "webhook_url": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/whatsapp/configuration" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"business_account_name":"string","phone_number":"string","phone_number_id":"string","whatsapp_business_account_id":"string","access_token":"string","webhook_verify_token":"string","webhook_url":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | CabinetWhatsAppOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/whatsapp/configuration`

Configuration Save

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (CabinetWhatsAppWrite) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `business_account_name` | Business Account Name | oui | — | `string` |
| `phone_number` | Phone Number | oui | — | `string` |
| `phone_number_id` | Phone Number Id | oui | — | `string` |
| `whatsapp_business_account_id` | Whatsapp Business Account Id | oui | — | `string` |
| `access_token` | Access Token | oui | — | `string` |
| `webhook_verify_token` | Webhook Verify Token | oui | — | `string` |
| `webhook_url` | Webhook Url ou null | non | — | `string` |

```json
{
  "business_account_name": "string",
  "phone_number": "string",
  "phone_number_id": "string",
  "whatsapp_business_account_id": "string",
  "access_token": "string",
  "webhook_verify_token": "string",
  "webhook_url": "string"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/whatsapp/configuration" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"business_account_name":"string","phone_number":"string","phone_number_id":"string","whatsapp_business_account_id":"string","access_token":"string","webhook_verify_token":"string","webhook_url":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | CabinetWhatsAppOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PATCH /api/whatsapp/configuration`

Configuration Save

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (CabinetWhatsAppWrite) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `business_account_name` | Business Account Name | oui | — | `string` |
| `phone_number` | Phone Number | oui | — | `string` |
| `phone_number_id` | Phone Number Id | oui | — | `string` |
| `whatsapp_business_account_id` | Whatsapp Business Account Id | oui | — | `string` |
| `access_token` | Access Token | oui | — | `string` |
| `webhook_verify_token` | Webhook Verify Token | oui | — | `string` |
| `webhook_url` | Webhook Url ou null | non | — | `string` |

```json
{
  "business_account_name": "string",
  "phone_number": "string",
  "phone_number_id": "string",
  "whatsapp_business_account_id": "string",
  "access_token": "string",
  "webhook_verify_token": "string",
  "webhook_url": "string"
}
```

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/whatsapp/configuration" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"business_account_name":"string","phone_number":"string","phone_number_id":"string","whatsapp_business_account_id":"string","access_token":"string","webhook_verify_token":"string","webhook_url":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | CabinetWhatsAppOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/whatsapp/test-connection`

Connection Test

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X POST "$BASE_URL/api/whatsapp/test-connection" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `POST /api/whatsapp/disable`

Configuration Disable

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X POST "$BASE_URL/api/whatsapp/disable" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | CabinetWhatsAppOut |

---

### `GET /api/super-admin/whatsapp/configuration`

Platform Configuration Get

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/super-admin/whatsapp/configuration" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | WhatsAppConfigurationOut |

---

### `POST /api/super-admin/whatsapp/configuration`

Platform Configuration Save

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (WhatsAppConfigurationWrite) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `business_account_name` | Business Account Name | oui | — | `string` |
| `phone_number` | Phone Number | oui | — | `string` |
| `phone_number_id` | Phone Number Id | oui | — | `string` |
| `whatsapp_business_account_id` | Whatsapp Business Account Id | oui | — | `string` |
| `access_token` | Access Token | oui | — | `string` |
| `webhook_verify_token` | Webhook Verify Token | oui | — | `string` |
| `webhook_url` | Webhook Url ou null | non | — | `string` |

```json
{
  "business_account_name": "string",
  "phone_number": "string",
  "phone_number_id": "string",
  "whatsapp_business_account_id": "string",
  "access_token": "string",
  "webhook_verify_token": "string",
  "webhook_url": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/whatsapp/configuration" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"business_account_name":"string","phone_number":"string","phone_number_id":"string","whatsapp_business_account_id":"string","access_token":"string","webhook_verify_token":"string","webhook_url":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | WhatsAppConfigurationOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/super-admin/whatsapp/configuration`

Platform Configuration Save

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (WhatsAppConfigurationWrite) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `business_account_name` | Business Account Name | oui | — | `string` |
| `phone_number` | Phone Number | oui | — | `string` |
| `phone_number_id` | Phone Number Id | oui | — | `string` |
| `whatsapp_business_account_id` | Whatsapp Business Account Id | oui | — | `string` |
| `access_token` | Access Token | oui | — | `string` |
| `webhook_verify_token` | Webhook Verify Token | oui | — | `string` |
| `webhook_url` | Webhook Url ou null | non | — | `string` |

```json
{
  "business_account_name": "string",
  "phone_number": "string",
  "phone_number_id": "string",
  "whatsapp_business_account_id": "string",
  "access_token": "string",
  "webhook_verify_token": "string",
  "webhook_url": "string"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/super-admin/whatsapp/configuration" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"business_account_name":"string","phone_number":"string","phone_number_id":"string","whatsapp_business_account_id":"string","access_token":"string","webhook_verify_token":"string","webhook_url":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | WhatsAppConfigurationOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PATCH /api/super-admin/whatsapp/configuration`

Platform Configuration Save

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (WhatsAppConfigurationWrite) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `business_account_name` | Business Account Name | oui | — | `string` |
| `phone_number` | Phone Number | oui | — | `string` |
| `phone_number_id` | Phone Number Id | oui | — | `string` |
| `whatsapp_business_account_id` | Whatsapp Business Account Id | oui | — | `string` |
| `access_token` | Access Token | oui | — | `string` |
| `webhook_verify_token` | Webhook Verify Token | oui | — | `string` |
| `webhook_url` | Webhook Url ou null | non | — | `string` |

```json
{
  "business_account_name": "string",
  "phone_number": "string",
  "phone_number_id": "string",
  "whatsapp_business_account_id": "string",
  "access_token": "string",
  "webhook_verify_token": "string",
  "webhook_url": "string"
}
```

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/super-admin/whatsapp/configuration" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"business_account_name":"string","phone_number":"string","phone_number_id":"string","whatsapp_business_account_id":"string","access_token":"string","webhook_verify_token":"string","webhook_url":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | WhatsAppConfigurationOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/super-admin/whatsapp/webhook-setup`

Platform Webhook Setup

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (WhatsAppWebhookSetupWrite) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `webhook_verify_token` | Webhook Verify Token | oui | — | `string` |
| `webhook_url` | Webhook Url | oui | — | `string` |

```json
{
  "webhook_verify_token": "string",
  "webhook_url": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/whatsapp/webhook-setup" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"webhook_verify_token":"string","webhook_url":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/super-admin/whatsapp/test-connection`

Platform Connection Test

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X POST "$BASE_URL/api/super-admin/whatsapp/test-connection" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `GET /api/whatsapp/templates`

Templates List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `sort_by` | query | Sort By | non |
| `sort_order` | query | Sort Order | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/whatsapp/templates?page=1&page_size=20&search=string&sort_by=updated_at&sort_order=desc" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Templates List Api Whatsapp Templates Get |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/whatsapp/templates`

Templates Create

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (WhatsAppTemplateWrite) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `name` | Name | oui | — | `string` |
| `type` | Type | oui | — | `rappel_rdv` |
| `language` | Language | non | — | `fr` |
| `content` | Content | oui | — | `string` |
| `meta_template_name` | Meta Template Name ou null | non | — | `string` |
| `category` | Category | non | — | `UTILITY` |
| `status` | Status | non | — | `brouillon` |

```json
{
  "name": "string",
  "type": "rappel_rdv",
  "language": "fr",
  "content": "string",
  "meta_template_name": "string",
  "category": "UTILITY",
  "status": "brouillon"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/whatsapp/templates" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"string","type":"rappel_rdv","language":"fr","content":"string","meta_template_name":"string","category":"UTILITY","status":"brouillon"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | WhatsAppTemplateOut |
| `422` | Validation Error | HTTPValidationError |

---

### `PATCH /api/whatsapp/templates/{item_id}`

Templates Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `application/json` (WhatsAppTemplateWrite) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `name` | Name | oui | — | `string` |
| `type` | Type | oui | — | `rappel_rdv` |
| `language` | Language | non | — | `fr` |
| `content` | Content | oui | — | `string` |
| `meta_template_name` | Meta Template Name ou null | non | — | `string` |
| `category` | Category | non | — | `UTILITY` |
| `status` | Status | non | — | `brouillon` |

```json
{
  "name": "string",
  "type": "rappel_rdv",
  "language": "fr",
  "content": "string",
  "meta_template_name": "string",
  "category": "UTILITY",
  "status": "brouillon"
}
```

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/whatsapp/templates/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"string","type":"rappel_rdv","language":"fr","content":"string","meta_template_name":"string","category":"UTILITY","status":"brouillon"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | WhatsAppTemplateOut |
| `422` | Validation Error | HTTPValidationError |

---

### `DELETE /api/whatsapp/templates/{item_id}`

Templates Delete

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X DELETE "$BASE_URL/api/whatsapp/templates/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `204` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/whatsapp/templates/{item_id}/submit`

Templates Submit

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/whatsapp/templates/string/submit" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | WhatsAppTemplateOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/whatsapp/templates/{item_id}/sync`

Templates Sync

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/whatsapp/templates/string/sync" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | WhatsAppTemplateOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/whatsapp/messages`

Messages List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | query | Patient Id | non |
| `message_status` | query | Message Status | non |
| `message_type` | query | Message Type | non |
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `search` | query | Search | non |
| `sort_by` | query | Sort By | non |
| `sort_order` | query | Sort Order | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/whatsapp/messages?patient_id=string&message_status=string&message_type=string&page=1&page_size=20&search=string&sort_by=created_at&sort_order=desc" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Messages List Api Whatsapp Messages Get |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patients/{patient_id}/whatsapp/messages`

Patient Messages

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patients/string/whatsapp/messages" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | liste de WhatsAppMessageOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patients/{patient_id}/whatsapp-consent`

Patient Whatsapp Consent

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patients/string/whatsapp-consent" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/patients/{patient_id}/whatsapp-consent/accept`

Patient Whatsapp Consent Grant

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Corps de requête — `application/json` (WhatsAppConsentGrant) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `phone_number` | Phone Number | oui | — | `string` |
| `accepted` | Accepted | oui | — | `False` |
| `preferred_language` | Preferred Language | non | — | `fr` |
| `source` | Source | oui | — | `patient_space` |
| `note` | Note ou null | non | — | `string` |
| `decision_confirmed` | Decision Confirmed | non | — | `False` |

```json
{
  "phone_number": "string",
  "accepted": false,
  "preferred_language": "fr",
  "source": "patient_space",
  "note": "string",
  "decision_confirmed": false
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/patients/string/whatsapp-consent/accept" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"phone_number":"string","accepted":false,"preferred_language":"fr","source":"patient_space","note":"string","decision_confirmed":false}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/patients/{patient_id}/whatsapp-consent/grant`

Patient Whatsapp Consent Grant

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Corps de requête — `application/json` (WhatsAppConsentGrant) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `phone_number` | Phone Number | oui | — | `string` |
| `accepted` | Accepted | oui | — | `False` |
| `preferred_language` | Preferred Language | non | — | `fr` |
| `source` | Source | oui | — | `patient_space` |
| `note` | Note ou null | non | — | `string` |
| `decision_confirmed` | Decision Confirmed | non | — | `False` |

```json
{
  "phone_number": "string",
  "accepted": false,
  "preferred_language": "fr",
  "source": "patient_space",
  "note": "string",
  "decision_confirmed": false
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/patients/string/whatsapp-consent/grant" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"phone_number":"string","accepted":false,"preferred_language":"fr","source":"patient_space","note":"string","decision_confirmed":false}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/patients/{patient_id}/whatsapp-consent/refuse`

Patient Whatsapp Consent Refuse

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Corps de requête — `application/json` (WhatsAppConsentDecision) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `source` | Source | non | — | `cabinet_reception` |
| `note` | Note ou null | non | — | `string` |
| `decision_confirmed` | Decision Confirmed | non | — | `False` |

```json
{
  "source": "cabinet_reception",
  "note": "string",
  "decision_confirmed": false
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/patients/string/whatsapp-consent/refuse" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"source":"cabinet_reception","note":"string","decision_confirmed":false}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/patients/{patient_id}/whatsapp-consent/withdraw`

Patient Whatsapp Consent Withdraw

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Corps de requête — `application/json` (WhatsAppConsentWithdraw) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `reason` | Reason ou null | non | — | `string` |
| `decision_confirmed` | Decision Confirmed | non | — | `False` |

```json
{
  "reason": "string",
  "decision_confirmed": false
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/patients/string/whatsapp-consent/withdraw" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"reason":"string","decision_confirmed":false}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `PATCH /api/patients/{patient_id}/whatsapp-consent/preferences`

Patient Whatsapp Consent Preferences

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Corps de requête — `application/json` (WhatsAppConsentPreferences) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `phone_number` | Phone Number ou null | non | — | `string` |
| `preferred_language` | Preferred Language ou null | non | — | `fr` |
| `note` | Note ou null | non | — | `string` |

```json
{
  "phone_number": "string",
  "preferred_language": "fr",
  "note": "string"
}
```

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/patients/string/whatsapp-consent/preferences" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"phone_number":"string","preferred_language":"fr","note":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patients/{patient_id}/whatsapp-consent/history`

Patient Whatsapp Consent History

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patients/string/whatsapp-consent/history" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/whatsapp/consents`

Whatsapp Consents

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `status_filter` | query | Status Filter | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/whatsapp/consents?status_filter=string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/me/whatsapp-consent`

My Whatsapp Consent

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/me/whatsapp-consent" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `POST /api/patient/me/whatsapp-consent/accept`

My Whatsapp Consent Accept

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (WhatsAppPatientConsentAccept) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `phone_number` | Phone Number | oui | — | `string` |
| `accepted` | Accepted | oui | — | `False` |
| `preferred_language` | Preferred Language | non | — | `fr` |
| `note` | Note ou null | non | — | `string` |

```json
{
  "phone_number": "string",
  "accepted": false,
  "preferred_language": "fr",
  "note": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/patient/me/whatsapp-consent/accept" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"phone_number":"string","accepted":false,"preferred_language":"fr","note":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/patient/me/whatsapp-consent/refuse`

My Whatsapp Consent Refuse

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (WhatsAppConsentWithdraw) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `reason` | Reason ou null | non | — | `string` |
| `decision_confirmed` | Decision Confirmed | non | — | `False` |

```json
{
  "reason": "string",
  "decision_confirmed": false
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/patient/me/whatsapp-consent/refuse" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"reason":"string","decision_confirmed":false}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/patient/me/whatsapp-consent/withdraw`

My Whatsapp Consent Withdraw

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (WhatsAppConsentWithdraw) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `reason` | Reason ou null | non | — | `string` |
| `decision_confirmed` | Decision Confirmed | non | — | `False` |

```json
{
  "reason": "string",
  "decision_confirmed": false
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/patient/me/whatsapp-consent/withdraw" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"reason":"string","decision_confirmed":false}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `PATCH /api/patient/me/whatsapp-consent/preferences`

My Whatsapp Consent Preferences

- Authentification : Bearer JWT requis

Corps de requête — `application/json` (WhatsAppConsentPreferences) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `phone_number` | Phone Number ou null | non | — | `string` |
| `preferred_language` | Preferred Language ou null | non | — | `fr` |
| `note` | Note ou null | non | — | `string` |

```json
{
  "phone_number": "string",
  "preferred_language": "fr",
  "note": "string"
}
```

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/patient/me/whatsapp-consent/preferences" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"phone_number":"string","preferred_language":"fr","note":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/patient/me/whatsapp-consent/history`

My Whatsapp Consent History

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/patient/me/whatsapp-consent/history" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `POST /api/rendez-vous/{item_id}/send-whatsapp-reminder`

Appointment Reminder

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `application/json` (WhatsAppSendRequest) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `template_id` | Template Id ou null | non | — | `string` |
| `message` | Message ou null | non | — | `string` |

```json
{
  "template_id": "string",
  "message": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/rendez-vous/string/send-whatsapp-reminder" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"template_id":"string","message":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | WhatsAppMessageOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/honoraires/{item_id}/send-payment-reminder`

Fee Reminder

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Corps de requête — `application/json` (WhatsAppSendRequest) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `template_id` | Template Id ou null | non | — | `string` |
| `message` | Message ou null | non | — | `string` |

```json
{
  "template_id": "string",
  "message": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/honoraires/string/send-payment-reminder" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"template_id":"string","message":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | WhatsAppMessageOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/patients/{patient_id}/send-whatsapp-payment-reminder`

Patient Payment Reminder

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Corps de requête — `application/json` (WhatsAppSendRequest) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `template_id` | Template Id ou null | non | — | `string` |
| `message` | Message ou null | non | — | `string` |

```json
{
  "template_id": "string",
  "message": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/patients/string/send-whatsapp-payment-reminder" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"template_id":"string","message":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | WhatsAppMessageOut |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/whatsapp/messages/{item_id}/retry`

Retry Message

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/whatsapp/messages/string/retry" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | WhatsAppMessageOut |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/whatsapp/conversations`

Conversations List

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `filter` | query | Filter | non |
| `search` | query | Search | non |
| `page` | query | Page | non |
| `page_size` | query | Page Size | non |
| `sort_order` | query | Sort Order | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/whatsapp/conversations?filter=all&search=&page=1&page_size=20&sort_order=desc" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/whatsapp/conversations/patient/{patient_id}`

Conversation Create

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `patient_id` | path | Patient Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/whatsapp/conversations/patient/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/whatsapp/conversations/{conversation_id}/messages`

Conversation Messages

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `conversation_id` | path | Conversation Id | oui |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/whatsapp/conversations/string/messages" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/whatsapp/conversations/{conversation_id}/messages`

Conversation Send

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `conversation_id` | path | Conversation Id | oui |

Corps de requête — `application/json` (WhatsAppConversationSend) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `message_type` | Message Type | non | — | `texte` |
| `content` | Content ou null | non | — | `string` |
| `template_id` | Template Id ou null | non | — | `string` |
| `reply_to_message_id` | Reply To Message Id ou null | non | — | `string` |

```json
{
  "message_type": "texte",
  "content": "string",
  "template_id": "string",
  "reply_to_message_id": "string"
}
```

Requête de test :

```bash
curl -X POST "$BASE_URL/api/whatsapp/conversations/string/messages" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"message_type":"texte","content":"string","template_id":"string","reply_to_message_id":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `201` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `PUT /api/whatsapp/conversations/{conversation_id}`

Conversation Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `conversation_id` | path | Conversation Id | oui |

Corps de requête — `application/json` (WhatsAppConversationUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `status` | Status ou null | non | — | `ouverte` |
| `assigned_user_id` | Assigned User Id ou null | non | — | `string` |

```json
{
  "status": "ouverte",
  "assigned_user_id": "string"
}
```

Requête de test :

```bash
curl -X PUT "$BASE_URL/api/whatsapp/conversations/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"status":"ouverte","assigned_user_id":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `PATCH /api/whatsapp/conversations/{conversation_id}`

Conversation Update

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `conversation_id` | path | Conversation Id | oui |

Corps de requête — `application/json` (WhatsAppConversationUpdate) :

| Paramètre envoyé | Type | Obligatoire | Description | Exemple |
|---|---|---|---|---|
| `status` | Status ou null | non | — | `ouverte` |
| `assigned_user_id` | Assigned User Id ou null | non | — | `string` |

```json
{
  "status": "ouverte",
  "assigned_user_id": "string"
}
```

Requête de test :

```bash
curl -X PATCH "$BASE_URL/api/whatsapp/conversations/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"status":"ouverte","assigned_user_id":"string"}'
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/whatsapp/unknown-numbers`

Unknown Numbers

- Authentification : Bearer JWT requis

Requête de test :

```bash
curl -X GET "$BASE_URL/api/whatsapp/unknown-numbers" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `POST /api/whatsapp/unknown-numbers/{item_id}/link/{patient_id}`

Unknown Link

- Authentification : Bearer JWT requis

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `item_id` | path | Item Id | oui |
| `patient_id` | path | Patient Id | oui |

Requête de test :

```bash
curl -X POST "$BASE_URL/api/whatsapp/unknown-numbers/string/link/string" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `GET /api/webhooks/whatsapp`

Webhook Verify

- Authentification : publique ou contrôlée par la route

Paramètres :

| Nom | Emplacement | Type | Obligatoire |
|---|---|---|---|
| `hub.mode` | query | Hub.Mode | non |
| `hub.verify_token` | query | Hub.Verify Token | non |
| `hub.challenge` | query | Hub.Challenge | non |

Requête de test :

```bash
curl -X GET "$BASE_URL/api/webhooks/whatsapp?hub.mode=string&hub.verify_token=string&hub.challenge=string"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |
| `422` | Validation Error | HTTPValidationError |

---

### `POST /api/webhooks/whatsapp`

Webhook Receive

- Authentification : publique ou contrôlée par la route

Requête de test :

```bash
curl -X POST "$BASE_URL/api/webhooks/whatsapp"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | — |

---

### `GET /`

Root

- Authentification : publique ou contrôlée par la route

Requête de test :

```bash
curl -X GET "$BASE_URL/" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Réponses :

| HTTP | Description | Schéma |
|---|---|---|
| `200` | Successful Response | Response Root  Get |

---

## Régénération

Depuis la racine du projet :

```bash
python3 backend/scripts/export_api_docs.py
```

Cette commande met à jour `docs/api-reference.md` et `docs/openapi.json`.
