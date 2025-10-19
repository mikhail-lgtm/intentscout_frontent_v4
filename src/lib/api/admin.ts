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
      apiClient.get(`/admin/users/${userId}/organizations`),
  },
  organizations: {
    list: (page = 1, pageSize = 20) =>
      apiClient.get<AdminOrganizationListResponse>(`/admin/organizations${buildQueryString({
        page,
        page_size: pageSize,
      })}`),
    detail: (organizationId: string) =>
      apiClient.get<AdminOrganizationDetail>(`/admin/organizations/${organizationId}`),
  },
  system: {
    health: () => apiClient.get<SystemHealthResponse>('/admin/system/health'),
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
  SystemHealthResponse,
} from '../../types/admin'
