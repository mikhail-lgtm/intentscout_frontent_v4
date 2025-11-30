import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../../lib/api/admin'

interface PipelineStatus {
  status: 'idle' | 'running' | 'stopping' | 'failed' | 'completed'
  run_id: string | null
  current_step: string | null
  started_at: string | null
  uptime_seconds: number | null
  recent_output: string[]
  pid: number | null
}

interface PipelineRun {
  run_id: string
  status: string
  organization: string
  skip_scraping: boolean
  skip_embedding: boolean
  limit: number | null
  continue_on_fail: boolean
  started_at: string
  finished_at: string | null
  exit_code: number | null
  error: string | null
}

const statusColors: Record<string, string> = {
  idle: 'bg-slate-200 text-slate-600',
  running: 'bg-emerald-100 text-emerald-700',
  stopping: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
}

export const PipelinePage = () => {
  const [status, setStatus] = useState<PipelineStatus | null>(null)
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Form state
  const [organization, setOrganization] = useState<'all' | 'customertimes' | 'intentscout'>('all')
  const [skipScraping, setSkipScraping] = useState(false)
  const [skipEmbedding, setSkipEmbedding] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [limit, setLimit] = useState(50)

  const loadData = useCallback(async () => {
    setError(null)
    try {
      const [statusRes, runsRes] = await Promise.all([
        adminApi.pipeline.status(),
        adminApi.pipeline.runs(),
      ])

      if (statusRes.data) {
        setStatus(statusRes.data as PipelineStatus)
      }
      if (runsRes.data) {
        setRuns(runsRes.data as PipelineRun[])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pipeline data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      void loadData()
    }, 5000)
    return () => clearInterval(interval)
  }, [loadData])

  const handleStart = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await adminApi.pipeline.start({
        organization,
        skip_scraping: skipScraping,
        skip_embedding: skipEmbedding,
        limit: testMode ? limit : undefined,
        continue_on_fail: false,
      })
      if (res.error) {
        setError(res.error)
      } else {
        await loadData()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start pipeline')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStop = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await adminApi.pipeline.stop()
      if (res.error) {
        setError(res.error)
      } else {
        await loadData()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to stop pipeline')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading pipeline status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">IntentSpy Pipeline</h3>
          <p className="text-sm text-slate-500">Control the data processing pipeline.</p>
        </div>
        <button
          type="button"
          onClick={() => { void loadData() }}
          className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Current Status */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Pipeline Status</p>
            <div className="flex items-center gap-3 mt-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusColors[status?.status || 'idle']}`}>
                {status?.status || 'unknown'}
              </span>
              {status?.pid && (
                <span className="text-sm text-slate-500">PID: {status.pid}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            {status?.started_at && (
              <>
                <p className="text-sm text-slate-500">Started</p>
                <p className="text-sm font-medium">{new Date(status.started_at).toLocaleString()}</p>
              </>
            )}
            {status?.uptime_seconds && (
              <p className="text-xs text-slate-400 mt-1">
                Uptime: {Math.floor(status.uptime_seconds / 60)}m {Math.floor(status.uptime_seconds % 60)}s
              </p>
            )}
          </div>
        </div>

        {status?.current_step && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">Current Step</p>
            <p className="text-sm font-medium mt-1">{status.current_step}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-900 mb-4">Pipeline Controls</h4>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Organization</label>
            <select
              value={organization}
              onChange={(e) => setOrganization(e.target.value as typeof organization)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              disabled={status?.status === 'running'}
            >
              <option value="all">All Organizations</option>
              <option value="customertimes">Customertimes</option>
              <option value="intentscout">IntentScout</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={skipScraping}
                onChange={(e) => setSkipScraping(e.target.checked)}
                disabled={status?.status === 'running'}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Skip Scraping</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={skipEmbedding}
                onChange={(e) => setSkipEmbedding(e.target.checked)}
                disabled={status?.status === 'running'}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Skip Embedding</span>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={testMode}
                onChange={(e) => setTestMode(e.target.checked)}
                disabled={status?.status === 'running'}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Test Mode</span>
            </label>
            {testMode && (
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Limit"
                min={1}
                max={1000}
                disabled={status?.status === 'running'}
              />
            )}
          </div>

          <div className="flex items-end gap-2">
            {status?.status === 'running' ? (
              <button
                type="button"
                onClick={() => { void handleStop() }}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {actionLoading ? 'Stopping...' : 'Stop Pipeline'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { void handleStart() }}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {actionLoading ? 'Starting...' : 'Start Pipeline'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Output */}
      {status?.recent_output && status.recent_output.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h4 className="text-sm font-semibold text-slate-900">Live Output</h4>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto font-mono text-xs bg-slate-900 text-slate-100 rounded-b-xl">
            {status.recent_output.map((line, i) => (
              <div key={i} className="py-0.5">{line}</div>
            ))}
          </div>
        </div>
      )}

      {/* Run History */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h4 className="text-sm font-semibold text-slate-900">Run History</h4>
        </div>
        <div className="divide-y divide-slate-100">
          {runs.length === 0 ? (
            <div className="p-4 text-sm text-slate-500 text-center">No pipeline runs yet</div>
          ) : (
            runs.slice(0, 10).map((run) => (
              <div key={run.run_id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{run.run_id}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[run.status] || statusColors.idle}`}>
                      {run.status}
                    </span>
                    {run.limit && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                        test: {run.limit}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {run.organization} | {new Date(run.started_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {run.finished_at ? (
                    <>
                      <p>Finished: {new Date(run.finished_at).toLocaleString()}</p>
                      {run.exit_code !== null && <p>Exit code: {run.exit_code}</p>}
                    </>
                  ) : (
                    <p>In progress...</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
