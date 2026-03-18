import { useState, useCallback } from 'react'
import { OutreachSidebar } from './OutreachSidebar'
import { ApprovedSignal } from '../../hooks/useApprovedSignals'
import { useSignalDetails } from '../../hooks/useSignalDetails'
import { useFilters } from '../../hooks/useFilters'
import { ContactsComponent } from '../contacts/ContactsComponent'
import { SequenceBuilder } from '../sequences/SequenceBuilder'
import {
  Building2, Globe, Users, MapPin, Briefcase, ExternalLink,
  ThumbsDown, ThumbsUp, Minus, ChevronDown, ChevronUp, Zap, Settings
} from 'lucide-react'
import { api } from '../../lib/apiClient'

export const OutreachPageV2 = () => {
  const { filters, setFilters } = useFilters()
  const [selectedSignal, setSelectedSignal] = useState<ApprovedSignal | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showSequenceBuilder, setShowSequenceBuilder] = useState(false)

  const { signal: fullSignal, isLoading: isLoadingSignalDetails } = useSignalDetails({
    approvedSignal: selectedSignal,
    productId: filters.product,
    minScore: filters.minScore
  })

  const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters(newFilters)
    setSelectedSignal(null)
  }, [setFilters])

  const handleSignalSelect = useCallback((signal: ApprovedSignal) => {
    setSelectedSignal(signal)
    setShowDetails(false)
  }, [])

  const handleDecision = async (action: 'approve' | 'reject' | 'remove') => {
    if (!selectedSignal || isUpdating) return
    setIsUpdating(true)
    try {
      await api.signals.updateDecision(selectedSignal.id, action)
      if (action === 'reject' || action === 'remove') {
        setSelectedSignal(null)
      }
    } catch (err) {
      console.error('Failed to update decision:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const company = fullSignal?.company
  const reasoning = fullSignal?.reasoning
  const jobs = fullSignal?.jobs || []
  // Signal is approved since it's in the outreach queue
  const currentDecision = 'approve'

  return (
    <div className="h-full bg-gray-50 overflow-hidden flex flex-col">
      {/* Top Title Bar */}
      <div className="flex-shrink-0 px-3 sm:px-4 lg:px-6 pt-3 pb-1">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Outreach Management</h1>
          <button
            onClick={() => setShowSequenceBuilder(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm"
          >
            <Settings className="w-4 h-4" />
            Sequence Builder
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 px-3 sm:px-4 lg:px-6 py-3 min-h-0 overflow-auto lg:overflow-hidden">
        {/* Sidebar */}
        <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 min-h-[300px] lg:min-h-0 lg:h-full">
          <OutreachSidebar
            productId={filters.product}
            minScore={filters.minScore}
            onSignalSelect={handleSignalSelect}
            selectedSignalId={selectedSignal?.id}
            onFilterChange={handleFilterChange}
            filters={filters}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">

          {/* ============ SIGNAL INFO (compact) ============ */}
          {selectedSignal ? (
            <div className="flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Compact header - always visible */}
              <div className="flex items-center gap-3 px-4 py-2.5">
                {/* Logo */}
                {company?.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={company.name}
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                ) : (
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-orange-600" />
                  </div>
                )}

                {/* Company name + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-gray-900 truncate">
                      {company?.name || selectedSignal.companyName}
                    </h2>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${
                      selectedSignal.intentScore >= 4.5 ? 'bg-green-100 text-green-700'
                        : selectedSignal.intentScore >= 4.0 ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {selectedSignal.intentScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                    {company?.industry && (
                      <span className="flex items-center gap-0.5"><Building2 className="w-3 h-3" />{company.industry}</span>
                    )}
                    {company?.companySize && (
                      <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{company.companySize}</span>
                    )}
                    {company?.headquarters && (
                      <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{company.headquarters}</span>
                    )}
                    {company?.website && (
                      <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-blue-500 hover:underline">
                        <Globe className="w-3 h-3" />Web
                      </a>
                    )}
                    {jobs.length > 0 && (
                      <span className="flex items-center gap-0.5"><Briefcase className="w-3 h-3" />{jobs.length} jobs</span>
                    )}
                  </div>
                </div>

                {/* Decision Slider */}
                <div className="flex-shrink-0">
                  <div className="relative bg-gray-100 rounded-full p-0.5 shadow-inner">
                    {/* Sliding Background */}
                    <div
                      className={`absolute top-1 bottom-1 w-[32px] rounded-full transition-all duration-300 ease-out shadow-sm ${
                        currentDecision === 'reject'
                          ? 'left-1 bg-red-500'
                          : currentDecision === 'approve'
                          ? 'right-1 left-auto bg-green-500'
                          : 'left-[34px] bg-gray-300'
                      }`}
                      style={currentDecision === 'approve' ? { left: 'auto', right: '2px' } : currentDecision === 'reject' ? { left: '2px' } : { left: '34px' }}
                    />
                    <div className="relative flex">
                      <button
                        onClick={() => handleDecision('reject')}
                        disabled={isUpdating}
                        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 ${
                          currentDecision === 'reject' ? 'text-white' : 'text-red-400 hover:text-red-600'
                        }`}
                        title="Reject"
                      >
                        <ThumbsDown size={14} />
                      </button>
                      <button
                        onClick={() => handleDecision('remove')}
                        disabled={isUpdating}
                        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 ${
                          !currentDecision || currentDecision === 'remove' ? 'text-white' : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title="Remove decision"
                      >
                        <Minus size={14} />
                      </button>
                      <button
                        onClick={() => handleDecision('approve')}
                        disabled={isUpdating}
                        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 ${
                          currentDecision === 'approve' ? 'text-white' : 'text-green-400 hover:text-green-600'
                        }`}
                        title="Approve"
                      >
                        <ThumbsUp size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expand/Collapse */}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  title={showDetails ? 'Collapse details' : 'Show details'}
                >
                  {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* Expandable details */}
              {showDetails && (
                <div className="px-4 pb-3 border-t border-gray-100 pt-2 space-y-2 overflow-y-auto" style={{ maxHeight: '200px' }}>
                  {/* About */}
                  {company?.aboutUs && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">About</h4>
                      <p className="text-xs text-gray-600">{company.aboutUs}</p>
                    </div>
                  )}

                  {/* Intent Analysis */}
                  {reasoning && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Intent Analysis</h4>
                      <p className="text-xs text-gray-600 whitespace-pre-line">{reasoning}</p>
                    </div>
                  )}

                  {/* Jobs */}
                  {jobs.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Related Jobs ({jobs.length})</h4>
                      <div className="space-y-1">
                        {jobs.slice(0, 8).map((job: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2.5 py-1.5">
                            <span className="text-gray-700 truncate">{job.title}</span>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              {job.location && <span className="text-gray-400">{job.location}</span>}
                              {job.jobUrl && (
                                <a href={job.jobUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                        {jobs.length > 8 && <p className="text-xs text-gray-400 pl-2">+ {jobs.length - 8} more</p>}
                      </div>
                    </div>
                  )}

                  {isLoadingSignalDetails && (
                    <div className="text-xs text-gray-400 animate-pulse">Loading signal details...</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-200 px-5 py-8 text-center">
              <Zap className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Select a signal from the queue to start outreach</p>
            </div>
          )}

          {/* ============ WORKSPACE (~75% height) ============ */}
          <div className="flex-1 min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-y-auto">
            {selectedSignal ? (
              <div className="p-4">
                <ContactsComponent
                  signalId={selectedSignal.id}
                  companyName={fullSignal?.company?.name || selectedSignal.companyName || 'Unknown Company'}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-gray-400">
                No signal selected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sequence Builder Modal */}
      <SequenceBuilder
        isOpen={showSequenceBuilder}
        onClose={() => setShowSequenceBuilder(false)}
      />
    </div>
  )
}
