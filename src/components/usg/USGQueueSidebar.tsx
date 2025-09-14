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

  // Calculate qualification stats
  const highFitCount = leads.filter(l => l.spec_fit >= 0.7).length
  const mediumFitCount = leads.filter(l => l.spec_fit >= 0.5 && l.spec_fit < 0.7).length
  const lowFitCount = leads.filter(l => l.spec_fit < 0.5).length

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

      {/* Qualification Stats */}
      {totalLeads > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-xs font-medium text-gray-700 mb-2">Qualification Breakdown</div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600 font-medium">{highFitCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-xs text-yellow-600 font-medium">{mediumFitCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-red-600 font-medium">{lowFitCount}</span>
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
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Queue Items - Scrollable */}
      {leads.length > 0 ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-2 pb-2">
            {leads.map((lead, actualIndex) => {
              const isCurrentLead = actualIndex === currentIndex
              const fitLevel = lead.spec_fit >= 0.7 ? 'high' : lead.spec_fit >= 0.5 ? 'medium' : 'low'
              
              return (
                <div
                  key={lead.id}
                  onClick={() => onLeadSelect && onLeadSelect(actualIndex)}
                  className={`p-3 border rounded-lg transition-all duration-200 flex items-center gap-3 group
                    ${onLeadSelect ? 'cursor-pointer' : ''} 
                    ${
                      isCurrentLead
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : fitLevel === 'high'
                        ? "border-green-200 bg-green-50"
                        : fitLevel === 'medium'
                        ? "border-yellow-200 bg-yellow-50"
                        : "border-red-200 bg-red-50 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                >
                  {/* Position indicator */}
                  <div className={`w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center flex-shrink-0
                    ${isCurrentLead 
                      ? 'bg-blue-500 text-white' 
                      : fitLevel === 'high'
                      ? 'bg-green-500 text-white'
                      : fitLevel === 'medium'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-red-500 text-white'
                    }`}
                  >
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
                      {lead.project_name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {lead.location}
                    </div>
                  </div>

                  {/* Score indicator */}
                  <div className="flex-shrink-0 flex items-center gap-1">
                    <TrendingUp className={`w-3 h-3 ${getScoreBadgeColor(lead.spec_fit)}`} />
                    <span className={`text-xs font-medium ${getScoreBadgeColor(lead.spec_fit)}`}>
                      {(lead.spec_fit * 10).toFixed(1)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 text-sm">
          No projects to display
        </div>
      )}
    </div>
  )
}
