import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, Cpu, Brain, ChevronRight } from 'lucide-react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { adminApi } from '../../lib/api/admin'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const statusColors: Record<string, string> = {
  idle: 'bg-slate-200 text-slate-600',
  running: 'bg-emerald-100 text-emerald-700',
  stopping: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
}

const PIPELINE_STAGES = [
  { id: 'scraping', name: 'Scraping', description: 'Collect data per org', icon: Search },
  { id: 'embedding', name: 'Embedding', description: 'Embed jobs globally', icon: Cpu },
  { id: 'intent', name: 'Intent Calculation', description: 'Score per org', icon: Brain },
] as const

type StageStatus = 'pending' | 'running' | 'completed' | 'failed'

/* ------------------------------------------------------------------ */
/*  Helper: derive stage statuses from pipeline state                 */
/* ------------------------------------------------------------------ */

function deriveStageStatuses(status: PipelineStatus | null): StageStatus[] {
  if (!status) return ['pending', 'pending', 'pending']

  if (status.status === 'idle') return ['pending', 'pending', 'pending']
  if (status.status === 'completed') return ['completed', 'completed', 'completed']

  // Parse "Step X/3" from current_step
  let activeIndex = -1
  if (status.current_step) {
    const match = status.current_step.match(/Step\s+(\d+)\/3/i)
    if (match) {
      activeIndex = parseInt(match[1], 10) - 1 // 0-based
    }
  }

  if (status.status === 'failed') {
    if (activeIndex < 0) return ['failed', 'pending', 'pending']
    return PIPELINE_STAGES.map((_, i) => {
      if (i < activeIndex) return 'completed'
      if (i === activeIndex) return 'failed'
      return 'pending'
    }) as StageStatus[]
  }

  // running / stopping
  if (activeIndex < 0) return ['running', 'pending', 'pending']
  return PIPELINE_STAGES.map((_, i) => {
    if (i < activeIndex) return 'completed'
    if (i === activeIndex) return 'running'
    return 'pending'
  }) as StageStatus[]
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

const stageStyles: Record<StageStatus, { border: string; bg: string; icon: string; label: string; labelText: string }> = {
  pending:   { border: 'border-slate-200', bg: 'bg-slate-50',    icon: 'text-slate-300',   label: 'Pending',    labelText: 'text-slate-400' },
  running:   { border: 'border-orange-400 ring-2 ring-orange-200 animate-pulse', bg: 'bg-orange-50', icon: 'text-orange-500', label: 'Running...', labelText: 'text-orange-600' },
  completed: { border: 'border-emerald-400', bg: 'bg-emerald-50', icon: 'text-emerald-500', label: 'Done',       labelText: 'text-emerald-600' },
  failed:    { border: 'border-red-400',    bg: 'bg-red-50',     icon: 'text-red-500',     label: 'Failed',     labelText: 'text-red-600' },
}

function StageNode({ stage, stageStatus }: { stage: typeof PIPELINE_STAGES[number]; stageStatus: StageStatus }) {
  const s = stageStyles[stageStatus]
  const Icon = stage.icon
  return (
    <div className={`w-48 rounded-xl border-2 p-5 text-center transition-all ${s.border} ${s.bg}`}>
      <Icon className={`h-8 w-8 mx-auto ${s.icon}`} />
      <p className="text-sm font-semibold mt-2">{stage.name}</p>
      <p className="text-xs text-slate-500 mt-1">{stage.description}</p>
      <p className={`text-xs font-medium mt-2 ${s.labelText}`}>{s.label}</p>
    </div>
  )
}

function Connector({ leftStatus, rightStatus }: { leftStatus: StageStatus; rightStatus: StageStatus }) {
  let color = 'text-slate-200'
  let lineColor = 'bg-slate-200'
  if (leftStatus === 'completed' && (rightStatus === 'completed' || rightStatus === 'running')) {
    color = 'text-emerald-400'
    lineColor = 'bg-emerald-400'
  } else if (leftStatus === 'completed' && rightStatus === 'failed') {
    color = 'text-emerald-400'
    lineColor = 'bg-emerald-400'
  } else if (leftStatus === 'running') {
    color = 'text-orange-400'
    lineColor = 'bg-orange-400'
  }
  return (
    <div className="flex-1 flex items-center px-2">
      <div className={`flex-1 h-0.5 transition-colors ${lineColor}`} />
      <ChevronRight className={`h-4 w-4 -ml-1 ${color}`} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export const PipelinePage = () => {
  const [status, setStatus] = useState<PipelineStatus | null>(null)
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const mountedRef = useRef(true)

  // Form state
  const [organization, setOrganization] = useState<'all' | 'customertimes' | 'intentscout'>('all')
  const [skipScraping, setSkipScraping] = useState(false)
  const [skipEmbedding, setSkipEmbedding] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [limit, setLimit] = useState(50)

  // Logs viewer state
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [runLogs, setRunLogs] = useState<{ timestamp: string; line: string }[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  /* ---- data loading ---- */

  const loadData = useCallback(async () => {
    setError(null)
    try {
      const [statusRes, runsRes] = await Promise.all([
        adminApi.pipeline.status(),
        adminApi.pipeline.runs(),
      ])
      if (!mountedRef.current) return
      if (statusRes.data) setStatus(statusRes.data as PipelineStatus)
      if (runsRes.data) setRuns(runsRes.data as PipelineRun[])
    } catch (e) {
      if (!mountedRef.current) return
      setError(e instanceof Error ? e.message : 'Failed to load pipeline data')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void loadData()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void loadData()
    }, 5000)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [loadData])

  /* ---- actions ---- */

  const handleStart = async () => {
    if (!confirm('Are you sure you want to start the pipeline?')) return
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
      if (res.error) setError(res.error)
      else await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start pipeline')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStop = async () => {
    if (!confirm('Are you sure you want to stop the pipeline?')) return
    setActionLoading(true)
    setError(null)
    try {
      const res = await adminApi.pipeline.stop()
      if (res.error) setError(res.error)
      else await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to stop pipeline')
    } finally {
      setActionLoading(false)
    }
  }

  const loadRunLogs = async (runId: string) => {
    setLogsLoading(true)
    setSelectedRunId(runId)
    try {
      const res = await adminApi.pipeline.runLogs(runId, 1000)
      if (res.data) setRunLogs(res.data as { timestamp: string; line: string }[])
    } catch (e) {
      console.error('Failed to load logs:', e)
    } finally {
      setLogsLoading(false)
    }
  }

  const handleModalKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelectedRunId(null)
      setRunLogs([])
    }
  }, [])

  /* ---- derived data ---- */

  const stageStatuses = useMemo(() => deriveStageStatuses(status), [status])

  const output = status?.recent_output ?? []

  const runChartData = useMemo(() => {
    return runs
      .filter(run => run.finished_at)
      .slice(0, 10)
      .reverse()
      .map(run => {
        const durationMin = (new Date(run.finished_at!).getTime() - new Date(run.started_at).getTime()) / 60000
        return {
          name: new Date(run.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          duration: Number(durationMin.toFixed(1)),
          status: run.status,
        }
      })
  }, [runs])

  /* ---- helpers ---- */

  const formatDuration = (startedAt: string, finishedAt: string) => {
    const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
    const totalMin = Math.floor(ms / 60000)
    const sec = Math.floor((ms % 60000) / 1000)
    if (totalMin < 1) return `${sec}s`
    return `${totalMin}m ${sec}s`
  }

  /* ---- loading state ---- */

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading pipeline status...</p>
        </div>
      </div>
    )
  }

  /* ---- render ---- */

  return (
    <div className="space-y-6">

      {/* ============================================================ */}
      {/* Section 1: Header                                            */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pipeline</h2>
          <p className="text-sm text-slate-500 mt-1">Control the IntentSpy data processing pipeline.</p>
        </div>
        <button
          onClick={() => void loadData()}
          className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
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

      {/* ============================================================ */}
      {/* Section 2: Pipeline Flow Diagram                             */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">Pipeline Flow</h3>
        <div className="flex items-center justify-center">
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={stage.id} className="contents">
              <StageNode stage={stage} stageStatus={stageStatuses[i]} />
              {i < PIPELINE_STAGES.length - 1 && (
                <Connector leftStatus={stageStatuses[i]} rightStatus={stageStatuses[i + 1]} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* Section 3: Status + Controls (2-column)                      */}
      {/* ============================================================ */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Left card -- Status */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Pipeline Status</p>
          <div className="flex items-center gap-3 mb-4">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusColors[status?.status || 'idle']}`}>
              {status?.status || 'unknown'}
            </span>
            {status?.pid && (
              <span className="text-sm text-slate-500">PID: {status.pid}</span>
            )}
          </div>
          {status?.started_at && (
            <div className="space-y-1 text-sm text-slate-600">
              <p>Started: {new Date(status.started_at).toLocaleString()}</p>
              {status.uptime_seconds != null && (
                <p>Uptime: {Math.floor(status.uptime_seconds / 60)}m {Math.floor(status.uptime_seconds % 60)}s</p>
              )}
            </div>
          )}
          {status?.current_step && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Current Step</p>
              <p className="text-sm font-medium mt-1">{status.current_step}</p>
            </div>
          )}
        </div>

        {/* Right card -- Controls */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Pipeline Controls</p>

          <div className="space-y-4">
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

            <div className="flex flex-wrap gap-x-6 gap-y-2">
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
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  disabled={status?.status === 'running'}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Test Mode</span>
              </label>
            </div>

            {testMode && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Limit</label>
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
              </div>
            )}

            <div>
              {status?.status === 'running' ? (
                <button
                  type="button"
                  onClick={() => { void handleStop() }}
                  disabled={actionLoading}
                  className="w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {actionLoading ? 'Stopping...' : 'Stop Pipeline'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { void handleStart() }}
                  disabled={actionLoading}
                  className="w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {actionLoading ? 'Starting...' : 'Start Pipeline'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Section 4: Run Duration Chart                                */}
      {/* ============================================================ */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Run Duration</h3>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {runChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={runChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}m`} />
                <Tooltip formatter={(v) => [`${Number(v)} min`, 'Duration']} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="duration" radius={[6, 6, 0, 0]}>
                  {runChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.status === 'completed' ? '#10b981' : entry.status === 'failed' ? '#ef4444' : '#f97316'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No completed runs yet</p>
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/* Section 5: Live Output Terminal                              */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${status?.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
            <h4 className="text-sm font-semibold text-white">Live Output</h4>
          </div>
          <span className="text-xs text-slate-400">{output.length} lines</span>
        </div>
        <div className="p-4 max-h-[400px] overflow-y-auto font-mono text-xs bg-slate-900 text-slate-100">
          {output.length > 0 ? (
            output.map((line, i) => (
              <div key={i} className={`py-0.5 ${line.includes('ERROR') ? 'text-red-400' : line.includes('WARNING') ? 'text-yellow-400' : line.includes('Step') ? 'text-green-400 font-bold' : ''}`}>
                {line}
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center py-6">
              {status?.status === 'running' ? 'Waiting for output...' : 'No output available'}
            </p>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* Section 6: Run History Table                                 */}
      {/* ============================================================ */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Run History</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Run ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Organization</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Started</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-sm text-slate-500 text-center">No pipeline runs yet</td>
                </tr>
              ) : (
                runs.slice(0, 20).map((run) => (
                  <tr key={run.run_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">
                      {run.run_id}
                      {run.limit != null && (
                        <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                          test: {run.limit}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{run.organization}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[run.status] || statusColors.idle}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {new Date(run.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {run.finished_at ? formatDuration(run.started_at, run.finished_at) : 'In progress...'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => { void loadRunLogs(run.run_id) }}
                        className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                      >
                        View Logs
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Logs Modal                                                   */}
      {/* ============================================================ */}
      {selectedRunId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onKeyDown={handleModalKeyDown}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Pipeline Logs</h3>
                <p className="text-xs text-slate-500">Run: {selectedRunId}</p>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedRunId(null); setRunLogs([]) }}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-900">
              {logsLoading ? (
                <div className="text-center text-slate-400 py-8">Loading logs...</div>
              ) : runLogs.length === 0 ? (
                <div className="text-center text-slate-400 py-8">No logs found for this run</div>
              ) : (
                <div className="font-mono text-xs text-slate-100 space-y-0.5">
                  {runLogs.map((log, i) => (
                    <div key={i} className={`${log.line.includes('ERROR') ? 'text-red-400' : log.line.includes('WARNING') ? 'text-yellow-400' : log.line.includes('Step') ? 'text-green-400 font-bold' : ''}`}>
                      <span className="text-slate-500 mr-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      {log.line}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-slate-200 text-right">
              <span className="text-xs text-slate-500 mr-4">{runLogs.length} lines</span>
              <button
                type="button"
                onClick={() => { setSelectedRunId(null); setRunLogs([]) }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
