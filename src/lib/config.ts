// Centralized configuration for the application
export const config = {
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'https://api.intentscout.ai/',
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
    members: '/organization/members',
  },
  
  // Signals (to be added)
  signals: {
    list: '/signals',
    create: '/signals',
    // Note: Individual signal endpoint doesn't exist - use outreach/signals instead
  },
  
  // Outreach (to be added)
  outreach: {
    campaigns: '/outreach/campaigns',
    sequences: '/outreach/sequences',
    signals: '/outreach/signals',
  },

  // Sequences (user-created sequences)
  sequences: {
    list: '/sequences',
    create: '/sequences',
    getById: (sequenceId: string) => `/sequences/${sequenceId}`,
    update: (sequenceId: string) => `/sequences/${sequenceId}`,
    delete: (sequenceId: string) => `/sequences/${sequenceId}`,
    duplicate: (sequenceId: string) => `/sequences/${sequenceId}/duplicate`,
    updateStatus: (sequenceId: string) => `/sequences/${sequenceId}/status`,
  },

  // Decision Makers
  decisionMakers: {
    startSearch: '/decision-makers/start-search',
    getStatus: (searchId: string) => `/decision-makers/search/${searchId}/status`,
    getBySignal: (signalId: string) => `/decision-makers/signal/${signalId}`,
    restart: (searchId: string) => `/decision-makers/search/${searchId}/restart`,
  },

  // Contacts
  contacts: {
    create: '/contacts',
    getBySignal: (signalId: string) => `/contacts/signal/${signalId}`,
    getById: (contactId: string) => `/contacts/${contactId}`,
    update: (contactId: string) => `/contacts/${contactId}`,
    delete: (contactId: string) => `/contacts/${contactId}`,
  },

  // HubSpot Integration
  hubspot: {
    authUrl: '/hubspot/auth-url',
    callback: '/hubspot/callback',
    status: '/hubspot/status',
    disconnect: '/hubspot/disconnect',
    refreshToken: '/hubspot/refresh-token',
  },

  // Settings
  settings: {
    hubspot: '/settings/hubspot',
    hubspotSignal: (signalId: string) => `/settings/hubspot/signal/${signalId}`,
    hubspotSequences: '/settings/hubspot/sequences',
    validateSequence: '/settings/validate-sequence',
    previewCompany: (signalId: string) => `/settings/hubspot/companies/preview/${signalId}`,
    importCompany: (signalId: string) => `/settings/hubspot/companies/import/${signalId}`,
    companyImportStatus: (signalId: string) => `/settings/hubspot/companies/status/${signalId}`,
    previewContacts: (signalId: string) => `/settings/hubspot/contacts/preview/${signalId}`,
    importContacts: (signalId: string) => `/settings/hubspot/contacts/import/${signalId}`,
    contactsImportStatus: (signalId: string) => `/settings/hubspot/contacts/status/${signalId}`,
  },

  // Email Generation
  emails: {
    generate: '/emails/generate',
    getGeneration: (generationId: string) => `/emails/generation/${generationId}`,
    listGenerations: '/emails/generations',
  }
} as const

// Helper function to build full URL
export function buildApiUrl(endpoint: string): string {
  const baseUrl = config.api.baseUrl.replace(/\/$/, '') // Remove trailing slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${baseUrl}${cleanEndpoint}`
}
