import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, Cpu, Brain, ChevronRight, RefreshCw, Play, Square } from 'lucide-react'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { adminApi } from '../../lib/api/admin'
import type { BadgeTone } from '../ui'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../ui'

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

const statusTone = (s?: string): BadgeTone => {
  switch (s) {
    case 'running':
      return 'success'
    case 'completed':
      return 'info'
    case 'failed':
      return 'danger'
    case 'stopping':
      return 'warning'
    default:
      return 'neutral'
  }
}

const PIPELINE_STAGES = [
  { id: 'scraping', name: 'Scraping', description: 'Collect data per org', icon: Search },
  { id: 'embedding', name: 'Embedding', description: 'Embed jobs globally', icon: Cpu },
  { id: 'intent', name: 'Intent Calculation', description: 'Score per org', icon: Brain },
] as const

type StageStatus = 'pending' | 'running' | 'completed' | 'failed'

function deriveStageStatuses(status: PipelineStatus | null): StageStatus[] {
  if (!status) return ['pending', 'pending', 'pending']
  if (status.status === 'idle') return ['pending', 'pending', 'pending']
  if (status.status === 'completed') return ['completed', 'completed', 'completed']

  let activeIndex = -1
  if (status.current_step) {
    const match = status.current_step.match(/Step\s+(\d+)\/3/i)
    if (match) activeIndex = parseInt(match[1], 10) - 1
  }

  if (status.status === 'failed') {
    if (activeIndex < 0) return ['failed', 'pending', 'pending']
    return PIPELINE_STAGES.map((_, i) => (i < activeIndex ? 'completed' : i === activeIndex ? 'failed' : 'pending')) as StageStatus[]
  }
  if (activeIndex < 0) return ['running', 'pending', 'pending']
  return PIPELINE_STAGES.map((_, i) => (i < activeIndex ? 'completed' : i === activeIndex ? 'running' : 'pending')) as StageStatus[]
}

const stageStyles: Record<StageStatus, { border: string; bg: string; icon: string; label: string; labelText: string }> = {
  pending: { border: 'border-slate-200', bg: 'bg-slate-50', icon: 'text-slate-300', label: 'Pending', labelText: 'text-slate-400' },
  running: { border: 'border-orange-400 ring-2 ring-orange-200 animate-pulse', bg: 'bg-orange-50', icon: 'text-orange-500', label: 'Running...', labelText: 'text-orange-600' },
  completed: { border: 'border-emerald-400', bg: 'bg-emerald-50', icon: 'text-emerald-500', label: 'Done', labelText: 'text-emerald-600' },
  failed: { border: 'border-red-400', bg: 'bg-red-50', icon: 'text-red-500', label: 'Failed', labelText: 'text-red-600' },
}

function StageNode({ stage, stageStatus }: { stage: (typeof PIPELINE_STAGES)[number]; stageStatus: StageStatus }) {
  const s = stageStyles[stageStatus]
  const Icon = stage.icon
  return (
    <div className={`w-48 rounded-xl border-2 p-5 text-center transition-all ${s.border} ${s.bg}`}>
      <Icon className={`mx-auto h-8 w-8 ${s.icon}`} />
      <p className="mt-2 text-sm font-semibold">{stage.name}</p>
      <p className="mt-1 text-xs text-slate-500">{stage.description}</p>
      <p className={`mt-2 text-xs font-medium ${s.labelText}`}>{s.label}</p>
    </div>
  )
}

function Connector({ leftStatus, rightStatus }: { leftStatus: StageStatus; rightStatus: StageStatus }) {
  let color = 'text-slate-200'
  let lineColor = 'bg-slate-200'
  if (leftStatus === 'completed' && (rightStatus === 'completed' || rightStatus === 'running' || rightStatus === 'failed')) {
    color = 'text-emerald-400'
    lineColor = 'bg-emerald-400'
  } else if (leftStatus === 'running') {
    color = 'text-orange-400'
    lineColor = 'bg-orange-400'
  }
  return (
    <div className="flex flex-1 items-center px-2">
      <div className={`h-0.5 flex-1 transition-colors ${lineColor}`} />
      <ChevronRight className={`-ml-1 h-4 w-4 ${color}`} />
    </div>
  )
}

export const PipelinePage = () => {
  const [status, setStatus] = useState<PipelineStatus | null>(null)
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'start' | 'stop' | null>(null)
  const mountedRef = useRef(true)

  const [organization, setOrganization] = useState<'all' | 'customertimes' | 'intentscout'>('all')
  const [skipScraping, setSkipScraping] = useState(false)
  const [skipEmbedding, setSkipEmbedding] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [limit, setLimit] = useState(50)

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [runLogs, setRunLogs] = useState<{ timestamp: string; line: string }[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  const loadData = useCallback(async () => {
    setError(null)
    try {
      const [statusRes, runsRes] = await Promise.all([adminApi.pipeline.status(), adminApi.pipeline.runs()])
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

  const doStart = async () => {
    setConfirmAction(null)
    setActionLoading(true)
    setError(null)
    const res = await adminApi.pipeline.start({
      organization,
      skip_scraping: skipScraping,
      skip_embedding: skipEmbedding,
      limit: testMode ? limit : undefined,
      continue_on_fail: false,
    })
    if (res.error) setError(res.error)
    else await loadData()
    setActionLoading(false)
  }

  const doStop = async () => {
    setConfirmAction(null)
    setActionLoading(true)
    setError(null)
    const res = await adminApi.pipeline.stop()
    if (res.error) setError(res.error)
    else await loadData()
    setActionLoading(false)
  }

  const loadRunLogs = async (runId: string) => {
    setLogsLoading(true)
    setSelectedRunId(runId)
    const res = await adminApi.pipeline.runLogs(runId, 1000)
    if (res.data) setRunLogs(res.data as { timestamp: string; line: string }[])
    setLogsLoading(false)
  }

  const stageStatuses = useMemo(() => deriveStageStatuses(status), [status])
  const output = status?.recent_output ?? []
  const isRunning = status?.status === 'running'

  const runChartData = useMemo(() => {
    return runs
      .filter((run) => run.finished_at)
      .slice(0, 10)
      .reverse()
      .map((run) => {
        const durationMin = (new Date(run.finished_at!).getTime() - new Date(run.started_at).getTime()) / 60000
        return {
          name: new Date(run.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          duration: Number(durationMin.toFixed(1)),
          status: run.status,
        }
      })
  }, [runs])

  const formatDuration = (startedAt: string, finishedAt: string) => {
    const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
    const totalMin = Math.floor(ms / 60000)
    const sec = Math.floor((ms % 60000) / 1000)
    return totalMin < 1 ? `${sec}s` : `${totalMin}m ${sec}s`
  }

  if (loading) {
    return (
      <div className="py-16">
        <Spinner label="Loading pipeline status..." />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Control the IntentSpy data processing pipeline."
        actions={
          <Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void loadData()}>
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">Error</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader title="Pipeline flow" />
          <CardBody>
            <div className="flex items-center justify-center">
              {PIPELINE_STAGES.map((stage, i) => (
                <div key={stage.id} className="contents">
                  <StageNode stage={stage} stageStatus={stageStatuses[i]} />
                  {i < PIPELINE_STAGES.length - 1 && <Connector leftStatus={stageStatuses[i]} rightStatus={stageStatuses[i + 1]} />}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Status" actions={<Badge tone={statusTone(status?.status)}>{status?.status ?? 'unknown'}</Badge>} />
            <CardBody className="space-y-2 text-sm text-slate-600">
              {status?.pid != null && <p>PID: {status.pid}</p>}
              {status?.started_at && <p>Started: {new Date(status.started_at).toLocaleString()}</p>}
              {status?.uptime_seconds != null && (
                <p>
                  Uptime: {Math.floor(status.uptime_seconds / 60)}m {Math.floor(status.uptime_seconds % 60)}s
                </p>
              )}
              {status?.current_step && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Current step</p>
                  <p className="mt-1 font-medium text-slate-700">{status.current_step}</p>
                </div>
              )}
              {!status?.started_at && !status?.current_step && <p className="text-slate-400">Pipeline is idle.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Controls" />
            <CardBody className="space-y-4">
              <Field label="Organization">
                <Select value={organization} onChange={(e) => setOrganization(e.target.value as typeof organization)} disabled={isRunning}>
                  <option value="all">All organizations</option>
                  <option value="customertimes">Customertimes</option>
                  <option value="intentscout">IntentScout</option>
                </Select>
              </Field>

              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {[
                  { label: 'Skip scraping', value: skipScraping, set: setSkipScraping },
                  { label: 'Skip embedding', value: skipEmbedding, set: setSkipEmbedding },
                  { label: 'Test mode', value: testMode, set: setTestMode },
                ].map((cb) => (
                  <label key={cb.label} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={cb.value}
                      onChange={(e) => cb.set(e.target.checked)}
                      disabled={isRunning}
                      className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                    />
                    {cb.label}
                  </label>
                ))}
              </div>

              {testMode && (
                <Field label="Limit">
                  <Input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
                    min={1}
                    max={1000}
                    disabled={isRunning}
                  />
                </Field>
              )}

              {isRunning ? (
                <Button variant="danger" className="w-full" loading={actionLoading} leftIcon={<Square className="h-4 w-4" />} onClick={() => setConfirmAction('stop')}>
                  Stop pipeline
                </Button>
              ) : (
                <Button className="w-full" loading={actionLoading} leftIcon={<Play className="h-4 w-4" />} onClick={() => setConfirmAction('start')}>
                  Start pipeline
                </Button>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Run duration" description="Last 10 completed runs" />
          <CardBody>
            {runChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={runChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}m`} />
                  <Tooltip formatter={(v) => [`${Number(v)} min`, 'Duration']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="duration" radius={[6, 6, 0, 0]}>
                    {runChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.status === 'completed' ? '#10b981' : entry.status === 'failed' ? '#ef4444' : '#f97316'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No completed runs yet</p>
            )}
          </CardBody>
        </Card>

        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isRunning ? 'animate-pulse bg-emerald-500' : 'bg-slate-500'}`} />
              <h4 className="text-sm font-semibold text-white">Live output</h4>
            </div>
            <span className="text-xs text-slate-400">{output.length} lines</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto bg-slate-900 p-4 font-mono text-xs text-slate-100">
            {output.length > 0 ? (
              output.map((line, i) => (
                <div key={i} className={`py-0.5 ${line.includes('ERROR') ? 'text-red-400' : line.includes('WARNING') ? 'text-yellow-400' : line.includes('Step') ? 'font-bold text-green-400' : ''}`}>
                  {line}
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-slate-500">{isRunning ? 'Waiting for output...' : 'No output available'}</p>
            )}
          </div>
        </div>

        <Card>
          <CardHeader title="Run history" />
          <Table>
            <THead>
              <TR>
                <TH>Run ID</TH>
                <TH>Organization</TH>
                <TH>Status</TH>
                <TH>Started</TH>
                <TH>Duration</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {runs.length === 0 ? (
                <TR>
                  <TD className="text-center text-slate-400" colSpan={6}>
                    No pipeline runs yet
                  </TD>
                </TR>
              ) : (
                runs.slice(0, 20).map((run) => (
                  <TR key={run.run_id}>
                    <TD className="whitespace-nowrap font-medium text-slate-900">
                      {run.run_id}
                      {run.limit != null && (
                        <Badge tone="accent" className="ml-2">
                          test: {run.limit}
                        </Badge>
                      )}
                    </TD>
                    <TD className="text-slate-600">{run.organization}</TD>
                    <TD>
                      <Badge tone={statusTone(run.status)}>{run.status}</Badge>
                    </TD>
                    <TD className="whitespace-nowrap text-slate-600">{new Date(run.started_at).toLocaleString()}</TD>
                    <TD className="whitespace-nowrap text-slate-600">
                      {run.finished_at ? formatDuration(run.started_at, run.finished_at) : 'In progress...'}
                    </TD>
                    <TD className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => void loadRunLogs(run.run_id)}>
                        View logs
                      </Button>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>
      </div>

      <Modal
        open={selectedRunId !== null}
        onClose={() => {
          setSelectedRunId(null)
          setRunLogs([])
        }}
        size="xl"
        title="Pipeline logs"
        description={selectedRunId ?? undefined}
      >
        <div className="max-h-[60vh] overflow-y-auto rounded-lg bg-slate-900 p-4">
          {logsLoading ? (
            <div className="py-8 text-center text-slate-400">Loading logs...</div>
          ) : runLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-400">No logs found for this run</div>
          ) : (
            <div className="space-y-0.5 font-mono text-xs text-slate-100">
              {runLogs.map((log, i) => (
                <div key={i} className={log.line.includes('ERROR') ? 'text-red-400' : log.line.includes('WARNING') ? 'text-yellow-400' : log.line.includes('Step') ? 'font-bold text-green-400' : ''}>
                  <span className="mr-2 text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  {log.line}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={confirmAction === 'start' ? doStart : doStop}
        title={confirmAction === 'start' ? 'Start pipeline' : 'Stop pipeline'}
        message={
          confirmAction === 'start'
            ? `Start the pipeline for "${organization}"${testMode ? ` (test mode, limit ${limit})` : ''}?`
            : 'Stop the running pipeline?'
        }
        confirmLabel={confirmAction === 'start' ? 'Start' : 'Stop'}
        tone={confirmAction === 'stop' ? 'danger' : 'primary'}
        loading={actionLoading}
      />
    </div>
  )
}
