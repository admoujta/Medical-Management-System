/*
Ajoute la partie HISTORIQUE DES RENDEZ-VOUS dans l’application FADAA Santé.

Contexte :
FADAA Santé est une plateforme SaaS médicale multi-cabinets.
Chaque cabinet possède ses propres données isolées avec tenant_id.
Un patient peut avoir plusieurs rendez-vous.
Un rendez-vous peut être planifié, confirmé, annulé, marqué présent ou absent.
Un rendez-vous honoré peut générer une visite.
La visite peut ensuite être liée à un honoraire, une facture et un paiement.

Objectif :
Créer un historique complet de chaque rendez-vous afin de suivre toutes les actions réalisées depuis sa création jusqu’à sa fin.

==================================================
1. HISTORIQUE D’UN RENDEZ-VOUS
==================================================

Chaque rendez-vous doit avoir une timeline complète.

Exemple d’historique :

- Rendez-vous créé
- Rendez-vous confirmé
- Rendez-vous modifié
- Patient arrivé
- Consultation démarrée
- Consultation terminée
- Visite créée
- Honoraire ajouté
- Facture générée
- Paiement ajouté
- Rendez-vous annulé
- Patient marqué absent

Chaque action doit enregistrer :
- la date et l’heure
- l’utilisateur qui a fait l’action
- son rôle : MEDECIN_ADMIN, SECRETAIRE, PATIENT
- le type d’action
- l’ancien statut
- le nouveau statut
- une note si nécessaire

==================================================
2. MODÈLE À CRÉER : AppointmentHistory
==================================================

Créer un modèle AppointmentHistory.

Champs :

- id
- tenant_id
- appointment_id
- patient_id
- doctor_id
- action
- old_status
- new_status
- description
- performed_by_user_id
- performed_by_role
- created_at

Actions possibles :

APPOINTMENT_CREATED
APPOINTMENT_UPDATED
APPOINTMENT_CONFIRMED
PATIENT_ARRIVED
CONSULTATION_STARTED
CONSULTATION_ENDED
PATIENT_MARKED_PRESENT
PATIENT_MARKED_ABSENT
APPOINTMENT_CANCELLED
VISIT_CREATED
HONORAIRE_CREATED
INVOICE_GENERATED
PAYMENT_ADDED
PAYMENT_UPDATED
PAYMENT_DELETED

Important :
Toutes les actions doivent être filtrées par tenant_id.
Un cabinet ne doit jamais voir l’historique d’un autre cabinet.

==================================================
3. STATUTS DU RENDEZ-VOUS
==================================================

Ajouter ou vérifier les statuts suivants :

REQUESTED
PLANNED
CONFIRMED
WAITING
IN_PROGRESS
COMPLETED
ABSENT
CANCELLED

Règles :

Quand un rendez-vous est créé :
- statut = PLANNED ou REQUESTED
- créer une ligne historique APPOINTMENT_CREATED

Quand il est confirmé :
- statut = CONFIRMED
- créer une ligne historique APPOINTMENT_CONFIRMED

Quand le patient arrive :
- statut = WAITING
- créer une ligne historique PATIENT_ARRIVED

Quand la consultation démarre :
- statut = IN_PROGRESS
- enregistrer actual_start_time
- créer une ligne historique CONSULTATION_STARTED

Quand la consultation se termine :
- statut = COMPLETED
- enregistrer actual_end_time
- calculer duration_seconds
- créer une ligne historique CONSULTATION_ENDED
- créer automatiquement une visite
- créer une ligne historique VISIT_CREATED

Quand patient absent :
- statut = ABSENT
- créer une ligne historique PATIENT_MARKED_ABSENT

Quand rendez-vous annulé :
- statut = CANCELLED
- créer une ligne historique APPOINTMENT_CANCELLED

==================================================
4. CHRONO RENDEZ-VOUS
==================================================

Ajouter dans le rendez-vous :

- actual_start_time
- actual_end_time
- duration_seconds
- started_by_user_id
- ended_by_user_id

Dans l’interface rendez-vous, ajouter les boutons :

- Patient arrivé
- Démarrer consultation
- Terminer consultation
- Marquer absent
- Annuler rendez-vous

Règles :
- Le chrono commence seulement quand on clique sur “Démarrer consultation”.
- Le chrono s’arrête quand on clique sur “Terminer consultation”.
- La durée réelle doit être calculée automatiquement.
- Si patient absent ou rendez-vous annulé, aucun chrono ne démarre.

==================================================
5. PAGE HISTORIQUE RENDEZ-VOUS
==================================================

Créer la page :

/doctor/appointments/:id/history

Cette page doit afficher une timeline claire.

Exemple :

10:00 — Rendez-vous créé par Secrétaire Sara
10:05 — Rendez-vous confirmé par Secrétaire Sara
14:00 — Patient marqué arrivé
14:10 — Consultation démarrée par Dr. Ahmed
14:35 — Consultation terminée
14:36 — Visite créée automatiquement
14:38 — Honoraire ajouté : Consultation générale — 300 MAD
14:40 — Facture générée : FAC-2026-0001
14:42 — Paiement ajouté : 200 MAD
14:42 — Reste à payer recalculé : 100 MAD

Chaque ligne doit afficher :
- heure
- action
- utilisateur
- rôle
- détail de l’action

==================================================
6. HISTORIQUE DANS LA FICHE PATIENT
==================================================

Dans la fiche patient :

/doctor/patients/:id

Ajouter un onglet :

Historique

Cet onglet doit afficher :
- tous les rendez-vous du patient
- les changements de statut
- les visites liées
- les honoraires liés
- les factures générées
- les paiements
- les absences
- les annulations

But :
Le médecin doit voir tout le parcours du patient depuis le début.

==================================================
7. API BACKEND À CRÉER
==================================================

Créer les endpoints suivants :

GET /appointments/{id}/history
Retourne l’historique complet d’un rendez-vous.

POST /appointments/{id}/mark-arrived
Change le statut en WAITING et ajoute une ligne historique.

POST /appointments/{id}/start
Démarre la consultation, change le statut en IN_PROGRESS et ajoute l’historique.

POST /appointments/{id}/end
Termine la consultation, change le statut en COMPLETED, calcule la durée, crée une visite et ajoute l’historique.

POST /appointments/{id}/mark-absent
Change le statut en ABSENT et ajoute l’historique.

POST /appointments/{id}/cancel
Change le statut en CANCELLED et ajoute l’historique.

GET /patients/{id}/appointment-history
Retourne tout l’historique des rendez-vous du patient.

==================================================
8. FRONTEND À CRÉER
==================================================

Créer les composants React :

- AppointmentHistoryPage
- AppointmentTimeline
- AppointmentTimelineItem
- AppointmentTimer
- AppointmentActionButtons
- AppointmentStatusBadge

Dans la page détail rendez-vous :

/doctor/appointments/:id

Afficher :
- informations du patient
- date et heure prévue
- statut actuel
- chrono réel
- durée réelle
- boutons d’action
- lien vers historique
- visite liée
- facture liée si existe
- paiement lié si existe

==================================================
9. PERMISSIONS
==================================================

Médecin :
- peut voir tout l’historique du cabinet
- peut démarrer et terminer une consultation
- peut marquer présent, absent ou annuler

Secrétaire :
- peut voir l’historique si permission appointments = read/write/admin
- peut marquer patient arrivé
- peut confirmer ou annuler selon permission
- peut démarrer/terminer seulement si autorisé

Patient :
- peut voir un historique simplifié de ses propres rendez-vous
- ne voit pas les logs internes
- ne voit pas qui a fait chaque action interne sauf information simple

Super admin IRMA :
- ne peut pas voir l’historique médical détaillé des rendez-vous

==================================================
10. SÉCURITÉ
==================================================

Chaque endpoint doit vérifier :

- utilisateur connecté
- rôle autorisé
- tenant_id correct
- permission suffisante
- appointment_id appartient au même tenant_id
- patient_id correspond au patient connecté si rôle PATIENT

Interdiction :
Un utilisateur d’un cabinet ne doit jamais voir l’historique d’un rendez-vous d’un autre cabinet.

==================================================
11. DESIGN
==================================================

La timeline doit être professionnelle :

- affichage vertical chronologique
- icône pour chaque action
- badge de statut
- date et heure claires
- nom de l’utilisateur
- rôle affiché proprement
- couleurs simples :
  - vert : terminé / payé
  - bleu : confirmé / en cours
  - orange : attente
  - rouge : absent / annulé

==================================================
12. IMPORTANT
==================================================

Ne fais pas seulement une interface statique.
Il faut :
- modèle base de données
- migration
- endpoints backend
- services
- création automatique d’historique
- composants frontend
- protection tenant_id
- permissions par rôle

À la fin, donne un résumé :
- fichiers créés
- fichiers modifiés
- endpoints ajoutés
- comment tester la partie historique rendez-vous
*/
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileText, Mic, MicOff, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'

import { apiCreate, apiDelete, apiDownload, apiList, apiPage, apiPreview, apiUpload, initialPagination } from '../../lib/api'
import { getSession, logout } from '../../lib/auth'
import { PaginationControls } from '../../components/PaginationControls'
import { MedecinLayout } from './MedecinLayout'
import { StaffLayout } from '../staff/StaffLayout'

type FieldType = 'text' | 'email' | 'date' | 'time' | 'number' | 'textarea' | 'select' | 'patient' | 'file' | 'checkbox'

export type CrudField = {
  key: string
  label: string
  type?: FieldType
  options?: string[]
  required?: boolean
  voice?: boolean
}

export type CrudModuleConfig = {
  title: string
  subtitle: string
  endpoint: string
  createEndpoint?: string
  downloadEndpoint?: string
  fields: CrudField[]
  columns: string[]
  readOnly?: boolean
}

type CrudModulePageProps = {
  config: CrudModuleConfig
  onNavigate: (path: string) => void
  mode?: 'doctor' | 'staff'
  permissionLevel?: string
}

type Row = Record<string, unknown> & { id?: string }
type PatientOption = { id: string; first_name: string; last_name: string; phone: string | null; status: string }

type FormValue = string | File | boolean
type SpeechResultEvent = { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }
type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechResultEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

function initialForm(fields: CrudField[]) {
  return fields.reduce<Record<string, FormValue>>((acc, field) => {
    acc[field.key] = field.type === 'checkbox' ? false : ''
    return acc
  }, {})
}

function normalizePayload(form: Record<string, FormValue>, fields: CrudField[]) {
  return fields.reduce<Record<string, unknown>>((payload, field) => {
    const value = form[field.key]
    if (value === '') return payload
    if (value instanceof File) return payload
    payload[field.key] = field.type === 'number' ? Number(value) : value
    return payload
  }, {})
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') return value.toLocaleString('fr-FR')
  return String(value)
}

function FilePreview({ path, fileUrl, token }: { path: string; fileUrl: string; token: string }) {
  const [preview, setPreview] = useState('')
  const isImage = /\.(png|jpe?g|webp)$/i.test(fileUrl)
  useEffect(() => {
    if (!isImage) return
    let active = true
    let objectUrl = ''
    apiPreview(path, token).then((result) => { objectUrl = result.url; if (active) setPreview(result.url) }).catch(() => undefined)
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [isImage, path, token])
  if (isImage && preview) return <img src={preview} alt="Document" className="h-16 w-20 rounded-[8px] border border-atlas-line object-cover" />
  return <span className="inline-flex items-center gap-2 rounded-[8px] bg-atlas-mist px-3 py-2 text-xs font-bold text-atlas-petrol"><FileText size={17}/>{isImage ? 'Image' : 'Document'}</span>
}

export function CrudModulePage({ config, onNavigate, mode = 'doctor', permissionLevel }: CrudModulePageProps) {
  const session = getSession()
  const [rows, setRows] = useState<Row[]>([])
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [form, setForm] = useState(() => initialForm(config.fields))
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'submitting' | 'error'>('loading')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(initialPagination)
  const [listeningField, setListeningField] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const cabinetIsBlocked = session?.tenantStatus === 'expired' || session?.tenantStatus === 'suspended'
  const isReadOnly = config.readOnly || permissionLevel === 'read' || cabinetIsBlocked
  const formFields = useMemo(() => config.fields, [config.fields])
  useEffect(()=>{const patientId=new URLSearchParams(window.location.search).get('patient');if(patientId&&formFields.some(field=>field.key==='patient_id'))setForm(current=>({...current,patient_id:patientId}))},[formFields])

  const load = useCallback(async () => {
    if (!session?.accessToken) return
    setStatus('loading')
    setMessage('')
    try {
      const needsPatients = formFields.some((field) => field.type === 'patient')
      const separator = config.endpoint.includes('?') ? '&' : '?'
      const [loadedRows, loadedPatients] = await Promise.all([
        apiPage<Row>(
          `${config.endpoint}${separator}page=${page}&page_size=10&search=${encodeURIComponent(search)}&sort_by=created_at&sort_order=desc`,
          session.accessToken,
        ),
        needsPatients ? apiList<PatientOption>('/patients', session.accessToken) : Promise.resolve([])
      ])
      setRows(loadedRows.items)
      setPagination(loadedRows.pagination)
      setPatients(loadedPatients.filter((patient) => patient.status !== 'disabled'))
      setStatus('idle')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Chargement impossible.')
    }
  }, [config.endpoint, formFields, page, search, session?.accessToken])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => setPage(1), [config.endpoint, search])

  useEffect(() => () => recognitionRef.current?.stop(), [])

  function toggleDictation(fieldKey: string) {
    if (listeningField === fieldKey) {
      recognitionRef.current?.stop()
      setListeningField(null)
      return
    }
    const speechWindow = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Recognition) {
      setMessage('La dictée vocale n’est pas disponible dans ce navigateur. Utilisez Chrome, Edge ou Safari récent.')
      return
    }
    const recognition = new Recognition()
    recognition.lang = 'fr-FR'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).filter((result) => result.isFinal).map((result) => result[0].transcript.trim()).join(' ')
      if (!transcript) return
      setForm((current) => {
        const previous = String(current[fieldKey] ?? '').trim()
        return { ...current, [fieldKey]: previous ? `${previous} ${transcript}` : transcript }
      })
    }
    recognition.onerror = () => {
      setListeningField(null)
      setMessage('La dictée a été interrompue. Vérifiez l’autorisation du microphone.')
    }
    recognition.onend = () => setListeningField(null)
    recognitionRef.current = recognition
    setMessage('')
    setListeningField(fieldKey)
    recognition.start()
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!session?.accessToken || isReadOnly) return
    setStatus('submitting')
    setMessage('')
    try {
      const hasFile = formFields.some((field) => field.type === 'file')
      if (hasFile) await apiUpload<Row>(config.createEndpoint ?? config.endpoint, session.accessToken, form)
      else await apiCreate<Row>(config.createEndpoint ?? config.endpoint, session.accessToken, normalizePayload(form, formFields))
      setForm(initialForm(formFields))
      await load()
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Création impossible.')
    }
  }

  async function remove(row: Row) {
    if (!session?.accessToken || !row.id || isReadOnly) return
    try {
      await apiDelete(`${config.endpoint}/${row.id}`, session.accessToken)
      await load()
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Suppression impossible.')
    }
  }

  async function download(row: Row) {
    if (!session?.accessToken || !row.id || !config.downloadEndpoint) return
    try { await apiDownload(`${config.downloadEndpoint.replace(':id', row.id)}`, session.accessToken, String(row.title ?? row.reference ?? 'document')) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Téléchargement impossible.') }
  }

  function handleLogout() {
    logout()
    onNavigate('/login')
  }

  function displayCell(row: Row, column: string) {
    if (column === 'patient_id') {
      const patient = patients.find((item) => item.id === row.patient_id)
      if (patient) return `${patient.first_name} ${patient.last_name}`
    }
    if (column === 'file_url' && row.file_url && row.id && config.downloadEndpoint && session?.accessToken) {
      return <FilePreview path={config.downloadEndpoint.replace(':id', row.id)} fileUrl={String(row.file_url)} token={session.accessToken} />
    }
    if (column === 'file_url') return 'Aucun fichier'
    return formatValue(row[column])
  }

  const content = (
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
        <section className="rounded-[8px] bg-white p-6 shadow-sm ring-1 ring-atlas-line">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-atlas-teal">Module cabinet</p>
              <h1 className="mt-2 font-display text-3xl font-bold text-atlas-ink">{config.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{config.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 rounded-[8px] border border-atlas-line px-4 py-2 text-sm font-bold text-atlas-petrol hover:border-atlas-teal"
            >
              <RefreshCw size={17} />
              Actualiser
            </button>
          </div>

          {cabinetIsBlocked && (
            <p className="mt-5 rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              Votre période d’essai est expirée. Veuillez activer votre abonnement pour continuer. La consultation reste limitée.
            </p>
          )}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={submit} className="rounded-[8px] border border-atlas-line bg-white p-5 shadow-sm">
            <h2 className="font-display text-xl font-bold">Ajouter</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              {formFields.map((field) => (
                <label key={field.key} className={field.type === 'textarea' ? 'md:col-span-2 xl:col-span-1' : ''}>
                  <span className="text-sm font-bold text-atlas-ink">{field.label}</span>
                  {field.type === 'checkbox' ? (
                    <span className="mt-2 flex items-center justify-between gap-4 rounded-[8px] border border-atlas-line bg-atlas-cloud/60 px-4 py-3 text-sm font-semibold text-slate-600">
                      Visible dans l’espace personnel du patient
                      <input
                        type="checkbox"
                        checked={Boolean(form[field.key])}
                        disabled={isReadOnly}
                        onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.checked }))}
                        className="h-5 w-5 accent-atlas-teal"
                      />
                    </span>
                  ) : field.type === 'file' ? (
                    <input
                      type="file"
                      required={field.required}
                      disabled={isReadOnly}
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                      onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.files?.[0] ?? '' }))}
                      className="mt-2 w-full rounded-[8px] border border-dashed border-atlas-line bg-atlas-mist/40 px-4 py-3 text-sm file:mr-4 file:rounded-[8px] file:border-0 file:bg-atlas-teal file:px-4 file:py-2 file:font-bold file:text-white"
                    />
                  ) : field.type === 'textarea' ? (
                    <div>
                      <textarea
                        value={String(form[field.key])}
                        required={field.required}
                        disabled={isReadOnly}
                        onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                        className="mt-2 min-h-32 w-full rounded-[8px] border border-atlas-line px-4 py-3 text-sm outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10 disabled:bg-slate-50"
                      />
                      {field.voice && <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => toggleDictation(field.key)}
                        className={`mt-2 inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-bold ${listeningField === field.key ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'bg-atlas-mist text-atlas-teal'}`}
                      >
                        {listeningField === field.key ? <MicOff size={17}/> : <Mic size={17}/>}
                        {listeningField === field.key ? 'Arrêter la dictée' : 'Dicter l’ordonnance'}
                      </button>}
                    </div>
                  ) : field.type === 'patient' ? (
                    <select
                      value={String(form[field.key])}
                      required={field.required}
                      disabled={isReadOnly}
                      onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                      className="mt-2 w-full rounded-[8px] border border-atlas-line px-4 py-3 text-sm outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10 disabled:bg-slate-50"
                    >
                      <option value="">Sélectionner un patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.first_name} {patient.last_name}{patient.phone ? ` · ${patient.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'select' ? (
                    <select
                      value={String(form[field.key])}
                      required={field.required}
                      disabled={isReadOnly}
                      onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                      className="mt-2 w-full rounded-[8px] border border-atlas-line px-4 py-3 text-sm outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10 disabled:bg-slate-50"
                    >
                      <option value="">Choisir</option>
                      {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type ?? 'text'}
                      value={String(form[field.key])}
                      required={field.required}
                      disabled={isReadOnly}
                      onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                      className="mt-2 w-full rounded-[8px] border border-atlas-line px-4 py-3 text-sm outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10 disabled:bg-slate-50"
                    />
                  )}
                </label>
              ))}
            </div>
            <button
              type="submit"
              disabled={isReadOnly || status === 'submitting'}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-atlas-teal px-5 py-3 text-sm font-bold text-white hover:bg-atlas-petrol disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={17} />
              Ajouter
            </button>
          </form>

          <section className="overflow-hidden rounded-[8px] border border-atlas-line bg-white shadow-sm">
            <div className="border-b border-atlas-line px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-bold">Liste</h2>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rechercher…"
                    className="w-full rounded-lg border border-atlas-line py-2.5 pl-9 pr-3 text-sm outline-none focus:border-atlas-teal"
                  />
                </div>
              </div>
              {message && <p className="mt-2 text-sm font-bold text-red-600">{message}</p>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-atlas-cloud text-xs uppercase text-slate-500">
                  <tr>
                    {config.columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={config.columns.length + 1} className="px-4 py-8 text-center font-semibold text-slate-500">Aucune donnée.</td></tr>
                  ) : rows.map((row) => (
                    <tr key={String(row.id ?? JSON.stringify(row))} className="border-t border-atlas-line">
                      {config.columns.map((column) => <td key={column} className="px-4 py-3">{displayCell(row, column)}</td>)}
                      <td className="px-4 py-3">
                        {config.downloadEndpoint && Boolean(row.file_url) && <button
                          type="button"
                          onClick={() => download(row)}
                          className="mr-2 inline-flex items-center gap-2 rounded-[8px] border border-atlas-line px-3 py-2 text-xs font-bold text-atlas-teal hover:bg-atlas-mist"
                        >
                          <Download size={14} />
                          Télécharger
                        </button>}
                        <button
                          type="button"
                          onClick={() => remove(row)}
                          disabled={isReadOnly || (mode === 'staff' && permissionLevel !== 'admin')}
                          className="inline-flex items-center gap-2 rounded-[8px] border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              pagination={pagination}
              loading={status === 'loading'}
              onPageChange={setPage}
            />
          </section>
        </section>
      </div>
  )

  return mode === 'staff' ? (
    <StaffLayout cabinetName="Espace cabinet" onLogout={handleLogout} onNavigate={onNavigate}>{content}</StaffLayout>
  ) : (
    <MedecinLayout cabinetName={session?.tenantId ? 'Espace médecin' : 'FADAA Santé'} onLogout={handleLogout} onNavigate={onNavigate}>{content}</MedecinLayout>
  )
}
