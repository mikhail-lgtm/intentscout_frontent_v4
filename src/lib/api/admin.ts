import { apiClient } from '../apiClient'
import type {
  AdminCheckResponse,
  AdminProfile,
  AdminUserSummary,
  AdminUserListResponse,
  AdminUserDetail,
  AdminOrganizationSummary,
  AdminOrganizationListResponse,
  AdminOrganizationDetail,
  AdminActivityLog,
  AdminUserStatsResponse,
  AdminOrganizationUsage,
  AdminAnalyticsOverview,
  AdminUsageLeaderboardEntry,
  SystemHealthResponse,
  CostSummaryResponse,
  CostByDayEntry,
  CostByProviderEntry,
  CostByServiceEntry,
  CostByModelEntry,
  CostByOrganizationEntry,
  CostByUserEntry,
  UsageLogEntry,
  ManualExpense,
  ManualExpenseRequest,
  OpenRouterCreditsResponse,
  OpenAICostsResponse,
  BillingSnapshotResponse,
} from '../../types/admin'

const buildQueryString = (params: Record<string, string | number | undefined>): string => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })
  const serialized = searchParams.toString()
  return serialized ? `?${serialized}` : ''
}

export const adminApi = {
  auth: {
    check: () => apiClient.get<AdminCheckResponse>('/admin/check'),
    profile: () => apiClient.get<AdminProfile>('/admin/profile'),
  },
  users: {
    list: (page = 1, pageSize = 20) =>
      apiClient.get<AdminUserListResponse>(`/admin/users${buildQueryString({
        page,
        page_size: pageSize,
      })}`),
    detail: (userId: string) =>
      apiClient.get<AdminUserDetail>(`/admin/users/${userId}`),
    organizations: (userId: string) =>
      apiClient.get<AdminOrganizationSummary[]>(`/admin/users/${userId}/organizations`),
    activityRecent: (limit = 100) =>
      apiClient.get<AdminActivityLog[]>(`/admin/users/activity/recent${buildQueryString({ limit })}`),
    activity: (userId: string, limit = 50) =>
      apiClient.get<AdminActivityLog[]>(`/admin/users/${userId}/activity${buildQueryString({ limit })}`),
    stats: (userId: string) =>
      apiClient.get<AdminUserStatsResponse>(`/admin/users/${userId}/stats`),
  },
  organizations: {
    list: (page = 1, pageSize = 20) =>
      apiClient.get<AdminOrganizationListResponse>(`/admin/organizations${buildQueryString({
        page,
        page_size: pageSize,
      })}`),
    detail: (organizationId: string) =>
      apiClient.get<AdminOrganizationDetail>(`/admin/organizations/${organizationId}`),
    activity: (organizationId: string, limit = 50) =>
      apiClient.get<AdminActivityLog[]>(`/admin/organizations/${organizationId}/activity${buildQueryString({ limit })}`),
    usage: (organizationId: string) =>
      apiClient.get<AdminOrganizationUsage>(`/admin/organizations/${organizationId}/usage`),
  },
  analytics: {
    overview: () => apiClient.get<AdminAnalyticsOverview>('/admin/analytics/overview'),
    usersUsage: (organizationId?: string, limit = 20, days?: number) =>
      apiClient.get<AdminUsageLeaderboardEntry[]>(`/admin/analytics/users/usage${buildQueryString({
        organization_id: organizationId,
        limit,
        days,
      })}`),
  },
  system: {
    health: () => apiClient.get<SystemHealthResponse>('/admin/system/health'),
  },
  logs: {
    recent: (limit = 100) =>
      apiClient.get(`/admin/logs/api/recent?limit=${limit}`),
    intentspy: (limit = 100) =>
      apiClient.get(`/admin/intentspy/logs/recent?limit=${limit}`),
  },
  pipeline: {
    status: () =>
      apiClient.get('/admin/pipeline/status'),
    start: (params: {
      organization?: string
      skip_scraping?: boolean
      skip_embedding?: boolean
      limit?: number
      continue_on_fail?: boolean
    }) =>
      apiClient.post('/admin/pipeline/start', params),
    stop: () =>
      apiClient.post('/admin/pipeline/stop', {}),
    runs: (limit = 20) =>
      apiClient.get(`/admin/pipeline/runs?limit=${limit}`),
    runLogs: (runId: string, limit = 500) =>
      apiClient.get(`/admin/pipeline/runs/${runId}/logs?limit=${limit}`),
    output: (lines = 100) =>
      apiClient.get(`/admin/pipeline/output?lines=${lines}`),
  },
  costs: {
    summary: (days = 30, organizationId?: string) =>
      apiClient.get<CostSummaryResponse>(`/admin/costs/summary${buildQueryString({
        days,
        organization_id: organizationId,
      })}`),
    byDay: (days = 30, provider?: string, organizationId?: string) =>
      apiClient.get<CostByDayEntry[]>(`/admin/costs/by-day${buildQueryString({
        days,
        provider,
        organization_id: organizationId,
      })}`),
    byProvider: (days = 30, organizationId?: string) =>
      apiClient.get<CostByProviderEntry[]>(`/admin/costs/by-provider${buildQueryString({
        days,
        organization_id: organizationId,
      })}`),
    byService: (days = 30, organizationId?: string) =>
      apiClient.get<CostByServiceEntry[]>(`/admin/costs/by-service${buildQueryString({
        days,
        organization_id: organizationId,
      })}`),
    byModel: (days = 30, organizationId?: string) =>
      apiClient.get<CostByModelEntry[]>(`/admin/costs/by-model${buildQueryString({
        days,
        organization_id: organizationId,
      })}`),
    byOrganization: (days = 30) =>
      apiClient.get<CostByOrganizationEntry[]>(`/admin/costs/by-organization${buildQueryString({
        days,
      })}`),
    byUser: (days = 30, organizationId?: string, limit = 20) =>
      apiClient.get<CostByUserEntry[]>(`/admin/costs/by-user${buildQueryString({
        days,
        organization_id: organizationId,
        limit,
      })}`),
    logs: (limit = 50, provider?: string, service?: string, organizationId?: string) =>
      apiClient.get<UsageLogEntry[]>(`/admin/costs/logs${buildQueryString({
        limit,
        provider,
        service,
        organization_id: organizationId,
      })}`),
    billing: {
      snapshot: () =>
        apiClient.get<BillingSnapshotResponse>('/admin/costs/billing/snapshot'),
      latest: () =>
        apiClient.get<BillingSnapshotResponse | null>('/admin/costs/billing/latest'),
      openrouterCredits: () =>
        apiClient.get<OpenRouterCreditsResponse>('/admin/costs/billing/openrouter/credits'),
      openaiCosts: (days = 7) =>
        apiClient.get<OpenAICostsResponse>(`/admin/costs/billing/openai/costs${buildQueryString({ days })}`),
    },
    manual: {
      list: (days = 30, category?: string) =>
        apiClient.get<ManualExpense[]>(`/admin/costs/manual${buildQueryString({
          days,
          category,
        })}`),
      add: (expense: ManualExpenseRequest) =>
        apiClient.post<{ id: string; status: string }>('/admin/costs/manual', expense),
      update: (expenseId: string, expense: ManualExpenseRequest) =>
        apiClient.put<{ id: string; status: string }>(`/admin/costs/manual/${expenseId}`, expense),
      delete: (expenseId: string) =>
        apiClient.delete<{ id: string; status: string }>(`/admin/costs/manual/${expenseId}`),
    },
  },
}

export type {
  AdminCheckResponse,
  AdminProfile,
  AdminUserSummary,
  AdminUserListResponse,
  AdminUserDetail,
  AdminOrganizationSummary,
  AdminOrganizationListResponse,
  AdminOrganizationDetail,
  AdminActivityLog,
  AdminUserStatsResponse,
  AdminOrganizationUsage,
  AdminAnalyticsOverview,
  AdminUsageLeaderboardEntry,
  SystemHealthResponse,
  CostSummaryResponse,
  CostByDayEntry,
  CostByProviderEntry,
  CostByServiceEntry,
  CostByModelEntry,
  CostByOrganizationEntry,
  CostByUserEntry,
  UsageLogEntry,
  ManualExpense,
  ManualExpenseRequest,
  OpenRouterCreditsResponse,
  OpenAICostsResponse,
  BillingSnapshotResponse,
} from '../../types/admin'
