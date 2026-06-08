import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '../../utils/cn'

type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  tone: ToastTone
  message: ReactNode
}

interface ToastApi {
  success: (message: ReactNode) => void
  error: (message: ReactNode) => void
  info: (message: ReactNode) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const toneStyles: Record<ToastTone, { icon: ReactNode; border: string }> = {
  success: { icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />, border: 'border-emerald-200' },
  error: { icon: <AlertCircle className="h-5 w-5 text-red-500" />, border: 'border-red-200' },
  info: { icon: <Info className="h-5 w-5 text-blue-500" />, border: 'border-blue-200' },
}

let counter = 0

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (tone: ToastTone, message: ReactNode) => {
      counter += 1
      const id = counter
      setToasts((prev) => [...prev, { id, tone, message }])
      setTimeout(() => remove(id), 4500)
    },
    [remove],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg',
              toneStyles[t.tone].border,
            )}
          >
            <div className="mt-0.5 shrink-0">{toneStyles[t.tone].icon}</div>
            <div className="flex-1 text-sm text-slate-700">{t.message}</div>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = (): ToastApi => {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // No provider mounted - return a no-op so a missing provider never crashes a page.
    return { success: () => {}, error: () => {}, info: () => {} }
  }
  return ctx
}
