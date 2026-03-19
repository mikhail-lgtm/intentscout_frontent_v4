import { useCallback, useEffect, useState } from 'react'
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

export const LogsPage = () => {
  const [activeTab, setActiveTab] = useState<TabId>('api')
  const [autoScroll, setAutoScroll] = useState(true)
  const [token, setToken] = useState<string | null>(null)

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

  const renderContent = () => {
    if (activeTab === 'api') {
      return (
        <LogsViewer
          logs={apiStream.data}
          loading={!apiStream.connected}
          error={apiStream.error}
          autoScroll={autoScroll}
          onToggleAutoScroll={() => setAutoScroll(prev => !prev)}
          onClear={() => apiStream.clear()}
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Real-time Logs</h2>
          <p className="text-sm text-slate-500 mt-1">
            Stream of product activity and IntentSpy pipeline logs.
          </p>
        </div>
      </div>

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
