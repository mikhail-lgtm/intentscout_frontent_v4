import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Search, Loader2, CheckCircle, Users, Plus, ExternalLink, Trash2, Edit, Mail, MailCheck, Linkedin, UserCheck, MoreHorizontal, AlertCircle, Lightbulb, X, RotateCcw } from 'lucide-react'
import { api } from '../../lib/apiClient'
import { useDecisionMakers } from '../../hooks/useDecisionMakers'
import { useEmailGeneration } from '../../hooks/useEmailGeneration'
import { useLinkedInScraping } from '../../hooks/useLinkedInScraping'
import { useEmailFinder } from '../../hooks/useEmailFinder'
import { useContacts } from '../../hooks/useContacts'
import { DecisionMakerPopup } from '../decision-makers/DecisionMakerPopup'
import { EmailGenerationPopup } from './EmailGenerationPopup'
import { IndividualEmailPopup } from './IndividualEmailPopup'
import { LinkedInScrapingPopup } from './LinkedInScrapingPopup'
import { EmailFinderPopup } from './EmailFinderPopup'
import { AddContactPopup } from './AddContactPopup'
import { ContactsListSkeleton } from './ContactSkeleton'
import { ConfirmationModal } from '../ui/ConfirmationModal'
import { ValuePropGenerationPopup } from '../outreach/ValuePropGenerationPopup'
import { HubSpotSending } from '../outreach/HubSpotSending'
import { SegmentControl, SegmentTab } from './SegmentControl'

interface ContactsComponentProps {
  signalId: string
  companyName: string
}

const LinkedInIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

export const ContactsComponent: React.FC<ContactsComponentProps> = ({
  signalId,
  companyName
}) => {
  // Read auto workspace feature flag from settings
  const autoFeatureEnabled = useMemo(() => {
    try {
      const raw = localStorage.getItem('intentscout_features')
      if (raw) {
        const settings = JSON.parse(raw)
        return !!settings.autoWorkspace
      }
    } catch {}
    return false
  }, [])

  const [workspaceMode, setWorkspaceMode] = useState<'auto' | 'manual'>(autoFeatureEnabled ? 'auto' : 'manual')
  const [activeTab, setActiveTab] = useState('contacts')
  const [showAddContactPopup, setShowAddContactPopup] = useState(false)
  const [showIndividualEmailPopup, setShowIndividualEmailPopup] = useState(false)
  const [selectedContactForEmail, setSelectedContactForEmail] = useState<any>(null)
  const [individualEmailLoading, setIndividualEmailLoading] = useState<Set<string>>(new Set())
  const [individualLinkedInLoading, setIndividualLinkedInLoading] = useState<Set<string>>(new Set())
  const [existingEmails, setExistingEmails] = useState<{[contactId: string]: boolean}>({})
  const [existingLinkedInProfiles, setExistingLinkedInProfiles] = useState<{[contactId: string]: boolean}>({})
  const [editingContact, setEditingContact] = useState<any>(null)
  const [openMenuContactId, setOpenMenuContactId] = useState<string | null>(null)
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    contactId: string
    contactName: string
  }>({
    isOpen: false,
    contactId: '',
    contactName: ''
  })

  // Value prop state
  const [valueProp, setValueProp] = useState('')
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [showValuePropPopup, setShowValuePropPopup] = useState(false)
  const valuePropRef = useRef<HTMLTextAreaElement>(null)

  // Value prop popup (AI generation - stays as modal)

  
  // Use decision makers hook to track search status
  const {
    searchStatus,
    isLoading: dmLoading,
    isSearchInProgress,
    hasResults,
    hasFailed,
    startSearch,
    refreshStatus
  } = useDecisionMakers(signalId)

  // Auto-trigger DM search ref to prevent double-triggering
  const autoSearchTriggeredRef = useRef<string | null>(null)

  // Auto-import state for pipeline step 2
  const autoImportTriggeredRef = useRef<string | null>(null)
  const [autoImportStatus, setAutoImportStatus] = useState<'idle' | 'importing' | 'completed' | 'failed'>('idle')
  const [autoImportCount, setAutoImportCount] = useState(0)
  
  // Use email generation hook to track generation status
  const { isGenerationInProgress, hasResults: hasEmailResults, hasFailed: hasEmailFailed } = useEmailGeneration(signalId)
  
  // Use LinkedIn scraping hook to track scraping status
  const { 
    scrapingStatus: linkedInStatus, 
    isScrapingInProgress, 
    hasResults: hasLinkedInResults, 
    hasFailed: hasLinkedInFailed,
    refreshStatus: refreshLinkedInStatus
  } = useLinkedInScraping(signalId)

  // Use email finder hook to track email finding status
  const { 
    searchStatus: emailFinderStatus, 
    isSearchInProgress: isEmailFinderInProgress, 
    hasResults: hasEmailFinderResults, 
    hasFailed: hasEmailFinderFailed,
    refreshStatus: refreshEmailFinderStatus
  } = useEmailFinder(signalId)
  
  // Use contacts hook to manage contacts
  const { contacts, isLoading: contactsLoading, error: contactsError, refetch, deleteContact } = useContacts(signalId)

  // Determine if we have a valid signal to work with
  const hasSignal = signalId && signalId !== ''

  // Notification state for background task completions
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  // Track previous search status to detect completion
  const prevSearchStatusRef = React.useRef<string | null>(null)

  // Watch for DM search completion and show notification
  useEffect(() => {
    const currentStatus = searchStatus?.status
    const prevStatus = prevSearchStatusRef.current

    // Detect transition from searching to completed/failed
    if (prevStatus === 'searching' || prevStatus === 'pending') {
      if (currentStatus === 'completed' && activeTab !== 'find-people') {
        const count = searchStatus?.decision_makers?.length || 0
        setNotification({
          type: count > 0 ? 'success' : 'info',
          message: count > 0
            ? `Found ${count} decision maker${count > 1 ? 's' : ''} at ${companyName}`
            : `No decision makers found at ${companyName}`
        })
        // Auto-dismiss after 5 seconds
        setTimeout(() => setNotification(null), 5000)
      } else if (currentStatus === 'failed' && activeTab !== 'find-people') {
        setNotification({
          type: 'error',
          message: 'Decision maker search failed. You can try again.'
        })
        setTimeout(() => setNotification(null), 5000)
      }
    }

    prevSearchStatusRef.current = currentStatus || null
  }, [searchStatus?.status, searchStatus?.decision_makers?.length, companyName, activeTab])

  // Default guidance for auto DM search
  const AUTO_DM_GUIDANCE = 'director, vp of sales, program manager, CTO, CIO, Director/VP CRM, Commercial Excellence, program lead, Head of Business Applications, VP Customer Success, CRO, CCO, CRM owner. IGNORE PURELY TECHNICAL ROLES SUCH AS ARCHITECT/DEVELOPER'

  // Auto-trigger DM search when a signal is selected and no search exists (auto mode)
  useEffect(() => {
    if (
      workspaceMode === 'auto' &&
      hasSignal &&
      !dmLoading &&
      searchStatus === null &&
      !hasFailed &&
      autoSearchTriggeredRef.current !== signalId
    ) {
      autoSearchTriggeredRef.current = signalId
      console.log('Auto-DM: triggering search for signal', signalId)
      startSearch(AUTO_DM_GUIDANCE)
    }
  }, [workspaceMode, hasSignal, dmLoading, searchStatus, hasFailed, signalId, startSearch])

  // Reset auto-search and auto-import refs when signal changes
  useEffect(() => {
    autoSearchTriggeredRef.current = null
    autoImportTriggeredRef.current = null
    setAutoImportStatus('idle')
    setAutoImportCount(0)
  }, [signalId])

  // Auto-import: when search completes with DMs, auto-import all as contacts (auto mode)
  useEffect(() => {
    if (
      workspaceMode !== 'auto' ||
      !hasSignal ||
      !searchStatus ||
      searchStatus.status !== 'completed' ||
      !searchStatus.decision_makers ||
      searchStatus.decision_makers.length === 0 ||
      autoImportTriggeredRef.current === signalId
    ) return

    // Check if contacts already exist (signal was previously processed)
    if (contacts.length > 0) {
      setAutoImportStatus('completed')
      setAutoImportCount(contacts.length)
      autoImportTriggeredRef.current = signalId
      return
    }

    autoImportTriggeredRef.current = signalId
    setAutoImportStatus('importing')

    const doImport = async () => {
      try {
        const dms = searchStatus.decision_makers
        const response = await api.contacts.bulkImportDecisionMakers({
          signal_id: signalId,
          decision_makers: dms.map(dm => ({
            signal_id: signalId,
            decision_maker_id: dm.id,
            first_name: dm.first_name,
            last_name: dm.last_name,
            job_title: dm.job_title,
            linkedin_url: dm.linkedin_url,
            why_reach_out: dm.why_reach_out
          }))
        })

        if (response.error) {
          throw new Error(response.error)
        }

        const importedCount = (response.data as any)?.imported_count || dms.length
        setAutoImportCount(importedCount)
        setAutoImportStatus('completed')
        refetch()
      } catch (err) {
        console.error('Auto-import failed:', err)
        setAutoImportStatus('failed')
      }
    }

    doImport()
  }, [workspaceMode, hasSignal, searchStatus, signalId, contacts.length])

  // Load value prop when signal changes
  useEffect(() => {
    if (hasSignal) {
      loadValueProp()
    } else {
      setValueProp('')
    }
  }, [signalId, hasSignal])

  const loadValueProp = async () => {
    if (!signalId) return
    try {
      setIsLoadingNotes(true)
      const response = await api.signalNotes.get(signalId)
      if (response.data && typeof response.data === 'object') {
        const data = response.data as any
        setValueProp(data.value_prop || '')
      }
    } catch (err) {
      console.error('Failed to load signal notes:', err)
    } finally {
      setIsLoadingNotes(false)
    }
  }

  const saveValueProp = async (text?: string) => {
    if (!signalId) return
    const valueToSave = text !== undefined ? text : valueProp
    try {
      setIsSavingNotes(true)
      await api.signalNotes.save({
        signal_id: signalId,
        value_prop: valueToSave
      })
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save value prop:', err)
    } finally {
      setIsSavingNotes(false)
    }
  }

  const handleValuePropGenerated = (generated: string) => {
    setValueProp(generated)
    saveValueProp(generated)
  }

  // Check for existing emails and LinkedIn profiles when contacts change
  useEffect(() => {
    if (hasSignal && contacts.length > 0) {
      checkExistingEmails()
      checkExistingLinkedInProfiles()
    }
  }, [hasSignal, contacts, signalId])
  
  // REMOVED: Wasteful 5-second polling intervals!
  // The individual hooks already handle their own polling when needed

  const checkExistingEmails = async () => {
    try {
      const response = await api.emails.getBySignal(signalId)
      if (response.data && typeof response.data === 'object') {
        const data = response.data as any
        if (data.generated_emails && Array.isArray(data.generated_emails)) {
          const emailsByContact: {[contactId: string]: boolean} = {}
          data.generated_emails.forEach((email: any) => {
            emailsByContact[email.contact_id] = true
          })
          setExistingEmails(emailsByContact)
        }
      }
    } catch (err) {
      console.error('Failed to check existing emails:', err)
    }
  }

  const checkExistingLinkedInProfiles = useCallback(() => {
    // OPTIMIZED: Use existing LinkedIn scraping status instead of API calls
    const profilesByContact: {[contactId: string]: boolean} = {}
    
    if (linkedInStatus?.scraped_profiles) {
      linkedInStatus.scraped_profiles.forEach(profile => {
        if (profile.status === 'scraped') {
          profilesByContact[profile.contact_id] = true
        }
      })
    }
    
    setExistingLinkedInProfiles(profilesByContact)
  }, [linkedInStatus])

  // Update LinkedIn profiles when status changes
  useEffect(() => {
    if (linkedInStatus) {
      checkExistingLinkedInProfiles()
    }
  }, [linkedInStatus, checkExistingLinkedInProfiles])

  // Individual email handlers
  const handleIndividualEmail = (contact: any) => {
    setSelectedContactForEmail(contact)
    setShowIndividualEmailPopup(true)
  }

  // Individual LinkedIn scraping handlers
  const handleIndividualLinkedInScraping = async (contact: any) => {
    if (!contact.linkedin_contact || !contact.linkedin_contact.includes('linkedin.com/in/')) {
      return
    }

    
    setIndividualLinkedInLoading(prev => new Set(prev).add(contact.id))

    try {
      const response = await api.linkedInScraping.scrape({
        contacts: [contact],
        signal_id: signalId
      })

      if (response.error) {
        throw new Error(response.error)
      }

      // Refresh LinkedIn profiles status
      setTimeout(() => {
        checkExistingLinkedInProfiles()
      }, 2000) // Give it some time to process

    } catch (err: any) {
      console.error('Failed to scrape LinkedIn profile:', err)
    } finally {
      setIndividualLinkedInLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(contact.id)
        return newSet
      })
    }
  }

  // Build segment control tabs with status indicators (manual mode)
  const segmentTabs: SegmentTab[] = useMemo(() => [
    {
      id: 'contacts',
      label: 'Contacts',
      badge: contacts.length > 0 ? contacts.length : undefined,
    },
    {
      id: 'find-people',
      label: 'DM Finder',
      status: isSearchInProgress ? 'in-progress' : hasResults ? 'completed' : hasFailed ? 'failed' : 'idle',
    },
    {
      id: 'find-emails',
      label: 'Find Emails',
      status: isEmailFinderInProgress ? 'in-progress' : hasEmailFinderResults ? 'completed' : hasEmailFinderFailed ? 'failed' : 'idle',
    },
    {
      id: 'enrich-linkedin',
      label: 'Enrich LinkedIn',
      status: isScrapingInProgress ? 'in-progress' : hasLinkedInResults ? 'completed' : hasLinkedInFailed ? 'failed' : 'idle',
    },
    {
      id: 'write-emails',
      label: 'Emails',
      status: isGenerationInProgress ? 'in-progress' : hasEmailResults ? 'completed' : hasEmailFailed ? 'failed' : valueProp.trim() ? 'completed' : 'idle',
    },
    {
      id: 'hubspot',
      label: 'HubSpot',
    },
    {
      id: 'add-contact',
      label: '+ Add',
    },
  ], [contacts.length, isSearchInProgress, hasResults, hasFailed, isEmailFinderInProgress, hasEmailFinderResults, hasEmailFinderFailed, isScrapingInProgress, hasLinkedInResults, hasLinkedInFailed, isGenerationInProgress, hasEmailResults, hasEmailFailed, valueProp])

  const handleDeleteContact = (contactId: string, contactName: string) => {
    setDeleteConfirmation({
      isOpen: true,
      contactId,
      contactName
    })
  }

  const executeDeleteContact = async () => {
    if (deleteConfirmation.contactId) {
      await deleteContact(deleteConfirmation.contactId)
    }
  }

  const handleEditContact = (contact: any) => {
    setEditingContact(contact)
    setShowAddContactPopup(true)
  }

  const handleCloseEditPopup = () => {
    setEditingContact(null)
    setShowAddContactPopup(false)
  }

  const toggleContactMenu = (contactId: string) => {
    setOpenMenuContactId(openMenuContactId === contactId ? null : contactId)
  }

  const closeContactMenu = () => {
    setOpenMenuContactId(null)
  }

  const toggleHeaderMenu = () => {
    setShowHeaderMenu(!showHeaderMenu)
  }

  const closeHeaderMenu = () => {
    setShowHeaderMenu(false)
  }

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      closeContactMenu()
      closeHeaderMenu()
    }
    
    if (openMenuContactId || showHeaderMenu) {
      document.addEventListener('click', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuContactId, showHeaderMenu])


  return (
    <div className="h-full flex flex-col">
      {/* Notification Banner */}
      {notification && (
        <div
          className={`mb-3 p-3 rounded-lg flex items-center justify-between text-sm animate-in slide-in-from-top duration-300 ${
            notification.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
            notification.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
            'bg-blue-50 border border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle className="w-4 h-4" />}
            {notification.type === 'error' && <AlertCircle className="w-4 h-4" />}
            {notification.type === 'info' && <Users className="w-4 h-4" />}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <span className="sr-only">Dismiss</span>
            x
          </button>
        </div>
      )}

      {/* Header with title + Auto/Manual toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900">Workspace</h3>
          {hasSignal && !contactsLoading && (
            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{contacts.length}</span>
          )}
        </div>
        {hasSignal && autoFeatureEnabled && (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider leading-none">beta</span>
            <div className="flex items-center bg-gray-100 rounded-md p-0.5">
              <button
                onClick={() => setWorkspaceMode('auto')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                  workspaceMode === 'auto'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => setWorkspaceMode('manual')}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                  workspaceMode === 'manual'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Manual
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AUTO MODE: Pipeline + Contacts */}
      {workspaceMode === 'auto' && hasSignal && (
        <div className="flex-1 overflow-y-auto">
          {/* Progress Pipeline */}
          <div className="mb-4 px-2">
            <div className="flex items-center">
              {/* Step 1: Find People */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                  isSearchInProgress
                    ? 'border-blue-400 bg-blue-50'
                    : hasResults
                    ? 'border-green-500 bg-green-500'
                    : hasFailed
                    ? 'border-red-500 bg-red-500'
                    : 'border-gray-300 bg-white'
                }`}>
                  {isSearchInProgress ? (
                    <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  ) : hasResults ? (
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  ) : hasFailed ? (
                    <X className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <span className="text-xs font-medium text-gray-400">1</span>
                  )}
                </div>
                <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${
                  isSearchInProgress ? 'text-blue-600' : hasResults ? 'text-green-600' : hasFailed ? 'text-red-600' : 'text-gray-400'
                }`}>
                  {isSearchInProgress
                    ? 'Finding...'
                    : hasResults
                    ? `Found ${searchStatus?.decision_makers?.length || 0}`
                    : hasFailed
                    ? 'Failed'
                    : 'Find People'}
                </span>
                {hasFailed && (
                  <button
                    onClick={() => { autoSearchTriggeredRef.current = null; startSearch() }}
                    className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5 mt-0.5"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Retry
                  </button>
                )}
              </div>

              {/* Connecting line */}
              <div className={`flex-1 h-0.5 mx-2 mt-[-16px] transition-colors ${
                hasResults || autoImportStatus !== 'idle' ? 'bg-green-400' : isSearchInProgress ? 'bg-blue-200' : 'bg-gray-200'
              }`} />

              {/* Step 2: Import Contacts */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                  autoImportStatus === 'importing'
                    ? 'border-blue-400 bg-blue-50'
                    : autoImportStatus === 'completed'
                    ? 'border-green-500 bg-green-500'
                    : autoImportStatus === 'failed'
                    ? 'border-red-500 bg-red-500'
                    : 'border-gray-300 bg-white'
                }`}>
                  {autoImportStatus === 'importing' ? (
                    <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  ) : autoImportStatus === 'completed' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  ) : autoImportStatus === 'failed' ? (
                    <X className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <span className="text-xs font-medium text-gray-400">2</span>
                  )}
                </div>
                <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${
                  autoImportStatus === 'importing' ? 'text-blue-600' : autoImportStatus === 'completed' ? 'text-green-600' : autoImportStatus === 'failed' ? 'text-red-600' : 'text-gray-400'
                }`}>
                  {autoImportStatus === 'importing'
                    ? 'Importing...'
                    : autoImportStatus === 'completed'
                    ? `Imported ${autoImportCount}`
                    : autoImportStatus === 'failed'
                    ? 'Failed'
                    : 'Import Contacts'}
                </span>
                {autoImportStatus === 'failed' && (
                  <button
                    onClick={() => { autoImportTriggeredRef.current = null; setAutoImportStatus('idle') }}
                    className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5 mt-0.5"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Contacts List (auto mode) */}
          {contactsLoading ? (
            <ContactsListSkeleton count={4} />
          ) : contactsError ? (
            <div className="text-center text-red-600 p-4">
              <p className="text-sm">{contactsError}</p>
            </div>
          ) : contacts.length === 0 && !isSearchInProgress && autoImportStatus !== 'importing' ? (
            <div className="text-center text-gray-400 flex items-center justify-center h-32">
              <div>
                <div className="text-sm">No contacts yet</div>
                <div className="text-xs mt-1">Auto-search will find decision makers</div>
              </div>
            </div>
          ) : contacts.length === 0 ? (
            <ContactsListSkeleton count={3} />
          ) : (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div key={contact.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors animate-in fade-in duration-300">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {contact.first_name} {contact.last_name}
                        </h4>
                        {contact.source === 'decision_maker_finder' && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">DM</span>
                        )}
                      </div>
                      <p className="text-gray-600 text-xs mt-0.5">{contact.job_title}</p>
                      {contact.email_address && (
                        <p className="text-gray-500 text-xs mt-1">{contact.email_address}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {contact.linkedin_contact && (
                        <a
                          href={contact.linkedin_contact}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded px-1 py-0.5 transition-colors group"
                          title="View LinkedIn Profile"
                        >
                          <LinkedInIcon className="w-3 h-3" />
                          <ExternalLink className="w-2 h-2 opacity-70 group-hover:opacity-100 transition-opacity" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MANUAL MODE: Segment Control + Tab Content */}
      {workspaceMode === 'manual' && hasSignal && (
        <>
          <div className="mb-3">
            <SegmentControl
              tabs={segmentTabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          <div className="flex-1 overflow-y-auto" key={activeTab}>
            {activeTab === 'contacts' && (
              <>
                {/* Decision Makers Search Status Banner */}
                {isSearchInProgress && (
                  <div className="mb-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-orange-600 animate-spin flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-orange-900">Finding Decision Makers</h4>
                          <span className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
                            {searchStatus?.status === 'pending' ? 'Initializing...' :
                             searchStatus?.status === 'searching' ? 'AI Analyzing...' : 'Processing...'}
                          </span>
                        </div>
                        <p className="text-sm text-orange-800 mt-1">
                          AI is analyzing company data to identify decision makers...
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Decision Makers Completed Status Banner */}
                {hasResults && !isSearchInProgress && searchStatus?.decision_makers && searchStatus.decision_makers.length > 0 && (
                  <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-green-900">Decision Makers Found</h4>
                          <button
                            onClick={() => setActiveTab('find-people')}
                            className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full hover:bg-green-200 transition-colors"
                          >
                            {searchStatus.decision_makers.length} found - View
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Decision Makers Failed Status Banner */}
                {hasFailed && (
                  <div className="mb-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-red-900">DM Search Failed</h4>
                          <button
                            onClick={() => setActiveTab('find-people')}
                            className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded-full hover:bg-red-200 transition-colors"
                          >
                            Try Again
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* LinkedIn Scraping Status Banner */}
                {isScrapingInProgress && (
                  <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-blue-900">Scraping LinkedIn Profiles</h4>
                          <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                            {linkedInStatus?.contacts_processed || 0} / {linkedInStatus?.total_contacts || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contacts List */}
                {contactsLoading ? (
                  <ContactsListSkeleton count={4} />
                ) : !hasSignal ? (
                  <div className="text-center text-gray-400 flex items-center justify-center h-32">
                    <div>
                      <div className="text-sm">Select a signal to view contacts</div>
                    </div>
                  </div>
                ) : contactsError ? (
                  <div className="text-center text-red-600 p-4">
                    <p className="text-sm">{contactsError}</p>
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="text-center text-gray-400 flex items-center justify-center h-32">
                    <div>
                      <div className="text-sm">No contacts yet</div>
                      <div className="text-xs mt-1">Add a contact or find decision makers</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 text-sm">
                                {contact.first_name} {contact.last_name}
                              </h4>

                              {/* Status Icons */}
                              <div className="flex items-center gap-1">
                                {existingEmails[contact.id] ? (
                                  <div className="relative group">
                                    <MailCheck className="w-3 h-3 text-green-500" />
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                      Emails Generated
                                    </div>
                                  </div>
                                ) : (isGenerationInProgress || individualEmailLoading.has(contact.id)) ? (
                                  <div className="relative group">
                                    <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                      Generating Emails...
                                    </div>
                                  </div>
                                ) : null}

                                {contact.linkedin_contact && contact.linkedin_contact.includes('linkedin.com/in/') && (
                                  <>
                                    {existingLinkedInProfiles[contact.id] ? (
                                      <div className="relative group">
                                        <UserCheck className="w-3 h-3 text-green-500" />
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                          LinkedIn Profile Scraped
                                        </div>
                                      </div>
                                    ) : (isScrapingInProgress || individualLinkedInLoading.has(contact.id)) ? (
                                      <div className="relative group">
                                        <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                          Scraping LinkedIn...
                                        </div>
                                      </div>
                                    ) : null}
                                  </>
                                )}
                              </div>
                            </div>
                            <p className="text-gray-600 text-xs mt-0.5">{contact.job_title}</p>
                            {contact.email_address && (
                              <p className="text-gray-500 text-xs mt-1">{contact.email_address}</p>
                            )}
                            {contact.notes && (
                              <p className="text-gray-500 text-xs mt-1 line-clamp-2">{contact.notes}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 ml-3">
                            {contact.linkedin_contact && (
                              <a
                                href={contact.linkedin_contact}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded px-1 py-0.5 transition-colors group"
                                title="View LinkedIn Profile"
                              >
                                <LinkedInIcon className="w-3 h-3" />
                                <ExternalLink className="w-2 h-2 opacity-70 group-hover:opacity-100 transition-opacity" />
                              </a>
                            )}

                            {contact.source === 'decision_maker_finder' && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                DM
                              </span>
                            )}

                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleContactMenu(contact.id)
                                }}
                                className="flex items-center justify-center w-7 h-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Contact actions"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {openMenuContactId === contact.id && (
                              <div
                                className="absolute right-0 top-8 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => {
                                    handleIndividualEmail(contact)
                                    closeContactMenu()
                                  }}
                                  disabled={individualEmailLoading.has(contact.id)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                                >
                                  {individualEmailLoading.has(contact.id) ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                  ) : existingEmails[contact.id] ? (
                                    <MailCheck className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Mail className="w-4 h-4 text-gray-400" />
                                  )}
                                  <span className={existingEmails[contact.id] ? 'text-green-700' : 'text-gray-700'}>
                                    {existingEmails[contact.id] ? 'View Generated Email' : 'Generate Email'}
                                  </span>
                                </button>

                                {contact.linkedin_contact && contact.linkedin_contact.includes('linkedin.com/in/') && (
                                  <button
                                    onClick={() => {
                                      handleIndividualLinkedInScraping(contact)
                                      closeContactMenu()
                                    }}
                                    disabled={individualLinkedInLoading.has(contact.id)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                                  >
                                    {individualLinkedInLoading.has(contact.id) ? (
                                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                    ) : existingLinkedInProfiles[contact.id] ? (
                                      <UserCheck className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <Linkedin className="w-4 h-4 text-blue-600" />
                                    )}
                                    <span className={existingLinkedInProfiles[contact.id] ? 'text-green-700' : 'text-gray-700'}>
                                      {existingLinkedInProfiles[contact.id] ? 'LinkedIn Profile Scraped' : 'Scrape LinkedIn Profile'}
                                    </span>
                                  </button>
                                )}

                                <div className="border-t border-gray-100 my-1"></div>

                                <button
                                  onClick={() => {
                                    handleEditContact(contact)
                                    closeContactMenu()
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-3"
                                >
                                  <Edit className="w-4 h-4 text-orange-500" />
                                  <span className="text-gray-700">Edit Contact</span>
                                </button>

                                <button
                                  onClick={() => {
                                    handleDeleteContact(contact.id, `${contact.first_name} ${contact.last_name}`)
                                    closeContactMenu()
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 transition-colors flex items-center gap-3"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                  <span className="text-red-700">Delete Contact</span>
                                </button>
                              </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'add-contact' && (
              <AddContactPopup
                isOpen={true}
                onClose={() => {
                  setActiveTab('contacts')
                }}
                onContactAdded={() => {
                  refetch()
                  setActiveTab('contacts')
                }}
                signalId={signalId}
                companyName={companyName}
                mode="inline"
              />
            )}

            {activeTab === 'find-people' && (
              <DecisionMakerPopup
                isOpen={true}
                onClose={() => {
                  setActiveTab('contacts')
                  refreshStatus()
                }}
                signalId={signalId}
                companyName={companyName}
                onContactAdded={() => {
                  refetch()
                  refreshStatus()
                }}
                mode="inline"
              />
            )}

            {activeTab === 'find-emails' && (
              <EmailFinderPopup
                isOpen={true}
                onClose={() => setActiveTab('contacts')}
                signalId={signalId}
                companyName={companyName}
                onEmailsFound={() => refetch()}
                mode="inline"
              />
            )}

            {activeTab === 'enrich-linkedin' && (
              <LinkedInScrapingPopup
                isOpen={true}
                onClose={() => setActiveTab('contacts')}
                signalId={signalId}
                companyName={companyName}
                contacts={contacts}
                mode="inline"
              />
            )}

            {activeTab === 'write-emails' && (
              <div className="space-y-4 animate-tab-fade-in">
                {/* Value Proposition */}
                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-gray-600">Value Proposition</label>
                      {isSavingNotes && <span className="text-xs text-gray-400">Saving...</span>}
                      {notesSaved && <span className="text-xs text-green-500">Saved</span>}
                    </div>
                    <button
                      onClick={() => setShowValuePropPopup(true)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors"
                    >
                      <Lightbulb className="w-3 h-3" />
                      AI Generate
                    </button>
                  </div>
                  <textarea
                    ref={valuePropRef}
                    value={valueProp}
                    onChange={(e) => setValueProp(e.target.value)}
                    onBlur={() => saveValueProp()}
                    placeholder={isLoadingNotes ? 'Loading...' : 'Describe your value proposition for this company...'}
                    disabled={isLoadingNotes}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y disabled:bg-gray-100 bg-white"
                  />
                </div>

                {/* Email Generation */}
                <EmailGenerationPopup
                  isOpen={true}
                  onClose={() => setActiveTab('contacts')}
                  signalId={signalId}
                  companyName={companyName}
                  contacts={contacts}
                  mode="inline"
                />
              </div>
            )}

            {activeTab === 'hubspot' && (
              <div className="animate-tab-fade-in">
                <HubSpotSending
                  signalId={signalId}
                  companyName={companyName}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* No signal selected */}
      {!hasSignal && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-sm">Select a signal to view contacts</div>
          </div>
        </div>
      )}

      {/* Edit Contact Popup (modal only - for editing from contact menu) */}
      {showAddContactPopup && editingContact && (
        <AddContactPopup
          isOpen={showAddContactPopup}
          onClose={handleCloseEditPopup}
          onContactAdded={refetch}
          signalId={signalId}
          companyName={companyName}
          editingContact={editingContact}
          mode="modal"
        />
      )}

      {/* Individual Email Popup (stays as modal) */}
      {showIndividualEmailPopup && (
        <IndividualEmailPopup
          isOpen={showIndividualEmailPopup}
          onClose={() => {
            setShowIndividualEmailPopup(false)
            setSelectedContactForEmail(null)
          }}
          signalId={signalId}
          companyName={companyName}
          contact={selectedContactForEmail}
          onLoadingChange={(contactId, isLoading) => {
            const newLoading = new Set(individualEmailLoading)
            if (isLoading) {
              newLoading.add(contactId)
            } else {
              newLoading.delete(contactId)
            }
            setIndividualEmailLoading(newLoading)
          }}
          onEmailGenerated={() => {
            checkExistingEmails()
          }}
        />
      )}

      {/* Value Prop Generation Popup (stays as modal) */}
      {showValuePropPopup && (
        <ValuePropGenerationPopup
          isOpen={showValuePropPopup}
          onClose={() => setShowValuePropPopup(false)}
          signalId={signalId}
          companyName={companyName}
          onValuePropGenerated={handleValuePropGenerated}
          hasExistingContent={!!valueProp.trim()}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
        onConfirm={executeDeleteContact}
        title="Delete Contact"
        message={`Are you sure you want to delete ${deleteConfirmation.contactName}? This action cannot be undone.`}
        variant="danger"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
}