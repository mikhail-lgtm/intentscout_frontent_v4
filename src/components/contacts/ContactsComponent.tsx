import React, { useState, useEffect } from 'react'
import { Search, Loader2, CheckCircle, Users, Plus, ExternalLink, Trash2, Edit, Mail, MailCheck, Linkedin, UserCheck, MoreHorizontal, Clock, AlertCircle } from 'lucide-react'
import { api } from '../../lib/apiClient'
import { useDecisionMakers } from '../../hooks/useDecisionMakers'
import { useEmailGeneration } from '../../hooks/useEmailGeneration'
import { useLinkedInScraping } from '../../hooks/useLinkedInScraping'
import { useContacts } from '../../hooks/useContacts'
import { DecisionMakerPopup } from '../decision-makers/DecisionMakerPopup'
import { EmailGenerationPopup } from './EmailGenerationPopup'
import { IndividualEmailPopup } from './IndividualEmailPopup'
import { LinkedInScrapingPopup } from './LinkedInScrapingPopup'
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
  const { isSearchInProgress, hasResults, hasFailed } = useDecisionMakers(signalId)
  
  // Use email generation hook to track generation status
  const { isGenerationInProgress, hasResults: hasEmailResults, hasFailed: hasEmailFailed } = useEmailGeneration(signalId)
  
  // Use LinkedIn scraping hook to track scraping status
  const { isScrapingInProgress, hasResults: hasLinkedInResults, hasFailed: hasLinkedInFailed } = useLinkedInScraping(signalId)
  
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

  const checkExistingEmails = async () => {
    try {
      const response = await api.emails.getBySignal(signalId)
      if (response.data && response.data.generated_emails) {
        const emailsByContact: {[contactId: string]: boolean} = {}
        response.data.generated_emails.forEach((email: any) => {
          emailsByContact[email.contact_id] = true
        })
        setExistingEmails(emailsByContact)
      }
    } catch (err) {
      console.error('Failed to check existing emails:', err)
    }
  }

  const checkExistingLinkedInProfiles = async () => {
    try {
      const profilesByContact: {[contactId: string]: boolean} = {}
      
      // Check each contact for existing LinkedIn profile
      for (const contact of contacts) {
        const response = await api.linkedInScraping.getContactProfile(contact.id)
        if (response.data && response.data.status === 'found') {
          profilesByContact[contact.id] = true
        }
      }
      
      setExistingLinkedInProfiles(profilesByContact)
    } catch (err) {
      console.error('Failed to check existing LinkedIn profiles:', err)
    }
  }

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
      return {
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        text: "DM Search...",
        className: "bg-orange-500 hover:bg-orange-600 text-white"
      }
    }
    
    if (hasResults) {
      return {
        icon: <CheckCircle className="w-3 h-3" />,
        text: "DM Results",
        className: "bg-green-500 hover:bg-green-600 text-white"
      }
    }
    
    if (hasFailed) {
      return {
        icon: <Search className="w-3 h-3" />,
        text: "DM Retry",
        className: "bg-red-500 hover:bg-red-600 text-white"
      }
    }
    
    return {
      icon: <Search className="w-3 h-3" />,
      text: "Find DMs",
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
      return {
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        text: "Scraping...",
        className: "bg-blue-500 hover:bg-blue-600 text-white"
      }
    }
    
    if (hasLinkedInResults) {
      return {
        icon: <CheckCircle className="w-3 h-3" />,
        text: "LinkedIn Results",
        className: "bg-green-500 hover:bg-green-600 text-white"
      }
    }
    
    if (hasLinkedInFailed) {
      return {
        icon: <Linkedin className="w-3 h-3" />,
        text: "LinkedIn Retry",
        className: "bg-red-500 hover:bg-red-600 text-white"
      }
    }
    
    return {
      icon: <Linkedin className="w-3 h-3" />,
      text: "Scrape LinkedIn",
      className: "bg-blue-500 hover:bg-blue-600 text-white"
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
        {contactsLoading ? (
          <ContactsListSkeleton count={4} />
        ) : !hasSignal ? (
          <div className="text-center text-gray-400 flex items-center justify-center h-32">
            <div>
              <div className="text-2xl mb-2">📋</div>
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

      {/* Email Generation Popup - all contacts */}
      <EmailGenerationPopup
        isOpen={showEmailGenerationPopup}
        onClose={() => setShowEmailGenerationPopup(false)}
        signalId={signalId}
        companyName={companyName}
        contacts={contacts}
      />

      {/* LinkedIn Scraping Popup - all contacts */}
      <LinkedInScrapingPopup
        isOpen={showLinkedInScrapingPopup}
        onClose={() => setShowLinkedInScrapingPopup(false)}
        signalId={signalId}
        companyName={companyName}
        contacts={contacts}
      />

      {/* Individual Email Popup */}
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

      {/* Decision Maker Popup */}
      <DecisionMakerPopup
        isOpen={showDecisionMakerPopup}
        onClose={() => setShowDecisionMakerPopup(false)}
        signalId={signalId}
        companyName={companyName}
        onContactAdded={refetch}
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