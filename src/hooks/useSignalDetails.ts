import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/apiClient'
import { Signal } from './useSignals'
import { ApprovedSignal } from './useApprovedSignals'

interface UseSignalDetailsResult {
  signal: Signal | null
  isLoading: boolean
  error: string | null
}

interface UseSignalDetailsParams {
  approvedSignal: ApprovedSignal | null
  productId: string
  minScore: number
}

/**
 * Hook to get full signal details from an ApprovedSignal
 * FIXED: Back to fetching actual signal details for IntentCard
 */
export const useSignalDetails = ({ approvedSignal, productId, minScore }: UseSignalDetailsParams): UseSignalDetailsResult => {
  const [signal, setSignal] = useState<Signal | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSignalDetails = useCallback(async () => {
    if (!approvedSignal) {
      setSignal(null)
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use outreach signals endpoint to get signals, then find the one we want
      // This is a workaround since /signals/{id} doesn't exist
      const response = await api.outreach.getSignals({
        product_id: productId,
        min_score: Math.min(minScore, 1), // Use provided minScore or 1, whichever is lower
        limit: 50 // Higher limit to increase chance of finding our signal
      })
      
      if (response.error) {
        throw new Error(response.error)
      }

      const signals = response.data as Signal[]
      const foundSignal = signals.find(s => s.id === approvedSignal.id)
      
      if (!foundSignal) {
        // If not found in outreach signals, create a basic Signal object from ApprovedSignal
        // This ensures IntentCard always gets valid data
        const basicSignal: Signal = {
          id: approvedSignal.id,
          company: {
            id: approvedSignal.companyId,
            name: approvedSignal.companyName,
            logoUrl: approvedSignal.companyLogoUrl
          },
          intentScore: approvedSignal.intentScore,
          reasoning: 'Signal details not available',
          citations: [],
          date: approvedSignal.date,
          modelUsed: '',
          calculationTimestamp: approvedSignal.calculationTimestamp,
          jobsFoundCount: approvedSignal.jobsFoundCount,
          decision: approvedSignal.decision as 'approve' | 'reject' | null,
          jobs: []
        }
        setSignal(basicSignal)
      } else {
        setSignal(foundSignal)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch signal details'
      setError(errorMessage)
      console.error('Error fetching signal details:', err)
    } finally {
      setIsLoading(false)
    }
  }, [approvedSignal, productId, minScore])

  useEffect(() => {
    fetchSignalDetails()
  }, [fetchSignalDetails])

  return {
    signal,
    isLoading,
    error
  }
}