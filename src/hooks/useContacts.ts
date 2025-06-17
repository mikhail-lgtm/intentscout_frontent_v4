import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/apiClient'

export interface Contact {
  id: string
  signal_id: string
  organization_id: string
  first_name: string
  last_name: string
  job_title: string
  email_address?: string
  direct_phone?: string
  mobile_phone?: string
  linkedin_contact: string
  person_city?: string
  person_state?: string
  country?: string
  notes: string
  source: 'manual' | 'decision_maker_finder'
  decision_maker_id?: string
  created_at: string
  updated_at: string
}

interface UseContactsState {
  contacts: Contact[]
  isLoading: boolean
  error: string | null
}

export const useContacts = (signalId: string | null | undefined) => {
  const [state, setState] = useState<UseContactsState>({
    contacts: [],
    isLoading: false,
    error: null
  })

  const fetchContacts = useCallback(async () => {
    if (!signalId || signalId === '') {
      setState(prev => ({ ...prev, contacts: [], isLoading: false, error: null }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await api.contacts.getBySignal(signalId)
      
      if (response.error) {
        throw new Error(response.error)
      }

      setState(prev => ({
        ...prev,
        contacts: response.data || [],
        isLoading: false,
        error: null
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch contacts'
      }))
    }
  }, [signalId])

  const deleteContact = useCallback(async (contactId: string) => {
    try {
      const response = await api.contacts.delete(contactId)
      
      if (response.error) {
        throw new Error(response.error)
      }

      // Remove from local state
      setState(prev => ({
        ...prev,
        contacts: prev.contacts.filter(c => c.id !== contactId)
      }))

      return true
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to delete contact'
      }))
      return false
    }
  }, [])

  const updateContact = useCallback(async (contactId: string, updates: Partial<Contact>) => {
    try {
      const response = await api.contacts.update(contactId, updates)
      
      if (response.error) {
        throw new Error(response.error)
      }

      // Update local state
      setState(prev => ({
        ...prev,
        contacts: prev.contacts.map(c => 
          c.id === contactId ? { ...c, ...response.data } : c
        )
      }))

      return true
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to update contact'
      }))
      return false
    }
  }, [])

  // Fetch contacts when signalId changes
  useEffect(() => {
    fetchContacts()
  }, [fetchContacts]) // Now fetchContacts only changes when signalId changes

  return {
    contacts: state.contacts,
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchContacts,
    deleteContact,
    updateContact
  }
}