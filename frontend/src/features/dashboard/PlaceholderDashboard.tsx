import { LogOut } from 'lucide-react'

import { getSession, logout } from '../../lib/auth'

type PlaceholderDashboardProps = {
  title: string
  subtitle: string
  onNavigate: (path: string) => void
}

export function PlaceholderDashboard({ title, subtitle, onNavigate }: PlaceholderDashboardProps) {
  const session = getSession()
  function handleLogout() {
    logout()
    onNavigate('/login')
  }

  return (
    <main className="min-h-screen bg-atlas-cloud px-5 py-8 text-atlas-ink md:px-8">
      <section className="mx-auto max-w-5xl rounded-[8px] border border-atlas-line bg-white p-8 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-atlas-teal">FADAA Santé</p>
            <h1 className="mt-3 font-display text-3xl font-bold">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{subtitle}</p>
            {session?.fullName && <p className="mt-5 text-sm font-bold text-atlas-petrol">Connecté: {session.fullName}</p>}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-[8px] border border-atlas-line px-4 py-2 text-sm font-bold text-atlas-petrol hover:border-atlas-teal"
          >
            <LogOut size={17} />
            Déconnexion
          </button>
        </div>
      </section>

    </main>
  )
}
