import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
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
} from '../../types/admin'

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const formatCurrencyShort = (value: number) => {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  if (value >= 1) return `$${value.toFixed(2)}`
  return `$${value.toFixed(4)}`
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

const PERIOD_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '1 year' },
]

const EXPENSE_CATEGORIES = [
  'infrastructure',
  'proxy',
  'api_credits',
  'software',
  'other',
]

const CHART_COLORS = [
  '#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444',
  '#06b6d4', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6',
]

const PROVIDER_COLORS: Record<string, string> = {
  openrouter: '#f97316',
  openai: '#10b981',
  fireworks: '#3b82f6',
  serper: '#8b5cf6',
  brightdata: '#ef4444',
}

export const CostsPage = () => {
  const [summary, setSummary] = useState<CostSummaryResponse | null>(null)
  const [openrouterCredits, setOpenrouterCredits] = useState<OpenRouterCreditsResponse | null>(null)
  const [manualExpenses, setManualExpenses] = useState<ManualExpense[]>([])
  const [usageLogs, setUsageLogs] = useState<UsageLogEntry[]>([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Manual expense form state
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseForm, setExpenseForm] = useState<ManualExpenseRequest>({
    date: new Date().toISOString().split('T')[0],
    category: 'infrastructure',
    provider: '',
    description: '',
    amount_usd: 0,
    recurring: false,
    recurring_period: null,
  })
  const [expenseSubmitting, setExpenseSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [summaryRes, creditsRes, expensesRes, logsRes] = await Promise.all([
        adminApi.costs.summary(days),
        adminApi.costs.billing.openrouterCredits(),
        adminApi.costs.manual.list(days),
        adminApi.costs.logs(50),
      ])

      if (!summaryRes.data) {
        throw new Error(summaryRes.error || 'Failed to load cost summary')
      }

      setSummary(summaryRes.data)
      setOpenrouterCredits(creditsRes.data ?? null)
      setManualExpenses(expensesRes.data ?? [])
      setUsageLogs(logsRes.data ?? [])
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
      return
    }

    setExpenseSubmitting(true)
    try {
      await adminApi.costs.manual.add({
        ...expenseForm,
        date: new Date(expenseForm.date).toISOString(),
      })
      setShowExpenseForm(false)
      setExpenseForm({
        date: new Date().toISOString().split('T')[0],
        category: 'infrastructure',
        provider: '',
        description: '',
        amount_usd: 0,
        recurring: false,
        recurring_period: null,
      })
      await loadData()
    } catch (err) {
      console.error('Failed to add expense:', err)
    } finally {
      setExpenseSubmitting(false)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return
    }

    try {
      await adminApi.costs.manual.delete(expenseId)
      await loadData()
    } catch (err) {
      console.error('Failed to delete expense:', err)
    }
  }

  // Prepare chart data
  const dailyChartData = useMemo(() => {
    if (!summary?.by_day?.length) return []
    return summary.by_day.map((day: CostByDayEntry) => ({
      date: day._id.slice(5), // MM-DD
      fullDate: day._id,
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
    const total = dailyChartData.reduce((sum, d) => sum + d.cost, 0)
    return total / dailyChartData.length
  }, [dailyChartData])

  const projectedMonthlyCost = useMemo(() => {
    return avgDailyCost * 30
  }, [avgDailyCost])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading costs data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-semibold">Failed to load costs</p>
        <p className="text-sm mt-2">{error}</p>
        <button
          onClick={() => void loadData()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Cost Tracking</h2>
          <p className="text-sm text-slate-500 mt-1">
            Avg {formatCurrency(avgDailyCost)}/day | Projected {formatCurrency(projectedMonthlyCost)}/month
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadData()}
            className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Refresh
          </button>
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-orange-500 focus:outline-none"
          >
            {PERIOD_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">API Costs</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(summary?.total_api_cost_usd ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-400">{days} days</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Manual Expenses</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(summary?.total_manual_cost_usd ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Infrastructure, proxies</p>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
          <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Total Costs</p>
          <p className="mt-2 text-2xl font-bold text-orange-700">
            {formatCurrency(summary?.total_cost_usd ?? 0)}
          </p>
          <p className="mt-1 text-xs text-orange-500">{days} days combined</p>
        </div>

        {openrouterCredits && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">OpenRouter Balance</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {formatCurrency(openrouterCredits.credits_remaining)}
            </p>
            <p className="mt-1 text-xs text-emerald-500">
              Today: {formatCurrency(openrouterCredits.usage_today)}
            </p>
          </div>
        )}
      </section>

      {/* Daily costs chart */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Daily Costs</h3>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyChartData}>
                <defs>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatCurrencyShort(v)}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Cost']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#costGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No cost data for this period</p>
          )}
        </div>
      </section>

      {/* Provider breakdown - pie chart + bar chart side by side */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Costs by Provider</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Pie chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {providerPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={providerPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: '#94a3b8' }}
                  >
                    {providerPieData.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">No provider data</p>
            )}
          </div>

          {/* Bar chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            {providerPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={providerPieData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(v: number) => formatCurrencyShort(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    width={90}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), 'Cost']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {providerPieData.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">No provider data</p>
            )}
          </div>
        </div>
      </section>

      {/* Costs by service */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Costs by Service</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Service</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Operation</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Requests</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Avg Tokens</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary?.by_service?.length ? (
                summary.by_service.map((svc: CostByServiceEntry) => (
                  <tr key={`${svc._id.service}-${svc._id.operation}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium">{svc._id.service}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{svc._id.operation}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatNumber(svc.total_requests)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatNumber(svc.avg_tokens)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">{formatCurrency(svc.total_cost)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-sm text-slate-500 text-center">No service data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Costs by model */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Costs by Model</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Model</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Requests</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Total Tokens</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Avg Tokens/Req</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary?.by_model?.length ? (
                summary.by_model.map((model: CostByModelEntry) => (
                  <tr key={model._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700 font-mono">{model._id}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatNumber(model.total_requests)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatNumber(model.total_tokens)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatNumber(model.avg_tokens_per_request)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 text-right">{formatCurrency(model.total_cost)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-sm text-slate-500 text-center">No model data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Manual expenses */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Manual Expenses</h3>
          <button
            onClick={() => setShowExpenseForm(!showExpenseForm)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            {showExpenseForm ? 'Cancel' : 'Add Expense'}
          </button>
        </div>

        {/* Add expense form */}
        {showExpenseForm && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
                <input
                  type="text"
                  value={expenseForm.provider}
                  onChange={e => setExpenseForm({ ...expenseForm, provider: e.target.value })}
                  placeholder="e.g. Azure, BrightData"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="What is this expense for?"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={expenseForm.amount_usd}
                  onChange={e => setExpenseForm({ ...expenseForm, amount_usd: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={expenseForm.recurring}
                  onChange={e => setExpenseForm({ ...expenseForm, recurring: e.target.checked })}
                  className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-slate-700">Recurring expense</span>
              </label>
              {expenseForm.recurring && (
                <select
                  value={expenseForm.recurring_period ?? 'monthly'}
                  onChange={e => setExpenseForm({ ...expenseForm, recurring_period: e.target.value })}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
            </div>
            <div className="mt-4">
              <button
                onClick={() => void handleAddExpense()}
                disabled={expenseSubmitting}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {expenseSubmitting ? 'Adding...' : 'Add Expense'}
              </button>
            </div>
          </div>
        )}

        {/* Expenses list */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {manualExpenses.length ? (
                manualExpenses.map(expense => (
                  <tr key={expense._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">{new Date(expense.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 capitalize">{expense.category}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{expense.provider}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {expense.description}
                      {expense.recurring && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {expense.recurring_period}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">{formatCurrency(expense.amount_usd)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => void handleDeleteExpense(expense._id)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-sm text-slate-500 text-center">No manual expenses recorded</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent usage logs */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent API Usage</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Model</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Tokens</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usageLogs.length ? (
                  usageLogs.slice(0, 30).map(log => (
                    <tr key={log._id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-700 capitalize">
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-2"
                          style={{ backgroundColor: PROVIDER_COLORS[log.provider] || '#94a3b8' }}
                        />
                        {log.provider}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{log.service}/{log.operation}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">{log.model ?? '-'}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 text-right">{formatNumber(log.tokens?.total_tokens ?? 0)}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-900 text-right">{formatCurrency(log.cost.calculated_usd)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-sm text-slate-500 text-center">No usage logs recorded</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
