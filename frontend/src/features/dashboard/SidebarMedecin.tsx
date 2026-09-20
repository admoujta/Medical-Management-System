import {
  BarChart3,
  Bell,
  BadgeDollarSign,
  CalendarDays,
  ClipboardList,
  CheckCheck,
  CreditCard,
  Landmark,
  FileHeart,
  FileText,
  LogOut,
  MessageCircle,
  Settings,
  ScrollText,
  ShieldCheck,
  Stethoscope,
  WalletCards,
  X
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { apiList, apiPatch } from '../../lib/api'
import { getSession } from '../../lib/auth'
import { showToast } from '../../lib/uiFeedback'
import { moduleForPath, useCabinetModules } from '../../lib/subscriptionModules'
import { WorkspaceNavButton } from '../../components/WorkspaceNavButton'

const menuItems = [
  ['Tableau de bord', '/doctor/dashboard', BarChart3],
  ['Rendez-vous', '/doctor/appointments', CalendarDays],
  ['Visites', '/doctor/visits', Stethoscope],
  ['Honoraires', '/doctor/honoraires', WalletCards],
  ['Paiements / RAP', '/doctor/payments', CreditCard],
  ['Finance', '/doctor/finance', Landmark],
  ['Relances impayés', '/doctor/reminders', MessageCircle],
  ['WhatsApp', '/doctor/whatsapp/conversations', MessageCircle],
  ['CNSS/CNOPS', '/doctor/cnss', ClipboardList],
  ['Ordonnances', '/doctor/prescriptions', FileHeart],
  ['Documents', '/doctor/documents', FileText],
  ['Utilisateurs & permissions', '/doctor/staff', ShieldCheck],
  ['Sécurité & traçabilité', '/doctor/security/audit-logs', ScrollText],
  ['Abonnement', '/doctor/subscription', BadgeDollarSign],
  ['Configuration du cabinet', '/doctor/settings', Settings]
]

type SidebarMedecinProps = {
  cabinetName: string
  onLogout: () => void
  onNavigate: (path: string) => void
}

export function SidebarMedecin({ cabinetName, onLogout, onNavigate }: SidebarMedecinProps) {
  const { t } = useTranslation()
  const translatedLabels: Record<string, string> = {'Tableau de bord':'dashboard','Rendez-vous':'appointments','Visites':'visits','Honoraires':'fees','Paiements / RAP':'paymentsRap','Finance':'finance','Relances impayés':'unpaidReminders','WhatsApp':'whatsapp','CNSS/CNOPS':'cnss','Ordonnances':'prescriptions','Documents':'documents','Utilisateurs & permissions':'usersPermissions','Sécurité & traçabilité':'securityTraceability','Abonnement':'subscription','Configuration du cabinet':'practiceSettings'}
  const currentPath = window.location.pathname
  const token=getSession()?.accessToken??''
  const cabinetModules=useCabinetModules()
  const[notifications,setNotifications]=useState<Array<{id:string;type:string;title:string;message:string;resource_id:string|null;read_at:string|null;created_at:string}>>([])
  const[notificationsOpen,setNotificationsOpen]=useState(false)
  const[notificationsBusy,setNotificationsBusy]=useState(false)
  useEffect(()=>{if(!token)return;const load=()=>apiList<any>('/doctor/notifications',token).then(setNotifications).catch(()=>undefined);void load();const timer=window.setInterval(load,30000);return()=>window.clearInterval(timer)},[token])
  const unread=notifications.filter(item=>!item.read_at).length
  function notificationPath(item:typeof notifications[number]){
    if(item.type==='NEW_REVIEW')return '/doctor/reviews'
    if(item.type==='CNSS_REQUEST')return '/doctor/cnss'
    if(item.type.startsWith('WHATSAPP_'))return '/doctor/whatsapp/conversations'
    if(item.type==='SUPPORT_REPLY')return item.resource_id?`/doctor/support/${item.resource_id}`:'/doctor/support'
    if(item.type==='PLATFORM_EVENT'&&item.resource_id)return `/evenements/${item.resource_id}`
    if(item.type.startsWith('SUBSCRIPTION_'))return '/doctor/subscription'
    return '/doctor/dashboard'
  }
  async function openNotification(item:typeof notifications[number]){
    if(notificationsBusy)return
    setNotificationsBusy(true)
    try{
      if(!item.read_at){
        await apiPatch(`/doctor/notifications/${item.id}/read`,token)
        setNotifications(rows=>rows.map(row=>row.id===item.id?{...row,read_at:new Date().toISOString()}:row))
      }
      setNotificationsOpen(false)
      onNavigate(notificationPath(item))
    }catch(reason){
      showToast(reason instanceof Error?reason.message:'Impossible d’ouvrir cette notification.','error')
    }finally{setNotificationsBusy(false)}
  }
  async function readAllNotifications(){
    if(!unread||notificationsBusy)return
    setNotificationsBusy(true)
    try{
      await apiPatch('/doctor/notifications/read-all',token)
      const now=new Date().toISOString()
      setNotifications(rows=>rows.map(row=>({...row,read_at:row.read_at??now})))
      showToast('Toutes les notifications ont été marquées comme lues.','success')
    }catch(reason){
      showToast(reason instanceof Error?reason.message:'Mise à jour des notifications impossible.','error')
    }finally{setNotificationsBusy(false)}
  }

  return (
    <header className="sticky top-0 z-40 border-b border-atlas-line bg-white/95 shadow-sm backdrop-blur-xl">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <img src="/images/fadaa-logo.svg" alt="FADAA Santé" className="h-11 w-32 shrink-0 object-contain" />
            <span className="hidden h-7 w-px bg-atlas-line sm:block"/>
            <div className="hidden min-w-0 sm:block"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t('doctorSpace')}</p><p className="truncate text-sm font-bold text-atlas-petrol">{cabinetName}</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-2"><div className="relative"><button type="button" onClick={()=>setNotificationsOpen(value=>!value)} className="relative rounded-[9px] p-2.5 text-atlas-petrol transition hover:bg-atlas-mist" title="Notifications" aria-expanded={notificationsOpen}><Bell size={19}/>{unread>0&&<span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white">{unread>9?'9+':unread}</span>}</button>{notificationsOpen&&<div className="absolute right-0 top-12 z-50 w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-atlas-line bg-white shadow-2xl"><div className="flex items-start justify-between border-b p-4"><div><b className="text-base">Notifications</b><p className="mt-1 text-xs text-slate-500">{unread?`${unread} nouvelle${unread>1?'s':''} notification${unread>1?'s':''}`:'Tout est à jour'}</p></div><button type="button" onClick={()=>setNotificationsOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Fermer"><X size={17}/></button></div><div className="max-h-96 overflow-y-auto p-2">{notifications.map(item=><button key={item.id} disabled={notificationsBusy} onClick={()=>void openNotification(item)} className={`w-full rounded-xl p-3 text-left transition hover:bg-slate-50 disabled:cursor-wait ${item.read_at?'opacity-60':'bg-atlas-mist/30'}`}><span className="flex justify-between gap-3"><b className="text-sm">{item.title}</b>{!item.read_at&&<span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-atlas-teal"/>}</span><span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500">{item.message}</span><span className="mt-2 block text-[10px] font-semibold text-slate-400">{new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.created_at))}</span></button>)}{!notifications.length&&<div className="p-8 text-center"><CheckCheck className="mx-auto text-emerald-500"/><p className="mt-3 text-sm font-bold">Aucune notification</p><p className="mt-1 text-xs text-slate-500">Les nouveaux messages apparaîtront ici.</p></div>}</div>{notifications.length>0&&<div className="border-t border-atlas-line p-3"><button type="button" disabled={!unread||notificationsBusy} onClick={()=>void readAllNotifications()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-atlas-mist px-4 py-3 text-xs font-bold text-atlas-petrol transition hover:brightness-95 disabled:cursor-default disabled:opacity-40"><CheckCheck size={15}/>{notificationsBusy?'Mise à jour…':'Tout marquer comme lu'}</button></div>}</div>}</div><button type="button" onClick={onLogout} className="inline-flex shrink-0 items-center gap-2 rounded-[9px] px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"><LogOut size={17}/><span className="hidden sm:inline">Déconnexion</span></button></div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto scroll-smooth border-t border-atlas-line/70 px-4 py-2 [scrollbar-width:thin] md:px-6">
          {menuItems.filter(([,path]) => {
            const required=moduleForPath(path as string)
            return !required || !cabinetModules || cabinetModules.includes(required)
          }).map(([label, path, Icon]) => (
            <WorkspaceNavButton
              key={label as string}
              onClick={() => onNavigate(path as string)}
              active={currentPath === path || currentPath.startsWith(`${path}/`)}
              icon={Icon}
              layoutId="doctor-active-nav"
            >
              {t(translatedLabels[label as string] ?? label as string)}
            </WorkspaceNavButton>
          ))}
        </nav>

      </div>
    </header>
  )
}
