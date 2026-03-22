import { useEffect, useMemo, useState } from 'react'
import type { AdminActivityLog } from '../../types/admin'
import { LogsViewer } from '../components/LogsViewer'
import { useEventSource } from '../../hooks/useEventSource'
import { supabase } from '../../lib/supabase'

const API_STREAM_ENDPOINT = `/admin/logs/api/stream`
const INTENTSPY_STREAM_ENDPOINT = `/admin/intentspy/logs/stream`

const TABS = [
  { id: 'api', label: 'API activity' },
  { id: 'intentspy', label: 'IntentSpy' },
]

type TabId = typeof TABS[number]['id']

const mapItemFn = (value: unknown): AdminActivityLog | null => {
  return value ? (value as AdminActivityLog) : null
}

const mapSnapshotFn = (value: unknown): AdminActivityLog[] => {
  return Array.isArray(value) ? (value as AdminActivityLog[]) : []
}

const selectClasses = 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-orange-500 focus:outline-none'
const inputClasses = 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-orange-500 focus:outline-none'

export const LogsPage = () => {
  const [activeTab, setActiveTab] = useState<TabId>('api')
  const [autoScroll, setAutoScroll] = useState(true)
  const [token, setToken] = useState<string | null>(null)

  const [methodFilter, setMethodFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [endpointFilter, setEndpointFilter] = useState('')

  useEffect(() => {
    let cancelled = false

    const resolveSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!cancelled) {
        setToken(data.session?.access_token ?? null)
      }
    }

    void resolveSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      if (!cancelled) {
        setToken(session?.access_token ?? null)
      }
    })

    return () => {
      cancelled = true
      authListener.subscription.unsubscribe()
    }
  }, [])

  const apiStream = useEventSource<AdminActivityLog>({
    endpoint: token ? `${API_STREAM_ENDPOINT}?token=${encodeURIComponent(token)}` : null,
    mapItem: mapItemFn,
    mapSnapshot: mapSnapshotFn,
  })

  const intentspyStream = useEventSource<AdminActivityLog>({
    endpoint: token ? `${INTENTSPY_STREAM_ENDPOINT}?token=${encodeURIComponent(token)}` : null,
    mapItem: mapItemFn,
    mapSnapshot: mapSnapshotFn,
    autoReconnect: true,
  })

  useEffect(() => {
    if (!token) {
      apiStream.clear()
      intentspyStream.clear()
    }
  }, [token])

  const activeStream = activeTab === 'api' ? apiStream : intentspyStream
  const connected = activeStream.connected

  const filteredLogs = useMemo(() => {
    let logs = activeTab === 'api' ? apiStream.data : intentspyStream.data
    if (methodFilter) logs = logs.filter(l => l.method === methodFilter)
    if (statusFilter === '2xx') logs = logs.filter(l => l.status_code != null && l.status_code >= 200 && l.status_code < 300)
    if (statusFilter === '4xx') logs = logs.filter(l => l.status_code != null && l.status_code >= 400 && l.status_code < 500)
    if (statusFilter === '5xx') logs = logs.filter(l => l.status_code != null && l.status_code >= 500)
    if (endpointFilter) logs = logs.filter(l => l.endpoint?.toLowerCase().includes(endpointFilter.toLowerCase()))
    return logs
  }, [activeTab, apiStream.data, intentspyStream.data, methodFilter, statusFilter, endpointFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Real-time Logs</h2>
          <p className="text-sm text-slate-500 mt-1">
            Stream of product activity and IntentSpy pipeline logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="text-xs text-slate-500">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Tabs on left */}
        <div className="flex items-center gap-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white shadow'
                  : 'border border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters on right */}
        <div className="flex items-center gap-2">
          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
            className={selectClasses}
          >
            <option value="">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className={selectClasses}
          >
            <option value="">All Status</option>
            <option value="2xx">2xx</option>
            <option value="4xx">4xx</option>
            <option value="5xx">5xx</option>
          </select>
          <input
            type="text"
            value={endpointFilter}
            onChange={e => setEndpointFilter(e.target.value)}
            placeholder="Filter endpoints..."
            className={inputClasses}
          />
        </div>
      </div>

      {/* Logs viewer */}
      <LogsViewer
        logs={filteredLogs}
        loading={!connected}
        error={activeStream.error}
        autoScroll={autoScroll}
        onToggleAutoScroll={() => setAutoScroll(prev => !prev)}
        onClear={() => activeStream.clear()}
      />
    </div>
  )
}
