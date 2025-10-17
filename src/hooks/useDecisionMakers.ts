import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/apiClient'

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

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

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
        const data = response.data as any
        // Convert _id to search_id if needed (API returns _id, interface expects search_id)
        const searchStatus: DecisionMakerSearchStatus = {
          search_id: data.search_id || data._id,
          status: data.status,
          decision_makers: data.decision_makers || [],
          error_message: data.error_message,
          started_at: data.started_at,
          completed_at: data.completed_at
        }
        console.log('DecisionMakers: Converted API response - search_id:', searchStatus.search_id)
        setState(prev => ({
          ...prev,
          searchStatus,
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
        const data = response.data as any
        // Convert _id to search_id if needed (API returns _id, interface expects search_id)
        const newStatus: DecisionMakerSearchStatus = {
          search_id: data.search_id || data._id,
          status: data.status,
          decision_makers: data.decision_makers || [],
          error_message: data.error_message,
          started_at: data.started_at,
          completed_at: data.completed_at
        }
        const newDmCount = newStatus.decision_makers?.length || 0
        console.log('DecisionMakers: New status:', newStatus.status, 'Decision makers count:', newDmCount, 'search_id:', newStatus.search_id)

        // Force React to detect changes by creating new object
        setState(prev => {
          const prevDmCount = prev.searchStatus?.decision_makers?.length || 0
          console.log('DecisionMakers: setState - prev dmCount:', prevDmCount, 'new dmCount:', newDmCount)

          return {
            ...prev,
            searchStatus: {
              ...newStatus,
              decision_makers: [...(newStatus.decision_makers || [])]
            },
            error: null
          }
        })
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

    console.log('DecisionMakers: useEffect triggered - searchId:', searchId, 'status:', status, 'dmCount:', dmCount)

    // Clear any existing interval first
    if (pollingIntervalRef.current) {
      console.log('DecisionMakers: Clearing existing interval')
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    if (!searchId) {
      console.log('DecisionMakers: No searchId, not starting polling')
      return
    }

    // Continue polling until we have results OR status is failed
    const shouldPoll = (status === 'pending' || status === 'searching') ||
                       (status === 'completed' && dmCount === 0)

    console.log('DecisionMakers: Polling check - status:', status, 'dmCount:', dmCount, 'shouldPoll:', shouldPoll)

    if (shouldPoll) {
      console.log('DecisionMakers: Starting polling interval with regular setInterval (not managed)')
      pollingIntervalRef.current = setInterval(() => pollSearchStatus(searchId), 3000)
    } else if (status === 'completed' && dmCount > 0) {
      console.log('DecisionMakers: Search completed with results, not polling')
    } else if (status === 'failed') {
      console.log('DecisionMakers: Search failed, not polling')
    }

    return () => {
      console.log('DecisionMakers: useEffect cleanup')
      if (pollingIntervalRef.current) {
        console.log('DecisionMakers: Clearing interval in cleanup')
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [state.searchStatus?.search_id, state.searchStatus?.status, state.searchStatus?.decision_makers?.length])
  // Note: pollSearchStatus intentionally NOT in deps - it's stable via useCallback with empty deps

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