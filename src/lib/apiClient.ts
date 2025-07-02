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
          // Log full response data for debugging validation errors
          if (response.status === 422 && responseData) {
            console.error('Full 422 error details:', responseData)
          }
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

  // GET request with custom timeout
  async getWithTimeout<T>(endpoint: string, timeoutMs: number, requireAuth = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET', requireAuth, timeout: timeoutMs })
  }

  // POST request
  async post<T>(endpoint: string, body?: any, requireAuth = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'POST', body, requireAuth })
  }

  // POST request with custom timeout
  async postWithTimeout<T>(endpoint: string, body?: any, timeoutMs: number = this.timeout, requireAuth = true): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'POST', body, requireAuth, timeout: timeoutMs })
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
    members: () => apiClient.get(endpoints.organization.members),
  },
  
  // Signals
  signals: {
    list: () => apiClient.get(endpoints.signals.list),
    create: (data: any) => apiClient.post(endpoints.signals.create, data),
    getProducts: () => apiClient.get('/signals/products'),
    // New composite endpoint - replaces need for 3 separate API calls
    getComplete: (params: { date: string; product_id: string; min_score: number }) =>
      apiClient.get(`/signals/complete?date=${params.date}&product_id=${params.product_id}&min_score=${params.min_score}`),
    // Legacy endpoints - consider deprecating these in favor of getComplete
    getIntentScores: (params: { date: string; product_id: string; min_score: number }) => 
      apiClient.get(`/signals/intent-scores?date=${params.date}&product_id=${params.product_id}&min_score=${params.min_score}`),
    getCompanies: (companyIds: string[]) => 
      apiClient.get(`/signals/companies?company_ids=${companyIds.join(',')}`),
    getJobs: (jobIds: string[]) => 
      apiClient.get(`/signals/jobs?job_ids=${jobIds.join(',')}`),
    updateDecision: (signalId: string, action: 'approve' | 'reject' | 'remove') =>
      apiClient.post('/signals/update-decision', { signalId, action }),
    getSignalCounts: (params: { start_date: string; end_date: string; product_id: string; min_score: number; decision_filter?: string }) => {
      const searchParams = new URLSearchParams({
        start_date: params.start_date,
        end_date: params.end_date,
        product_id: params.product_id,
        min_score: params.min_score.toString()
      })
      
      if (params.decision_filter) searchParams.append('decision_filter', params.decision_filter)
      
      return apiClient.get(`/signals/signal-counts?${searchParams.toString()}`)
    },
    getApprovedSignals: (params: { product_id: string; min_score: number; search?: string; date_filter?: string; limit?: number; offset?: number }) => {
      const searchParams = new URLSearchParams({
        product_id: params.product_id,
        min_score: params.min_score.toString(),
        limit: (params.limit || 50).toString(),
        offset: (params.offset || 0).toString()
      })
      
      if (params.search) searchParams.append('search', params.search)
      if (params.date_filter) searchParams.append('date_filter', params.date_filter)
      
      return apiClient.get(`/signals/approved?${searchParams.toString()}`)
    },
  },
  
  // Outreach
  outreach: {
    getCampaigns: () => apiClient.get(endpoints.outreach.campaigns),
    getSequences: () => apiClient.get(endpoints.outreach.sequences),
    getSignals: (params: { product_id: string; min_score: number; limit?: number }) => {
      const searchParams = new URLSearchParams({
        product_id: params.product_id,
        min_score: params.min_score.toString(),
        limit: (params.limit || 1).toString()
      })
      
      return apiClient.get(`${endpoints.outreach.signals}?${searchParams.toString()}`)
    },
  },

  // Decision Makers
  decisionMakers: {
    startSearch: (data: { 
      signal_id: string; 
      custom_guidance?: string;
    }) => 
      apiClient.post(endpoints.decisionMakers.startSearch, data),
    getStatus: (searchId: string) => 
      apiClient.getWithTimeout(endpoints.decisionMakers.getStatus(searchId), 200000), // 200 seconds
    getBySignal: (signalId: string) => 
      apiClient.get(endpoints.decisionMakers.getBySignal(signalId)),
    restart: (searchId: string) => 
      apiClient.post(endpoints.decisionMakers.restart(searchId)),
  },

  // Email Finder (Copied from Decision Makers pattern)
  emailFinder: {
    startSearch: (data: { 
      signal_id: string;
    }) => 
      apiClient.post('/email-finder/start-search', data),
    getStatus: (searchId: string) => 
      apiClient.getWithTimeout(`/email-finder/search/${searchId}/status`, 200000), // 200 seconds
    getBySignal: (signalId: string) => 
      apiClient.get(`/email-finder/signal/${signalId}`),
    restart: (searchId: string) => 
      apiClient.post(`/email-finder/search/${searchId}/restart`),
  },

  // Contacts  
  contacts: {
    getAll: (limit = 100, offset = 0) => 
      apiClient.get(`${endpoints.contacts.create}?limit=${limit}&offset=${offset}`),
    create: (data: any) => apiClient.post(endpoints.contacts.create, data),
    getBySignal: (signalId: string) => 
      apiClient.get(endpoints.contacts.getBySignal(signalId)),
    getById: (contactId: string) => 
      apiClient.get(endpoints.contacts.getById(contactId)),
    update: (contactId: string, data: any) => 
      apiClient.patch(endpoints.contacts.update(contactId), data),
    delete: (contactId: string) => 
      apiClient.delete(endpoints.contacts.delete(contactId)),
    importDecisionMaker: (data: {
      signal_id: string;
      decision_maker_id: string;
      first_name: string;
      last_name: string;
      job_title: string;
      linkedin_url: string;
      why_reach_out: string;
    }) => 
      apiClient.post('/contacts/import-decision-maker', data),
    bulkImportDecisionMakers: (data: {
      signal_id: string;
      decision_makers: Array<{
        signal_id: string;
        decision_maker_id: string;
        first_name: string;
        last_name: string;
        job_title: string;
        linkedin_url: string;
        why_reach_out: string;
      }>;
    }) => 
      apiClient.post('/contacts/bulk-import-decision-makers', data),
  },

  // Sequences
  sequences: {
    list: (status?: string, limit = 50, offset = 0) => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      })
      if (status) params.append('status', status)
      return apiClient.get(`${endpoints.sequences.list}?${params.toString()}`)
    },
    create: (data: {
      name: string;
      description?: string;
      blocks?: any[];
    }) => 
      apiClient.post(endpoints.sequences.create, data),
    getById: (sequenceId: string) => 
      apiClient.get(endpoints.sequences.getById(sequenceId)),
    update: (sequenceId: string, data: {
      name?: string;
      description?: string;
      status?: string;
      blocks?: any[];
    }) => 
      apiClient.patch(endpoints.sequences.update(sequenceId), data),
    delete: (sequenceId: string) => 
      apiClient.delete(endpoints.sequences.delete(sequenceId)),
    duplicate: (sequenceId: string) => 
      apiClient.post(endpoints.sequences.duplicate(sequenceId)),
    updateStatus: (sequenceId: string, status: string) => 
      apiClient.patch(`${endpoints.sequences.updateStatus(sequenceId)}?status=${status}`)
  },

  // HubSpot Integration
  hubspot: {
    getAuthUrl: () => apiClient.get(endpoints.hubspot.authUrl),
    callback: (code: string, state: string) => 
      apiClient.post(`${endpoints.hubspot.callback}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`),
    getStatus: () => apiClient.get(endpoints.hubspot.status),
    disconnect: () => apiClient.delete(endpoints.hubspot.disconnect),
    refreshToken: () => apiClient.post(endpoints.hubspot.refreshToken),
  },

  // Settings
  settings: {
    getHubSpot: () => apiClient.get(endpoints.settings.hubspot),
    updateHubSpot: (data: any) => apiClient.post(endpoints.settings.hubspot, data),
    getSignalHubSpot: (signalId: string) => 
      apiClient.get(endpoints.settings.hubspotSignal(signalId)),
    updateSignalHubSpot: (signalId: string, data: any) => 
      apiClient.post(endpoints.settings.hubspotSignal(signalId), data),
    getHubSpotSequences: () => 
      apiClient.get(endpoints.settings.hubspotSequences),
    getHubSpotSequenceDetails: (sequenceId: string) => 
      apiClient.get(`${endpoints.settings.hubspotSequences}/${sequenceId}`),
    validateSequence: (internalSequenceId: string, hubspotSequenceId: string) =>
      apiClient.post(endpoints.settings.validateSequence, { 
        internal_sequence_id: internalSequenceId, 
        hubspot_sequence_id: hubspotSequenceId 
      }),
    previewCompany: (signalId: string) =>
      apiClient.get(endpoints.settings.previewCompany(signalId)),
    importCompany: (signalId: string, data: { properties: Record<string, string> }) =>
      apiClient.post(endpoints.settings.importCompany(signalId), data),
    getCompanyImportStatus: (signalId: string) =>
      apiClient.get(endpoints.settings.companyImportStatus(signalId)),
    previewContacts: (signalId: string) =>
      apiClient.get(endpoints.settings.previewContacts(signalId)),
    importContacts: (signalId: string, data: { contacts: any[] }) =>
      apiClient.post(endpoints.settings.importContacts(signalId), data),
    getContactsImportStatus: (signalId: string) =>
      apiClient.get(endpoints.settings.contactsImportStatus(signalId)),
    enrollContactsInSequence: (signalId: string, data: {
      sequence_id: string;
      sender_email: string;
      contact_ids: string[];
    }) =>
      apiClient.post(`/settings/hubspot/contacts/enroll-sequence/${signalId}`, data),
  },

  // Email Generation
  emails: {
    generate: (data: {
      sequence_id: string;
      contacts: any[];
      signal_id?: string;
      company_data?: any;
      custom_data?: any;
    }) => apiClient.post(endpoints.emails.generate, data),
    generateForContact: (data: {
      sequence_id: string;
      contact: any;
      signal_id?: string;
      company_data?: any;
      custom_data?: any;
    }) => apiClient.post(endpoints.emails.generate, {
      sequence_id: data.sequence_id,
      contacts: [data.contact],
      signal_id: data.signal_id,
      company_data: data.company_data,
      custom_data: data.custom_data
    }),
    getGeneration: (generationId: string) => 
      apiClient.get(endpoints.emails.getGeneration(generationId)),
    getBySignal: (signalId: string) => 
      apiClient.get(`/emails/signal/${signalId}`),
    getByContact: (contactId: string) => 
      apiClient.get(`/emails/contact/${contactId}`),
    listGenerations: (limit = 20) => 
      apiClient.get(`${endpoints.emails.listGenerations}?limit=${limit}`),
  },

  // Signal Notes
  signalNotes: {
    save: (data: {
      signal_id: string;
      email_footer_name?: string;
      email_footer_company?: string;
      other_notes?: string;
      value_prop?: string;
    }) => apiClient.post('/signal-notes', data),
    get: (signalId: string) => 
      apiClient.get(`/signal-notes/${signalId}`),
  },

  // LinkedIn Scraping
  linkedInScraping: {
    scrape: (data: {
      contacts: any[];
      signal_id?: string;
    }) => apiClient.post('/linkedin-scraping/scrape', data),
    getStatus: (scrapingId: string) => 
      apiClient.get(`/linkedin-scraping/status/${scrapingId}`),
    getContactProfile: (contactId: string) => 
      apiClient.get(`/linkedin-scraping/contact/${contactId}`),
  },

  // Email Validation
  emailValidation: {
    validateGeneration: (data: {
      sequence_id: string;
      contact_ids: string[];
      signal_id: string;
    }) => 
      apiClient.post('/email-validation/validate-generation', data),
  },

  // Coactor (Memory.Actor RAG API for Value Propositions)
  coactor: {
    generateValueProp: (data: {
      signal_id: string;
      custom_guidance?: string;
    }) => 
      apiClient.postWithTimeout('/coactor/generate-value-prop', data, 90000), // 90 seconds
  },

  // Generic methods for flexibility
  get: <T>(path: string) => apiClient.get<T>(path),
  post: <T>(path: string, body?: any) => apiClient.post<T>(path, body),
}