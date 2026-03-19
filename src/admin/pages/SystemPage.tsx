import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../lib/api/admin'
import type { SystemHealthResponse } from '../../types/admin'

const badgeClasses = (status: string) => {
  const normalized = status.toLowerCase()
  if (normalized === 'healthy') return 'bg-emerald-100 text-emerald-700'
  if (normalized === 'unknown') return 'bg-slate-200 text-slate-600'
  return 'bg-red-100 text-red-700'
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
    {
      name: 'IntentSpy',
      status: health.intentspy.status,
      detail: health.intentspy.detail ?? 'Real-time integration not yet connected.',
    },
  ]

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

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Last checked</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{new Date(health.timestamp).toLocaleString()}</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              API {health.api.status}
            </div>
            <div className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Auto-refresh disabled
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map(service => (
          <div key={service.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">{service.name}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClasses(service.status)}`}>
                {service.status}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {typeof service.latency === 'number' && (
                <p className="text-sm text-slate-500">Latency: {service.latency.toFixed(2)} ms</p>
              )}
              <p className="text-sm text-slate-500">{service.detail ?? 'No issues detected.'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
