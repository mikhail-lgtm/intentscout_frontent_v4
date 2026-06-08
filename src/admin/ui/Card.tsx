import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

export const Card = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)} {...props}>
    {children}
  </div>
)

interface CardHeaderProps {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export const CardHeader = ({ title, description, actions, className }: CardHeaderProps) => (
  <div className={cn('flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4', className)}>
    <div>
      {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
      {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
)

export const CardBody = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn('px-5 py-4', className)}>{children}</div>
)
