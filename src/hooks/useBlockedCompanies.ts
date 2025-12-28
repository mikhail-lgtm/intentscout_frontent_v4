import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/apiClient'

export interface BlockedCompany {
  id: string
  companyId: string
  companyName: string
  blockedBy: string
  blockedAt: string
  reason?: string
}

export const useBlockedCompanies = () => {
  const [blockedCompanies, setBlockedCompanies] = useState<BlockedCompany[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBlockedCompanies = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await api.signals.getBlockedCompanies()

      if (response.error) {
        throw new Error(response.error)
      }

      setBlockedCompanies(response.data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch blocked companies'
      setError(errorMessage)
      console.error('Error fetching blocked companies:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const blockCompany = useCallback(async (companyId: string, companyName: string, reason?: string) => {
    try {
      const response = await api.signals.blockCompany({ companyId, companyName, reason })

      if (response.error) {
        throw new Error(response.error)
      }

      // Refresh the list
      await fetchBlockedCompanies()
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to block company'
      console.error('Error blocking company:', err)
      return { success: false, error: errorMessage }
    }
  }, [fetchBlockedCompanies])

  const unblockCompany = useCallback(async (companyId: string) => {
    try {
      const response = await api.signals.unblockCompany(companyId)

      if (response.error) {
        throw new Error(response.error)
      }

      // Update local state optimistically
      setBlockedCompanies(prev => prev.filter(c => c.companyId !== companyId))
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unblock company'
      console.error('Error unblocking company:', err)
      // Refresh to get correct state
      await fetchBlockedCompanies()
      return { success: false, error: errorMessage }
    }
  }, [fetchBlockedCompanies])

  useEffect(() => {
    fetchBlockedCompanies()
  }, [fetchBlockedCompanies])

  return {
    blockedCompanies,
    isLoading,
    error,
    blockCompany,
    unblockCompany,
    refetch: fetchBlockedCompanies
  }
}
