import { LanguageSwitcher } from './LanguageSwitcher'
import { useEffect, useState } from 'react'

export function WorkspaceLanguageSwitcher() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const update = () => setPath(window.location.pathname)
    window.addEventListener('popstate', update)
    window.addEventListener('fadaa:navigation', update)
    return () => {
      window.removeEventListener('popstate', update)
      window.removeEventListener('fadaa:navigation', update)
    }
  }, [])
  const needsGlobalSwitcher = ['/patient/', '/doctor/', '/staff/', '/super-admin/'].some(prefix => path.startsWith(prefix))
  if (!needsGlobalSwitcher || path === '/patient/find-doctor') return null

  return (
    <div className="fixed end-[7.5rem] top-2 z-[100] rounded-xl bg-white/95 p-0.5 shadow-sm ring-1 ring-atlas-line backdrop-blur md:end-[10.5rem]">
      <LanguageSwitcher />
    </div>
  )
}
