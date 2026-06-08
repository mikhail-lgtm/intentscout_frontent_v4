import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  accent: 'bg-orange-100 text-orange-700',
}

interface BadgeProps {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}

export const Badge = ({ tone = 'neutral', className, children }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
      toneClasses[tone],
      className,
    )}
  >
    {children}
  </span>
)
