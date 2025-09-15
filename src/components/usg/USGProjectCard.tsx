import React, { useState } from 'react'
import { Building, Calendar, ExternalLink, MapPin, ChevronDown, ChevronUp, TrendingUp, Clock, Award, Target } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

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

// Convert spec_fit (0-1) to intent score (0-5) like in sidebar
const getIntentScore = (spec_fit: number) => Math.round(spec_fit * 5)

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
      {/* Project Header - Clean */}
      <div className="relative">
        <div className="h-24 bg-gradient-to-r from-orange-500 to-orange-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {lead.project_name}
                </h3>
                <div className="text-sm text-gray-200">
                  {lead.location} • Due: {lead.bid_due}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {getIntentScore(lead.spec_fit)}
              </div>
              <div className="text-xs text-gray-200">Score</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">

        {/* Qualification Scores - Minimal */}
        <div className="mb-6 pb-4 border-b border-gray-100">
          <div className="flex flex-wrap gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getScoreBadgeColor(lead.spec_fit)}`}>
              Intent: {getIntentScore(lead.spec_fit)}/5
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getScoreBadgeColor(lead.urgency)}`}>
              Urgency: {Math.round(lead.urgency * 5)}/5
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getScoreBadgeColor(lead.confidence)}`}>
              Confidence: {Math.round(lead.confidence * 5)}/5
            </span>
          </div>
        </div>

        {/* Reason Codes - Simplified */}
        {lead.reason_codes && lead.reason_codes.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Qualifications</h4>
            <div className="flex flex-wrap gap-1">
              {lead.reason_codes.map((code, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-100 text-orange-700"
                >
                  {code.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Project Description - Clean */}
        {lead.description && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">Description</h4>
              {lead.description.length > 200 && (
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
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

        {/* Action Buttons - Simple */}
        <div className="flex justify-center">
          {lead.project_url && (
            <a
              href={lead.project_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
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
