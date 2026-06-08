import { apiClient } from '../apiClient'
import type {
  AdminProduct,
  ProductPayload,
  PromptTemplateSummary,
  PromptTemplateContent,
  AdminCompany,
  CompanyPayload,
  CompanyListResponse,
  CompanyImportResult,
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

import type { MonitoringSummary, MonitoringTrend } from '../../types/admin'
import type { OrgCreatePayload, OrgUpdatePayload, ApifyUsage } from '../../types/admin'

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
    invite: (body: { email: string; role?: string | null; organization_id?: string; redirect_to?: string }) =>
      apiClient.post<{ status: string; user_id?: string; email: string }>('/admin/users/invite', body),
    createUser: (body: {
      email: string
      password?: string
      role?: string | null
      organization_id?: string
      email_confirm?: boolean
    }) => apiClient.post<{ status: string; user_id?: string; email: string }>('/admin/users', body),
    setRole: (userId: string, role: string | null) =>
      apiClient.put<{ status: string }>(`/admin/users/${userId}/role`, { role }),
    setOrg: (userId: string, organizationId: string, action: 'add' | 'remove') =>
      apiClient.post<{ status: string }>(`/admin/users/${userId}/organizations`, {
        organization_id: organizationId,
        action,
      }),
    setStatus: (userId: string, active: boolean) =>
      apiClient.put<{ status: string }>(`/admin/users/${userId}/status`, { active }),
    recovery: (userId: string) => apiClient.post<{ status: string }>(`/admin/users/${userId}/recovery`, {}),
    remove: (userId: string) => apiClient.delete<{ status: string }>(`/admin/users/${userId}`),
    bulk: (userIds: string[], action: 'delete' | 'deactivate' | 'activate' | 'set_role', role?: string | null) =>
      apiClient.post<{ status: string; succeeded: number; failed: number; errors: string[] }>('/admin/users/bulk', {
        user_ids: userIds,
        action,
        role,
      }),
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
    members: (organizationId: string) =>
      apiClient.get<AdminUserSummary[]>(`/admin/organizations/${organizationId}/members`),
    create: (payload: OrgCreatePayload) =>
      apiClient.post<AdminOrganizationSummary>('/admin/organizations', payload),
    update: (organizationId: string, payload: OrgUpdatePayload) =>
      apiClient.put<AdminOrganizationSummary>(`/admin/organizations/${organizationId}`, payload),
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
      apify: () => apiClient.get<ApifyUsage>('/admin/costs/billing/apify'),
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
  products: {
    list: (organizationId?: string, status?: string) =>
      apiClient.get<AdminProduct[]>(`/admin/products${buildQueryString({
        organization_id: organizationId,
        status,
      })}`),
    detail: (id: string) => apiClient.get<AdminProduct>(`/admin/products/${id}`),
    create: (payload: ProductPayload) => apiClient.post<AdminProduct>('/admin/products', payload),
    update: (id: string, payload: ProductPayload) =>
      apiClient.put<AdminProduct>(`/admin/products/${id}`, payload),
    remove: (id: string) => apiClient.delete<{ id: string; status: string }>(`/admin/products/${id}`),
    templates: () => apiClient.get<PromptTemplateSummary[]>('/admin/products/prompt-templates'),
    template: (name: string) =>
      apiClient.get<PromptTemplateContent>(`/admin/products/prompt-templates/${encodeURIComponent(name)}`),
  },
  companies: {
    list: (
      params: {
        search?: string
        target_organizations?: string
        hq_country?: string
        page?: number
        page_size?: number
      } = {},
    ) => apiClient.get<CompanyListResponse>(`/admin/companies${buildQueryString({ ...params })}`),
    detail: (id: string) => apiClient.get<AdminCompany>(`/admin/companies/${id}`),
    create: (payload: CompanyPayload) => apiClient.post<AdminCompany>('/admin/companies', payload),
    update: (id: string, payload: CompanyPayload) =>
      apiClient.put<AdminCompany>(`/admin/companies/${id}`, payload),
    remove: (id: string) => apiClient.delete<{ id: string; status: string }>(`/admin/companies/${id}`),
    import: (csv: string, targetOrganizations?: string) =>
      apiClient.post<CompanyImportResult>('/admin/companies/import', {
        csv,
        target_organizations: targetOrganizations,
      }),
  },
  monitoring: {
    summary: (date?: string, threshold?: number) =>
      apiClient.get<MonitoringSummary>(`/admin/monitoring/summary${buildQueryString({ date, threshold })}`),
    trend: (days = 14, threshold?: number, end?: string) =>
      apiClient.get<MonitoringTrend>(`/admin/monitoring/trend${buildQueryString({ days, threshold, end })}`),
  },
}

export type {
  MonitoringSummary,
  MonitoringTrend,
  AdminProduct,
  ProductPayload,
  PromptTemplateSummary,
  PromptTemplateContent,
  AdminCompany,
  CompanyPayload,
  CompanyListResponse,
  CompanyImportResult,
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
