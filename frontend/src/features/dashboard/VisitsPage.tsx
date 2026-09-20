import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Pencil, Plus, Search, Stethoscope, Trash2, UserCheck, UserRound, UserX, X } from 'lucide-react'

import { apiCreate, apiDelete, apiList, apiPage, apiUpdate, initialPagination } from '../../lib/api'
import { getSession, logout } from '../../lib/auth'
import { confirmAction } from '../../lib/uiFeedback'
import { PaginationControls } from '../../components/PaginationControls'
import { MedecinLayout } from './MedecinLayout'

type VisitsPageProps = { onNavigate: (path: string) => void }
type Patient = { id: string; first_name: string; last_name: string; phone: string | null; status: string }
type Visit = { id: string; patient_id: string; patient_name?:string|null; visit_date: string; status: string; attendance_status: 'present'|'absent'; reason: string | null; notes: string | null }

const today = () => new Date().toLocaleDateString('en-CA')

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

export function VisitsPage({ onNavigate }: VisitsPageProps) {
  const session = getSession()
  const [visits, setVisits] = useState<Visit[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientId, setPatientId] = useState('')
  const [visitDate, setVisitDate] = useState(today)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [attendanceStatus, setAttendanceStatus] = useState<'present'|'absent'>('present')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(initialPagination)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const readOnly = session?.tenantStatus === 'expired' || session?.tenantStatus === 'suspended'
  const patientById = useMemo(() => new Map(patients.map((patient) => [patient.id, patient])), [patients])

  const load = useCallback(async () => {
    if (!session?.accessToken) return
    setLoading(true)
    try {
      const [loadedVisits, loadedPatients] = await Promise.all([
        apiPage<Visit>(`/visits?page=${page}&page_size=10&search=${encodeURIComponent(search)}&sort_by=visit_date&sort_order=desc`, session.accessToken),
        apiList<Patient>('/patients', session.accessToken)
      ])
      setVisits(loadedVisits.items)
      setPagination(loadedVisits.pagination)
      setPatients(loadedPatients.filter((patient) => patient.status !== 'disabled'))
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [page, search, session?.accessToken])

  useEffect(() => { void load() }, [load])
  useEffect(() => setPage(1), [search])

  function resetForm() {
    setEditingId(null)
    setPatientId('')
    setVisitDate(today())
    setReason('')
    setNotes('')
    setAttendanceStatus('present')
  }

  function startEditing(visit: Visit) {
    setEditingId(visit.id)
    setPatientId(visit.patient_id)
    setVisitDate(visit.visit_date)
    setReason(visit.reason ?? '')
    setNotes(visit.notes ?? '')
    setAttendanceStatus(visit.attendance_status ?? 'present')
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!session?.accessToken || readOnly) return
    setSaving(true)
    setMessage('')
    try {
      const payload = { visit_date: visitDate, attendance_status: attendanceStatus, reason: reason.trim() || null, notes: notes.trim() || null }
      if (editingId) await apiUpdate<Visit>(`/visits/${editingId}`, session.accessToken, payload)
      else await apiCreate<Visit>('/visits', session.accessToken, { patient_id: patientId, ...payload })
      const wasEditing = Boolean(editingId)
      resetForm()
      await load()
      setMessage(wasEditing ? 'Visite modifiée avec succès.' : 'Visite enregistrée avec succès.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(visit: Visit) {
    if (!session?.accessToken || readOnly || !await confirmAction({title:'Supprimer cette visite ?',message:'La visite sera retirée définitivement de l’historique du patient.',confirmLabel:'Supprimer',tone:'danger'})) return
    try {
      await apiDelete(`/visits/${visit.id}`, session.accessToken)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Suppression impossible.')
    }
  }

  function handleLogout() { logout(); onNavigate('/login') }

  return (
    <MedecinLayout cabinetName={session?.tenantId ? 'Espace médecin' : 'FADAA Santé'} onLogout={handleLogout} onNavigate={onNavigate}>
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-atlas-teal">Suivi médical</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-atlas-ink">Visites</h1>
            <p className="mt-2 text-sm text-slate-600">Enregistrez une consultation en quelques secondes.</p>
          </div>
          <div className="rounded-[10px] bg-atlas-mist px-4 py-3 text-sm font-bold text-atlas-petrol">
            {pagination.total_items} visite{pagination.total_items !== 1 ? 's' : ''} au total
          </div>
        </header>

        {message && <p className={`mt-5 rounded-[8px] border px-4 py-3 text-sm font-bold ${message.includes('succès') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{message}</p>}

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[390px_1fr]">
          <form onSubmit={submit} className="rounded-[12px] border border-atlas-line bg-white p-5 shadow-sm xl:sticky xl:top-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-atlas-mist text-atlas-teal">{editingId ? <Pencil size={19}/> : <Plus size={20}/>}</span>
              <div><h2 className="font-display text-xl font-bold">{editingId ? 'Modifier la visite' : 'Nouvelle visite'}</h2><p className="text-xs text-slate-500">{editingId ? 'Corrigez les informations puis enregistrez' : 'Les champs avec * sont obligatoires'}</p></div>
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-bold">Patient *</span>
              <select value={patientId} onChange={(event) => setPatientId(event.target.value)} required disabled={readOnly || Boolean(editingId)} className="mt-2 w-full rounded-[8px] border border-atlas-line bg-white px-4 py-3 outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10 disabled:bg-slate-50">
                <option value="">Choisir un patient</option>
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name}{patient.phone ? ` · ${patient.phone}` : ''}</option>)}
              </select>
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-bold">Date *</span>
              <input type="date" value={visitDate} onChange={(event) => setVisitDate(event.target.value)} required disabled={readOnly} className="mt-2 w-full rounded-[8px] border border-atlas-line px-4 py-3 outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10 disabled:bg-slate-50"/>
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-bold">Motif de la visite</span>
              <input value={reason} onChange={(event) => setReason(event.target.value)} disabled={readOnly} placeholder="Ex. Contrôle, douleur, suivi…" className="mt-2 w-full rounded-[8px] border border-atlas-line px-4 py-3 outline-none placeholder:text-slate-400 focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10 disabled:bg-slate-50"/>
            </label>

            <fieldset className="mt-4">
              <legend className="text-sm font-bold">Présence durant la visite *</legend>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <button type="button" onClick={()=>setAttendanceStatus('present')} disabled={readOnly} className={`inline-flex items-center justify-center gap-2 rounded-[8px] border px-3 py-3 text-sm font-bold ${attendanceStatus==='present'?'border-emerald-500 bg-emerald-50 text-emerald-700':'border-atlas-line text-slate-500'}`}><UserCheck size={17}/>Présent</button>
                <button type="button" onClick={()=>setAttendanceStatus('absent')} disabled={readOnly} className={`inline-flex items-center justify-center gap-2 rounded-[8px] border px-3 py-3 text-sm font-bold ${attendanceStatus==='absent'?'border-red-400 bg-red-50 text-red-700':'border-atlas-line text-slate-500'}`}><UserX size={17}/>Absent</button>
              </div>
            </fieldset>

            <label className="mt-4 block">
              <span className="text-sm font-bold">Notes médicales</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={readOnly} placeholder="Observations, diagnostic, recommandations…" className="mt-2 min-h-28 w-full resize-y rounded-[8px] border border-atlas-line px-4 py-3 outline-none placeholder:text-slate-400 focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10 disabled:bg-slate-50"/>
            </label>

            <button type="submit" disabled={readOnly || saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-atlas-teal px-5 py-3.5 font-bold text-white transition hover:bg-atlas-petrol disabled:cursor-not-allowed disabled:opacity-50">
              <CheckCircle2 size={18}/>{saving ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Enregistrer la visite'}
            </button>
            {editingId && <button type="button" onClick={resetForm} disabled={saving} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-atlas-line px-5 py-3 font-bold text-slate-600 hover:bg-slate-50"><X size={18}/>Annuler la modification</button>}
          </form>

          <section className="overflow-hidden rounded-[12px] border border-atlas-line bg-white shadow-sm">
            <div className="border-b border-atlas-line p-5">
              <h2 className="font-display text-xl font-bold">Historique des visites</h2>
              <div className="relative mt-4">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un patient ou un motif" className="w-full rounded-[8px] border border-atlas-line py-3 pl-10 pr-4 outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10"/>
              </div>
            </div>

            <div className="space-y-3 p-4 md:p-5">
              {loading ? <p className="py-10 text-center text-sm font-semibold text-slate-500">Chargement des visites…</p> : visits.length === 0 ? (
                <div className="py-12 text-center"><Stethoscope size={36} className="mx-auto text-slate-300"/><p className="mt-3 font-bold text-slate-600">Aucune visite trouvée</p><p className="mt-1 text-sm text-slate-400">La prochaine visite apparaîtra ici.</p></div>
              ) : visits.map((visit) => {
                const patient = patientById.get(visit.patient_id)
                return <article key={visit.id} className="rounded-[10px] border border-atlas-line p-4 transition hover:border-atlas-teal/40 hover:shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-atlas-mist text-atlas-teal"><UserRound size={19}/></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div><h3 className="font-bold text-atlas-ink">{patient ? `${patient.first_name} ${patient.last_name}` : visit.patient_name??'Patient'}</h3><p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500"><CalendarDays size={13}/>{formatDate(visit.visit_date)}</p></div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${visit.attendance_status==='absent'?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'}`}>{visit.attendance_status==='absent'?<UserX size={13}/>:<UserCheck size={13}/>} {visit.attendance_status==='absent'?'Absent':'Présent'}</span>
                      </div>
                      <p className="mt-3 font-semibold text-slate-700">{visit.reason || 'Consultation générale'}</p>
                      {visit.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">{visit.notes}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => startEditing(visit)} disabled={readOnly} title="Modifier la visite" className="rounded-[8px] p-2 text-slate-400 hover:bg-atlas-mist hover:text-atlas-teal disabled:opacity-30"><Pencil size={17}/></button>
                      <button type="button" onClick={() => void remove(visit)} disabled={readOnly} title="Supprimer la visite" className="rounded-[8px] p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 size={17}/></button>
                    </div>
                  </div>
                </article>
              })}
            </div>
            <PaginationControls pagination={pagination} loading={loading} itemLabel="visite" onPageChange={setPage}/>
          </section>
        </div>
      </div>
    </MedecinLayout>
  )
}
