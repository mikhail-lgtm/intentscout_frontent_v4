import React, { useState } from 'react'
import { Building, Calendar, ExternalLink, MapPin, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'

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

interface USGProjectCardProps {
  lead: Lead | null
  isLoading?: boolean
}

const SkeletonProjectCard: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse h-full min-h-[600px]">
      {/* Header Banner Skeleton */}
      <div className="h-32 bg-gray-200"></div>
      
      <div className="p-6">
        {/* Project Header Skeleton */}
        <div className="flex items-start justify-between mb-8 -mt-12">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-300 rounded-lg border-2 border-white"></div>
            <div className="mt-8">
              <div className="h-7 bg-gray-200 rounded w-64 mb-3"></div>
              <div className="h-5 bg-gray-200 rounded w-40"></div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-8">
            <div className="w-6 h-6 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded w-16"></div>
          </div>
        </div>

        {/* Project Details Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded"></div>
              <div className="h-5 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>

        {/* Description Skeleton */}
        <div className="mb-8">
          <div className="h-5 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-5 bg-gray-200 rounded w-full"></div>
            <div className="h-5 bg-gray-200 rounded w-5/6"></div>
            <div className="h-5 bg-gray-200 rounded w-4/5"></div>
          </div>
        </div>

        {/* Qualification Skeleton */}
        <div className="mb-8">
          <div className="h-5 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-5 bg-gray-200 rounded w-full"></div>
            <div className="h-5 bg-gray-200 rounded w-11/12"></div>
            <div className="h-5 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

const getScoreBadgeColor = (score: number) => {
  if (score >= 0.7) return 'bg-green-100 text-green-800 border-green-200'
  if (score >= 0.5) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  return 'bg-red-100 text-red-800 border-red-200'
}

const getScoreLabel = (score: number) => {
  if (score >= 0.7) return 'High Fit'
  if (score >= 0.5) return 'Medium Fit'
  return 'Low Fit'
}

export const USGProjectCard: React.FC<USGProjectCardProps> = ({ lead, isLoading = false }) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  if (isLoading) {
    return <SkeletonProjectCard />
  }

  if (!lead) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500 h-full flex items-center justify-center">
        <div>
          <div className="text-2xl mb-2">🏗️</div>
          <div className="text-sm">Select a project to view details</div>
        </div>
      </div>
    )
  }

  const truncatedDescription = lead.description && lead.description.length > 200 
    ? lead.description.substring(0, 200) + '...'
    : lead.description

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Project Banner Header */}
      <div className="relative">
        <div className="h-32 bg-gradient-to-r from-blue-500 to-blue-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
        </div>
        
        {/* Header with Project Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white font-bold text-lg border-2 border-white/30 shadow-sm">
                  <Building className="w-8 h-8" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-semibold text-white">
                    {lead.project_name}
                  </h3>
                  {lead.project_url && (
                    <a
                      href={lead.project_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-gray-200"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className="text-sm text-gray-200">
                  ConstructConnect Project
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-white" />
              <span className="text-xl font-bold text-white">
                {(lead.spec_fit * 10).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Project Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{lead.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Bid Due: {lead.bid_due}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <TrendingUp className="w-4 h-4" />
            <span>Spec Fit: {(lead.spec_fit * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building className="w-4 h-4" />
            <span>Urgency: {(lead.urgency * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="w-4 h-4 flex items-center justify-center text-xs">🎯</span>
            <span>Confidence: {(lead.confidence * 100).toFixed(0)}%</span>
          </div>
          {lead.project_url && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ExternalLink className="w-4 h-4" />
              <a 
                href={lead.project_url} 
                className="text-blue-600 hover:underline truncate"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Project
              </a>
            </div>
          )}
        </div>

        {/* Qualification Scores */}
        <div className="mb-6 pb-6 border-b border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Qualification Scores</h4>
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getScoreBadgeColor(lead.spec_fit)}`}>
              Spec Fit: {getScoreLabel(lead.spec_fit)} ({(lead.spec_fit * 100).toFixed(0)}%)
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getScoreBadgeColor(lead.urgency)}`}>
              Urgency: {getScoreLabel(lead.urgency)} ({(lead.urgency * 100).toFixed(0)}%)
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getScoreBadgeColor(lead.confidence)}`}>
              Confidence: {getScoreLabel(lead.confidence)} ({(lead.confidence * 100).toFixed(0)}%)
            </span>
          </div>
        </div>

        {/* Reason Codes */}
        {lead.reason_codes && lead.reason_codes.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Qualification Reasons</h4>
            <div className="flex flex-wrap gap-1">
              {lead.reason_codes.map((code, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
                >
                  {code.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Project Description */}
        {lead.description && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Project Description</h4>
              {lead.description.length > 200 && (
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  {isDescriptionExpanded ? (
                    <>
                      Show Less <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      Show More <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {isDescriptionExpanded ? lead.description : truncatedDescription}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {lead.project_url && (
            <a
              href={lead.project_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View on ConstructConnect
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
