import { LucideIcon } from 'lucide-react'

type DashboardCardProps = {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: 'teal' | 'blue' | 'amber' | 'red'
}

const toneClasses = {
  teal: 'bg-atlas-mist text-atlas-teal',
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700'
}

export function DashboardCard({ label, value, icon: Icon, tone = 'teal' }: DashboardCardProps) {
  return (
    <article className="rounded-[8px] border border-atlas-line bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <strong className="mt-3 block font-display text-3xl text-atlas-ink">{value}</strong>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-[8px] ${toneClasses[tone]}`}>
          <Icon size={20} />
        </span>
      </div>
    </article>
  )
}
