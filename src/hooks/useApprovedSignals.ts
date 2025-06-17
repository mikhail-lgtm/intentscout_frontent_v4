import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/apiClient'

export interface ApprovedSignal {
  id: string
  companyId: string
  companyName: string
  companyLogoUrl?: string
  intentScore: number
  date: string
  jobsFoundCount: number
  calculationTimestamp: string
  decision?: string | null
}

interface ApprovedSignalsState {
  signals: ApprovedSignal[]
  isLoading: boolean
  isLoadingMore: boolean
  isSearching: boolean
  error: string | null
  hasMore: boolean
  totalLoaded: number
}

interface UseApprovedSignalsParams {
  productId: string
  minScore: number
  search?: string
  dateFilter?: string
}

const INITIAL_LIMIT = 30
const LOAD_MORE_LIMIT = 20

export const useApprovedSignals = (params: UseApprovedSignalsParams) => {
  const [state, setState] = useState<ApprovedSignalsState>({
    signals: [],
    isLoading: true,
    isLoadingMore: false,
    isSearching: false,
    error: null,
    hasMore: true,
    totalLoaded: 0
  })

  const currentRequestRef = useRef<string | null>(null)
  const lastParamsRef = useRef<string>('')

  // Create a stable request key for deduplication
  const requestKey = `${params.productId}-${params.minScore}-${params.search || ''}-${params.dateFilter || ''}`

  const fetchSignals = useCallback(async (offset = 0, isLoadMore = false) => {
    if (!params.productId) return

    // Prevent duplicate requests
    const thisRequestKey = `${requestKey}-${offset}`
    if (currentRequestRef.current === thisRequestKey) return
    currentRequestRef.current = thisRequestKey

    try {
      setState(prev => ({
        ...prev,
        isLoading: !isLoadMore && offset === 0,
        isLoadingMore: isLoadMore,
        isSearching: offset === 0 && !!params.search,
        error: null
      }))

      const response = await api.signals.getApprovedSignals({
        product_id: params.productId,
        min_score: params.minScore,
        search: params.search,
        date_filter: params.dateFilter,
        limit: offset === 0 ? INITIAL_LIMIT : LOAD_MORE_LIMIT,
        offset
      })

      if (response.error) {
        throw new Error(response.error)
      }

      const newSignals = response.data as ApprovedSignal[] || []
      const hasMoreData = newSignals.length === (offset === 0 ? INITIAL_LIMIT : LOAD_MORE_LIMIT)

      setState(prev => ({
        signals: offset === 0 ? newSignals : [...prev.signals, ...newSignals],
        isLoading: false,
        isLoadingMore: false,
        isSearching: false,
        error: null,
        hasMore: hasMoreData,
        totalLoaded: offset === 0 ? newSignals.length : prev.totalLoaded + newSignals.length
      }))

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch approved signals'
      setState(prev => ({
        ...prev,
        isLoading: false,
        isLoadingMore: false,
        isSearching: false,
        error: errorMessage
      }))
    } finally {
      currentRequestRef.current = null
    }
  }, [requestKey, params.productId, params.minScore, params.search, params.dateFilter])

  // Load more signals for pagination
  const loadMore = useCallback(async () => {
    if (state.isLoadingMore || !state.hasMore) return
    await fetchSignals(state.totalLoaded, true)
  }, [fetchSignals, state.isLoadingMore, state.hasMore, state.totalLoaded])

  // Refetch from beginning
  const refetch = useCallback(() => {
    fetchSignals(0, false)
  }, [fetchSignals])

  // Effect to fetch signals when parameters change
  useEffect(() => {
    const currentParams = JSON.stringify(params)
    
    // Only fetch if parameters actually changed
    if (currentParams !== lastParamsRef.current) {
      lastParamsRef.current = currentParams
      fetchSignals(0, false)
    }
  }, [fetchSignals, params])

  // Group signals by date for display
  const groupedSignals = useCallback(() => {
    const groups: { [date: string]: ApprovedSignal[] } = {}
    
    state.signals.forEach(signal => {
      if (!groups[signal.date]) {
        groups[signal.date] = []
      }
      groups[signal.date].push(signal)
    })

    // Convert to sorted array of date groups
    return Object.entries(groups)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA)) // Most recent first
      .map(([date, signals]) => ({
        date,
        signals: signals.sort((a, b) => b.intentScore - a.intentScore) // Highest score first within date
      }))
  }, [state.signals])

  return {
    ...state,
    loadMore,
    refetch,
    groupedSignals: groupedSignals()
  }
}