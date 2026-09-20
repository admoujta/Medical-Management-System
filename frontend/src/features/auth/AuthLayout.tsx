import { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type AuthLayoutProps = {
  title: string
  subtitle: string
  children: ReactNode
  onBackHome: () => void
}

export function AuthLayout({ title, subtitle, children, onBackHome }: AuthLayoutProps) {
  const { t } = useTranslation()
  return (
    <main className="min-h-screen bg-atlas-cloud px-5 py-6 text-atlas-ink md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-3"><button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-2 rounded-[8px] border border-atlas-line bg-white px-4 py-2 text-sm font-bold text-atlas-petrol transition hover:border-atlas-teal"
        >
          <ArrowLeft size={17} />
          {t('backToSite')}
        </button></div>
        <section className="overflow-hidden rounded-[8px] border border-atlas-line bg-white shadow-panel">
          <div className="border-b border-atlas-line bg-gradient-to-r from-atlas-petrol to-atlas-teal px-6 py-8 text-white md:px-10">
            <span className="inline-block rounded-[8px] bg-white p-2"><img src="/images/fadaa-logo.svg" alt="FADAA Santé" className="h-14 w-44 object-contain" /></span>
            <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/78">{subtitle}</p>
          </div>
          <div className="p-6 md:p-10">{children}</div>
        </section>
      </div>
    </main>
  )
}
