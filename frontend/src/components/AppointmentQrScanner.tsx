import { useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle2, Clock3, Keyboard, QrCode, RotateCcw, ShieldCheck, X } from 'lucide-react'

import { apiCreate } from '../lib/api'
import { getSession } from '../lib/auth'

export type ScannedAppointment = {
  id:string
  patient_id:string
  doctor_id:string
  patient_name:string
  date:string
  start_time:string
  end_time:string
  reason:string|null
  notes:string|null
  status:string
  origin:'cabinet'|'online'|'patient_portal'
  actual_start_time?:string|null
  actual_end_time?:string|null
  duration_seconds?:number|null
  qr_scanned_at?:string|null
}

type ScanResult={
  appointment:ScannedAppointment
  scheduled_label:string
  scanned_at:string|null
  already_confirmed:boolean
}

type BarcodeDetectorLike={
  detect:(source:HTMLVideoElement)=>Promise<Array<{rawValue:string}>>
}

export function AppointmentQrScanner({onConfirmed}:{onConfirmed:(appointment:ScannedAppointment)=>void}){
  const token=getSession()?.accessToken??''
  const[open,setOpen]=useState(false)
  const[manual,setManual]=useState('')
  const[result,setResult]=useState<ScanResult|null>(null)
  const[error,setError]=useState('')
  const[busy,setBusy]=useState(false)
  const[cameraActive,setCameraActive]=useState(false)
  const videoRef=useRef<HTMLVideoElement|null>(null)
  const streamRef=useRef<MediaStream|null>(null)
  const detectorRef=useRef<BarcodeDetectorLike|null>(null)
  const readingRef=useRef(false)

  function stopCamera(){
    streamRef.current?.getTracks().forEach(track=>track.stop())
    streamRef.current=null
    if(videoRef.current)videoRef.current.srcObject=null
    setCameraActive(false)
  }

  function close(){
    stopCamera();setOpen(false);setResult(null);setError('');setManual('')
  }

  useEffect(()=>()=>stopCamera(),[])

  async function resolve(code:string){
    if(!code.trim()||readingRef.current)return
    readingRef.current=true;setBusy(true);setError('')
    try{
      const value=await apiCreate<ScanResult>('/appointments/qr/resolve',token,{code:code.trim()})
      setResult(value);setManual(code.trim());stopCamera()
    }catch(reason){setError(reason instanceof Error?reason.message:'QR non reconnu.')}
    finally{readingRef.current=false;setBusy(false)}
  }

  async function startCamera(){
    setError('');setResult(null)
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('La caméra n’est pas disponible sur cet appareil.')
      const Detector=(window as typeof window&{BarcodeDetector?:new(options:{formats:string[]})=>BarcodeDetectorLike}).BarcodeDetector
      if(!Detector)throw new Error('Le scan automatique n’est pas pris en charge par ce navigateur. Utilisez Chrome/Edge ou saisissez le code.')
      detectorRef.current=new Detector({formats:['qr_code']})
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false})
      streamRef.current=stream
      if(!videoRef.current){stream.getTracks().forEach(track=>track.stop());return}
      videoRef.current.srcObject=stream
      await videoRef.current.play()
      setCameraActive(true)
      const scan=async()=>{
        if(!streamRef.current||!videoRef.current||readingRef.current)return
        try{
          const codes=await detectorRef.current?.detect(videoRef.current)
          if(codes?.[0]?.rawValue)await resolve(codes[0].rawValue)
        }catch{/* La lecture suivante réessaiera automatiquement. */}
        if(streamRef.current)window.setTimeout(()=>void scan(),350)
      }
      void scan()
    }catch(reason){stopCamera();setError(reason instanceof Error?reason.message:'Impossible d’ouvrir la caméra.')}
  }

  async function confirm(){
    if(!manual||busy)return
    setBusy(true);setError('')
    try{
      const value=await apiCreate<ScanResult>('/appointments/qr/confirm',token,{code:manual})
      setResult(value);onConfirmed(value.appointment)
    }catch(reason){setError(reason instanceof Error?reason.message:'Confirmation impossible.')}
    finally{setBusy(false)}
  }

  return <>
    <button type="button" onClick={()=>setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-[9px] border border-atlas-teal/25 bg-atlas-mist px-4 py-2.5 text-sm font-bold text-atlas-teal shadow-sm transition hover:border-atlas-teal hover:bg-emerald-50"><QrCode size={18}/>Scanner un QR</button>
    {open&&<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)close()}}>
      <section role="dialog" aria-modal="true" aria-labelledby="qr-scanner-title" className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-[18px] bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-atlas-line px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-atlas-teal">Contrôle de présence</p><h2 id="qr-scanner-title" className="mt-1 font-display text-2xl font-bold">Scanner le QR du rendez-vous</h2></div><button type="button" onClick={close} disabled={busy} aria-label="Fermer" className="rounded-full bg-slate-100 p-2"><X size={20}/></button></header>
        <div className="p-5">
          {!result&&<><div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-950">
            <video ref={videoRef} playsInline muted className={`h-full w-full object-cover ${cameraActive?'opacity-100':'opacity-0'}`}/>
            {!cameraActive&&<div className="absolute inset-0 grid place-items-center p-8 text-center text-white"><div><Camera size={44} className="mx-auto text-white/50"/><p className="mt-3 font-bold">Caméra prête à être activée</p><p className="mt-1 text-xs text-white/60">Cadrez entièrement le QR présenté par le patient.</p><button type="button" onClick={()=>void startCamera()} className="mt-5 rounded-lg bg-atlas-teal px-5 py-3 text-sm font-bold text-white">Activer la caméra</button></div></div>}
            {cameraActive&&<div className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-white shadow-[0_0_0_999px_rgba(2,31,43,.35)]"><span className="absolute -left-0.5 -top-0.5 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-emerald-400"/><span className="absolute -right-0.5 -top-0.5 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-emerald-400"/><span className="absolute -bottom-0.5 -left-0.5 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-emerald-400"/><span className="absolute -bottom-0.5 -right-0.5 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-emerald-400"/></div>}
          </div>
          <div className="my-4 flex items-center gap-3 text-xs font-bold uppercase text-slate-400"><span className="h-px flex-1 bg-slate-200"/><Keyboard size={15}/>Saisie de secours<span className="h-px flex-1 bg-slate-200"/></div>
          <form onSubmit={event=>{event.preventDefault();void resolve(manual)}} className="flex gap-2"><input value={manual} onChange={event=>setManual(event.target.value)} placeholder="FADAA-RDV:…" className="min-w-0 flex-1 rounded-lg border border-atlas-line px-3 py-2.5 text-sm outline-none focus:border-atlas-teal"/><button disabled={busy||manual.trim().length<16} className="rounded-lg border border-atlas-teal px-4 py-2.5 text-sm font-bold text-atlas-teal disabled:opacity-40">Vérifier</button></form></>}
          {result&&<div className="space-y-4">
            <div className={`rounded-xl border p-5 ${result.scanned_at?'border-emerald-200 bg-emerald-50':'border-atlas-line bg-slate-50'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-atlas-teal">Patient identifié</p><h3 className="mt-1 font-display text-2xl font-bold">{result.appointment.patient_name}</h3><p className="mt-1 text-sm text-slate-500">{result.appointment.reason??'Consultation'}</p></div>{result.scanned_at?<CheckCircle2 className="text-emerald-600" size={30}/>:<ShieldCheck className="text-atlas-teal" size={30}/>}</div><div className="mt-4 flex items-center gap-2 rounded-lg bg-white p-3 text-sm font-bold text-atlas-petrol"><Clock3 size={18} className="text-atlas-teal"/>{result.scheduled_label}</div></div>
            {result.scanned_at?<div className="rounded-xl bg-emerald-50 p-4 text-center"><b className="text-emerald-800">Présence confirmée</b><p className="mt-1 text-sm text-emerald-700">Scan horodaté le {new Date(result.scanned_at).toLocaleString('fr-FR')}.</p>{result.already_confirmed&&<p className="mt-1 text-xs text-emerald-600">Ce QR avait déjà été validé : aucune visite en double n’a été créée.</p>}</div>:<button type="button" disabled={busy} onClick={()=>void confirm()} className="w-full rounded-xl bg-atlas-teal px-5 py-3.5 font-bold text-white shadow-sm disabled:opacity-50">{busy?'Confirmation…':'Confirmer la présence et l’heure'}</button>}
            <button type="button" onClick={()=>{setResult(null);setManual('');setError('');void startCamera()}} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-atlas-line px-4 py-3 text-sm font-bold text-slate-600"><RotateCcw size={17}/>Scanner un autre rendez-vous</button>
          </div>}
          {error&&<p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
        </div>
      </section>
    </div>}
  </>
}
