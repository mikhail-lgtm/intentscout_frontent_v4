import { useEffect, useMemo, useRef, useState } from 'react'
import type { AdminActivityLog } from '../../types/admin'

interface LogsViewerProps {
  logs: AdminActivityLog[]
  loading?: boolean
  error?: string | null
  autoScroll?: boolean
  onToggleAutoScroll?: () => void
  onClear?: () => void
  highlightLevel?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'DEBUG'
}

const levelColors: Record<string, string> = {
  DEBUG: 'text-sky-500',
  INFO: 'text-emerald-500',
  WARNING: 'text-amber-500',
  ERROR: 'text-rose-500',
  CRITICAL: 'text-rose-600',
}

export const LogsViewer = ({
  logs,
  loading,
  error,
  autoScroll = true,
  onToggleAutoScroll,
  onClear,
  highlightLevel,
}: LogsViewerProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true)

  useEffect(() => {
    if (!autoScroll || !isScrolledToBottom) return
    const container = containerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [logs, autoScroll, isScrolledToBottom])

  const onScroll = () => {
    const container = containerRef.current
    if (!container) return
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 64
    setIsScrolledToBottom(nearBottom)
  }

  return (
    <div className="border border-slate-200 rounded-xl bg-white h-[480px] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold uppercase tracking-wide ${autoScroll ? 'text-orange-600' : 'text-slate-500'}`}>
            {autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
          </span>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              Loading…
            </div>
          )}
          {error && (
            <span className="text-xs text-rose-500">{error}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleAutoScroll}
            className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Toggle scroll
          </button>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Clear
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto font-mono text-xs text-slate-700 px-4 py-3 space-y-2"
      >
        {logs.map(log => {
          const level = (log.category ?? log.action ?? 'INFO').toString().toUpperCase()
          const levelColor = levelColors[level] || 'text-slate-500'
          const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''
          const highlighted = highlightLevel && highlightLevel === level
          const endpoint = log.endpoint ?? ''
          const actionBadge = log.action ? log.action.toUpperCase() : null
          const description = log.description ?? ''

          return (
            <div
              key={`${log.id ?? log.timestamp}-${endpoint}-${actionBadge ?? ''}`}
              className={`rounded-lg px-3 py-2 border ${highlighted ? 'border-orange-300 bg-orange-50/50' : 'border-slate-200'}`}
            >
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="text-slate-400">{timestamp}</span>
                {actionBadge && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-600 uppercase tracking-wide">
                    {actionBadge}
                  </span>
                )}
                <span className={`font-semibold ${levelColor}`}>{level}</span>
                {endpoint && <span className="text-slate-500">{endpoint}</span>}
                <span className="text-slate-400">{log.method}</span>
                <span className="text-slate-400">{log.status_code}</span>
              </div>
              {description && (
                <p className="mt-1 text-slate-700">{description}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                {log.organization_id && <span>org={log.organization_id}</span>}
                {log.user_id && <span>user={log.user_id}</span>}
                {log.response_time_ms && <span>{log.response_time_ms.toFixed(1)} ms</span>}
                {log.ip_address && <span>{log.ip_address}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
