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
      {/* Project Banner Header - ConstructConnect theme */}
      <div className="relative">
        <div className="h-32 bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 relative overflow-hidden">
          {/* Construction pattern overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDBMMCAxMEwyMCAyMEw0MCAxMEwyMCAwWiIgZmlsbD0id2hpdGUiLz4KPHN2Zz4K')]"></div>
          </div>
          <div className="absolute inset-0 bg-black bg-opacity-30"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        </div>
        
        {/* Header with Project Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white font-bold text-lg border-2 border-white/30 shadow-lg">
                  <Building className="w-8 h-8" />
                </div>
                {/* Intent score indicator */}
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg border-2 border-white">
                  {getIntentScore(lead.spec_fit)}
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
                <div className="flex items-center gap-2 text-sm text-gray-200">
                  <Building className="w-4 h-4" />
                  <span>ConstructConnect Project</span>
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                  <Clock className="w-4 h-4" />
                  <span>Due: {lead.bid_due}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 text-white mb-1">
                <Target className="w-4 h-4" />
                <span className="text-xs font-medium">Intent Score</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">
                  {getIntentScore(lead.spec_fit)}
                </span>
                <span className="text-sm text-gray-200">/5</span>
              </div>
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
            <span>Intent Score: {getIntentScore(lead.spec_fit)}/5</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building className="w-4 h-4" />
            <span>Urgency: {Math.round(lead.urgency * 5)}/5</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="w-4 h-4 flex items-center justify-center text-xs">🎯</span>
            <span>Confidence: {Math.round(lead.confidence * 5)}/5</span>
          </div>
          {lead.project_url && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ExternalLink className="w-4 h-4 text-orange-500" />
              <a
                href={lead.project_url}
                className="text-orange-600 hover:text-orange-700 font-medium hover:underline truncate transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on ConstructConnect
              </a>
            </div>
          )}
        </div>

        {/* Qualification Scores - Enhanced */}
        <div className="mb-8 pb-6 border-b border-gray-100">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-500" />
            Project Qualification
          </h4>

          {/* Score cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Intent Score */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-orange-700">Intent Score</span>
                <TrendingUp className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-orange-800">{getIntentScore(lead.spec_fit)}</span>
                <span className="text-sm text-orange-600">/5</span>
              </div>
              <div className="text-xs text-orange-700 mt-1">{getScoreLabel(lead.spec_fit)}</div>
            </div>

            {/* Urgency */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-700">Urgency</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-blue-800">{Math.round(lead.urgency * 5)}</span>
                <span className="text-sm text-blue-600">/5</span>
              </div>
              <div className="text-xs text-blue-700 mt-1">{getScoreLabel(lead.urgency)}</div>
            </div>

            {/* Confidence */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-green-700">Confidence</span>
                <Award className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-green-800">{Math.round(lead.confidence * 5)}</span>
                <span className="text-sm text-green-600">/5</span>
              </div>
              <div className="text-xs text-green-700 mt-1">{getScoreLabel(lead.confidence)}</div>
            </div>
          </div>
        </div>

        {/* Reason Codes - Enhanced */}
        {lead.reason_codes && lead.reason_codes.length > 0 && (
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-500" />
              Qualification Reasons
            </h4>
            <div className="flex flex-wrap gap-2">
              {lead.reason_codes.map((code, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800 border border-orange-200 hover:from-orange-200 hover:to-orange-100 transition-colors"
                >
                  {code.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Project Description - Enhanced */}
        {lead.description && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-orange-500" />
                Project Description
              </h4>
              {lead.description.length > 200 && (
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-orange-50 transition-colors"
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
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown
                  components={{
                    p: ({children}) => <p className="text-sm text-gray-700 mb-3 leading-relaxed">{children}</p>,
                    ul: ({children}) => <ul className="list-disc list-inside text-sm text-gray-700 mb-3 space-y-1 ml-2">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal list-inside text-sm text-gray-700 mb-3 space-y-1 ml-2">{children}</ol>,
                    li: ({children}) => <li className="text-sm text-gray-700">{children}</li>,
                    strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                    em: ({children}) => <em className="italic text-gray-800">{children}</em>,
                  }}
                >
                  {isDescriptionExpanded ? lead.description : truncatedDescription}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons - Enhanced */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200/50">
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            {lead.project_url && (
              <a
                href={lead.project_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02]"
              >
                <ExternalLink className="w-5 h-5" />
                View Full Project on ConstructConnect
              </a>
            )}
            <button className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white text-orange-600 border-2 border-orange-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 font-medium">
              <Award className="w-4 h-4" />
              Save to Favorites
            </button>
          </div>

          {/* Project metadata footer */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-orange-200/50 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Building className="w-3 h-3" />
              <span>Project ID: {lead.id}</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              <span>Score: {getIntentScore(lead.spec_fit)}/5</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
