import { useEffect } from 'react'

import { getSession, redirectForRole } from '../../lib/auth'

export function RoleBasedRedirect({ onNavigate }: { onNavigate: (path: string) => void }) {
  useEffect(() => {
    const session = getSession()
    onNavigate(session ? redirectForRole(session.role) : '/login')
  }, [onNavigate])

  return (
    <main className="grid min-h-screen place-items-center bg-atlas-cloud text-atlas-ink">
      <p className="rounded-full bg-white px-5 py-3 text-sm font-bold shadow-sm">Redirection...</p>
    </main>
  )
}
