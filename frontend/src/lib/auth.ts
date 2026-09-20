import type { LoginResponse, SignupResponse } from './api'

export type Session = {
  accessToken: string
  refreshToken: string
  fullName: string
  userId: string
  tenantId: string | null
  role: string | null
  tenantStatus: string | null
}

const keys = {
  accessToken: 'fadaa_access_token',
  refreshToken: 'fadaa_refresh_token',
  fullName: 'fadaa_user_name',
  userId: 'fadaa_user_id',
  tenantId: 'fadaa_tenant_id',
  role: 'fadaa_role',
  tenantStatus: 'fadaa_tenant_status'
}

export const roleRedirects: Record<string, string> = {
  MEDECIN_ADMIN: '/doctor/dashboard',
  SECRETAIRE: '/staff/dashboard',
  PATIENT: '/patient/dashboard',
  SUPER_ADMIN: '/super-admin/dashboard',
  SUPER_ADMIN_IRMA: '/super-admin/dashboard',
  doctor_admin: '/doctor/dashboard',
  secretary: '/staff/dashboard',
  patient: '/patient/dashboard',
  platform_super_admin: '/super-admin/dashboard'
}

export function saveLoginSession(response: LoginResponse) {
  localStorage.setItem(keys.accessToken, response.access_token)
  localStorage.setItem(keys.refreshToken, response.refresh_token)
  localStorage.setItem(keys.fullName, response.full_name)
  localStorage.setItem(keys.userId, response.user_id)
  localStorage.setItem(keys.role, response.role ?? '')
  localStorage.setItem(keys.tenantStatus, response.tenant_status ?? '')
  if (response.tenant_id) localStorage.setItem(keys.tenantId, response.tenant_id)
  else localStorage.removeItem(keys.tenantId)
}

export function saveSignupSession(response: SignupResponse, fullName: string) {
  localStorage.setItem(keys.accessToken, response.access_token)
  localStorage.setItem(keys.refreshToken, response.refresh_token)
  localStorage.setItem(keys.fullName, fullName)
  localStorage.setItem(keys.userId, response.admin_user_id)
  localStorage.setItem(keys.role, response.assigned_role)
  localStorage.setItem(keys.tenantStatus, response.tenant_status)
  localStorage.setItem(keys.tenantId, response.tenant_id)
  localStorage.setItem('fadaa_doctor_welcome_pending', response.admin_user_id)
}

export function getSession(): Session | null {
  const accessToken = localStorage.getItem(keys.accessToken)
  if (!accessToken) return null

  return {
    accessToken,
    refreshToken: localStorage.getItem(keys.refreshToken) ?? '',
    fullName: localStorage.getItem(keys.fullName) ?? '',
    userId: localStorage.getItem(keys.userId) ?? '',
    tenantId: localStorage.getItem(keys.tenantId),
    role: localStorage.getItem(keys.role) || null,
    tenantStatus: localStorage.getItem(keys.tenantStatus) || null
  }
}

export async function hasValidPatientSession(): Promise<boolean> {
  const session = getSession()
  if (!session || !['PATIENT', 'patient'].includes(session.role ?? '')) return false
  const apiUrl = import.meta.env.VITE_API_URL ?? ''
  try {
    const response = await fetch(`${apiUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    })
    if (!response.ok) {
      clearSession()
      return false
    }
    const profile = await response.json() as { user?: { role?: string }; tenant?: { id?: string } | null }
    return ['PATIENT', 'patient'].includes(profile.user?.role ?? '') && Boolean(profile.tenant?.id)
  } catch {
    return false
  }
}

export function clearSession() {
  Object.values(keys).forEach((key) => localStorage.removeItem(key))
  window.dispatchEvent(new Event('fadaa:session-expired'))
}

export function logout() {
  const token = localStorage.getItem(keys.accessToken)
  if (token) {
    const apiUrl = import.meta.env.VITE_API_URL ?? ''
    void fetch(`${apiUrl}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined)
  }
  clearSession()
}

export function redirectForRole(role: string | null) {
  return role ? roleRedirects[role] ?? '/login' : '/login'
}
