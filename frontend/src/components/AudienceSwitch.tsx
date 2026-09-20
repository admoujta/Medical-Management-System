import { motion } from 'framer-motion'

export type PublicAudience='doctor'|'patient'

export function AudienceSwitch({audience,onChange}:{audience:PublicAudience;onChange:(audience:PublicAudience)=>void}) {
  return <div className="relative grid h-11 shrink-0 grid-cols-2 rounded-[11px] border border-atlas-line bg-slate-100 p-1 shadow-inner" role="group" aria-label="Choisir votre espace">
    <motion.span aria-hidden="true" className="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-[8px] bg-atlas-petrol shadow-[0_5px_14px_rgba(15,82,95,.22)]" animate={{x:audience==='doctor'?'0%':'100%'}} transition={{type:'spring',stiffness:300,damping:30,mass:.85}} style={{left:4}}/>
    {(['doctor','patient'] as const).map(item=><button key={item} type="button" onClick={()=>onChange(item)} aria-pressed={audience===item} className={`relative z-10 min-w-[72px] whitespace-nowrap rounded-[7px] px-2.5 text-[11px] font-bold transition-colors duration-300 sm:min-w-[82px] sm:px-3 sm:text-xs ${audience===item?'text-white':'text-slate-500 hover:text-atlas-teal'}`}>{item==='doctor'?'Médecin':'Patient'}</button>)}
  </div>
}
