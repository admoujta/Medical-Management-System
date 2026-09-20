import { useEffect } from 'react'

type FieldIssue = { message: string; field?: string }
type ApiErrorDetail = FieldIssue & { issues?: FieldIssue[] }

const errorClasses = ['border-red-500', 'bg-red-50/50', 'ring-2', 'ring-red-100', 'focus:border-red-600', 'focus:ring-red-100']

function clearFieldError(field: HTMLElement) {
  errorClasses.forEach((className) => field.classList.remove(className))
  field.removeAttribute('aria-invalid')
  field.removeAttribute('data-fadaa-invalid')
  const describedBy = (field.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean)
  describedBy.filter((id) => id.startsWith('fadaa-field-error-')).forEach((id) => document.getElementById(id)?.remove())
  const preservedIds = describedBy.filter((id) => !id.startsWith('fadaa-field-error-'))
  if (preservedIds.length) field.setAttribute('aria-describedby', preservedIds.join(' '))
  else field.removeAttribute('aria-describedby')
}

function clearAllFieldErrors() {
  document.querySelectorAll<HTMLElement>('[data-fadaa-invalid="true"]').forEach(clearFieldError)
}

function findField(issue: FieldIssue): HTMLElement | null {
  if (!issue.field) return null
  const named = document.querySelector<HTMLElement>(`[name="${CSS.escape(issue.field)}"]`)
  if (named) return named
  const expectedLabel = issue.message.split(':')[0].trim().replace(/\s*\*$/, '').toLocaleLowerCase('fr')
  return Array.from(document.querySelectorAll<HTMLLabelElement>('label'))
    .find((label) => label.textContent?.trim().replace(/\s*\*.*$/, '').toLocaleLowerCase('fr').startsWith(expectedLabel))
    ?.querySelector<HTMLElement>('input, select, textarea') ?? null
}

function inlineMessage(message: string) {
  return message.includes(':') ? message.split(':').slice(1).join(':').trim() : message
}

function renderIssue(issue: FieldIssue): HTMLElement | null {
  const field = findField(issue)
  if (!field || !issue.field) return null
  clearFieldError(field)
  const errorId = `fadaa-field-error-${issue.field}-${crypto.randomUUID()}`
  const helper = document.createElement('p')
  helper.id = errorId
  helper.dataset.fadaaFieldError = 'true'
  helper.className = 'mt-1.5 flex items-start gap-1.5 text-xs font-semibold leading-5 text-red-600'
  helper.setAttribute('role', 'alert')
  const icon = document.createElement('span')
  icon.ariaHidden = 'true'
  icon.className = 'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-red-600 text-[10px] font-black leading-none text-white'
  icon.textContent = '!'
  helper.append(icon, document.createTextNode(inlineMessage(issue.message)))
  const previousDescriptions = field.getAttribute('aria-describedby')
  field.setAttribute('aria-invalid', 'true')
  field.setAttribute('data-fadaa-invalid', 'true')
  field.setAttribute('aria-describedby', [previousDescriptions, errorId].filter(Boolean).join(' '))
  field.classList.add(...errorClasses)
  ;(field.closest('label') ?? field.parentElement)?.appendChild(helper)
  helper.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' })
  field.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }], { duration: 220, easing: 'ease-out' })
  return field
}

function revealIssues(issues: FieldIssue[]) {
  clearAllFieldErrors()
  const fields = issues.map(renderIssue).filter((field): field is HTMLElement => Boolean(field))
  const firstField = fields[0]
  if (!firstField) {
    const previous = document.getElementById('fadaa-global-api-error')
    previous?.remove()
    const banner = document.createElement('div')
    banner.id = 'fadaa-global-api-error'
    banner.setAttribute('role', 'alert')
    banner.setAttribute('aria-live', 'assertive')
    banner.className = 'fixed left-1/2 top-5 z-[100] flex w-[min(92vw,720px)] -translate-x-1/2 items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-800 shadow-2xl'
    const icon = document.createElement('span')
    icon.ariaHidden = 'true'
    icon.className = 'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-red-600 text-xs font-black text-white'
    icon.textContent = '!'
    const text = document.createElement('span')
    text.className = 'min-w-0 flex-1'
    text.textContent = issues.map((issue) => issue.message).join(' ')
    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'shrink-0 rounded-md px-2 text-lg leading-6 text-red-700 hover:bg-red-100'
    close.setAttribute('aria-label', 'Fermer le message')
    close.textContent = '×'
    close.addEventListener('click', () => banner.remove())
    banner.append(icon, text, close)
    document.body.appendChild(banner)
    banner.animate([{ opacity: 0, transform: 'translate(-50%, -12px)' }, { opacity: 1, transform: 'translate(-50%, 0)' }], { duration: 180, easing: 'ease-out' })
    return
  }
  firstField.scrollIntoView({ behavior: 'smooth', block: 'center' })
  window.setTimeout(() => firstField.focus({ preventScroll: true }), 220)
}

export function FieldErrorFeedback() {
  useEffect(() => {
    let pendingNativeIssues: FieldIssue[] = []
    let nativeBatchScheduled = false

    function showApiErrors(event: Event) {
      const detail = (event as CustomEvent<ApiErrorDetail>).detail
      if (!detail) return
      revealIssues(detail.issues?.length ? detail.issues : [detail])
    }
    function showInvalidField(event: Event) {
      const field = event.target
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return
      event.preventDefault()
      const label = field.labels?.[0]?.querySelector('span')?.textContent?.trim().replace(/\s*\*$/, '') || field.getAttribute('aria-label') || field.name.split('_').join(' ') || 'Champ'
      let instruction = 'Vérifiez la valeur saisie.'
      if (field.validity.valueMissing) instruction = 'Ce champ est obligatoire.'
      else if (field.validity.tooShort && field instanceof HTMLInputElement) instruction = `Saisissez au moins ${field.minLength} caractères.`
      else if (field.validity.typeMismatch && field instanceof HTMLInputElement && field.type === 'email') instruction = 'Saisissez une adresse e-mail valide.'
      pendingNativeIssues.push({ message: `${label} : ${instruction}`, field: field.name || label })
      if (nativeBatchScheduled) return
      nativeBatchScheduled = true
      queueMicrotask(() => {
        revealIssues(pendingNativeIssues)
        pendingNativeIssues = []
        nativeBatchScheduled = false
      })
    }
    function clearOnEdit(event: Event) {
      if (event.target instanceof HTMLElement && event.target.dataset.fadaaInvalid === 'true') clearFieldError(event.target)
    }

    window.addEventListener('fadaa:api-error', showApiErrors)
    document.addEventListener('invalid', showInvalidField, true)
    document.addEventListener('input', clearOnEdit, true)
    document.addEventListener('change', clearOnEdit, true)
    return () => {
      window.removeEventListener('fadaa:api-error', showApiErrors)
      document.removeEventListener('invalid', showInvalidField, true)
      document.removeEventListener('input', clearOnEdit, true)
      document.removeEventListener('change', clearOnEdit, true)
    }
  }, [])
  return null
}
