import { type FormEvent, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Pencil, Save, Stethoscope } from 'lucide-react'

import { apiCreate, apiGet, apiUpdate } from '../lib/api'

type Preparation = {
  appointment_id: string
  patient_id: string
  chief_complaint: string | null
  reported_allergies: string[]
  reported_treatments: string[]
  blood_pressure: string | null
  temperature: string | null
  weight: string | null
  height: string | null
  reception_notes: string | null
  doctor_diagnosis: string | null
  next_step: string | null
  status: 'draft' | 'ready' | 'validated'
  updated_at: string | null
}

const emptyForm = { chief_complaint: '', reported_allergies: '', reported_treatments: '', blood_pressure: '', temperature: '', weight: '', height: '', reception_notes: '', doctor_diagnosis: '', next_step: '', update_medical_summary: true }
const lines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean)

export function AppointmentPreparationCard({ appointmentId, token, mode, readOnly = false }: { appointmentId: string; token: string; mode: 'doctor' | 'staff'; readOnly?: boolean }) {
  const [preparation, setPreparation] = useState<Preparation | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) return
    setMessage('')
    apiGet<Preparation>(`/appointments/${appointmentId}/preparation`, token).then((result) => {
      setPreparation(result)
      setForm({ chief_complaint: result.chief_complaint ?? '', reported_allergies: result.reported_allergies.join('\n'), reported_treatments: result.reported_treatments.join('\n'), blood_pressure: result.blood_pressure ?? '', temperature: result.temperature ?? '', weight: result.weight ?? '', height: result.height ?? '', reception_notes: result.reception_notes ?? '', doctor_diagnosis: result.doctor_diagnosis ?? '', next_step: result.next_step ?? '', update_medical_summary: true })
      setEditing(mode === 'staff' && result.status !== 'validated' && !result.chief_complaint)
    }).catch((reason) => setMessage(reason instanceof Error ? reason.message : 'Préparation indisponible.'))
  }, [appointmentId, mode, token])

  async function saveReception(status: 'draft' | 'ready') {
    if (!token || readOnly) return
    setBusy(true); setMessage('')
    try {
      const updated = await apiUpdate<Preparation>(`/appointments/${appointmentId}/preparation`, token, { chief_complaint: form.chief_complaint || null, reported_allergies: lines(form.reported_allergies), reported_treatments: lines(form.reported_treatments), blood_pressure: form.blood_pressure || null, temperature: form.temperature || null, weight: form.weight || null, height: form.height || null, reception_notes: form.reception_notes || null, status })
      setPreparation(updated); setEditing(false); setMessage(status === 'ready' ? 'Préparation terminée. Le médecin peut maintenant la vérifier.' : 'Brouillon enregistré.')
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Enregistrement impossible.') }
    finally { setBusy(false) }
  }

  async function validate(event: FormEvent) {
    event.preventDefault()
    if (!token || readOnly) return
    setBusy(true); setMessage('')
    try {
      const updated = await apiCreate<Preparation>(`/appointments/${appointmentId}/preparation/validate`, token, { chief_complaint: form.chief_complaint || null, reported_allergies: lines(form.reported_allergies), reported_treatments: lines(form.reported_treatments), doctor_diagnosis: form.doctor_diagnosis, next_step: form.next_step || null, update_medical_summary: form.update_medical_summary })
      setPreparation(updated); setEditing(false); setMessage(form.update_medical_summary ? 'Préparation validée et synthèse médicale mise à jour.' : 'Préparation validée.')
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Validation impossible.') }
    finally { setBusy(false) }
  }

  const status = preparation?.status ?? 'draft'
  const statusLabel = status === 'validated' ? 'Validée par le médecin' : status === 'ready' ? 'À vérifier par le médecin' : 'Brouillon accueil'
  const statusStyle = status === 'validated' ? 'bg-emerald-100 text-emerald-800' : status === 'ready' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-600'

  if (editing && mode === 'staff') return <section className="rounded-xl border border-atlas-line bg-white p-4 shadow-sm">
    <Header statusLabel={statusLabel} statusStyle={statusStyle} />
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <Field label="Motif déclaré par le patient" name="chief_complaint" value={form.chief_complaint} onChange={(value) => setForm({ ...form, chief_complaint: value })} textarea wide placeholder="Pourquoi le patient consulte-t-il aujourd’hui ?" />
      <Field label="Allergies déclarées" name="reported_allergies" value={form.reported_allergies} onChange={(value) => setForm({ ...form, reported_allergies: value })} textarea placeholder={'Une allergie par ligne\nEx. Pénicilline'} danger />
      <Field label="Médicaments déclarés" name="reported_treatments" value={form.reported_treatments} onChange={(value) => setForm({ ...form, reported_treatments: value })} textarea placeholder="Un médicament par ligne" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:col-span-2"><Field label="Tension" name="blood_pressure" value={form.blood_pressure} onChange={(value) => setForm({ ...form, blood_pressure: value })} placeholder="12/8" /><Field label="Température" name="temperature" value={form.temperature} onChange={(value) => setForm({ ...form, temperature: value })} placeholder="37,0 °C" /><Field label="Poids" name="weight" value={form.weight} onChange={(value) => setForm({ ...form, weight: value })} placeholder="kg" /><Field label="Taille" name="height" value={form.height} onChange={(value) => setForm({ ...form, height: value })} placeholder="cm" /></div>
      <Field label="Note d’accueil" name="reception_notes" value={form.reception_notes} onChange={(value) => setForm({ ...form, reception_notes: value })} textarea wide placeholder="Informations utiles pour le médecin" />
    </div>
    <p className="mt-3 rounded-lg border border-sky-100 bg-sky-50 p-3 text-sm font-semibold leading-6 text-sky-800">Ces informations sont déclaratives et resteront « à vérifier » jusqu’à validation par le médecin.</p>
    {message && <p className="mt-3 text-sm font-bold text-red-700">{message}</p>}
    <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} onClick={() => void saveReception('draft')} className="rounded-lg border border-atlas-line bg-white px-4 py-2.5 text-sm font-bold text-slate-600"><Save className="mr-2 inline" size={16} />Enregistrer le brouillon</button><button type="button" disabled={busy} onClick={() => void saveReception('ready')} className="rounded-lg bg-atlas-teal px-4 py-2.5 text-sm font-bold text-white"><ClipboardCheck className="mr-2 inline" size={16} />Prêt pour le médecin</button></div>
  </section>

  if (editing && mode === 'doctor') return <form onSubmit={validate} className="rounded-xl border border-atlas-teal/30 bg-atlas-mist/20 p-4">
    <Header statusLabel={statusLabel} statusStyle={statusStyle} />
    <p className="mt-3 rounded-lg border border-sky-100 bg-sky-50 p-3 text-sm font-semibold leading-6 text-sky-800">Vérifiez et corrigez les éléments déclarés avant de les intégrer au dossier médical.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Motif de consultation" name="chief_complaint" value={form.chief_complaint} onChange={(value) => setForm({ ...form, chief_complaint: value })} textarea wide /><Field label="Allergies vérifiées" name="reported_allergies" value={form.reported_allergies} onChange={(value) => setForm({ ...form, reported_allergies: value })} textarea danger /><Field label="Traitements vérifiés" name="reported_treatments" value={form.reported_treatments} onChange={(value) => setForm({ ...form, reported_treatments: value })} textarea /><Field label="Diagnostic / suivi principal *" name="doctor_diagnosis" value={form.doctor_diagnosis} onChange={(value) => setForm({ ...form, doctor_diagnosis: value })} wide required placeholder="Diagnostic confirmé par le médecin" /><Field label="Prochaine étape" name="next_step" value={form.next_step} onChange={(value) => setForm({ ...form, next_step: value })} textarea wide /></div>
    <label className="mt-4 flex items-start gap-3 rounded-lg border border-atlas-teal/20 bg-white p-3 text-sm"><input type="checkbox" checked={form.update_medical_summary} onChange={(event) => setForm({ ...form, update_medical_summary: event.target.checked })} className="mt-0.5 h-4 w-4 accent-atlas-teal" /><span><b>Mettre à jour la synthèse médicale</b><span className="mt-1 block text-xs text-slate-500">Le diagnostic, les allergies vérifiées, les traitements et la prochaine étape seront reportés dans la fiche patient.</span></span></label>
    {message && <p className="mt-3 text-sm font-bold text-red-700">{message}</p>}
    <div className="mt-4 flex justify-end"><button disabled={busy} className="rounded-lg bg-atlas-teal px-5 py-3 text-sm font-bold text-white"><CheckCircle2 className="mr-2 inline" size={17} />{busy ? 'Validation…' : 'Valider les informations'}</button></div>
  </form>

  return <section className={`rounded-xl border p-4 ${status === 'ready' ? 'border-sky-200 bg-sky-50/40' : status === 'validated' ? 'border-emerald-200 bg-emerald-50/20' : 'border-atlas-line bg-slate-50'}`}>
    <Header statusLabel={statusLabel} statusStyle={statusStyle} />
    {preparation && (preparation.chief_complaint || preparation.reported_allergies.length || preparation.reported_treatments.length) ? <div className="mt-4 grid gap-3 sm:grid-cols-2"><Summary label="Motif" value={preparation.chief_complaint} /><Summary label="Allergies déclarées" value={preparation.reported_allergies.join(' · ')} danger /><Summary label="Traitements déclarés" value={preparation.reported_treatments.join(' · ')} /><Summary label="Constantes" value={[preparation.blood_pressure && `TA ${preparation.blood_pressure}`, preparation.temperature && `${preparation.temperature} °C`, preparation.weight && `${preparation.weight} kg`, preparation.height && `${preparation.height} cm`].filter(Boolean).join(' · ')} />{preparation.doctor_diagnosis && <Summary label="Diagnostic validé" value={preparation.doctor_diagnosis} />}</div> : <p className="mt-4 text-sm text-slate-500">Aucune préparation saisie pour cette visite.</p>}
    {message && <p className={`mt-3 text-sm font-bold ${message.includes('validée') || message.includes('enregistré') ? 'text-emerald-700' : 'text-red-700'}`}>{message}</p>}
    {!readOnly && status !== 'validated' && <div className="mt-4 flex justify-end"><button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-lg bg-atlas-teal px-4 py-2.5 text-sm font-bold text-white"><Pencil size={16} />{mode === 'staff' ? 'Préparer la visite' : 'Vérifier et valider'}</button></div>}
  </section>
}

function Header({ statusLabel, statusStyle }: { statusLabel: string; statusStyle: string }) { return <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 font-display text-lg font-bold text-atlas-petrol"><Stethoscope size={19} className="text-atlas-teal" />Préparation de la visite</h3><p className="mt-1 text-sm text-slate-500">Accueil secrétaire → vérification médecin</p></div><span className={`rounded-full px-3 py-1.5 text-sm font-bold ${statusStyle}`}>{statusLabel}</span></div> }
function Field({ label, name, value, onChange, textarea = false, wide = false, danger = false, required = false, placeholder = '' }: { label: string; name: string; value: string; onChange: (value: string) => void; textarea?: boolean; wide?: boolean; danger?: boolean; required?: boolean; placeholder?: string }) { const style = `mt-2 w-full rounded-lg border px-3 py-2.5 text-base outline-none transition focus:ring-4 ${danger ? 'border-red-200 bg-red-50/30 focus:border-red-400 focus:ring-red-100' : 'border-atlas-line bg-white focus:border-atlas-teal focus:ring-atlas-teal/10'}`; return <label className={wide ? 'sm:col-span-2' : ''}><span className={`text-sm font-bold ${danger ? 'text-red-700' : 'text-slate-600'}`}>{danger && <AlertTriangle className="mr-1 inline" size={16} />}{label}</span>{textarea ? <textarea name={name} rows={3} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${style} resize-none`} /> : <input name={name} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={style} />}</label> }
function Summary({ label, value, danger = false }: { label: string; value?: string | null; danger?: boolean }) { return <div className={`rounded-lg border p-3 ${danger ? 'border-red-200 bg-red-50' : 'border-atlas-line bg-white'}`}><p className={`text-sm font-bold ${danger ? 'text-red-600' : 'text-slate-500'}`}>{label}</p><p className="mt-1 text-base font-semibold leading-6 text-slate-700">{value || 'Non renseigné'}</p></div> }
