import React, { useState, useEffect } from 'react'
import { X, Mail, Loader2, CheckCircle, AlertCircle, Wand2 } from 'lucide-react'
import { useEmailGeneration } from '../../hooks/useEmailGeneration'
import { useSequences } from '../../hooks/useSequences'

interface Contact {
  id: string
  first_name: string
  last_name: string
  job_title: string
  email_address?: string
  source: 'manual' | 'decision_maker_finder'
}

interface EmailGenerationPopupProps {
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
        <div className="font-medium">Generating emails...</div>
        <div className="text-sm text-gray-500">This usually takes around 1 minute</div>
      </div>
    </div>
  )
}

export const EmailGenerationPopup: React.FC<EmailGenerationPopupProps> = ({
  isOpen,
  onClose,
  signalId,
  companyName,
  contacts
}) => {
  const [selectedSequence, setSelectedSequence] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  
  // Use the email generation hook
  const {
    generationStatus,
    isLoading,
    error,
    startGeneration,
    isGenerationInProgress,
    hasResults,
    hasFailed
  } = useEmailGeneration(signalId)

  // Use sequences hook to get available sequences
  const { sequences, isLoading: sequencesLoading } = useSequences()

  // Filter contacts with email addresses
  const contactsWithEmails = contacts.filter(contact => contact.email_address && contact.email_address.trim())

  // Validate data sources when sequence changes
  const validateDataSources = async () => {
    if (!selectedSequence || contactsWithEmails.length === 0 || !signalId) {
      setValidationResult(null)
      setValidationError(null)
      return
    }

    setIsValidating(true)
    setValidationError(null)

    try {
      const { api } = await import('../../lib/apiClient')
      const response = await api.emailValidation.validateGeneration({
        sequence_id: selectedSequence,
        contact_ids: contactsWithEmails.map(c => c.id),
        signal_id: signalId
      })

      if (response.error) {
        setValidationError(response.error)
        setValidationResult(null)
      } else {
        setValidationResult(response.data)
        setValidationError(null)
      }
    } catch (err: any) {
      setValidationError(err.message || 'Validation failed')
      setValidationResult(null)
    } finally {
      setIsValidating(false)
    }
  }

  // Run validation when sequence or contacts change
  useEffect(() => {
    if (selectedSequence && contactsWithEmails.length > 0) {
      validateDataSources()
    }
  }, [selectedSequence, contactsWithEmails.length, signalId])

  const handleStartGeneration = async () => {
    if (!selectedSequence || contactsWithEmails.length === 0) return

    // Convert contacts to the format expected by the API
    const contactsData = contactsWithEmails.map(contact => ({
      id: contact.id,
      name: `${contact.first_name} ${contact.last_name}`,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email_address!,
      title: contact.job_title,
      company: companyName
    }))

    const generationId = await startGeneration(selectedSequence, contactsData)
    
    if (generationId) {
      // Show success animation
      setShowSuccess(true)
      
      // Hide success animation after 2 seconds
      setTimeout(() => {
        setShowSuccess(false)
      }, 2000)
    }
  }

  const handleClose = () => {
    setSelectedSequence('')
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
            <h3 className="text-xl font-semibold text-gray-900">Generation Started!</h3>
            <p className="text-gray-600 mt-3 leading-relaxed">Creating personalized emails for {companyName}</p>
          </div>
        </div>
      )
    }

    // Show loading state  
    if (isGenerationInProgress) {
      return (
        <div className="text-center py-8">
          <LoadingSpinner />
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800 leading-relaxed">
              We're generating personalized emails for {contactsWithEmails.length} contact{contactsWithEmails.length !== 1 ? 's' : ''} at {companyName} using AI.
            </p>
          </div>
          
          {generationStatus && (
            <div className="mt-4">
              <div className="text-sm text-gray-600">
                Progress: {generationStatus.contacts_processed} / {Math.ceil(generationStatus.total_emails / sequences.filter(s => s.id === selectedSequence)[0]?.blocks?.length || 1)} contacts
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${(generationStatus.contacts_processed / Math.ceil(generationStatus.total_emails / sequences.filter(s => s.id === selectedSequence)[0]?.blocks?.length || 1)) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )
    }

    // Show results
    if (hasResults && generationStatus) {
      const emailsByContact = generationStatus.generated_emails.reduce((acc, email) => {
        if (!acc[email.contact_id]) {
          acc[email.contact_id] = []
        }
        acc[email.contact_id].push(email)
        return acc
      }, {} as Record<string, typeof generationStatus.generated_emails>)

      return (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Generated {generationStatus.generated_emails.length} Emails
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              For {Object.keys(emailsByContact).length} contact{Object.keys(emailsByContact).length !== 1 ? 's' : ''} at {companyName}
            </p>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {Object.entries(emailsByContact).map(([contactId, emails]) => {
              const contact = contacts.find(c => c.id === contactId)
              return (
                <div key={contactId} className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-900">
                      {contact?.first_name} {contact?.last_name}
                    </h4>
                    <p className="text-sm text-gray-500">{contact?.job_title}</p>
                  </div>
                  
                  <div className="space-y-3">
                    {emails.map((email, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-700">
                            Step {email.sequence_step} • {email.block_name}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            email.status === 'generated' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {email.status}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <div className="text-xs font-medium text-gray-600">Subject:</div>
                            <div className="text-sm text-gray-900">{email.subject}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-600">Body:</div>
                            <div className="text-sm text-gray-900 whitespace-pre-wrap max-h-32 overflow-y-auto">
                              {email.body}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Generation Failed</h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
            {generationStatus?.error_message || error || 'Something went wrong while generating emails.'}
          </p>
          <button
            onClick={handleStartGeneration}
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
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Generate Emails</h3>
          <p className="text-gray-600">Create personalized emails for contacts at {companyName}</p>
        </div>

        <div className="space-y-6">
          {/* Contact summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-2">Contacts with Email Addresses</div>
            <div className="text-lg font-semibold text-gray-900">
              {contactsWithEmails.length} / {contacts.length} contacts
            </div>
            {contactsWithEmails.length === 0 && (
              <p className="text-sm text-red-600 mt-2">
                No contacts have email addresses. Add email addresses to generate emails.
              </p>
            )}
          </div>

          {/* Sequence selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Email Sequence
            </label>
            <select
              value={selectedSequence}
              onChange={(e) => setSelectedSequence(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              disabled={sequencesLoading}
            >
              <option value="">Choose a sequence...</option>
              {sequences.map(sequence => (
                <option key={sequence.id} value={sequence.id}>
                  {sequence.name} ({sequence.blocks?.filter(b => b.block_type === 'email').length || 0} emails)
                </option>
              ))}
            </select>
            {sequencesLoading && (
              <p className="text-xs text-gray-500 mt-2">Loading sequences...</p>
            )}
          </div>


          {/* Validation Loading */}
          {isValidating && selectedSequence && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <p className="text-blue-700 text-sm">Validating data sources...</p>
              </div>
            </div>
          )}

          {/* Validation Error */}
          {validationError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm leading-relaxed">{validationError}</p>
            </div>
          )}

          {/* Validation Results */}
          {validationResult && !isValidating && selectedSequence && (
            <div className={`p-4 border rounded-xl ${
              validationResult.is_valid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start gap-2 mb-3">
                {validationResult.is_valid ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h4 className={`font-medium text-sm ${
                    validationResult.is_valid ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {validationResult.is_valid 
                      ? 'All contacts ready for email generation' 
                      : 'Some contacts missing required data'}
                  </h4>
                  <p className={`text-xs mt-1 ${
                    validationResult.is_valid ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {validationResult.valid_contacts} of {validationResult.total_contacts} contacts have all required data sources
                  </p>
                </div>
              </div>

              {/* Show details for invalid contacts */}
              {!validationResult.is_valid && (
                <div className="space-y-2">
                  {validationResult.validation_results
                    .filter((result: any) => !result.is_valid)
                    .map((result: any, index: number) => (
                      <div key={index} className="bg-white bg-opacity-60 rounded-lg p-3">
                        <div className="font-medium text-sm text-gray-900 mb-1">
                          {result.contact_name}
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          {result.missing_source_details.map((detail: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0"></span>
                              <span>{detail.source}: {detail.issue}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  
                  {validationResult.missing_sources_summary.includes('linkedin') && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-800">
                        💡 <strong>Tip:</strong> You can scrape LinkedIn profiles for these contacts using the LinkedIn scraping feature in the contacts section.
                      </p>
                    </div>
                  )}
                </div>
              )}
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
              onClick={handleStartGeneration}
              disabled={
                isLoading || 
                !selectedSequence || 
                contactsWithEmails.length === 0 || 
                (validationResult && !validationResult.is_valid) ||
                isValidating
              }
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate Emails
                  {validationResult && !validationResult.is_valid && (
                    <span className="text-xs ml-1">({validationResult.valid_contacts}/{validationResult.total_contacts})</span>
                  )}
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
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Email Generator</h2>
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