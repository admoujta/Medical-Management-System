import { useCallback, useEffect, useMemo, useState } from 'react'
import { Banknote, CheckCircle2, Clock3, FileCheck2, Landmark, LoaderCircle, ReceiptText, Search, XCircle } from 'lucide-react'

import { apiList, apiPatch } from '../../lib/api'
import { confirmAction, showToast } from '../../lib/uiFeedback'
import { StatusBadge } from './AdminLayout'

type Subscription={id:string;cabinet_name:string;doctor_name:string|null;plan_name:string}
type Payment={id:string;subscription_id:string;plan_id:string;amount:number;currency:string;payment_method:string;transaction_reference:string|null;status:string;paid_at:string|null;failure_reason:string|null;period_start:string|null;period_end:string|null;created_at:string}

const methodLabels:Record<string,string>={bank_transfer:'Virement bancaire',cheque:'Chèque',cash:'Espèces',card:'Carte bancaire',other:'Autre'}
const money=(amount:number,currency:string)=>new Intl.NumberFormat('fr-MA',{style:'currency',currency,maximumFractionDigits:2}).format(amount)
const date=(value:string|null)=>value?new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium'}).format(new Date(value)):'—'

export function AdminSubscriptionPaymentsPanel({token,subscriptions,onSubscriptionsChanged}:{token:string;subscriptions:Subscription[];onSubscriptionsChanged:()=>Promise<void>}){
  const[rows,setRows]=useState<Payment[]>([])
  const[status,setStatus]=useState('')
  const[query,setQuery]=useState('')
  const[busy,setBusy]=useState('')
  const[rejecting,setRejecting]=useState<Payment|null>(null)
  const[reason,setReason]=useState('')
  const bySubscription=useMemo(()=>new Map(subscriptions.map(item=>[item.id,item])),[subscriptions])
  const load=useCallback(()=>apiList<Payment>('/super-admin/subscription-payments',token).then(setRows),[token])
  useEffect(()=>{void load()},[load])
  const visible=useMemo(()=>rows.filter(item=>{
    const subscription=bySubscription.get(item.subscription_id)
    const text=`${subscription?.cabinet_name??''} ${subscription?.doctor_name??''} ${subscription?.plan_name??''} ${item.transaction_reference??''}`.toLowerCase()
    return(!status||item.status===status)&&(!query.trim()||text.includes(query.trim().toLowerCase()))
  }),[rows,status,query,bySubscription])

  async function validate(item:Payment){
    const subscription=bySubscription.get(item.subscription_id)
    const accepted=await confirmAction({title:'Valider cet encaissement ?',message:`Le paiement de ${money(item.amount,item.currency)} de ${subscription?.cabinet_name??'ce cabinet'} sera validé et la période d’abonnement sera activée immédiatement.`,confirmLabel:'Valider et activer',tone:'primary'})
    if(!accepted)return
    setBusy(item.id)
    try{await apiPatch(`/super-admin/subscription-payments/${item.id}/validate`,token);showToast('Paiement validé et abonnement activé.','success');await Promise.all([load(),onSubscriptionsChanged()])}
    catch(reason){showToast(reason instanceof Error?reason.message:'Validation impossible.','error')}
    finally{setBusy('')}
  }
  async function reject(){
    if(!rejecting||!reason.trim())return
    setBusy(rejecting.id)
    try{await apiPatch(`/super-admin/subscription-payments/${rejecting.id}/reject`,token,{reason:reason.trim()});setRejecting(null);setReason('');showToast('Paiement refusé. Le cabinet pourra effectuer une nouvelle déclaration.','success');await Promise.all([load(),onSubscriptionsChanged()])}
    catch(problem){showToast(problem instanceof Error?problem.message:'Refus impossible.','error')}
    finally{setBusy('')}
  }

  const pending=rows.filter(item=>['pending','processing'].includes(item.status)).length
  const paid=rows.filter(item=>item.status==='paid').reduce((sum,item)=>sum+Number(item.amount),0)
  return <section className="mt-8 overflow-hidden rounded-2xl border bg-white shadow-sm"><header className="flex flex-wrap items-center justify-between gap-4 border-b p-5"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-teal-50 text-teal-700"><ReceiptText/></span><div><h2 className="text-xl font-black">Encaissements d’abonnement</h2><p className="text-sm text-slate-500">Validez les règlements avant d’activer les comptes payants.</p></div></div><div className="flex gap-3"><Metric icon={Clock3} label="À valider" value={String(pending)} amber/><Metric icon={Banknote} label="Encaissé" value={`${paid.toLocaleString('fr-MA')} MAD`}/></div></header><div className="grid gap-3 border-b bg-slate-50/70 p-4 md:grid-cols-[1fr_220px]"><label className="relative"><Search size={17} className="absolute left-4 top-3.5 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cabinet, médecin, offre ou référence…" className="w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-teal-500"/></label><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-xl border bg-white px-4 text-sm font-bold text-slate-600"><option value="">Tous les règlements</option><option value="pending">À valider</option><option value="paid">Payés</option><option value="failed">Refusés</option></select></div><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Cabinet','Offre','Montant','Mode / référence','Déclaration','Statut','Période activée','Actions'].map(label=><th key={label} className="px-5 py-3">{label}</th>)}</tr></thead><tbody>{visible.map(item=>{const subscription=bySubscription.get(item.subscription_id);return <tr key={item.id} className="border-t hover:bg-slate-50/60"><td className="px-5 py-4"><b>{subscription?.cabinet_name??'Cabinet'}</b><p className="mt-1 text-xs text-slate-500">{subscription?.doctor_name??'—'}</p></td><td className="px-5 py-4 font-semibold">{subscription?.plan_name??'—'}</td><td className="px-5 py-4 font-black">{money(item.amount,item.currency)}</td><td className="px-5 py-4"><span className="inline-flex items-center gap-2 font-semibold">{item.payment_method==='bank_transfer'?<Landmark size={16}/>:item.payment_method==='cheque'?<FileCheck2 size={16}/>:<Banknote size={16}/>} {methodLabels[item.payment_method]??item.payment_method}</span><p className="mt-1 text-xs text-slate-500">{item.transaction_reference?`Réf. ${item.transaction_reference}`:'Sans référence'}</p></td><td className="px-5 py-4">{date(item.created_at)}</td><td className="px-5 py-4"><StatusBadge status={item.status}/>{item.failure_reason&&<p className="mt-2 max-w-56 text-xs font-semibold text-red-600">{item.failure_reason}</p>}</td><td className="px-5 py-4 text-xs font-semibold text-slate-500">{item.period_start?`${date(item.period_start)} → ${date(item.period_end)}`:'—'}</td><td className="px-5 py-4">{item.status==='pending'?<div className="flex gap-2"><button disabled={busy===item.id} onClick={()=>void validate(item)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 disabled:opacity-40">{busy===item.id?<LoaderCircle className="animate-spin" size={15}/>:<CheckCircle2 size={15}/>}Valider</button><button disabled={busy===item.id} onClick={()=>{setRejecting(item);setReason('')}} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700"><XCircle size={15}/>Refuser</button></div>:<span className="text-xs text-slate-400">Traité</span>}</td></tr>})}</tbody></table>{!visible.length&&<p className="p-12 text-center text-sm text-slate-500">Aucun encaissement correspondant.</p>}</div>{rejecting&&<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"><section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><p className="text-xs font-black uppercase tracking-wider text-red-600">Refus du règlement</p><h3 className="mt-1 text-2xl font-black">Indiquez le motif</h3><p className="mt-2 text-sm leading-6 text-slate-500">Ce message sera visible par le cabinet afin qu’il puisse corriger puis refaire une déclaration.</p><textarea autoFocus value={reason} onChange={e=>setReason(e.target.value)} rows={4} className="mt-5 w-full rounded-xl border p-4 outline-none focus:border-red-400" placeholder="Ex. Référence bancaire introuvable…"/><div className="mt-4 flex justify-end gap-2"><button onClick={()=>setRejecting(null)} className="rounded-xl border px-4 py-2.5 text-sm font-bold">Annuler</button><button disabled={!reason.trim()||busy===rejecting.id} onClick={()=>void reject()} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">Confirmer le refus</button></div></section></div>}</section>
}

function Metric({icon:Icon,label,value,amber=false}:{icon:typeof Clock3;label:string;value:string;amber?:boolean}){return <div className={`min-w-32 rounded-xl px-4 py-3 ${amber?'bg-amber-50 text-amber-800':'bg-emerald-50 text-emerald-800'}`}><p className="flex items-center gap-1.5 text-[10px] font-black uppercase"><Icon size={13}/>{label}</p><p className="mt-1 font-black">{value}</p></div>}
