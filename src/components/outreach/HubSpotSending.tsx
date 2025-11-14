import { useState, useEffect } from 'react'
import { Settings, Wifi, WifiOff, Search, X, ExternalLink, Building, Users, CheckCircle, Loader2, Mail } from 'lucide-react'
import { api } from '../../lib/apiClient'
import { CompanyImportPopup } from './CompanyImportPopup'
import { ContactImportPopup } from './ContactImportPopup'

interface HubSpotSequence {
  id: string
  name: string
  created_at: string
  updated_at: string
  user_id: string
  email_step_count: number
  total_step_count: number
}

interface HubSpotConfig {
  sender_email: string | null
  selected_sequence_id: string | null
  selected_sequence_name: string | null
  is_connected: boolean
  connection_status: string
  last_updated: string | null
}

interface HubSpotSendingProps {
  signalId?: string
  companyName?: string
  onConfigurationChange?: (isConfigured: boolean, config?: HubSpotConfig) => void
}

export const HubSpotSending = ({ signalId, companyName, onConfigurationChange }: HubSpotSendingProps) => {
  // State management
  const [hubspotConfig, setHubspotConfig] = useState<HubSpotConfig>({
    sender_email: null,
    selected_sequence_id: null,
    selected_sequence_name: null,
    is_connected: false,
    connection_status: 'disconnected',
    last_updated: null
  })
  
  const [senderEmail, setSenderEmail] = useState('')
  const [selectedSequence, setSelectedSequence] = useState<HubSpotSequence | null>(null)
  const [availableSequences, setAvailableSequences] = useState<HubSpotSequence[]>([])
  const [showSequenceSearch, setShowSequenceSearch] = useState(false)
  const [showCompanyImportPopup, setShowCompanyImportPopup] = useState(false)
  const [showContactImportPopup, setShowContactImportPopup] = useState(false)
  
  // Loading states
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [isLoadingSequences, setIsLoadingSequences] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [isImportingCompany, setIsImportingCompany] = useState(false)
  const [isEnrollingInSequence, setIsEnrollingInSequence] = useState(false)

  // Company import status
  const [companyImportStatus, setCompanyImportStatus] = useState<{
    imported: boolean
    hubspot_company_id: string | null
    imported_at: string | null
  }>({
    imported: false,
    hubspot_company_id: null,
    imported_at: null
  })

  // Contact import status
  const [contactImportStatus, setContactImportStatus] = useState<{
    imported: boolean
    import_id: string | null
    contacts_count: number
    imported_at: string | null
  }>({
    imported: false,
    import_id: null,
    contacts_count: 0,
    imported_at: null
  })

  // Email sync status
  const [emailSyncStatus, setEmailSyncStatus] = useState<{
    synced: boolean
    contacts_synced: number
    contacts_created: number
    contacts_updated: number
    synced_at: string | null
  }>({
    synced: false,
    contacts_synced: 0,
    contacts_created: 0,
    contacts_updated: 0,
    synced_at: null
  })

  const [isSyncingEmails, setIsSyncingEmails] = useState(false)

  // Search
  const [sequenceSearch, setSequenceSearch] = useState('')

  // OPTIMIZED: Load HubSpot configuration and related data on mount
  useEffect(() => {
    if (signalId) {
      loadHubSpotConfig()
    }
  }, [signalId])

  // OPTIMIZED: Load sequences and import statuses only when needed, combined
  useEffect(() => {
    if (signalId && hubspotConfig.is_connected) {
      // Load sequences and check import statuses in parallel
      Promise.all([
        loadHubSpotSequences(),
        checkCompanyImportStatus(),
        checkContactImportStatus()
      ]).catch(err => {
        console.error('Failed to load HubSpot data:', err)
      })
    }
  }, [signalId, hubspotConfig.is_connected])

  // Client-side filtering
  const filteredSequences = availableSequences.filter(seq =>
    seq.name.toLowerCase().includes(sequenceSearch.toLowerCase())
  )

  // Notify parent of configuration status
  useEffect(() => {
    const isConfigured = hubspotConfig.is_connected && 
                        !!hubspotConfig.sender_email && 
                        !!hubspotConfig.selected_sequence_id
    onConfigurationChange?.(isConfigured, hubspotConfig)
  }, [hubspotConfig, onConfigurationChange])

  // Close sequence search when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSequenceSearch(false)
    }
    
    if (showSequenceSearch) {
      document.addEventListener('click', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showSequenceSearch])

  const loadHubSpotConfig = async () => {
    if (!signalId) return
    
    try {
      setIsLoadingConfig(true)
      
      // Check HubSpot connection status
      const statusResponse = await api.hubspot.getStatus()

      let connectionStatus = 'disconnected'
      let isConnected = false

      if (statusResponse.data && typeof statusResponse.data === 'object' && 'connected' in statusResponse.data) {
        const data = statusResponse.data as any
        isConnected = data.connected

        // Check if token is valid
        if (isConnected && data.token_valid === false) {
          connectionStatus = 'token_expired'
          console.warn('HubSpot token expired:', data.warning)
        } else if (isConnected && data.token_valid === true) {
          connectionStatus = 'connected'
        } else if (isConnected) {
          // Connected but token validity unknown
          connectionStatus = 'connected'
        } else {
          connectionStatus = 'disconnected'
        }
      }
      
      // Get signal-specific settings
      let settingsConfig = {
        sender_email: null,
        selected_sequence_id: null,
        selected_sequence_name: null
      }
      
      if (isConnected) {
        try {
          const settingsResponse = await api.settings.getSignalHubSpot(signalId)
          
          if (settingsResponse.data && typeof settingsResponse.data === 'object') {
            const data = settingsResponse.data as any
            settingsConfig = {
              sender_email: data.sender_email || null,
              selected_sequence_id: data.selected_sequence_id || null,
              selected_sequence_name: data.selected_sequence_name || null
            }
          }
        } catch (settingsError) {
          console.log('Signal settings not yet configured, using defaults')
        }
      }
      
      const config = {
        ...settingsConfig,
        is_connected: isConnected,
        connection_status: connectionStatus,
        last_updated: null
      }
      
      setHubspotConfig(config)
      setSenderEmail(config.sender_email || '')
      
      // Find and set selected sequence if available
      if (config.selected_sequence_id && availableSequences.length > 0) {
        const sequence = availableSequences.find(s => s.id === config.selected_sequence_id)
        if (sequence) setSelectedSequence(sequence)
      }
      
    } catch (error) {
      console.error('Failed to load HubSpot config:', error)
    } finally {
      setIsLoadingConfig(false)
    }
  }

  const loadHubSpotSequences = async () => {
    try {
      setIsLoadingSequences(true)
      // Fetch ALL sequences with NO step counts (backend paginates to get ALL)
      const response = await api.settings.getHubSpotSequences()
      
      if (response.data && typeof response.data === 'object') {
        const data = response.data as any
        setAvailableSequences(data.sequences || [])
        console.log(`Loaded ${data.total_count || 0} HubSpot sequences`)
      }
    } catch (error) {
      console.error('Failed to load HubSpot sequences:', error)
    } finally {
      setIsLoadingSequences(false)
    }
  }

  const saveHubSpotConfig = async () => {
    if (!senderEmail || !selectedSequence || !signalId) return
    
    try {
      setIsSavingConfig(true)
      const response = await api.settings.updateSignalHubSpot(signalId, {
        sender_email: senderEmail,
        selected_sequence_id: selectedSequence.id,
        selected_sequence_name: selectedSequence.name
      })
      
      if (response.data && typeof response.data === 'object') {
        setHubspotConfig(response.data as HubSpotConfig)
      }
    } catch (error) {
      console.error('Failed to save HubSpot config:', error)
    } finally {
      setIsSavingConfig(false)
    }
  }

  const handleSequenceSelect = async (sequence: HubSpotSequence) => {
    setSelectedSequence(sequence)
    setShowSequenceSearch(false)
    
    // Fetch step counts for the selected sequence if not already available
    if (sequence.total_step_count === 0) {
      try {
        const response = await api.settings.getHubSpotSequenceDetails(sequence.id)
        if (response.data && typeof response.data === 'object') {
          const data = response.data as any
          // Update the sequence in the list with step counts
          setAvailableSequences(prev => 
            prev.map(seq => 
              seq.id === sequence.id 
                ? { ...seq, email_step_count: data.email_step_count || 0, total_step_count: data.total_step_count || 0 }
                : seq
            )
          )
          // Update selected sequence with step counts
          setSelectedSequence({
            ...sequence,
            email_step_count: data.email_step_count || 0,
            total_step_count: data.total_step_count || 0
          })
        }
      } catch (error) {
        console.error('Failed to fetch sequence details:', error)
      }
    }
  }

  const checkCompanyImportStatus = async () => {
    if (!signalId) return
    
    try {
      const response = await api.settings.getCompanyImportStatus(signalId)
      if (response.data && typeof response.data === 'object') {
        const data = response.data as any
        setCompanyImportStatus({
          imported: data.imported || false,
          hubspot_company_id: data.hubspot_company_id || null,
          imported_at: data.imported_at || null
        })
      }
    } catch (error) {
      console.error('Failed to check company import status:', error)
    }
  }

  const checkContactImportStatus = async () => {
    if (!signalId) return
    
    try {
      const response = await api.settings.getContactsImportStatus(signalId)
      if (response.data && typeof response.data === 'object') {
        const data = response.data as any
        setContactImportStatus({
          imported: data.imported || false,
          import_id: data.import_id || null,
          contacts_count: data.contacts_count || 0,
          imported_at: data.imported_at || null
        })
      }
    } catch (error) {
      console.error('Failed to check contact import status:', error)
    }
  }

  const handleCompanyImport = () => {
    setShowCompanyImportPopup(true)
  }

  const handleCompanyImportSuccess = () => {
    // Refresh import status after successful import
    checkCompanyImportStatus()
  }

  const handleContactImport = () => {
    setShowContactImportPopup(true)
  }

  const handleContactImportSuccess = () => {
    // Refresh import status after successful import
    checkContactImportStatus()
  }

  const handleSequenceEnrollment = async () => {
    if (!signalId || !selectedSequence || !senderEmail || !contactImportStatus.imported) return

    try {
      setIsEnrollingInSequence(true)

      // For now, we'll assume all imported contacts should be enrolled
      // In a more sophisticated implementation, we might let users select specific contacts
      const response = await api.settings.enrollContactsInSequence(signalId, {
        sequence_id: selectedSequence.id,
        sender_email: senderEmail,
        contact_ids: [] // Empty array means enroll all contacts from the import
      })

      if (response.data) {
        console.log('Enrollment successful:', response.data)
        // Could show success notification here
      }
    } catch (error) {
      console.error('Failed to enroll contacts in sequence:', error)
      // Could show error notification here
    } finally {
      setIsEnrollingInSequence(false)
    }
  }

  const handleEmailSync = async () => {
    if (!signalId) return

    try {
      setIsSyncingEmails(true)

      const response = await api.emails.syncToHubSpot(signalId)

      if (response.data && typeof response.data === 'object') {
        const data = response.data as any
        if (data.success) {
          setEmailSyncStatus({
            synced: true,
            contacts_synced: data.contacts_synced || 0,
            contacts_created: data.contacts_created || 0,
            contacts_updated: data.contacts_updated || 0,
            synced_at: new Date().toISOString()
          })
          console.log('Email sync successful:', data)
        }
      }
    } catch (error) {
      console.error('Failed to sync emails to HubSpot:', error)
    } finally {
      setIsSyncingEmails(false)
    }
  }

  const isFullyConfigured = hubspotConfig.is_connected && senderEmail && selectedSequence
  const canSaveConfig = senderEmail && selectedSequence && !isSavingConfig

  if (isLoadingConfig || !signalId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <div className="text-xs text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">HubSpot</h3>
          <div className="flex items-center gap-1">
            {hubspotConfig.is_connected ? (
              <Wifi className="w-3 h-3 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-500" />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-6 space-y-3 overflow-y-auto">
        {/* HubSpot Connection Status */}
        {!hubspotConfig.is_connected ? (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-center">
            <div className="text-sm text-red-900 mb-2">Not Connected</div>
            <button
              onClick={() => window.open('/settings', '_blank')}
              className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
            >
              Connect HubSpot
            </button>
          </div>
        ) : (
          <>
            {/* Token Expiration Warning */}
            {hubspotConfig.connection_status === 'token_expired' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 text-sm">⚠</span>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-yellow-900 mb-1">
                      Access Token Expired
                    </div>
                    <div className="text-xs text-yellow-800 mb-2">
                      Your HubSpot connection token has expired. Please reconnect to continue sending.
                    </div>
                    <button
                      onClick={() => window.open('/settings', '_blank')}
                      className="px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                    >
                      Reconnect HubSpot
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sender Email */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Sender Email
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="Enter sender email"
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
              />
            </div>

            {/* HubSpot Sequence Selection */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                HubSpot Sequence
              </label>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowSequenceSearch(true)
                  }}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-left bg-white hover:bg-gray-50"
                >
                  {selectedSequence ? selectedSequence.name : 'Select sequence...'}
                </button>
                
                {/* Sequence Search Popup */}
                {showSequenceSearch && (
                  <div 
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 max-h-48 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="w-3 h-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={sequenceSearch}
                          onChange={(e) => setSequenceSearch(e.target.value)}
                          placeholder="Search sequences..."
                          className="w-full pl-7 pr-7 py-1 text-xs border border-gray-300 rounded"
                          autoFocus
                        />
                        <button
                          onClick={() => setShowSequenceSearch(false)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      {isLoadingSequences ? (
                        <div className="p-3 text-center">
                          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                          <div className="text-xs text-gray-600">Loading...</div>
                        </div>
                      ) : filteredSequences.length === 0 ? (
                        <div className="p-3 text-xs text-gray-500 text-center">No sequences found</div>
                      ) : (
                        filteredSequences.map(sequence => (
                          <button
                            key={sequence.id}
                            onClick={() => handleSequenceSelect(sequence)}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium truncate">{sequence.name}</div>
                            {sequence.total_step_count > 0 && (
                              <div className="text-gray-500 text-xs">
                                {sequence.total_step_count} steps • {sequence.email_step_count} emails
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Show sequence details */}
              {selectedSequence && selectedSequence.total_step_count > 0 && (
                <div className="mt-1 text-xs text-gray-500">
                  {selectedSequence.total_step_count} steps • {selectedSequence.email_step_count} emails
                </div>
              )}
            </div>

            {/* Save Configuration */}
            <button
              onClick={saveHubSpotConfig}
              disabled={!canSaveConfig}
              className={`w-full px-3 py-1.5 rounded text-xs font-medium ${
                canSaveConfig
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSavingConfig ? 'Saving...' : 'Save Config'}
            </button>

            {/* Action Steps */}
            {isFullyConfigured && (
              <div className="pt-2 border-t border-gray-200">
                <div className="flex gap-1">
                  <button
                    onClick={handleCompanyImport}
                    disabled={companyImportStatus.imported}
                    className={`flex-1 px-2 py-1 rounded text-xs font-medium flex items-center justify-center gap-1 ${
                      companyImportStatus.imported
                        ? 'bg-green-500 text-white'
                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                    }`}
                    title={companyImportStatus.imported ? "Company Imported" : "Import Company"}
                  >
                    {companyImportStatus.imported ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <Building className="w-3 h-3" />
                    )}
                    <span className="hidden sm:inline">1</span>
                  </button>
                  <button
                    onClick={handleContactImport}
                    disabled={!companyImportStatus.imported || contactImportStatus.imported}
                    className={`flex-1 px-2 py-1 rounded text-xs font-medium flex items-center justify-center gap-1 ${
                      contactImportStatus.imported
                        ? 'bg-green-500 text-white'
                        : companyImportStatus.imported
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    title={
                      contactImportStatus.imported 
                        ? `${contactImportStatus.contacts_count} Contacts Imported`
                        : companyImportStatus.imported
                        ? "Import Contacts"
                        : "Import Company First"
                    }
                  >
                    {contactImportStatus.imported ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <Users className="w-3 h-3" />
                    )}
                    <span className="hidden sm:inline">2</span>
                  </button>
                  <button
                    onClick={handleSequenceEnrollment}
                    disabled={!contactImportStatus.imported || isEnrollingInSequence}
                    className={`flex-1 px-2 py-1 rounded text-xs font-medium flex items-center justify-center gap-1 ${
                      contactImportStatus.imported && !isEnrollingInSequence
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    title={
                      contactImportStatus.imported
                        ? isEnrollingInSequence
                          ? 'Enrolling in Sequence...'
                          : 'Enroll in Sequence'
                        : 'Import Contacts First'
                    }
                  >
                    {isEnrollingInSequence ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ExternalLink className="w-3 h-3" />
                    )}
                    <span className="hidden sm:inline">3</span>
                  </button>
                </div>
              </div>
            )}

            {/* Email Sync Section */}
            {isFullyConfigured && (
              <div className="pt-3 border-t border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-2">
                  Sync Generated Emails
                </div>

                {emailSyncStatus.synced ? (
                  <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      <span className="text-xs font-medium text-green-900">
                        {emailSyncStatus.contacts_synced} contacts synced to HubSpot
                      </span>
                    </div>
                    <div className="text-xs text-green-700">
                      {emailSyncStatus.contacts_created} created, {emailSyncStatus.contacts_updated} updated
                    </div>
                  </div>
                ) : null}

                <button
                  onClick={handleEmailSync}
                  disabled={isSyncingEmails}
                  className={`w-full px-3 py-2 rounded text-xs font-medium flex items-center justify-center gap-2 ${
                    isSyncingEmails
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : emailSyncStatus.synced
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                  title="Sync generated emails to HubSpot contacts"
                >
                  {isSyncingEmails ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Syncing Emails...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      {emailSyncStatus.synced ? 'Sync Again' : 'Sync Emails to HubSpot'}
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Company Import Popup */}
      {showCompanyImportPopup && signalId && (
        <CompanyImportPopup
          isOpen={showCompanyImportPopup}
          onClose={() => setShowCompanyImportPopup(false)}
          signalId={signalId}
          onImportSuccess={handleCompanyImportSuccess}
        />
      )}

      {/* Contact Import Popup */}
      {showContactImportPopup && signalId && (
        <ContactImportPopup
          isOpen={showContactImportPopup}
          onClose={() => setShowContactImportPopup(false)}
          signalId={signalId}
          onImportSuccess={handleContactImportSuccess}
        />
      )}
    </div>
  )
}