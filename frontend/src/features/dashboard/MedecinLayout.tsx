import { ReactNode, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarPlus, CheckCircle2, Clock3, CreditCard, Settings, Sparkles, UserPlus, X } from 'lucide-react'

import { apiGet } from '../../lib/api'
import { getSession } from '../../lib/auth'
import { SidebarMedecin } from './SidebarMedecin'

type MedecinLayoutProps = {
  cabinetName: string
  children: ReactNode
  onLogout: () => void
  onNavigate: (path: string) => void
}

export function MedecinLayout({ cabinetName, children, onLogout, onNavigate }: MedecinLayoutProps) {
  const session=getSession()
  const[showWelcome,setShowWelcome]=useState(()=>Boolean(session?.userId&&localStorage.getItem('fadaa_doctor_welcome_pending')===session.userId))
  const[subscription,setSubscription]=useState<{status:string;end_date:string}|null>(null)
  useEffect(()=>{if(!session?.accessToken)return;apiGet<{status:string;end_date:string}>('/doctor/subscription',session.accessToken).then(setSubscription).catch(()=>undefined)},[session?.accessToken])
  const alert=useMemo(()=>{if(!subscription)return null;const end=new Date(subscription.end_date);const days=Math.ceil((end.getTime()-Date.now())/86400000);if(days>7)return null;return{days:Math.max(0,days),expired:days<=0||subscription.status==='expired'||subscription.status==='cancelled',date:new Intl.DateTimeFormat('fr-FR',{dateStyle:'long'}).format(end)}},[subscription])
  function closeWelcome(path?:string){localStorage.removeItem('fadaa_doctor_welcome_pending');setShowWelcome(false);if(path)onNavigate(path)}
  return (
    <main className="min-h-screen bg-atlas-cloud text-atlas-ink">
      <SidebarMedecin cabinetName={cabinetName} onLogout={onLogout} onNavigate={onNavigate} />
      <section className="min-w-0">
        {alert&&<div className={`border-b px-5 py-3 ${alert.expired?'border-red-200 bg-red-50 text-red-800':'border-amber-200 bg-amber-50 text-amber-900'}`}><div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3"><div className="flex items-start gap-3"><AlertTriangle size={21} className="mt-0.5 shrink-0"/><div><p className="text-sm font-bold">{alert.expired?'Abonnement expiré — espace en lecture seule':`Votre abonnement expire dans ${alert.days} jour${alert.days>1?'s':''}`}</p><p className="mt-0.5 text-xs opacity-80">Échéance le {alert.date}. {alert.expired?'Réactivez-le pour créer ou modifier vos données.':'Réglez-le avant cette date pour conserver toutes les fonctionnalités.'}</p></div></div><button type="button" onClick={()=>onNavigate('/doctor/subscription')} className={`inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-sm font-bold text-white ${alert.expired?'bg-red-600':'bg-amber-600'}`}><CreditCard size={16}/>{alert.expired?'Réactiver':'Régler l’abonnement'}</button></div></div>}
        {children}
      </section>
      {showWelcome&&<div role="dialog" aria-modal="true" aria-labelledby="welcome-title" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"><section className="relative w-full max-w-2xl overflow-hidden rounded-[20px] bg-white shadow-2xl"><div className="bg-gradient-to-br from-atlas-petrol to-atlas-teal px-6 py-7 text-white md:px-8"><button type="button" onClick={()=>closeWelcome()} aria-label="Fermer" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 hover:bg-white/20"><X size={19}/></button><span className="grid h-12 w-12 place-items-center rounded-full bg-white/15 ring-1 ring-white/25"><Sparkles size={23}/></span><p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-white/70">Votre espace est prêt</p><h2 id="welcome-title" className="mt-2 font-display text-3xl font-bold">Bienvenue Dr. {session?.fullName}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/80">Votre cabinet FADAA Santé a été créé avec succès. Vos données sont sécurisées et isolées dans votre espace professionnel.</p></div><div className="p-6 md:p-8"><div className="grid gap-3 sm:grid-cols-3"><WelcomeAction icon={UserPlus} label="Ajouter un patient" description="Créez votre premier dossier patient." onClick={()=>closeWelcome('/doctor/patients')}/><WelcomeAction icon={CalendarPlus} label="Créer un rendez-vous" description="Planifiez votre première consultation." onClick={()=>closeWelcome('/doctor/appointments')}/><WelcomeAction icon={Settings} label="Configurer le cabinet" description="Complétez vos informations professionnelles." onClick={()=>closeWelcome('/doctor/cabinet')}/></div><button type="button" onClick={()=>closeWelcome('/doctor/cabinet')} className="mt-5 flex w-full items-start gap-3 rounded-[10px] border border-atlas-teal/25 bg-atlas-mist/50 p-4 text-left transition hover:border-atlas-teal hover:bg-atlas-mist"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-atlas-teal shadow-sm"><Clock3 size={19}/></span><span><b className="block text-sm text-atlas-petrol">Votre planning initial est déjà prêt</b><span className="mt-1 block text-xs leading-5 text-slate-600">Du lundi au vendredi, de 09:00 à 17:00, avec une pause de 12:30 à 13:30 et des consultations de 30 minutes. Cliquez ici pour le modifier dans la configuration du cabinet.</span></span></button><div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-atlas-line pt-5"><p className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700"><CheckCircle2 size={16}/>Vous bénéficiez de toutes les fonctionnalités pendant votre période d’essai.</p><button type="button" onClick={()=>closeWelcome()} className="rounded-[8px] bg-atlas-teal px-5 py-3 text-sm font-bold text-white hover:bg-atlas-petrol">Découvrir mon tableau de bord</button></div></div></section></div>}
    </main>
  )
}

function WelcomeAction({icon:Icon,label,description,onClick}:{icon:typeof UserPlus;label:string;description:string;onClick:()=>void}){return <button type="button" onClick={onClick} className="rounded-[12px] border border-atlas-line p-4 text-left transition hover:-translate-y-0.5 hover:border-atlas-teal hover:bg-atlas-mist/40 hover:shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-[9px] bg-atlas-mist text-atlas-teal"><Icon size={19}/></span><b className="mt-4 block text-sm">{label}</b><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></button>}
