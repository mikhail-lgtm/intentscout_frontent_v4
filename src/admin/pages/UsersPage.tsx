import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { adminApi } from '../../lib/api/admin'
import type {
  AdminOrganizationSummary,
  AdminUsageLeaderboardEntry,
  AdminUserSummary,
} from '../../types/admin'

const UNASSIGNED_KEY = '__unassigned__'
const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value)

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

type OrgUsageState = {
  loading: boolean
  data: AdminUsageLeaderboardEntry[]
  error?: string
}

const OrganizationAvatar = ({ logoUrl, name }: { logoUrl?: string | null; name?: string | null }) => {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name ?? 'Organization logo'}
        className="h-12 w-12 rounded-lg object-cover border border-slate-200"
      />
    )
  }

  const initial = name?.charAt(0)?.toUpperCase() ?? '?'
  return (
    <div className="h-12 w-12 rounded-lg border border-orange-200 bg-orange-100 text-orange-600 flex items-center justify-center text-lg font-semibold">
      {initial}
    </div>
  )
}

export const UsersPage = () => {
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [organizations, setOrganizations] = useState<AdminOrganizationSummary[]>([])
  const [orgUsage, setOrgUsage] = useState<Record<string, OrgUsageState>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [usersRes, orgRes] = await Promise.all([
      adminApi.users.list(1, 200),
      adminApi.organizations.list(1, 200),
    ])

    if (!usersRes.data) {
      setError(usersRes.error ?? 'Failed to load users')
      setUsers([])
    } else {
      setUsers(usersRes.data.users)
    }

    if (orgRes.data) {
      setOrganizations(orgRes.data.organizations)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const { usersByOrg, unassignedUsers } = useMemo(() => {
    const map: Record<string, AdminUserSummary[]> = {}
    const unassigned: AdminUserSummary[] = []

    users.forEach(user => {
      const orgs = user.organizations?.length ? user.organizations : []
      if (orgs.length === 0) {
        unassigned.push(user)
        return
      }
      orgs.forEach(orgId => {
        if (!map[orgId]) map[orgId] = []
        map[orgId].push(user)
      })
    })

    return { usersByOrg: map, unassignedUsers: unassigned }
  }, [users])

  const sortedOrganizations = useMemo(() => {
    return [...organizations].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  }, [organizations])

  const fetchUsage = useCallback(async (orgId: string, userCount: number) => {
    if (orgId === UNASSIGNED_KEY) return

    setOrgUsage(prev => ({
      ...prev,
      [orgId]: { loading: true, data: [], error: undefined },
    }))

    try {
      const response = await adminApi.analytics.usersUsage(orgId, Math.max(userCount, 20))
      setOrgUsage(prev => ({
        ...prev,
        [orgId]: {
          loading: false,
          data: response.data ?? [],
          error: response.error ?? undefined,
        },
      }))
    } catch (err) {
      setOrgUsage(prev => ({
        ...prev,
        [orgId]: {
          loading: false,
          data: [],
          error: err instanceof Error ? err.message : 'Failed to load usage',
        },
      }))
    }
  }, [])

  const toggleOrganization = useCallback((orgId: string) => {
    const isExpanded = !!expanded[orgId]
    setExpanded(prev => ({ ...prev, [orgId]: !isExpanded }))

    if (!isExpanded && orgId !== UNASSIGNED_KEY) {
      const usageState = orgUsage[orgId]
      const hasData = usageState && usageState.data.length > 0 && !usageState.error
      if (!hasData) {
        const userCount = usersByOrg[orgId]?.length ?? 0
        void fetchUsage(orgId, userCount)
      }
    }
  }, [expanded, orgUsage, usersByOrg, fetchUsage])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading users…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 space-y-4">
        <div>
          <p className="font-semibold">Failed to load users</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => { void load() }}
          className="inline-flex items-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  const renderUsageBars = (entries: AdminUsageLeaderboardEntry[], resolveLabel: (userId?: string | null) => string) => {
    if (!entries.length) return null
    const maxCalls = entries.reduce((acc, entry) => Math.max(acc, entry.total_api_calls), 1)

    return (
      <div className="space-y-3">
        {entries.map(entry => {
          const width = `${(entry.total_api_calls / maxCalls) * 100}%`
          return (
            <div key={`${entry.user_id}-${entry.organization_id}`} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium text-slate-700">{resolveLabel(entry.user_id)}</span>
                <span>{formatNumber(entry.total_api_calls)} calls</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-orange-500" style={{ width }} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderOrganization = (org: AdminOrganizationSummary, orgId: string) => {
    const isExpanded = !!expanded[orgId]
    const orgUsers = orgId === UNASSIGNED_KEY ? unassignedUsers : (usersByOrg[orgId] ?? [])
    const usageState = orgUsage[orgId]
    const usageEntries = usageState?.data ?? []

    const metricsByUser: Record<string, AdminUsageLeaderboardEntry> = {}
    usageEntries.forEach(entry => {
      if (!entry.user_id) return
      if (entry.organization_id && entry.organization_id !== orgId) return
      metricsByUser[entry.user_id] = entry
    })

    const maxCalls = usageEntries.reduce((acc, entry) => Math.max(acc, entry.total_api_calls), 0)

    const resolveLabel = (userId?: string | null) => {
      if (!userId) return '—'
      const user = users.find(u => u.id === userId)
      return user?.email ?? userId
    }

    return (
      <div key={orgId} className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => toggleOrganization(orgId)}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <div className="flex items-center gap-4">
            <OrganizationAvatar logoUrl={org.logoUrl} name={org.name} />
            <div>
              <p className="text-base font-semibold text-slate-900">{org.name ?? 'Без названия'}</p>
              <p className="text-sm text-slate-500">
                {orgUsers.length} {orgUsers.length === 1 ? 'user' : 'users'} · {formatNumber(org.user_count)} total seats
              </p>
            </div>
          </div>
          {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-500" /> : <ChevronRight className="h-5 w-5 text-slate-500" />}
        </button>

        {isExpanded && (
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 space-y-6">
            {orgId !== UNASSIGNED_KEY && usageState?.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <div className="flex items-center justify-between">
                  <span>{usageState.error}</span>
                  <button
                    type="button"
                    className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                    onClick={() => {
                      const userCount = orgUsers.length
                      void fetchUsage(orgId, userCount)
                    }}
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {orgId !== UNASSIGNED_KEY && usageState?.loading && (
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                Loading usage metrics…
              </div>
            )}

            {orgId !== UNASSIGNED_KEY && !usageState?.loading && usageEntries.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Usage distribution</p>
                {renderUsageBars(usageEntries, resolveLabel)}
              </div>
            )}

            {orgUsers.length === 0 ? (
              <p className="text-sm text-slate-500">В этой компании пока нет пользователей.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Last sign-in</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">API calls</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Signals</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Contacts</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Emails</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Sequences</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Activity</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {orgUsers.map(user => {
                      const metrics = metricsByUser[user.id]
                      const totalCalls = metrics?.total_api_calls ?? 0
                      const signals = metrics?.signals_reviewed ?? 0
                      const contacts = metrics?.contacts_created ?? 0
                      const emails = metrics?.emails_generated ?? 0
                      const sequences = metrics?.sequences_created ?? 0
                      const width = maxCalls > 0 ? `${Math.max((totalCalls / maxCalls) * 100, 4)}%` : '0%'

                      return (
                        <tr key={`${orgId}-${user.id}`} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <Link
                              to={`/admin/users/${user.id}`}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              {user.email ?? '—'}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">{user.is_admin ? 'Admin' : 'User'}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{formatDate(user.last_sign_in_at)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatNumber(totalCalls)}</td>
                          <td className="px-4 py-3 text-sm text-slate-500 text-right">{formatNumber(signals)}</td>
                          <td className="px-4 py-3 text-sm text-slate-500 text-right">{formatNumber(contacts)}</td>
                          <td className="px-4 py-3 text-sm text-slate-500 text-right">{formatNumber(emails)}</td>
                          <td className="px-4 py-3 text-sm text-slate-500 text-right">{formatNumber(sequences)}</td>
                          <td className="px-4 py-3">
                            <div className="h-2 rounded-full bg-slate-200">
                              <div className="h-full rounded-full bg-orange-500" style={{ width }} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            <Link
                              to={`/admin/users/${user.id}`}
                              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Users by organization</h3>
          <p className="text-sm text-slate-500">{formatNumber(users.length)} users · {formatNumber(sortedOrganizations.length)} organizations</p>
        </div>
        <button
          type="button"
          onClick={() => { void load() }}
          className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {sortedOrganizations.map(org => renderOrganization(org, org.id))}

        {unassignedUsers.length > 0 && (
          renderOrganization(
            {
              id: UNASSIGNED_KEY,
              name: 'Без организации',
              state: null,
              primary_user_id: null,
              user_count: unassignedUsers.length,
              created_at: null,
              updated_at: null,
              logoUrl: null,
            },
            UNASSIGNED_KEY,
          )
        )}

        {sortedOrganizations.length === 0 && unassignedUsers.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Пользователи пока не найдены.
          </div>
        )}
      </div>
    </div>
  )
}
