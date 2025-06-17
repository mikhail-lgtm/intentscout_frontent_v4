import { useState, useEffect } from 'react'
import { api } from '../lib/apiClient'

interface HubSpotStatus {
  connected: boolean
  hub_id?: number
  scope?: string[]
  connected_at?: string
  connected_by_user_id?: string
  expires_at?: string
  organization_id?: string
}

interface UseHubSpotReturn {
  status: HubSpotStatus | null
  loading: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  refetch: () => void
}

export const useHubSpot = (): UseHubSpotReturn => {
  const [status, setStatus] = useState<HubSpotStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.hubspot.getStatus()
      
      if (response.error) {
        setError(response.error)
        return
      }
      
      setStatus(response.data)
    } catch (err) {
      console.error('Failed to fetch HubSpot status:', err)
      setError('Failed to load HubSpot integration status')
    } finally {
      setLoading(false)
    }
  }

  const connect = async () => {
    try {
      setError(null)
      
      const response = await api.hubspot.getAuthUrl()
      
      if (response.error) {
        setError(response.error)
        return
      }
      
      // Redirect to HubSpot OAuth
      window.location.href = response.data.auth_url
    } catch (err) {
      console.error('Failed to start HubSpot connection:', err)
      setError('Failed to connect to HubSpot')
    }
  }

  const disconnect = async () => {
    try {
      setError(null)
      setLoading(true)
      
      const response = await api.hubspot.disconnect()
      
      if (response.error) {
        setError(response.error)
        return
      }
      
      // Refresh status after disconnection
      await fetchStatus()
    } catch (err) {
      console.error('Failed to disconnect HubSpot:', err)
      setError('Failed to disconnect HubSpot')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  // Handle OAuth callback
  useEffect(() => {
    // Clean up old callback entries from sessionStorage (older than 1 hour)
    const cleanupOldCallbacks = () => {
      const oneHourAgo = Date.now() - (60 * 60 * 1000)
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i)
        if (key?.startsWith('hubspot_callback_')) {
          try {
            const item = sessionStorage.getItem(key)
            if (item) {
              const data = JSON.parse(item)
              if (data.timestamp && data.timestamp < oneHourAgo) {
                sessionStorage.removeItem(key)
              }
            }
          } catch {
            // Remove invalid entries
            sessionStorage.removeItem(key)
          }
        }
      }
    }
    
    cleanupOldCallbacks()
    
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const state = urlParams.get('state')
      
      // Check if this is a HubSpot callback by looking for code and state from HubSpot OAuth
      if (code && state && state.startsWith('org_')) {
        const callbackKey = `hubspot_callback_${code}_${state}`
        
        // Check if this callback has already been processed
        const existingCallback = sessionStorage.getItem(callbackKey)
        if (existingCallback) {
          console.log('HubSpot callback already processed, skipping...')
          // Clean up URL without processing
          const newUrl = window.location.pathname
          window.history.replaceState({}, document.title, newUrl)
          return
        }
        
        // Mark this callback as being processed immediately
        sessionStorage.setItem(callbackKey, JSON.stringify({
          status: 'processing',
          timestamp: Date.now()
        }))
        
        // Clean up URL immediately to prevent reprocessing
        const newUrl = window.location.pathname
        window.history.replaceState({}, document.title, newUrl)
        
        try {
          setLoading(true)
          setError(null)
          
          console.log('Processing HubSpot callback...', { code: code.substring(0, 10) + '...', state })
          
          const response = await api.hubspot.callback(code, state)
          
          if (response.error) {
            console.error('HubSpot callback error:', response.error)
            setError(response.error)
            // Remove the processing flag on error so it can be retried
            sessionStorage.removeItem(callbackKey)
          } else {
            console.log('HubSpot callback successful')
            // Mark as completed
            sessionStorage.setItem(callbackKey, JSON.stringify({
              status: 'completed',
              timestamp: Date.now()
            }))
            // Refresh status to show connected state
            await fetchStatus()
          }
        } catch (err) {
          console.error('Failed to complete HubSpot callback:', err)
          setError('Failed to complete HubSpot connection')
          // Remove the processing flag on error so it can be retried
          sessionStorage.removeItem(callbackKey)
        } finally {
          setLoading(false)
        }
      }
    }

    handleCallback()
  }, [])

  return {
    status,
    loading,
    error,
    connect,
    disconnect,
    refetch: fetchStatus
  }
}