import { useEffect, useState } from 'react'
import { Building2, CheckCircle2, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { apiGet } from '../../lib/api'
import { getSession, logout } from '../../lib/auth'
import { StaffLayout } from './StaffLayout'

type Me = { user: { id: string; full_name: string; email: string; role: string | null }; tenant: { name: string; slug: string } | null; read_only: boolean; notice: string | null }
type PermissionLevel = 'none' | 'read' | 'write' | 'admin'

const modules: Array<[string, string]> = [
  ['appointments', 'Rendez-vous'],
  ['patients', 'Patients'],
  ['visits', 'Visites'],
  ['honoraires', 'Honoraires'],
  ['payments', 'Paiements'],
  ['prescriptions', 'Ordonnances'],
  ['documents', 'Documents'],
  ['cnss', 'CNSS/CNOPS'],
  ['whatsapp_reminders', 'Relances WhatsApp'],
  ['manage_staff', 'Gestion de l’équipe'],
]

const accessLabels: Record<PermissionLevel, { title: string; detail: string; style: string }> = {
  none: { title: 'Aucun accès', detail: 'Ce module et ses actions ne sont pas affichés.', style: 'bg-slate-100 text-slate-600' },
  read: { title: 'Consultation uniquement', detail: 'Vous pouvez consulter les informations sans les modifier.', style: 'bg-sky-100 text-sky-800' },
  write: { title: 'Consulter, créer et modifier', detail: 'Vous pouvez utiliser les actions opérationnelles du module.', style: 'bg-emerald-100 text-emerald-800' },
  admin: { title: 'Accès administrateur', detail: 'Vous disposez de toutes les actions autorisées sur ce module.', style: 'bg-violet-100 text-violet-800' },
}

export function StaffProfilePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const session = getSession()
  const [me, setMe] = useState<Me | null>(null)
  const [permissions, setPermissions] = useState<Record<string, PermissionLevel>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session?.accessToken) return
    Promise.all([
      apiGet<Me>('/auth/me', session.accessToken),
      apiGet<{ permissions: Record<string, PermissionLevel> }>('/staff/me/permissions', session.accessToken),
    ]).then(([profile, access]) => {
      setMe(profile)
      setPermissions(access.permissions)
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Profil indisponible.'))
  }, [session?.accessToken])

  return <StaffLayout cabinetName={me?.tenant?.name ?? 'Cabinet médical'} onNavigate={onNavigate} onLogout={() => { logout(); onNavigate('/login') }}>
    <div className="mx-auto max-w-5xl px-5 py-6 md:px-8">
      <header><p className="text-sm font-bold uppercase tracking-wide text-atlas-teal">Mon compte</p><h1 className="mt-1 font-display text-3xl font-bold">Profil secrétaire</h1><p className="mt-2 text-sm text-slate-600">Vos informations professionnelles, votre cabinet et les accès accordés à votre compte.</p></header>
      {error && <p role="alert" className="mt-5 rounded-[8px] border border-red-200 bg-red-50 p-4 font-semibold text-red-700">{error}</p>}
      {!me && !error ? <div className="mt-6 rounded-[12px] border border-atlas-line bg-white p-10 text-center text-sm font-semibold text-slate-500">Chargement du profil…</div> : me && <>
        <section className="mt-6 overflow-hidden rounded-[14px] border border-atlas-line bg-white shadow-sm"><div className="flex flex-wrap items-center gap-4 bg-gradient-to-r from-atlas-petrol to-atlas-teal p-6 text-white"><span className="grid h-16 w-16 place-items-center rounded-full bg-white/15 text-2xl font-bold ring-1 ring-white/20">{me.user.full_name.charAt(0).toUpperCase()}</span><div><p className="text-sm font-semibold text-white/70">Compte secrétaire</p><h2 className="mt-1 font-display text-2xl font-bold">{me.user.full_name}</h2><p className="mt-1 text-sm text-white/80">{me.tenant?.name ?? 'Cabinet médical'}</p></div></div><div className="grid gap-4 p-5 sm:grid-cols-2 md:p-6"><Info icon={UserRound} label="Nom complet" value={me.user.full_name}/><Info icon={Mail} label="Adresse email" value={me.user.email}/><Info icon={Building2} label="Cabinet" value={me.tenant?.name ?? '—'}/><Info icon={KeyRound} label="Code cabinet" value={me.tenant?.slug ?? '—'}/></div></section>
        <section className="mt-6 rounded-[14px] border border-atlas-line bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-atlas-mist text-atlas-teal"><ShieldCheck size={21}/></span><div><h2 className="font-display text-xl font-bold">Mes accès</h2><p className="mt-1 text-sm leading-6 text-slate-500">Ces autorisations sont définies par le médecin administrateur. Les modules sans accès ne sont pas proposés dans votre espace.</p></div></div>
          <div className="mt-5 divide-y divide-atlas-line rounded-[10px] border border-atlas-line">
            {modules.map(([key, label]) => { const level = permissions[key] ?? 'none'; const access = accessLabels[level]; return <div key={key} className="grid gap-2 p-4 sm:grid-cols-[minmax(160px,.65fr)_1fr] sm:items-center"><p className="font-bold text-atlas-petrol">{label}</p><div className="flex flex-wrap items-center gap-3"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${access.style}`}>{access.title}</span><span className="text-sm text-slate-500">{access.detail}</span></div></div> })}
          </div>
        </section>
        <section className="mt-6 rounded-[12px] border border-atlas-line bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><ShieldCheck size={19}/></span><div><h3 className="font-bold">Accès sécurisé</h3><p className="mt-1 text-sm leading-6 text-slate-500">Le serveur vérifie vos droits pour chaque consultation et chaque action.</p><p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 size={14}/>Compte actif</p></div></div></section>
        {me.notice && <p className="mt-5 rounded-[8px] border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{me.notice}</p>}
      </>}
    </div>
  </StaffLayout>
}

function Info({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) { return <div className="rounded-[10px] border border-atlas-line p-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-atlas-mist text-atlas-teal"><Icon size={18}/></span><p className="mt-3 text-xs font-bold text-slate-500">{label}</p><p className="mt-1 break-words font-bold">{value}</p></div> }
