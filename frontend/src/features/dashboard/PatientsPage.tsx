import { FormEvent, useCallback, useEffect, useState } from 'react'
import { CalendarDays, History, Mail, MessageCircle, Pencil, Phone, Search, UserCheck, UserMinus, UserPlus, UserRound, UsersRound } from 'lucide-react'

import { apiCreate, apiDelete, apiPage, apiUpdate, initialPagination } from '../../lib/api'
import { getSession, logout } from '../../lib/auth'
import { confirmAction } from '../../lib/uiFeedback'
import { PaginationControls } from '../../components/PaginationControls'
import { MedecinLayout } from './MedecinLayout'
import { StaffLayout } from '../staff/StaffLayout'

type Patient = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  birth_date: string
  gender: string | null
  address: string | null
  status: string
  account_status: string
  whatsapp_opt_in: boolean
  whatsapp_consent_status: string
  preferred_whatsapp_language?: string
  appointment_count?: number
}

const emptyForm = { first_name: '', last_name: '', email: '', phone: '', birth_date: '', gender: '', address: '' }

const statusLabels: Record<string, string> = {
  active: 'Actif',
  pending: 'Activation e-mail en attente',
  disabled: 'Désactivé'
}

function patientAge(birthDate: string) {
  const birth = new Date(`${birthDate}T12:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--
  return age
}

function initials(patient: Patient) {
  return `${patient.first_name.charAt(0)}${patient.last_name.charAt(0)}`.toUpperCase()
}

export function PatientsPage({ onNavigate, mode = 'doctor', permissionLevel }: { onNavigate: (path: string) => void; mode?:'doctor'|'staff'; permissionLevel?:string }) {
  const session = getSession()
  const [patients, setPatients] = useState<Patient[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(initialPagination)
  const [summary, setSummary] = useState({total:0,active:0,pending:0,disabled:0})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const messageIsSuccess = /ajouté|modifié|désactivé|réactivé|activé/i.test(message)

  const load = useCallback(async () => {
    if (!session?.accessToken) return
    try {
      const loaded = await apiPage<Patient>(
        `/patients?page=${page}&page_size=10&search=${encodeURIComponent(search)}${statusFilter?`&status=${encodeURIComponent(statusFilter)}`:''}&sort_by=name&sort_order=asc`,
        session.accessToken,
      )
      setPatients(loaded.items)
      setPagination(loaded.pagination)
      setSummary({
        total:Number(loaded.summary?.total??0),
        active:Number(loaded.summary?.active??0),
        pending:Number(loaded.summary?.pending??0),
        disabled:Number(loaded.summary?.disabled??0),
      })
    }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Chargement impossible.') }
  }, [page, search, session?.accessToken, statusFilter])

  useEffect(() => { load() }, [load])
  useEffect(() => setPage(1), [search, statusFilter])

  function reset() { setForm(emptyForm); setEditing(null); setMessage('') }

  function edit(patient: Patient) {
    setEditing(patient.id)
    setForm({
      first_name: patient.first_name,
      last_name: patient.last_name,
      email: patient.email ?? '',
      phone: patient.phone ?? '',
      birth_date: patient.birth_date,
      gender: patient.gender==='M'||patient.gender==='male'?'M':patient.gender==='F'||patient.gender==='female'?'F':'',
      address: patient.address ?? ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!session?.accessToken) return
    setBusy(true); setMessage('')
    const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''))
    try {
      if (editing) await apiUpdate(`/patients/${editing}`, session.accessToken, payload)
      else await apiCreate('/patients', session.accessToken, payload)
      reset(); await load(); setMessage(editing ? 'Patient modifié.' : 'Patient ajouté au cabinet.')
    } catch (error) { setMessage(error instanceof Error && 'field' in error && error.field ? '' : error instanceof Error ? error.message : 'Enregistrement impossible.') }
    finally { setBusy(false) }
  }

  async function disable(patient: Patient) {
    if (!session?.accessToken || patient.status === 'disabled') return
    if (!await confirmAction({title:'Désactiver ce compte patient ?',message:`Le compte de ${patient.first_name} ${patient.last_name} ne pourra plus se connecter jusqu’à sa réactivation.`,confirmLabel:'Désactiver',tone:'danger'})) return
    try { await apiDelete(`/patients/${patient.id}`, session.accessToken); await load(); setMessage('Patient désactivé.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Désactivation impossible.') }
  }

  async function activate(patient: Patient) {
    if (!session?.accessToken) return
    const wasDisabled = patient.status === 'disabled'
    try { await apiUpdate(`/patients/${patient.id}`, session.accessToken, { status: 'active' }); await load(); setMessage(wasDisabled ? 'Patient réactivé.' : 'Compte patient activé.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Activation impossible.') }
  }

  const readOnly=permissionLevel==='read'||session?.tenantStatus==='expired'||session?.tenantStatus==='suspended'
  const activeCount = summary.active
  const pendingCount = summary.pending
  const content=<div className="mx-auto max-w-7xl px-5 py-7 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-bold uppercase text-atlas-teal">Cabinet</p><h1 className="mt-2 font-display text-3xl font-bold">Patients</h1><p className="mt-2 text-sm text-slate-600">Tous les patients affichés appartiennent uniquement à votre instance.</p></div>
        <div className="flex w-full rounded-[11px] border border-atlas-line bg-white p-1 shadow-sm sm:w-auto"><button type="button" onClick={()=>onNavigate(mode==='staff'?'/staff/appointments':'/doctor/appointments')} className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-atlas-mist hover:text-atlas-teal sm:flex-none"><CalendarDays size={18}/>Rendez-vous</button><button type="button" aria-current="page" className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] bg-atlas-teal px-5 py-2.5 text-sm font-bold text-white shadow-sm sm:flex-none"><UsersRound size={18}/>Patients</button></div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-[12px] border border-atlas-line bg-white p-4 shadow-sm"><span className="grid h-11 w-11 place-items-center rounded-[10px] bg-atlas-cloud text-atlas-petrol"><UsersRound size={21}/></span><div><p className="text-2xl font-bold">{summary.total}</p><p className="text-xs font-semibold text-slate-500">Patients au total</p></div></div>
        <div className="flex items-center gap-4 rounded-[12px] border border-atlas-line bg-white p-4 shadow-sm"><span className="grid h-11 w-11 place-items-center rounded-[10px] bg-emerald-50 text-emerald-700"><UserCheck size={21}/></span><div><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs font-semibold text-slate-500">Comptes actifs</p></div></div>
        <div className="flex items-center gap-4 rounded-[12px] border border-atlas-line bg-white p-4 shadow-sm"><span className="grid h-11 w-11 place-items-center rounded-[10px] bg-amber-50 text-amber-700"><UserPlus size={21}/></span><div><p className="text-2xl font-bold">{pendingCount}</p><p className="text-xs font-semibold text-slate-500">À valider</p></div></div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[.78fr_1.22fr]">
        {!readOnly&&<form onSubmit={submit} className="h-fit rounded-[8px] border border-atlas-line bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl font-bold">{editing ? 'Modifier le patient' : 'Nouveau patient'}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {[['first_name','Prénom *','text'],['last_name','Nom *','text'],['phone','Téléphone','tel'],['email','Email *','email'],['birth_date','Date de naissance *','date'],['address','Adresse','text']].map(([key,label,type]) => <label key={key}><span className="text-sm font-bold">{label}</span><input name={key} minLength={['first_name','last_name'].includes(key) ? 2 : undefined} required={['first_name','last_name','birth_date'].includes(key)||(key==='email'&&!editing)} type={type} value={String(form[key as keyof typeof form])} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-2 w-full rounded-[8px] border border-atlas-line px-4 py-3 transition duration-200 outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10" /></label>)}
            <label><span className="text-sm font-bold">Sexe *</span><select name="gender" required={!editing} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="mt-2 w-full rounded-[8px] border border-atlas-line px-4 py-3 transition duration-200 outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10"><option value="" disabled>Sélectionner</option><option value="M">Homme</option><option value="F">Femme</option></select></label>
          </div>
          <div className="mt-5 flex gap-3"><button disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-[8px] bg-atlas-teal px-4 py-3 font-bold text-white disabled:opacity-50"><UserPlus size={18}/>{editing ? 'Enregistrer' : 'Ajouter'}</button>{editing && <button type="button" onClick={reset} className="rounded-[8px] border border-atlas-line px-4 font-bold">Annuler</button>}</div>
        </form>}

        <section className="rounded-[12px] border border-atlas-line bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-3.5 text-slate-400" size={18}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, téléphone ou email…" className="w-full rounded-[8px] border border-atlas-line py-3 pl-10 pr-4 outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10" /></div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-[8px] border border-atlas-line bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-atlas-teal">
              <option value="">Tous les statuts</option><option value="active">Actifs</option><option value="pending">À valider</option><option value="disabled">Désactivés</option>
            </select>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3"><h2 className="font-display text-lg font-bold">Répertoire patients</h2><span className="rounded-full bg-atlas-cloud px-3 py-1 text-xs font-bold text-slate-600">{pagination.total_items} résultat{pagination.total_items > 1 ? 's' : ''}</span></div>
          {message && <p role={messageIsSuccess ? 'status' : 'alert'} className={`mt-4 rounded-[8px] border px-4 py-3 text-sm font-semibold ${messageIsSuccess ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-300 bg-red-50 text-red-700'}`}>{message}</p>}
          <div className="mt-4 space-y-3">{patients.length === 0 ? <p className="rounded-[8px] bg-atlas-cloud p-8 text-center text-sm text-slate-500">Aucun patient ne correspond à votre recherche.</p> : patients.map((patient) => {
            const age = patientAge(patient.birth_date)
            return <article key={patient.id} className={`rounded-[10px] border p-4 transition hover:border-atlas-sage hover:shadow-sm ${editing === patient.id ? 'border-atlas-teal bg-atlas-mist/30' : 'border-atlas-line'}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[10px] bg-atlas-petrol font-display text-sm font-bold text-white">{initials(patient)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-bold text-atlas-ink">{patient.first_name} {patient.last_name}</p><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${patient.status === 'disabled' ? 'bg-slate-100 text-slate-500' : patient.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{statusLabels[patient.status] ?? patient.status}</span><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${patient.whatsapp_opt_in?'bg-emerald-50 text-emerald-700':patient.whatsapp_consent_status==='pending'?'bg-amber-50 text-amber-700':'bg-slate-100 text-slate-500'}`}><MessageCircle size={12}/>{patient.whatsapp_opt_in?'WhatsApp autorisé':patient.whatsapp_consent_status==='pending'?'Choix WhatsApp en attente':'WhatsApp refusé'}</span></div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Né(e) le {new Date(`${patient.birth_date}T12:00:00`).toLocaleDateString('fr-FR')}{age !== null ? ` · ${age} ans` : ''}{patient.gender ? ` · ${patient.gender === 'F' ? 'Femme' : patient.gender === 'M' ? 'Homme' : patient.gender}` : ''} · WhatsApp en {patient.preferred_whatsapp_language==='ar'?'arabe':'français'}</p>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <span className="flex min-w-0 items-center gap-2 text-slate-600"><Phone size={15} className="shrink-0 text-atlas-teal"/><span className="truncate">{patient.phone ?? 'Non renseigné'}</span></span>
                    <span className="flex min-w-0 items-center gap-2 text-slate-600"><Mail size={15} className="shrink-0 text-atlas-teal"/><span className="truncate">{patient.email ?? 'Non renseigné'}</span></span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-atlas-line pt-3">
                <button type="button" onClick={() => onNavigate(mode === 'staff' ? '/staff/appointments' : '/doctor/appointments')} className="inline-flex items-center gap-2 rounded-[8px] bg-atlas-mist px-3 py-2 text-xs font-bold text-atlas-teal"><CalendarDays size={15}/>{patient.appointment_count??0} rendez-vous</button>
                {mode==='doctor'&&<button type="button" onClick={()=>onNavigate(`/doctor/patients/${patient.id}`)} className="inline-flex items-center gap-2 rounded-[8px] bg-atlas-petrol px-3 py-2 text-xs font-bold text-white"><UserRound size={15}/>Ouvrir la fiche</button>}
                <button type="button" onClick={() => onNavigate(`/${mode==='staff'?'staff':'doctor'}/patients/${patient.id}/history`)} className="inline-flex items-center gap-2 rounded-[8px] border border-atlas-line px-3 py-2 text-xs font-bold text-atlas-petrol"><History size={15}/>Historique</button>
                {!readOnly&&<button type="button" onClick={() => edit(patient)} className="inline-flex items-center gap-2 rounded-[8px] border border-atlas-line px-3 py-2 text-xs font-bold text-atlas-petrol"><Pencil size={14}/>Modifier</button>}
                {patient.account_status==='pending_activation'&&<span className="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">Lien d’activation envoyé</span>}
                {!readOnly&&patient.status==='disabled'&&(mode==='doctor'||permissionLevel==='admin')&&<button type="button" onClick={()=>activate(patient)} className="inline-flex items-center gap-2 rounded-[8px] border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700"><UserCheck size={15}/>Réactiver</button>}
                {!readOnly&&patient.status!=='disabled'&&(mode==='doctor'||permissionLevel==='admin')&&<button type="button" onClick={() => disable(patient)} className="ml-auto inline-flex items-center gap-2 rounded-[8px] px-3 py-2 text-xs font-bold text-red-600"><UserMinus size={15}/>Désactiver</button>}
              </div>
            </article>
          })}</div>
          <PaginationControls pagination={pagination} itemLabel="patient" onPageChange={setPage}/>
        </section>
      </div>
    </div>
  const out=()=>{logout();onNavigate('/login')};return mode==='staff'?<StaffLayout cabinetName="Patients du cabinet" onNavigate={onNavigate} onLogout={out}>{content}</StaffLayout>:<MedecinLayout cabinetName="Patients du cabinet" onNavigate={onNavigate} onLogout={out}>{content}</MedecinLayout>
}
