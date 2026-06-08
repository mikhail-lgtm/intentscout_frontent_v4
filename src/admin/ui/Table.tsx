import type { HTMLAttributes, ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export const Table = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
    <table className={cn('min-w-full divide-y divide-slate-200 text-sm', className)}>{children}</table>
  </div>
)

export const THead = ({ children }: { children: ReactNode }) => (
  <thead className="bg-slate-50">{children}</thead>
)

export const TBody = ({ children }: { children: ReactNode }) => (
  <tbody className="divide-y divide-slate-100">{children}</tbody>
)

export const TR = ({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('transition-colors hover:bg-slate-50/70', className)} {...props}>
    {children}
  </tr>
)

export const TH = ({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn('px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500', className)}
    {...props}
  >
    {children}
  </th>
)

export const TD = ({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('whitespace-nowrap px-4 py-3 text-slate-700', className)} {...props}>
    {children}
  </td>
)
