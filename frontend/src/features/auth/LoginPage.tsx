import { FormEvent, useState } from 'react'
import { Eye, EyeOff, LockKeyhole, LogIn, Mail, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { loginUser } from '../../lib/api'
import { redirectForRole, saveLoginSession } from '../../lib/auth'

type Props = {
  onSignup: () => void
  onBackHome: () => void
  onNavigate: (path: string) => void
}

export function LoginPage({ onSignup, onBackHome, onNavigate }: Props) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setStatus('submitting')
    setMessage('')
    try {
      const result = await loginUser({ email, password })
      saveLoginSession(result)
      setStatus('success')
      setMessage(t('loginSuccess', { name: result.full_name }))
      const intendedPath=sessionStorage.getItem('fadaa_post_login_redirect')
      const isPatient=['PATIENT','patient'].includes(result.role??'')
      const destination=isPatient&&intendedPath==='/patient/appointments/request'?intendedPath:redirectForRole(result.role)
      sessionStorage.removeItem('fadaa_post_login_redirect')
      window.setTimeout(() => onNavigate(destination), 350)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : t('loginError'))
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-atlas-cloud px-4 py-6 text-atlas-ink">
      <div className="w-full max-w-xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <button type="button" onClick={onBackHome} className="rounded-[8px] border border-atlas-line bg-white px-4 py-2.5 text-sm font-bold text-atlas-petrol hover:border-atlas-teal">← {t('backToSite')}</button>
          <img src="/images/fadaa-logo.svg" alt="FADAA Santé" className="h-12 w-40 object-contain" />
        </header>

        <form onSubmit={submit} className="rounded-[18px] border border-atlas-line bg-white p-6 shadow-panel md:p-9">
          <div className="text-center">
            <span className="mx-auto inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700"><ShieldCheck size={15} />{t('secureLogin')}</span>
            <h1 className="mt-5 font-display text-3xl font-bold text-atlas-petrol">{t('login')}</h1>
            <p className="mt-2 text-sm text-slate-500">{t('loginSubtitle')}</p>
          </div>

          <div className="mt-7 space-y-5">
            <label className="block"><span className="text-sm font-bold">{t('email')} *</span><div className="mt-2 flex items-center gap-3 rounded-[9px] border border-atlas-line px-4 py-3.5 focus-within:border-atlas-teal"><Mail size={18} className="text-atlas-teal" /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" placeholder="nom@exemple.ma" /></div></label>
            <label className="block"><span className="text-sm font-bold">{t('password')} *</span><div className="mt-2 flex items-center gap-3 rounded-[9px] border border-atlas-line px-4 py-3.5 focus-within:border-atlas-teal"><LockKeyhole size={18} className="text-atlas-teal" /><input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" placeholder={t('passwordPlaceholder')} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="text-slate-400" aria-label={showPassword ? t('hidePassword') : t('showPassword')}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          </div>

          {message && <p className={`mt-4 rounded-[8px] border px-4 py-3 text-sm font-semibold ${status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{message}</p>}
          <button disabled={status === 'submitting'} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[9px] bg-atlas-teal px-6 py-3.5 font-bold text-white hover:bg-atlas-petrol disabled:opacity-60"><LogIn size={18} />{status === 'submitting' ? t('loggingIn') : t('signIn')}</button>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm"><button type="button" className="font-semibold text-slate-500">{t('forgotPassword')}</button><button type="button" onClick={onSignup} className="font-bold text-atlas-teal">{t('createPractice')}</button></div>
        </form>
        <p className="mt-5 text-center text-xs text-slate-400">{t('protectedData')}</p>
      </div>
    </main>
  )
}
