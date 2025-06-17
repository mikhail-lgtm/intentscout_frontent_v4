import { useState, useCallback } from 'react'
import { Calendar, Filter, RotateCcw, Sparkles, TrendingUp } from 'lucide-react'
import { DateSelector } from './DateSelector'
import { ProductSelector } from './ProductSelector'
import { FilterPanel } from './FilterPanel'
import { IntentCard } from './IntentCard'
import { QueueSidebar } from './QueueSidebar'
import { useSignals } from '../../hooks/useSignals'

interface FilterOptions {
  product: string
  minScore: number
  vertical: string
}

export const SignalsPage = () => {
  // State management
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  })
  
  const [filters, setFilters] = useState<FilterOptions>({
    product: 'salesforce',
    minScore: 3,
    vertical: ''
  })
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  // Custom hook for signals data with comprehensive loading states
  const { 
    signals, 
    isLoading,
    isIntentScoresLoading,
    isCompaniesLoading,
    isJobsLoading,
    error, 
    refetch,
    markSignal,
    removeDecision
  } = useSignals(selectedDate, filters)

  const currentSignal = signals[currentIndex] || null

  // Handlers
  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date)
    setCurrentIndex(0)
  }, [])

  const handleFilterChange = useCallback((newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setCurrentIndex(0)
  }, [])

  const handleApprove = useCallback(async () => {
    if (!currentSignal) return
    await markSignal(currentSignal.id, 'approve')
    if (currentIndex < signals.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }, [currentSignal, markSignal, currentIndex, signals.length])

  const handleReject = useCallback(async () => {
    if (!currentSignal) return
    await markSignal(currentSignal.id, 'reject')
    if (currentIndex < signals.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }, [currentSignal, markSignal, currentIndex, signals.length])

  const handleRemoveDecision = useCallback(async () => {
    if (!currentSignal) return
    await removeDecision(currentSignal.id)
  }, [currentSignal, removeDecision])

  // Filter status
  const hasActiveFilters = filters.minScore > 3 || filters.vertical

  // Determine overall loading state
  const isAnyLoading = isLoading || isIntentScoresLoading || isCompaniesLoading || isJobsLoading

  return (
    <div className="h-full bg-gray-50 overflow-hidden flex flex-col">
      {/* Sticky Header */}
      <div className="flex-shrink-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-gray-900">Intent Signals</h1>
            
            <div className="flex items-center gap-2">
              <ProductSelector
                value={filters.product}
                onChange={(product) => handleFilterChange({ product })}
              />
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 px-2 py-1.5 border rounded-lg text-sm font-medium transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'bg-orange-50 border-orange-200 text-orange-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                )}
              </button>
              
              <DateSelector
                selectedDate={selectedDate}
                onChange={handleDateChange}
                productId={filters.product}
                minScore={filters.minScore}
              />
            </div>
          </div>
          
          {/* Filters Text */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>Filters:</span>
            <span>Product: {filters.product}</span>
            {filters.minScore > 3 && <span>Min Score: {filters.minScore}</span>}
            {filters.vertical && <span>Vertical: {filters.vertical}</span>}
            {!hasActiveFilters && <span className="text-gray-400">Default</span>}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl mx-auto flex gap-6 px-4 sm:px-6 lg:px-8 min-h-0 pb-6 pt-6">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ height: 'calc(100% - 2rem)' }}>
          {/* Content moved from header */}

          {/* Loading Status */}
          {isAnyLoading && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                <div className="text-blue-700">
                  {isIntentScoresLoading && 'Loading intent scores...'}
                  {isCompaniesLoading && 'Loading company details...'}
                  {isJobsLoading && 'Loading job citations...'}
                  {isLoading && !isIntentScoresLoading && !isCompaniesLoading && !isJobsLoading && 'Loading...'}
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 text-lg">⚠</span>
                </div>
                <h3 className="text-red-800 font-semibold">Error Loading Signals</h3>
              </div>
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Retry
              </button>
            </div>
          )}

          {/* Empty State - only show when all loading is done */}
          {!isAnyLoading && signals.length === 0 && !error && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Intent Signals Found
              </h3>
              <p className="text-gray-600 mb-6">
                No companies match your current filters for {selectedDate}. 
                Try adjusting your filters or selecting a different date.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => handleFilterChange({ minScore: 3, vertical: '' })}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}

          {/* Intent Card */}
          {(currentSignal || isAnyLoading) && (
            <div className="h-full">
              <IntentCard
                signal={currentSignal}
                onApprove={handleApprove}
                onReject={handleReject}
                onRemoveDecision={handleRemoveDecision}
                isLoading={isAnyLoading}
              />
            </div>
          )}

          {/* Completion State */}
          {!isAnyLoading && signals.length > 0 && currentIndex >= signals.length && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-2xl">🎉</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                All Signals Reviewed!
              </h3>
              <p className="text-gray-600 mb-6">
                You've completed your review of all {signals.length} signals for {selectedDate}.
              </p>
              <button
                onClick={() => {
                  setCurrentIndex(0)
                  refetch()
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Review Again
              </button>
            </div>
          )}
          </div>

        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 min-h-0" style={{ height: 'calc(100% - 2rem)' }}>
          <QueueSidebar 
            signals={signals}
            currentIndex={currentIndex}
            onSignalSelect={setCurrentIndex}
            isLoading={isAnyLoading}
          />
        </div>
      </div>

      {/* Filter Panel Overlay */}
      <FilterPanel
        filters={filters}
        onChange={handleFilterChange}
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
      />
    </div>
  )
}