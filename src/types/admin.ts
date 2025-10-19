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
