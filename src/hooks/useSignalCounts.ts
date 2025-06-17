import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/apiClient'

interface SignalCount {
  date: string
  total_signals: number
}

interface SignalCountsState {
  signalCounts: SignalCount[]
  isLoading: boolean
  error: string | null
}

export const useSignalCounts = (
  startDate: string,
  endDate: string,
  productId: string,
  minScore: number = 3.0,
  decisionFilter?: string
) => {
  const [state, setState] = useState<SignalCountsState>({
    signalCounts: [],
    isLoading: false,
    error: null,
  })

  const fetchSignalCounts = useCallback(async () => {
    if (!startDate || !endDate || !productId) {
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await api.signals.getSignalCounts({
        start_date: startDate,
        end_date: endDate,
        product_id: productId,
        min_score: minScore,
        decision_filter: decisionFilter,
      })

      if (response.error) {
        throw new Error(response.error)
      }

      setState({
        signalCounts: response.data || [],
        isLoading: false,
        error: null,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch signal counts'
      setState({
        signalCounts: [],
        isLoading: false,
        error: errorMessage,
      })
    }
  }, [startDate, endDate, productId, minScore, decisionFilter])

  useEffect(() => {
    fetchSignalCounts()
  }, [fetchSignalCounts])

  // Helper function to get signal count for a specific date
  const getSignalCountForDate = useCallback((date: string): number => {
    const found = state.signalCounts.find(item => item.date === date)
    return found ? found.total_signals : 0
  }, [state.signalCounts])

  // Helper function to check if a date has signals
  const hasSignalsForDate = useCallback((date: string): boolean => {
    return getSignalCountForDate(date) > 0
  }, [getSignalCountForDate])

  return {
    ...state,
    refetch: fetchSignalCounts,
    getSignalCountForDate,
    hasSignalsForDate,
  }
}