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
  user_role?: string | null
  method: string
  endpoint: string
  query?: string | null
  status_code?: number | null
  response_time_ms?: number | null
  ip_address?: string | null
  user_agent?: string | null
  action?: string | null
  category?: string | null
  description?: string | null
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

// Cost Tracking Types

export interface CostByDayEntry {
  _id: string
  total_cost: number
  total_requests: number
  total_tokens: number
}

export interface CostByProviderEntry {
  _id: string
  total_cost: number
  total_requests: number
  total_tokens: number
}

export interface CostByServiceEntry {
  _id: {
    service: string
    operation: string
  }
  total_cost: number
  total_requests: number
  avg_tokens: number
}

export interface CostByModelEntry {
  _id: string
  total_cost: number
  total_requests: number
  total_tokens: number
  avg_tokens_per_request: number
}

export interface CostByOrganizationEntry {
  _id: string | null
  total_cost: number
  total_requests: number
  services_used: string[]
}

export interface CostByUserEntry {
  _id: string
  organization_id: string | null
  total_cost: number
  total_requests: number
  services_used: string[]
}

export interface CostSummaryResponse {
  period_days: number
  total_api_cost_usd: number
  total_manual_cost_usd: number
  total_cost_usd: number
  by_day: CostByDayEntry[]
  by_provider: CostByProviderEntry[]
  by_service: CostByServiceEntry[]
  by_model: CostByModelEntry[]
}

export interface UsageLogEntry {
  _id: string
  timestamp: string
  provider: string
  service: string
  operation: string
  model?: string | null
  organization_id?: string | null
  user_id?: string | null
  tokens?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  } | null
  request_count: number
  cost: {
    calculated_usd: number
    pricing_version?: string
  }
  metadata: Record<string, unknown>
}

export interface ManualExpense {
  _id: string
  date: string
  category: string
  provider: string
  description: string
  amount_usd: number
  recurring: boolean
  recurring_period?: string | null
  created_by: string
  created_at: string
}

export interface ManualExpenseRequest {
  date: string
  category: string
  provider: string
  description: string
  amount_usd: number
  recurring: boolean
  recurring_period?: string | null
}

export interface OpenRouterCreditsResponse {
  credits: number
  credits_used: number
  credits_remaining: number
  usage_today: number
  error?: string | null
}

export interface OpenAICostsResponse {
  costs: Record<string, unknown>[]
  total_usd: number
  error?: string | null
}

export interface BillingSnapshotResponse {
  snapshot_id: string
  timestamp: string
  openrouter: OpenRouterCreditsResponse
  openai: OpenAICostsResponse
  total_balance_usd: number
}
