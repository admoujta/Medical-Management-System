import { AlertTriangle, CheckCircle2, Info, Trash2, X } from 'lucide-react'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'

type ConfirmTone = 'danger' | 'warning' | 'primary'

type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
}

const toneStyles: Record<ConfirmTone, { icon: string; button: string }> = {
  danger: { icon: 'bg-red-50 text-red-600', button: 'bg-red-600 hover:bg-red-700 focus:ring-red-200' },
  warning: { icon: 'bg-amber-50 text-amber-700', button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-200' },
  primary: { icon: 'bg-teal-50 text-teal-700', button: 'bg-teal-700 hover:bg-teal-800 focus:ring-teal-200' },
}

export function confirmAction({
  title = 'Confirmer cette action',
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'primary',
}: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const style = toneStyles[tone]
    const Icon = tone === 'danger' ? Trash2 : tone === 'warning' ? AlertTriangle : CheckCircle2
    const close = (value: boolean) => {
      root.unmount()
      host.remove()
      document.body.style.overflow = ''
      resolve(value)
    }
    document.body.style.overflow = 'hidden'
    root.render(createElement('div', {
      className: 'fixed inset-0 z-[1000] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm',
      role: 'presentation',
      onMouseDown: (event: MouseEvent) => { if (event.target === event.currentTarget) close(false) },
    }, createElement('section', {
      className: 'w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_30px_90px_rgba(8,31,40,.3)]',
      role: 'alertdialog',
      'aria-modal': true,
      'aria-labelledby': 'fadaa-confirm-title',
    }, [
      createElement('div', { className: 'flex items-start gap-4 p-6', key: 'body' }, [
        createElement('span', { className: `grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${style.icon}`, key: 'icon' }, createElement(Icon, { size: 22 })),
        createElement('div', { className: 'min-w-0 flex-1', key: 'copy' }, [
          createElement('h2', { id: 'fadaa-confirm-title', className: 'text-xl font-black text-slate-950', key: 'title' }, title),
          createElement('p', { className: 'mt-2 text-sm leading-6 text-slate-600', key: 'message' }, message),
        ]),
        createElement('button', { className: 'rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700', onClick: () => close(false), 'aria-label': 'Fermer', key: 'close' }, createElement(X, { size: 18 })),
      ]),
      createElement('div', { className: 'flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:justify-end', key: 'actions' }, [
        createElement('button', { className: 'rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50', onClick: () => close(false), key: 'cancel' }, cancelLabel),
        createElement('button', { className: `rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition focus:outline-none focus:ring-4 ${style.button}`, onClick: () => close(true), autoFocus: true, key: 'confirm' }, confirmLabel),
      ]),
    ])))
  })
}

type ToastTone = 'success' | 'error' | 'info'

export function showToast(message: string, tone: ToastTone = 'info') {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? AlertTriangle : Info
  const colors = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-blue-200 bg-blue-50 text-blue-800'
  const close = () => { root.unmount(); host.remove() }
  root.render(createElement('div', { className: 'pointer-events-none fixed inset-x-4 top-5 z-[1100] flex justify-center' },
    createElement('div', { className: `pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl ${colors}`, role: tone === 'error' ? 'alert' : 'status' }, [
      createElement(Icon, { size: 20, className: 'mt-0.5 shrink-0', key: 'icon' }),
      createElement('p', { className: 'min-w-0 flex-1 text-sm font-bold leading-5', key: 'message' }, message),
      createElement('button', { onClick: close, className: 'rounded-lg p-1 opacity-60 hover:bg-white/60 hover:opacity-100', 'aria-label': 'Fermer', key: 'close' }, createElement(X, { size: 16 })),
    ])))
  window.setTimeout(close, 5000)
}
