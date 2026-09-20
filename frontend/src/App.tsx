import { useEffect, useState } from 'react'

import { LoginPage } from './features/auth/LoginPage'
import { ActivateStaffPage } from './features/auth/ActivateStaffPage'
import { ActivatePatientPage } from './features/auth/ActivatePatientPage'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { RegisterPatientPage } from './features/auth/RegisterPatientPage'
import { RoleBasedRedirect } from './features/auth/RoleBasedRedirect'
import { CrudModulePage } from './features/dashboard/CrudModulePage'
import { DoctorDashboard } from './features/dashboard/DoctorDashboard'
import { CalendarPage } from './features/dashboard/CalendarPage'
import { AppointmentHistoryPage, PatientAppointmentHistoryPage } from './features/dashboard/AppointmentHistoryPage'
import { CabinetPage } from './features/dashboard/CabinetPage'
import { SchedulePage } from './features/dashboard/SchedulePage'
import { PatientsPage } from './features/dashboard/PatientsPage'
import { PatientDetailPage } from './features/dashboard/PatientDetailPage'
import { StaffManagementPage } from './features/dashboard/StaffManagementPage'
import { SubscriptionPage } from './features/dashboard/SubscriptionPage'
import { VisitsPage } from './features/dashboard/VisitsPage'
import { FeesPage } from './features/dashboard/FeesPage'
import { HonoraireDetailsPage } from './features/dashboard/HonoraireDetailsPage'
import { FinanceWorkspacePage } from './features/dashboard/FinanceWorkspacePage'
import { PaymentsPage } from './features/dashboard/PaymentsPage'
import { CnssPage } from './features/dashboard/CnssPage'
import { PrescriptionsPage } from './features/dashboard/PrescriptionsPage'
import { DocumentsPage } from './features/dashboard/DocumentsPage'
import { DoctorSupportPage } from './features/dashboard/DoctorSupportPage'
import { DoctorReviewsPage } from './features/dashboard/DoctorReviewsPage'
import { WhatsAppModulePage } from './features/dashboard/WhatsAppModulePage'
import { PlaceholderDashboard } from './features/dashboard/PlaceholderDashboard'
import { doctorModuleConfigs } from './features/dashboard/moduleConfigs'
import { PublicLanding } from './features/public/PublicLanding'
import { PublicAppointmentBooking } from './features/public/PublicAppointmentBooking'
import { PublicEventPage } from './features/public/PublicEventPage'
import { PublicEventsPage } from './features/public/PublicEventsPage'
import { PublicBlogPage } from './features/public/PublicBlogPage'
import { PricingPage } from './features/public/PricingPage'
import { SignupFlow } from './features/onboarding/SignupFlow'
import { StaffDashboard } from './features/staff/StaffDashboard'
import { StaffPermissionRoute } from './features/staff/StaffPermissionRoute'
import { StaffProfilePage } from './features/staff/StaffProfilePage'
import { StaffRemindersPage } from './features/staff/StaffRemindersPage'
import { AdminDashboard, AdminLogsPage, AdminSettingsPage, AdminSubscriptionsPage, AdminSupportPage, AdminTenantsPage, AdminUsersPage } from './features/admin/AdminPages'
import { AdminPlansManager } from './features/admin/AdminPlansManager'
import { PatientAppointments, PatientCommunicationPreferences, PatientDashboard, PatientListPage, PatientProfile, PatientReviewsPage } from './features/patient/PatientPortal'
import { PatientCnssPage } from './features/patient/PatientCnssPage'
import { SecurityAuditPage } from './features/dashboard/SecurityAuditPage'
import { AdminBackupsPage } from './features/admin/AdminBackupsPage'
import { AdminEventsPage } from './features/admin/AdminEventsPage'
import { AdminBlogPage } from './features/admin/AdminBlogPage'
import { AdminMediaPage } from './features/admin/AdminMediaPage'
import { AdminWhatsAppPage } from './features/admin/AdminWhatsAppPage'
import { isValidPhone, phoneInput } from './lib/phone'
import { getSession } from './lib/auth'
import { applyCabinetTheme } from './lib/theme'

type Route = string

function getRoute(): Route {
  const path = window.location.pathname || '/'
  if (path === '/medecin/dashboard') {
    window.history.replaceState({}, '', '/doctor/dashboard')
    return '/doctor/dashboard'
  }
  return path
}

function App() {
  const [route, setRoute] = useState<Route>(() => getRoute())

  useEffect(() => {
    const handlePopState = () => setRoute(getRoute())
    const handleSessionExpired = () => {
      if (window.location.pathname !== '/login') {
        window.history.replaceState({}, '', '/login')
        setRoute('/login')
      }
    }
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('fadaa:session-expired', handleSessionExpired)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('fadaa:session-expired', handleSessionExpired)
    }
  }, [])

  useEffect(()=>{
    const validate=(event:Event)=>{const input=event.target;if(!(input instanceof HTMLInputElement)||input.type!=='tel')return;const clean=phoneInput(input.value);if(clean!==input.value)input.value=clean;input.setCustomValidity(clean&&!isValidPhone(clean,false)?'Numéro invalide. Exemple : 06 12 34 56 78.':'')}
    document.addEventListener('input',validate,true);document.addEventListener('blur',validate,true)
    return()=>{document.removeEventListener('input',validate,true);document.removeEventListener('blur',validate,true)}
  },[])

  useEffect(()=>{
    const session=getSession()
    const isProfessionalArea=route.startsWith('/doctor/')||route.startsWith('/staff/')
    if(!isProfessionalArea||!session?.accessToken||!session.tenantId){applyCabinetTheme();return}
    if(['PATIENT','patient'].includes(session.role??'')){applyCabinetTheme();return}
    const apiUrl=import.meta.env.VITE_API_URL??''
    const controller=new AbortController()
    fetch(`${apiUrl}/api/auth/me`,{headers:{Authorization:`Bearer ${session.accessToken}`},signal:controller.signal})
      .then(response=>response.ok?response.json():null)
      .then(data=>applyCabinetTheme(data?.tenant?.primary_color))
      .catch(()=>{if(!controller.signal.aborted)applyCabinetTheme()})
    return()=>controller.abort()
  },[route])

  const navigate = (path: string) => {
    window.history.pushState({}, '', path)
    setRoute(getRoute())
    window.dispatchEvent(new Event('fadaa:navigation'))
  }

  const openPatientBooking = async () => {
    navigate('/book-appointment')
  }

  const staffActivationToken = route.match(/^\/activate-staff\/([^/]+)$/)?.[1]
    ?? (route === '/activate-staff' ? new URLSearchParams(window.location.search).get('token') ?? undefined : undefined)
  if (staffActivationToken) return <ActivateStaffPage token={decodeURIComponent(staffActivationToken)} onLogin={() => navigate('/login')} />
  const patientActivationToken=route.match(/^\/activate-patient\/([^/]+)$/)?.[1]
  if(patientActivationToken)return <ActivatePatientPage token={decodeURIComponent(patientActivationToken)} onLogin={()=>navigate('/login')}/>

  if(route==='/tarifs')return <PricingPage onBack={()=>navigate('/')} onSelect={slug=>navigate(`/register-doctor?plan=${encodeURIComponent(slug)}`)}/>

  const publicEventSlug=route.match(/^\/evenements\/([^/]+)$/)?.[1]
  if(publicEventSlug)return <PublicEventPage slug={decodeURIComponent(publicEventSlug)} onBack={()=>navigate('/evenements')}/>
  if(route==='/evenements')return <PublicEventsPage onBack={()=>navigate('/')}/>
  const publicBlogSlug=route.match(/^\/blog\/([^/]+)$/)?.[1]
  if(publicBlogSlug)return <PublicBlogPage slug={decodeURIComponent(publicBlogSlug)} onBack={()=>navigate('/blog')}/>
  if(route==='/blog')return <PublicBlogPage onBack={()=>navigate('/#blog')}/>

  const publicCabinetSlug=route.match(/^\/cabinet\/([^/]+)$/)?.[1]
  if(publicCabinetSlug)return <PublicAppointmentBooking cabinetSlug={decodeURIComponent(publicCabinetSlug)} onBack={()=>navigate('/find-doctor')} onCreateAccount={()=>navigate('/login')}/>

  if(route==='/book-appointment')return <PublicAppointmentBooking onBack={()=>navigate(['PATIENT','patient'].includes(getSession()?.role??'')?'/patient/appointments':'/find-doctor')} onCreateAccount={()=>navigate('/login')}/>

  if(route==='/find-doctor')return <PublicLanding initialAudience="patient" onStart={()=>navigate('/register-doctor')} onPatientStart={()=>navigate('/book-appointment')} onPatientBook={openPatientBooking} onLogin={()=>navigate('/login')} onPricing={()=>navigate('/tarifs')}/>
  if(route==='/patient/find-doctor')return <ProtectedRoute allowedRoles={['PATIENT','patient']} onNavigate={navigate}><PublicLanding initialAudience="patient" onStart={()=>navigate('/register-doctor')} onPatientStart={()=>navigate('/register-patient')} onPatientBook={openPatientBooking} onPatientSpace={()=>navigate('/patient/dashboard')} onLogin={()=>navigate('/login')}/></ProtectedRoute>

  if (route === '/register-doctor') {
    return <SignupFlow onBackHome={() => navigate('/')} onCreated={() => navigate('/doctor/dashboard')} />
  }

  if (route === '/login') {
    return (
      <LoginPage
        onSignup={() => navigate('/register-doctor')}
        onBackHome={() => navigate('/')}
        onNavigate={navigate}
      />
    )
  }

  if (route === '/register-patient') {
    return <PublicLanding initialAudience="patient" onStart={()=>navigate('/register-doctor')} onPatientStart={()=>navigate('/book-appointment')} onPatientBook={openPatientBooking} onLogin={()=>navigate('/login')} onPricing={()=>navigate('/tarifs')} />
  }

  if (route === '/doctor/dashboard') {
    return (
      <ProtectedRoute allowedRoles={['MEDECIN_ADMIN', 'doctor_admin']} onNavigate={navigate}>
        <DoctorDashboard onNavigate={navigate} />
      </ProtectedRoute>
    )
  }

  const doctorAppointmentHistoryId=route.match(/^\/doctor\/appointments\/([^/]+)\/history$/)?.[1]
  if(doctorAppointmentHistoryId)return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><AppointmentHistoryPage appointmentId={doctorAppointmentHistoryId} onNavigate={navigate}/></ProtectedRoute>
  const doctorPatientHistoryId=route.match(/^\/doctor\/patients\/([^/]+)\/history$/)?.[1]
  if(doctorPatientHistoryId)return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><PatientAppointmentHistoryPage patientId={doctorPatientHistoryId} onNavigate={navigate}/></ProtectedRoute>
  const doctorPatientId=route.match(/^\/doctor\/patients\/([^/]+)$/)?.[1]
  if(doctorPatientId)return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><PatientDetailPage patientId={doctorPatientId} onNavigate={navigate}/></ProtectedRoute>

  if (route === '/doctor/calendar' || route === '/doctor/appointments') {
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN', 'doctor_admin']} onNavigate={navigate}><CalendarPage onNavigate={navigate} /></ProtectedRoute>
  }

  if (route === '/doctor/schedule') {
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN', 'doctor_admin']} onNavigate={navigate}><SchedulePage onNavigate={navigate} /></ProtectedRoute>
  }

  if (route === '/activate-staff') return <ActivateStaffPage onLogin={() => navigate('/login')} />

  if (route === '/doctor/settings' || route === '/doctor/cabinet') {
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN', 'doctor_admin']} onNavigate={navigate}><CabinetPage onNavigate={navigate} /></ProtectedRoute>
  }

  if (route === '/doctor/patients' || route.startsWith('/doctor/patients/')) {
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN', 'doctor_admin']} onNavigate={navigate}><PatientsPage onNavigate={navigate} /></ProtectedRoute>
  }

  if (route === '/doctor/staff') {
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><StaffManagementPage onNavigate={navigate}/></ProtectedRoute>
  }

  if (route === '/doctor/subscription') {
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><SubscriptionPage onNavigate={navigate}/></ProtectedRoute>
  }

  if (route === '/doctor/visits') {
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><VisitsPage onNavigate={navigate}/></ProtectedRoute>
  }

  const doctorFeeId=route.match(/^\/doctor\/honoraires\/([^/]+)$/)?.[1]
  if(doctorFeeId)return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><HonoraireDetailsPage feeId={doctorFeeId} onNavigate={navigate}/></ProtectedRoute>
  if (route === '/doctor/honoraires') {
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><FeesPage onNavigate={navigate}/></ProtectedRoute>
  }

  if (route === '/doctor/payments') {
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><PaymentsPage onNavigate={navigate}/></ProtectedRoute>
  }

  const financeViews = {
    '/doctor/finance': 'finance',
    '/doctor/finance/recap': 'recap',
    '/doctor/finance/settlements': 'settlements',
    '/doctor/finance/expenses': 'expenses',
    '/doctor/finance/purchases': 'purchases',
    '/doctor/recap': 'recap',
    '/doctor/settlements': 'settlements',
    '/doctor/expenses': 'expenses',
    '/doctor/purchases': 'purchases',
  } as const
  if (route in financeViews) {
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><FinanceWorkspacePage view={financeViews[route as keyof typeof financeViews]} onNavigate={navigate}/></ProtectedRoute>
  }
  const nestedFinanceSubRoute=route.match(/^\/doctor\/finance\/(recap|settlements|expenses|purchases)\/(calendar|statistics|files)$/)
  if(nestedFinanceSubRoute){
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><FinanceWorkspacePage view={nestedFinanceSubRoute[1] as 'recap'|'settlements'|'expenses'|'purchases'} panel={nestedFinanceSubRoute[2] as 'calendar'|'statistics'|'files'} onNavigate={navigate}/></ProtectedRoute>
  }
  const financeSubRoute=route.match(/^\/doctor\/(finance|recap|settlements|expenses|purchases)\/(calendar|statistics|files)$/)
  if(financeSubRoute){
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><FinanceWorkspacePage view={financeSubRoute[1] as 'finance'|'recap'|'settlements'|'expenses'|'purchases'} panel={financeSubRoute[2] as 'calendar'|'statistics'|'files'} onNavigate={navigate}/></ProtectedRoute>
  }

  if (route === '/doctor/cnss') {
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><CnssPage onNavigate={navigate}/></ProtectedRoute>
  }

  if (route === '/doctor/prescriptions') {
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><PrescriptionsPage onNavigate={navigate}/></ProtectedRoute>
  }

  if (route === '/doctor/documents') {
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><DocumentsPage onNavigate={navigate}/></ProtectedRoute>
  }

  if (route === '/doctor/reminders') {
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><StaffRemindersPage mode="doctor" onNavigate={navigate}/></ProtectedRoute>
  }

  if (route === '/doctor/support'||route.startsWith('/doctor/support/')) {
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><DoctorSupportPage ticketId={route.split('/')[3]} onNavigate={navigate}/></ProtectedRoute>
  }


  if (route === '/doctor/reviews') {
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><DoctorReviewsPage onNavigate={navigate}/></ProtectedRoute>
  }
  if(route.startsWith('/doctor/whatsapp')){
    const view=route.endsWith('/templates')?'templates':route.endsWith('/messages')?'messages':route.endsWith('/conversations')?'conversations':'configuration'
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><WhatsAppModulePage initialView={view} onNavigate={navigate}/></ProtectedRoute>
  }

  if (route === '/doctor/security/audit-logs' || route === '/medecin/securite/audit-logs') {
    return <ProtectedRoute allowedRoles={['MEDECIN_ADMIN','doctor_admin']} onNavigate={navigate}><SecurityAuditPage onNavigate={navigate}/></ProtectedRoute>
  }

  const doctorConfig = doctorModuleConfigs[route]

  if (doctorConfig) {
    return (
      <ProtectedRoute allowedRoles={['MEDECIN_ADMIN', 'doctor_admin']} onNavigate={navigate}>
        <CrudModulePage config={doctorConfig} onNavigate={navigate} />
      </ProtectedRoute>
    )
  }

  if (route === '/staff/dashboard') {
    return (
      <ProtectedRoute allowedRoles={['SECRETAIRE', 'secretary']} onNavigate={navigate}>
        <StaffDashboard onNavigate={navigate} />
      </ProtectedRoute>
    )
  }

  if (route === '/staff/team') return <ProtectedRoute allowedRoles={['SECRETAIRE','secretary']} onNavigate={navigate}><StaffPermissionRoute module="manage_staff" onNavigate={navigate}>{()=> <StaffManagementPage mode="staff" onNavigate={navigate}/>}</StaffPermissionRoute></ProtectedRoute>

  if (route === '/staff/profile') return <ProtectedRoute allowedRoles={['SECRETAIRE','secretary']} onNavigate={navigate}><StaffProfilePage onNavigate={navigate}/></ProtectedRoute>
  if (route === '/staff/reminders') return <ProtectedRoute allowedRoles={['SECRETAIRE','secretary']} onNavigate={navigate}><StaffPermissionRoute module="whatsapp_reminders" onNavigate={navigate}>{()=> <StaffRemindersPage onNavigate={navigate}/>}</StaffPermissionRoute></ProtectedRoute>
  if (route === '/staff/payments') return <ProtectedRoute allowedRoles={['SECRETAIRE','secretary']} onNavigate={navigate}><StaffPermissionRoute module="payments" onNavigate={navigate}>{level=><PaymentsPage mode="staff" permissionLevel={level} onNavigate={navigate}/>}</StaffPermissionRoute></ProtectedRoute>
  const staffFeeId=route.match(/^\/staff\/honoraires\/([^/]+)$/)?.[1]
  if(staffFeeId)return <ProtectedRoute allowedRoles={['SECRETAIRE','secretary']} onNavigate={navigate}><StaffPermissionRoute module="honoraires" onNavigate={navigate}>{level=><HonoraireDetailsPage feeId={staffFeeId} mode="staff" permissionLevel={level} onNavigate={navigate}/>}</StaffPermissionRoute></ProtectedRoute>
  if (route === '/staff/honoraires') return <ProtectedRoute allowedRoles={['SECRETAIRE','secretary']} onNavigate={navigate}><StaffPermissionRoute module="honoraires" onNavigate={navigate}>{level=><FeesPage mode="staff" permissionLevel={level} onNavigate={navigate}/>}</StaffPermissionRoute></ProtectedRoute>
  if (route === '/staff/cnss') return <ProtectedRoute allowedRoles={['SECRETAIRE','secretary']} onNavigate={navigate}><StaffPermissionRoute module="cnss" onNavigate={navigate}>{level=><CnssPage mode="staff" permissionLevel={level} onNavigate={navigate}/>}</StaffPermissionRoute></ProtectedRoute>
  if (route === '/staff/documents') return <ProtectedRoute allowedRoles={['SECRETAIRE','secretary']} onNavigate={navigate}><StaffPermissionRoute module="documents" onNavigate={navigate}>{level=><DocumentsPage mode="staff" permissionLevel={level} onNavigate={navigate}/>}</StaffPermissionRoute></ProtectedRoute>

  const staffModules: Record<string, { module:string; config?:string }> = {
    '/staff/payments': {module:'payments',config:'/doctor/payments'}, '/staff/honoraires': {module:'honoraires',config:'/doctor/honoraires'},
    '/staff/cnss': {module:'cnss',config:'/doctor/cnss'}, '/staff/documents': {module:'documents',config:'/doctor/documents'},
    '/staff/prescriptions': {module:'prescriptions',config:'/doctor/prescriptions'}
  }
  if (route === '/staff/appointments' || route === '/staff/calendar') return <ProtectedRoute allowedRoles={['SECRETAIRE','secretary']} onNavigate={navigate}><StaffPermissionRoute module="appointments" onNavigate={navigate}>{level=><CalendarPage mode="staff" permissionLevel={level} onNavigate={navigate}/>}</StaffPermissionRoute></ProtectedRoute>
  const staffAppointmentHistoryId=route.match(/^\/staff\/appointments\/([^/]+)\/history$/)?.[1]
  if(staffAppointmentHistoryId)return <ProtectedRoute allowedRoles={['SECRETAIRE','secretary']} onNavigate={navigate}><StaffPermissionRoute module="appointments" onNavigate={navigate}>{level=><AppointmentHistoryPage appointmentId={staffAppointmentHistoryId} mode="staff" permissionLevel={level} onNavigate={navigate}/>}</StaffPermissionRoute></ProtectedRoute>
  const staffPatientHistoryId=route.match(/^\/staff\/patients\/([^/]+)\/history$/)?.[1]
  if(staffPatientHistoryId)return <ProtectedRoute allowedRoles={['SECRETAIRE','secretary']} onNavigate={navigate}><StaffPermissionRoute module="patients" onNavigate={navigate}>{()=><PatientAppointmentHistoryPage patientId={staffPatientHistoryId} mode="staff" onNavigate={navigate}/>}</StaffPermissionRoute></ProtectedRoute>
  if (route === '/staff/patients' || route.startsWith('/staff/patients/')) return <ProtectedRoute allowedRoles={['SECRETAIRE','secretary']} onNavigate={navigate}><StaffPermissionRoute module="patients" onNavigate={navigate}>{level=><PatientsPage mode="staff" permissionLevel={level} onNavigate={navigate}/>}</StaffPermissionRoute></ProtectedRoute>
  if (staffModules[route]) { const item=staffModules[route]; const config=doctorModuleConfigs[item.config!]; return <ProtectedRoute allowedRoles={['SECRETAIRE','secretary']} onNavigate={navigate}><StaffPermissionRoute module={item.module} onNavigate={navigate}>{level=><CrudModulePage config={config} mode="staff" permissionLevel={level} onNavigate={navigate}/>}</StaffPermissionRoute></ProtectedRoute> }

  if (route === '/patient/dashboard') {
    return (
      <ProtectedRoute allowedRoles={['PATIENT', 'patient']} onNavigate={navigate}>
        <PatientDashboard onNavigate={navigate} />
      </ProtectedRoute>
    )
  }

  if(['/patient/appointments','/patient/rendez-vous'].includes(route))return <ProtectedRoute allowedRoles={['PATIENT','patient']} onNavigate={navigate}><PatientAppointments onNavigate={navigate}/></ProtectedRoute>
  if(['/patient/appointments/request','/patient/demande-rendez-vous'].includes(route))return <ProtectedRoute allowedRoles={['PATIENT','patient']} onNavigate={navigate}><PatientAppointments request onNavigate={navigate}/></ProtectedRoute>
  if(route==='/patient/profile')return <ProtectedRoute allowedRoles={['PATIENT','patient']} onNavigate={navigate}><PatientProfile onNavigate={navigate}/></ProtectedRoute>
  if(route==='/patient/communication-preferences')return <ProtectedRoute allowedRoles={['PATIENT','patient']} onNavigate={navigate}><PatientCommunicationPreferences onNavigate={navigate}/></ProtectedRoute>
  if(route==='/patient/reviews')return <ProtectedRoute allowedRoles={['PATIENT','patient']} onNavigate={navigate}><PatientReviewsPage onNavigate={navigate}/></ProtectedRoute>
  if(route==='/patient/cnss')return <ProtectedRoute allowedRoles={['PATIENT','patient']} onNavigate={navigate}><PatientCnssPage onNavigate={navigate}/></ProtectedRoute>
  const patientAliases:Record<string,'visits'|'documents'|'prescriptions'>={'/patient/visites':'visits','/patient/ordonnances':'prescriptions'}
  const patientKind=(patientAliases[route]??route.match(/^\/patient\/(visits|documents|prescriptions|cnss|payments)$/)?.[1]) as 'visits'|'documents'|'prescriptions'|'cnss'|'payments'|undefined
  if(patientKind)return <ProtectedRoute allowedRoles={['PATIENT','patient']} onNavigate={navigate}><PatientListPage kind={patientKind} onNavigate={navigate}/></ProtectedRoute>

  if (route === '/super-admin/dashboard') {
    return (
      <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SUPER_ADMIN_IRMA', 'platform_super_admin']} onNavigate={navigate}>
        <AdminDashboard onNavigate={navigate} />
      </ProtectedRoute>
    )
  }

  const adminRoles=['SUPER_ADMIN','SUPER_ADMIN_IRMA','platform_super_admin']
  if(route==='/super-admin/instances'||route.startsWith('/super-admin/instances/'))return <ProtectedRoute allowedRoles={adminRoles} onNavigate={navigate}><AdminTenantsPage tenantId={route.split('/')[3]} onNavigate={navigate}/></ProtectedRoute>
  if(route==='/super-admin/abonnements')return <ProtectedRoute allowedRoles={adminRoles} onNavigate={navigate}><AdminSubscriptionsPage onNavigate={navigate}/></ProtectedRoute>
  if(route==='/super-admin/subscription-plans')return <ProtectedRoute allowedRoles={adminRoles} onNavigate={navigate}><AdminPlansManager onNavigate={navigate}/></ProtectedRoute>
  if(route==='/super-admin/support'||route.startsWith('/super-admin/support/'))return <ProtectedRoute allowedRoles={adminRoles} onNavigate={navigate}><AdminSupportPage ticketId={route.split('/')[3]} onNavigate={navigate}/></ProtectedRoute>
  if(route==='/super-admin/utilisateurs')return <ProtectedRoute allowedRoles={adminRoles} onNavigate={navigate}><AdminUsersPage onNavigate={navigate}/></ProtectedRoute>
  if(route==='/super-admin/settings')return <ProtectedRoute allowedRoles={adminRoles} onNavigate={navigate}><AdminSettingsPage onNavigate={navigate}/></ProtectedRoute>
  if(route==='/super-admin/whatsapp')return <ProtectedRoute allowedRoles={adminRoles} onNavigate={navigate}><AdminWhatsAppPage onNavigate={navigate}/></ProtectedRoute>
  if(route==='/super-admin/backups')return <ProtectedRoute allowedRoles={adminRoles} onNavigate={navigate}><AdminBackupsPage onNavigate={navigate}/></ProtectedRoute>
  if(route==='/super-admin/evenements')return <ProtectedRoute allowedRoles={adminRoles} onNavigate={navigate}><AdminEventsPage onNavigate={navigate}/></ProtectedRoute>
  if(route==='/super-admin/blog')return <ProtectedRoute allowedRoles={adminRoles} onNavigate={navigate}><AdminBlogPage onNavigate={navigate}/></ProtectedRoute>
  if(route==='/super-admin/mediatheque')return <ProtectedRoute allowedRoles={adminRoles} onNavigate={navigate}><AdminMediaPage onNavigate={navigate}/></ProtectedRoute>
  if(route==='/super-admin/logs')return <ProtectedRoute allowedRoles={adminRoles} onNavigate={navigate}><AdminLogsPage onNavigate={navigate}/></ProtectedRoute>

  if (window.location.pathname === '/auth/redirect') {
    return <RoleBasedRedirect onNavigate={navigate} />
  }

  return <PublicLanding onStart={() => navigate('/register-doctor')} onPatientStart={() => navigate('/book-appointment')} onPatientBook={openPatientBooking} onLogin={() => navigate('/login')} onPricing={()=>navigate('/tarifs')} />
}

export default App
