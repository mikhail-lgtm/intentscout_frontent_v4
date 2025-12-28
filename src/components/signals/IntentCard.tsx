import React, { useState } from 'react'
import { TrendingUp, Building, Calendar, Users, ExternalLink, Linkedin, Briefcase, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Minus, Ban } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Signal } from '../../hooks/useSignals'
import { api } from '../../lib/apiClient'
import { ConfirmationModal } from '../ui/ConfirmationModal'

interface IntentCardProps {
  signal: Signal | null
  onApprove?: () => void
  onReject?: () => void
  onRemoveDecision?: () => void
  onBlockCompany?: (companyId: string, companyName: string) => void
  isLoading?: boolean
}

const SkeletonIntentCard: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse h-full min-h-[600px]">
      {/* Header Banner Skeleton */}
      <div className="h-32 bg-gray-200"></div>
      
      <div className="p-6">
        {/* Company Header Skeleton */}
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

        {/* Company Details Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded"></div>
              <div className="h-5 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>

        {/* About Section Skeleton */}
        <div className="mb-8">
          <div className="h-5 bg-gray-200 rounded w-24 mb-4"></div>
          <div className="space-y-3">
            <div className="h-5 bg-gray-200 rounded w-full"></div>
            <div className="h-5 bg-gray-200 rounded w-5/6"></div>
            <div className="h-5 bg-gray-200 rounded w-4/5"></div>
          </div>
        </div>

        {/* Analysis Skeleton */}
        <div className="mb-8">
          <div className="h-5 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-5 bg-gray-200 rounded w-full"></div>
            <div className="h-5 bg-gray-200 rounded w-11/12"></div>
            <div className="h-5 bg-gray-200 rounded w-5/6"></div>
            <div className="h-5 bg-gray-200 rounded w-full"></div>
            <div className="h-5 bg-gray-200 rounded w-4/5"></div>
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>

        {/* Job Citations Skeleton */}
        <div className="mb-8">
          <div className="h-5 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions Skeleton */}
        <div className="flex justify-center gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
          <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
        </div>
      </div>
    </div>
  )
}

const JobCitationCard: React.FC<{ job: any; citationIndex: number; isExpanded: boolean; onToggle: () => void }> = ({ 
  job, 
  citationIndex, 
  isExpanded, 
  onToggle 
}) => {
  if (!job) return null

  return (
    <div 
      id={`job-card-${citationIndex}`}
      className="bg-white border border-gray-200 rounded-lg p-4 transition-all duration-200 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        {/* Citation number */}
        <div className="w-8 h-8 bg-gray-100 text-gray-700 rounded-md flex items-center justify-center flex-shrink-0 text-sm font-medium">
          {citationIndex + 1}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Job header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h5 className="font-medium text-gray-900 text-sm mb-1">{job.title}</h5>
              <div className="text-xs text-gray-600 space-x-2">
                <span>{job.company}</span>
                <span>•</span>
                <span>{job.location}</span>
                <span>•</span>
                <span>{job.datePosted}</span>
                {job.isRemote && (
                  <>
                    <span>•</span>
                    <span className="text-green-600">Remote</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Job description */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown 
                  components={{
                    h1: ({children}) => <h1 className="text-base font-semibold text-gray-900 mb-2">{children}</h1>,
                    h2: ({children}) => <h2 className="text-sm font-medium text-gray-800 mb-2">{children}</h2>,
                    h3: ({children}) => <h3 className="text-sm font-medium text-gray-800 mb-1">{children}</h3>,
                    p: ({children}) => <p className="text-sm text-gray-700 mb-2 leading-relaxed">{children}</p>,
                    ul: ({children}) => <ul className="list-disc list-inside text-sm text-gray-700 mb-2 space-y-1">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal list-inside text-sm text-gray-700 mb-2 space-y-1">{children}</ol>,
                    li: ({children}) => <li className="text-sm text-gray-700">{children}</li>,
                    strong: ({children}) => <strong className="font-medium text-gray-900">{children}</strong>,
                    em: ({children}) => <em className="italic text-gray-800">{children}</em>,
                  }}
                >
                  {job.descriptionMarkdown}
                </ReactMarkdown>
              </div>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex items-center justify-between mt-3">
            {job.jobUrl && (
              <a
                href={job.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                View Original Post
              </a>
            )}
            <button
              onClick={onToggle}
              className="text-xs text-gray-600 hover:text-gray-800 font-medium"
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const IntentCard: React.FC<IntentCardProps> = ({ signal, onApprove, onReject, onRemoveDecision, onBlockCompany, isLoading = false }) => {
  const [expandedJobs, setExpandedJobs] = useState<Set<number>>(new Set())
  const [isUpdating, setIsUpdating] = useState(false)
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    action: () => void
    variant?: 'warning' | 'danger' | 'info' | 'success'
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
    variant: 'warning'
  })
  const [blockModal, setBlockModal] = useState<{
    isOpen: boolean
    companyId: string
    companyName: string
  }>({
    isOpen: false,
    companyId: '',
    companyName: ''
  })

  const handleApprove = async () => {
    if (!signal?.id || isUpdating) return
    
    // Show confirmation if signal already has a decision
    if (signal.decision && signal.decision !== 'approve') {
      setConfirmationModal({
        isOpen: true,
        title: 'Change Signal Status',
        message: `This signal is currently ${signal.decision}d. Are you sure you want to approve it?`,
        action: executeApprove,
        variant: 'success'
      })
      return
    }
    
    executeApprove()
  }

  const executeApprove = async () => {
    if (!signal?.id || isUpdating) return
    
    setIsUpdating(true)
    try {
      const response = await api.signals.updateDecision(signal.id, 'approve')
      if (response.error) {
        throw new Error(response.error)
      }
      onApprove?.()
    } catch (err) {
      console.error('Failed to approve signal:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleReject = async () => {
    if (!signal?.id || isUpdating) return
    
    // Show confirmation if signal already has a decision
    if (signal.decision && signal.decision !== 'reject') {
      setConfirmationModal({
        isOpen: true,
        title: 'Change Signal Status',
        message: `This signal is currently ${signal.decision === 'approve' ? 'approved' : signal.decision}. Are you sure you want to reject it?`,
        action: executeReject,
        variant: 'danger'
      })
      return
    }
    
    executeReject()
  }

  const executeReject = async () => {
    if (!signal?.id || isUpdating) return
    
    setIsUpdating(true)
    try {
      const response = await api.signals.updateDecision(signal.id, 'reject')
      if (response.error) {
        throw new Error(response.error)
      }
      onReject?.()
    } catch (err) {
      console.error('Failed to reject signal:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemoveDecision = async () => {
    if (!signal?.id || isUpdating) return
    
    // Show confirmation if signal has a decision
    if (signal.decision) {
      setConfirmationModal({
        isOpen: true,
        title: 'Remove Decision',
        message: `This signal is currently ${signal.decision === 'approve' ? 'approved' : 'rejected'}. Are you sure you want to remove this decision?`,
        action: executeRemoveDecision,
        variant: 'warning'
      })
      return
    }
    
    executeRemoveDecision()
  }

  const executeRemoveDecision = async () => {
    if (!signal?.id || isUpdating) return

    setIsUpdating(true)
    try {
      const response = await api.signals.updateDecision(signal.id, 'remove')
      if (response.error) {
        throw new Error(response.error)
      }
      onRemoveDecision?.()
    } catch (err) {
      console.error('Failed to remove decision:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBlockCompany = () => {
    if (!signal?.company) return

    setBlockModal({
      isOpen: true,
      companyId: signal.company.id,
      companyName: signal.company.name
    })
  }

  const confirmBlockCompany = () => {
    if (blockModal.companyId && blockModal.companyName) {
      onBlockCompany?.(blockModal.companyId, blockModal.companyName)
      setBlockModal({ isOpen: false, companyId: '', companyName: '' })
    }
  }

  const toggleJobExpansion = (index: number) => {
    setExpandedJobs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
    
    // Scroll to the job card
    setTimeout(() => {
      const element = document.getElementById(`job-card-${index}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  if (isLoading) {
    return <SkeletonIntentCard />
  }

  if (!signal) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500 h-full flex items-center justify-center">
        <div>
          <div className="text-2xl mb-2">📊</div>
          <div className="text-sm">Select a signal to view details</div>
        </div>
      </div>
    )
  }

  const company = signal.company
  const jobs = signal.jobs || []
  const citationIds: string[] = (signal as any)?.citations || []

  // Build cited jobs list in the order of citations if provided
  const citedJobs = citationIds.length
    ? citationIds
        .map((cid) =>
          jobs.find((job: any) =>
            job?.pageHtmlBackblazeUuid === cid ||
            job?.id === cid ||
            (typeof job?.jobUrl === 'string' && job.jobUrl.includes(cid))
          )
        )
        .filter(Boolean)
    : jobs
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Company Banner Header */}
      <div className="relative">
        {company?.bannerUrl && (
          <div className="h-32 relative overflow-hidden">
            <img 
              src={company.bannerUrl} 
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          </div>
        )}
        
        {/* Header with Company Logo and Info */}
        <div className={`${company?.bannerUrl ? 'absolute bottom-0 left-0 right-0 p-6 text-white' : 'p-6'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                {company?.logoUrl || company?.profilePictureUrl ? (
                  <img 
                    src={company.logoUrl || company.profilePictureUrl} 
                    alt={company.name || 'Company logo'}
                    className="w-16 h-16 rounded-lg object-cover border-2 border-white shadow-sm"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div 
                  className={`w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center text-orange-600 font-bold text-lg border-2 border-white shadow-sm ${
                    company?.logoUrl || company?.profilePictureUrl ? 'hidden' : 'flex'
                  }`}
                >
                  {company?.name ? company.name.substring(0, 2).toUpperCase() : 'UN'}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg sm:text-xl font-semibold ${company?.bannerUrl ? 'text-white' : 'text-gray-900'}`}>
                    {company?.name || 'Unknown Company'}
                  </h3>
                  {company?.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${company?.bannerUrl ? 'text-white hover:text-gray-200' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className={`text-sm ${company?.bannerUrl ? 'text-gray-200' : 'text-gray-600'}`}>
                  {company?.industry || 'Unknown Industry'}
                </p>
                {company?.vertical && (
                  <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                    company?.bannerUrl 
                      ? 'bg-white bg-opacity-20 text-white' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {company.vertical}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className={`w-5 h-5 ${company?.bannerUrl ? 'text-white' : 'text-orange-500'}`} />
              <span className={`text-xl font-bold ${company?.bannerUrl ? 'text-white' : 'text-orange-500'}`}>
                {signal.intentScore.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">

      {/* Company Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {company?.website && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <ExternalLink className="w-4 h-4" />
            <a 
              href={company.website} 
              className="text-blue-600 hover:underline truncate"
              target="_blank"
              rel="noopener noreferrer"
            >
              Website
            </a>
          </div>
        )}
        {company?.headquarters && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building className="w-4 h-4" />
            <span className="truncate">{company.headquarters}</span>
          </div>
        )}
        {company?.companySize && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>{company.companySize}</span>
          </div>
        )}
        {company?.founded && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Founded {company.founded}</span>
          </div>
        )}
        {company?.type && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building className="w-4 h-4" />
            <span>{company.type}</span>
          </div>
        )}
        {signal.jobsFoundCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Briefcase className="w-4 h-4" />
            <span>{signal.jobsFoundCount} jobs found</span>
          </div>
        )}
      </div>

      {/* About Us Section */}
      {company?.aboutUs && (
        <div className="mb-6 pb-6 border-b border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-2">About</h4>
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
            {company.aboutUs}
          </p>
        </div>
      )}

      {/* Specialties */}
      {company?.specialties && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Specialties</h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            {company.specialties.length > 200 ? `${company.specialties.substring(0, 200)}...` : company.specialties}
          </p>
        </div>
      )}

      {/* Reasoning with Interactive Citations */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Intent Analysis</h4>
        <div className="text-sm text-gray-700 leading-relaxed">
          {(() => {
            // Parse reasoning text and inject clickable citations for job IDs in curly braces
            const citationRegex = /\{([^}]+)\}/g
            const parts = []
            let lastIndex = 0
            let match
            let citationNumber = 1

            while ((match = citationRegex.exec(signal.reasoning)) !== null) {
              // Add text before citation
              if (match.index > lastIndex) {
                parts.push(signal.reasoning.slice(lastIndex, match.index))
              }
              
              // Find the job that matches this citation ID (Backblaze UUID)
              const citationId = match[1]
              const jobIndex = citedJobs.findIndex((job: any) => 
                job?.pageHtmlBackblazeUuid === citationId ||
                job?.id === citationId || 
                (typeof job?.jobUrl === 'string' && job.jobUrl.includes(citationId)) ||
                (typeof job?.id === 'string' && citationId.includes(job.id))
              )
              
              parts.push(
                <button
                  key={`citation-${citationNumber}`}
                  className="inline-flex items-center justify-center w-5 h-5 bg-orange-100 text-orange-600 rounded-full text-xs font-semibold mx-1 hover:bg-orange-200 transition-colors cursor-pointer"
                  onClick={() => toggleJobExpansion(jobIndex >= 0 ? jobIndex : citationNumber - 1)}
                  title={jobIndex >= 0 ? citedJobs[jobIndex]?.title : `Job ${citationNumber}`}
                >
                  {citationNumber}
                </button>
              )
              
              citationNumber++
              lastIndex = citationRegex.lastIndex
            }
            
            // Add remaining text
            if (lastIndex < signal.reasoning.length) {
              parts.push(signal.reasoning.slice(lastIndex))
            }
            
            return parts.map((part, index) => (
              <span key={index}>{part}</span>
            ))
          })()}
        </div>
      </div>

      {/* Job Citations */}
      {citedJobs.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Evidence from Job Postings ({citedJobs.length})
          </h4>
          <div className="space-y-3">
            {citedJobs.map((job, index) => (
              <JobCitationCard
                key={job?.id || index}
                job={job}
                citationIndex={index}
                isExpanded={expandedJobs.has(index)}
                onToggle={() => toggleJobExpansion(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Decision Slider */}
      <div className="flex justify-center">
        <div className="relative bg-gray-100 rounded-full p-1 shadow-inner backdrop-blur-sm">
          {/* Sliding Background Indicator */}
          <div 
            className={`absolute top-2 bottom-2 left-2 right-2 w-[76px] rounded-full transition-all duration-300 ease-out shadow-inner ${
              signal?.decision === 'reject' 
                ? 'translate-x-0 bg-red-500 shadow-md' 
                : signal?.decision === 'approve' 
                ? 'translate-x-[160px] bg-green-500 shadow-md'
                : 'translate-x-[80px] bg-gray-300 shadow-sm'
            }`}
          />
          
          {/* Three State Buttons */}
          <div className="relative flex">
            {/* Reject State */}
            <button
              onClick={signal?.decision === 'reject' ? handleRemoveDecision : handleReject}
              disabled={isUpdating}
              className={`group relative z-10 w-20 h-12 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 ${
                signal?.decision === 'reject'
                  ? 'text-white'
                  : 'text-red-500 hover:text-red-700'
              }`}
            >
              {/* Red-tinted glass hover effect */}
              <div className="absolute inset-1 rounded-full bg-red-500/15 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-inner" />
              <ThumbsDown size={18} className="relative z-10" />
            </button>
            
            {/* Neutral State */}
            <button
              onClick={handleRemoveDecision}
              disabled={isUpdating}
              className={`group relative z-10 w-20 h-12 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 ${
                !signal?.decision
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {/* Neutral gray-tinted glass hover effect */}
              <div className="absolute inset-1 rounded-full bg-gray-200/25 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-inner" />
              <Minus size={18} className="relative z-10" />
            </button>
            
            {/* Approve State */}
            <button
              onClick={signal?.decision === 'approve' ? handleRemoveDecision : handleApprove}
              disabled={isUpdating}
              className={`group relative z-10 w-20 h-12 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 ${
                signal?.decision === 'approve'
                  ? 'text-white'
                  : 'text-green-500 hover:text-green-700'
              }`}
            >
              {/* Green-tinted glass hover effect */}
              <div className="absolute inset-1 rounded-full bg-green-500/15 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-inner" />
              <ThumbsUp size={18} className="relative z-10" />
            </button>
          </div>
        </div>

        {/* Block Company Button */}
        {onBlockCompany && (
          <div className="flex justify-center mt-4">
            <button
              onClick={handleBlockCompany}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Ban className="w-4 h-4" />
              Block Company
            </button>
          </div>
        )}
      </div>

      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}
        onConfirm={confirmationModal.action}
        title={confirmationModal.title}
        message={confirmationModal.message}
        variant={confirmationModal.variant}
        confirmText="Yes, Continue"
        cancelText="Cancel"
      />

      {/* Block Company Modal */}
      <ConfirmationModal
        isOpen={blockModal.isOpen}
        onClose={() => setBlockModal({ isOpen: false, companyId: '', companyName: '' })}
        onConfirm={confirmBlockCompany}
        title="Block Company"
        message={`Are you sure you want to block "${blockModal.companyName}"? This company will no longer appear in your signals. You can unblock it later in Settings.`}
        variant="danger"
        confirmText="Block Company"
        cancelText="Cancel"
      />
    </div>
  )
}