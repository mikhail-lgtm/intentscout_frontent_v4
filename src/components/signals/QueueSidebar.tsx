import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Signal } from '../../hooks/useSignals'

interface QueueSidebarProps {
  signals: Signal[]
  currentIndex: number
  onSignalSelect?: (index: number) => void
  isLoading?: boolean
}

const SkeletonQueueItem: React.FC = () => {
  return (
    <div className="p-3 border border-gray-200 rounded-lg bg-white animate-pulse">
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
        <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
        <div className="flex-1 min-w-0">
          <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
          <div className="h-2 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="w-4 h-4 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}

const SkeletonQueueSidebar: React.FC = () => {
  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-4">
        <div className="h-5 bg-gray-200 rounded w-20"></div>
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>

      {/* Stats Skeleton */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
        <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-4"></div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-4"></div>
          </div>
          <div className="h-3 bg-gray-200 rounded w-12"></div>
        </div>
      </div>

      {/* Progress Bar Skeleton */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <div className="h-3 bg-gray-200 rounded w-12"></div>
          <div className="h-3 bg-gray-200 rounded w-8"></div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2"></div>
      </div>

      {/* Queue Items Skeleton */}
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <SkeletonQueueItem key={i} />
        ))}
      </div>
    </div>
  )
}

export const QueueSidebar: React.FC<QueueSidebarProps> = ({ 
  signals, 
  currentIndex, 
  onSignalSelect, 
  isLoading = false 
}) => {
  if (isLoading) {
    return <SkeletonQueueSidebar />
  }

  const totalSignals = signals.length
  const progress = totalSignals > 0 ? ((currentIndex + 1) / totalSignals) * 100 : 0

  // Calculate decision stats
  const approvedCount = signals.filter(s => s.decision === "approve").length
  const rejectedCount = signals.filter(s => s.decision === "reject").length
  const reviewedCount = approvedCount + rejectedCount

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Queue
        </h3>
        <span className="text-sm text-gray-500">
          {totalSignals > 0 ? `${totalSignals} signals` : "Empty"}
        </span>
      </div>

      {/* Decision Stats */}
      {totalSignals > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-xs font-medium text-gray-700 mb-2">Review Progress</div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-600 font-medium">{approvedCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsDown className="w-3 h-3 text-red-500" />
              <span className="text-xs text-red-600 font-medium">{rejectedCount}</span>
            </div>
            <div className="text-xs text-gray-500">
              {reviewedCount}/{totalSignals}
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Queue Items - Scrollable */}
      {signals.length > 0 ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-2 pb-2">
            {signals.map((signal, actualIndex) => {
              const isCurrentSignal = actualIndex === currentIndex
              const hasDecision = signal.decision && (signal.decision === "approve" || signal.decision === "reject")
              
              return (
                <div
                  key={signal.id}
                  onClick={() => onSignalSelect && onSignalSelect(actualIndex)}
                  className={`p-3 border rounded-lg transition-all duration-200 flex items-center gap-3 group
                    ${onSignalSelect ? 'cursor-pointer' : ''} 
                    ${
                      isCurrentSignal
                        ? "border-orange-500 bg-orange-50 shadow-sm"
                        : hasDecision
                        ? signal.decision === "approve"
                          ? "border-green-200 bg-green-50"
                          : "border-red-200 bg-red-50"
                        : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300"
                    }`}
                >
                  {/* Position indicator */}
                  <div className={`w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center flex-shrink-0
                    ${isCurrentSignal 
                      ? 'bg-orange-500 text-white' 
                      : hasDecision
                      ? signal.decision === "approve"
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {actualIndex + 1}
                  </div>

                  {/* Company logo */}
                  <div className="relative flex-shrink-0">
                    {signal.company?.logoUrl || signal.company?.profilePictureUrl ? (
                      <img 
                        src={signal.company.logoUrl || signal.company.profilePictureUrl} 
                        alt={signal.company.name || 'Company logo'}
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
                        signal.company?.logoUrl || signal.company?.profilePictureUrl ? 'hidden' : 'flex'
                      }`}
                    >
                      {signal.company?.name ? signal.company.name.substring(0, 2).toUpperCase() : 'UN'}
                    </div>
                  </div>

                  {/* Company info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {signal.company?.name || 'Unknown Company'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Score: {signal.intentScore.toFixed(1)}
                    </div>
                  </div>

                  {/* Decision status */}
                  {hasDecision && (
                    <div className="flex-shrink-0">
                      {signal.decision === "approve" ? (
                        <ThumbsUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <ThumbsDown className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 text-sm">
          No signals to display
        </div>
      )}
    </div>
  )
}