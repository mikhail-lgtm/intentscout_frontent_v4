import { supabase } from './supabase'
import { config, endpoints, buildApiUrl } from './config'

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: any
  headers?: Record<string, string>
  requireAuth?: boolean
  timeout?: number
}

interface ApiResponse<T = any> {
  data?: T
  error?: string
  status: number
  statusText?: string
}

interface ApiError extends Error {
  status: number
  statusText?: string
}

class ApiClient {
  private baseUrl: string
  private timeout: number
  private tokenRefreshPromise: Promise<string | null> | null = null

  constructor() {
    this.baseUrl = config.api.baseUrl
    this.timeout = config.api.timeout
  }

  private async refreshTokenIfNeeded(): Promise<string | null> {
    // If a refresh is already in progress, wait for it
    if (this.tokenRefreshPromise) {
      console.log('Token refresh already in progress, waiting...')
      return this.tokenRefreshPromise
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session for API call:', error)
        return null
      }

      if (!session) {
        return null
      }

      // Check if token is expired (with 5 minute buffer)
      const expiresAt = session.expires_at
      if (expiresAt) {
        const now = Date.now() / 1000
        const bufferTime = 5 * 60 // 5 minutes

        if ((expiresAt - bufferTime) <= now) {
          console.log('Token expiring soon, refreshing for API call...')
          
          // Start the refresh process and store the promise
          this.tokenRefreshPromise = (async () => {
            try {
              const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession()
              
              if (refreshError || !newSession) {
                console.error('Failed to refresh token for API call:', refreshError)
                return null
              }
              
              console.log('Token successfully refreshed')
              return newSession.access_token
            } catch (err) {
              console.error('Error during token refresh:', err)
              return null
            } finally {
              // Clear the promise when done
              this.tokenRefreshPromise = null
            }
          })()
          
          return this.tokenRefreshPromise
        }
      }

      return session.access_token
    } catch (err) {
      console.error('Error getting auth token for API:', err)
      return null
    }
  }

  private async getAuthToken(): Promise<string | null> {
    return this.refreshTokenIfNeeded()
  }

  private async makeRequestInternal<T>(
    endpoint: string, 
    options: ApiRequestOptions = {},
    isRetry = false
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      headers = {},
      requireAuth = true,
      timeout = this.timeout
    } = options

    try {
      const url = buildApiUrl(endpoint)
      
      if (config.features.enableDebugLogs) {
        console.log(`🔄 API ${method} ${url}${isRetry ? ' (retry)' : ''}`, body ? { body } : '')
      }
      
      // Prepare headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
      }

      // Add authorization header if required
      if (requireAuth) {
        const token = await this.getAuthToken()
        if (!token) {
          const error = 'Authentication required'
          if (config.features.enableDebugLogs) {
            console.error('❌ API Error:', error)
          }
          return {
            error,
            status: 401,
            statusText: 'Unauthorized'
          }
        }
        requestHeaders['Authorization'] = `Bearer ${token}`
      }

      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      // Make the request
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      let responseData
      try {
        responseData = await response.json()
      } catch {
        responseData = null
      }

      if (!response.ok) {
        const error = responseData?.detail || responseData?.error || responseData?.message || `HTTP ${response.status}`
        
        if (config.features.enableDebugLogs) {
          console.error(`❌ API Error ${response.status}:`, error)
        }

        // If we get a 401 and haven't already retried, force token refresh and retry
        if (response.status === 401 && !isRetry && requireAuth) {
          console.log('Got 401, forcing token refresh and retrying...')
          // Clear any existing refresh promise to force a new refresh
          this.tokenRefreshPromise = null
          return this.makeRequestInternal(endpoint, options, true)
        }

        return {
          error,
          status: response.status,
          statusText: response.statusText
        }
      }

      if (config.features.enableDebugLogs) {
        console.log(`✅ API ${method} ${response.status}${isRetry ? ' (retry success)' : ''}`, responseData)
      }

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText
      }
    } catch (err) {
      let error = 'Network error'
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          error = 'Request timeout'
        } else {
          error = err.message
        }
      }

      if (config.features.enableDebugLogs) {
        console.error('❌ API request failed:', error)
      }

      return {
        error,
        status: 0
      }
    }
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequestInternal(endpoint, options, false)
  }

  // GET request
  async get<T>(endpoint: string, requireAuth = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET', requireAuth })
  }

  // POST request
  async post<T>(endpoint: string, body?: any, requireAuth = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'POST', body, requireAuth })
  }

  // PUT request
  async put<T>(endpoint: string, body?: any, requireAuth = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'PUT', body, requireAuth })
  }

  // PATCH request
  async patch<T>(endpoint: string, body?: any, requireAuth = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'PATCH', body, requireAuth })
  }

  // DELETE request
  async delete<T>(endpoint: string, requireAuth = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE', requireAuth })
  }

  // Helper method to check if user has valid session
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken()
    return token !== null
  }

  // Helper method to get current user info
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Error getting current user:', error)
      return null
    }
    return user
  }
}

// Create and export the API client instance
export const apiClient = new ApiClient()

// Export types and utilities
export type { ApiResponse, ApiError }
export { endpoints }

// Convenience methods using predefined endpoints
export const api = {
  // Health check
  health: () => apiClient.get(endpoints.health, false),
  
  // Authentication
  auth: {
    me: () => apiClient.get(endpoints.auth.me),
  },
  
  // Organization  
  organization: {
    current: () => apiClient.get(endpoints.organization.current),
  },
  
  // Signals
  signals: {
    list: () => apiClient.get(endpoints.signals.list),
    create: (data: any) => apiClient.post(endpoints.signals.create, data),
    getById: (id: string) => apiClient.get(endpoints.signals.byId(id)),
    getProducts: () => apiClient.get('/signals/products'),
    getIntentScores: (params: { date: string; product_id: string; min_score: number }) => 
      apiClient.get(`/signals/intent-scores?date=${params.date}&product_id=${params.product_id}&min_score=${params.min_score}`),
    getCompanies: (companyIds: string[]) => 
      apiClient.get(`/signals/companies?company_ids=${companyIds.join(',')}`),
    getJobs: (jobIds: string[]) => 
      apiClient.get(`/signals/jobs?job_ids=${jobIds.join(',')}`),
  },
  
  // Outreach
  outreach: {
    getCampaigns: () => apiClient.get(endpoints.outreach.campaigns),
    getSequences: () => apiClient.get(endpoints.outreach.sequences),
  },

  // Generic methods for flexibility
  get: <T>(path: string) => apiClient.get<T>(path),
  post: <T>(path: string, body?: any) => apiClient.post<T>(path, body),
}