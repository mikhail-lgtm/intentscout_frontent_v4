import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/apiClient'
import { createManagedInterval } from '../lib/globalCleanup'

export interface DecisionMaker {
  id: string
  first_name: string
  last_name: string
  job_title: string
  linkedin_url: string
  why_reach_out: string
}

export interface DecisionMakerSearchStatus {
  search_id: string
  status: 'pending' | 'searching' | 'completed' | 'failed'
  decision_makers: DecisionMaker[]
  error_message?: string
  started_at?: string
  completed_at?: string
}

interface UseDecisionMakersState {
  searchStatus: DecisionMakerSearchStatus | null
  isLoading: boolean
  error: string | null
}

interface SignalData {
  id: string
  company: {
    id: string
    name: string
    industry?: string
    companySize?: string
    website?: string
    logoUrl?: string
    profilePictureUrl?: string
    bannerUrl?: string
    aboutUs?: string
    headquarters?: string
    type?: string
    founded?: number
    specialties?: string
    vertical?: string
  }
  reasoning: string
  intentScore: number
  [key: string]: any
}

export const useDecisionMakers = (signalId: string | null | undefined) => {
  const [state, setState] = useState<UseDecisionMakersState>({
    searchStatus: null,
    isLoading: false,
    error: null
  })

  // Check for existing search when signalId changes
  const checkExistingSearch = useCallback(async () => {
    if (!signalId || signalId === '') return

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const response = await api.decisionMakers.getBySignal(signalId)
      
      if (response.error) {
        setState(prev => ({ ...prev, isLoading: false, error: response.error || 'Failed to check existing search' }))
        return
      }

      if (response.data && (response.data as any).status !== 'not_found') {
        setState(prev => ({ 
          ...prev, 
          searchStatus: response.data as DecisionMakerSearchStatus,
          isLoading: false,
          error: null
        }))
      } else {
        setState(prev => ({ 
          ...prev, 
          searchStatus: null,
          isLoading: false,
          error: null
        }))
      }
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to check existing search'
      }))
    }
  }, [signalId])

  // Start a new decision maker search
  const startSearch = useCallback(async (customGuidance?: string) => {
    if (!signalId || signalId === '') return null

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const response = await api.decisionMakers.startSearch({
        signal_id: signalId,
        custom_guidance: customGuidance?.trim() || undefined
      })

      if (response.error) {
        setState(prev => ({ ...prev, isLoading: false, error: response.error || 'Failed to start search' }))
        return null
      }

      const responseData = response.data as { search_id: string; status: 'pending' | 'searching' | 'completed' | 'failed' }
      const newSearchStatus: DecisionMakerSearchStatus = {
        search_id: responseData.search_id,
        status: responseData.status,
        decision_makers: []
      }

      setState(prev => ({ 
        ...prev, 
        searchStatus: newSearchStatus,
        isLoading: false,
        error: null
      }))

      return responseData.search_id
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to start search'
      }))
      return null
    }
  }, [signalId])

  // Poll for search status updates
  const pollSearchStatus = useCallback(async () => {
    if (!state.searchStatus?.search_id) return

    try {
      const response = await api.decisionMakers.getStatus(state.searchStatus.search_id)
      
      if (response.error) {
        console.error('Error polling search status:', response.error)
        return
      }

      if (response.data) {
        setState(prev => ({ 
          ...prev, 
          searchStatus: response.data as DecisionMakerSearchStatus,
          error: null
        }))
      }
    } catch (err) {
      console.error('Error polling search status:', err)
    }
  }, [state.searchStatus?.search_id])

  // Restart a failed search
  const restartSearch = useCallback(async () => {
    if (!state.searchStatus?.search_id) return

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const response = await api.decisionMakers.restart(state.searchStatus.search_id)
      
      if (response.error) {
        setState(prev => ({ ...prev, isLoading: false, error: response.error || 'Failed to restart search' }))
        return
      }

      setState(prev => ({ 
        ...prev, 
        searchStatus: { ...prev.searchStatus!, status: 'pending', decision_makers: [] },
        isLoading: false,
        error: null
      }))
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to restart search'
      }))
    }
  }, [state.searchStatus?.search_id])

  // Auto-poll when search is in progress
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (state.searchStatus && (state.searchStatus.status === 'pending' || state.searchStatus.status === 'searching')) {
      interval = createManagedInterval(pollSearchStatus, 3000) // Poll every 3 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [state.searchStatus?.status, pollSearchStatus])

  // Check for existing search on mount
  useEffect(() => {
    checkExistingSearch()
  }, [checkExistingSearch])

  return {
    searchStatus: state.searchStatus,
    isLoading: state.isLoading,
    error: state.error,
    startSearch,
    restartSearch,
    refreshStatus: checkExistingSearch,
    isSearchInProgress: state.searchStatus ? ['pending', 'searching'].includes(state.searchStatus.status) : false,
    hasResults: state.searchStatus ? state.searchStatus.status === 'completed' && state.searchStatus.decision_makers.length > 0 : false,
    hasFailed: state.searchStatus ? state.searchStatus.status === 'failed' : false
  }
}