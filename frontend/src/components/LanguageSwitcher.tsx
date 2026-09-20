import { Check, Languages } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppLanguage, applyLanguage, normalizeAppLanguage } from '../i18n'

const choices:{code:AppLanguage;short:string;native:string}[]=[
  {code:'fr',short:'FR',native:'Français'},
  {code:'ar',short:'AR',native:'العربية'},
  {code:'en',short:'EN',native:'English'},
]
const languageNames:Record<AppLanguage,Record<AppLanguage,string>>={
  fr:{fr:'Français',ar:'Arabe',en:'Anglais'},
  en:{fr:'French',ar:'Arabic',en:'English'},
  ar:{fr:'الفرنسية',ar:'العربية',en:'الإنجليزية'},
}

export function LanguageSwitcher({language,onChange}:{language?:AppLanguage;onChange?:(value:AppLanguage)=>void}={}) {
  const {t,i18n}=useTranslation();const[open,setOpen]=useState(false);const ref=useRef<HTMLDivElement>(null)
  const active=language??normalizeAppLanguage(i18n.resolvedLanguage??i18n.language)??'fr'
  useEffect(()=>{const close=(event:MouseEvent)=>{if(!ref.current?.contains(event.target as Node))setOpen(false)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[])
  function select(value:AppLanguage){onChange?.(value);void applyLanguage(value);setOpen(false)}
  return <div ref={ref} className="relative shrink-0">
    <button type="button" onClick={()=>setOpen(value=>!value)} aria-label={t('language')} aria-expanded={open} className={`grid h-11 w-11 place-items-center rounded-xl border transition ${open?'border-atlas-teal bg-atlas-mist text-atlas-teal shadow-sm':'border-transparent text-atlas-teal hover:border-atlas-line hover:bg-white'}`}><Languages size={22}/></button>
    {open&&<div className="absolute end-0 top-13 z-[100] w-60 overflow-hidden rounded-2xl border border-atlas-line bg-white p-2 shadow-2xl">
      <div className="px-3 pb-2 pt-1"><p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{t('language')}</p></div>
      {choices.map(choice=>{const selected=choice.code===active;return <button type="button" key={choice.code} onClick={()=>select(choice.code)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start transition ${selected?'bg-atlas-mist text-atlas-teal':'text-slate-600 hover:bg-slate-50 hover:text-atlas-petrol'}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-black ${selected?'bg-atlas-teal text-white':'bg-slate-100 text-slate-500'}`}>{choice.short}</span><span className="min-w-0 flex-1"><b className="block text-sm">{choice.native}</b><small className="text-xs opacity-65">{languageNames[active]?.[choice.code]??languageNames.fr[choice.code]}</small></span>{selected&&<Check size={17} className="shrink-0"/>}</button>})}
    </div>}
  </div>
}
