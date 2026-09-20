import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bell, Building2, CalendarClock, CalendarDays, CheckCheck, CreditCard, DatabaseBackup, Images, LayoutDashboard, LifeBuoy, ListTree, LockKeyhole, LogOut, MessageCircle, Newspaper, Settings, ShieldCheck, UsersRound, X } from 'lucide-react'
import { apiGet } from '../../lib/api'
import { getSession, logout } from '../../lib/auth'
import { useTranslation } from 'react-i18next'
import { WorkspaceNavButton } from '../../components/WorkspaceNavButton'

const links=[['dashboard','/super-admin/dashboard',LayoutDashboard],['instancesPractices','/super-admin/instances',Building2],['events','/super-admin/evenements',CalendarDays],['Blog','/super-admin/blog',Newspaper],['Médiathèque','/super-admin/mediatheque',Images],['offers','/super-admin/subscription-plans',CreditCard],['subscriptions','/super-admin/abonnements',CreditCard],['support','/super-admin/support',LifeBuoy],['users','/super-admin/utilisateurs',UsersRound],['whatsapp','/super-admin/whatsapp',MessageCircle],['backups','/super-admin/backups',DatabaseBackup],['settings','/super-admin/settings',Settings],['logs','/super-admin/logs',ListTree]] as const

type Notification={id:string;title:string;detail:string;path:string;tone:'amber'|'blue'|'red';icon:typeof Bell}
const storedRead=(key:string)=>{try{return JSON.parse(localStorage.getItem(key)??'[]') as string[]}catch{return[]}}

export function AdminLayout({children,onNavigate}:{children:ReactNode;onNavigate:(path:string)=>void}){
  const {t,i18n}=useTranslation()
  const session=getSession()
  const initials=(session?.fullName||'Admin FADAA').split(' ').map(value=>value[0]).slice(0,2).join('').toUpperCase()
  const readKey=`fadaa_admin_notifications_read_${session?.userId??'admin'}`
  const[open,setOpen]=useState(false);const[data,setData]=useState<any>(null);const[read,setRead]=useState<string[]>(()=>storedRead(readKey))
  useEffect(()=>{if(!session?.accessToken)return;const load=()=>apiGet<any>('/super-admin/dashboard',session.accessToken).then(setData).catch(()=>undefined);void load();const timer=window.setInterval(load,30000);return()=>window.clearInterval(timer)},[session?.accessToken])
  const notifications=useMemo<Notification[]>(()=>{if(!data)return[];const rows:Notification[]=[];(data.expiring_soon??[]).forEach((item:any)=>rows.push({id:`expiry-${item.id}`,title:t('trialExpiring'),detail:`${item.name} · ${t('endsOn',{date:new Date(item.trial_ends_at).toLocaleDateString(i18n.language)})}`,path:`/super-admin/instances/${item.id}`,tone:'amber',icon:CalendarClock}));(data.recent_tickets??[]).filter((item:any)=>['open','in_progress'].includes(item.status)).forEach((item:any)=>rows.push({id:`ticket-${item.id}-${item.updated_at}`,title:t('supportNewMessage'),detail:`${item.cabinet_name??'FADAA'} · ${item.subject}`,path:`/super-admin/support/${item.id}`,tone:'blue',icon:LifeBuoy}));if(data.stats?.suspended>0)rows.push({id:'suspended',title:t('suspendedInstances'),detail:t('needsVerification',{count:data.stats.suspended}),path:'/super-admin/instances',tone:'red',icon:AlertTriangle});return rows},[data,i18n.language,t])
  const unread=notifications.filter(item=>!read.includes(item.id)).length
  function markRead(ids:string[]){setRead(current=>{const next=Array.from(new Set([...current,...ids]));localStorage.setItem(readKey,JSON.stringify(next));return next})}
  function select(item:Notification){markRead([item.id]);setOpen(false);onNavigate(item.path)}
  return <main className="min-h-screen bg-[linear-gradient(180deg,#edf4f5_0,#f7f9fb_260px)] text-slate-900"><header className="sticky top-0 z-40 shadow-[0_8px_30px_rgba(8,31,40,.12)]"><div className="bg-[linear-gradient(110deg,#071d27,#113f49_60%,#0f766e)] text-white"><div className="mx-auto flex max-w-[1600px] items-center justify-between gap-5 px-5 py-4 md:px-8"><div className="flex min-w-0 items-center gap-5"><button onClick={()=>onNavigate('/super-admin/dashboard')} className="shrink-0 rounded-xl bg-white p-2 shadow-lg"><img src="/images/fadaa-logo.svg" alt="FADAA Santé" className="h-9 w-28 object-contain"/></button><div className="hidden h-10 w-px bg-white/15 sm:block"/><div className="min-w-0"><div className="flex items-center gap-2"><ShieldCheck size={17} className="text-teal-300"/><p className="truncate text-sm font-black uppercase tracking-[.15em]">{t('superAdminConsole')}</p></div><p className="mt-1 hidden text-xs text-white/55 md:block">{t('platformManagement')}</p></div></div><div className="flex shrink-0 items-center gap-2"><span className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-200 lg:inline-flex"><LockKeyhole size={14}/>{t('noMedicalData')}</span><div className="relative"><button onClick={()=>setOpen(value=>!value)} className="relative rounded-xl border border-white/10 bg-white/5 p-2.5 text-white/75 hover:bg-white/10" title={t('platformNotifications')}><Bell size={18}/>{unread>0&&<span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-slate-950 ring-2 ring-[#113f49]">{unread>9?'9+':unread}</span>}</button>{open&&<NotificationsPanel notifications={notifications} read={read} onClose={()=>setOpen(false)} onSelect={select} onReadAll={()=>markRead(notifications.map(item=>item.id))}/>}</div><div className="hidden items-center gap-3 border-s border-white/15 ps-3 sm:flex"><span className="grid h-10 w-10 place-items-center rounded-full bg-teal-400 font-black text-slate-950">{initials}</span><div className="hidden text-start md:block"><p className="max-w-36 truncate text-sm font-bold">{session?.fullName||'Super Admin'}</p><p className="text-[10px] font-bold uppercase tracking-wider text-teal-200">{t('globalAdministrator')}</p></div></div><button onClick={()=>{logout();onNavigate('/login')}} className="rounded-xl p-2.5 text-red-200 hover:bg-red-500/15" title={t('logout')}><LogOut size={19}/></button></div></div></div><nav className="border-b border-slate-200 bg-white/95 backdrop-blur-xl"><div className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto scroll-smooth px-4 py-2 md:px-8">{links.map(([label,path,Icon])=>{const active=location.pathname===path||location.pathname.startsWith(`${path}/`);return <WorkspaceNavButton key={path} onClick={()=>onNavigate(path)} active={active} icon={Icon} layoutId="admin-active-nav">{t(label)}</WorkspaceNavButton>})}</div></nav></header><section className="min-w-0">{children}</section><footer className="mt-10 border-t border-slate-200 bg-white/70"><div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-slate-400 md:px-8"><p>{t('platformAdministration')}</p><p className="inline-flex items-center gap-2"><LockKeyhole size={13}/>{t('administrativeAccess')}</p></div></footer></main>
}

function NotificationsPanel({notifications,read,onClose,onSelect,onReadAll}:{notifications:Notification[];read:string[];onClose:()=>void;onSelect:(item:Notification)=>void;onReadAll:()=>void}){const{t}=useTranslation();const colors={amber:'bg-amber-50 text-amber-700',blue:'bg-blue-50 text-blue-700',red:'bg-red-50 text-red-700'};return <div className="absolute end-0 top-14 z-50 w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="font-black">{t('notifications')}</p><p className="text-xs text-slate-500">{t('platformAlerts')}</p></div><button onClick={onClose} aria-label={t('close')} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={17}/></button></div><div className="max-h-[420px] overflow-y-auto p-2">{notifications.length?notifications.map(item=>{const Icon=item.icon;const isRead=read.includes(item.id);return <button key={item.id} onClick={()=>onSelect(item)} className={`flex w-full items-start gap-3 rounded-xl p-3 text-start transition hover:bg-slate-50 ${isRead?'opacity-60':''}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${colors[item.tone]}`}><Icon size={18}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{item.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{item.detail}</span></span>{!isRead&&<span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal-500"/>}</button>}):<div className="px-5 py-10 text-center"><CheckCheck className="mx-auto text-emerald-500"/><p className="mt-3 font-bold">{t('allUpToDate')}</p><p className="mt-1 text-xs text-slate-500">{t('noNotifications')}</p></div>}</div>{notifications.length>0&&<div className="border-t border-slate-100 p-3"><button onClick={onReadAll} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100"><CheckCheck size={15}/>{t('markAllRead')}</button></div>}</div>}

export function StatusBadge({status}:{status:string}){
  const {t}=useTranslation()
  const normalized=status.toLowerCase()
  const colors:Record<string,string>={
    active:'bg-emerald-100 text-emerald-700',
    resolved:'bg-emerald-100 text-emerald-700',
    completed:'bg-emerald-100 text-emerald-700',
    paid:'bg-emerald-100 text-emerald-700',
    published:'bg-emerald-100 text-emerald-700',
    trial:'bg-blue-100 text-blue-700',
    open:'bg-blue-100 text-blue-700',
    planned:'bg-blue-100 text-blue-700',
    normal:'bg-violet-100 text-violet-700',
    in_progress:'bg-violet-100 text-violet-700',
    pending:'bg-amber-100 text-amber-800',
    pending_payment:'bg-amber-100 text-amber-800',
    expired:'bg-amber-100 text-amber-800',
    high:'bg-orange-100 text-orange-700',
    urgent:'bg-red-100 text-red-700',
    suspended:'bg-red-100 text-red-700',
    cancelled:'bg-slate-200 text-slate-700',
    archived:'bg-slate-200 text-slate-700',
    closed:'bg-slate-200 text-slate-700',
    low:'bg-slate-100 text-slate-600',
    draft:'bg-slate-100 text-slate-600',
  }
  const labels:Record<string,string>={active:'statusActive',resolved:'statusResolved',completed:'statusCompleted',paid:'statusPaid',published:'statusPublished',trial:'statusTrial',open:'statusOpen',planned:'statusPlanned',normal:'statusNormal',in_progress:'statusInProgress',pending:'statusPending',pending_payment:'statusPendingPayment',expired:'statusExpired',high:'statusHigh',urgent:'statusUrgent',suspended:'statusSuspended',cancelled:'statusCancelled',archived:'Archivé',closed:'statusClosed',low:'statusLow',draft:'statusDraft'}
  return <span className={`inline-flex h-7 w-fit max-w-full shrink-0 self-center items-center justify-center whitespace-nowrap rounded-full px-3 text-[11px] font-extrabold uppercase leading-none tracking-wide ${colors[normalized]??'bg-violet-100 text-violet-700'}`}>{labels[normalized]?t(labels[normalized]):normalized.replaceAll('_',' ')}</span>
}
