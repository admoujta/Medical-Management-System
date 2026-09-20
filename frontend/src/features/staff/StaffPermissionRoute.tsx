import { ReactNode, useEffect, useState } from 'react'
import { apiGet } from '../../lib/api'
import { getSession, logout } from '../../lib/auth'
import { StaffLayout } from './StaffLayout'

export function StaffPermissionRoute({ module, onNavigate, children }: { module:string; onNavigate:(path:string)=>void; children:(level:string)=>ReactNode }) {
  const session=getSession(); const[level,setLevel]=useState<string|null>(null)
  useEffect(()=>{if(session?.accessToken)apiGet<{permissions:Record<string,string>}>('/staff/me/permissions',session.accessToken).then(data=>setLevel(data.permissions[module]??'none')).catch(()=>setLevel('none'))},[module,session?.accessToken])
  if(level===null)return <main className="grid min-h-screen place-items-center bg-atlas-cloud"><p className="font-bold">Vérification des permissions…</p></main>
  if(level==='none')return <StaffLayout cabinetName="Espace cabinet" onNavigate={onNavigate} onLogout={()=>{logout();onNavigate('/login')}}><div className="grid min-h-[70vh] place-items-center p-6"><div className="max-w-md rounded-[12px] border border-red-200 bg-white p-8 text-center shadow-sm"><p className="font-display text-xl font-bold text-red-700">Accès non autorisé</p><p className="mt-3 text-sm leading-6 text-slate-600">Votre compte n’a pas accès à ce module. Demandez au médecin responsable de modifier vos permissions si nécessaire.</p><button type="button" onClick={()=>onNavigate('/staff/dashboard')} className="mt-5 rounded-[8px] bg-atlas-teal px-5 py-3 text-sm font-bold text-white">Retour au tableau de bord</button></div></div></StaffLayout>
  return <>{children(level)}</>
}
