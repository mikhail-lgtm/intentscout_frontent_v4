import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../lib/api/admin'
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

export const LogsPage = () => {
  const [activeTab, setActiveTab] = useState<TabId>('api')
  const [autoScroll, setAutoScroll] = useState(true)
  const [initialApiLogs, setInitialApiLogs] = useState<AdminActivityLog[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [initialLoaded, setInitialLoaded] = useState(false)

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

  useEffect(() => {
    if (!token || initialLoaded) return
    const loadInitial = async () => {
      const response = await adminApi.logs.recent(100)
      if (response.data) {
        setInitialApiLogs(response.data as AdminActivityLog[])
      }
      setInitialLoaded(true)
    }
    void loadInitial()
  }, [token, initialLoaded])

  useEffect(() => {
    if (!token) {
      setInitialApiLogs([])
      setInitialLoaded(false)
    }
  }, [token])

  const apiStream = useEventSource<AdminActivityLog>({
    endpoint: token ? `${API_STREAM_ENDPOINT}?token=${encodeURIComponent(token)}` : null,
    mapItem: (value) => (value ? (value as AdminActivityLog) : null),
    mapSnapshot: (value) => Array.isArray(value) ? (value as AdminActivityLog[]) : [],
  })

  const intentspyStream = useEventSource<AdminActivityLog>({
    endpoint: token ? `${INTENTSPY_STREAM_ENDPOINT}?token=${encodeURIComponent(token)}` : null,
    mapItem: (value) => (value ? (value as AdminActivityLog) : null),
    mapSnapshot: (value) => Array.isArray(value) ? (value as AdminActivityLog[]) : [],
    autoReconnect: true,
  })

  useEffect(() => {
    if (!token) {
      apiStream.clear()
      intentspyStream.clear()
    }
  }, [token])

  const apiLogs = useMemo(() => [...initialApiLogs, ...apiStream.data], [initialApiLogs, apiStream.data])

  const renderContent = () => {
    if (activeTab === 'api') {
      return (
        <LogsViewer
          logs={apiLogs}
          loading={!apiStream.connected}
          error={apiStream.error}
          autoScroll={autoScroll}
          onToggleAutoScroll={() => setAutoScroll(prev => !prev)}
          onClear={() => {
            apiStream.clear()
            setInitialApiLogs([])
          }}
        />
      )
    }

    return (
      <LogsViewer
        logs={intentspyStream.data}
        loading={!intentspyStream.connected}
        error={intentspyStream.error}
        autoScroll={autoScroll}
        onToggleAutoScroll={() => setAutoScroll(prev => !prev)}
        onClear={() => intentspyStream.clear()}
      />
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Real-time logs</h2>
          <p className="text-sm text-slate-500">
            Stream of product activity and IntentSpy pipeline logs. Auto-scroll can be toggled per viewer.
          </p>
        </div>
      </header>

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

      {renderContent()}
    </div>
  )
}
