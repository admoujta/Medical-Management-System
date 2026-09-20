import { clearSession, getSession, saveLoginSession } from './auth'
import { normalizePhone } from './phone'

const apiUrl = import.meta.env.VITE_API_URL ?? ''

function normalizePayload(payload:Record<string,unknown>):Record<string,unknown>{
  return Object.fromEntries(Object.entries(payload).map(([key,value])=>/phone|telephone/i.test(key)&&typeof value==='string'&&value.trim()?[key,normalizePhone(value)]:[key,value]))
}

const fieldLabels: Record<string, string> = {
  first_name: 'Prénom', last_name: 'Nom', full_name: 'Nom complet', email: 'Adresse e-mail', phone: 'Téléphone',
  birth_date: 'Date de naissance', gender: 'Sexe', address: 'Adresse', city: 'Ville', specialty: 'Spécialité',
  patient_id: 'Patient', doctor_id: 'Médecin', date: 'Date', start_time: 'Heure de début', end_time: 'Heure de fin',
  reason: 'Motif', notes: 'Notes', password: 'Mot de passe', password_confirmation: 'Confirmation du mot de passe',
  cabinet_name: 'Nom du cabinet', cabinet_phone: 'Téléphone du cabinet', instance_slug: 'Identifiant du cabinet',
  amount: 'Montant', payment_method: 'Mode de paiement', title: 'Titre', content: 'Contenu', comment: 'Commentaire'
}

type ValidationIssue = { loc?: Array<string | number>; msg?: string; type?: string; ctx?: Record<string, unknown> }

function readableField(field: string): string {
  return fieldLabels[field] ?? field.split('_').join(' ').replace(/^./, (letter) => letter.toUpperCase())
}

function validationIssueMessage(issue: ValidationIssue): { message: string; field?: string } {
  const field = [...(issue.loc ?? [])].reverse().find((part) => typeof part === 'string' && !['body', 'query', 'path'].includes(part)) as string | undefined
  const label = field ? readableField(field) : 'Champ'
  const raw = String(issue.msg ?? '').replace(/^Value error,\s*/i, '')
  const minimum = Number(issue.ctx?.min_length ?? raw.match(/at least (\d+)/i)?.[1])
  const maximum = Number(issue.ctx?.max_length ?? raw.match(/at most (\d+)/i)?.[1])
  let detail = raw
  if (issue.type === 'missing' || /field required|required field/i.test(raw)) detail = 'ce champ est obligatoire.'
  else if (issue.type === 'string_too_short' || /string should have at least/i.test(raw)) detail = `saisissez au moins ${minimum || 1} caractère${minimum > 1 ? 's' : ''}.`
  else if (issue.type === 'string_too_long' || /string should have at most/i.test(raw)) detail = `saisissez au maximum ${maximum} caractères.`
  else if (/valid email|email address/i.test(raw)) detail = 'saisissez une adresse e-mail valide.'
  else if (/valid phone|numéro.*invalide/i.test(raw)) detail = 'saisissez un numéro de téléphone valide.'
  else if (/valid date/i.test(raw)) detail = 'saisissez une date valide.'
  else if (!detail) detail = 'vérifiez la valeur saisie.'
  return { message: `${label} : ${detail.charAt(0).toLowerCase()}${detail.slice(1)}`, field }
}

function errorDetails(error: any, fallback: string): { message: string; field?: string; issues?: Array<{ message: string; field?: string }> } {
  if (Array.isArray(error?.detail) && error.detail.length) {
    const issues = error.detail.map(validationIssueMessage)
    return { message: issues.map((issue: { message: string }) => issue.message).join(' '), field: issues[0].field, issues }
  }
  const message = typeof error?.detail === 'string' ? error.detail : fallback
  if (/permission insuffisante|accès non autorisé/i.test(message)) {
    return { message: 'Vous n’avez pas la permission d’effectuer cette action. Demandez au médecin administrateur de vérifier les droits de votre compte.' }
  }
  return { message }
}

function apiError(error: any, fallback: string, announce = true): Error {
  const detail = errorDetails(error, fallback)
  if (announce) window.dispatchEvent(new CustomEvent('fadaa:api-error', { detail }))
  return Object.assign(new Error(detail.message), { field: detail.field })
}

let refreshPromise: Promise<string | null> | null = null

async function renewAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const session = getSession()
    if (!session?.refreshToken) return null
    const response = await fetch(`${apiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refreshToken })
    }).catch(() => null)
    if (!response?.ok) {
      clearSession()
      return null
    }
    const refreshed = await response.json() as LoginResponse
    saveLoginSession(refreshed)
    return refreshed.access_token
  })().finally(() => { refreshPromise = null })
  return refreshPromise
}

async function authenticatedFetch(input: Parameters<typeof fetch>[0], init: Parameters<typeof fetch>[1] = {}, token?: string): Promise<Response> {
  const headers = new Headers(init.headers)
  const currentToken = token || getSession()?.accessToken
  if (currentToken) headers.set('Authorization', `Bearer ${currentToken}`)
  const response = await fetch(input, { ...init, headers })
  if (response.status !== 401) return response
  const renewedToken = await renewAccessToken()
  if (!renewedToken) return response
  const retryHeaders = new Headers(init.headers)
  retryHeaders.set('Authorization', `Bearer ${renewedToken}`)
  return fetch(input, { ...init, headers: retryHeaders })
}

async function fetchWithTimeout(input: Parameters<typeof fetch>[0], init: Parameters<typeof fetch>[1] = {}, timeoutMs = 8000) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  try { return await fetch(input, { ...init, signal: controller.signal }) }
  finally { window.clearTimeout(timeout) }
}

export type SignupPayload = {
  first_name: string
  last_name: string
  specialty: string
  address: string
  city: string
  phone: string
  cabinet_phone?: string
  email: string
  cabinet_name: string
  instance_slug?: string
  plan_slug?: string
  primary_color: string
  logo_url: string | null
  admin_username: string
  password: string
  password_confirmation?: string
  initial_role: 'doctor_admin'
  accept_terms: boolean
  accept_privacy?: boolean
  working_days?: number[]
  work_start_time?: string
  work_end_time?: string
  break_start_time?: string
  break_end_time?: string
  consultation_duration_minutes?: number
}

export type SignupResponse = {
  tenant_id: string
  tenant_slug: string
  tenant_status: string
  trial_ends_at: string
  admin_user_id: string
  assigned_role: string
  access_token: string
  refresh_token: string
  token_type: string
}

export type LoginPayload = {
  email: string
  password: string
  role?: 'MEDECIN_ADMIN' | 'SECRETAIRE' | 'PATIENT' | 'SUPER_ADMIN_IRMA'
}

export type LoginResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  tenant_id: string | null
  user_id: string
  full_name: string
  role: string | null
  tenant_status: string | null
  redirect_to: string
}

export type PatientSignupPayload = {
  cabinet_code: string
  first_name: string
  last_name: string
  email: string
  phone: string
  birth_date: string
  gender?: string
  address?: string
  password: string
  password_confirmation: string
  accept_terms: boolean
  accept_privacy: boolean
}

export type PatientSignupResponse = {
  message: string
  tenant_id: string
  patient_user_id: string
  status: string
}

export type StaffActivationInfo = { full_name: string; email: string; cabinet_name: string; expires_at: string }

export async function getStaffActivation(token: string): Promise<StaffActivationInfo> {
  const response = await fetch(`${apiUrl}/api/auth/staff-activation?token=${encodeURIComponent(token)}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Lien invalide ou expiré.' }))
    throw apiError(error, 'Lien invalide ou expiré.')
  }
  return response.json()
}

export async function activateStaff(payload: { token: string; password: string; password_confirmation: string }): Promise<{message:string}> {
  const response = await fetch(`${apiUrl}/api/auth/staff-activation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Activation impossible.' }))
    throw apiError(error, 'Activation impossible.')
  }
  return response.json()
}

export async function getPatientActivation(token: string): Promise<StaffActivationInfo> {
  const response = await fetch(`${apiUrl}/api/auth/patient-activation?token=${encodeURIComponent(token)}`)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Lien invalide ou expiré.' }))
    throw apiError(error, 'Lien invalide ou expiré.')
  }
  return response.json()
}

export async function activatePatient(payload: { token: string; password: string; password_confirmation: string }): Promise<{message:string}> {
  const response = await fetch(`${apiUrl}/api/auth/patient-activation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Activation impossible.' }))
    throw apiError(error, 'Activation impossible.')
  }
  return response.json()
}

export type DoctorDashboardResponse = {
  user: {
    id: string
    full_name: string
    email: string | null
    role: string | null
  }
  tenant: {
    id: string
    name: string
    slug: string
    status: string
    trial_ends_at: string
    primary_color: string
  }
  stats: {
    appointments_today: number
    patients_registered: number
    visits_this_month: number
    confirmed_appointments: number
    absent_appointments: number
    amount_collected: number
    total_unpaid: number
    pending_cnss: number
  }
  today_appointments: Array<{
    id: string
    patient_id?: string
    patient_name: string
    date: string
    start_time: string
    end_time: string
    reason: string | null
    status: string
  }>
  upcoming_appointments: Array<{
    id: string
    patient_id?: string
    patient_name: string
    date: string
    start_time: string
    end_time: string
    reason: string | null
    status: string
  }>
  latest_appointments: Array<{
    id: string
    patient_id?: string
    patient_name: string
    date: string
    start_time: string
    end_time: string
    reason: string | null
    status: string
  }>
  latest_patients: Array<{
    id: string
    full_name: string
    email: string
    phone: string | null
    status: string
    created_at: string
  }>
  read_only: boolean
  notice: string | null
}

export async function signupTenant(payload: SignupPayload): Promise<SignupResponse> {
  let response: Response
  try {
    response = await fetch(`${apiUrl}/api/auth/register-doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch {
    throw new Error('Le serveur FADAA est indisponible. Vérifiez le backend puis réessayez.')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur inconnue' }))
    throw apiError(error, 'Inscription impossible.')
  }

  return response.json()
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  let response: Response
  try {
    response = await fetchWithTimeout(`${apiUrl}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    })
  } catch {
    throw new Error('Le serveur met trop de temps à répondre. Réessayez dans quelques secondes.')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur inconnue' }))
    throw apiError(error, 'Connexion impossible.')
  }

  return response.json()
}

export async function signupPatient(payload: PatientSignupPayload): Promise<PatientSignupResponse> {
  let response: Response
  try {
    response = await fetch(`${apiUrl}/api/auth/register-patient`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
  } catch {
    throw new Error('Le serveur FADAA est indisponible. Réessayez dans quelques instants.')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur inconnue' }))
    throw apiError(error, 'Inscription patient impossible.')
  }

  return response.json()
}

export async function getDoctorDashboard(token: string): Promise<DoctorDashboardResponse> {
  let response: Response
  try {
    response = await authenticatedFetch(`${apiUrl}/api/doctor/dashboard`, {}, token)
  } catch {
    throw new Error('Le serveur FADAA est indisponible. Vérifiez que le backend est démarré, puis réessayez.')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur inconnue' }))
    throw apiError(error, 'Chargement du tableau de bord impossible.')
  }

  return response.json()
}

export async function apiList<T>(path: string, token: string, options: { silent?: boolean } = {}): Promise<T[]> {
  const response = await authenticatedFetch(`${apiUrl}/api${path}`, {}, token)
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: 'Impossible de charger la liste des utilisateurs. Veuillez réessayer.',
    }))
    throw apiError(error, 'Impossible de charger la liste des utilisateurs.', !options.silent)
  }
  const data = await response.json()
  return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [data]
}

export type PaginationMeta = {
  page: number
  page_size: number
  total_items: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

export type PageResponse<T> = {
  items: T[]
  pagination: PaginationMeta
  summary?: Record<string, number>
}

export const initialPagination: PaginationMeta = {
  page: 1,
  page_size: 10,
  total_items: 0,
  total_pages: 1,
  has_next: false,
  has_previous: false,
}

export async function apiPage<T>(path: string, token: string): Promise<PageResponse<T>> {
  const response = await authenticatedFetch(`${apiUrl}/api${path}`, {}, token)
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: 'Impossible de charger les données demandées. Veuillez réessayer.',
    }))
    throw apiError(error, 'Impossible de charger les données demandées.')
  }
  return response.json()
}

export async function apiGet<T>(path: string, token: string, options: { silent?: boolean } = {}): Promise<T> {
  const response = await authenticatedFetch(`${apiUrl}/api${path}`, {}, token)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur inconnue' }))
    throw apiError(error, 'Chargement impossible.', !options.silent)
  }
  return response.json()
}

export async function apiCreate<T>(path: string, token: string, payload: Record<string, unknown>): Promise<T> {
  const response = await authenticatedFetch(`${apiUrl}/api${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(normalizePayload(payload))
  }, token)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: `Le serveur a rencontré une erreur (HTTP ${response.status}). Consultez le journal ou réessayez.` }))
    throw apiError(error, 'Création impossible.')
  }
  return response.json()
}

export async function apiUpload<T>(path: string, token: string, payload: Record<string, string | File | boolean>): Promise<T> {
  const body = new FormData()
  Object.entries(payload).forEach(([key, value]) => { if (value !== '') body.append(key, typeof value === 'boolean' ? String(value) : value) })
  const response = await authenticatedFetch(`${apiUrl}/api${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body
  }, token)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur inconnue' }))
    throw apiError(error, 'Dépôt du fichier impossible.')
  }
  return response.json()
}

export async function apiDownload(path: string, token: string, filename: string): Promise<void> {
  const response = await authenticatedFetch(`${apiUrl}/api${path}`, {}, token)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Téléchargement impossible' }))
    throw apiError(error, 'Téléchargement impossible.')
  }
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function apiPreview(path: string, token: string): Promise<{ url: string; type: string }> {
  const response = await authenticatedFetch(`${apiUrl}/api${path}`, {}, token)
  if (!response.ok) throw new Error('Aperçu indisponible')
  const blob = await response.blob()
  return { url: URL.createObjectURL(blob), type: blob.type }
}

export async function apiUpdate<T>(path: string, token: string, payload: Record<string, unknown>): Promise<T> {
  const response = await authenticatedFetch(`${apiUrl}/api${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(normalizePayload(payload))
  }, token)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur inconnue' }))
    throw apiError(error, 'Modification impossible.')
  }
  return response.json()
}

export async function apiPatch<T>(path: string, token: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await authenticatedFetch(`${apiUrl}/api${path}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(normalizePayload(payload))
  }, token)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur inconnue' }))
    throw apiError(error, 'Modification impossible.')
  }
  return response.json()
}
export async function apiDelete(path: string, token: string): Promise<void> {
  const response = await authenticatedFetch(`${apiUrl}/api${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  }, token)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur inconnue' }))
    throw apiError(error, 'Suppression impossible.')
  }
}
