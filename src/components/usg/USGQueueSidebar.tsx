import React from 'react'
import { Building, TrendingUp } from 'lucide-react'

interface Lead {
  id: string
  organization_id: string
  project_name: string
  location: string
  bid_due: string
  spec_fit: number
  urgency: number
  confidence: number
  reason_codes?: string[]
  description?: string
  project_url?: string
  decision?: 'approve' | 'reject' | null
}

interface USGQueueSidebarProps {
  leads: Lead[]
  currentIndex: number
  onLeadSelect?: (index: number) => void
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
          <div className="h-3 bg-gray-200 rounded w-12"></div>
          <div className="h-3 bg-gray-200 rounded w-12"></div>
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

const getScoreBadgeColor = (score: number) => {
  if (score >= 0.7) return 'text-green-600'
  if (score >= 0.5) return 'text-yellow-600'
  return 'text-red-600'
}

export const USGQueueSidebar: React.FC<USGQueueSidebarProps> = ({ 
  leads, 
  currentIndex, 
  onLeadSelect, 
  isLoading = false 
}) => {
  if (isLoading) {
    return <SkeletonQueueSidebar />
  }

  const totalLeads = leads.length
  const progress = totalLeads > 0 ? ((currentIndex + 1) / totalLeads) * 100 : 0

  // Convert spec_fit (0-1) to intent score (0-5) like LinkedIn signals
  const getIntentScore = (spec_fit: number) => Math.round(spec_fit * 5)

  // Calculate score distribution
  const score5Count = leads.filter(l => getIntentScore(l.spec_fit) === 5).length
  const score4Count = leads.filter(l => getIntentScore(l.spec_fit) === 4).length
  const score3Count = leads.filter(l => getIntentScore(l.spec_fit) === 3).length
  const highScoreCount = score5Count + score4Count + score3Count

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Project Queue
        </h3>
        <span className="text-sm text-gray-500">
          {totalLeads > 0 ? `${totalLeads} projects` : "Empty"}
        </span>
      </div>

      {/* Intent Score Stats */}
      {totalLeads > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-xs font-medium text-gray-700 mb-2">Intent Score Distribution</div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600 font-medium">{score5Count}</span>
              <span className="text-xs text-gray-500">5s</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-blue-600 font-medium">{score4Count}</span>
              <span className="text-xs text-gray-500">4s</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-xs text-yellow-600 font-medium">{score3Count}</span>
              <span className="text-xs text-gray-500">3s</span>
            </div>
            <div className="text-xs text-gray-500">
              {highScoreCount}/{totalLeads} high
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

      {/* Queue Items - Simple List Like Signals */}
      {leads.length > 0 ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-2 pb-2">
            {leads.map((lead, actualIndex) => {
              const isCurrentLead = actualIndex === currentIndex
              const intentScore = getIntentScore(lead.spec_fit)

              return (
                <div
                  key={lead.id}
                  onClick={() => onLeadSelect && onLeadSelect(actualIndex)}
                  className={`p-3 border rounded-lg transition-all duration-200 flex items-center gap-3 group cursor-pointer
                    ${isCurrentLead
                      ? "border-orange-500 bg-orange-50 shadow-sm"
                      : "border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300"
                    }`}
                >
                  {/* Position indicator */}
                  <div className={`w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center flex-shrink-0
                    ${isCurrentLead ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    {actualIndex + 1}
                  </div>

                  {/* Project icon */}
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center text-blue-600 font-semibold text-xs">
                      <Building className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Project info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {lead.project_name || "Untitled Project"}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {lead.location}
                    </div>
                  </div>

                  {/* Intent Score (0-5) */}
                  <div className="flex-shrink-0 flex items-center gap-1">
                    <TrendingUp className={`w-3 h-3 ${
                      intentScore >= 4 ? 'text-green-500' :
                      intentScore >= 3 ? 'text-blue-500' :
                      intentScore >= 2 ? 'text-yellow-500' : 'text-gray-400'
                    }`} />
                    <span className={`text-xs font-medium ${
                      intentScore >= 4 ? 'text-green-600' :
                      intentScore >= 3 ? 'text-blue-600' :
                      intentScore >= 2 ? 'text-yellow-600' : 'text-gray-500'
                    }`}>
                      {intentScore}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          No projects in queue
        </div>
      )}

    </div>
  )
}
