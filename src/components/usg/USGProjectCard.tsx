import React, { useState } from 'react'
import { Building, Calendar, ExternalLink, MapPin, ChevronDown, ChevronUp, TrendingUp, Clock, Award, Target, Users, Hash, Layers, Brain } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface Contact {
  email: string
  name?: string
}

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
  contacts?: Contact[]
  structures?: string[]
  project_id?: string
  reasoning?: string
}

interface USGProjectCardProps {
  lead: Lead | null
  isLoading?: boolean
}

const SkeletonProjectCard: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="h-28 bg-gray-200 relative">
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gray-300 rounded-lg"></div>
              <div>
                <div className="h-6 bg-gray-300 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-32"></div>
              </div>
            </div>
            <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Scores Skeleton */}
        <div className="pb-4 border-b border-gray-100">
          <div className="h-5 bg-gray-200 rounded w-40 mb-3"></div>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-12 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Intent Analysis Skeleton */}
        <div>
          <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/5"></div>
            </div>
          </div>
        </div>

        {/* Project Details Skeleton */}
        <div>
          <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-200 rounded"></div>
                <div>
                  <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reason Codes Skeleton */}
        <div>
          <div className="h-5 bg-gray-200 rounded w-48 mb-3"></div>
          <div className="flex flex-wrap gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-6 bg-gray-200 rounded-full w-20"></div>
            ))}
          </div>
        </div>

        {/* Contacts Skeleton */}
        <div>
          <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="p-3 bg-gray-100 rounded-lg">
                <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-48"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Description Skeleton */}
        <div>
          <div className="h-5 bg-gray-200 rounded w-40 mb-3"></div>
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
              ))}
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>

        {/* Button Skeleton */}
        <div className="flex justify-center pt-4">
          <div className="h-12 bg-gray-200 rounded-lg w-48"></div>
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
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false)

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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Project Header - Enhanced */}
      <div className="relative">
        <div className="h-28 bg-gradient-to-r from-orange-500 to-orange-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center">
                <Building className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-1">
                  {lead.project_name}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-200">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {lead.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Due: {lead.bid_due}
                  </div>
                  {lead.project_id && (
                    <div className="flex items-center gap-1">
                      <Hash className="w-4 h-4" />
                      {lead.project_id}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">
                {getIntentScore(lead.spec_fit)}
              </div>
              <div className="text-xs text-gray-200">Intent Score</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Qualification Scores - Enhanced */}
        <div className="pb-4 border-b border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Qualification Scores</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold ${getScoreBadgeColor(lead.spec_fit)}`}>
                {getIntentScore(lead.spec_fit)}
              </div>
              <div className="text-xs text-gray-600 mt-1">Intent</div>
            </div>
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold ${getScoreBadgeColor(lead.urgency)}`}>
                {Math.round(lead.urgency * 5)}
              </div>
              <div className="text-xs text-gray-600 mt-1">Urgency</div>
            </div>
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold ${getScoreBadgeColor(lead.confidence)}`}>
                {Math.round(lead.confidence * 5)}
              </div>
              <div className="text-xs text-gray-600 mt-1">Confidence</div>
            </div>
          </div>
        </div>

        {/* Intent Analysis - NEW */}
        {lead.reasoning && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-blue-600" />
              <h4 className="text-sm font-medium text-gray-900">Intent Analysis</h4>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-900 leading-relaxed">
                {lead.reasoning}
              </p>
            </div>
          </div>
        )}

        {/* Project Details - NEW */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Project Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-xs text-gray-500">Location</div>
                <div className="text-sm text-gray-900">{lead.location}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-xs text-gray-500">Bid Due</div>
                <div className="text-sm text-gray-900">{lead.bid_due}</div>
              </div>
            </div>
            {lead.project_id && (
              <div className="flex items-center gap-3">
                <Hash className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Project ID</div>
                  <div className="text-sm text-gray-900">{lead.project_id}</div>
                </div>
              </div>
            )}
            {lead.structures && lead.structures.length > 0 && (
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Structure Type</div>
                  <div className="text-sm text-gray-900">{lead.structures.join(', ')}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reason Codes */}
        {lead.reason_codes && lead.reason_codes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Qualification Criteria Met</h4>
            <div className="flex flex-wrap gap-2">
              {lead.reason_codes.map((code, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  ✓ {code.replace(/_/g, ' ').replace(/has /g, '')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contacts */}
        {lead.contacts && lead.contacts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-gray-600" />
              <h4 className="text-sm font-medium text-gray-900">Key Contacts</h4>
            </div>
            <div className="space-y-2">
              {lead.contacts.slice(0, 3).map((contact, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {contact.name || 'Contact'}
                    </div>
                    <a 
                      href={`mailto:${contact.email}`}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {contact.email}
                    </a>
                  </div>
                </div>
              ))}
              {lead.contacts.length > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  +{lead.contacts.length - 3} more contacts
                </div>
              )}
            </div>
          </div>
        )}

        {/* Project Description - Full Text, No Truncation */}
        {lead.description && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Project Description</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {lead.description}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center pt-4">
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
