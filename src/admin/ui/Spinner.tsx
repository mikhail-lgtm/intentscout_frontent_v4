import { Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'

interface SpinnerProps {
  className?: string
  label?: string
}

export const Spinner = ({ className, label }: SpinnerProps) => (
  <div className="flex items-center justify-center gap-3 text-slate-500">
    <Loader2 className={cn('h-5 w-5 animate-spin text-orange-500', className)} />
    {label && <span className="text-sm">{label}</span>}
  </div>
)
