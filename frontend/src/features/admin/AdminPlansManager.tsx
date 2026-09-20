import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react'
import { Check, Eye, EyeOff, Pencil, Plus, Save, Sparkles, X } from 'lucide-react'

import { apiCreate, apiList, apiPatch } from '../../lib/api'
import { getSession } from '../../lib/auth'
import { subscriptionModules } from '../../lib/subscriptionModules'
import { confirmAction, showToast } from '../../lib/uiFeedback'
import { AdminLayout, StatusBadge } from './AdminLayout'

type Plan = {
  id:string; name:string; slug:string|null; description:string|null; price:number; currency:string
  billing_interval:string; duration_months:number; trial_days:number; features:string[]; enabled_modules:string[]
  max_doctors:number|null; max_secretaries:number|null; max_patients:number|null
  is_featured:boolean; is_active:boolean; display_order:number
}
type Form = {
  name:string; slug:string; description:string; price:string; currency:string; billing_interval:string
  duration_months:string; trial_days:string; features:string; enabled_modules:string[]
  max_doctors:string; max_secretaries:string; max_patients:string
  is_featured:boolean; is_active:boolean; display_order:string
}
const defaultModules=subscriptionModules.map(([code])=>code)
const empty:Form={name:'',slug:'',description:'',price:'',currency:'MAD',billing_interval:'monthly',duration_months:'1',trial_days:'30',features:'Patients, Agenda, Facturation',enabled_modules:defaultModules,max_doctors:'',max_secretaries:'',max_patients:'',is_featured:false,is_active:true,display_order:'0'}
const field='mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100'

export function AdminPlansManager({onNavigate}:{onNavigate:(path:string)=>void}) {
  const token=getSession()?.accessToken??''
  const [rows,setRows]=useState<Plan[]>([])
  const [editing,setEditing]=useState<Plan|null>(null)
  const [open,setOpen]=useState(false)
  const [busy,setBusy]=useState(false)
  const [form,setForm]=useState<Form>({...empty,enabled_modules:[...defaultModules]})
  const load=useCallback(()=>apiList<Plan>('/super-admin/subscription-plans',token).then(setRows),[token])
  useEffect(()=>{void load()},[load])

  function start(plan?:Plan) {
    setEditing(plan??null)
    setForm(plan?{
      name:plan.name,slug:plan.slug??'',description:plan.description??'',price:String(plan.price),currency:plan.currency,
      billing_interval:plan.billing_interval,duration_months:String(plan.duration_months),trial_days:String(plan.trial_days),
      features:plan.features.join(', '),enabled_modules:plan.enabled_modules??[],max_doctors:plan.max_doctors?String(plan.max_doctors):'',
      max_secretaries:plan.max_secretaries===null?'':String(plan.max_secretaries),max_patients:plan.max_patients?String(plan.max_patients):'',
      is_featured:plan.is_featured,is_active:plan.is_active,display_order:String(plan.display_order)
    }:{...empty,enabled_modules:[...defaultModules]})
    setOpen(true)
  }

  async function save(event:FormEvent) {
    event.preventDefault(); setBusy(true)
    const payload={
      name:form.name.trim(),slug:form.slug.trim()||null,description:form.description.trim()||null,
      price:Number(form.price),currency:form.currency.toUpperCase(),billing_interval:form.billing_interval,
      duration_months:Number(form.duration_months),trial_days:Number(form.trial_days),
      features:form.features.split(',').map(value=>value.trim()).filter(Boolean),enabled_modules:form.enabled_modules,
      max_doctors:form.max_doctors?Number(form.max_doctors):null,max_secretaries:form.max_secretaries?Number(form.max_secretaries):null,
      max_patients:form.max_patients?Number(form.max_patients):null,is_featured:form.is_featured,
      is_active:form.is_active,display_order:Number(form.display_order)
    }
    try {
      editing?await apiPatch(`/super-admin/subscription-plans/${editing.id}`,token,payload):await apiCreate('/super-admin/subscription-plans',token,payload)
      setOpen(false); showToast(editing?'Offre et accès aux modules mis à jour.':'Nouvelle offre publiée.','success'); await load()
    } catch(reason) { showToast(reason instanceof Error?reason.message:'Enregistrement impossible.','error') }
    finally { setBusy(false) }
  }

  async function toggle(plan:Plan) {
    const accepted=await confirmAction({title:plan.is_active?'Masquer cette offre ?':'Publier cette offre ?',message:plan.is_active?'Elle disparaîtra de la vitrine. Les abonnements existants restent conservés.':'Elle sera visible et sélectionnable par les cabinets.',confirmLabel:plan.is_active?'Masquer':'Publier',tone:plan.is_active?'warning':'primary'})
    if(!accepted)return
    try { await apiPatch(`/super-admin/subscription-plans/${plan.id}`,token,{is_active:!plan.is_active}); showToast(plan.is_active?'Offre masquée.':'Offre publiée.','success'); await load() }
    catch(reason) { showToast(reason instanceof Error?reason.message:'Modification impossible.','error') }
  }

  function toggleModule(code:string) {
    setForm(current=>({...current,enabled_modules:current.enabled_modules.includes(code)?current.enabled_modules.filter(item=>item!==code):[...current.enabled_modules,code]}))
  }

  return <AdminLayout onNavigate={onNavigate}>
    <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-teal-700">Commercialisation</p><h1 className="mt-2 text-3xl font-black">Offres et modules</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Le Super Admin contrôle le contenu commercial et les modules réellement accessibles dans chaque abonnement.</p></div>
        <button onClick={()=>start()} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-bold text-white shadow-lg shadow-teal-700/20"><Plus size={18}/>Créer une offre</button>
      </header>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(plan=><article key={plan.id} className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${plan.is_featured?'border-teal-300 ring-2 ring-teal-100':''} ${!plan.is_active?'opacity-65':''}`}>
          {plan.is_featured&&<span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-teal-700 px-3 py-1 text-[10px] font-black uppercase text-white"><Sparkles size={11}/>Recommandée</span>}
          <div className="flex items-start justify-between gap-3"><h2 className="text-xl font-black">{plan.name}</h2><StatusBadge status={plan.is_active?'active':'cancelled'}/></div>
          <p className="mt-4 min-h-12 text-sm leading-6 text-slate-500">{plan.description||'Aucune description publique.'}</p>
          <p className="mt-5"><b className="text-3xl font-black text-teal-800">{Number(plan.price).toLocaleString('fr-MA')} {plan.currency}</b><span className="text-sm font-bold text-slate-400"> / {plan.billing_interval==='yearly'?'an':'mois'}</span></p>
          <p className="mt-1 text-xs font-bold text-blue-700">{plan.trial_days} jours d’essai · {plan.enabled_modules?.length??0} modules</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-600">{plan.features.slice(0,6).map(feature=><li key={feature} className="flex gap-2"><Check size={16} className="shrink-0 text-emerald-600"/>{feature}</li>)}</ul>
          <div className="mt-5 flex items-center gap-2 border-t pt-4"><button onClick={()=>start(plan)} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"><Pencil size={15}/>Modifier</button><button onClick={()=>void toggle(plan)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${plan.is_active?'bg-amber-50 text-amber-800':'bg-emerald-50 text-emerald-700'}`}>{plan.is_active?<EyeOff size={15}/>:<Eye size={15}/>} {plan.is_active?'Masquer':'Publier'}</button></div>
        </article>)}
      </div>
    </div>
    {open&&<div className="crud-modal-backdrop fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <form onSubmit={save} className="crud-modal-panel max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between border-b bg-white/95 px-6 py-5 backdrop-blur"><div><p className="text-xs font-black uppercase tracking-wider text-teal-700">Configuration commerciale</p><h2 className="mt-1 text-2xl font-black">{editing?'Modifier l’offre':'Nouvelle offre'}</h2></div><button type="button" onClick={()=>setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X/></button></header>
        <div className="grid gap-5 p-6 md:grid-cols-2">
          <Label text="Nom de l’offre *"><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className={field}/></Label>
          <Label text="Identifiant URL"><input value={form.slug} onChange={e=>setForm({...form,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-')})} className={field} placeholder="professionnel"/></Label>
          <Label text="Description publique *" wide><textarea required rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className={field}/></Label>
          <Label text="Prix *"><div className="grid grid-cols-[1fr_100px] gap-2"><input required type="number" min="0" step=".01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} className={field}/><input required maxLength={3} value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})} className={field}/></div></Label>
          <Label text="Facturation"><select value={form.billing_interval} onChange={e=>setForm({...form,billing_interval:e.target.value})} className={field}><option value="monthly">Mensuelle</option><option value="quarterly">Trimestrielle</option><option value="yearly">Annuelle</option></select></Label>
          <Label text="Durée facturée (mois)"><input required type="number" min="1" value={form.duration_months} onChange={e=>setForm({...form,duration_months:e.target.value})} className={field}/></Label>
          <Label text="Essai gratuit (jours)"><input required type="number" min="0" value={form.trial_days} onChange={e=>setForm({...form,trial_days:e.target.value})} className={field}/></Label>
          <Label text="Fonctionnalités commerciales (séparées par virgules)" wide><textarea required rows={3} value={form.features} onChange={e=>setForm({...form,features:e.target.value})} className={field}/></Label>
          <Label text="Maximum médecins"><input type="number" min="1" value={form.max_doctors} onChange={e=>setForm({...form,max_doctors:e.target.value})} className={field} placeholder="Illimité"/></Label>
          <Label text="Maximum secrétaires"><input type="number" min="0" value={form.max_secretaries} onChange={e=>setForm({...form,max_secretaries:e.target.value})} className={field} placeholder="Illimité"/></Label>
          <Label text="Maximum patients"><input type="number" min="1" value={form.max_patients} onChange={e=>setForm({...form,max_patients:e.target.value})} className={field} placeholder="Illimité"/></Label>
          <Label text="Ordre d’affichage"><input type="number" min="0" value={form.display_order} onChange={e=>setForm({...form,display_order:e.target.value})} className={field}/></Label>
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-slate-800">Modules inclus</h3><p className="mt-1 text-xs text-slate-500">Un module désactivé disparaît du menu et son accès est bloqué.</p></div><button type="button" onClick={()=>setForm({...form,enabled_modules:form.enabled_modules.length===defaultModules.length?[]:[...defaultModules]})} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold text-teal-700">{form.enabled_modules.length===defaultModules.length?'Tout désactiver':'Tout activer'}</button></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{subscriptionModules.map(([code,label])=>{const active=form.enabled_modules.includes(code);return <label key={code} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-bold transition ${active?'border-teal-300 bg-teal-50 text-teal-800 shadow-sm':'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}><input type="checkbox" checked={active} onChange={()=>toggleModule(code)}/>{label}</label>})}</div>
          </section>
          <div className="grid gap-3 sm:grid-cols-2 md:col-span-2">{([['Recommandée',form.is_featured,'is_featured'],['Visible sur la vitrine',form.is_active,'is_active']] as const).map(([label,value,key])=><label key={key} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-bold ${value?'border-teal-300 bg-teal-50 text-teal-800':'border-slate-200 text-slate-500'}`}><input type="checkbox" checked={value} onChange={e=>setForm({...form,[key]:e.target.checked})}/>{label}</label>)}</div>
        </div>
        <footer className="sticky bottom-0 flex justify-end gap-3 border-t bg-white/95 p-5 backdrop-blur"><button type="button" onClick={()=>setOpen(false)} className="rounded-xl border px-5 py-3 text-sm font-bold">Annuler</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><Save size={17}/>{busy?'Enregistrement…':'Enregistrer et appliquer'}</button></footer>
      </form>
    </div>}
  </AdminLayout>
}

function Label({text,wide=false,children}:{text:string;wide?:boolean;children:ReactNode}) {
  return <label className={`text-sm font-bold text-slate-700 ${wide?'md:col-span-2':''}`}>{text}{children}</label>
}
