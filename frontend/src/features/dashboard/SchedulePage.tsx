import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarOff, Clock3, Copy, Save, Trash2 } from 'lucide-react'

import { apiCreate, apiDelete, apiGet, apiList, apiUpdate } from '../../lib/api'
import { getSession, logout } from '../../lib/auth'
import { confirmAction } from '../../lib/uiFeedback'
import { MedecinLayout } from './MedecinLayout'

type Day = { weekday:number; is_working:boolean; start_time:string|null; end_time:string|null; break_start_time:string|null; break_end_time:string|null }
type Config = { default_duration_minutes:number; minimum_booking_delay_minutes:number; maximum_appointments_per_day:number|null }
type Schedule = { days:Day[]; config:Config }
type TimeOff = { id:string; start_date:string; end_date:string; reason:string|null }
type Blocked = { id:string; date:string; start_time:string; end_time:string; reason:string|null }

const dayNames = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']
const inputClass = 'mt-1.5 w-full rounded-[8px] border border-atlas-line bg-white px-3 py-2.5 outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10 disabled:bg-slate-50 disabled:text-slate-400'

function formatDate(value:string) {
  return new Intl.DateTimeFormat('fr-FR', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(`${value}T12:00:00`))
}

export function SchedulePage({ onNavigate }: { onNavigate:(path:string)=>void }) {
  const session = getSession()
  const [schedule,setSchedule] = useState<Schedule|null>(null)
  const [timeOffs,setTimeOffs] = useState<TimeOff[]>([])
  const [blocked,setBlocked] = useState<Blocked[]>([])
  const [message,setMessage] = useState('')
  const [saving,setSaving] = useState(false)
  const [leave,setLeave] = useState({start_date:'',end_date:'',reason:''})
  const [slot,setSlot] = useState({date:'',start_time:'',end_time:'',reason:''})

  const readOnly = session?.tenantStatus === 'expired' || session?.tenantStatus === 'suspended'
  const workingDays = useMemo(() => schedule?.days.filter(day => day.is_working).length ?? 0, [schedule])

  const load = useCallback(async()=>{
    if(!session?.accessToken) return
    try {
      const [loadedSchedule,loadedTimeOffs,loadedBlocked] = await Promise.all([
        apiGet<Schedule>('/doctor/schedule',session.accessToken),
        apiList<TimeOff>('/doctor/time-offs',session.accessToken),
        apiList<Blocked>('/doctor/blocked-slots',session.accessToken)
      ])
      setSchedule(loadedSchedule); setTimeOffs(loadedTimeOffs); setBlocked(loadedBlocked); setMessage('')
    } catch(error) { setMessage(error instanceof Error ? error.message : 'Chargement impossible.') }
  },[session?.accessToken])

  useEffect(()=>{ void load() },[load])

  function updateDay(index:number,patch:Partial<Day>) {
    setSchedule(current => current ? {...current,days:current.days.map((day,i)=>i===index?{...day,...patch}:day)} : current)
  }

  function copyMonday() {
    if (!schedule) return
    const monday = schedule.days.find(day => day.weekday === 0)
    if (!monday) return
    setSchedule({...schedule, days:schedule.days.map(day => day.weekday === 0 || !day.is_working ? day : {
      ...day, start_time:monday.start_time, end_time:monday.end_time,
      break_start_time:monday.break_start_time, break_end_time:monday.break_end_time
    })})
    setMessage('Les horaires du lundi ont été copiés sur les autres jours travaillés.')
  }

  async function save() {
    if(!schedule || !session?.accessToken || readOnly) return
    setSaving(true); setMessage('')
    try {
      setSchedule(await apiUpdate('/doctor/schedule',session.accessToken,schedule))
      setMessage('Emploi du temps enregistré avec succès.')
    } catch(error) { setMessage(error instanceof Error ? error.message : 'Enregistrement impossible.') }
    finally { setSaving(false) }
  }

  async function addLeave(event:FormEvent) {
    event.preventDefault(); if(!session?.accessToken || readOnly) return
    try { await apiCreate('/doctor/time-offs',session.accessToken,leave); setLeave({start_date:'',end_date:'',reason:''}); await load(); setMessage('Absence ajoutée avec succès.') }
    catch(error) { setMessage(error instanceof Error ? error.message : 'Création impossible.') }
  }

  async function addSlot(event:FormEvent) {
    event.preventDefault(); if(!session?.accessToken || readOnly) return
    try { await apiCreate('/doctor/blocked-slots',session.accessToken,slot); setSlot({date:'',start_time:'',end_time:'',reason:''}); await load(); setMessage('Créneau bloqué avec succès.') }
    catch(error) { setMessage(error instanceof Error ? error.message : 'Création impossible.') }
  }

  async function remove(path:string) {
    if(!session?.accessToken || readOnly || !await confirmAction({title:'Supprimer cette indisponibilité ?',message:'Cette période sera retirée définitivement du planning du cabinet.',confirmLabel:'Supprimer',tone:'danger'})) return
    try { await apiDelete(path,session.accessToken); await load() }
    catch(error) { setMessage(error instanceof Error ? error.message : 'Suppression impossible.') }
  }

  return <MedecinLayout cabinetName="Emploi du temps" onNavigate={onNavigate} onLogout={()=>{logout();onNavigate('/login')}}>
    <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-bold uppercase tracking-wide text-atlas-teal">Disponibilités</p><h1 className="mt-1 font-display text-3xl font-bold">Mon emploi du temps</h1><p className="mt-2 text-sm text-slate-600">Choisissez simplement quand vos patients peuvent prendre rendez-vous.</p></div>
        <div className="rounded-[10px] bg-atlas-mist px-4 py-3 text-sm font-bold text-atlas-petrol">{workingDays} jour{workingDays!==1?'s':''} travaillé{workingDays!==1?'s':''} par semaine</div>
      </header>

      {message && <p className={`mt-5 rounded-[8px] border px-4 py-3 text-sm font-bold ${message.includes('succès') || message.includes('copiés') ? 'border-emerald-200 bg-emerald-50 text-emerald-700':'border-amber-200 bg-amber-50 text-amber-800'}`}>{message}</p>}

      {!schedule ? <p className="mt-8 text-sm font-semibold text-slate-500">Chargement de votre emploi du temps…</p> : <>
        <section className="mt-6 rounded-[12px] border border-atlas-line bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-display text-xl font-bold">Horaires de la semaine</h2><p className="mt-1 text-sm text-slate-500">Activez un jour, puis indiquez vos heures de travail.</p></div>
            <button type="button" onClick={copyMonday} disabled={readOnly} className="inline-flex items-center gap-2 rounded-[8px] border border-atlas-line px-3 py-2 text-sm font-bold text-atlas-petrol hover:border-atlas-teal disabled:opacity-40"><Copy size={16}/>Copier les horaires du lundi</button>
          </div>

          <div className="mt-5 space-y-3">
            {schedule.days.map((day,index)=><div key={day.weekday} className={`rounded-[10px] border p-4 transition ${day.is_working?'border-atlas-teal/30 bg-white':'border-atlas-line bg-slate-50/70'}`}>
              <div className="flex items-center justify-between gap-4">
                <strong className="text-base">{dayNames[day.weekday]}</strong>
                <label className="flex cursor-pointer items-center gap-3 text-sm font-bold">
                  <span className={day.is_working?'text-atlas-teal':'text-slate-500'}>{day.is_working?'Ouvert':'Fermé'}</span>
                  <input type="checkbox" checked={day.is_working} disabled={readOnly} onChange={event=>updateDay(index,{is_working:event.target.checked})} className="h-5 w-5 accent-atlas-teal"/>
                </label>
              </div>
              {day.is_working && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {([['start_time','Ouverture'],['end_time','Fermeture'],['break_start_time','Début de pause'],['break_end_time','Fin de pause']] as const).map(([key,label])=><label key={key}><span className="text-xs font-bold text-slate-500">{label}</span><input disabled={readOnly} type="time" value={day[key]??''} onChange={event=>updateDay(index,{[key]:event.target.value})} className={inputClass}/></label>)}
              </div>}
            </div>)}
          </div>

          <div className="mt-6 border-t border-atlas-line pt-5">
            <h3 className="font-bold">Règles de rendez-vous</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label><span className="text-sm font-bold">Durée d’une consultation</span><select disabled={readOnly} value={schedule.config.default_duration_minutes} onChange={event=>setSchedule({...schedule,config:{...schedule.config,default_duration_minutes:Number(event.target.value)}})} className={inputClass}>{[10,15,20,30,45,60].map(value=><option key={value} value={value}>{value} minutes</option>)}</select></label>
              <label><span className="text-sm font-bold">Réserver au moins à l’avance</span><select disabled={readOnly} value={schedule.config.minimum_booking_delay_minutes} onChange={event=>setSchedule({...schedule,config:{...schedule.config,minimum_booking_delay_minutes:Number(event.target.value)}})} className={inputClass}><option value={0}>Sans délai</option><option value={60}>1 heure</option><option value={180}>3 heures</option><option value={720}>12 heures</option><option value={1440}>1 jour</option><option value={2880}>2 jours</option></select></label>
              <label><span className="text-sm font-bold">Maximum de RDV par jour</span><input disabled={readOnly} type="number" min="1" max="200" value={schedule.config.maximum_appointments_per_day??''} placeholder="Sans limite" onChange={event=>setSchedule({...schedule,config:{...schedule.config,maximum_appointments_per_day:event.target.value===''?null:Number(event.target.value)}})} className={inputClass}/></label>
            </div>
          </div>
          <button type="button" onClick={()=>void save()} disabled={readOnly||saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-atlas-teal px-5 py-3.5 font-bold text-white hover:bg-atlas-petrol disabled:opacity-50 md:w-auto"><Save size={18}/>{saving?'Enregistrement…':'Enregistrer mes horaires'}</button>
        </section>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
          <section className="rounded-[12px] border border-atlas-line bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-atlas-mist text-atlas-teal"><CalendarOff size={19}/></span><div><h2 className="font-display text-xl font-bold">Congés et absences</h2><p className="text-xs text-slate-500">Pour une journée entière ou plusieurs jours</p></div></div>
            <form onSubmit={addLeave} className="mt-5 grid gap-3 sm:grid-cols-2">
              <label><span className="text-xs font-bold text-slate-500">Du *</span><input required disabled={readOnly} type="date" value={leave.start_date} onChange={event=>setLeave({...leave,start_date:event.target.value})} className={inputClass}/></label>
              <label><span className="text-xs font-bold text-slate-500">Au *</span><input required disabled={readOnly} type="date" min={leave.start_date} value={leave.end_date} onChange={event=>setLeave({...leave,end_date:event.target.value})} className={inputClass}/></label>
              <label className="sm:col-span-2"><span className="text-xs font-bold text-slate-500">Motif</span><input disabled={readOnly} value={leave.reason} onChange={event=>setLeave({...leave,reason:event.target.value})} placeholder="Ex. Congé annuel" className={inputClass}/></label>
              <button disabled={readOnly} className="rounded-[8px] bg-atlas-petrol px-4 py-3 font-bold text-white disabled:opacity-50 sm:col-span-2">Ajouter l’absence</button>
            </form>
            <div className="mt-4 space-y-2">{timeOffs.length===0?<p className="rounded-[8px] bg-slate-50 p-4 text-center text-sm text-slate-500">Aucune absence prévue.</p>:timeOffs.map(item=><div key={item.id} className="flex items-center justify-between gap-3 rounded-[8px] bg-atlas-cloud p-3 text-sm"><span><b>{formatDate(item.start_date)} → {formatDate(item.end_date)}</b>{item.reason&&<><br/><span className="text-slate-500">{item.reason}</span></>}</span><button type="button" title="Supprimer" onClick={()=>void remove(`/doctor/time-offs/${item.id}`)} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={17}/></button></div>)}</div>
          </section>

          <section className="rounded-[12px] border border-atlas-line bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-atlas-mist text-atlas-teal"><Clock3 size={19}/></span><div><h2 className="font-display text-xl font-bold">Bloquer quelques heures</h2><p className="text-xs text-slate-500">Pour une réunion ou une indisponibilité courte</p></div></div>
            <form onSubmit={addSlot} className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="text-xs font-bold text-slate-500">Date *</span><input required disabled={readOnly} type="date" value={slot.date} onChange={event=>setSlot({...slot,date:event.target.value})} className={inputClass}/></label>
              <label><span className="text-xs font-bold text-slate-500">De *</span><input required disabled={readOnly} type="time" value={slot.start_time} onChange={event=>setSlot({...slot,start_time:event.target.value})} className={inputClass}/></label>
              <label><span className="text-xs font-bold text-slate-500">À *</span><input required disabled={readOnly} type="time" value={slot.end_time} onChange={event=>setSlot({...slot,end_time:event.target.value})} className={inputClass}/></label>
              <label className="sm:col-span-2"><span className="text-xs font-bold text-slate-500">Motif</span><input disabled={readOnly} value={slot.reason} onChange={event=>setSlot({...slot,reason:event.target.value})} placeholder="Ex. Réunion" className={inputClass}/></label>
              <button disabled={readOnly} className="rounded-[8px] bg-atlas-petrol px-4 py-3 font-bold text-white disabled:opacity-50 sm:col-span-2">Bloquer ce créneau</button>
            </form>
            <div className="mt-4 space-y-2">{blocked.length===0?<p className="rounded-[8px] bg-slate-50 p-4 text-center text-sm text-slate-500">Aucun créneau bloqué.</p>:blocked.map(item=><div key={item.id} className="flex items-center justify-between gap-3 rounded-[8px] bg-atlas-cloud p-3 text-sm"><span><b>{formatDate(item.date)} · {item.start_time.slice(0,5)}–{item.end_time.slice(0,5)}</b>{item.reason&&<><br/><span className="text-slate-500">{item.reason}</span></>}</span><button type="button" title="Supprimer" onClick={()=>void remove(`/doctor/blocked-slots/${item.id}`)} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={17}/></button></div>)}</div>
          </section>
        </div>
      </>}
    </div>
  </MedecinLayout>
}
