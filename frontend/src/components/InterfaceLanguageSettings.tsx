import { Check, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppLanguage, applyLanguage, normalizeAppLanguage } from '../i18n'

const languages: Array<{code:AppLanguage;short:string;native:string;descriptionKey:string}> = [
  {code:'fr',short:'FR',native:'Français',descriptionKey:'interfaceFrench'},
  {code:'ar',short:'AR',native:'العربية',descriptionKey:'interfaceArabic'},
  {code:'en',short:'EN',native:'English',descriptionKey:'interfaceEnglish'},
]

export function InterfaceLanguageSettings() {
  const { t, i18n } = useTranslation()
  const active = normalizeAppLanguage(i18n.resolvedLanguage ?? i18n.language) ?? 'fr'
  return (
    <section className="rounded-[12px] border border-atlas-line bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-atlas-mist text-atlas-teal">
          <Languages size={22}/>
        </span>
        <div>
          <h2 className="font-display text-xl font-bold">{t('language')}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{t('interfaceLanguageDescription')}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {languages.map(language => {
          const selected = language.code === active
          return (
            <button
              key={language.code}
              type="button"
              onClick={() => { void applyLanguage(language.code) }}
              aria-pressed={selected}
              className={`relative flex min-h-24 items-center gap-3 rounded-[10px] border p-4 text-start transition hover:-translate-y-0.5 hover:shadow-sm ${selected?'border-atlas-teal bg-atlas-mist ring-2 ring-atlas-teal/10':'border-atlas-line bg-white hover:border-atlas-teal/40'}`}
            >
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[9px] text-sm font-black ${selected?'bg-atlas-teal text-white':'bg-slate-100 text-slate-500'}`}>{language.short}</span>
              <span className="min-w-0">
                <b className="block text-sm">{language.native}</b>
                <span className="mt-1 block text-[11px] text-slate-500">{t(language.descriptionKey)}</span>
              </span>
              {selected&&<Check size={17} className="absolute end-3 top-3 text-atlas-teal"/>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
