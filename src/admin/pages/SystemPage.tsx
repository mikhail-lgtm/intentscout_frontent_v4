import { useCallback, useEffect, useState } from 'react'
import { Database, Cloud, Radar } from 'lucide-react'
import { adminApi } from '../../lib/api/admin'
import type { SystemHealthResponse } from '../../types/admin'

const badgeClasses = (status: string) => {
  const normalized = status.toLowerCase()
  if (normalized === 'healthy') return 'bg-emerald-100 text-emerald-700'
  if (normalized === 'unknown') return 'bg-slate-200 text-slate-600'
  return 'bg-red-100 text-red-700'
}

const latencyBarColor = (ms: number | undefined) => {
  if (ms === undefined) return 'bg-slate-300'
  if (ms < 50) return 'bg-emerald-500'
  if (ms < 200) return 'bg-amber-500'
  return 'bg-red-500'
}

const iconBgClasses = (status: string) => {
  const normalized = status.toLowerCase()
  if (normalized === 'healthy') return 'bg-emerald-100 text-emerald-600'
  return 'bg-red-100 text-red-600'
}

const SERVICE_ICONS: Record<string, typeof Database> = {
  MongoDB: Database,
  Supabase: Cloud,
  IntentSpy: Radar,
}

export const SystemPage = () => {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await adminApi.system.health()
      if (!response.data) {
        setError(response.error ?? 'Failed to load system health')
        setHealth(null)
      } else {
        setHealth(response.data)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load system health')
      setHealth(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Checking system health...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-semibold">Failed to load system status</p>
        <p className="text-sm mt-2">{error}</p>
        <button
          onClick={() => void load()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!health) {
    return null
  }

  const services = [
    {
      name: 'MongoDB',
      status: health.mongodb.status,
      latency: health.mongodb.latency_ms,
      detail: health.mongodb.detail,
    },
    {
      name: 'Supabase',
      status: health.supabase.status,
      latency: health.supabase.latency_ms,
      detail: health.supabase.detail,
    },
  ]

  const intentspy = health.intentspy
  const intentspyStatus = intentspy.status?.toLowerCase() ?? 'unknown'

  const allHealthy = services.every(s => s.status.toLowerCase() === 'healthy')
    && (intentspyStatus === 'idle' || intentspyStatus === 'running' || intentspyStatus === 'completed')
  const overallBorderColor = allHealthy ? 'border-emerald-300' : 'border-red-300'
  const overallBgColor = allHealthy ? 'bg-emerald-50' : 'bg-red-50'
  const overallTextColor = allHealthy ? 'text-emerald-700' : 'text-red-700'
  const overallLabel = allHealthy ? 'All Systems Healthy' : 'Service Issues Detected'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">System Health</h2>
          <p className="text-sm text-slate-500 mt-1">Realtime connectivity checks for critical services.</p>
        </div>
        <button
          onClick={() => void load()}
          className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {/* Overall status card */}
      <div className={`rounded-xl border ${overallBorderColor} ${overallBgColor} p-6 shadow-sm`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Overall Status</p>
            <p className={`mt-1 text-lg font-bold ${overallTextColor}`}>{overallLabel}</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              API {health.api.status}
            </div>
            <div className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 uppercase tracking-wide">
              {new Date(health.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Service cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {services.map(service => {
          const Icon = SERVICE_ICONS[service.name] ?? Database
          const latencyPct = typeof service.latency === 'number'
            ? Math.min((service.latency / 500) * 100, 100)
            : 0

          return (
            <div key={service.name} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              {/* Icon + name + badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconBgClasses(service.status)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">{service.name}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClasses(service.status)}`}>
                  {service.status}
                </span>
              </div>

              {/* Latency section */}
              <div className="mt-4 space-y-2">
                {typeof service.latency === 'number' ? (
                  <>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Latency</p>
                    <p className="text-lg font-bold text-slate-900">{service.latency.toFixed(2)} ms</p>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all ${latencyBarColor(service.latency)}`}
                        style={{ width: `${latencyPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>0ms</span>
                      <span>Fast &lt;50ms</span>
                      <span>500ms+</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Latency</p>
                    <p className="text-lg font-bold text-slate-900">--</p>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-slate-300" style={{ width: '0%' }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>0ms</span>
                      <span>Fast &lt;50ms</span>
                      <span>500ms+</span>
                    </div>
                  </>
                )}
              </div>

              {/* Detail */}
              <p className="mt-3 text-sm text-slate-500">{service.detail ?? 'No issues detected.'}</p>
            </div>
          )
        })}
      </div>

      {/* IntentSpy Pipeline card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
              intentspyStatus === 'running' ? 'bg-orange-100 text-orange-600' :
              intentspyStatus === 'completed' ? 'bg-emerald-100 text-emerald-600' :
              intentspyStatus === 'failed' ? 'bg-red-100 text-red-600' :
              'bg-slate-100 text-slate-500'
            }`}>
              <Radar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">IntentSpy Pipeline</p>
              <p className="text-xs text-slate-400">Data processing pipeline</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            intentspyStatus === 'running' ? 'bg-orange-100 text-orange-700' :
            intentspyStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' :
            intentspyStatus === 'failed' ? 'bg-red-100 text-red-700' :
            'bg-slate-200 text-slate-600'
          }`}>
            {intentspy.status ?? 'unknown'}
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{intentspy.status ?? '--'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Run ID</p>
            <p className="mt-1 text-sm font-mono text-slate-700">{intentspy.run_id ?? '--'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">PID</p>
            <p className="mt-1 text-sm font-mono text-slate-700">{intentspy.pid ?? '--'}</p>
          </div>
        </div>

        {intentspy.detail && (
          <p className="mt-3 text-sm text-slate-500">{intentspy.detail}</p>
        )}
      </div>
    </div>
  )
}
