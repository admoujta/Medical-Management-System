import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { workspacePhraseMap } from './workspacePhrases'
import { patientTranslations } from './patientTranslations'

export type AppLanguage = 'fr' | 'ar' | 'en'
export const LANGUAGE_STORAGE_KEY = 'fadaa_public_language'

export function normalizeAppLanguage(value: string | null | undefined): AppLanguage | null {
  const code = value?.trim().toLowerCase().split(/[-_]/)[0]
  return code === 'fr' || code === 'ar' || code === 'en' ? code : null
}

export function getPreferredLanguage(): AppLanguage {
  const savedLanguage = normalizeAppLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
  if (savedLanguage) return savedLanguage
  return 'fr'
}

const initialLanguage = getPreferredLanguage()

export const fr = {
  logout: 'Déconnexion', doctorSpace: 'Espace médecin', staffSpace: 'Espace secrétaire', patientSpace: 'Espace patient', healthSpace: 'Mon espace santé', superAdminConsole: 'Console Super Admin', platformManagement: 'Pilotage sécurisé de la plateforme SaaS FADAA Santé', noMedicalData: 'Aucune donnée médicale', globalAdministrator: 'Administrateur global', dashboard: 'Tableau de bord', appointments: 'Rendez-vous', visits: 'Visites', fees: 'Honoraires', paymentsRap: 'Paiements / RAP', payments: 'Paiements', unpaidReminders: 'Relances d’impayés', whatsapp: 'WhatsApp', cnss: 'CNSS/CNOPS', prescriptions: 'Ordonnances', documents: 'Documents', usersPermissions: 'Utilisateurs & permissions', securityTraceability: 'Sécurité & traçabilité', subscription: 'Abonnement', practiceSettings: 'Configuration du cabinet', team: 'Équipe', patients: 'Patients', myProfile: 'Mon profil', findDoctor: 'Trouver un médecin', myAppointments: 'Mes rendez-vous', visitHistory: 'Historique des visites', myDocuments: 'Mes documents', myPrescriptions: 'Mes ordonnances', myCnss: 'Mes dossiers CNSS/CNOPS', myPayments: 'Mes paiements', instancesPractices: 'Instances / Cabinets', events: 'Événements', subscriptions: 'Abonnements', support: 'Support', users: 'Utilisateurs', backups: 'Sauvegardes', settings: 'Paramètres', logs: 'Logs',
  language: 'Langue', backToSite: 'Retour au site', secureLogin: 'Connexion sécurisée', login: 'Connexion', loginSubtitle: 'Accédez directement à votre espace FADAA Santé.', email: 'Adresse email', password: 'Mot de passe', passwordPlaceholder: 'Votre mot de passe', hidePassword: 'Masquer le mot de passe', showPassword: 'Afficher le mot de passe', loggingIn: 'Connexion en cours…', signIn: 'Se connecter', forgotPassword: 'Mot de passe oublié ?', createPractice: 'Créer mon cabinet', patientAccount: 'Compte patient', protectedData: 'Vos accès et vos données médicales restent protégés.', loginSuccess: 'Bienvenue {{name}}. Connexion réussie.', loginError: 'Connexion impossible.',
  patientRegisterTitle: 'Créer un compte patient', patientRegisterSubtitle: 'Votre compte patient est rattaché à un cabinet existant grâce au code cabinet fourni par votre médecin.', secureLink: 'Rattachement sécurisé', noPracticeCreation: 'Le patient ne crée pas de cabinet.', patientExplanation: 'Il rejoint uniquement l’espace du cabinet via un code d’instance. Le cabinet peut valider le compte avant activation.', personalProfile: 'Profil personnel patient', appointmentsDocuments: 'Rendez-vous et documents', practiceNotifications: 'Notifications cabinet', adminContact: 'Contact administratif', practiceCode: 'Code cabinet ou instance', firstName: 'Prénom', lastName: 'Nom', phone: 'Téléphone', birthDate: 'Date de naissance', gender: 'Sexe', unspecified: 'Non renseigné', female: 'Femme', male: 'Homme', other: 'Autre', address: 'Adresse', confirmPassword: 'Confirmation mot de passe', passwordRule: 'Le mot de passe doit contenir au moins 10 caractères, une majuscule, une minuscule et un chiffre.', acceptTerms: 'J’accepte les conditions d’utilisation.', acceptPrivacy: 'J’accepte la politique de confidentialité.', alreadyAccount: 'Déjà un compte ? Se connecter', creatingAccount: 'Création en cours...', createPatientAccount: 'Créer mon compte patient', passwordMismatch: 'La confirmation du mot de passe ne correspond pas.',
  save:'Enregistrer',cancel:'Annuler',add:'Ajouter',edit:'Modifier',delete:'Supprimer',close:'Fermer',search:'Rechercher',select:'Sélectionner',yes:'Oui',no:'Non',loading:'Chargement…',noResults:'Aucun résultat',allStatuses:'Tous les statuts',actions:'Actions',status:'Statut',description:'Description',comment:'Commentaire',date:'Date',history:'Historique',notifications:'Notifications',markAllRead:'Tout marquer comme lu',allUpToDate:'Tout est à jour',noNotifications:'Aucune notification',platformAlerts:'Alertes administratives de la plateforme',
  offers:'Offres',administrativeAccess:'Accès strictement administratif et technique',platformAdministration:'FADAA Santé · Administration globale de la plateforme',platformNotifications:'Notifications plateforme',trialExpiring:'Essai proche de l’expiration',supportNewMessage:'Nouveau message support',suspendedInstances:'Instances suspendues',needsVerification:'{{count}} instance(s) nécessitent une vérification.',endsOn:'fin le {{date}}',
  statusActive:'Actif',statusResolved:'Résolu',statusCompleted:'Terminé',statusPaid:'Payé',statusPublished:'Publié',statusTrial:'Essai',statusOpen:'Ouvert',statusPlanned:'Planifié',statusNormal:'Normal',statusInProgress:'En cours',statusPending:'En attente',statusPendingPayment:'Paiement en attente',statusExpired:'Expiré',statusHigh:'Élevé',statusUrgent:'Urgent',statusSuspended:'Suspendu',statusCancelled:'Annulé',statusClosed:'Fermé',statusLow:'Faible',statusDraft:'Brouillon',
  patientAllPractices:'Tous vos cabinets',patientWelcome:'Bienvenue, {{name}}',patientOverview:'Retrouvez ici vos rendez-vous, visites et documents médicaux auprès de tous vos médecins.',nextAppointment:'Prochain rendez-vous',totalAppointments:'Total rendez-vous',completedVisits:'Visites réalisées',absences:'Absences',recentDocuments:'Documents récents',recentAppointments:'Derniers rendez-vous',noSharedDocument:'Aucun document partagé.',communicationPreferences:'Préférences de communication',
  communicationPreferencesSubtitle:'Vous décidez librement si votre cabinet peut vous contacter sur WhatsApp.',requestAppointment:'Demander un rendez-vous',requestAppointmentSubtitle:'Choisissez votre cabinet et votre médecin avant de sélectionner le créneau.',appointmentsSubtitle:'Retrouvez vos demandes et rendez-vous.',myReviews:'Mes avis',myReviewsSubtitle:'Retrouvez et modifiez les avis publiés après vos consultations.',myVisits:'Mes visites',visitsSubtitle:'Historique de vos consultations.',documentsSubtitle:'Documents partagés par votre cabinet.',prescriptionsSubtitle:'Ordonnances établies pour vous.',cnssSubtitle:'Suivi administratif de vos dossiers.',paymentsSubtitle:'Historique financier partagé par le cabinet.',profileSubtitle:'Gérez vos coordonnées personnelles et retrouvez vos avis.',medicalManagement:'Gestion médicale',financialManagement:'Gestion financière',practiceAdministration:'Administration du cabinet',newRecord:'Nouveau dossier',create:'Créer',update:'Mettre à jour',view:'Voir',download:'Télécharger',print:'Imprimer',back:'Retour',
  doctorDashboard:'Tableau de bord médecin',staffDashboard:'Tableau de bord secrétaire',welcomeDoctor:'Bienvenue Dr. {{name}}',helloName:'Bonjour {{name}}',todayPriorities:'Voici les priorités du cabinet aujourd’hui.',instanceStatus:'Statut instance',trialEnds:'Fin d’essai : {{date}}',activeTrial:'Essai 1 mois actif',trialAccess:'Accès complet aux fonctionnalités médecin pendant l’essai. Il reste {{count}} jour(s).',untilDate:'Jusqu’au {{date}}',appointmentsToday:'Rendez-vous aujourd’hui',registeredPatients:'Patients enregistrés',confirmedAppointments:'Rendez-vous confirmés',absentPatients:'Patients absents',monthlyVisits:'Visites du mois',collectedAmount:'Montant encaissé',totalOutstanding:'Reste à payer total',pendingCnss:'Dossiers CNSS/CNOPS en cours',upcomingAppointments:'Prochains rendez-vous',noUpcomingAppointment:'Aucun rendez-vous à venir.',latestPatients:'Derniers patients ajoutés',recentPatients:'Patients récents',recentPayments:'Paiements récents',noRecentPatient:'Aucun patient récent.',quickActions:'Actions rapides',addPatient:'Ajouter un patient',createAppointment:'Créer un rendez-vous',viewCalendar:'Voir calendrier',manageFees:'Gérer les honoraires',manageDocuments:'Gérer les documents',manageStaff:'Gérer les secrétaires',recordPayment:'Enregistrer un paiement',openCnss:'Ouvrir les dossiers CNSS/CNOPS',viewAgenda:'Voir l’agenda',viewAll:'Voir tous',phoneMissing:'Téléphone non renseigné',loadingDashboard:'Chargement du tableau de bord…',backToLogin:'Retour connexion',
  findDoctorNav:'Trouver un médecin',howItWorks:'Comment ça marche ?',patientProfessionals:'Les professionnels FADAA Santé',findRightDoctor:'Trouvez le médecin qui vous convient.',findDoctorIntro:'Découvrez les cabinets, consultez les avis de patients vérifiés et choisissez sereinement avant de demander un rendez-vous.',doctorSearchPlaceholder:'Médecin, spécialité ou cabinet',allCities:'Toutes les villes',searchAction:'Rechercher',medicalDirectory:'Annuaire médical',availableDoctors:'Médecins et cabinets disponibles',resultCount:'{{count}} résultat(s)',verifiedProfile:'Profil vérifié',viewProfile:'Voir le profil',bookAppointment:'Prendre rendez-vous',noDoctorFound:'Aucun médecin trouvé',tryAnotherSearch:'Essayez une autre recherche ou sélectionnez toutes les villes.',directoryUnavailable:'Annuaire indisponible',doctorLoadError:'Impossible de charger les médecins pour le moment.',patientAccountSpace:'Mon espace patient',
  ...patientTranslations.fr,
}

type TranslationDictionary = { [Key in keyof typeof fr]: string }

export const en: TranslationDictionary = {
  logout: 'Sign out', doctorSpace: 'Doctor workspace', staffSpace: 'Secretary workspace', patientSpace: 'Patient workspace', healthSpace: 'My health space', superAdminConsole: 'Super Admin Console', platformManagement: 'Secure management of the FADAA Santé SaaS platform', noMedicalData: 'No medical data', globalAdministrator: 'Global administrator', dashboard: 'Dashboard', appointments: 'Appointments', visits: 'Visits', fees: 'Fees', paymentsRap: 'Payments / Balance', payments: 'Payments', unpaidReminders: 'Unpaid reminders', whatsapp: 'WhatsApp', cnss: 'CNSS/CNOPS', prescriptions: 'Prescriptions', documents: 'Documents', usersPermissions: 'Users & permissions', securityTraceability: 'Security & audit trail', subscription: 'Subscription', practiceSettings: 'Practice settings', team: 'Team', patients: 'Patients', myProfile: 'My profile', findDoctor: 'Find a doctor', myAppointments: 'My appointments', visitHistory: 'Visit history', myDocuments: 'My documents', myPrescriptions: 'My prescriptions', myCnss: 'My CNSS/CNOPS files', myPayments: 'My payments', instancesPractices: 'Instances / Practices', events: 'Events', subscriptions: 'Subscriptions', support: 'Support', users: 'Users', backups: 'Backups', settings: 'Settings', logs: 'Logs',
  language: 'Language', backToSite: 'Back to website', secureLogin: 'Secure login', login: 'Sign in', loginSubtitle: 'Access your FADAA Santé workspace.', email: 'Email address', password: 'Password', passwordPlaceholder: 'Your password', hidePassword: 'Hide password', showPassword: 'Show password', loggingIn: 'Signing in…', signIn: 'Sign in', forgotPassword: 'Forgot password?', createPractice: 'Create my practice', patientAccount: 'Patient account', protectedData: 'Your access and medical data remain protected.', loginSuccess: 'Welcome {{name}}. You are now signed in.', loginError: 'Unable to sign in.',
  patientRegisterTitle: 'Create a patient account', patientRegisterSubtitle: 'Your patient account is linked to an existing practice using the code provided by your doctor.', secureLink: 'Secure connection', noPracticeCreation: 'A patient does not create a practice.', patientExplanation: 'You only join the practice workspace using its code. The practice may approve the account before activation.', personalProfile: 'Personal patient profile', appointmentsDocuments: 'Appointments and documents', practiceNotifications: 'Practice notifications', adminContact: 'Administrative contact', practiceCode: 'Practice or workspace code', firstName: 'First name', lastName: 'Last name', phone: 'Phone', birthDate: 'Date of birth', gender: 'Gender', unspecified: 'Not specified', female: 'Female', male: 'Male', other: 'Other', address: 'Address', confirmPassword: 'Confirm password', passwordRule: 'The password must contain at least 10 characters, one uppercase letter, one lowercase letter and one number.', acceptTerms: 'I accept the terms of use.', acceptPrivacy: 'I accept the privacy policy.', alreadyAccount: 'Already have an account? Sign in', creatingAccount: 'Creating account...', createPatientAccount: 'Create my patient account', passwordMismatch: 'The password confirmation does not match.',
  save:'Save',cancel:'Cancel',add:'Add',edit:'Edit',delete:'Delete',close:'Close',search:'Search',select:'Select',yes:'Yes',no:'No',loading:'Loading…',noResults:'No results',allStatuses:'All statuses',actions:'Actions',status:'Status',description:'Description',comment:'Comment',date:'Date',history:'History',notifications:'Notifications',markAllRead:'Mark all as read',allUpToDate:'Everything is up to date',noNotifications:'No notifications',platformAlerts:'Platform administrative alerts',
  offers:'Plans',administrativeAccess:'Strictly administrative and technical access',platformAdministration:'FADAA Santé · Global platform administration',platformNotifications:'Platform notifications',trialExpiring:'Trial ending soon',supportNewMessage:'New support message',suspendedInstances:'Suspended instances',needsVerification:'{{count}} instance(s) require verification.',endsOn:'ends on {{date}}',
  statusActive:'Active',statusResolved:'Resolved',statusCompleted:'Completed',statusPaid:'Paid',statusPublished:'Published',statusTrial:'Trial',statusOpen:'Open',statusPlanned:'Planned',statusNormal:'Normal',statusInProgress:'In progress',statusPending:'Pending',statusPendingPayment:'Payment pending',statusExpired:'Expired',statusHigh:'High',statusUrgent:'Urgent',statusSuspended:'Suspended',statusCancelled:'Cancelled',statusClosed:'Closed',statusLow:'Low',statusDraft:'Draft',
  patientAllPractices:'All your practices',patientWelcome:'Welcome, {{name}}',patientOverview:'Find your appointments, visits and medical documents from all your doctors here.',nextAppointment:'Next appointment',totalAppointments:'Total appointments',completedVisits:'Completed visits',absences:'Absences',recentDocuments:'Recent documents',recentAppointments:'Recent appointments',noSharedDocument:'No shared document.',communicationPreferences:'Communication preferences',
  communicationPreferencesSubtitle:'You freely decide whether your practice may contact you on WhatsApp.',requestAppointment:'Request an appointment',requestAppointmentSubtitle:'Choose your practice and doctor before selecting a time slot.',appointmentsSubtitle:'View your appointment requests and appointments.',myReviews:'My reviews',myReviewsSubtitle:'View and edit reviews published after your consultations.',myVisits:'My visits',visitsSubtitle:'History of your consultations.',documentsSubtitle:'Documents shared by your practice.',prescriptionsSubtitle:'Prescriptions issued for you.',cnssSubtitle:'Administrative tracking of your files.',paymentsSubtitle:'Financial history shared by the practice.',profileSubtitle:'Manage your personal details and reviews.',medicalManagement:'Medical management',financialManagement:'Financial management',practiceAdministration:'Practice administration',newRecord:'New record',create:'Create',update:'Update',view:'View',download:'Download',print:'Print',back:'Back',
  doctorDashboard:'Doctor dashboard',staffDashboard:'Secretary dashboard',welcomeDoctor:'Welcome Dr. {{name}}',helloName:'Hello {{name}}',todayPriorities:'Here are the practice priorities for today.',instanceStatus:'Instance status',trialEnds:'Trial ends: {{date}}',activeTrial:'One-month trial active',trialAccess:'Full access to doctor features during the trial. {{count}} day(s) remaining.',untilDate:'Until {{date}}',appointmentsToday:'Appointments today',registeredPatients:'Registered patients',confirmedAppointments:'Confirmed appointments',absentPatients:'Absent patients',monthlyVisits:'Visits this month',collectedAmount:'Amount collected',totalOutstanding:'Total outstanding',pendingCnss:'Pending CNSS/CNOPS files',upcomingAppointments:'Upcoming appointments',noUpcomingAppointment:'No upcoming appointment.',latestPatients:'Latest patients added',recentPatients:'Recent patients',recentPayments:'Recent payments',noRecentPatient:'No recent patient.',quickActions:'Quick actions',addPatient:'Add a patient',createAppointment:'Create an appointment',viewCalendar:'View calendar',manageFees:'Manage fees',manageDocuments:'Manage documents',manageStaff:'Manage secretaries',recordPayment:'Record a payment',openCnss:'Open CNSS/CNOPS files',viewAgenda:'View calendar',viewAll:'View all',phoneMissing:'Phone not provided',loadingDashboard:'Loading dashboard…',backToLogin:'Back to sign in',
  findDoctorNav:'Find a doctor',howItWorks:'How does it work?',patientProfessionals:'FADAA Santé professionals',findRightDoctor:'Find the right doctor for you.',findDoctorIntro:'Discover practices, read verified patient reviews and choose confidently before requesting an appointment.',doctorSearchPlaceholder:'Doctor, specialty or practice',allCities:'All cities',searchAction:'Search',medicalDirectory:'Medical directory',availableDoctors:'Available doctors and practices',resultCount:'{{count}} result(s)',verifiedProfile:'Verified profile',viewProfile:'View profile',bookAppointment:'Book an appointment',noDoctorFound:'No doctor found',tryAnotherSearch:'Try another search or select all cities.',directoryUnavailable:'Directory unavailable',doctorLoadError:'Unable to load doctors at this time.',patientAccountSpace:'My patient space',
  ...patientTranslations.en,
}

export const ar: TranslationDictionary = {
  logout: 'تسجيل الخروج', doctorSpace: 'فضاء الطبيب', staffSpace: 'فضاء السكرتارية', patientSpace: 'فضاء المريض', healthSpace: 'فضائي الصحي', superAdminConsole: 'لوحة المشرف العام', platformManagement: 'إدارة آمنة لمنصة فضاء صحة', noMedicalData: 'لا توجد بيانات طبية', globalAdministrator: 'المشرف العام', dashboard: 'لوحة التحكم', appointments: 'المواعيد', visits: 'الزيارات', fees: 'الأتعاب', paymentsRap: 'المدفوعات / المتبقي', payments: 'المدفوعات', unpaidReminders: 'تذكير بالمبالغ غير المؤداة', whatsapp: 'واتساب', cnss: 'الضمان الاجتماعي', prescriptions: 'الوصفات الطبية', documents: 'الوثائق', usersPermissions: 'المستخدمون والصلاحيات', securityTraceability: 'الأمان والتتبع', subscription: 'الاشتراك', practiceSettings: 'إعدادات العيادة', team: 'الفريق', patients: 'المرضى', myProfile: 'ملفي الشخصي', findDoctor: 'البحث عن طبيب', myAppointments: 'مواعيدي', visitHistory: 'سجل الزيارات', myDocuments: 'وثائقي', myPrescriptions: 'وصفاتي الطبية', myCnss: 'ملفات الضمان الاجتماعي', myPayments: 'مدفوعاتي', instancesPractices: 'العيادات والمؤسسات', events: 'الفعاليات', subscriptions: 'الاشتراكات', support: 'الدعم', users: 'المستخدمون', backups: 'النسخ الاحتياطية', settings: 'الإعدادات', logs: 'السجلات',
  language: 'اللغة', backToSite: 'العودة إلى الموقع', secureLogin: 'تسجيل دخول آمن', login: 'تسجيل الدخول', loginSubtitle: 'ادخل مباشرة إلى فضاء فضاء صحة الخاص بك.', email: 'البريد الإلكتروني', password: 'كلمة المرور', passwordPlaceholder: 'كلمة المرور الخاصة بك', hidePassword: 'إخفاء كلمة المرور', showPassword: 'إظهار كلمة المرور', loggingIn: 'جارٍ تسجيل الدخول…', signIn: 'تسجيل الدخول', forgotPassword: 'نسيت كلمة المرور؟', createPractice: 'إنشاء عيادتي', patientAccount: 'حساب المريض', protectedData: 'تبقى بيانات الدخول والبيانات الطبية محمية.', loginSuccess: 'مرحباً {{name}}. تم تسجيل الدخول بنجاح.', loginError: 'تعذر تسجيل الدخول.',
  patientRegisterTitle: 'إنشاء حساب مريض', patientRegisterSubtitle: 'يرتبط حساب المريض بعيادة موجودة باستعمال الرمز الذي يقدمه الطبيب.', secureLink: 'ربط آمن', noPracticeCreation: 'المريض لا ينشئ عيادة.', patientExplanation: 'ينضم المريض فقط إلى فضاء العيادة باستعمال رمزها، ويمكن للعيادة التحقق من الحساب قبل تفعيله.', personalProfile: 'الملف الشخصي للمريض', appointmentsDocuments: 'المواعيد والوثائق', practiceNotifications: 'إشعارات العيادة', adminContact: 'التواصل الإداري', practiceCode: 'رمز العيادة أو الفضاء', firstName: 'الاسم الشخصي', lastName: 'الاسم العائلي', phone: 'الهاتف', birthDate: 'تاريخ الميلاد', gender: 'الجنس', unspecified: 'غير محدد', female: 'أنثى', male: 'ذكر', other: 'آخر', address: 'العنوان', confirmPassword: 'تأكيد كلمة المرور', passwordRule: 'يجب أن تتكون كلمة المرور من 10 أحرف على الأقل، وحرف كبير وحرف صغير ورقم.', acceptTerms: 'أوافق على شروط الاستخدام.', acceptPrivacy: 'أوافق على سياسة الخصوصية.', alreadyAccount: 'لديك حساب؟ تسجيل الدخول', creatingAccount: 'جارٍ إنشاء الحساب...', createPatientAccount: 'إنشاء حساب المريض', passwordMismatch: 'تأكيد كلمة المرور غير مطابق.',
  save:'حفظ',cancel:'إلغاء',add:'إضافة',edit:'تعديل',delete:'حذف',close:'إغلاق',search:'بحث',select:'اختيار',yes:'نعم',no:'لا',loading:'جارٍ التحميل…',noResults:'لا توجد نتائج',allStatuses:'جميع الحالات',actions:'الإجراءات',status:'الحالة',description:'الوصف',comment:'ملاحظة',date:'التاريخ',history:'السجل',notifications:'الإشعارات',markAllRead:'تحديد الكل كمقروء',allUpToDate:'كل شيء محدّث',noNotifications:'لا توجد إشعارات',platformAlerts:'التنبيهات الإدارية للمنصة',
  offers:'العروض',administrativeAccess:'وصول إداري وتقني فقط',platformAdministration:'فضاء صحة · الإدارة العامة للمنصة',platformNotifications:'إشعارات المنصة',trialExpiring:'قرب انتهاء الفترة التجريبية',supportNewMessage:'رسالة دعم جديدة',suspendedInstances:'عيادات موقوفة',needsVerification:'{{count}} عيادة تحتاج إلى التحقق.',endsOn:'تنتهي في {{date}}',
  statusActive:'نشط',statusResolved:'تم الحل',statusCompleted:'مكتمل',statusPaid:'مدفوع',statusPublished:'منشور',statusTrial:'تجريبي',statusOpen:'مفتوح',statusPlanned:'مبرمج',statusNormal:'عادي',statusInProgress:'قيد المعالجة',statusPending:'في الانتظار',statusPendingPayment:'في انتظار الدفع',statusExpired:'منتهي',statusHigh:'مرتفع',statusUrgent:'عاجل',statusSuspended:'موقوف',statusCancelled:'ملغى',statusClosed:'مغلق',statusLow:'منخفض',statusDraft:'مسودة',
  patientAllPractices:'جميع عياداتك',patientWelcome:'مرحباً، {{name}}',patientOverview:'ستجد هنا مواعيدك وزياراتك ووثائقك الطبية لدى جميع أطبائك.',nextAppointment:'الموعد القادم',totalAppointments:'مجموع المواعيد',completedVisits:'الزيارات المنجزة',absences:'الغيابات',recentDocuments:'أحدث الوثائق',recentAppointments:'أحدث المواعيد',noSharedDocument:'لا توجد وثيقة مشتركة.',communicationPreferences:'تفضيلات التواصل',
  communicationPreferencesSubtitle:'أنت من يقرر بحرية ما إذا كان بإمكان العيادة التواصل معك عبر واتساب.',requestAppointment:'طلب موعد',requestAppointmentSubtitle:'اختر العيادة والطبيب قبل اختيار الموعد.',appointmentsSubtitle:'اطّلع على طلبات ومواعيدك.',myReviews:'تقييماتي',myReviewsSubtitle:'اطّلع على التقييمات المنشورة بعد الاستشارات وعدّلها.',myVisits:'زياراتي',visitsSubtitle:'سجل استشاراتك.',documentsSubtitle:'الوثائق التي شاركتها العيادة معك.',prescriptionsSubtitle:'الوصفات الطبية المحررة لك.',cnssSubtitle:'التتبع الإداري لملفاتك.',paymentsSubtitle:'السجل المالي الذي تشاركه العيادة.',profileSubtitle:'إدارة بياناتك الشخصية وتقييماتك.',medicalManagement:'الإدارة الطبية',financialManagement:'الإدارة المالية',practiceAdministration:'إدارة العيادة',newRecord:'ملف جديد',create:'إنشاء',update:'تحديث',view:'عرض',download:'تنزيل',print:'طباعة',back:'رجوع',
  doctorDashboard:'لوحة تحكم الطبيب',staffDashboard:'لوحة تحكم السكرتارية',welcomeDoctor:'مرحباً د. {{name}}',helloName:'مرحباً {{name}}',todayPriorities:'هذه أولويات العيادة لليوم.',instanceStatus:'حالة العيادة',trialEnds:'نهاية التجربة: {{date}}',activeTrial:'الفترة التجريبية لشهر مفعّلة',trialAccess:'وصول كامل إلى وظائف الطبيب خلال التجربة. تبقى {{count}} يومًا.',untilDate:'حتى {{date}}',appointmentsToday:'مواعيد اليوم',registeredPatients:'المرضى المسجلون',confirmedAppointments:'المواعيد المؤكدة',absentPatients:'المرضى المتغيبون',monthlyVisits:'زيارات الشهر',collectedAmount:'المبلغ المحصل',totalOutstanding:'إجمالي المتبقي',pendingCnss:'ملفات الضمان قيد المعالجة',upcomingAppointments:'المواعيد القادمة',noUpcomingAppointment:'لا توجد مواعيد قادمة.',latestPatients:'آخر المرضى المضافين',recentPatients:'المرضى الجدد',recentPayments:'المدفوعات الأخيرة',noRecentPatient:'لا يوجد مرضى جدد.',quickActions:'إجراءات سريعة',addPatient:'إضافة مريض',createAppointment:'إنشاء موعد',viewCalendar:'عرض التقويم',manageFees:'إدارة الأتعاب',manageDocuments:'إدارة الوثائق',manageStaff:'إدارة السكرتارية',recordPayment:'تسجيل دفعة',openCnss:'فتح ملفات الضمان',viewAgenda:'عرض الأجندة',viewAll:'عرض الكل',phoneMissing:'الهاتف غير مسجل',loadingDashboard:'جارٍ تحميل لوحة التحكم…',backToLogin:'العودة إلى تسجيل الدخول',
  findDoctorNav:'البحث عن طبيب',howItWorks:'كيف يعمل؟',patientProfessionals:'مهنيو فضاء صحة',findRightDoctor:'اعثر على الطبيب المناسب لك.',findDoctorIntro:'اكتشف العيادات واطّلع على تقييمات المرضى الموثقة واختر بثقة قبل طلب موعد.',doctorSearchPlaceholder:'طبيب أو تخصص أو عيادة',allCities:'جميع المدن',searchAction:'بحث',medicalDirectory:'الدليل الطبي',availableDoctors:'الأطباء والعيادات المتاحة',resultCount:'{{count}} نتيجة',verifiedProfile:'ملف موثّق',viewProfile:'عرض الملف',bookAppointment:'حجز موعد',noDoctorFound:'لم يتم العثور على طبيب',tryAnotherSearch:'جرّب بحثاً آخر أو اختر جميع المدن.',directoryUnavailable:'الدليل غير متاح',doctorLoadError:'تعذر تحميل الأطباء حالياً.',patientAccountSpace:'فضاء المريض',
  ...patientTranslations.ar,
}

i18n.use(initReactI18next).init({ lng: initialLanguage, fallbackLng: 'fr', interpolation: { escapeValue: false }, resources: { fr: { translation: fr }, en: { translation: en }, ar: { translation: ar } } })

const phraseKeys = new Map(
  Object.entries(fr)
    .filter(([, value]) => typeof value === 'string' && !value.includes('{{'))
    .map(([key, value]) => [value.trim(), key]),
)

const extraPhrases: Record<AppLanguage, Record<string, string>> = {
  fr: {},
  en: {
    ...workspacePhraseMap.en,
    'Aperçu': 'Preview', 'Télécharger': 'Download', 'Imprimer': 'Print', 'Ajouter un document': 'Add a document',
    'Détail du document': 'Document details', 'Bibliothèque sécurisée du cabinet': 'Secure practice library',
    'Tous les documents patients, ordonnances, pièces CNSS/CNOPS, factures et reçus au même endroit.': 'All patient documents, prescriptions, CNSS/CNOPS files, invoices and receipts in one place.',
    'Toutes les catégories': 'All categories', 'Aucun document dans cette catégorie': 'No document in this category',
    'Chargement…': 'Loading…', 'Chargement de la bibliothèque…': 'Loading library…', 'Enregistrer': 'Save',
    'Annuler': 'Cancel', 'Confirmer': 'Confirm', 'Choisir': 'Choose', 'Aucun': 'None', 'Aucune': 'None',
    'Actifs': 'Active', 'Désactivés': 'Disabled', 'Brouillon': 'Draft', 'Brouillons': 'Drafts',
    'En retard': 'Overdue', 'Encaissé': 'Collected', 'Espèces': 'Cash', 'Chèque': 'Cheque',
    'Carte': 'Card', 'Banque': 'Bank', 'Facture': 'Invoice', 'Reçu': 'Receipt', 'Ordonnance': 'Prescription',
    'Analyse': 'Lab test', 'Radio': 'X-ray', 'Autre': 'Other', 'Catégories': 'Categories',
    'Dossier patient': 'Patient file', 'Documents du patient': 'Patient documents', 'Documents liés': 'Linked documents',
    'Historique du patient': 'Patient history', 'Historique du rendez-vous': 'Appointment history',
    'Date et heure': 'Date and time', 'Début': 'Start', 'Fin': 'End', 'Durée': 'Duration',
    'Adresse du cabinet': 'Practice address', 'Adresse professionnelle': 'Professional address',
    'Configuration du cabinet': 'Practice settings', 'Horaires et disponibilités': 'Hours and availability',
    'Horaires de la semaine': 'Weekly hours', 'Heure de début': 'Start time', 'Heure de fin': 'End time',
    'Compte actif': 'Active account', 'Accès sécurisé': 'Secure access', 'Accès non autorisé': 'Access denied',
    'Créer une offre': 'Create a plan', 'Configuration commerciale': 'Commercial settings',
    'Encaissements d’abonnement': 'Subscription payments', 'Facturation SaaS': 'SaaS billing',
    'Expirations proches': 'Upcoming expirations', 'Dernières instances': 'Latest instances',
    'Conversation WhatsApp': 'WhatsApp conversation', 'Communications WhatsApp': 'WhatsApp communications',
    'Consentement WhatsApp': 'WhatsApp consent', 'Enregistrer le consentement': 'Save consent',
    'Aucune notification': 'No notifications', 'Aucun résultat': 'No results', 'Aucune donnée.': 'No data.',
    'Exporter CSV': 'Export CSV', 'Action': 'Action', 'Tous': 'All', 'Toutes': 'All',
    'Médecins et cabinets sur la carte': 'Doctors and practices on the map',
    'Sélectionnez un résultat pour afficher directement son emplacement.': 'Select a result to display its location.',
    'Ouvrir dans Google Maps': 'Open in Google Maps', 'Ouvrir l’itinéraire dans Google Maps': 'Open directions in Google Maps',
    'Chargement de la carte…': 'Loading map…', 'Aucun cabinet à afficher sur la carte.': 'No practice to display on the map.',
  },
  ar: {
    ...workspacePhraseMap.ar,
    'Aperçu': 'معاينة', 'Télécharger': 'تنزيل', 'Imprimer': 'طباعة', 'Ajouter un document': 'إضافة وثيقة',
    'Détail du document': 'تفاصيل الوثيقة', 'Bibliothèque sécurisée du cabinet': 'مكتبة العيادة الآمنة',
    'Tous les documents patients, ordonnances, pièces CNSS/CNOPS, factures et reçus au même endroit.': 'جميع وثائق المرضى والوصفات وملفات الضمان والفواتير والإيصالات في مكان واحد.',
    'Toutes les catégories': 'جميع الفئات', 'Aucun document dans cette catégorie': 'لا توجد وثائق في هذه الفئة',
    'Chargement…': 'جارٍ التحميل…', 'Chargement de la bibliothèque…': 'جارٍ تحميل المكتبة…', 'Enregistrer': 'حفظ',
    'Annuler': 'إلغاء', 'Confirmer': 'تأكيد', 'Choisir': 'اختيار', 'Aucun': 'لا يوجد', 'Aucune': 'لا توجد',
    'Actifs': 'نشطة', 'Désactivés': 'معطلة', 'Brouillon': 'مسودة', 'Brouillons': 'مسودات',
    'En retard': 'متأخر', 'Encaissé': 'محصل', 'Espèces': 'نقداً', 'Chèque': 'شيك',
    'Carte': 'بطاقة', 'Banque': 'البنك', 'Facture': 'فاتورة', 'Reçu': 'إيصال', 'Ordonnance': 'وصفة طبية',
    'Analyse': 'تحاليل', 'Radio': 'أشعة', 'Autre': 'أخرى', 'Catégories': 'الفئات',
    'Dossier patient': 'ملف المريض', 'Documents du patient': 'وثائق المريض', 'Documents liés': 'الوثائق المرتبطة',
    'Historique du patient': 'سجل المريض', 'Historique du rendez-vous': 'سجل الموعد',
    'Date et heure': 'التاريخ والوقت', 'Début': 'البداية', 'Fin': 'النهاية', 'Durée': 'المدة',
    'Adresse du cabinet': 'عنوان العيادة', 'Adresse professionnelle': 'العنوان المهني',
    'Configuration du cabinet': 'إعدادات العيادة', 'Horaires et disponibilités': 'الأوقات والتوفر',
    'Horaires de la semaine': 'أوقات الأسبوع', 'Heure de début': 'وقت البداية', 'Heure de fin': 'وقت النهاية',
    'Compte actif': 'حساب نشط', 'Accès sécurisé': 'وصول آمن', 'Accès non autorisé': 'الوصول غير مسموح',
    'Créer une offre': 'إنشاء عرض', 'Configuration commerciale': 'الإعدادات التجارية',
    'Encaissements d’abonnement': 'دفعات الاشتراك', 'Facturation SaaS': 'فوترة المنصة',
    'Expirations proches': 'انتهاء قريب', 'Dernières instances': 'أحدث العيادات',
    'Conversation WhatsApp': 'محادثة واتساب', 'Communications WhatsApp': 'مراسلات واتساب',
    'Consentement WhatsApp': 'موافقة واتساب', 'Enregistrer le consentement': 'حفظ الموافقة',
    'Aucune notification': 'لا توجد إشعارات', 'Aucun résultat': 'لا توجد نتائج', 'Aucune donnée.': 'لا توجد بيانات.',
    'Exporter CSV': 'تصدير CSV', 'Action': 'إجراء', 'Tous': 'الكل', 'Toutes': 'الكل',
    'Médecins et cabinets sur la carte': 'الأطباء والعيادات على الخريطة',
    'Sélectionnez un résultat pour afficher directement son emplacement.': 'اختر نتيجة لعرض موقعها مباشرة.',
    'Ouvrir dans Google Maps': 'فتح في خرائط Google', 'Ouvrir l’itinéraire dans Google Maps': 'فتح الاتجاهات في خرائط Google',
    'Chargement de la carte…': 'جارٍ تحميل الخريطة…', 'Aucun cabinet à afficher sur la carte.': 'لا توجد عيادة لعرضها على الخريطة.',
  },
}

const statusPhrases: Record<'en' | 'ar', Record<string, string>> = {
  en: {
    ACTIF: 'Active', INACTIF: 'Inactive', PLANIFIE: 'Scheduled', CONFIRME: 'Confirmed',
    EN_ATTENTE: 'Pending', EN_COURS: 'In progress', TERMINE: 'Completed', ABSENT: 'Absent',
    ANNULE: 'Cancelled', PAYE: 'Paid', IMPAYE: 'Unpaid', PARTIELLEMENT_PAYEE: 'Partially paid',
    BROUILLON: 'Draft', ENVOYE: 'Sent', TRAITE: 'Processed', RECU: 'Received',
    DEPOSE_CNSS: 'Submitted to CNSS/CNOPS', ACCEPTE: 'Accepted', REJETE: 'Rejected',
  },
  ar: {
    ACTIF: 'نشط', INACTIF: 'غير نشط', PLANIFIE: 'مبرمج', CONFIRME: 'مؤكد',
    EN_ATTENTE: 'في الانتظار', EN_COURS: 'قيد التنفيذ', TERMINE: 'مكتمل', ABSENT: 'غائب',
    ANNULE: 'ملغى', PAYE: 'مدفوع', IMPAYE: 'غير مدفوع', PARTIELLEMENT_PAYEE: 'مدفوع جزئياً',
    BROUILLON: 'مسودة', ENVOYE: 'تم الإرسال', TRAITE: 'تمت المعالجة', RECU: 'تم الاستلام',
    DEPOSE_CNSS: 'تم الإيداع لدى الضمان الاجتماعي', ACCEPTE: 'مقبول', REJETE: 'مرفوض',
  },
}

function translateDynamicPhrase(value: string, language: Exclude<AppLanguage, 'fr'>): string | null {
  const replacements: Array<[RegExp, (match: RegExpMatchArray) => string]> = language === 'ar'
    ? [
        [/^Voir les? (\d+) versements?$/, match => `عرض ${match[1]} دفعات`],
        [/^Versement (\d+) sur (\d+)$/i, match => `الدفعة ${match[1]} من ${match[2]}`],
        [/^(\d+) paiement\(s\) · page (\d+)\/(\d+)$/i, match => `${match[1]} دفعات · الصفحة ${match[2]}/${match[3]}`],
        [/^(\d+) dossier\(s\) · page (\d+)\/(\d+)$/i, match => `${match[1]} ملفات · الصفحة ${match[2]}/${match[3]}`],
        [/^(\d+) résultat(?:s)?$/i, match => `${match[1]} نتائج`],
        [/^(\d+) notification(?:s)?$/i, match => `${match[1]} إشعارات`],
        [/^(\d+) document(?:s)?$/i, match => `${match[1]} وثائق`],
        [/^(\d+) rendez-vous$/i, match => `${match[1]} مواعيد`],
        [/^créé le (.+)$/i, match => `أُنشئ في ${match[1]}`],
        [/^Mod\. (.+)$/i, match => `عُدّل في ${match[1]}`],
        [/^Motif : (.+)$/i, match => `السبب: ${match[1]}`],
      ]
    : [
        [/^Voir les? (\d+) versements?$/, match => `View ${match[1]} payment instalment${match[1] === '1' ? '' : 's'}`],
        [/^Versement (\d+) sur (\d+)$/i, match => `Instalment ${match[1]} of ${match[2]}`],
        [/^(\d+) paiement\(s\) · page (\d+)\/(\d+)$/i, match => `${match[1]} payment(s) · page ${match[2]}/${match[3]}`],
        [/^(\d+) dossier\(s\) · page (\d+)\/(\d+)$/i, match => `${match[1]} file(s) · page ${match[2]}/${match[3]}`],
        [/^(\d+) résultat(?:s)?$/i, match => `${match[1]} result(s)`],
        [/^(\d+) notification(?:s)?$/i, match => `${match[1]} notification(s)`],
        [/^(\d+) document(?:s)?$/i, match => `${match[1]} document(s)`],
        [/^(\d+) rendez-vous$/i, match => `${match[1]} appointment(s)`],
        [/^créé le (.+)$/i, match => `created on ${match[1]}`],
        [/^Mod\. (.+)$/i, match => `Updated ${match[1]}`],
        [/^Motif : (.+)$/i, match => `Reason: ${match[1]}`],
      ]
  for (const [pattern, formatter] of replacements) {
    const match = value.match(pattern)
    if (match) return formatter(match)
  }
  return null
}

export function translateUiPhrase(value: string, language: AppLanguage): string {
  const normalized = value.trim()
  if (!normalized || language === 'fr') return normalized
  const key = phraseKeys.get(normalized)
  if (key) return i18n.t(key, { lng: language })
  return extraPhrases[language][normalized]
    ?? statusPhrases[language][normalized]
    ?? translateDynamicPhrase(normalized, language)
    ?? normalized
}

const frenchByTranslatedPhrase = new Map<string, string>()

for (const [key, frenchValue] of Object.entries(fr)) {
  if (typeof frenchValue !== 'string' || frenchValue.includes('{{')) continue
  const englishValue = en[key as keyof TranslationDictionary]
  const arabicValue = ar[key as keyof TranslationDictionary]
  if (englishValue && englishValue !== frenchValue) frenchByTranslatedPhrase.set(englishValue.trim(), frenchValue.trim())
  if (arabicValue && arabicValue !== frenchValue) frenchByTranslatedPhrase.set(arabicValue.trim(), frenchValue.trim())
}
for (const language of ['en', 'ar'] as const) {
  for (const [frenchValue, translatedValue] of Object.entries(extraPhrases[language])) {
    if (translatedValue !== frenchValue) frenchByTranslatedPhrase.set(translatedValue.trim(), frenchValue.trim())
  }
  for (const [frenchValue, translatedValue] of Object.entries(statusPhrases[language])) {
    if (translatedValue !== frenchValue) frenchByTranslatedPhrase.set(translatedValue.trim(), frenchValue.trim())
  }
}

function reverseDynamicPhrase(value: string): string | null {
  const patterns: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
    [/^View (\d+) payment instalments?$/i, match => `Voir les ${match[1]} versements`],
    [/^Instalment (\d+) of (\d+)$/i, match => `Versement ${match[1]} sur ${match[2]}`],
    [/^(\d+) payment\(s\) · page (\d+)\/(\d+)$/i, match => `${match[1]} paiement(s) · page ${match[2]}/${match[3]}`],
    [/^(\d+) file\(s\) · page (\d+)\/(\d+)$/i, match => `${match[1]} dossier(s) · page ${match[2]}/${match[3]}`],
    [/^created on (.+)$/i, match => `créé le ${match[1]}`],
    [/^Updated (.+)$/i, match => `Mod. ${match[1]}`],
    [/^Reason: (.+)$/i, match => `Motif : ${match[1]}`],
    [/^(\d+) results?$/i, match => `${match[1]} résultat${match[1] === '1' ? '' : 's'}`],
    [/^(\d+) notifications?$/i, match => `${match[1]} notification${match[1] === '1' ? '' : 's'}`],
    [/^(\d+) documents?$/i, match => `${match[1]} document${match[1] === '1' ? '' : 's'}`],
    [/^(\d+) appointments?$/i, match => `${match[1]} rendez-vous`],
    [/^عرض (\d+) دفعات$/i, match => `Voir les ${match[1]} versements`],
    [/^الدفعة (\d+) من (\d+)$/i, match => `Versement ${match[1]} sur ${match[2]}`],
    [/^(\d+) دفعات · الصفحة (\d+)\/(\d+)$/i, match => `${match[1]} paiement(s) · page ${match[2]}/${match[3]}`],
    [/^(\d+) ملفات · الصفحة (\d+)\/(\d+)$/i, match => `${match[1]} dossier(s) · page ${match[2]}/${match[3]}`],
    [/^أُنشئ في (.+)$/i, match => `créé le ${match[1]}`],
    [/^عُدّل في (.+)$/i, match => `Mod. ${match[1]}`],
    [/^السبب:\s*(.+)$/i, match => `Motif : ${match[1]}`],
    [/^(\d+) نتائج?$/i, match => `${match[1]} résultat${match[1] === '1' ? '' : 's'}`],
    [/^(\d+) إشعارات?$/i, match => `${match[1]} notification${match[1] === '1' ? '' : 's'}`],
    [/^(\d+) وثائق?$/i, match => `${match[1]} document${match[1] === '1' ? '' : 's'}`],
    [/^(\d+) مواعيد?$/i, match => `${match[1]} rendez-vous`],
  ]
  for (const [pattern, formatter] of patterns) {
    const match = value.match(pattern)
    if (match) return formatter(match)
  }
  return null
}

/** Return the stable French source for a translated UI phrase. */
export function toFrenchUiPhrase(value: string): string {
  const normalized = value.trim()
  return frenchByTranslatedPhrase.get(normalized) ?? reverseDynamicPhrase(normalized) ?? normalized
}

function updateDocumentDirection(language: AppLanguage) {
  document.documentElement.lang = language
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.dataset.language = language
  document.documentElement.classList.toggle('rtl', language === 'ar')
  document.documentElement.classList.toggle('ltr', language !== 'ar')
  if (document.body) document.body.dir = language === 'ar' ? 'rtl' : 'ltr'
}

let languageChangeSequence = 0

async function changeApplicationLanguage(language: AppLanguage, persist: boolean) {
  const sequence = ++languageChangeSequence
  if (persist) localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  updateDocumentDirection(language)
  await i18n.changeLanguage(language)
  if (sequence !== languageChangeSequence) return
  updateDocumentDirection(language)
  window.dispatchEvent(new CustomEvent<AppLanguage>('fadaa:language-changed', { detail: language }))
}

export function applyLanguage(language: AppLanguage): Promise<void> {
  return changeApplicationLanguage(language, true)
}

void changeApplicationLanguage(initialLanguage, false)

window.addEventListener('storage', event => {
  if (event.key !== LANGUAGE_STORAGE_KEY) return
  const language = normalizeAppLanguage(event.newValue) ?? getPreferredLanguage()
  void changeApplicationLanguage(language, false)
})
export default i18n
