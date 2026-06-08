import { useEffect, useState } from 'react'
import { Boxes, Building2, Cloud, Database, RefreshCw, Radar, Signal, Users } from 'lucide-react'
import { adminApi } from '../../lib/api/admin'
import type {
  AdminActivityLog,
  AdminAnalyticsOverview,
  AdminProduct,
  MonitoringSummary,
  SystemHealthResponse,
  SystemHealthStatus,
} from '../../types/admin'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  Spinner,
  StatCard,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../ui'

const healthTone = (status?: string): 'success' | 'danger' | 'warning' | 'neutral' => {
  const s = (status ?? '').toLowerCase()
  if (s === 'healthy' || s === 'completed' || s === 'idle' || s === 'running') return 'success'
  if (s === 'error' || s === 'down' || s === 'failed') return 'danger'
  if (s === 'unknown') return 'warning'
  return 'neutral'
}

const formatTime = (value?: string | null): string => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const HealthRow = ({
  icon,
  label,
  health,
  extra,
}: {
  icon: React.ReactNode
  label: string
  health?: SystemHealthStatus | { status: string; detail?: string }
  extra?: string
}) => {
  const latency = health && 'latency_ms' in health ? (health as SystemHealthStatus).latency_ms : undefined
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2 text-sm text-slate-700">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>
      <div className="flex items-center gap-3">
        {extra && <span className="text-xs text-slate-400">{extra}</span>}
        {latency != null && <span className="text-xs text-slate-400">{latency} ms</span>}
        <Badge tone={healthTone(health?.status)}>{health?.status ?? 'unknown'}</Badge>
      </div>
    </div>
  )
}

export const DashboardPage = () => {
  const [overview, setOverview] = useState<AdminAnalyticsOverview | null>(null)
  const [health, setHealth] = useState<SystemHealthResponse | null>(null)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [companyTotal, setCompanyTotal] = useState<number>(0)
  const [activity, setActivity] = useState<AdminActivityLog[]>([])
  const [signals, setSignals] = useState<MonitoringSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [oRes, hRes, pRes, cRes, aRes, sRes] = await Promise.all([
      adminApi.analytics.overview(),
      adminApi.system.health(),
      adminApi.products.list(),
      adminApi.companies.list({ page: 1, page_size: 1 }),
      adminApi.users.activityRecent(8),
      adminApi.monitoring.summary(),
    ])
    setOverview(oRes.data ?? null)
    setHealth(hRes.data ?? null)
    setProducts(pRes.data ?? [])
    setCompanyTotal(cRes.data?.total ?? 0)
    setActivity(aRes.data ?? [])
    setSignals(sRes.data ?? null)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const activeProducts = products.filter((p) => p.status === 'active').length

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Platform overview, system health and recent activity."
        actions={
          <Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {loading ? (
        <div className="py-16">
          <Spinner label="Loading dashboard..." />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Signals"
              value={(signals?.signals ?? 0).toLocaleString()}
              hint={signals ? `score >= ${signals.threshold} - ${signals.date}` : undefined}
              icon={<Signal className="h-5 w-5" />}
              tone="accent"
            />
            <StatCard label="Users" value={overview?.total_users ?? '-'} icon={<Users className="h-5 w-5" />} />
            <StatCard
              label="Products"
              value={products.length}
              hint={`${activeProducts} active`}
              icon={<Boxes className="h-5 w-5" />}
            />
            <StatCard
              label="Companies"
              value={companyTotal.toLocaleString()}
              icon={<Building2 className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="System health" />
              <CardBody className="divide-y divide-slate-100 py-1">
                <HealthRow icon={<Database className="h-4 w-4" />} label="MongoDB" health={health?.mongodb} />
                <HealthRow icon={<Cloud className="h-4 w-4" />} label="Supabase" health={health?.supabase} />
                <HealthRow
                  icon={<Radar className="h-4 w-4" />}
                  label="IntentSpy pipeline"
                  health={health?.intentspy}
                  extra={health?.intentspy?.run_id ? `run ${health.intentspy.run_id}` : undefined}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Engagement" />
              <CardBody>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-semibold text-slate-900">{overview?.dau ?? 0}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">DAU</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-slate-900">{overview?.wau ?? 0}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">WAU</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-slate-900">{overview?.mau ?? 0}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">MAU</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-center">
                  <div>
                    <p className="text-2xl font-semibold text-slate-900">{overview?.total_organizations ?? 0}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Organizations</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-slate-900">
                      {(overview?.total_api_calls ?? 0).toLocaleString()}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">API calls</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Recent activity" />
            {activity.length === 0 ? (
              <CardBody>
                <p className="py-6 text-center text-sm text-slate-400">No recent activity</p>
              </CardBody>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Time</TH>
                    <TH>Action</TH>
                    <TH>Endpoint</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {activity.map((a, i) => (
                    <TR key={a.id ?? i}>
                      <TD className="text-slate-500">{formatTime(a.timestamp)}</TD>
                      <TD className="text-slate-700">{a.description ?? a.action ?? a.category ?? '-'}</TD>
                      <TD className="font-mono text-xs text-slate-500">
                        {a.method} {a.endpoint}
                      </TD>
                      <TD>
                        <Badge tone={(a.status_code ?? 0) < 400 ? 'success' : 'danger'}>{a.status_code ?? '-'}</Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
