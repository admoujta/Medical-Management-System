import { ChangeEvent, FormEvent, ReactNode, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

import { apiUpload, SignupResponse, signupTenant } from '../../lib/api'
import { saveSignupSession } from '../../lib/auth'
import { isValidPhone, normalizePhone, phoneInput, phonePlaceholder } from '../../lib/phone'

type RoleCode = 'doctor_admin'

type FormState = {
  firstName: string
  lastName: string
  specialty: string
  address: string
  city: string
  phone: string
  cabinetPhone: string
  email: string
  cabinetName: string
  instanceSlug: string
  primaryColor: string
  logoPreview: string
  adminUsername: string
  password: string
  passwordConfirmation: string
  initialRole: RoleCode
  acceptTerms: boolean
  acceptPrivacy: boolean
}

type SignupFlowProps = {
  onBackHome: () => void
  onCreated: () => void
}

const steps = ['Praticien', 'Cabinet', 'Administrateur', 'Sécurité', 'Validation']

const specialtyOptions = [
  'Médecine générale',
  'Cardiologie',
  'Dermatologie',
  'Gynécologie',
  'Pédiatrie',
  'Ophtalmologie',
  'ORL',
  'Dentaire',
  'Orthopédie',
  'Radiologie',
  'Gastro-entérologie',
  'Endocrinologie',
  'Neurologie',
  'Psychiatrie',
  'Pneumologie',
  'Urologie',
  'Rhumatologie',
  'Kinésithérapie',
  'Laboratoire d’analyses',
  'Autre spécialité'
]

const cityOptions = [
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Fès',
  'Tanger',
  'Agadir',
  'Meknès',
  'Oujda',
  'Kénitra',
  'Tétouan',
  'Safi',
  'Mohammedia',
  'El Jadida',
  'Béni Mellal',
  'Nador',
  'Témara',
  'Salé',
  'Khouribga',
  'Settat',
  'Laâyoune',
  'Dakhla',
  'Errachidia',
  'Essaouira',
  'Ifrane',
  'Autre ville'
]

const roleOptions: Array<{
  code: RoleCode
  title: string
  meta: string
  description: string
  permissions: string[]
}> = [
  {
    code: 'doctor_admin',
    title: 'Médecin admin',
    meta: 'Accès complet',
    description: 'Pour le praticien propriétaire du cabinet. Accès total aux dossiers, finances, statistiques et réglages.',
    permissions: ['Agenda', 'Patients', 'Honoraires', 'Configuration']
  }
]

const initialState: FormState = {
  firstName: '',
  lastName: '',
  specialty: '',
  address: '',
  city: '',
  phone: '',
  cabinetPhone: '',
  email: '',
  cabinetName: '',
  instanceSlug: '',
  primaryColor: '#0f8a7a',
  logoPreview: '',
  adminUsername: '',
  password: '',
  passwordConfirmation: '',
  initialRole: 'doctor_admin',
  acceptTerms: false,
  acceptPrivacy: false
}

const atlasEase: [number, number, number, number] = [0.22, 1, 0.36, 1]

const panelMotion = {
  initial: { opacity: 0, x: 18 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -18 },
  transition: { duration: 0.24, ease: atlasEase }
}

export function SignupFlow({ onBackHome, onCreated }: SignupFlowProps) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(initialState)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState<SignupResponse | null>(null)

  const selectedRole = roleOptions.find((role) => role.code === form.initialRole) ?? roleOptions[0]
  const completion = ((step + 1) / steps.length) * 100
  const passwordScore = useMemo(() => {
    return [
      form.password.length >= 10,
      /[A-Z]/.test(form.password),
      /[a-z]/.test(form.password),
      /\d/.test(form.password)
    ].filter(Boolean).length
  }, [form.password])

  const validationIssues = useMemo(() => {
    const issues: string[] = []
    const missing = (value: string) => !value.trim()
    if (step === 0) {
      if (form.firstName.trim().length < 2) issues.push('prénom')
      if (form.lastName.trim().length < 2) issues.push('nom')
      if (missing(form.specialty)) issues.push('spécialité')
      if (missing(form.city)) issues.push('ville')
      if (!isValidPhone(form.phone)) issues.push('numéro de téléphone du médecin valide')
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) issues.push('email professionnel valide')
      if (form.address.trim().length < 5) issues.push('adresse du cabinet')
    }
    if (step === 1) {
      if (form.cabinetName.trim().length < 2) issues.push('nom du cabinet')
      if (form.instanceSlug.trim().length < 2) issues.push('nom d’instance')
      if (!isValidPhone(form.cabinetPhone)) issues.push('numéro de téléphone du cabinet valide')
    }
    if (step === 3) {
      if (form.adminUsername && !/^\S+@\S+\.\S+$/.test(form.adminUsername.trim())) issues.push('identifiant email valide')
      if (passwordScore !== 4) issues.push('mot de passe conforme aux 4 critères')
      if (form.password !== form.passwordConfirmation) issues.push('confirmation identique au mot de passe')
      if (!form.acceptTerms) issues.push('acceptation des CGU')
      if (!form.acceptPrivacy) issues.push('acceptation de la politique de confidentialité')
    }
    return issues
  }, [form, passwordScore, step])

  const canContinue = validationIssues.length === 0

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setError('')
  }

  function handleLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) {
      event.target.value=''
      setLogoFile(null)
      setError('Le logo doit être une image PNG, JPG ou WebP.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      event.target.value=''
      setLogoFile(null)
      setError('Le logo ne doit pas dépasser 10 Mo.')
      return
    }
    if (form.logoPreview.startsWith('blob:')) URL.revokeObjectURL(form.logoPreview)
    setLogoFile(file)
    update('logoPreview', URL.createObjectURL(file))
  }

  function nextStep() {
    if (!canContinue) {
      setError(`À compléter ou corriger : ${validationIssues.join(', ')}.`)
      return
    }
    setError('')
    setStep((current) => Math.min(steps.length - 1, current + 1))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!canContinue) {
      setError('Vérifie les informations avant la création du cabinet.')
      return
    }

    setStatus('submitting')
    setError('')

    try {
      const response = await signupTenant({
        first_name: form.firstName,
        last_name: form.lastName,
        specialty: form.specialty,
        address: form.address,
        city: form.city,
        phone: normalizePhone(form.phone),
        cabinet_phone: normalizePhone(form.cabinetPhone),
        email: form.email,
        cabinet_name: form.cabinetName,
        instance_slug: form.instanceSlug,
        plan_slug: new URLSearchParams(window.location.search).get('plan') ?? undefined,
        primary_color: form.primaryColor,
        logo_url: null,
        admin_username: form.adminUsername || form.email,
        password: form.password,
        password_confirmation: form.passwordConfirmation,
        initial_role: form.initialRole,
        accept_terms: form.acceptTerms,
        accept_privacy: form.acceptPrivacy
      })
      saveSignupSession(response, `${form.firstName} ${form.lastName}`)
      if (logoFile) {
        try {
          await apiUpload('/doctor/cabinet/logo', response.access_token, { file: logoFile })
        } catch (uploadError) {
          setResult(response)
          setStatus('success')
          setError(uploadError instanceof Error?`Le cabinet a été créé, mais le logo n’a pas pu être enregistré : ${uploadError.message}`:'Le cabinet a été créé, mais le logo n’a pas pu être enregistré.')
          window.setTimeout(onCreated, 2500)
          return
        }
      }
      setResult(response)
      setStatus('success')
      window.setTimeout(onCreated, 700)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Inscription impossible')
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen bg-atlas-cloud text-atlas-ink">
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
        <Header onBackHome={onBackHome} />

        <section className="grid gap-8 py-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <aside className="space-y-5 lg:sticky lg:top-6">
            <IntroCard />
            <ClinicPreview form={form} selectedRole={selectedRole.title} />
          </aside>

          <section className="rounded-[8px] border border-atlas-line bg-white shadow-panel">
            <div className="border-b border-atlas-line px-5 py-5 md:px-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-atlas-teal">Création cabinet</p>
                  <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">Inscription guidée</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Un espace isolé, configuré et prêt pour l’essai gratuit.
                  </p>
                </div>
                <span className="rounded-full border border-atlas-line bg-atlas-mist px-4 py-2 text-xs font-bold text-atlas-petrol">
                  {steps[step]}
                </span>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Progression</span>
                  <span>{Math.round(completion)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-atlas-mist">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-atlas-teal to-atlas-aqua"
                    animate={{ width: `${completion}%` }}
                    transition={{ duration: 0.28, ease: atlasEase }}
                  />
                </div>
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {steps.map((item, index) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => index < step && setStep(index)}
                      className={`rounded-[8px] px-2 py-2 text-[11px] font-bold transition ${
                        index === step
                          ? 'bg-atlas-petrol text-white'
                          : index < step
                            ? 'bg-atlas-mist text-atlas-petrol'
                            : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {status === 'success' && result ? (
              <div className="p-5 md:p-7">
                <SuccessPanel result={result} selectedRole={selectedRole.title} />
              </div>
            ) : (
              <form onSubmit={submit} className="p-5 md:p-7">
                <div className="min-h-[420px]">
                  <AnimatePresence mode="wait">
                    <motion.div key={step} {...panelMotion}>
                      {step === 0 && <PractitionerStep form={form} update={update} />}
                      {step === 1 && <CabinetStep form={form} update={update} handleLogo={handleLogo} />}
                      {step === 2 && <RoleStep form={form} update={update} />}
                      {step === 3 && <SecurityStep form={form} update={update} passwordScore={passwordScore} />}
                      {step === 4 && <ConfirmationStep form={form} selectedRole={selectedRole.title} />}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                  >
                    {error}
                  </motion.p>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-atlas-line pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      setStep((current) => Math.max(0, current - 1))
                    }}
                    disabled={step === 0 || status === 'submitting'}
                    className="rounded-[8px] border border-atlas-line bg-white px-5 py-3 text-sm font-bold text-atlas-petrol transition hover:border-atlas-teal disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Retour
                  </button>
                  {step < steps.length - 1 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="rounded-[8px] bg-atlas-petrol px-6 py-3 text-sm font-bold text-white shadow-lg shadow-atlas-petrol/15 transition hover:bg-atlas-teal"
                    >
                      Continuer
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={status === 'submitting'}
                      className="rounded-[8px] bg-atlas-teal px-6 py-3 text-sm font-bold text-white shadow-lg shadow-atlas-teal/20 transition hover:bg-atlas-petrol disabled:cursor-wait disabled:opacity-70"
                    >
                      {status === 'submitting' ? 'Création en cours...' : 'Créer mon cabinet'}
                    </button>
                  )}
                </div>
              </form>
            )}
          </section>
        </section>
      </div>
    </main>
  )
}

function Header({ onBackHome }: { onBackHome: () => void }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-[8px] border border-atlas-line bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <img src="/images/fadaa-logo.svg" alt="FADAA Santé" className="h-12 w-36 object-contain" />
        <div>
          <p className="text-xs font-semibold text-slate-500">SaaS médical multi-cabinets</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-2 rounded-[8px] border border-atlas-line bg-atlas-cloud px-4 py-2 text-sm font-bold text-atlas-petrol transition hover:border-atlas-teal hover:text-atlas-teal"
        >
          <ArrowLeft size={17} />
          Retour au site
        </button>
      </div>
    </header>
  )
}

function IntroCard() {
  return (
    <section className="overflow-hidden rounded-[8px] border border-atlas-line bg-white shadow-panel">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src="/images/fadaa-onboarding-cabinet.png"
          alt="Cabinet médical moderne"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-atlas-ink/72 via-atlas-ink/15 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-atlas-petrol">
            Maroc · cabinets médicaux
          </p>
        </div>
      </div>
      <div className="p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-atlas-teal">Plateforme professionnelle</p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">
          Votre cabinet prêt en quelques minutes
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          FADAA Santé provisionne un espace isolé pour votre cabinet avec un essai gratuit de 30 jours.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            ['30j', 'essai'],
            ['RBAC', 'droits'],
            ['SaaS', 'cabinet']
          ].map(([value, label]) => (
            <div key={label} className="rounded-[8px] border border-atlas-line bg-atlas-cloud p-3">
              <strong className="block font-display text-xl text-atlas-petrol">{value}</strong>
              <span className="text-xs font-bold uppercase text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ClinicPreview({ form, selectedRole }: { form: FormState; selectedRole: string }) {
  return (
    <section className="rounded-[8px] border border-atlas-line bg-atlas-ink p-5 text-white shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-atlas-aqua">Aperçu tenant</p>
          <h2 className="mt-2 font-display text-xl font-bold">{form.cabinetName || 'Cabinet FADAA'}</h2>
          <p className="mt-1 text-sm text-white/65">{form.city || 'Ville'} · {form.specialty || 'Spécialité'}</p>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-[8px] text-sm font-bold text-white" style={{ background: form.primaryColor }}>
          {form.logoPreview ? <img src={form.logoPreview} alt="" className="h-full w-full rounded-[8px] object-cover" /> : 'FS'}
        </div>
      </div>
      <div className="mt-5 rounded-[8px] border border-white/10 bg-white/8 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold">Premier accès</span>
          <span className="rounded-full bg-atlas-aqua/20 px-3 py-1 text-xs font-bold text-atlas-aqua">{selectedRole}</span>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-2 rounded-full bg-white/15" />
          <div className="h-2 w-4/5 rounded-full bg-white/15" />
          <div className="h-2 w-2/3 rounded-full bg-white/15" />
        </div>
      </div>
    </section>
  )
}

type StepProps = {
  form: FormState
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-atlas-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[8px] border border-atlas-line bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-300 focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10"
      />
    </label>
  )
}

function SelectField({ label, value, onChange, options, placeholder }: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-atlas-ink">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-[8px] border border-atlas-line bg-white px-4 py-3 text-sm font-semibold text-atlas-ink outline-none transition focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10"
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

function PractitionerStep({ form, update }: StepProps) {
  return (
    <StepShell title="Informations générales" subtitle="Identifie le praticien et le cabinet pour préparer le tenant.">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Prénom" value={form.firstName} onChange={(value) => update('firstName', value)} />
        <Field label="Nom" value={form.lastName} onChange={(value) => update('lastName', value)} />
        <SelectField
          label="Spécialité"
          value={form.specialty}
          onChange={(value) => update('specialty', value)}
          options={specialtyOptions}
          placeholder="Choisir une spécialité"
        />
        <SelectField
          label="Ville"
          value={form.city}
          onChange={(value) => update('city', value)}
          options={cityOptions}
          placeholder="Choisir une ville"
        />
        <Field label="Numéro de téléphone" type="tel" placeholder={phonePlaceholder} value={form.phone} onChange={(value) => update('phone', phoneInput(value))} />
        <Field label="Email professionnel" type="email" value={form.email} onChange={(value) => update('email', value)} />
        <label className="block md:col-span-2">
          <span className="text-sm font-bold text-atlas-ink">Adresse cabinet</span>
          <textarea
            value={form.address}
            onChange={(event) => update('address', event.target.value)}
            placeholder="Adresse complète du cabinet"
            className="mt-2 min-h-24 w-full rounded-[8px] border border-atlas-line bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-300 focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10"
          />
        </label>
      </div>
    </StepShell>
  )
}

function CabinetStep({ form, update, handleLogo }: StepProps & { handleLogo: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <StepShell title="Identité du cabinet" subtitle="Personnalise la couleur, le logo et l’apparence des documents.">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <Field label="Nom du cabinet" value={form.cabinetName} onChange={(value) => update('cabinetName', value)} />
          <Field
            label="Nom d’instance"
            value={form.instanceSlug}
            onChange={(value) => update('instanceSlug', value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="cabinet-benali"
          />
          <Field label="Numéro de téléphone du cabinet" type="tel" placeholder={phonePlaceholder} value={form.cabinetPhone} onChange={(value) => update('cabinetPhone', phoneInput(value))} />
          <label className="block">
            <span className="text-sm font-bold text-atlas-ink">Couleur principale</span>
            <div className="mt-2 flex items-center gap-3 rounded-[8px] border border-atlas-line bg-white p-2">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(event) => update('primaryColor', event.target.value)}
                className="h-10 w-16 rounded-[8px] border-0 bg-transparent"
              />
              <span className="text-sm font-bold text-slate-500">{form.primaryColor}</span>
            </div>
          </label>
          <label className="block rounded-[8px] border border-dashed border-atlas-line bg-atlas-mist/50 p-4">
            <span className="text-sm font-bold text-atlas-ink">Logo du cabinet</span>
            <input type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={handleLogo} className="mt-3 w-full text-sm" />
          </label>
        </div>
        <div className="rounded-[8px] border border-atlas-line bg-atlas-warm p-5">
          <p className="mb-4 text-sm font-bold text-atlas-petrol">Aperçu ordonnance</p>
          <motion.div layout className="rounded-[8px] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4 border-b border-atlas-line pb-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[8px] text-sm font-bold text-white" style={{ background: form.primaryColor }}>
                {form.logoPreview ? <img src={form.logoPreview} alt="" className="h-full w-full rounded-[8px] object-cover" /> : 'FS'}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-bold">{form.cabinetName || 'Cabinet FADAA'}</p>
                <p className="text-sm text-slate-500">{form.specialty || 'Spécialité médicale'} · {form.city || 'Ville'}</p>
                <p className="mt-1 text-xs text-slate-400">{form.phone || '+212 ...'}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="h-3 w-5/6 rounded-full bg-atlas-mist" />
              <div className="h-3 w-2/3 rounded-full bg-atlas-mist" />
              <div className="h-3 w-4/5 rounded-full bg-atlas-mist" />
              <div className="mt-6 h-12 rounded-[8px] border" style={{ borderColor: form.primaryColor }} />
            </div>
          </motion.div>
        </div>
      </div>
    </StepShell>
  )
}

function RoleStep({ form, update }: StepProps) {
  return (
    <StepShell title="Médecin administrateur" subtitle="Le propriétaire du nouveau cabinet est automatiquement créé comme médecin administrateur.">
      <div className="grid gap-4">
        {roleOptions.map((role) => {
          const isSelected = form.initialRole === role.code
          return (
            <motion.button
              key={role.code}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => update('initialRole', role.code)}
              className={`rounded-[8px] border p-5 text-left transition ${
                isSelected
                  ? 'border-atlas-teal bg-atlas-mist shadow-lg shadow-atlas-teal/10'
                  : 'border-atlas-line bg-white hover:border-atlas-sage'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold text-atlas-ink">{role.title}</p>
                  <p className="mt-1 text-xs font-bold uppercase text-atlas-teal">{role.meta}</p>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">{role.description}</p>
                </div>
                <span className={`h-5 w-5 rounded-full border-2 ${isSelected ? 'border-atlas-teal bg-atlas-teal' : 'border-atlas-line bg-white'}`} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {role.permissions.map((permission) => (
                  <span key={permission} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-atlas-petrol">
                    {permission}
                  </span>
                ))}
              </div>
            </motion.button>
          )
        })}
      </div>
    </StepShell>
  )
}

function SecurityStep({ form, update, passwordScore }: StepProps & { passwordScore: number }) {
  return (
    <StepShell title="Compte et sécurité" subtitle="Protège le compte avec un mot de passe robuste et les conditions légales.">
      <div className="space-y-5">
        <Field label="Identifiant" type="email" value={form.adminUsername} onChange={(value) => update('adminUsername', value)} placeholder={form.email || 'admin@cabinet.ma'} />
        <Field label="Mot de passe" type="password" value={form.password} onChange={(value) => update('password', value)} />
        <Field label="Confirmer le mot de passe" type="password" value={form.passwordConfirmation} onChange={(value) => update('passwordConfirmation', value)} />
        <div>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((item) => (
              <motion.span
                key={item}
                className={`h-1.5 rounded-full ${item < passwordScore ? 'bg-atlas-teal' : 'bg-atlas-mist'}`}
                animate={{ opacity: item < passwordScore ? 1 : 0.45 }}
              />
            ))}
          </div>
          <p className="mt-2 text-sm text-slate-500">Minimum 10 caractères, majuscule, minuscule et chiffre.</p>
        </div>
        <label className="flex gap-3 rounded-[8px] border border-atlas-line bg-atlas-ivory p-4 text-sm leading-6">
          <input
            type="checkbox"
            checked={form.acceptTerms}
            onChange={(event) => update('acceptTerms', event.target.checked)}
            className="mt-1 h-4 w-4 accent-atlas-teal"
          />
          <span>J'accepte les CGU et la politique de confidentialité relatives aux données médicales.</span>
        </label>
        <label className="flex gap-3 rounded-[8px] border border-atlas-line bg-atlas-ivory p-4 text-sm leading-6">
          <input
            type="checkbox"
            checked={form.acceptPrivacy}
            onChange={(event) => update('acceptPrivacy', event.target.checked)}
            className="mt-1 h-4 w-4 accent-atlas-teal"
          />
          <span>J’accepte la politique de confidentialité des données médicales.</span>
        </label>
      </div>
    </StepShell>
  )
}

function ConfirmationStep({ form, selectedRole }: { form: FormState; selectedRole: string }) {
  const rows = [
    ['Praticien', `${form.firstName} ${form.lastName}`],
    ['Cabinet', form.cabinetName],
    ['Instance', form.instanceSlug],
    ['Rôle choisi', selectedRole],
    ['Spécialité', form.specialty],
    ['Ville', form.city],
    ['Email', form.email],
    ['Essai', '30 jours, accès complet selon rôle']
  ]

  return (
    <StepShell title="Confirmation" subtitle="Vérifie les informations avant de lancer le provisioning.">
      <div className="overflow-hidden rounded-[8px] border border-atlas-line bg-white">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-2 border-b border-atlas-line px-5 py-4 last:border-b-0 md:grid-cols-[160px_1fr]">
            <span className="text-sm font-bold text-slate-500">{label}</span>
            <span className="text-sm font-semibold text-atlas-ink">{value || '-'}</span>
          </div>
        ))}
      </div>
    </StepShell>
  )
}

function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-6">
        <h3 className="font-display text-xl font-bold text-atlas-ink">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

function SuccessPanel({ result, selectedRole }: { result: SignupResponse; selectedRole: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-6"
    >
      <p className="text-sm font-bold uppercase text-emerald-700">Instance créée</p>
      <h3 className="mt-2 font-display text-2xl font-bold text-atlas-ink">Votre cabinet est prêt.</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Tenant <strong>{result.tenant_slug}</strong>, statut <strong>{result.tenant_status}</strong>, rôle <strong>{selectedRole}</strong>.
        Fin de l’essai: <strong>{new Date(result.trial_ends_at).toLocaleDateString('fr-FR')}</strong>.
      </p>
    </motion.div>
  )
}
