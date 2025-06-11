// Centralized configuration for the application
export const config = {
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'https://api.intentscout.ai/api',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
  },
  
  // Supabase Configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  
  // Environment Detection
  env: {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    mode: import.meta.env.MODE,
  },
  
  // Feature Flags
  features: {
    enableDebugLogs: import.meta.env.DEV,
    enableAnalytics: import.meta.env.PROD,
  }
} as const

// Validate required environment variables
export function validateConfig() {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ]
  
  const missing = required.filter(key => !import.meta.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// API Endpoints - Single source of truth
export const endpoints = {
  // Health & Status
  health: '/health',
  
  // Authentication
  auth: {
    me: '/user/me',
  },
  
  // Organization
  organization: {
    current: '/organization/current',
  },
  
  // Signals (to be added)
  signals: {
    list: '/signals',
    create: '/signals',
    byId: (id: string) => `/signals/${id}`,
  },
  
  // Outreach (to be added)
  outreach: {
    campaigns: '/outreach/campaigns',
    sequences: '/outreach/sequences',
  }
} as const

// Helper function to build full URL
export function buildApiUrl(endpoint: string): string {
  const baseUrl = config.api.baseUrl.replace(/\/$/, '') // Remove trailing slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${baseUrl}${cleanEndpoint}`
}