const labels: Record<string, string> = {
  trial: 'Essai',
  active: 'Actif',
  expired: 'Expiré',
  suspended: 'Suspendu'
}

const classes: Record<string, string> = {
  trial: 'border-atlas-teal/20 bg-atlas-mist text-atlas-teal',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  expired: 'border-amber-200 bg-amber-50 text-amber-700',
  suspended: 'border-red-200 bg-red-50 text-red-700'
}

export function InstanceStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex h-7 w-fit max-w-full shrink-0 self-center items-center justify-center whitespace-nowrap rounded-full border px-3 text-[11px] font-extrabold leading-none ${classes[status] ?? classes.trial}`}>
      {labels[status] ?? status}
    </span>
  )
}
