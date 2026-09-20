import { FormEvent, useState } from 'react'
import { CalendarDays, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { signupPatient } from '../../lib/api'
import { AuthLayout } from './AuthLayout'
import { isValidPhone, normalizePhone, phoneInput, phonePatternHtml, phonePlaceholder } from '../../lib/phone'

type RegisterPatientPageProps = {
  onBackHome: () => void
  onLogin: () => void
}

type FieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  minLength?: number
  maxLength?: number
  max?: string
  autoComplete?: string
  pattern?: string
}

function Field({ label, value, onChange, type = 'text', placeholder, required, minLength, maxLength, max, autoComplete, pattern }: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-atlas-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        max={max}
        autoComplete={autoComplete}
        pattern={pattern}
        className="mt-2 w-full rounded-[8px] border border-atlas-line bg-white px-4 py-3 text-sm outline-none transition focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10"
      />
    </label>
  )
}

export function RegisterPatientPage({ onBackHome, onLogin }: RegisterPatientPageProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState(() => {
    let guest: Record<string,string>={}
    try{guest=JSON.parse(sessionStorage.getItem('fadaa_guest_registration')??'{}')}catch{guest={}}
    return {
    cabinetCode: guest.cabinet_code??'',
    firstName: guest.first_name??'',
    lastName: guest.last_name??'',
    email: guest.email??'',
    phone: guest.phone??'',
    birthDate: guest.birth_date??'',
    gender: guest.gender??'',
    address: '',
    password: '',
    passwordConfirmation: '',
    acceptTerms: false,
    acceptPrivacy: false
  }})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')

    if (form.password !== form.passwordConfirmation) {
      setStatus('error')
      setMessage(t('passwordMismatch'))
      return
    }
    if(!isValidPhone(form.phone)){setStatus('error');setMessage('Saisissez un numéro de téléphone valide, par exemple 06 12 34 56 78.');return}
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}/.test(form.password)) {
      setStatus('error')
      setMessage(t('passwordRule'))
      return
    }
    setStatus('submitting')

    try {
      const result = await signupPatient({
        cabinet_code: form.cabinetCode.trim(),
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: normalizePhone(form.phone),
        birth_date: form.birthDate,
        gender: form.gender || undefined,
        address: form.address.trim() || undefined,
        password: form.password,
        password_confirmation: form.passwordConfirmation,
        accept_terms: form.acceptTerms,
        accept_privacy: form.acceptPrivacy
      })
      setStatus('success')
      setMessage(result.message)
      sessionStorage.removeItem('fadaa_guest_registration')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Inscription patient impossible.')
    }
  }

  return (
    <AuthLayout
      title={t('patientRegisterTitle')}
      subtitle={t('patientRegisterSubtitle')}
      onBackHome={onBackHome}
    >
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="rounded-[8px] border border-atlas-line bg-atlas-cloud p-5">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-atlas-teal">
            <ShieldCheck size={15} />
            {t('secureLink')}
          </p>
          <h2 className="mt-5 font-display text-2xl font-bold">{t('noPracticeCreation')}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {t('patientExplanation')}
          </p>
          <div className="mt-6 grid gap-3 text-sm font-semibold text-slate-600">
            <p className="flex items-center gap-3"><UserRound size={18} className="text-atlas-teal" /> {t('personalProfile')}</p>
            <p className="flex items-center gap-3"><CalendarDays size={18} className="text-atlas-teal" /> {t('appointmentsDocuments')}</p>
            <p className="flex items-center gap-3"><Mail size={18} className="text-atlas-teal" /> {t('practiceNotifications')}</p>
            <p className="flex items-center gap-3"><Phone size={18} className="text-atlas-teal" /> {t('adminContact')}</p>
          </div>
        </aside>

        <section className="space-y-5">
          <Field label={t('practiceCode')} value={form.cabinetCode} onChange={(value) => update('cabinetCode', value)} placeholder="cabinet-benali" required minLength={2} maxLength={180} autoComplete="organization" />
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={t('firstName')} value={form.firstName} onChange={(value) => update('firstName', value)} required minLength={2} maxLength={120} autoComplete="given-name" />
            <Field label={t('lastName')} value={form.lastName} onChange={(value) => update('lastName', value)} required minLength={2} maxLength={120} autoComplete="family-name" />
            <Field label={t('email')} type="email" value={form.email} onChange={(value) => update('email', value)} required autoComplete="email" />
            <Field label="Numéro de téléphone" type="tel" value={form.phone} onChange={(value) => update('phone', phoneInput(value))} placeholder={phonePlaceholder} pattern={phonePatternHtml} required maxLength={24} autoComplete="tel" />
            <Field label={t('birthDate')} type="date" value={form.birthDate} onChange={(value) => update('birthDate', value)} required max={new Date().toISOString().slice(0, 10)} autoComplete="bday" />
            <label><span className="text-sm font-bold text-atlas-ink">{t('gender')} *</span><select required value={form.gender} onChange={(e)=>update('gender',e.target.value)} className="mt-2 w-full rounded-[8px] border border-atlas-line bg-white px-4 py-3"><option value="" disabled>Sélectionner</option><option value="M">{t('male')}</option><option value="F">{t('female')}</option></select></label>
            <Field label={t('address')} value={form.address} onChange={(value) => update('address', value)} maxLength={1000} autoComplete="street-address" />
            <Field label={t('password')} type="password" value={form.password} onChange={(value) => update('password', value)} required minLength={10} maxLength={128} autoComplete="new-password" />
            <Field label={t('confirmPassword')} type="password" value={form.passwordConfirmation} onChange={(value) => update('passwordConfirmation', value)} required minLength={10} maxLength={128} autoComplete="new-password" />
          </div>
          <p className="text-xs font-semibold text-slate-500">{t('passwordRule')}</p>
          <label className="flex gap-3 text-sm font-semibold text-slate-600"><input required type="checkbox" checked={form.acceptTerms} onChange={e=>update('acceptTerms',e.target.checked)}/>{t('acceptTerms')}</label>
          <label className="flex gap-3 text-sm font-semibold text-slate-600"><input required type="checkbox" checked={form.acceptPrivacy} onChange={e=>update('acceptPrivacy',e.target.checked)}/>{t('acceptPrivacy')}</label>

          {message && (
            <p className={`rounded-[8px] border px-4 py-3 text-sm font-semibold ${
              status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
            }`}
            >
              {message}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-atlas-line pt-5">
            <button type="button" onClick={onLogin} className="text-sm font-bold text-atlas-petrol hover:text-atlas-teal">
              {t('alreadyAccount')}
            </button>
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="rounded-[8px] bg-atlas-teal px-6 py-3 text-sm font-bold text-white shadow-lg shadow-atlas-teal/20 transition hover:bg-atlas-petrol disabled:cursor-wait disabled:opacity-70"
            >
              {status === 'submitting' ? t('creatingAccount') : t('createPatientAccount')}
            </button>
          </div>
        </section>
      </form>
    </AuthLayout>
  )
}
