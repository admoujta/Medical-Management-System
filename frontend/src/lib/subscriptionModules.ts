import { useEffect, useState } from 'react'

import { apiGet } from './api'
import { getSession } from './auth'

export const subscriptionModules = [
  ['dashboard', 'Tableau de bord'],
  ['appointments', 'Rendez-vous et agenda'],
  ['patients', 'Dossiers patients'],
  ['visits', 'Visites'],
  ['fees', 'Honoraires'],
  ['payments', 'Paiements et RAP'],
  ['reminders', 'Relances d’impayés'],
  ['whatsapp', 'WhatsApp'],
  ['cnss', 'CNSS/CNOPS'],
  ['prescriptions', 'Ordonnances'],
  ['documents', 'Documents'],
  ['staff', 'Utilisateurs et permissions'],
  ['audit', 'Sécurité et traçabilité'],
  ['statistics', 'Statistiques']
] as const

export type SubscriptionModule = typeof subscriptionModules[number][0]

export function moduleForPath(path: string): SubscriptionModule | null {
  const rules: Array<[RegExp, SubscriptionModule]> = [
    [/^\/(doctor|staff)\/(appointments|calendar|schedule)/, 'appointments'],
    [/^\/(doctor|staff)\/patients/, 'patients'],
    [/^\/(doctor|staff)\/visits/, 'visits'],
    [/^\/(doctor|staff)\/honoraires/, 'fees'],
    [/^\/(doctor|staff)\/payments/, 'payments'],
    [/^\/(doctor|staff)\/reminders/, 'reminders'],
    [/^\/(doctor|staff)\/whatsapp/, 'whatsapp'],
    [/^\/(doctor|staff)\/cnss/, 'cnss'],
    [/^\/(doctor|staff)\/prescriptions/, 'prescriptions'],
    [/^\/(doctor|staff)\/documents/, 'documents'],
    [/^\/(doctor|staff)\/(staff|team)/, 'staff'],
    [/^\/doctor\/security/, 'audit'],
    [/^\/(doctor|staff)\/dashboard/, 'dashboard']
  ]
  return rules.find(([pattern]) => pattern.test(path))?.[1] ?? null
}

let cached: string[] | null = null
let pending: Promise<string[]> | null = null

async function loadModules(): Promise<string[]> {
  if (cached) return cached
  const token = getSession()?.accessToken
  if (!token) return []
  if (!pending) {
    pending = apiGet<{enabled_modules:string[]}>('/cabinet/modules', token)
      .then(result => (cached = result.enabled_modules))
      .finally(() => { pending = null })
  }
  return pending
}

export function useCabinetModules() {
  const [modules, setModules] = useState<string[] | null>(cached)
  useEffect(() => { void loadModules().then(setModules).catch(() => setModules([])) }, [])
  return modules
}

export function clearCabinetModulesCache() {
  cached = null
}
