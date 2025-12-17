import { useCallback, useEffect, useMemo, useState } from 'react'
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
    maximumFractionDigits: 4,
  }).format(value)
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

const PERIOD_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
]

const EXPENSE_CATEGORIES = [
  'infrastructure',
  'proxy',
  'api_credits',
  'software',
  'other',
]

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

  // Calculate max values for chart bars
  const maxDailyCost = useMemo(() => {
    if (!summary?.by_day?.length) return 1
    return summary.by_day.reduce((acc, day) => Math.max(acc, day.total_cost), 0.01)
  }, [summary])

  const maxProviderCost = useMemo(() => {
    if (!summary?.by_provider?.length) return 1
    return summary.by_provider.reduce((acc, p) => Math.max(acc, p.total_cost), 0.01)
  }, [summary])

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
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Cost Tracking</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">Period:</label>
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
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total API Costs</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {formatCurrency(summary?.total_api_cost_usd ?? 0)}
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Automatic tracking from all API calls
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Manual Expenses</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {formatCurrency(summary?.total_manual_cost_usd ?? 0)}
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Infrastructure, proxies, subscriptions
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total Costs</p>
          <p className="mt-2 text-3xl font-semibold text-orange-600">
            {formatCurrency(summary?.total_cost_usd ?? 0)}
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Combined total for {days} days
          </p>
        </div>

        {openrouterCredits && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">OpenRouter Balance</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-600">
              {formatCurrency(openrouterCredits.credits_remaining)}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              Today: {formatCurrency(openrouterCredits.usage_today)}
            </p>
          </div>
        )}
      </section>

      {/* Costs by day chart */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900">Daily Costs</h3>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {summary?.by_day?.length ? (
            <div className="space-y-3">
              {summary.by_day.slice(0, 14).map((day: CostByDayEntry) => {
                const width = `${(day.total_cost / maxDailyCost) * 100}%`
                return (
                  <div key={day._id} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-slate-500 shrink-0">{day._id}</div>
                    <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-lg transition-all"
                        style={{ width }}
                      />
                    </div>
                    <div className="w-24 text-sm text-slate-700 text-right shrink-0">
                      {formatCurrency(day.total_cost)}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No cost data for this period</p>
          )}
        </div>
      </section>

      {/* Costs by provider */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900">Costs by Provider</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {summary?.by_provider?.map((provider: CostByProviderEntry) => {
            const width = `${(provider.total_cost / maxProviderCost) * 100}%`
            return (
              <div key={provider._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900 capitalize">{provider._id}</p>
                  <p className="text-lg font-bold text-slate-700">{formatCurrency(provider.total_cost)}</p>
                </div>
                <div className="mt-3 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width }} />
                </div>
                <div className="mt-3 flex justify-between text-xs text-slate-500">
                  <span>{formatNumber(provider.total_requests)} requests</span>
                  <span>{formatNumber(provider.total_tokens)} tokens</span>
                </div>
              </div>
            )
          })}
          {!summary?.by_provider?.length && (
            <p className="text-sm text-slate-500 col-span-full">No provider data</p>
          )}
        </div>
      </section>

      {/* Costs by service */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900">Costs by Service</h3>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                  <tr key={`${svc._id.service}-${svc._id.operation}`}>
                    <td className="px-4 py-3 text-sm text-slate-700">{svc._id.service}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{svc._id.operation}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatNumber(svc.total_requests)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatNumber(svc.avg_tokens)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">{formatCurrency(svc.total_cost)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-sm text-slate-500">No service data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Costs by model */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900">Costs by Model</h3>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                  <tr key={model._id}>
                    <td className="px-4 py-3 text-sm text-slate-700 font-mono">{model._id}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatNumber(model.total_requests)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatNumber(model.total_tokens)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatNumber(model.avg_tokens_per_request)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">{formatCurrency(model.total_cost)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-sm text-slate-500">No model data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Manual expenses */}
      <section>
        <div className="flex items-center justify-between">
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
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
                  placeholder="e.g. AWS, DigitalOcean"
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
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                  <tr key={expense._id}>
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
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-sm text-slate-500">No manual expenses recorded</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent usage logs */}
      <section>
        <h3 className="text-lg font-semibold text-slate-900">Recent API Usage</h3>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Service</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Model</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Tokens</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usageLogs.length ? (
                usageLogs.slice(0, 20).map(log => (
                  <tr key={log._id}>
                    <td className="px-4 py-3 text-sm text-slate-600">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 capitalize">{log.provider}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{log.service}/{log.operation}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 font-mono text-xs">{log.model ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{formatNumber(log.tokens?.total_tokens ?? 0)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">{formatCurrency(log.cost.calculated_usd)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-sm text-slate-500">No usage logs recorded</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
