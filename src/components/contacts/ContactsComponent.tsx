import React, { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, CheckCircle, Users, Plus, ExternalLink, Trash2, Edit, Mail, MailCheck, Linkedin, UserCheck, MoreHorizontal, Clock, AlertCircle } from 'lucide-react'
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
  const [showDecisionMakerPopup, setShowDecisionMakerPopup] = useState(false)
  const [showEmailGenerationPopup, setShowEmailGenerationPopup] = useState(false)
  const [showLinkedInScrapingPopup, setShowLinkedInScrapingPopup] = useState(false)
  const [showEmailFinderPopup, setShowEmailFinderPopup] = useState(false)
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
  
  // Use decision makers hook to track search status
  const { 
    searchStatus, 
    isSearchInProgress, 
    hasResults, 
    hasFailed,
    refreshStatus 
  } = useDecisionMakers(signalId)
  
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

  const getDecisionMakerButtonContent = () => {
    if (isSearchInProgress) {
      const status = searchStatus?.status || 'searching'
      const statusText = status === 'pending' ? 'Starting search...' : 'Finding decision makers...'
      return {
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        text: statusText,
        className: "bg-orange-500 hover:bg-orange-600 text-white"
      }
    }
    
    if (hasResults) {
      const dmCount = searchStatus?.decision_makers?.length || 0
      return {
        icon: <CheckCircle className="w-3 h-3" />,
        text: `Found ${dmCount} DMs`,
        className: "bg-green-500 hover:bg-green-600 text-white"
      }
    }
    
    if (hasFailed) {
      return {
        icon: <AlertCircle className="w-3 h-3" />,
        text: "DM Search Failed",
        className: "bg-red-500 hover:bg-red-600 text-white"
      }
    }
    
    return {
      icon: <Search className="w-3 h-3" />,
      text: "Find Decision Makers",
      className: "bg-orange-500 hover:bg-orange-600 text-white"
    }
  }

  const getEmailButtonContent = () => {
    if (isGenerationInProgress) {
      return {
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        text: "Generating...",
        className: "bg-blue-500 hover:bg-blue-600 text-white"
      }
    }
    
    if (hasEmailResults) {
      return {
        icon: <CheckCircle className="w-3 h-3" />,
        text: "Email Results",
        className: "bg-green-500 hover:bg-green-600 text-white"
      }
    }
    
    if (hasEmailFailed) {
      return {
        icon: <Mail className="w-3 h-3" />,
        text: "Email Retry",
        className: "bg-red-500 hover:bg-red-600 text-white"
      }
    }
    
    return {
      icon: <Mail className="w-3 h-3" />,
      text: "Generate Emails",
      className: "bg-blue-500 hover:bg-blue-600 text-white"
    }
  }

  const getLinkedInButtonContent = () => {
    if (isScrapingInProgress) {
      const processed = linkedInStatus?.contacts_processed || 0
      const total = linkedInStatus?.total_contacts || 0
      const statusText = total > 0 ? `Scraping (${processed}/${total})` : 'Starting scrape...'
      return {
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        text: statusText,
        className: "bg-blue-500 hover:bg-blue-600 text-white"
      }
    }
    
    if (hasLinkedInResults) {
      const profileCount = linkedInStatus?.scraped_profiles?.length || 0
      return {
        icon: <CheckCircle className="w-3 h-3" />,
        text: `Found ${profileCount} Profiles`,
        className: "bg-green-500 hover:bg-green-600 text-white"
      }
    }
    
    if (hasLinkedInFailed) {
      return {
        icon: <AlertCircle className="w-3 h-3" />,
        text: "LinkedIn Scraping Failed",
        className: "bg-red-500 hover:bg-red-600 text-white"
      }
    }
    
    return {
      icon: <Linkedin className="w-3 h-3" />,
      text: "Scrape LinkedIn Profiles",
      className: "bg-blue-500 hover:bg-blue-600 text-white"
    }
  }

  const getEmailFinderButtonContent = () => {
    if (isEmailFinderInProgress) {
      return {
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        text: "Finding Emails...",
        className: "bg-blue-500 hover:bg-blue-600 text-white"
      }
    }
    
    if (hasEmailFinderResults) {
      const emailCount = emailFinderStatus?.email_results?.filter(r => r.email_address).length || 0
      return {
        icon: <CheckCircle className="w-3 h-3" />,
        text: `Found ${emailCount} Emails`,
        className: "bg-green-500 hover:bg-green-600 text-white"
      }
    }
    
    if (hasEmailFinderFailed) {
      return {
        icon: <AlertCircle className="w-3 h-3" />,
        text: "Email Finding Failed",
        className: "bg-red-500 hover:bg-red-600 text-white"
      }
    }
    
    return {
      icon: <MailCheck className="w-3 h-3" />,
      text: "Find Email Addresses",
      className: "bg-purple-500 hover:bg-purple-600 text-white"
    }
  }

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

  const decisionMakerButtonContent = getDecisionMakerButtonContent()
  const emailButtonContent = getEmailButtonContent()
  const linkedInButtonContent = getLinkedInButtonContent()
  const emailFinderButtonContent = getEmailFinderButtonContent()

  return (
    <div className="h-full flex flex-col">
      {/* Header with title and buttons */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Contacts</h3>
          {hasSignal && !contactsLoading && (
            <span className="text-sm text-gray-500">({contacts.length})</span>
          )}
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleHeaderMenu()
            }}
            disabled={!hasSignal}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MoreHorizontal className="w-3 h-3" />
            Actions
            {isSearchInProgress && (
              <Loader2 className="w-3 h-3 animate-spin ml-1" />
            )}
            {hasResults && !isSearchInProgress && (
              <div className="relative ml-1 group">
                <Users className="w-3 h-3 text-green-300" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {searchStatus?.decision_makers?.length || 0} Decision Makers Found
                </div>
              </div>
            )}
            {hasLinkedInResults && !isScrapingInProgress && (
              <div className="relative ml-1 group">
                <Linkedin className="w-3 h-3 text-blue-300" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {linkedInStatus?.scraped_profiles?.length || 0} LinkedIn Profiles Scraped
                </div>
              </div>
            )}
          </button>

          {/* Header Dropdown Menu */}
          {showHeaderMenu && hasSignal && (
            <div 
              className="absolute right-0 top-8 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Add Contact */}
              <button
                onClick={() => {
                  setShowAddContactPopup(true)
                  closeHeaderMenu()
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                <Plus className="w-4 h-4 text-orange-500" />
                <span className="text-gray-700">Add Contact</span>
              </button>

              {/* Divider */}
              <div className="border-t border-gray-100 my-1"></div>

              {/* Email Generation */}
              <button
                onClick={() => {
                  setShowEmailGenerationPopup(true)
                  closeHeaderMenu()
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                {emailButtonContent.icon}
                <div className="flex flex-col">
                  <span className={`${
                    hasEmailResults ? 'text-green-700' : hasEmailFailed ? 'text-red-700' : 'text-gray-700'
                  }`}>
                    {emailButtonContent.text}
                  </span>
                  <span className="text-xs text-gray-500">Generate emails for all contacts</span>
                </div>
              </button>

              {/* LinkedIn Scraping */}
              <button
                onClick={() => {
                  setShowLinkedInScrapingPopup(true)
                  closeHeaderMenu()
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                {linkedInButtonContent.icon}
                <div className="flex flex-col">
                  <span className={`${
                    hasLinkedInResults ? 'text-green-700' : hasLinkedInFailed ? 'text-red-700' : 'text-gray-700'
                  }`}>
                    {linkedInButtonContent.text}
                  </span>
                  <span className="text-xs text-gray-500">Scrape LinkedIn profiles</span>
                </div>
              </button>

              {/* Email Finder */}
              <button
                onClick={() => {
                  setShowEmailFinderPopup(true)
                  closeHeaderMenu()
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                {emailFinderButtonContent.icon}
                <div className="flex flex-col">
                  <span className={`${
                    hasEmailFinderResults ? 'text-green-700' : hasEmailFinderFailed ? 'text-red-700' : 'text-gray-700'
                  }`}>
                    {emailFinderButtonContent.text}
                  </span>
                  <span className="text-xs text-gray-500">Find email addresses for contacts</span>
                </div>
              </button>

              {/* Decision Makers */}
              <button
                onClick={() => {
                  setShowDecisionMakerPopup(true)
                  closeHeaderMenu()
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                {decisionMakerButtonContent.icon}
                <div className="flex flex-col">
                  <span className={`${
                    hasResults ? 'text-green-700' : hasFailed ? 'text-red-700' : 'text-gray-700'
                  }`}>
                    {decisionMakerButtonContent.text}
                  </span>
                  <span className="text-xs text-gray-500">Find decision makers</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Decision Makers Search Status Banner */}
        {isSearchInProgress && (
          <div className="mb-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-orange-600 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-orange-900">Finding Decision Makers</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
                      {searchStatus?.status === 'pending' ? 'Initializing...' : 
                       searchStatus?.status === 'searching' ? 'AI Analyzing...' : 'Processing...'}
                    </span>
                    {searchStatus?.started_at && (
                      <span className="text-xs text-orange-600">
                        {Math.round((Date.now() - new Date(searchStatus.started_at).getTime()) / 1000)}s
                      </span>
                    )}
                    <button
                      onClick={refreshStatus}
                      className="text-orange-600 hover:text-orange-800 transition-colors"
                      title="Refresh status"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-orange-800 mt-1">
                  {searchStatus?.status === 'pending' ? 
                    'Preparing to search for decision makers and key contacts...' :
                    'AI is analyzing job postings, LinkedIn profiles, and company data to identify decision makers. This usually takes 1-3 minutes.'
                  }
                </p>
                {searchStatus?.status === 'searching' && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-orange-200 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                      </div>
                      <span className="text-xs text-orange-700">Analyzing...</span>
                    </div>
                  </div>
                )}
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      {searchStatus.decision_makers.length} Decision Makers
                    </span>
                    <button
                      onClick={() => setShowDecisionMakerPopup(true)}
                      className="text-green-600 hover:text-green-800 transition-colors"
                      title="View decision makers"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-green-800 mt-1">
                  Found {searchStatus.decision_makers.length} key decision makers at {companyName}. Click to view and import them as contacts.
                </p>
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
                  <h4 className="font-medium text-red-900">Decision Makers Search Failed</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded-full">
                      Error
                    </span>
                    <button
                      onClick={() => setShowDecisionMakerPopup(true)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Try again"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-red-800 mt-1">
                  {searchStatus?.error_message || 'Unable to find decision makers. You can try again or add contacts manually.'}
                </p>
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                      {linkedInStatus?.contacts_processed || 0} / {linkedInStatus?.total_contacts || 0} completed
                    </span>
                    <button
                      onClick={refreshLinkedInStatus}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Refresh status"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-blue-800 mt-1">
                  Gathering detailed profile information from LinkedIn. Each profile takes 30-60 seconds to scrape.
                </p>
              </div>
            </div>
          </div>
        )}

        {contactsLoading ? (
          <ContactsListSkeleton count={4} />
        ) : !hasSignal ? (
          <div className="h-full">
            {/* Header skeleton */}
            <div className="flex items-center justify-between mb-6">
              <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-8 animate-pulse"></div>
            </div>
            
            {/* Content skeleton */}
            <div className="text-center text-gray-400 flex items-center justify-center h-32">
              <div>
                <div className="text-2xl mb-2">📋</div>
                <div className="text-sm">Select a signal to view contacts</div>
              </div>
            </div>
          </div>
        ) : contactsError ? (
          <div className="text-center text-red-600 p-4">
            <p className="text-sm">{contactsError}</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center text-gray-400 flex items-center justify-center h-32">
            <div>
              <div className="text-2xl mb-2">👥</div>
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
                        {/* Email Status Icon */}
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

                        {/* LinkedIn Status Icon */}
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
                  
                  {/* Right Side - LinkedIn Link, DM Badge, Actions Menu */}
                  <div className="flex items-center gap-2 ml-3">
                    {/* LinkedIn link */}
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
                    
                    {/* Decision Maker Badge */}
                    {contact.source === 'decision_maker_finder' && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                        DM
                      </span>
                    )}

                    {/* Actions Menu */}
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

                      {/* Dropdown Menu */}
                      {openMenuContactId === contact.id && (
                      <div 
                        className="absolute right-0 top-8 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Email Action */}
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

                        {/* LinkedIn Action - only show if contact has LinkedIn URL */}
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

                        {/* Divider */}
                        <div className="border-t border-gray-100 my-1"></div>

                        {/* Edit Action */}
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

                        {/* Delete Action */}
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
      </div>

      {/* Add/Edit Contact Popup */}
      <AddContactPopup
        isOpen={showAddContactPopup}
        onClose={handleCloseEditPopup}
        onContactAdded={refetch}
        signalId={signalId}
        companyName={companyName}
        editingContact={editingContact}
      />

      {/* Email Generation Popup - FIXED: Only mount when needed */}
      {showEmailGenerationPopup && (
        <EmailGenerationPopup
          isOpen={showEmailGenerationPopup}
          onClose={() => setShowEmailGenerationPopup(false)}
          signalId={signalId}
          companyName={companyName}
          contacts={contacts}
        />
      )}

      {/* LinkedIn Scraping Popup - FIXED: Only mount when needed */}
      {showLinkedInScrapingPopup && (
        <LinkedInScrapingPopup
          isOpen={showLinkedInScrapingPopup}
          onClose={() => setShowLinkedInScrapingPopup(false)}
          signalId={signalId}
          companyName={companyName}
          contacts={contacts}
        />
      )}

      {/* Email Finder Popup - FIXED: Only mount when needed */}
      {showEmailFinderPopup && (
        <EmailFinderPopup
          isOpen={showEmailFinderPopup}
          onClose={() => setShowEmailFinderPopup(false)}
          signalId={signalId}
          companyName={companyName}
          onEmailsFound={() => {
            // Refresh contacts to show updated emails
            refetch()
          }}
        />
      )}

      {/* Individual Email Popup - FIXED: Only mount when needed */}
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
            // Refresh email status when new emails are generated
            checkExistingEmails()
          }}
        />
      )}

      {/* Decision Maker Popup */}
      <DecisionMakerPopup
        isOpen={showDecisionMakerPopup}
        onClose={() => {
          setShowDecisionMakerPopup(false)
          // Refresh decision makers status when popup closes
          refreshStatus()
        }}
        signalId={signalId}
        companyName={companyName}
        onContactAdded={() => {
          refetch() // Refresh contacts
          refreshStatus() // Refresh decision makers status
        }}
      />

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