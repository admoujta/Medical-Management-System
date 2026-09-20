import { ReactNode } from 'react'
import { LockKeyhole } from 'lucide-react'

import { getSession } from '../../lib/auth'
import { moduleForPath, subscriptionModules, useCabinetModules } from '../../lib/subscriptionModules'

type ProtectedRouteProps = {
  allowedRoles: string[]
  children: ReactNode
  onNavigate: (path: string) => void
}

export function ProtectedRoute({ allowedRoles, children, onNavigate }: ProtectedRouteProps) {
  const session = getSession()
  const cabinetModules = useCabinetModules()

  if (!session) {
    window.setTimeout(() => onNavigate('/login'), 0)
    return null
  }

  if (!session.role || !allowedRoles.includes(session.role)) {
    return (
      <main className="grid min-h-screen place-items-center bg-atlas-cloud px-5 text-atlas-ink">
        <section className="max-w-md rounded-[8px] border border-atlas-line bg-white p-8 text-center shadow-panel">
          <p className="text-sm font-bold uppercase text-red-600">Accès non autorisé</p>
          <h1 className="mt-3 font-display text-2xl font-bold">Vous n’avez pas accès à cet espace.</h1>
          <button
            type="button"
            onClick={() => onNavigate('/login')}
            className="mt-6 rounded-[8px] bg-atlas-teal px-5 py-3 text-sm font-bold text-white hover:bg-atlas-petrol"
          >
            Retour à la connexion
          </button>
        </section>
      </main>
    )
  }

  if (allowedRoles.includes('MEDECIN_ADMIN') && !session.tenantId) {
    return (
      <main className="grid min-h-screen place-items-center bg-atlas-cloud px-5 text-atlas-ink">
        <section className="max-w-md rounded-[8px] border border-atlas-line bg-white p-8 text-center shadow-panel">
          <p className="text-sm font-bold uppercase text-red-600">Instance introuvable</p>
          <h1 className="mt-3 font-display text-2xl font-bold">Votre compte n’est rattaché à aucun cabinet.</h1>
          <button
            type="button"
            onClick={() => onNavigate('/login')}
            className="mt-6 rounded-[8px] bg-atlas-teal px-5 py-3 text-sm font-bold text-white hover:bg-atlas-petrol"
          >
            Retour à la connexion
          </button>
        </section>
      </main>
    )
  }

  const requiredModule = moduleForPath(window.location.pathname)
  if (requiredModule && cabinetModules && !cabinetModules.includes(requiredModule)) {
    const label = subscriptionModules.find(([code]) => code === requiredModule)?.[1] ?? requiredModule
    const doctor = ['MEDECIN_ADMIN', 'doctor_admin'].includes(session.role ?? '')
    return (
      <main className="grid min-h-screen place-items-center bg-atlas-cloud px-5 text-atlas-ink">
        <section className="max-w-lg rounded-2xl border border-atlas-line bg-white p-8 text-center shadow-panel">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700"><LockKeyhole size={25}/></span>
          <p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-amber-700">Module non inclus</p>
          <h1 className="mt-2 font-display text-2xl font-bold">{label}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">{doctor ? 'Choisissez une offre incluant ce module pour l’activer dans votre cabinet.' : 'Ce module n’est pas inclus dans l’abonnement actuel du cabinet.'}</p>
          <button type="button" onClick={() => onNavigate(doctor ? '/doctor/subscription' : '/staff/dashboard')} className="mt-6 rounded-xl bg-atlas-teal px-5 py-3 text-sm font-bold text-white shadow-lg shadow-teal-700/15 hover:bg-atlas-petrol">
            {doctor ? 'Voir mon abonnement' : 'Retour au tableau de bord'}
          </button>
        </section>
      </main>
    )
  }

  return children
}
