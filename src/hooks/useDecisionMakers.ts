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
    if (!signalId || signalId === '') {
      console.log('DecisionMakers: No signalId provided:', signalId)
      return
    }

    try {
      console.log('DecisionMakers: Checking existing search for signalId:', signalId)
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await api.decisionMakers.getBySignal(signalId)
      console.log('DecisionMakers: API response:', JSON.stringify(response, null, 2))

      if (response.error) {
        console.error('DecisionMakers: API error:', response.error)
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
    if (!signalId || signalId === '') {
      console.log('DecisionMakers: Cannot start search - no signalId provided:', signalId)
      return null
    }

    try {
      console.log('DecisionMakers: Starting search for signalId:', signalId, 'with guidance:', customGuidance)
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await api.decisionMakers.startSearch({
        signal_id: signalId,
        custom_guidance: customGuidance?.trim() || undefined
      })
      console.log('DecisionMakers: Start search response:', JSON.stringify(response, null, 2))

      if (response.error) {
        console.error('DecisionMakers: Start search error:', response.error)
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
  const pollSearchStatus = useCallback(async (searchId: string) => {
    if (!searchId) {
      console.log('DecisionMakers: No search_id for polling')
      return
    }

    try {
      console.log('DecisionMakers: Polling status for search_id:', searchId)
      const response = await api.decisionMakers.getStatus(searchId)
      console.log('DecisionMakers: Poll response:', JSON.stringify(response, null, 2))

      if (response.error) {
        console.error('DecisionMakers: Polling error:', response.error)
        return
      }

      if (response.data) {
        const newStatus = response.data as DecisionMakerSearchStatus
        console.log('DecisionMakers: New status:', newStatus.status, 'Decision makers count:', newStatus.decision_makers?.length || 0)
        setState(prev => ({
          ...prev,
          searchStatus: newStatus,
          error: null
        }))
      }
    } catch (err) {
      console.error('Error polling search status:', err)
    }
  }, [])

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
    const searchId = state.searchStatus?.search_id
    const status = state.searchStatus?.status
    const dmCount = state.searchStatus?.decision_makers?.length || 0

    if (!searchId) return

    let interval: NodeJS.Timeout | null = null

    // Continue polling until we have results OR status is failed
    // This handles case where status="completed" but decision_makers not yet populated
    const shouldPoll = (status === 'pending' || status === 'searching') ||
                       (status === 'completed' && dmCount === 0)

    console.log('DecisionMakers: Polling check - status:', status, 'dmCount:', dmCount, 'shouldPoll:', shouldPoll)

    if (shouldPoll) {
      console.log('DecisionMakers: Starting polling interval')
      interval = createManagedInterval(() => pollSearchStatus(searchId), 3000) // Poll every 3 seconds
    } else if (status === 'completed' && dmCount > 0) {
      console.log('DecisionMakers: Search completed with results, stopping polling')
    } else {
      console.log('DecisionMakers: Not starting polling')
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [state.searchStatus?.search_id, state.searchStatus?.status, state.searchStatus?.decision_makers?.length, pollSearchStatus])

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
    isSearchInProgress: state.searchStatus ? ['pending', 'searching'].includes(state.searchStatus.status) && state.searchStatus.decision_makers.length === 0 : false,
    hasResults: state.searchStatus ? state.searchStatus.decision_makers.length > 0 : false,
    hasFailed: state.searchStatus ? state.searchStatus.status === 'failed' : false
  }
}