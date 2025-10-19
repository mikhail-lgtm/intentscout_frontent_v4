import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../lib/api/admin'
import type { AdminUserSummary } from '../../types/admin'

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export const UsersPage = () => {
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const response = await adminApi.users.list(1, 50)
    if (!response.data) {
      setError(response.error ?? 'Failed to load users')
      setUsers([])
    } else {
      setUsers(response.data.users)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Users</h3>
          <p className="text-sm text-slate-500">First 50 users across all organizations.</p>
        </div>
        <button
          type="button"
          onClick={() => { void load() }}
          className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          Refresh
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Created</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Last sign-in</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Organizations</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 text-sm text-slate-700">{user.email ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{formatDate(user.created_at)}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{formatDate(user.last_sign_in_at)}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{user.organizations.length}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                    user.is_admin ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {user.is_admin ? 'Admin' : 'User'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
