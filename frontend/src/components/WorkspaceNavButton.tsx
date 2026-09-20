import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

export function WorkspaceNavButton({active,onClick,icon:Icon,children,disabled=false,layoutId='workspace-nav',title}:{active:boolean;onClick:()=>void;icon:LucideIcon;children:ReactNode;disabled?:boolean;layoutId?:string;title?:string}) {
  const ref=useRef<HTMLButtonElement>(null)
  useEffect(()=>{
    if(!active||!ref.current)return
    const frame=window.requestAnimationFrame(()=>ref.current?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}))
    return()=>window.cancelAnimationFrame(frame)
  },[active])
  return <button ref={ref} type="button" disabled={disabled} title={title} aria-current={active?'page':undefined} onClick={onClick} className={`group relative inline-flex shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap rounded-[9px] px-3.5 py-2.5 text-sm font-bold outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-atlas-teal/35 disabled:cursor-not-allowed disabled:opacity-35 ${active?'text-atlas-teal':'text-slate-600 hover:bg-atlas-cloud hover:text-atlas-petrol'}`}>
    {active&&<motion.span layoutId={layoutId} className="absolute inset-0 rounded-[9px] border border-atlas-teal/10 bg-atlas-mist shadow-[0_3px_12px_rgba(15,82,95,.08)]" transition={{type:'spring',stiffness:330,damping:32,mass:.8}}/>}
    <Icon size={18} className={`relative z-10 transition-transform duration-300 ${active?'scale-105':'group-hover:-translate-y-0.5'}`}/>
    <span className="relative z-10">{children}</span>
    <span aria-hidden="true" className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-atlas-teal transition-all duration-300 ${active?'scale-x-100 opacity-100':'scale-x-0 opacity-0'}`}/>
  </button>
}
