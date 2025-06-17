import React, { useState } from 'react'
import { X, Linkedin, Loader2, CheckCircle, AlertCircle, Search } from 'lucide-react'
import { useLinkedInScraping } from '../../hooks/useLinkedInScraping'

interface Contact {
  id: string
  first_name: string
  last_name: string
  job_title: string
  linkedin_contact?: string
  source: 'manual' | 'decision_maker_finder'
}

interface LinkedInScrapingPopupProps {
  isOpen: boolean
  onClose: () => void
  signalId: string
  companyName: string
  contacts: Contact[]
}

const ApplePayCheckmark: React.FC = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        {/* Background circle */}
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
          {/* Checkmark */}
          <CheckCircle className="w-8 h-8 text-white animate-bounce" />
        </div>
        {/* Success rings */}
        <div className="absolute inset-0 border-2 border-blue-300 rounded-full animate-ping"></div>
        <div className="absolute inset-2 border-2 border-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  )
}

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center space-x-2">
      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      <div className="text-gray-600">
        <div className="font-medium">Scraping LinkedIn profiles...</div>
        <div className="text-sm text-gray-500">This usually takes 2-3 minutes per profile</div>
      </div>
    </div>
  )
}

export const LinkedInScrapingPopup: React.FC<LinkedInScrapingPopupProps> = ({
  isOpen,
  onClose,
  signalId,
  companyName,
  contacts
}) => {
  const [showSuccess, setShowSuccess] = useState(false)
  
  // Use the LinkedIn scraping hook
  const {
    scrapingStatus,
    isLoading,
    error,
    startScraping,
    isScrapingInProgress,
    hasResults,
    hasFailed
  } = useLinkedInScraping(signalId)

  // Filter contacts with LinkedIn URLs
  const contactsWithLinkedIn = contacts.filter(contact => 
    contact.linkedin_contact && contact.linkedin_contact.includes('linkedin.com/in/')
  )

  const handleStartScraping = async () => {
    if (contactsWithLinkedIn.length === 0) return

    const scrapingId = await startScraping(contactsWithLinkedIn)
    
    if (scrapingId) {
      // Show success animation
      setShowSuccess(true)
      
      // Hide success animation after 2 seconds
      setTimeout(() => {
        setShowSuccess(false)
      }, 2000)
    }
  }

  const handleClose = () => {
    setShowSuccess(false)
    onClose()
  }

  const renderContent = () => {
    // Show success animation
    if (showSuccess) {
      return (
        <div className="text-center py-16">
          <ApplePayCheckmark />
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-gray-900">Scraping Started!</h3>
            <p className="text-gray-600 mt-3 leading-relaxed">Collecting LinkedIn data for {companyName}</p>
          </div>
        </div>
      )
    }

    // Show loading state  
    if (isScrapingInProgress) {
      return (
        <div className="text-center py-8">
          <LoadingSpinner />
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800 leading-relaxed">
              We're scraping LinkedIn profiles for {contactsWithLinkedIn.length} contact{contactsWithLinkedIn.length !== 1 ? 's' : ''} at {companyName} using Bright Data.
            </p>
          </div>
          
          {scrapingStatus && (
            <div className="mt-4">
              <div className="text-sm text-gray-600">
                Progress: {scrapingStatus.contacts_processed} / {scrapingStatus.total_contacts} contacts
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${(scrapingStatus.contacts_processed / scrapingStatus.total_contacts) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )
    }

    // Show results
    if (hasResults && scrapingStatus) {
      const profilesByStatus = scrapingStatus.scraped_profiles.reduce((acc, profile) => {
        if (!acc[profile.status]) {
          acc[profile.status] = []
        }
        acc[profile.status].push(profile)
        return acc
      }, {} as Record<string, typeof scrapingStatus.scraped_profiles>)

      return (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Scraped {scrapingStatus.scraped_profiles.length} LinkedIn Profiles
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              For contacts at {companyName}
            </p>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {scrapingStatus.scraped_profiles.map((profile, index) => {
              const contact = contacts.find(c => c.id === profile.contact_id)
              return (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {profile.full_name || `${contact?.first_name} ${contact?.last_name}`}
                      </h4>
                      <p className="text-sm text-gray-500">{profile.current_position || contact?.job_title}</p>
                      {profile.company && (
                        <p className="text-sm text-gray-500">{profile.company}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      profile.status === 'scraped' 
                        ? 'bg-green-100 text-green-700' 
                        : profile.status === 'timeout'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {profile.status}
                    </span>
                  </div>
                  
                  {profile.status === 'scraped' && (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      {profile.headline && (
                        <div>
                          <div className="text-xs font-medium text-gray-600">Headline:</div>
                          <div className="text-sm text-gray-900">{profile.headline}</div>
                        </div>
                      )}
                      {profile.location && (
                        <div>
                          <div className="text-xs font-medium text-gray-600">Location:</div>
                          <div className="text-sm text-gray-900">{profile.location}</div>
                        </div>
                      )}
                      {profile.summary && (
                        <div>
                          <div className="text-xs font-medium text-gray-600">Summary:</div>
                          <div className="text-sm text-gray-900 max-h-20 overflow-y-auto">
                            {profile.summary}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    // Show error state
    if (hasFailed) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Scraping Failed</h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
            {scrapingStatus?.error_message || error || 'Something went wrong while scraping LinkedIn profiles.'}
          </p>
          <button
            onClick={handleStartScraping}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      )
    }

    // Show initial form
    return (
      <div>
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Scrape LinkedIn Profiles</h3>
          <p className="text-gray-600">Collect LinkedIn data for contacts at {companyName}</p>
        </div>

        <div className="space-y-6">
          {/* Contact summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">Contacts with LinkedIn URLs</div>
            <div className="text-lg font-semibold text-gray-900">
              {contactsWithLinkedIn.length} / {contacts.length} contacts
            </div>
            {contactsWithLinkedIn.length === 0 && (
              <p className="text-sm text-red-600 mt-2">
                No contacts have LinkedIn URLs. Add LinkedIn profiles to enable scraping.
              </p>
            )}
          </div>

          {/* LinkedIn preview */}
          {contactsWithLinkedIn.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Contacts to scrape:</div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {contactsWithLinkedIn.slice(0, 5).map((contact, index) => (
                  <div key={contact.id} className="flex items-center gap-2 text-sm text-gray-600">
                    <Linkedin className="w-4 h-4 text-blue-600" />
                    <span>{contact.first_name} {contact.last_name}</span>
                  </div>
                ))}
                {contactsWithLinkedIn.length > 5 && (
                  <div className="text-sm text-gray-500">
                    +{contactsWithLinkedIn.length - 5} more contacts
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm leading-relaxed">{error}</p>
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleStartScraping}
              disabled={isLoading || contactsWithLinkedIn.length === 0}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Scrape LinkedIn Profiles
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Linkedin className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">LinkedIn Scraper</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  )
}