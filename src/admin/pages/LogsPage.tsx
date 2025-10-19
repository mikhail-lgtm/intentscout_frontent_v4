import { useMemo, useState } from 'react'
import { adminApi } from '../../lib/api/admin'
import type { AdminActivityLog } from '../../types/admin'
import { LogsViewer } from '../components/LogsViewer'
import { useEventSource } from '../../hooks/useEventSource'

const API_STREAM_ENDPOINT = `/admin/logs/api/stream`
const INTENTSPY_STREAM_ENDPOINT = `/admin/intentspy/logs/stream`

const TABS = [
  { id: 'api', label: 'API activity' },
  { id: 'intentspy', label: 'IntentSpy' },
]

type TabId = typeof TABS[number]['id']

const parseData = (data: string): AdminActivityLog => {
  return JSON.parse(data) as AdminActivityLog
}

export const LogsPage = () => {
  const [activeTab, setActiveTab] = useState<TabId>('api')
  const [autoScroll, setAutoScroll] = useState(true)
  const [initialApiLogs, setInitialApiLogs] = useState<AdminActivityLog[]>([])

  const apiStream = useEventSource<AdminActivityLog>({
    endpoint: API_STREAM_ENDPOINT,
    parse: parseData,
    onOpen: async () => {
      const response = await adminApi.logs.recent(100)
      if (response.data) {
        setInitialApiLogs(response.data as AdminActivityLog[])
      }
    },
  })

  const intentspyStream = useEventSource<AdminActivityLog>({
    endpoint: INTENTSPY_STREAM_ENDPOINT,
    parse: parseData,
    autoReconnect: true,
  })

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
