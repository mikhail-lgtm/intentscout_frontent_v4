import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface TabItem {
  key: string
  label: ReactNode
  icon?: ReactNode
}

interface TabsProps {
  tabs: TabItem[]
  active: string
  onChange: (key: string) => void
  className?: string
}

export const Tabs = ({ tabs, active, onChange, className }: TabsProps) => (
  <div className={cn('flex items-center gap-1 border-b border-slate-200', className)}>
    {tabs.map((t) => (
      <button
        key={t.key}
        type="button"
        onClick={() => onChange(t.key)}
        className={cn(
          'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
          active === t.key
            ? 'border-orange-500 text-orange-600'
            : 'border-transparent text-slate-500 hover:text-slate-800',
        )}
      >
        {t.icon}
        {t.label}
      </button>
    ))}
  </div>
)
