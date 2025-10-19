export interface AdminCheckResponse {
  is_admin: boolean
}

export interface AdminProfile {
  id: string
  email: string
  role?: string | null
  roles: string[]
  user_metadata: Record<string, unknown>
  app_metadata: Record<string, unknown>
}

export interface AdminUserSummary {
  id: string
  email?: string | null
  created_at?: string | null
  last_sign_in_at?: string | null
  is_admin: boolean
  roles: string[]
  organizations: string[]
}

export interface AdminUserListResponse {
  users: AdminUserSummary[]
  page: number
  page_size: number
  total?: number | null
  next_page?: number | null
}

export interface AdminUserDetail extends AdminUserSummary {
  user_metadata: Record<string, unknown>
  app_metadata: Record<string, unknown>
}

export interface AdminOrganizationSummary {
  id: string
  name?: string | null
  state?: string | null
  primary_user_id?: string | null
  user_count: number
  created_at?: string | null
  updated_at?: string | null
  logoUrl?: string | null
}

export interface AdminOrganizationListResponse {
  organizations: AdminOrganizationSummary[]
  page: number
  page_size: number
  total: number
}

export interface AdminOrganizationStats {
  signals_total: number
  contacts_total: number
  email_generations_total: number
}

export interface AdminOrganizationDetail extends AdminOrganizationSummary {
  stats: AdminOrganizationStats
}

export interface AdminActivityLog {
  id?: string
  timestamp: string
  user_id?: string | null
  organization_id?: string | null
  method: string
  endpoint: string
  query?: string | null
  status_code?: number | null
  response_time_ms?: number | null
  ip_address?: string | null
  user_agent?: string | null
}

export interface AdminUsagePoint {
  date: string
  api_calls: number
}

export interface AdminUserStatistics {
  signals_reviewed: number
  contacts_created: number
  emails_generated: number
  sequences_created: number
  total_api_calls: number
  last_active?: string | null
}

export interface AdminUserStatsResponse {
  user_id: string
  stats: AdminUserStatistics
  usage_by_day: AdminUsagePoint[]
}

export interface AdminOrganizationStatistics {
  signals_reviewed: number
  contacts_created: number
  emails_generated: number
  sequences_created: number
  total_api_calls: number
  active_users: number
}

export interface AdminOrganizationUsage {
  organization_id: string
  stats: AdminOrganizationStatistics
  usage_by_day: AdminUsagePoint[]
}

export interface AdminAnalyticsOverview {
  dau: number
  wau: number
  mau: number
  total_api_calls: number
  total_organizations: number
  total_users?: number | null
}

export interface AdminUsageLeaderboardEntry {
  user_id?: string | null
  organization_id?: string | null
  total_api_calls: number
  signals_reviewed: number
  contacts_created: number
  emails_generated: number
  sequences_created: number
}

export interface SystemHealthStatus {
  status: string
  latency_ms?: number
  detail?: string
}

export interface SystemHealthResponse {
  timestamp: string
  api: { status: string }
  mongodb: SystemHealthStatus
  supabase: SystemHealthStatus
  intentspy: { status: string; detail?: string }
}
