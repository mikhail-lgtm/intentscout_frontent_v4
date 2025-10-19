import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../lib/api/admin'
import type { SystemHealthResponse } from '../../types/admin'

interface DashboardStats {
  totalUsers: number | null
  totalOrganizations: number | null
}

const statusColor = (status: string) => {
  const normalized = status.toLowerCase()
  if (normalized === 'healthy') return 'bg-emerald-100 text-emerald-700'
  if (normalized === 'unknown') return 'bg-slate-200 text-slate-700'
  return 'bg-red-100 text-red-700'
}

export const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats>({ totalUsers: null, totalOrganizations: null })
  const [health, setHealth] = useState<SystemHealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [usersRes, orgRes, healthRes] = await Promise.all([
          adminApi.users.list(1, 25),
          adminApi.organizations.list(1, 25),
          adminApi.system.health(),
        ])

        if (!active) return

        if (!usersRes.data) {
          throw new Error(usersRes.error || 'Failed to load users summary')
        }
        if (!orgRes.data) {
          throw new Error(orgRes.error || 'Failed to load organizations summary')
        }
        if (!healthRes.data) {
          throw new Error(healthRes.error || 'Failed to load system health')
        }

        setStats({
          totalUsers: usersRes.data.total ?? usersRes.data.users.length,
          totalOrganizations: orgRes.data.total,
        })
        setHealth(healthRes.data)
      } catch (loadError) {
        if (!active) return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard data')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadData()
    return () => { active = false }
  }, [])

  const healthItems = useMemo(() => {
    if (!health) return []
    return [
      {
        key: 'API',
        status: health.api.status,
        detail: 'FastAPI service is running',
      },
      {
        key: 'MongoDB',
        status: health.mongodb.status,
        detail: health.mongodb.detail ?? `Latency: ${health.mongodb.latency_ms ?? 0} ms`,
      },
      {
        key: 'Supabase',
        status: health.supabase.status,
        detail: health.supabase.detail ?? `Latency: ${health.supabase.latency_ms ?? 0} ms`,
      },
      {
        key: 'IntentSpy',
        status: health.intentspy.status,
        detail: health.intentspy.detail ?? 'Integration coming soon',
      },
    ]
  }, [health])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-semibold">Failed to load admin dashboard</p>
        <p className="text-sm mt-2">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-lg font-semibold text-slate-900">Usage Overview</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Total users</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {stats.totalUsers ?? '—'}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Users registered across all organizations
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Organizations</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {stats.totalOrganizations ?? '—'}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Active customer organizations in MongoDB
            </p>
          </div>
          {health && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Last health check</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {new Date(health.timestamp).toLocaleString()}
              </p>
              <p className="mt-3 text-xs text-slate-400">
                Live status pulled directly from the API
              </p>
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900">System health</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {healthItems.map(item => (
            <div key={item.key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">{item.key}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-500">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

