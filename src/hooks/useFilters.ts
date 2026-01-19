import { useState, useEffect, useCallback } from 'react'

export interface FilterOptions {
  product: string
  minScore: number
  vertical: string
  hideApproved?: boolean
}

const STORAGE_KEY = 'intentscout-filters'
const DATE_STORAGE_KEY = 'intentscout-selected-date'

const DEFAULT_FILTERS: FilterOptions = {
  product: 'salesforce',
  minScore: 3,
  vertical: '',
  hideApproved: true
}

// Get yesterday's date as default
const getDefaultDate = (): string => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0]
}

// Load filters from localStorage
const loadFilters = (): FilterOptions => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_FILTERS, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.error('Failed to load filters from localStorage:', e)
  }
  return DEFAULT_FILTERS
}

// Load date from localStorage
const loadDate = (): string => {
  try {
    const stored = localStorage.getItem(DATE_STORAGE_KEY)
    if (stored) {
      return stored
    }
  } catch (e) {
    console.error('Failed to load date from localStorage:', e)
  }
  return getDefaultDate()
}

export const useFilters = () => {
  const [filters, setFiltersState] = useState<FilterOptions>(loadFilters)
  const [selectedDate, setSelectedDateState] = useState<string>(loadDate)

  // Save filters to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
    } catch (e) {
      console.error('Failed to save filters to localStorage:', e)
    }
  }, [filters])

  // Save date to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(DATE_STORAGE_KEY, selectedDate)
    } catch (e) {
      console.error('Failed to save date to localStorage:', e)
    }
  }, [selectedDate])

  const setFilters = useCallback((newFilters: Partial<FilterOptions>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
  }, [])

  const setSelectedDate = useCallback((date: string) => {
    setSelectedDateState(date)
  }, [])

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS)
    setSelectedDateState(getDefaultDate())
  }, [])

  return {
    filters,
    setFilters,
    selectedDate,
    setSelectedDate,
    resetFilters
  }
}
