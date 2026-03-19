import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../lib/api/admin'
import type {
  AdminActivityLog,
  AdminAnalyticsOverview,
  AdminOrganizationSummary,
  AdminUsageLeaderboardEntry,
  AdminUserSummary,
  SystemHealthResponse,
} from '../../types/admin'

const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value)

const statusColor = (status: string) => {
  const normalized = status.toLowerCase()
  if (normalized === 'healthy') return 'bg-emerald-100 text-emerald-700'
  if (normalized === 'unknown') return 'bg-slate-200 text-slate-700'
  return 'bg-red-100 text-red-700'
}

export const DashboardPage = () => {
  const [overview, setOverview] = useState<AdminAnalyticsOverview | null>(null)
  const [health, setHealth] = useState<SystemHealthResponse | null>(null)
  const [recentActivity, setRecentActivity] = useState<AdminActivityLog[]>([])
  const [leaderboard, setLeaderboard] = useState<AdminUsageLeaderboardEntry[]>([])
  const [organizations, setOrganizations] = useState<AdminOrganizationSummary[]>([])
  const [selectedOrganization, setSelectedOrganization] = useState<string>('all')
  const [userLookup, setUserLookup] = useState<Record<string, AdminUserSummary>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshLeaderboard = useCallback(async (organizationId: string) => {
    const response = await adminApi.analytics.usersUsage(
      organizationId === 'all' ? undefined : organizationId,
      12
    )
    setLeaderboard(response.data ?? [])
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [overviewRes, usersRes, orgRes, healthRes, activityRes] = await Promise.all([
        adminApi.analytics.overview(),
        adminApi.users.list(1, 100),
        adminApi.organizations.list(1, 25),
        adminApi.system.health(),
        adminApi.users.activityRecent(8),
      ])

      if (!overviewRes.data) {
        throw new Error(overviewRes.error || 'Failed to load analytics overview')
      }
      if (!usersRes.data) {
        throw new Error(usersRes.error || 'Failed to load users summary')
      }
      if (!orgRes.data) {
        throw new Error(orgRes.error || 'Failed to load organizations summary')
      }
      if (!healthRes.data) {
        throw new Error(healthRes.error || 'Failed to load system health')
      }

      setOverview({
        ...overviewRes.data,
        total_users: overviewRes.data.total_users ?? usersRes.data.total ?? usersRes.data.users.length,
        total_organizations: orgRes.data.total,
      })
      setHealth(healthRes.data)
      setRecentActivity(activityRes.data ?? [])
      setOrganizations(orgRes.data.organizations)
      const map: Record<string, AdminUserSummary> = {}
      usersRes.data.users.forEach(user => {
        map[user.id] = user
      })
      setUserLookup(map)
      await refreshLeaderboard('all')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [refreshLeaderboard])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    void refreshLeaderboard(selectedOrganization)
  }, [selectedOrganization, refreshLeaderboard])

  const resolveUserLabel = useCallback((userId?: string | null) => {
    if (!userId) return '--'
    const user = userLookup[userId]
    return user?.email ?? userId
  }, [userLookup])

  const leaderboardMaxCalls = useMemo(() => {
    if (!leaderboard.length) {
      return 1
    }
    return leaderboard.reduce((acc, entry) => Math.max(acc, entry.total_api_calls), 1)
  }, [leaderboard])

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
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-semibold">Failed to load admin dashboard</p>
        <p className="text-sm mt-2">{error}</p>
        <button
          onClick={() => void loadData()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">
            Monitor platform health, usage, and services.
          </p>
        </div>
        <button
          onClick={() => void loadData()}
          className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      <section>
        <h3 className="text-lg font-semibold text-slate-900">Usage Overview</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total users</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {overview?.total_users != null ? formatNumber(overview.total_users) : '--'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Users registered across all organizations
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Organizations</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {overview?.total_organizations != null ? formatNumber(overview.total_organizations) : '--'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Active customer organizations in MongoDB
            </p>
          </div>
          {health && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Last health check</p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {new Date(health.timestamp).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Live status pulled directly from the API
              </p>
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900">Active Users</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Daily (DAU)</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(overview?.dau ?? 0)}</p>
            <p className="mt-1 text-xs text-slate-400">Unique users in the last 24 hours</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Weekly (WAU)</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(overview?.wau ?? 0)}</p>
            <p className="mt-1 text-xs text-slate-400">Active users over 7 days</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Monthly (MAU)</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(overview?.mau ?? 0)}</p>
            <p className="mt-1 text-xs text-slate-400">Active users over 30 days</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">API calls</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(overview?.total_api_calls ?? 0)}</p>
            <p className="mt-1 text-xs text-slate-400">All recorded requests</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-900">System Health</h3>
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

      <section>
        <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Endpoint</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-sm text-slate-500 text-center">No activity recorded yet.</td>
                </tr>
              ) : (
                recentActivity.map(event => (
                  <tr key={event.id ?? `${event.timestamp}-${event.endpoint}`}>
                    <td className="px-4 py-3 text-sm text-slate-600">{new Date(event.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{resolveUserLabel(event.user_id)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 break-all">{event.method} {event.endpoint}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{event.status_code ?? '--'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Top Users by Activity</h3>
          <div className="inline-flex items-center gap-2">
            <label className="text-sm text-slate-500" htmlFor="leaderboard-org">Organization:</label>
            <select
              id="leaderboard-org"
              value={selectedOrganization}
              onChange={event => setSelectedOrganization(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-orange-500 focus:outline-none"
            >
              <option value="all">All</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name ?? org.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          {leaderboard.length === 0 ? (
            <p className="text-sm text-slate-500">No data to display.</p>
          ) : (
            leaderboard.map(entry => {
              const width = `${(entry.total_api_calls / leaderboardMaxCalls) * 100}%`
              return (
                <div key={`${entry.user_id}-${entry.organization_id}`} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{resolveUserLabel(entry.user_id)}</p>
                    <p className="text-xs text-slate-500">{formatNumber(entry.total_api_calls)} calls</p>
                  </div>
                  <div className="h-3 rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-orange-500" style={{ width }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <span>Signals: {formatNumber(entry.signals_reviewed)}</span>
                    <span>Contacts: {formatNumber(entry.contacts_created)}</span>
                    <span>Emails: {formatNumber(entry.emails_generated)}</span>
                    <span>Sequences: {formatNumber(entry.sequences_created)}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
