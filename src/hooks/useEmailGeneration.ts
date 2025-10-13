import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/apiClient'
import { createManagedInterval } from '../lib/globalCleanup'

export interface GeneratedEmail {
  contact_id: string
  sequence_step: number
  block_id: string
  block_name: string
  subject: string
  body: string
  status: 'generated' | 'error'
  subject_prompt?: string
  body_prompt?: string
  data_sources?: any[]
}

export interface EmailGenerationStatus {
  generation_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  total_emails: number
  contacts_processed: number
  generated_emails: GeneratedEmail[]
  error_message?: string
  created_at?: string
  updated_at?: string
}

interface UseEmailGenerationState {
  generationStatus: EmailGenerationStatus | null
  isLoading: boolean
  error: string | null
}

export const useEmailGeneration = (signalId: string | null | undefined) => {
  const [state, setState] = useState<UseEmailGenerationState>({
    generationStatus: null,
    isLoading: false,
    error: null
  })

  // Check for existing generation when signalId changes
  const checkExistingGeneration = useCallback(async () => {
    if (!signalId || signalId === '') return

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const response = await api.emails.getBySignal(signalId)
      
      if (response.error) {
        setState(prev => ({ ...prev, isLoading: false, error: response.error || 'Failed to check existing generation' }))
        return
      }

      if (response.data && (response.data as any).status !== 'not_found') {
        setState(prev => ({ 
          ...prev, 
          generationStatus: response.data as EmailGenerationStatus,
          isLoading: false,
          error: null
        }))
      } else {
        setState(prev => ({ 
          ...prev, 
          generationStatus: null,
          isLoading: false,
          error: null
        }))
      }
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to check existing generation'
      }))
    }
  }, [signalId])

  // Start a new email generation
  const startGeneration = useCallback(async (sequenceId: string, contacts: any[]) => {
    if (!signalId || signalId === '' || !sequenceId || contacts.length === 0) return null

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const response = await api.emails.generate({
        sequence_id: sequenceId,
        contacts: contacts,
        signal_id: signalId,
        company_data: {},
        custom_data: {}
      })

      if (response.error) {
        setState(prev => ({ ...prev, isLoading: false, error: response.error || 'Failed to start generation' }))
        return null
      }

      const responseData = response.data as { generation_id: string; status: string; total_emails: number }
      const newGenerationStatus: EmailGenerationStatus = {
        generation_id: responseData.generation_id,
        status: responseData.status as any,
        total_emails: responseData.total_emails,
        contacts_processed: 0,
        generated_emails: []
      }

      setState(prev => ({ 
        ...prev, 
        generationStatus: newGenerationStatus,
        isLoading: false,
        error: null
      }))

      return responseData.generation_id
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: err instanceof Error ? err.message : 'Failed to start generation'
      }))
      return null
    }
  }, [signalId])

  // Poll for generation status updates
  const pollGenerationStatus = useCallback(async (generationId: string) => {
    if (!generationId) return

    try {
      const response = await api.emails.getGeneration(generationId)

      if (response.error) {
        console.error('Error polling generation status:', response.error)
        return
      }

      if (response.data) {
        setState(prev => ({
          ...prev,
          generationStatus: response.data as EmailGenerationStatus,
          error: null
        }))
      }
    } catch (err) {
      console.error('Error polling generation status:', err)
    }
  }, [])

  // FIXED: Proper interval cleanup with ref tracking
  useEffect(() => {
    const generationId = state.generationStatus?.generation_id
    const status = state.generationStatus?.status

    if (!generationId) return

    let shortInterval: NodeJS.Timeout | null = null
    let longInterval: NodeJS.Timeout | null = null
    let pollCount = 0

    if (status === 'pending' || status === 'in_progress') {
      const poll = () => {
        pollGenerationStatus(generationId)
        pollCount++

        // After 10 polls (30 seconds), switch to longer interval
        if (pollCount > 10) {
          if (shortInterval) {
            clearInterval(shortInterval)
            shortInterval = null
          }
          if (!longInterval) {
            longInterval = createManagedInterval(() => pollGenerationStatus(generationId), 10000)
          }
        }
      }

      shortInterval = createManagedInterval(poll, 3000) // Poll every 3 seconds initially
    } else if (status === 'completed') {
      // Do one final poll to ensure we have the latest data
      const finalPollTimeout = setTimeout(() => {
        pollGenerationStatus(generationId)
      }, 1000)

      return () => {
        clearTimeout(finalPollTimeout)
      }
    }

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
  }, [state.generationStatus?.generation_id, state.generationStatus?.status, pollGenerationStatus])

  // Check for existing generation on mount
  useEffect(() => {
    checkExistingGeneration()
  }, [checkExistingGeneration])

  return {
    generationStatus: state.generationStatus,
    isLoading: state.isLoading,
    error: state.error,
    startGeneration,
    refreshStatus: checkExistingGeneration,
    isGenerationInProgress: state.generationStatus ? ['pending', 'in_progress'].includes(state.generationStatus.status) : false,
    hasResults: state.generationStatus ? state.generationStatus.status === 'completed' && state.generationStatus.generated_emails.length > 0 : false,
    hasFailed: state.generationStatus ? state.generationStatus.status === 'failed' : false
  }
}