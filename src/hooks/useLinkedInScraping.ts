import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/apiClient'
import { createManagedInterval } from '../lib/globalCleanup'

export interface ScrapedProfile {
  contact_id: string
  url: string
  first_name: string
  last_name: string
  full_name: string
  headline: string
  current_position: string
  company: string
  location: string
  summary: string
  profile_picture_url: string
  status: 'scraped' | 'timeout' | 'error'
}

export interface ScrapingStatus {
  scraping_id: string
  total_contacts: number
  contacts_processed: number
  scraped_profiles: ScrapedProfile[]
  status: 'in_progress' | 'completed' | 'failed'
  error_message?: string
}

export const useLinkedInScraping = (signalId?: string) => {
  const [scrapingStatus, setScrapingStatus] = useState<ScrapingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if scraping is currently in progress
  const isScrapingInProgress = scrapingStatus?.status === 'in_progress'
  
  // Check if we have completed results
  const hasResults = scrapingStatus?.status === 'completed' && (scrapingStatus?.scraped_profiles?.length || 0) > 0
  
  // Check if scraping failed
  const hasFailed = scrapingStatus?.status === 'failed'

  // FIXED: Proper interval cleanup with ref tracking
  useEffect(() => {
    if (!isScrapingInProgress || !scrapingStatus?.scraping_id) return

    let shortInterval: NodeJS.Timeout | null = null
    let longInterval: NodeJS.Timeout | null = null
    let pollCount = 0

    const pollStatus = async () => {
      try {
        const response = await api.linkedInScraping.getStatus(scrapingStatus.scraping_id)
        if (response.data && typeof response.data === 'object') {
          const data = response.data as ScrapingStatus
          setScrapingStatus(data)

          // Stop polling if completed or failed
          if (data.status === 'completed' || data.status === 'failed') {
            if (shortInterval) {
              clearInterval(shortInterval)
              shortInterval = null
            }
            if (longInterval) {
              clearInterval(longInterval)
              longInterval = null
            }
            return
          }
        }

        pollCount++
        // After 6 polls (30 seconds), switch to longer interval
        if (pollCount > 6 && shortInterval && !longInterval) {
          clearInterval(shortInterval)
          shortInterval = null
          longInterval = createManagedInterval(pollStatus, 15000)
        }

      } catch (err) {
        console.error('Failed to poll scraping status:', err)
        setError('Failed to check scraping status')
        if (shortInterval) {
          clearInterval(shortInterval)
          shortInterval = null
        }
        if (longInterval) {
          clearInterval(longInterval)
          longInterval = null
        }
      }
    }

    shortInterval = createManagedInterval(pollStatus, 5000) // Poll every 5 seconds initially

    return () => {
      if (shortInterval) {
        clearInterval(shortInterval)
        shortInterval = null
      }
      if (longInterval) {
        clearInterval(longInterval)
        longInterval = null
      }
    }
  }, [isScrapingInProgress, scrapingStatus?.scraping_id])

  // Start LinkedIn scraping
  const startScraping = useCallback(async (contacts: any[]) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await api.linkedInScraping.scrape({
        contacts: contacts,
        signal_id: signalId
      })
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      if (response.data && typeof response.data === 'object') {
        const data = response.data as ScrapingStatus
        setScrapingStatus(data)
        return data.scraping_id
      }
      
      return null
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to start LinkedIn scraping'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [signalId])

  // Get existing scraping results if any
  const checkExistingResults = useCallback(async () => {
    if (!signalId || signalId === '') return

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await api.linkedInScraping.getStatus(signalId)
      
      if (response.error) {
        setError(response.error)
        return
      }

      if (response.data && typeof response.data === 'object') {
        const data = response.data as any
        if (data.status !== 'not_found') {
          setScrapingStatus(data as ScrapingStatus)
        } else {
          setScrapingStatus(null)
        }
      } else {
        setScrapingStatus(null)
      }
    } catch (err) {
      console.error('Failed to check existing scraping results:', err)
      setError(err instanceof Error ? err.message : 'Failed to check existing results')
    } finally {
      setIsLoading(false)
    }
  }, [signalId])

  // Reset state
  const reset = useCallback(() => {
    setScrapingStatus(null)
    setError(null)
    setIsLoading(false)
  }, [])

  // Check for existing results on mount and signal change
  useEffect(() => {
    if (signalId) {
      checkExistingResults()
    }
  }, [signalId, checkExistingResults])

  return {
    scrapingStatus,
    isLoading,
    error,
    isScrapingInProgress,
    hasResults,
    hasFailed,
    startScraping,
    checkExistingResults, // Export for lazy loading
    refreshStatus: checkExistingResults,
    reset
  }
}