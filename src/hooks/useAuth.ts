import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/apiClient'
import type { User, Organization, AuthState } from '../types'

// Module-level cache to prevent duplicate organization requests
let organizationCache: Organization | null = null
let organizationPromise: Promise<Organization | null> | null = null

// Load cached organization from localStorage on module load
try {
  const cachedOrg = localStorage.getItem('intentscout_organization')
  if (cachedOrg) {
    organizationCache = JSON.parse(cachedOrg)
  }
} catch (error) {
  console.warn('Failed to load cached organization from localStorage:', error)
}

const fetchOrganization = async (): Promise<Organization | null> => {
  // Return cached result if available
  if (organizationCache) {
    return organizationCache
  }
  
  // Return existing promise if request is in flight
  if (organizationPromise) {
    return organizationPromise
  }
  
  // Create new request
  organizationPromise = (async () => {
    try {
      console.log('Fetching organization (single request)')
      const response = await api.organization.current()
      console.log('Organization API response:', response)
      
      if (response.data) {
        const orgData = response.data as { id: string; name: string; logoUrl?: string }
        organizationCache = {
          id: orgData.id,
          name: orgData.name,
          logoUrl: orgData.logoUrl,
        }
        // Persist to localStorage for future sessions
        try {
          localStorage.setItem('intentscout_organization', JSON.stringify(organizationCache))
        } catch (error) {
          console.warn('Failed to cache organization to localStorage:', error)
        }
        console.log('Cached organization:', organizationCache)
        return organizationCache
      } else {
        console.error('Organization API error:', response.error)
        organizationCache = {
          id: 'unknown',
          name: 'IntentScout User',
          logoUrl: undefined,
        }
        return organizationCache
      }
    } catch (error) {
      console.error('Failed to load organization:', error)
      organizationCache = {
        id: 'unknown',
        name: 'IntentScout User',
        logoUrl: undefined,
      }
      return organizationCache
    } finally {
      organizationPromise = null
    }
  })()
  
  return organizationPromise
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    organization: null,
    loading: true,
    error: null,
  })
  const organizationRequestedRef = useRef(false)

  useEffect(() => {
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (error) {
          console.error('Error getting session:', error)
          setAuthState({ user: null, organization: null, loading: false, error: error.message })
          return
        }

        if (session?.user) {
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            organizationId: session.user.user_metadata?.organizationId,
            createdAt: session.user.created_at,
          }
          // Preserve existing organization data during initial session load
          setAuthState(prev => ({ 
            ...prev, 
            user, 
            loading: false, 
            error: null 
          }))
        } else {
          setAuthState({ user: null, organization: null, loading: false, error: null })
        }
      } catch (error) {
        if (!mounted) return
        console.error('Error in getInitialSession:', error)
        setAuthState({ user: null, organization: null, loading: false, error: 'Failed to initialize auth' })
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return

        if (session?.user) {
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            organizationId: session.user.user_metadata?.organizationId,
            createdAt: session.user.created_at,
          }
          // Preserve existing organization data when updating user
          setAuthState(prev => ({ 
            ...prev, 
            user, 
            loading: false, 
            error: null 
          }))
        } else {
          // Clear organization cache when signing out
          organizationCache = null
          organizationRequestedRef.current = false
          try {
            localStorage.removeItem('intentscout_organization')
          } catch (error) {
            console.warn('Failed to clear cached organization from localStorage:', error)
          }
          setAuthState({ user: null, organization: null, loading: false, error: null })
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Load cached organization immediately if available
  useEffect(() => {
    if (organizationCache && authState.user && !authState.organization) {
      setAuthState(prev => ({ ...prev, organization: organizationCache }))
    }
  }, [authState.user, authState.organization])

  // Load organization once when user is authenticated
  useEffect(() => {
    if (authState.user && !organizationRequestedRef.current) {
      organizationRequestedRef.current = true
      
      const loadOrganization = async () => {
        const organization = await fetchOrganization()
        if (organization) {
          setAuthState(prev => ({ ...prev, organization }))
        }
      }
      
      loadOrganization()
    }
  }, [authState.user])

  const signIn = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error: error.message }))
        return { error: error.message }
      }

      return { error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed'
      setAuthState(prev => ({ ...prev, loading: false, error: message }))
      return { error: message }
    }
  }

  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }))
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session for token:', error)
        return null
      }

      return session?.access_token || null
    } catch (err) {
      console.error('Error in getAuthToken:', err)
      return null
    }
  }

  const refreshToken = async (): Promise<string | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Error refreshing session:', error)
        return null
      }

      return session?.access_token || null
    } catch (err) {
      console.error('Error in refreshToken:', err)
      return null
    }
  }

  const getValidToken = async (): Promise<string | null> => {
    try {
      // First try to get current session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        return null
      }

      if (!session) {
        return null
      }

      // Check if token is expired (with 5 minute buffer)
      const expiresAt = session.expires_at
      const now = Date.now() / 1000
      const bufferTime = 5 * 60 // 5 minutes in seconds

      if (expiresAt && (expiresAt - bufferTime) <= now) {
        console.log('Token expiring soon, refreshing...')
        return await refreshToken()
      }

      return session.access_token
    } catch (err) {
      console.error('Error in getValidToken:', err)
      return null
    }
  }

  return {
    ...authState,
    signIn,
    signOut,
    getAuthToken,
    refreshToken,
    getValidToken,
  }
}