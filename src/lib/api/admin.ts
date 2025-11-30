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
} from '../../types/admin'
