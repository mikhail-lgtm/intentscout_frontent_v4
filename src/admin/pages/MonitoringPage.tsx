import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, Briefcase, Database, RefreshCw, Signal } from 'lucide-react'
import { adminApi } from '../../lib/api/admin'
import type { MonitoringSummary, MonitoringTrend } from '../../types/admin'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  Select,
  Spinner,
  StatCard,
} from '../ui'

const fmtNum = (n?: number | null) => (n == null ? '-' : n.toLocaleString())

const fmtDuration = (sec?: number | null): string => {
  if (sec == null) return '-'
  const m = Math.round(sec / 60)
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`
  return `${m}m`
}

const fmtDateTime = (iso?: string | null): string => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const runTone = (status?: string | null): 'success' | 'danger' | 'warning' | 'neutral' => {
  const s = (status ?? '').toLowerCase()
  if (s === 'completed') return 'success'
  if (s === 'failed') return 'danger'
  if (s === 'running') return 'warning'
  return 'neutral'
}

const BreakdownRows = ({
  rows,
}: {
  rows: { key: string; name: string; signals: number; total: number }[]
}) => {
  const max = Math.max(1, ...rows.map((r) => r.signals))
  if (rows.length === 0) return <p className="px-1 py-4 text-sm text-slate-400">No data</p>
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.key}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-700">{r.name}</span>
            <span className="text-slate-500">
              <span className="font-semibold text-slate-900">{r.signals.toLocaleString()}</span> / {r.total.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-orange-500" style={{ width: `${(r.signals / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export const MonitoringPage = () => {
  const [summary, setSummary] = useState<MonitoringSummary | null>(null)
  const [trend, setTrend] = useState<MonitoringTrend | null>(null)
  const [threshold, setThreshold] = useState(3)
  const [loading, setLoading] = useState(true)

  const load = async (t = threshold) => {
    setLoading(true)
    const [sRes, tRes] = await Promise.all([
      adminApi.monitoring.summary(undefined, t),
      adminApi.monitoring.trend(14, t),
    ])
    setSummary(sRes.data ?? null)
    setTrend(tRes.data ?? null)
    setLoading(false)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const run = summary?.latest_run ?? null
  const trendData = (trend?.trend ?? []).map((d) => ({ date: d.date.slice(5), signals: d.signals, total: d.total }))
  const maxTier = Math.max(1, ...(summary?.by_tier ?? []).map((t) => t.count))

  return (
    <div>
      <PageHeader
        title="Monitoring"
        description="The daily pipeline report - signals, the latest run, and health."
        actions={
          <>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              Signal =&gt; score
              <Select
                value={String(threshold)}
                onChange={(e) => {
                  const t = Number(e.target.value)
                  setThreshold(t)
                  void load(t)
                }}
                className="w-20"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    &gt;= {n}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void load()}>
              Refresh
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="py-16">
          <Spinner label="Loading report..." />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Signals"
              value={fmtNum(summary?.signals)}
              hint={`score >= ${summary?.threshold ?? threshold} - ${summary?.date ?? ''}`}
              icon={<Signal className="h-5 w-5" />}
              tone="accent"
            />
            <StatCard label="Total scored" value={fmtNum(summary?.total)} icon={<Activity className="h-5 w-5" />} />
            <StatCard label="Jobs scraped" value={fmtNum(run?.jobs_scraped)} icon={<Briefcase className="h-5 w-5" />} />
            <StatCard
              label="Scores stored"
              value={fmtNum(run?.intent_stored)}
              icon={<Database className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Latest pipeline run"
                actions={run ? <Badge tone={runTone(run.status)}>{run.status}</Badge> : undefined}
              />
              <CardBody>
                {run ? (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Run</p>
                        <p className="font-mono text-slate-700">{run.run_id ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Organization</p>
                        <p className="text-slate-700">{run.organization ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Started</p>
                        <p className="text-slate-700">{fmtDateTime(run.started_at)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Duration</p>
                        <p className="text-slate-700">{fmtDuration(run.duration_sec)}</p>
                      </div>
                    </div>
                    {run.steps.length > 0 && (
                      <div className="border-t border-slate-100 pt-3">
                        {run.steps.map((s, i) => (
                          <div key={i} className="flex items-center justify-between py-1">
                            <span className="flex items-center gap-2 text-slate-600">
                              <Badge tone={s.status === 'success' ? 'success' : 'danger'}>{s.status}</Badge>
                              {s.name}
                            </span>
                            <span className="text-xs text-slate-400">{fmtDuration(s.duration_sec)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-4 border-t border-slate-100 pt-3 text-xs">
                      <span className="text-red-600">Errors: {run.error_count}</span>
                      <span className="text-amber-600">Warnings: {run.warning_count}</span>
                    </div>
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-slate-400">No pipeline run found</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Score distribution" description={summary?.date} />
              <CardBody className="space-y-2.5">
                {(summary?.by_tier ?? []).map((t) => (
                  <div key={t.score}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">
                        score {t.score}
                        {t.score >= (summary?.threshold ?? 3) && <span className="ml-1 text-orange-500">(signal)</span>}
                      </span>
                      <span className="font-medium text-slate-900">{t.count.toLocaleString()}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={t.score >= (summary?.threshold ?? 3) ? 'h-full rounded-full bg-orange-500' : 'h-full rounded-full bg-slate-300'}
                        style={{ width: `${(t.count / maxTier) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Signals over time" description="Last 14 days" />
            <CardBody>
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="signals" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="By product" description={`Signals (score >= ${summary?.threshold ?? threshold})`} />
              <CardBody>
                <BreakdownRows
                  rows={(summary?.by_product ?? []).map((p) => ({
                    key: p.product_id,
                    name: p.name,
                    signals: p.signals,
                    total: p.total,
                  }))}
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="By organization" />
              <CardBody>
                <BreakdownRows
                  rows={(summary?.by_org ?? []).map((o) => ({
                    key: o.organization_id,
                    name: o.name,
                    signals: o.signals,
                    total: o.total,
                  }))}
                />
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
