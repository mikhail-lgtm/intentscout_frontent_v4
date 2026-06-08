import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

type Tone = 'default' | 'accent' | 'success' | 'danger'

interface StatCardProps {
  label: ReactNode
  value: ReactNode
  icon?: ReactNode
  hint?: ReactNode
  tone?: Tone
  className?: string
}

const iconTone: Record<Tone, string> = {
  default: 'bg-slate-100 text-slate-500',
  accent: 'bg-orange-100 text-orange-600',
  success: 'bg-emerald-100 text-emerald-600',
  danger: 'bg-red-100 text-red-600',
}

export const StatCard = ({ label, value, icon, hint, tone = 'default', className }: StatCardProps) => (
  <div className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
    <div className="flex items-center gap-3">
      {icon && (
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconTone[tone])}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold text-slate-900">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  </div>
)
