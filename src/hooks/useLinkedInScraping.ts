import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/apiClient'

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

  // Poll for scraping status when in progress
  useEffect(() => {
    if (!isScrapingInProgress || !scrapingStatus?.scraping_id) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await api.linkedInScraping.getStatus(scrapingStatus.scraping_id)
        if (response.data) {
          setScrapingStatus(response.data)
          
          // Stop polling if completed or failed
          if (response.data.status === 'completed' || response.data.status === 'failed') {
            clearInterval(pollInterval)
          }
        }
      } catch (err) {
        console.error('Failed to poll scraping status:', err)
        setError('Failed to check scraping status')
        clearInterval(pollInterval)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
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
      
      if (response.data) {
        setScrapingStatus(response.data)
        return response.data.scraping_id
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
    if (!signalId) return
    
    try {
      // This would need to be implemented if we want to check for existing results
      // For now, we'll just reset the state
      setScrapingStatus(null)
      setError(null)
    } catch (err) {
      console.error('Failed to check existing scraping results:', err)
    }
  }, [signalId])

  // Reset state
  const reset = useCallback(() => {
    setScrapingStatus(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    scrapingStatus,
    isLoading,
    error,
    isScrapingInProgress,
    hasResults,
    hasFailed,
    startScraping,
    checkExistingResults,
    reset
  }
}