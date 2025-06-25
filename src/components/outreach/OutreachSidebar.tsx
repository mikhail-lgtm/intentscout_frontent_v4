import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, ArrowUp } from 'lucide-react'
import { useApprovedSignals, ApprovedSignal } from '../../hooks/useApprovedSignals'
import { useDebounce } from '../../hooks/useDebounce'
import { ProductSelector } from '../signals/ProductSelector'
import { DateSelector } from '../signals/DateSelector'

interface FilterOptions {
  product: string
  minScore: number
}

interface OutreachSidebarProps {
  productId: string
  minScore: number
  onSignalSelect?: (signal: ApprovedSignal) => void
  selectedSignalId?: string
  onFilterChange?: (filters: Partial<FilterOptions>) => void
  filters?: FilterOptions
}

const SkeletonSignalItem: React.FC = () => {
  return (
    <div className="p-3 border border-gray-200 rounded-lg bg-white animate-pulse">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
        <div className="flex-1 min-w-0">
          <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
          <div className="h-2 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="w-8 h-4 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}

const SkeletonDateGroup: React.FC = () => {
  return (
    <div className="mb-4">
      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <SkeletonSignalItem key={i} />
        ))}
      </div>
    </div>
  )
}

const SkeletonSearchResults: React.FC = () => {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <SkeletonDateGroup key={i} />
      ))}
    </div>
  )
}

const SkeletonOutreachSidebar: React.FC = () => {
  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-4">
        <div className="h-5 bg-gray-200 rounded w-20"></div>
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>

      {/* Search Skeleton */}
      <div className="mb-4">
        <div className="h-9 bg-gray-200 rounded w-full"></div>
      </div>

      {/* Date Filter Skeleton */}
      <div className="mb-4">
        <div className="h-8 bg-gray-200 rounded w-32"></div>
      </div>

      {/* Content Skeleton */}
      <SkeletonSearchResults />
    </div>
  )
}

export const OutreachSidebar: React.FC<OutreachSidebarProps> = ({ 
  productId, 
  minScore, 
  onSignalSelect,
  selectedSignalId,
  onFilterChange,
  filters
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebounce(searchTerm, 500)

  // Handle immediate typing feedback
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    if (value !== debouncedSearch) {
      setIsTyping(true)
    }
  }

  // Reset typing state when debounced search changes
  useEffect(() => {
    if (searchTerm === debouncedSearch) {
      setIsTyping(false)
    }
  }, [searchTerm, debouncedSearch])

  // Fetch approved signals with search and filters
  const { 
    signals, 
    groupedSignals, 
    isLoading, 
    isLoadingMore, 
    isSearching,
    error, 
    hasMore, 
    totalLoaded,
    loadMore, 
    refetch 
  } = useApprovedSignals({
    productId,
    minScore,
    search: debouncedSearch,
    dateFilter
  })

  // Auto-select the most recent signal when signals are loaded and no signal is selected
  useEffect(() => {
    if (!selectedSignalId && signals.length > 0 && onSignalSelect && !searchTerm && !dateFilter) {
      // Select the first (most recent) signal
      onSignalSelect(signals[0])
    }
  }, [signals, selectedSignalId, onSignalSelect, searchTerm, dateFilter])

  // Infinite scroll detection
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || isLoadingMore || !hasMore) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100

    // Show scroll to top button
    setShowScrollTop(scrollTop > 200)

    if (isNearBottom) {
      loadMore()
    }
  }, [isLoadingMore, hasMore, loadMore])

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00')
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  // Scroll to top
  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Outreach Queue
          </h3>
          <span className="text-sm text-gray-500">
            {totalLoaded > 0 ? `${totalLoaded} signals` : "Empty"}
          </span>
        </div>
        
        {/* Controls Row */}
        {onFilterChange && filters && (
          <div className="flex items-center gap-2 mb-3">
            {isLoading && !searchTerm && !dateFilter ? (
              <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
            ) : (
              <ProductSelector
                value={filters.product}
                onChange={(product) => onFilterChange({ product })}
              />
            )}
            
            <DateSelector
              selectedDate={dateFilter || new Date().toISOString().split('T')[0]}
              onChange={setDateFilter}
              productId={filters.product}
              minScore={filters.minScore}
              decisionFilter="approve"
              showNavButtons={false}
            />
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          {isSearching ? (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          )}
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={refetch}
            className="mt-2 text-xs text-red-700 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Signals List - Scrollable with infinite scroll */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar relative"
      >
        {isTyping || isSearching ? (
          <SkeletonSearchResults />
        ) : groupedSignals.length > 0 ? (
          <div className="space-y-4 pb-4">
            {groupedSignals.map(({ date, signals: dateSignals }) => (
              <div key={date} className="mb-4">
                {/* Date Header */}
                <div className="sticky top-0 bg-white z-10 pb-2">
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {formatDate(date)}
                  </h4>
                </div>

                {/* Signals for this date */}
                <div className="space-y-2">
                  {dateSignals.map((signal) => {
                    const isSelected = selectedSignalId === signal.id
                    
                    return (
                      <div
                        key={signal.id}
                        onClick={() => onSignalSelect && onSignalSelect(signal)}
                        className={`p-3 border rounded-lg transition-all duration-200 flex items-center gap-3 group
                          ${onSignalSelect ? 'cursor-pointer' : ''} 
                          ${isSelected
                            ? "border-orange-500 bg-orange-50 shadow-sm"
                            : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300"
                          }`}
                      >
                        {/* Company logo */}
                        <div className="relative flex-shrink-0">
                          {signal.companyLogoUrl ? (
                            <img 
                              src={signal.companyLogoUrl} 
                              alt={signal.companyName}
                              className="w-8 h-8 rounded-lg object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement
                                if (fallback) fallback.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          <div 
                            className={`w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center text-orange-600 font-semibold text-xs ${
                              signal.companyLogoUrl ? 'hidden' : 'flex'
                            }`}
                          >
                            {signal.companyName.substring(0, 2).toUpperCase()}
                          </div>
                        </div>

                        {/* Company info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {signal.companyName}
                          </div>
                          <div className="text-xs text-gray-500">
                            Score: {signal.intentScore.toFixed(1)} • {signal.jobsFoundCount} jobs
                          </div>
                        </div>

                        {/* Intent score badge */}
                        <div className="flex-shrink-0">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            signal.intentScore >= 4.5
                              ? 'bg-green-100 text-green-700'
                              : signal.intentScore >= 4.0
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {signal.intentScore.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Loading more indicator */}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
              </div>
            )}

            {/* No more items indicator */}
            {!hasMore && totalLoaded > 0 && (
              <div className="text-center py-4 text-xs text-gray-500">
                All signals loaded
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            {searchTerm || dateFilter ? 'No signals match your filters' : 'No approved signals found'}
          </div>
        )}

        {/* Scroll to top button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-4 right-4 p-2 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-colors"
            title="Scroll to top"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}