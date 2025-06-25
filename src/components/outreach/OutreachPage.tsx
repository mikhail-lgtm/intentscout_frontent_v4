import { useState, useCallback } from 'react'
import { Settings } from 'lucide-react'
import { OutreachSidebar } from './OutreachSidebar'
import { ApprovedSignal } from '../../hooks/useApprovedSignals'
import { IntentCard } from '../signals/IntentCard'
import { ContactsComponent } from '../contacts/ContactsComponent'
import { useSignalDetails } from '../../hooks/useSignalDetails'
import { SequenceBuilder } from '../sequences/SequenceBuilder'
import { EmailDrafting } from './EmailDrafting'
import { HubSpotSending } from './HubSpotSending'

interface FilterOptions {
  product: string
  minScore: number
}

export const OutreachPage = () => {
  // State management
  const [filters, setFilters] = useState<FilterOptions>({
    product: 'salesforce',
    minScore: 3
  })
  
  const [selectedSignal, setSelectedSignal] = useState<ApprovedSignal | null>(null)
  const [showSequenceBuilder, setShowSequenceBuilder] = useState(false)
  const [isHubSpotConfigured, setIsHubSpotConfigured] = useState(false)
  const [hubspotConfig, setHubspotConfig] = useState<any>(null)

  // Get full signal details when a signal is selected
  const { signal: fullSignal, isLoading: isLoadingSignalDetails } = useSignalDetails({
    approvedSignal: selectedSignal,
    productId: filters.product,
    minScore: filters.minScore
  })

  // Handlers
  const handleFilterChange = useCallback((newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setSelectedSignal(null) // Clear selection when filters change
  }, [])

  const handleSignalSelect = useCallback((signal: ApprovedSignal) => {
    setSelectedSignal(signal)
  }, [])

  const handleHubSpotConfigurationChange = useCallback((isConfigured: boolean, config?: any) => {
    setIsHubSpotConfigured(isConfigured)
    if (config) {
      setHubspotConfig(config)
    }
  }, [])

  return (
    <div className="h-full bg-gray-50 overflow-hidden flex flex-col">
      {/* Top Title Bar */}
      <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Outreach Management</h1>
          <button
            onClick={() => setShowSequenceBuilder(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            <Settings className="w-4 h-4" />
            Sequence Builder
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 px-4 sm:px-6 lg:px-8 pb-6 min-h-0">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 min-h-0">
          <OutreachSidebar 
            productId={filters.product}
            minScore={filters.minScore}
            onSignalSelect={handleSignalSelect}
            selectedSignalId={selectedSignal?.id}
            onFilterChange={handleFilterChange}
            filters={filters}
          />
        </div>

        {/* Main Content - 2x2 Grid Layout */}
        <div className="flex-1 p-4 min-h-0">
          <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full max-w-6xl mx-auto">
            {/* Top-left: Intent Signals */}
            <div className="overflow-y-auto custom-scrollbar bg-white rounded-lg shadow-sm border border-gray-200">
              <IntentCard 
                signal={fullSignal} 
                isLoading={isLoadingSignalDetails}
              />
            </div>

            {/* Top-right: HubSpot Sending */}
            <div className="overflow-y-auto custom-scrollbar bg-white rounded-lg shadow-sm border border-gray-200">
              <HubSpotSending
                signalId={selectedSignal?.id}
                companyName={fullSignal?.company?.name || selectedSignal?.companyName}
                onConfigurationChange={handleHubSpotConfigurationChange}
              />
            </div>

            {/* Bottom-left: Contacts */}
            <div className="overflow-y-auto custom-scrollbar bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <ContactsComponent 
                signalId={selectedSignal?.id || ''} 
                companyName={fullSignal?.company?.name || selectedSignal?.companyName || 'Unknown Company'} 
              />
            </div>

            {/* Bottom-right: Email Notes */}
            <div className="overflow-y-auto custom-scrollbar bg-white rounded-lg shadow-sm border border-gray-200">
              <EmailDrafting
                signalId={selectedSignal?.id}
                companyName={fullSignal?.company?.name || selectedSignal?.companyName}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sequence Builder Modal - FIXED: Only mount when actually needed */}
      {showSequenceBuilder && (
        <SequenceBuilder
          isOpen={showSequenceBuilder}
          onClose={() => setShowSequenceBuilder(false)}
        />
      )}
    </div>
  )
}