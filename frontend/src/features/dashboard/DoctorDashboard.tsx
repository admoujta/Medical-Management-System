import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, ClipboardList, Clock3, CreditCard, FileText, Play, Stethoscope, UsersRound, UserPlus, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { apiGet, DoctorDashboardResponse, getDoctorDashboard } from '../../lib/api'
import { getSession, logout } from '../../lib/auth'
import { DashboardCard } from './DashboardCard'
import { InstanceStatusBadge } from './InstanceStatusBadge'
import { MedecinLayout } from './MedecinLayout'

type DoctorDashboardProps = {
  onNavigate: (path: string) => void
}

const actions = [
  ['addPatient', '/doctor/patients', UserPlus],
  ['createAppointment', '/doctor/appointments', CalendarDays],
  ['viewCalendar', '/doctor/calendar', CalendarDays],
  ['manageFees', '/doctor/honoraires', WalletCards],
  ['manageDocuments', '/doctor/documents', FileText],
  ['manageStaff', '/doctor/staff', UsersRound]
]

const appointmentStatuses: Record<string, { label: string; style: string }> = {
  requested: { label: 'À confirmer', style: 'bg-blue-50 text-blue-700' },
  planned: { label: 'Planifié', style: 'bg-slate-100 text-slate-700' },
  confirmed: { label: 'Confirmé', style: 'bg-emerald-50 text-emerald-700' },
  waiting: { label: 'En attente', style: 'bg-amber-50 text-amber-800' },
  in_progress: { label: 'En consultation', style: 'bg-amber-100 text-amber-900' },
  completed: { label: 'Terminé', style: 'bg-emerald-100 text-emerald-800' },
  absent: { label: 'Absent', style: 'bg-red-50 text-red-700' },
  cancelled: { label: 'Annulé', style: 'bg-slate-100 text-slate-500' },
  rejected: { label: 'Refusé', style: 'bg-red-50 text-red-700' }
}

const startableStatuses = new Set(['requested', 'planned', 'confirmed', 'waiting', 'present', 'in_progress'])

export function DoctorDashboard({ onNavigate }: DoctorDashboardProps) {
  const {t,i18n}=useTranslation()
  const session = getSession()
  const cacheKey = `fadaa_doctor_dashboard_v2_${session?.tenantId ?? 'none'}`
  const [data, setData] = useState<DoctorDashboardResponse | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(cacheKey) ?? 'null') }
    catch { return null }
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session?.accessToken) return
    getDoctorDashboard(session.accessToken)
      .then((dashboard) => {
        setData(dashboard)
        sessionStorage.setItem(cacheKey, JSON.stringify(dashboard))
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Chargement impossible.'))
  }, [cacheKey, session?.accessToken])

  function handleLogout() {
    logout()
    onNavigate('/login')
  }

  if (error && !data) {
    return (
      <main className="grid min-h-screen place-items-center bg-atlas-cloud px-5 text-atlas-ink">
        <section className="max-w-md rounded-[8px] border border-red-200 bg-white p-8 text-center shadow-panel">
          <p className="text-sm font-bold text-red-600">{error}</p>
          <button type="button" onClick={handleLogout} className="mt-6 rounded-[8px] bg-atlas-teal px-5 py-3 text-sm font-bold text-white">
            {t('backToLogin')}
          </button>
        </section>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-atlas-cloud text-atlas-ink">
        <p className="rounded-full bg-white px-5 py-3 text-sm font-bold shadow-sm">{t('loadingDashboard')}</p>
      </main>
    )
  }

  const trialEndDate = new Date(data.tenant.trial_ends_at)
  const trialEnd = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(trialEndDate)
  const trialDaysLeft = Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / 86_400_000))
  const today = new Date().toISOString().slice(0, 10)
  const todayAppointments = data.today_appointments ?? data.upcoming_appointments.filter((item) => item.date === today)

  function openAppointment(appointmentId: string, start = false) {
    const query = new URLSearchParams({ appointment: appointmentId })
    if (start) query.set('action', 'start')
    onNavigate(`/doctor/appointments?${query.toString()}`)
  }

  async function openPatientRecord(appointment: DoctorDashboardResponse['today_appointments'][number]) {
    if (appointment.patient_id) {
      onNavigate(`/doctor/patients/${appointment.patient_id}`)
      return
    }
    if (!session?.accessToken) return
    try {
      const current = await apiGet<{ patient_id: string }>(`/appointments/${appointment.id}`, session.accessToken)
      onNavigate(`/doctor/patients/${current.patient_id}`)
    } catch {
      openAppointment(appointment.id)
    }
  }

  return (
    <MedecinLayout cabinetName={data.tenant.name} onLogout={handleLogout} onNavigate={onNavigate}>
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
        {error && <p className="mb-4 rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Données en cache affichées. Actualisation momentanément indisponible.</p>}
        <section className="rounded-[8px] bg-gradient-to-r from-atlas-petrol to-atlas-teal p-6 text-white shadow-panel md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-white/70">{t('doctorDashboard')}</p>
              <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">{t('welcomeDoctor',{name:data.user.full_name})}</h1>
              <p className="mt-3 text-sm leading-7 text-white/78">
                Cabinet {data.tenant.name} · instance {data.tenant.slug}
              </p>
            </div>
            <div className="rounded-[8px] bg-white p-4 text-atlas-ink">
              <p className="text-xs font-bold uppercase text-slate-500">{t('instanceStatus')}</p>
              <div className="mt-2"><InstanceStatusBadge status={data.tenant.status} /></div>
              {data.tenant.status === 'trial' && <p className="mt-3 text-sm font-semibold text-slate-600">{t('trialEnds',{date:trialEnd})}</p>}
            </div>
          </div>
        </section>

        {data.tenant.status === 'trial' && !data.read_only && (
          <section className="mt-5 rounded-[8px] border border-atlas-teal/20 bg-atlas-mist px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase text-atlas-teal">{t('activeTrial')}</p>
                <p className="mt-1 text-sm font-semibold text-atlas-petrol">
                  {t('trialAccess',{count:trialDaysLeft})}
                </p>
              </div>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-atlas-petrol">
                {t('untilDate',{date:trialEnd})}
              </span>
            </div>
          </section>
        )}

        {data.notice && (
          <p className="mt-5 rounded-[8px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800">
            {data.notice} Les actions de création et modification sont bloquées, la consultation reste limitée.
          </p>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DashboardCard label={t('appointmentsToday')} value={data.stats.appointments_today} icon={CalendarDays} />
          <DashboardCard label={t('registeredPatients')} value={data.stats.patients_registered} icon={UsersRound} tone="blue" />
          <DashboardCard label={t('confirmedAppointments')} value={data.stats.confirmed_appointments} icon={CalendarDays} />
          <DashboardCard label={t('absentPatients')} value={data.stats.absent_appointments} icon={UsersRound} tone="amber" />
          <DashboardCard label={t('monthlyVisits')} value={data.stats.visits_this_month} icon={Stethoscope} />
          <DashboardCard label={t('collectedAmount')} value={`${data.stats.amount_collected.toLocaleString(i18n.language)} MAD`} icon={CreditCard} tone="blue" />
          <DashboardCard label={t('totalOutstanding')} value={`${data.stats.total_unpaid.toLocaleString(i18n.language)} MAD`} icon={CreditCard} tone="amber" />
          <DashboardCard label={t('pendingCnss')} value={data.stats.pending_cnss} icon={ClipboardList} tone="blue" />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-[8px] border border-atlas-line bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[.14em] text-atlas-teal">Votre journée</p>
                <h2 className="mt-1 font-display text-xl font-bold">Rendez-vous et visites du jour</h2>
                <p className="mt-1 text-sm text-slate-500">Ouvrez la fiche patient ou démarrez directement la consultation.</p>
              </div>
              <button type="button" onClick={() => onNavigate('/doctor/appointments')} className="inline-flex items-center gap-1 text-sm font-bold text-atlas-teal">Voir l’agenda <ArrowRight size={16} /></button>
            </div>
            <div className="mt-5 space-y-3">
              {todayAppointments.length === 0 ? (
                <div className="rounded-[8px] bg-atlas-cloud px-5 py-8 text-center"><CalendarDays className="mx-auto text-slate-300" size={30} /><p className="mt-3 text-sm font-semibold text-slate-500">Aucun rendez-vous prévu aujourd’hui.</p></div>
              ) : (
                todayAppointments.map((appointment) => {
                  const status = appointmentStatuses[appointment.status] ?? { label: appointment.status, style: 'bg-slate-100 text-slate-700' }
                  const canStart = startableStatuses.has(appointment.status) && !data.read_only
                  return <div key={appointment.id} role="button" tabIndex={0} onClick={() => openAppointment(appointment.id)} onKeyDown={(event) => { if (event.key === 'Enter') openAppointment(appointment.id) }} className="group grid cursor-pointer gap-3 rounded-[10px] border border-atlas-line p-4 transition hover:border-atlas-teal hover:shadow-sm md:grid-cols-[76px_1fr_auto] md:items-center">
                    <div className="flex items-center gap-2 font-bold text-atlas-petrol md:block md:text-center"><Clock3 size={16} className="text-atlas-teal md:mx-auto md:mb-1" />{appointment.start_time.slice(0, 5)}</div>
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-bold">{appointment.patient_name}</p><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status.style}`}>{status.label}</span></div><p className="mt-1 truncate text-sm text-slate-500">{appointment.reason ?? 'Consultation'} · {appointment.start_time.slice(0, 5)}–{appointment.end_time.slice(0, 5)}</p></div>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <button type="button" onClick={(event) => { event.stopPropagation(); void openPatientRecord(appointment) }} className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-atlas-teal/30 bg-white px-3 py-2.5 text-sm font-bold text-atlas-teal transition hover:border-atlas-teal hover:bg-atlas-mist">
                        <UsersRound size={16} /> Dossier patient
                      </button>
                      {canStart && <button type="button" onClick={(event) => { event.stopPropagation(); openAppointment(appointment.id, true) }} className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-atlas-teal px-4 py-2.5 text-sm font-bold text-white transition hover:bg-atlas-petrol"><Play size={16} fill="currentColor" />{appointment.status === 'in_progress' ? 'Reprendre la visite' : 'Commencer la visite'}</button>}
                    </div>
                  </div>
                })
              )}
            </div>
          </article>

          <article className="rounded-[8px] border border-atlas-line bg-white p-5 shadow-sm">
            <h2 className="font-display text-xl font-bold">{t('latestPatients')}</h2>
            <div className="mt-5 space-y-3">
              {data.latest_patients.length === 0 ? (
                <p className="rounded-[8px] bg-atlas-cloud p-4 text-sm font-semibold text-slate-500">Aucun patient ajouté pour le moment.</p>
              ) : (
                data.latest_patients.map((patient) => (
                  <div key={patient.id} className="rounded-[8px] border border-atlas-line p-4">
                    <p className="font-bold">{patient.full_name}</p>
                    <p className="mt-1 text-sm text-slate-500">{patient.email ? `${patient.email} · ` : ''}{patient.phone ?? t('phoneMissing')}</p>
                    <p className="mt-2 text-xs font-bold uppercase text-atlas-teal">{patient.status}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-[8px] border border-atlas-line bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl font-bold">{t('quickActions')}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {actions.map(([label, path, Icon]) => (
                <button
                  key={label as string}
                  type="button"
                  onClick={() => onNavigate(path as string)}
                  disabled={data.read_only}
                  className="flex items-center gap-3 rounded-[8px] border border-atlas-line bg-white p-4 text-left text-sm font-bold text-atlas-petrol transition hover:border-atlas-teal hover:bg-atlas-mist disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Icon size={18} />
                  {t(label as string)}
                </button>
              ))}
            </div>
        </section>
      </div>
    </MedecinLayout>
  )
}
