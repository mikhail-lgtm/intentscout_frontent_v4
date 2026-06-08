import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Activity, Bot, CreditCard, Plus, Receipt, RefreshCw, Trash2, Users, Wallet } from 'lucide-react'
import { adminApi } from '../../lib/api/admin'
import type {
  CostSummaryResponse,
  CostByDayEntry,
  CostByProviderEntry,
  CostByServiceEntry,
  CostByModelEntry,
  ManualExpense,
  ManualExpenseRequest,
  UsageLogEntry,
  OpenRouterCreditsResponse,
  ApifyUsage,
} from '../../types/admin'
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
  StatCard,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '../ui'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)

const formatCurrencyShort = (value: number) => {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  if (value >= 1) return `$${value.toFixed(2)}`
  return `$${value.toFixed(4)}`
}

const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(Math.round(value))

const PERIOD_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '1 year' },
]

const EXPENSE_CATEGORIES = ['infrastructure', 'proxy', 'api_credits', 'software', 'other']

const CHART_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6']

const PROVIDER_COLORS: Record<string, string> = {
  openrouter: '#f97316',
  openai: '#10b981',
  fireworks: '#3b82f6',
  serper: '#8b5cf6',
  brightdata: '#ef4444',
  apollo: '#0ea5e9',
  apify: '#0d9488',
}

const KNOWN_PROVIDERS = ['openrouter', 'openai', 'serper', 'fireworks', 'brightdata', 'apollo', 'apify']

const emptyExpense = (): ManualExpenseRequest => ({
  date: new Date().toISOString().split('T')[0],
  category: 'infrastructure',
  provider: '',
  description: '',
  amount_usd: 0,
  recurring: false,
  recurring_period: null,
})

export const CostsPage = () => {
  const toast = useToast()
  const [summary, setSummary] = useState<CostSummaryResponse | null>(null)
  const [openrouterCredits, setOpenrouterCredits] = useState<OpenRouterCreditsResponse | null>(null)
  const [apify, setApify] = useState<ApifyUsage | null>(null)
  const [manualExpenses, setManualExpenses] = useState<ManualExpense[]>([])
  const [usageLogs, setUsageLogs] = useState<UsageLogEntry[]>([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseForm, setExpenseForm] = useState<ManualExpenseRequest>(emptyExpense())
  const [expenseSubmitting, setExpenseSubmitting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ManualExpense | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summaryRes, creditsRes, expensesRes, logsRes, apifyRes] = await Promise.all([
        adminApi.costs.summary(days),
        adminApi.costs.billing.openrouterCredits(),
        adminApi.costs.manual.list(days),
        adminApi.costs.logs(50),
        adminApi.costs.billing.apify(),
      ])
      if (!summaryRes.data) throw new Error(summaryRes.error || 'Failed to load cost summary')
      setSummary(summaryRes.data)
      setOpenrouterCredits(creditsRes.data ?? null)
      setManualExpenses(expensesRes.data ?? [])
      setUsageLogs(logsRes.data ?? [])
      setApify(apifyRes.data ?? null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load costs data')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleAddExpense = async () => {
    if (!expenseForm.provider || !expenseForm.description || expenseForm.amount_usd <= 0) {
      toast.error('Provider, description and a positive amount are required')
      return
    }
    setExpenseSubmitting(true)
    const res = await adminApi.costs.manual.add({ ...expenseForm, date: new Date(expenseForm.date).toISOString() })
    setExpenseSubmitting(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success('Expense added')
    setShowExpenseForm(false)
    setExpenseForm(emptyExpense())
    await loadData()
  }

  const handleDeleteExpense = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    const res = await adminApi.costs.manual.delete(pendingDelete._id)
    setDeleting(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success('Expense deleted')
    setPendingDelete(null)
    await loadData()
  }

  const dailyChartData = useMemo(() => {
    if (!summary?.by_day?.length) return []
    return summary.by_day.map((day: CostByDayEntry) => ({
      date: day._id.slice(5),
      cost: Number(day.total_cost.toFixed(4)),
      requests: day.total_requests,
      tokens: day.total_tokens,
    }))
  }, [summary])

  const providerPieData = useMemo(() => {
    if (!summary?.by_provider?.length) return []
    return summary.by_provider.map((p: CostByProviderEntry) => ({
      name: p._id,
      value: Number(p.total_cost.toFixed(2)),
      requests: p.total_requests,
      color: PROVIDER_COLORS[p._id] || '#94a3b8',
    }))
  }, [summary])

  const avgDailyCost = useMemo(() => {
    if (!dailyChartData.length) return 0
    return dailyChartData.reduce((sum, d) => sum + d.cost, 0) / dailyChartData.length
  }, [dailyChartData])

  const projectedMonthlyCost = avgDailyCost * 30
  const apollo = summary?.by_provider?.find((p: CostByProviderEntry) => p._id === 'apollo')

  return (
    <div>
      <PageHeader
        title="Costs"
        description={
          loading
            ? 'Loading…'
            : `Avg ${formatCurrency(avgDailyCost)}/day · projected ${formatCurrency(projectedMonthlyCost)}/month`
        }
        actions={
          <>
            <Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="w-32">
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => void loadData()}>
              Refresh
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="py-16">
          <Spinner label="Loading costs data..." />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">Failed to load costs</p>
          <p className="mt-2 text-sm">{error}</p>
          <Button variant="danger" className="mt-4" onClick={() => void loadData()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="API costs" value={formatCurrency(summary?.total_api_cost_usd ?? 0)} hint={`${days} days`} icon={<Activity className="h-5 w-5" />} />
            <StatCard label="Manual expenses" value={formatCurrency(summary?.total_manual_cost_usd ?? 0)} hint="infra, proxies" icon={<Receipt className="h-5 w-5" />} />
            <StatCard label="Total costs" value={formatCurrency(summary?.total_cost_usd ?? 0)} hint={`${days} days combined`} icon={<Wallet className="h-5 w-5" />} tone="accent" />
            <StatCard
              label="OpenRouter balance"
              value={openrouterCredits ? formatCurrency(openrouterCredits.credits_remaining) : '-'}
              hint={openrouterCredits ? `today ${formatCurrency(openrouterCredits.usage_today)}` : undefined}
              icon={<CreditCard className="h-5 w-5" />}
              tone="success"
            />
            <StatCard
              label="Apollo credits"
              value={(apollo?.total_requests ?? 0).toLocaleString()}
              hint={`est. ${formatCurrency(apollo?.total_cost ?? 0)} · ${days}d`}
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              label="Apify (cycle)"
              value={apify?.usage_usd != null ? formatCurrency(apify.usage_usd) : '-'}
              hint={apify?.status === 'error' ? 'not connected' : 'IntentTracker scraping'}
              icon={<Bot className="h-5 w-5" />}
            />
          </div>

          <Card>
            <CardHeader title="Daily costs" />
            <CardBody>
              {dailyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={dailyChartData}>
                    <defs>
                      <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatCurrencyShort(v)} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Cost']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Area type="monotone" dataKey="cost" stroke="#f97316" strokeWidth={2} fill="url(#costGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-sm text-slate-400">No cost data for this period</p>
              )}
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="By provider" />
              <CardBody>
                {providerPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={providerPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={{ stroke: '#cbd5e1' }}
                      >
                        {providerPieData.map((entry, index) => (
                          <Cell key={entry.name} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-8 text-center text-sm text-slate-400">No provider data</p>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Provider spend" />
              <CardBody>
                {providerPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={providerPieData} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v: number) => formatCurrencyShort(v)} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} width={90} />
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Cost']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {providerPieData.map((entry, index) => (
                          <Cell key={entry.name} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-8 text-center text-sm text-slate-400">No provider data</p>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="All services" description="Every known cost source - shown even at $0 so nothing is missing" />
            <Table>
              <THead>
                <TR>
                  <TH>Service</TH>
                  <TH className="text-right">Requests</TH>
                  <TH className="text-right">Spend ({days}d)</TH>
                </TR>
              </THead>
              <TBody>
                {KNOWN_PROVIDERS.map((name) => {
                  const row = summary?.by_provider?.find((p) => p._id === name)
                  const isApify = name === 'apify'
                  const spend = isApify ? (apify?.usage_usd ?? 0) : (row?.total_cost ?? 0)
                  return (
                    <TR key={name}>
                      <TD className="capitalize text-slate-700">
                        <span
                          className="mr-2 inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: PROVIDER_COLORS[name] || '#94a3b8' }}
                        />
                        {name}
                        {isApify && <span className="ml-2 text-xs text-slate-400">(cycle)</span>}
                      </TD>
                      <TD className="text-right text-slate-600">{isApify ? '-' : formatNumber(row?.total_requests ?? 0)}</TD>
                      <TD className="text-right font-medium text-slate-900">{formatCurrency(spend)}</TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </Card>

          <Card>
            <CardHeader title="By service" />
            <Table>
              <THead>
                <TR>
                  <TH>Service</TH>
                  <TH>Operation</TH>
                  <TH className="text-right">Requests</TH>
                  <TH className="text-right">Avg tokens</TH>
                  <TH className="text-right">Cost</TH>
                </TR>
              </THead>
              <TBody>
                {summary?.by_service?.length ? (
                  summary.by_service.map((svc: CostByServiceEntry) => (
                    <TR key={`${svc._id.service}-${svc._id.operation}`}>
                      <TD className="font-medium text-slate-900">{svc._id.service}</TD>
                      <TD className="text-slate-500">{svc._id.operation}</TD>
                      <TD className="text-right text-slate-600">{formatNumber(svc.total_requests)}</TD>
                      <TD className="text-right text-slate-600">{formatNumber(svc.avg_tokens)}</TD>
                      <TD className="text-right font-semibold text-slate-900">{formatCurrency(svc.total_cost)}</TD>
                    </TR>
                  ))
                ) : (
                  <TR>
                    <TD className="text-center text-slate-400" colSpan={5}>
                      No service data
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </Card>

          <Card>
            <CardHeader title="By model" />
            <Table>
              <THead>
                <TR>
                  <TH>Model</TH>
                  <TH className="text-right">Requests</TH>
                  <TH className="text-right">Total tokens</TH>
                  <TH className="text-right">Avg tokens/req</TH>
                  <TH className="text-right">Cost</TH>
                </TR>
              </THead>
              <TBody>
                {summary?.by_model?.length ? (
                  summary.by_model.map((model: CostByModelEntry) => (
                    <TR key={model._id}>
                      <TD className="font-mono text-xs text-slate-700">{model._id}</TD>
                      <TD className="text-right text-slate-600">{formatNumber(model.total_requests)}</TD>
                      <TD className="text-right text-slate-600">{formatNumber(model.total_tokens)}</TD>
                      <TD className="text-right text-slate-600">{formatNumber(model.avg_tokens_per_request)}</TD>
                      <TD className="text-right font-semibold text-slate-900">{formatCurrency(model.total_cost)}</TD>
                    </TR>
                  ))
                ) : (
                  <TR>
                    <TD className="text-center text-slate-400" colSpan={5}>
                      No model data
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </Card>

          <Card>
            <CardHeader
              title="Manual expenses"
              actions={
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowExpenseForm(true)}>
                  Add expense
                </Button>
              }
            />
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Category</TH>
                  <TH>Provider</TH>
                  <TH>Description</TH>
                  <TH className="text-right">Amount</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {manualExpenses.length ? (
                  manualExpenses.map((expense) => (
                    <TR key={expense._id}>
                      <TD className="text-slate-600">{new Date(expense.date).toLocaleDateString()}</TD>
                      <TD className="capitalize text-slate-500">{expense.category}</TD>
                      <TD className="text-slate-700">{expense.provider}</TD>
                      <TD className="text-slate-600">
                        {expense.description}
                        {expense.recurring && (
                          <Badge tone="info" className="ml-2">
                            {expense.recurring_period}
                          </Badge>
                        )}
                      </TD>
                      <TD className="text-right font-medium text-slate-900">{formatCurrency(expense.amount_usd)}</TD>
                      <TD className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                          leftIcon={<Trash2 className="h-4 w-4" />}
                          onClick={() => setPendingDelete(expense)}
                        >
                          Delete
                        </Button>
                      </TD>
                    </TR>
                  ))
                ) : (
                  <TR>
                    <TD className="text-center text-slate-400" colSpan={6}>
                      No manual expenses recorded
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </Card>

          <Card>
            <CardHeader title="Recent API usage" />
            <Table>
              <THead>
                <TR>
                  <TH>Time</TH>
                  <TH>Provider</TH>
                  <TH>Service</TH>
                  <TH>Model</TH>
                  <TH className="text-right">Tokens</TH>
                  <TH className="text-right">Cost</TH>
                </TR>
              </THead>
              <TBody>
                {usageLogs.length ? (
                  usageLogs.slice(0, 30).map((log) => (
                    <TR key={log._id}>
                      <TD className="whitespace-nowrap text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</TD>
                      <TD className="capitalize text-slate-700">
                        <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[log.provider] || '#94a3b8' }} />
                        {log.provider}
                      </TD>
                      <TD className="text-xs text-slate-500">
                        {log.service}/{log.operation}
                      </TD>
                      <TD className="font-mono text-xs text-slate-500">{log.model ?? '-'}</TD>
                      <TD className="text-right text-xs text-slate-600">{formatNumber(log.tokens?.total_tokens ?? 0)}</TD>
                      <TD className="text-right font-medium text-slate-900">{formatCurrency(log.cost.calculated_usd)}</TD>
                    </TR>
                  ))
                ) : (
                  <TR>
                    <TD className="text-center text-slate-400" colSpan={6}>
                      No usage logs recorded
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </Card>
        </div>
      )}

      <Modal
        open={showExpenseForm}
        onClose={() => setShowExpenseForm(false)}
        size="lg"
        title="Add manual expense"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowExpenseForm(false)} disabled={expenseSubmitting}>
              Cancel
            </Button>
            <Button onClick={() => void handleAddExpense()} loading={expenseSubmitting}>
              Add expense
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date">
            <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
          </Field>
          <Field label="Category">
            <Select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Provider" required>
            <Input value={expenseForm.provider} onChange={(e) => setExpenseForm({ ...expenseForm, provider: e.target.value })} placeholder="Azure, BrightData, ..." />
          </Field>
          <Field label="Amount (USD)" required>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={expenseForm.amount_usd}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount_usd: parseFloat(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Description" required className="sm:col-span-2">
            <Input value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="What is this expense for?" />
          </Field>
          <Field label="Recurring" className="sm:col-span-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={expenseForm.recurring}
                  onChange={(e) => setExpenseForm({ ...expenseForm, recurring: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                />
                Recurring expense
              </label>
              {expenseForm.recurring && (
                <Select
                  value={expenseForm.recurring_period ?? 'monthly'}
                  onChange={(e) => setExpenseForm({ ...expenseForm, recurring_period: e.target.value })}
                  className="w-40"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </Select>
              )}
            </div>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteExpense}
        title="Delete expense"
        message={pendingDelete ? `Delete "${pendingDelete.description}" (${formatCurrency(pendingDelete.amount_usd)})?` : ''}
        confirmLabel="Delete"
        tone="danger"
        loading={deleting}
      />
    </div>
  )
}
