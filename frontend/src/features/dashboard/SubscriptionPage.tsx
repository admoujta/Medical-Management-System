import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Banknote, Building2, CalendarDays, Check, CheckCircle2, Clock3, CreditCard, FileCheck2, Landmark, LoaderCircle, ReceiptText, ShieldCheck, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { apiCreate, apiGet, apiList } from '../../lib/api'
import { getSession, logout } from '../../lib/auth'
import { confirmAction, showToast } from '../../lib/uiFeedback'
import { MedecinLayout } from './MedecinLayout'

type Subscription={
  id:string;plan_id:string|null;plan_name:string;status:string;instance_status:string
  start_date:string;end_date:string;trial_ends_at:string|null;grace_period_ends_at:string|null
  amount:number;currency:string;billing_interval:string;payment_status:string
  auto_renew:boolean;days_remaining:number
}
type Plan={id:string;name:string;slug:string|null;description:string|null;price:number;currency:string;billing_interval:string;duration_months:number;trial_days:number;features:string[];is_featured:boolean}
type Payment={id:string;plan_id:string;amount:number;currency:string;payment_method:string;transaction_reference:string|null;status:string;paid_at:string|null;failure_reason:string|null;period_start:string|null;period_end:string|null;created_at:string}
type Props={onNavigate:(path:string)=>void}

const money=(value:number,currency='MAD')=>new Intl.NumberFormat('fr-MA',{style:'currency',currency,maximumFractionDigits:2}).format(value)
const formatDate=(value:string|null)=>value?new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(value)):'—'
const statusLabels:Record<string,string>={active:'Actif',trial:'Période d’essai',expired:'Expiré',suspended:'Suspendu',cancelled:'Annulé',pending_payment:'Paiement en validation',past_due:'Délai de grâce'}
const statusStyles:Record<string,string>={active:'bg-emerald-100 text-emerald-800',trial:'bg-blue-100 text-blue-800',expired:'bg-red-100 text-red-800',suspended:'bg-red-100 text-red-800',cancelled:'bg-slate-200 text-slate-700',pending_payment:'bg-amber-100 text-amber-800',past_due:'bg-amber-100 text-amber-800'}
const paymentLabels:Record<string,string>={pending:'En validation',processing:'En traitement',paid:'Payé',failed:'Refusé'}
const paymentStyles:Record<string,string>={pending:'bg-amber-100 text-amber-800',processing:'bg-blue-100 text-blue-800',paid:'bg-emerald-100 text-emerald-800',failed:'bg-red-100 text-red-800'}
const methodLabels:Record<string,string>={bank_transfer:'Virement bancaire',cheque:'Chèque',cash:'Espèces',card:'Carte bancaire',other:'Autre'}
const intervalLabels:Record<string,string>={monthly:'mois',quarterly:'trimestre',yearly:'an'}

export function SubscriptionPage({onNavigate}:Props){
  const session=getSession()
  const token=session?.accessToken??''
  const[subscription,setSubscription]=useState<Subscription|null>(null)
  const[plans,setPlans]=useState<Plan[]>([])
  const[payments,setPayments]=useState<Payment[]>([])
  const[loading,setLoading]=useState(true)
  const[error,setError]=useState('')
  const[selectedPlan,setSelectedPlan]=useState<Plan|null>(null)
  const[form,setForm]=useState({payment_method:'bank_transfer',transaction_reference:''})
  const[busy,setBusy]=useState(false)

  const load=useCallback(async()=>{
    if(!token)return
    setLoading(true)
    try{
      const[current,available,history]=await Promise.all([
        apiGet<Subscription>('/doctor/subscription',token),
        apiList<Plan>('/public/subscription-plans',token),
        apiList<Payment>('/doctor/subscription/payments',token),
      ])
      setSubscription(current);setPlans(available);setPayments(history);setError('')
    }catch(reason){setError(reason instanceof Error?reason.message:'Chargement impossible.')}
    finally{setLoading(false)}
  },[token])
  useEffect(()=>{void load()},[load])

  const details=useMemo(()=>{
    if(!subscription)return null
    const activeStart=new Date(subscription.status==='trial'&&subscription.trial_started_at?subscription.trial_started_at:subscription.start_date).getTime()
    const activeEnd=new Date(subscription.status==='trial'&&subscription.trial_ends_at?subscription.trial_ends_at:subscription.end_date).getTime()
    const total=Math.max(1,activeEnd-activeStart)
    return{remaining:subscription.days_remaining,progress:Math.min(100,Math.max(0,((Date.now()-activeStart)/total)*100))}
  },[subscription])
  const pendingPayment=payments.find(item=>['pending','processing'].includes(item.status))

  function choose(plan:Plan){
    setSelectedPlan(plan)
    setForm({payment_method:'bank_transfer',transaction_reference:''})
  }
  async function pay(event:FormEvent){
    event.preventDefault()
    if(!selectedPlan||busy)return
    if(['bank_transfer','cheque'].includes(form.payment_method)&&!form.transaction_reference.trim()){
      setError('La référence du virement ou du chèque est obligatoire.')
      return
    }
    const accepted=await confirmAction({
      title:'Confirmer la déclaration de paiement ?',
      message:`Vous déclarez un règlement de ${money(selectedPlan.price,selectedPlan.currency)} pour l’offre ${selectedPlan.name}. Le compte sera activé après validation par FADAA Santé.`,
      confirmLabel:'Envoyer pour validation',
      tone:'primary',
    })
    if(!accepted)return
    setBusy(true);setError('')
    try{
      await apiCreate('/doctor/subscription/pay',token,{plan_id:selectedPlan.id,payment_method:form.payment_method,transaction_reference:form.transaction_reference.trim()||null,proof_url:null})
      setSelectedPlan(null)
      showToast('Paiement enregistré. FADAA Santé va maintenant le vérifier.','success')
      await load()
    }catch(reason){setError(reason instanceof Error?reason.message:'Déclaration du paiement impossible.')}
    finally{setBusy(false)}
  }
  async function cancelRenewal(){
    if(!subscription?.auto_renew)return
    const accepted=await confirmAction({title:'Désactiver le renouvellement automatique ?',message:'Votre accès restera actif jusqu’à la date de fin de la période déjà payée.',confirmLabel:'Désactiver le renouvellement',tone:'warning'})
    if(!accepted)return
    try{await apiCreate('/doctor/subscription/cancel-renewal',token,{});showToast('Le renouvellement automatique est désactivé.','success');await load()}
    catch(reason){showToast(reason instanceof Error?reason.message:'Modification impossible.','error')}
  }
  const out=()=>{logout();onNavigate('/login')}

  return <MedecinLayout cabinetName="Abonnement du cabinet" onNavigate={onNavigate} onLogout={out}><div className="mx-auto max-w-6xl px-5 py-7 md:px-8">
    <header><p className="text-sm font-bold uppercase tracking-wide text-atlas-teal">Facturation SaaS</p><h1 className="mt-1 font-display text-3xl font-bold">Abonnement du cabinet</h1><p className="mt-2 text-sm text-slate-600">Choisissez votre offre, déclarez le règlement et suivez son activation.</p></header>
    {error&&<p className="mt-6 rounded-[10px] border border-red-200 bg-red-50 p-4 font-semibold text-red-700">{error}</p>}
    {loading?<div className="mt-6 grid min-h-64 place-items-center rounded-[14px] border border-atlas-line bg-white"><span className="inline-flex items-center gap-2 text-sm font-bold text-slate-500"><LoaderCircle className="animate-spin" size={19}/>Chargement de l’abonnement…</span></div>:subscription&&details&&<>
      <section className="mt-6 overflow-hidden rounded-[16px] border border-atlas-line bg-white shadow-sm">
        <div className="bg-gradient-to-br from-atlas-petrol to-atlas-teal p-6 text-white md:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-semibold text-white/70">Offre actuelle</p><h2 className="mt-1 font-display text-3xl font-bold">{subscription.plan_name}</h2><p className="mt-3 text-sm text-white/80">{subscription.status==='trial'?'Toutes les fonctions restent disponibles pendant votre essai.':'Accès professionnel sécurisé à FADAA Santé.'}</p></div><span className={`inline-flex h-8 items-center rounded-full px-4 text-xs font-extrabold uppercase ${statusStyles[subscription.status]??statusStyles.cancelled}`}>{statusLabels[subscription.status]??subscription.status}</span></div><div className="mt-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-white/70">{subscription.status==='trial'?'Tarif après l’essai':'Montant de la période'}</p><p className="mt-1 text-3xl font-bold">{money(subscription.amount,subscription.currency)}</p></div><div className="text-left md:text-right"><p className="text-sm text-white/70">Temps restant</p><p className="mt-1 text-xl font-bold">{details.remaining} jour{details.remaining!==1?'s':''}</p></div></div></div>
        <div className="p-6 md:p-8"><div className="grid gap-4 sm:grid-cols-3"><Info icon={CalendarDays} label="Début" value={formatDate(subscription.start_date)}/><Info icon={Clock3} label={subscription.status==='trial'?'Fin de l’essai':'Prochaine échéance'} value={formatDate(subscription.status==='trial'?subscription.trial_ends_at:subscription.end_date)}/><Info icon={CreditCard} label="Règlement" value={paymentLabels[subscription.payment_status]??subscription.payment_status} positive={subscription.payment_status==='paid'}/></div><div className="mt-7"><div className="mb-2 flex justify-between text-xs font-bold text-slate-500"><span>Avancement de la période</span><span>{Math.round(details.progress)} %</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-atlas-teal transition-all" style={{width:`${details.progress}%`}}/></div></div></div>
      </section>

      {pendingPayment&&<div className="mt-6 flex items-start gap-3 rounded-[12px] border border-amber-200 bg-amber-50 p-5 text-amber-900"><Clock3 className="mt-0.5 shrink-0"/><div><p className="font-bold">Paiement en cours de validation</p><p className="mt-1 text-sm leading-6">Votre règlement de {money(pendingPayment.amount,pendingPayment.currency)} par {methodLabels[pendingPayment.payment_method]??pendingPayment.payment_method} a bien été reçu. Aucune nouvelle déclaration n’est nécessaire.</p></div></div>}

      <section className="mt-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-atlas-teal">Offres disponibles</p><h2 className="mt-1 font-display text-2xl font-bold">{subscription.status==='trial'?'Préparez la fin de votre essai':'Choisissez votre formule'}</h2></div><p className="text-sm text-slate-500">Activation après validation du règlement</p></div><div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{plans.map(plan=><article key={plan.id} className={`relative flex flex-col rounded-[16px] border bg-white p-6 shadow-sm ${plan.id===subscription.plan_id?'border-atlas-teal ring-2 ring-atlas-teal/10':'border-atlas-line'} ${plan.is_featured?'xl:-translate-y-1':''}`}>{plan.is_featured&&<span className="absolute -top-3 left-5 rounded-full bg-atlas-teal px-3 py-1 text-[10px] font-black uppercase text-white">Recommandée</span>}<div className="flex items-start justify-between gap-3"><div><h3 className="font-display text-xl font-bold">{plan.name}</h3><p className="mt-1 text-sm text-slate-500">{plan.description}</p></div>{plan.id===subscription.plan_id&&<BadgeCheck className="shrink-0 text-atlas-teal"/>}</div><p className="mt-5"><b className="text-3xl">{money(plan.price,plan.currency)}</b><span className="text-sm font-bold text-slate-500"> / {intervalLabels[plan.billing_interval]??plan.billing_interval}</span></p><ul className="mt-5 flex-1 space-y-2.5">{plan.features.map(feature=><li key={feature} className="flex gap-2 text-sm text-slate-600"><Check size={17} className="shrink-0 text-emerald-600"/>{feature}</li>)}</ul><button disabled={Boolean(pendingPayment)} onClick={()=>choose(plan)} className="mt-6 rounded-[9px] bg-atlas-teal px-4 py-3 text-sm font-bold text-white transition hover:bg-atlas-petrol disabled:cursor-not-allowed disabled:opacity-40">{pendingPayment?'Paiement déjà en validation':plan.id===subscription.plan_id?'Régler cette offre':'Choisir et régler'}</button></article>)}</div></section>

      <section className="mt-8 overflow-hidden rounded-[14px] border border-atlas-line bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-atlas-mist text-atlas-teal"><ReceiptText size={21}/></span><div><h2 className="font-display text-xl font-bold">Historique des règlements</h2><p className="text-xs text-slate-500">Suivi distinct des paiements médicaux de vos patients</p></div></div>{subscription.status==='active'&&subscription.auto_renew&&<button onClick={()=>void cancelRenewal()} className="text-xs font-bold text-red-600">Désactiver le renouvellement</button>}</div><div className="divide-y divide-atlas-line">{payments.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><div className="flex flex-wrap items-center gap-2"><b>{money(item.amount,item.currency)}</b><span className={`inline-flex h-7 items-center rounded-full px-3 text-[10px] font-extrabold uppercase ${paymentStyles[item.status]??'bg-slate-100 text-slate-600'}`}>{paymentLabels[item.status]??item.status}</span></div><p className="mt-1 text-sm text-slate-500">{methodLabels[item.payment_method]??item.payment_method}{item.transaction_reference?` · Réf. ${item.transaction_reference}`:''} · déclaré le {formatDate(item.created_at)}</p>{item.failure_reason&&<p className="mt-2 text-sm font-semibold text-red-700">{item.failure_reason}</p>}</div>{item.status==='paid'&&<div className="text-sm text-slate-500"><p className="font-bold text-emerald-700">Période activée</p><p>{formatDate(item.period_start)} → {formatDate(item.period_end)}</p></div>}</div>)}{!payments.length&&<div className="p-10 text-center"><FileCheck2 className="mx-auto text-slate-300"/><p className="mt-3 text-sm font-bold text-slate-600">Aucun règlement déclaré</p><p className="mt-1 text-xs text-slate-400">Votre premier paiement apparaîtra ici.</p></div>}</div></section>

      <div className="mt-6 flex items-start gap-3 rounded-[12px] border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800"><ShieldCheck size={21} className="mt-0.5 shrink-0"/><div><p className="font-bold">Transition sans perte de données</p><p className="mt-1 leading-6">En fin d’essai ou d’abonnement, vos données restent conservées. L’espace passe en lecture seule jusqu’à la validation du règlement, puis toutes les fonctions sont réactivées automatiquement.</p></div></div>
    </>}
    {selectedPlan&&<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"><form onSubmit={pay} className="w-full max-w-xl overflow-hidden rounded-[18px] bg-white shadow-2xl"><header className="flex items-start justify-between border-b p-6"><div><p className="text-xs font-bold uppercase tracking-wider text-atlas-teal">Encaissement de l’abonnement</p><h2 className="mt-1 font-display text-2xl font-bold">{selectedPlan.name}</h2><p className="mt-2 text-sm text-slate-500">{money(selectedPlan.price,selectedPlan.currency)} pour {selectedPlan.duration_months} mois</p></div><button type="button" onClick={()=>setSelectedPlan(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X/></button></header><div className="p-6"><p className="text-sm font-bold">Mode de règlement</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{[["bank_transfer","Virement",Landmark],["cheque","Chèque",FileCheck2],["cash","Espèces",Banknote]].map(([value,label,Icon])=><button type="button" key={String(value)} onClick={()=>setForm({...form,payment_method:String(value)})} className={`rounded-[10px] border p-4 text-left transition ${form.payment_method===value?'border-atlas-teal bg-atlas-mist ring-2 ring-atlas-teal/10':'border-atlas-line hover:bg-slate-50'}`}><Icon size={20} className="text-atlas-teal"/><b className="mt-3 block text-sm">{String(label)}</b></button>)}</div>{['bank_transfer','cheque'].includes(form.payment_method)&&<label className="mt-5 block text-sm font-bold">{form.payment_method==='cheque'?'Numéro du chèque':'Référence du virement'} *<input required value={form.transaction_reference} onChange={e=>setForm({...form,transaction_reference:e.target.value})} className="mt-2 w-full rounded-[9px] border border-atlas-line px-4 py-3 outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10" placeholder={form.payment_method==='cheque'?'Ex. CHQ-001245':'Ex. VIR-2026-001245'}/></label>}<div className="mt-5 rounded-[10px] border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800"><b>Comment fonctionne la validation ?</b><p>Après l’encaissement, le Super Admin vérifie la référence puis active automatiquement la période payée. Votre essai reste utilisable jusqu’à sa date de fin.</p></div><button disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-atlas-teal px-5 py-3.5 font-bold text-white disabled:opacity-50">{busy?<LoaderCircle className="animate-spin" size={18}/>:<CheckCircle2 size={18}/>}Envoyer pour validation</button></div></form></div>}
  </div></MedecinLayout>
}

function Info({icon:Icon,label,value,positive=false}:{icon:LucideIcon;label:string;value:string;positive?:boolean}){return <div className="rounded-[10px] border border-atlas-line p-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-atlas-mist text-atlas-teal"><Icon size={18}/></span><p className="mt-3 text-xs font-bold text-slate-500">{label}</p><p className={`mt-1 font-bold ${positive?'text-emerald-700':'text-atlas-ink'}`}>{positive&&<BadgeCheck size={16} className="mr-1 inline"/>}{value}</p></div>}
