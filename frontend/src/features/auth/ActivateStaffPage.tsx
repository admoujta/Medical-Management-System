import { FormEvent, useEffect, useState } from 'react'
import { CheckCircle2, LockKeyhole } from 'lucide-react'
import { activateStaff, getStaffActivation, StaffActivationInfo } from '../../lib/api'

export function ActivateStaffPage({onLogin,token:providedToken}:{onLogin:()=>void;token?:string}) {
  const token = providedToken ?? new URLSearchParams(window.location.search).get('token') ?? ''
  const [info,setInfo]=useState<StaffActivationInfo|null>(null)
  const [password,setPassword]=useState('')
  const [confirmation,setConfirmation]=useState('')
  const [message,setMessage]=useState('Vérification du lien…')
  const [done,setDone]=useState(false)
  useEffect(()=>{ if(!token){setMessage('Lien d’activation incomplet.');return} getStaffActivation(token).then(data=>{setInfo(data);setMessage('')}).catch(error=>setMessage(error instanceof Error?error.message:'Lien invalide.')) },[token])
  async function submit(event:FormEvent){event.preventDefault();try{const result=await activateStaff({token,password,password_confirmation:confirmation});setDone(true);setMessage(result.message)}catch(error){setMessage(error instanceof Error?error.message:'Activation impossible.')}}
  return <main className="grid min-h-screen place-items-center bg-atlas-cloud px-4 py-8"><section className="w-full max-w-lg rounded-[18px] border border-atlas-line bg-white p-7 shadow-panel"><img src="/images/fadaa-logo.svg" alt="FADAA Santé" className="mx-auto h-14 w-44"/><h1 className="mt-6 text-center font-display text-3xl font-bold text-atlas-petrol">Activation de votre compte</h1>{info&&!done&&<><p className="mt-3 text-center text-slate-600">Bonjour <b>{info.full_name}</b>. Votre compte pour <b>{info.cabinet_name}</b> est prêt.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block"><span className="text-sm font-bold">Mot de passe</span><div className="mt-2 flex items-center gap-3 rounded-[9px] border px-4 py-3"><LockKeyhole size={18}/><input required minLength={10} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="flex-1 outline-none"/></div></label><label className="block"><span className="text-sm font-bold">Confirmer le mot de passe</span><input required minLength={10} type="password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} className="mt-2 w-full rounded-[9px] border px-4 py-3 outline-none"/></label><p className="text-xs text-slate-500">10 caractères minimum, avec majuscule, minuscule et chiffre.</p><button className="w-full rounded-[9px] bg-atlas-teal px-5 py-3 font-bold text-white">Activer mon compte</button></form></>}{message&&<p className={`mt-5 rounded-[9px] p-4 text-sm font-semibold ${done?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-800'}`}>{done&&<CheckCircle2 className="mr-2 inline" size={18}/>} {message}</p>}{done&&<button onClick={onLogin} className="mt-5 w-full rounded-[9px] bg-atlas-petrol px-5 py-3 font-bold text-white">Se connecter</button>}</section></main>
}
