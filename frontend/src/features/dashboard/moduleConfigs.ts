  import { CrudModuleConfig } from './CrudModulePage'

export const doctorModuleConfigs: Record<string, CrudModuleConfig> = {
  '/doctor/patients': {
    title: 'Patients',
    subtitle: 'Créer, consulter et désactiver les patients du cabinet. Toutes les données sont filtrées par instance.',
    endpoint: '/patients',
    columns: ['first_name', 'last_name', 'email', 'phone', 'status'],
    fields: [
      { key: 'first_name', label: 'Prénom', required: true },
      { key: 'last_name', label: 'Nom', required: true },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Téléphone' },
      { key: 'birth_date', label: 'Date de naissance', type: 'date', required: true },
      { key: 'gender', label: 'Genre' },
      { key: 'address', label: 'Adresse' }
    ]
  },
  '/doctor/visits': {
    title: 'Visites',
    subtitle: 'Créer une visite, la relier à un patient et conserver l’historique médical du cabinet.',
    endpoint: '/visits',
    columns: ['patient_id', 'appointment_id', 'visit_date', 'status', 'reason', 'notes'],
    fields: [
      { key: 'patient_id', label: 'Patient', type: 'patient', required: true },
      { key: 'appointment_id', label: 'ID rendez-vous' },
      { key: 'visit_date', label: 'Date visite', type: 'date', required: true },
      { key: 'reason', label: 'Motif' },
      { key: 'notes', label: 'Notes', type: 'textarea' }
    ]
  },
  '/doctor/honoraires': {
    title: 'Honoraires',
    subtitle: 'Gérer les honoraires et calculer automatiquement le reste à payer.',
    endpoint: '/honoraires',
    columns: ['patient_name', 'doctor_name', 'amount', 'paid_amount', 'remaining_amount', 'status'],
    fields: [
      { key: 'patient_id', label: 'Patient', type: 'patient', required: true },
      { key: 'amount', label: 'Montant', type: 'number', required: true }
    ]
  },
  '/doctor/payments': {
    title: 'Paiements / RAP',
    subtitle: 'Ajouter des paiements et suivre les restes à payer du cabinet.',
    endpoint: '/payments',
    columns: ['patient_name', 'doctor_name', 'fee_title', 'amount', 'method', 'status', 'paid_at'],
    fields: [
      { key: 'patient_id', label: 'Patient', type: 'patient', required: true },
      { key: 'fee_id', label: 'ID honoraire' },
      { key: 'amount', label: 'Montant', type: 'number', required: true },
      { key: 'method', label: 'Méthode', type: 'select', options: ['cash', 'card', 'transfer', 'cheque'] }
    ]
  },
  '/doctor/cnss': {
    title: 'CNSS/CNOPS',
    subtitle: 'Créer et suivre les dossiers CNSS/CNOPS par statut.',
    endpoint: '/cnss',
    createEndpoint: '/cnss/upload',
    downloadEndpoint: '/cnss/:id/download',
    columns: ['patient_name', 'doctor_name', 'reference', 'status', 'file_url', 'created_at'],
    fields: [
      { key: 'patient_id', label: 'Patient', type: 'patient', required: true },
      { key: 'reference', label: 'Référence' },
      { key: 'status', label: 'Statut CNSS/CNOPS', type: 'select', options: ['REQUESTED', 'PROCESSING', 'READY_FOR_PICKUP', 'DELIVERED_TO_PATIENT', 'SUBMITTED_TO_CNSS', 'APPROVED', 'REJECTED'] },
      { key: 'file', label: 'Pièce CNSS/CNOPS', type: 'file', required: true }
    ]
  },
  '/doctor/prescriptions': {
    title: 'Ordonnances',
    subtitle: 'Créer, consulter et préparer l’export PDF des ordonnances.',
    endpoint: '/prescriptions',
    columns: ['patient_name', 'doctor_name', 'content', 'created_at'],
    fields: [
      { key: 'patient_id', label: 'Patient', type: 'patient', required: true },
      { key: 'content', label: 'Contenu ordonnance', type: 'textarea', required: true, voice: true }
    ]
  },
  '/doctor/documents': {
    title: 'Documents médicaux',
    subtitle: 'Déposer et télécharger les documents médicaux rattachés aux patients du cabinet.',
    endpoint: '/doctor/documents',
    createEndpoint: '/doctor/patients/:patient_id/documents',
    downloadEndpoint: '/doctor/documents/:id/download',
    columns: ['patient_id', 'title', 'document_type', 'shared_with_patient', 'file_url'],
    fields: [
      { key: 'patient_id', label: 'Patient', type: 'patient', required: true },
      { key: 'title', label: 'Titre', required: true },
      { key: 'document_type', label: 'Type', type: 'select', options: ['Analyse', 'Radio', 'CIN', 'CNOPS', 'CNSS/CNOPS', 'Courrier', 'Autre'], required: true },
      { key: 'shared_with_patient', label: 'Partage patient', type: 'checkbox' },
      { key: 'file', label: 'Fichier', type: 'file', required: true }
    ]
  },
  '/doctor/staff': {
    title: 'Utilisateurs & permissions',
    subtitle: 'Créer les comptes secrétaires et préparer leur matrice de permissions.',
    endpoint: '/users',
    columns: ['first_name', 'last_name', 'email', 'role', 'is_active'],
    fields: [
      { key: 'first_name', label: 'Prénom', required: true },
      { key: 'last_name', label: 'Nom', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'phone', label: 'Téléphone' },
      { key: 'password', label: 'Mot de passe', required: true },
      { key: 'role', label: 'Rôle', type: 'select', options: ['SECRETAIRE', 'PATIENT', 'MEDECIN_ADMIN'], required: true }
    ]
  },
  '/doctor/settings': {
    title: 'Configuration du cabinet',
    subtitle: 'Modifier les informations générales du cabinet.',
    endpoint: '/doctor/cabinet',
    columns: ['name', 'slug', 'status', 'trial_ends_at'],
    fields: [
      { key: 'name', label: 'Nom cabinet' },
      { key: 'city', label: 'Ville' },
      { key: 'address', label: 'Adresse' },
      { key: 'phone', label: 'Téléphone' },
      { key: 'primary_color', label: 'Couleur principale' }
    ],
    readOnly: true
  }
}
