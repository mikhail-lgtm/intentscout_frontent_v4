import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/apiClient'
import { Sequence, SequenceStatus, CreateSequenceRequest, UpdateSequenceRequest } from '../types/sequences'

interface UseSequencesState {
  sequences: Sequence[]
  isLoading: boolean
  error: string | null
}

export const useSequences = (status?: SequenceStatus) => {
  const [state, setState] = useState<UseSequencesState>({
    sequences: [],
    isLoading: true,
    error: null
  })

  // Fetch sequences
  const fetchSequences = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const response = await api.sequences.list(status)
      
      if (response.error) {
        throw new Error(response.error)
      }

      setState({
        sequences: Array.isArray(response.data) ? response.data : [],
        isLoading: false,
        error: null
      })
    } catch (err) {
      setState({
        sequences: [],
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch sequences'
      })
    }
  }, [status])

  // Create sequence
  const createSequence = useCallback(async (data: CreateSequenceRequest): Promise<Sequence | null> => {
    try {
      const response = await api.sequences.create(data)
      
      if (response.error) {
        throw new Error(response.error)
      }

      const newSequence = response.data as Sequence
      setState(prev => ({
        ...prev,
        sequences: [newSequence, ...prev.sequences]
      }))

      return newSequence
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to create sequence'
      }))
      return null
    }
  }, [])

  // Update sequence
  const updateSequence = useCallback(async (sequenceId: string, data: UpdateSequenceRequest): Promise<boolean> => {
    try {
      const response = await api.sequences.update(sequenceId, data)
      
      if (response.error) {
        console.error('API returned error:', response.error)
        throw new Error(response.error)
      }

      const updatedSequence = response.data as Sequence
      
      setState(prev => ({
        ...prev,
        sequences: prev.sequences.map(seq => 
          seq.id === sequenceId ? updatedSequence : seq
        )
      }))

      return true
    } catch (err) {
      console.error('Failed to update sequence:', err)
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to update sequence'
      }))
      return false
    }
  }, [])

  // Delete sequence
  const deleteSequence = useCallback(async (sequenceId: string): Promise<boolean> => {
    try {
      const response = await api.sequences.delete(sequenceId)
      
      if (response.error) {
        throw new Error(response.error)
      }

      setState(prev => ({
        ...prev,
        sequences: prev.sequences.filter(seq => seq.id !== sequenceId)
      }))

      return true
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to delete sequence'
      }))
      return false
    }
  }, [])

  // Duplicate sequence
  const duplicateSequence = useCallback(async (sequenceId: string): Promise<Sequence | null> => {
    try {
      const response = await api.sequences.duplicate(sequenceId)
      
      if (response.error) {
        throw new Error(response.error)
      }

      const duplicatedSequence = response.data as Sequence
      setState(prev => ({
        ...prev,
        sequences: [duplicatedSequence, ...prev.sequences]
      }))

      return duplicatedSequence
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to duplicate sequence'
      }))
      return null
    }
  }, [])

  // Update sequence status
  const updateSequenceStatus = useCallback(async (sequenceId: string, newStatus: SequenceStatus): Promise<boolean> => {
    try {
      const response = await api.sequences.updateStatus(sequenceId, newStatus)
      
      if (response.error) {
        throw new Error(response.error)
      }

      const updatedSequence = response.data as Sequence
      setState(prev => ({
        ...prev,
        sequences: prev.sequences.map(seq => 
          seq.id === sequenceId ? updatedSequence : seq
        )
      }))

      return true
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to update sequence status'
      }))
      return false
    }
  }, [])

  // Refetch sequences
  const refetch = useCallback(() => {
    fetchSequences()
  }, [fetchSequences])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Fetch sequences on mount and when status changes
  useEffect(() => {
    fetchSequences()
  }, [fetchSequences])

  return {
    ...state,
    createSequence,
    updateSequence,
    deleteSequence,
    duplicateSequence,
    updateSequenceStatus,
    refetch,
    clearError
  }
}