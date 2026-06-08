import { useEffect, useMemo, useState } from 'react'
import { Activity as ActivityIcon } from 'lucide-react'
import { adminApi } from '../../lib/api/admin'
import type { AdminActivityLog } from '../../types/admin'
import { Badge, Card, EmptyState, PageHeader, Select, Spinner, Tabs } from '../ui'
import { LogsPage } from './LogsPage'

const fmtTime = (v?: string | null): string => {
  if (!v) return '-'
  const d = new Date(v)
  return Number.isNaN(d.getTime())
    ? '-'
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const ActionsFeed = () => {
  const [logs, setLogs] = useState<AdminActivityLog[]>([])
  const [userMap, setUserMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')

  const load = async () => {
    const [aRes, uRes] = await Promise.all([adminApi.users.activityRecent(100), adminApi.users.list(1, 100)])
    setLogs(aRes.data ?? [])
    const m: Record<string, string> = {}
    ;(uRes.data?.users ?? []).forEach((u) => {
      if (u.id) m[u.id] = u.email ?? u.id
    })
    setUserMap(m)
    setLoading(false)
  }

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 15000)
    return () => clearInterval(t)
  }, [])

  const actions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action).filter((a): a is string => Boolean(a)))),
    [logs],
  )
  const filtered = useMemo(
    () => (actionFilter ? logs.filter((l) => l.action === actionFilter) : logs),
    [logs, actionFilter],
  )

  if (loading) {
    return (
      <div className="py-16">
        <Spinner label="Loading activity..." />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="w-56">
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <span className="text-sm text-slate-500">{filtered.length} events</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ActivityIcon className="h-6 w-6" />}
          title="No activity yet"
          description="User actions (reviewing signals, creating contacts, generating emails) will appear here as they happen."
        />
      ) : (
        <Card>
          {filtered.map((l, i) => {
            const email = (l.user_id && userMap[l.user_id]) || l.user_id || 'Someone'
            const desc = l.description || l.action || l.category || 'performed an action'
            const ok = (l.status_code ?? 0) < 400
            return (
              <div
                key={l.id ?? i}
                className="flex items-start gap-3 border-b border-slate-100 px-5 py-3 last:border-0"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                  <ActivityIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800">
                    <span className="font-medium">{email}</span> - {desc}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-slate-400">
                    {l.method} {l.endpoint}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge tone={ok ? 'success' : 'danger'}>{l.status_code ?? '-'}</Badge>
                  <p className="mt-1 text-xs text-slate-400">{fmtTime(l.timestamp)}</p>
                </div>
              </div>
            )
          })}
        </Card>
      )}
    </div>
  )
}

export const ActivityPage = () => {
  const [tab, setTab] = useState('actions')
  return (
    <div>
      <PageHeader title="Activity" description="What's happening on the site - user actions and live system logs." />
      <Tabs
        tabs={[
          { key: 'actions', label: 'Actions' },
          { key: 'logs', label: 'Live logs' },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-5"
      />
      {tab === 'actions' ? <ActionsFeed /> : <LogsPage embedded />}
    </div>
  )
}
