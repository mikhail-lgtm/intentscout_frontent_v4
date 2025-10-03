import React, { useState, useEffect } from 'react'
import { X, Mail, RefreshCw, Edit3, Send, Copy, Loader2, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react'
import { api } from '../../lib/apiClient'
import { useSequences } from '../../hooks/useSequences'
import { RegenerateEmailModal } from '../outreach/RegenerateEmailModal'
import { DataSourceConfig } from '../../types/sequences'

interface IndividualEmailPopupProps {
  isOpen: boolean
  onClose: () => void
  signalId: string
  companyName: string
  contact: any
  onLoadingChange: (contactId: string, isLoading: boolean) => void
  onEmailGenerated: () => void
}

interface GeneratedEmail {
  contact_id: string
  sequence_step: number
  block_id: string
  block_name: string
  subject: string
  body: string
  status: string
}

export const IndividualEmailPopup: React.FC<IndividualEmailPopupProps> = ({
  isOpen,
  onClose,
  signalId,
  companyName,
  contact,
  onLoadingChange,
  onEmailGenerated
}) => {
  const [emails, setEmails] = useState<GeneratedEmail[]>([])
  const [selectedSequence, setSelectedSequence] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingEmailIndex, setEditingEmailIndex] = useState<number | null>(null)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedBody, setEditedBody] = useState('')
  const [copySuccess, setCopySuccess] = useState<number | null>(null)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [regeneratingEmailIndex, setRegeneratingEmailIndex] = useState<number | null>(null)

  // Use sequences hook to get available sequences
  const { sequences, isLoading: sequencesLoading } = useSequences()

  const handleClose = () => {
    setSelectedSequence('')
    setEditingEmailIndex(null)
    setError(null)
    setValidationResult(null)
    setValidationError(null)
    onClose()
  }

  // Load existing emails when popup opens
  useEffect(() => {
    if (isOpen && signalId && contact) {
      loadExistingEmails()
    }
  }, [isOpen, signalId, contact])

  // Validate data sources when sequence changes
  const validateDataSources = async () => {
    if (!selectedSequence || !contact || !signalId) {
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
        contact_ids: [contact.id],
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

  // Run validation when sequence changes
  useEffect(() => {
    if (selectedSequence && contact) {
      validateDataSources()
    }
  }, [selectedSequence, contact, signalId])

  const loadExistingEmails = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await api.emails.getByContact(contact.id)
      if (response.data && typeof response.data === 'object') {
        const data = response.data as any
        if (data.generated_emails && Array.isArray(data.generated_emails)) {
          setEmails(data.generated_emails)
        }
      }
    } catch (err: any) {
      console.error('Failed to load existing emails:', err)
      setError('Failed to load existing emails')
    } finally {
      setIsLoading(false)
    }
  }

  const generateEmail = async () => {
    if (!contact || !signalId || !selectedSequence) return

    setIsGenerating(true)
    setError(null)
    onLoadingChange(contact.id, true)

    try {
      // Convert contact to the format expected by the API (same as EmailGenerationPopup)
      const contactData = {
        id: contact.id,
        name: `${contact.first_name} ${contact.last_name}`,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email_address || '',
        title: contact.job_title,
        company: companyName
      }

      // Start email generation
      const generateResponse = await api.emails.generate({
        sequence_id: selectedSequence,
        contacts: [contactData],
        signal_id: signalId,
        company_data: {},
        custom_data: {}
      })

      if (generateResponse.error) {
        throw new Error(generateResponse.error)
      }

      const generationId = (generateResponse.data as any).generation_id

      // Poll for completion with extended timeout
      let completed = false
      let attempts = 0
      const maxAttempts = 120 // 10 minutes at 5-second intervals
      
      console.log(`Starting to poll for generation ${generationId}`)

      while (!completed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        attempts++
        
        console.log(`Polling attempt ${attempts}/${maxAttempts} for generation ${generationId}`)

        try {
          const statusResponse = await api.emails.getGeneration(generationId)
          if (statusResponse.error) {
            console.error('Status check error:', statusResponse.error)
            throw new Error(statusResponse.error)
          }

          const status = (statusResponse.data as any).status
          console.log(`Generation ${generationId} status: ${status}`)

          if (status === 'completed') {
            completed = true
            // Load the latest emails for this contact using the contact endpoint
            const emailResponse = await api.emails.getByContact(contact.id)
            if (emailResponse.data && typeof emailResponse.data === 'object') {
              const data = emailResponse.data as any
              if (data.generated_emails && Array.isArray(data.generated_emails)) {
                console.log(`Found ${data.generated_emails.length} emails for contact ${contact.id}`)
                setEmails(data.generated_emails)
              }
            }
            // Notify parent that emails were generated
            onEmailGenerated()
          } else if (status === 'failed') {
            throw new Error((statusResponse.data as any).error_message || 'Email generation failed')
          }
          // If status is 'in_progress', continue polling
        } catch (pollError) {
          console.error(`Polling error on attempt ${attempts}:`, pollError)
          // Don't throw immediately, try a few more times
          if (attempts >= maxAttempts - 5) {
            throw pollError
          }
        }
      }

      if (!completed) {
        throw new Error('Email generation timed out after 10 minutes')
      }

    } catch (err: any) {
      console.error('Failed to generate email:', err)
      setError(err.message || 'Failed to generate email')
    } finally {
      setIsGenerating(false)
      onLoadingChange(contact.id, false)
    }
  }

  const handleEdit = (index: number) => {
    const email = emails[index]
    setEditingEmailIndex(index)
    setEditedSubject(email.subject)
    setEditedBody(email.body)
  }

  const saveEdit = () => {
    if (editingEmailIndex !== null) {
      const updatedEmails = [...emails]
      updatedEmails[editingEmailIndex] = {
        ...updatedEmails[editingEmailIndex],
        subject: editedSubject,
        body: editedBody,
        status: 'edited'
      }
      setEmails(updatedEmails)
      setEditingEmailIndex(null)
    }
  }

  const cancelEdit = () => {
    setEditingEmailIndex(null)
    setEditedSubject('')
    setEditedBody('')
  }

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(index)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleRegenerateClick = (index: number) => {
    setRegeneratingEmailIndex(index)
    setShowRegenerateModal(true)
  }

  const handleRegenerateEmail = async (data: {
    subject_prompt: string
    body_prompt: string
    data_sources: DataSourceConfig[]
  }) => {
    if (regeneratingEmailIndex === null || !contact) return

    const email = emails[regeneratingEmailIndex]

    try {
      const response = await api.emails.regenerate({
        signal_id: signalId,
        contact_id: contact.id,
        sequence_step: email.sequence_step,
        subject_prompt: data.subject_prompt,
        body_prompt: data.body_prompt,
        data_sources: data.data_sources
      })

      if (response.error) {
        throw new Error(response.error)
      }

      // Reload emails after successful regeneration
      await loadExistingEmails()
    } catch (err: any) {
      console.error('Failed to regenerate email:', err)
      throw err
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Email for {contact?.first_name} {contact?.last_name}
              </h2>
              <p className="text-sm text-gray-500">{contact?.job_title} at {companyName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-gray-600">Loading existing emails...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={generateEmail}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            </div>
          ) : emails.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center max-w-md">
                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No emails generated yet</h3>
                <p className="text-gray-600 mb-6">Generate personalized emails for this contact</p>
                
                {/* Sequence selection */}
                <div className="mb-6">
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
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <p className="text-blue-700 text-sm">Validating data sources...</p>
                    </div>
                  </div>
                )}

                {/* Validation Error */}
                {validationError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-700 text-sm leading-relaxed">{validationError}</p>
                  </div>
                )}

                {/* Validation Results */}
                {validationResult && !isValidating && selectedSequence && (
                  <div className={`mb-6 p-4 border rounded-xl ${
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
                            ? 'Contact ready for email generation' 
                            : 'Contact missing required data'}
                        </h4>
                        {!validationResult.is_valid && validationResult.validation_results.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {validationResult.validation_results[0].missing_source_details.map((detail: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-yellow-700">
                                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0"></span>
                                <span>{detail.source}: {detail.issue}</span>
                              </div>
                            ))}
                            {validationResult.missing_sources_summary.includes('linkedin') && (
                              <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
                                💡 <strong>Tip:</strong> You can scrape this contact's LinkedIn profile using the LinkedIn scraping feature.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={generateEmail}
                  disabled={
                    isGenerating || 
                    !selectedSequence || 
                    (validationResult && !validationResult.is_valid) ||
                    isValidating
                  }
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Generate Email
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Action buttons */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Generated Emails ({emails.length})
                </h3>
                <div className="flex items-center gap-3">
                  {/* Sequence selector for regeneration */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">Sequence:</label>
                    <select
                      value={selectedSequence}
                      onChange={(e) => setSelectedSequence(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      disabled={sequencesLoading}
                    >
                      <option value="">Choose a sequence...</option>
                      {sequences.map(sequence => (
                        <option key={sequence.id} value={sequence.id}>
                          {sequence.name} ({sequence.blocks?.filter(b => b.block_type === 'email').length || 0} emails)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Validation indicator for regeneration */}
                  {selectedSequence && (
                    <div className="flex items-center">
                      {isValidating ? (
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Validating...</span>
                        </div>
                      ) : validationResult ? (
                        validationResult.is_valid ? (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            <span>Ready</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-yellow-600">
                            <AlertCircle className="w-3 h-3" />
                            <span>Missing data</span>
                          </div>
                        )
                      ) : null}
                    </div>
                  )}

                  <button
                    onClick={generateEmail}
                    disabled={
                      isGenerating || 
                      !selectedSequence || 
                      (validationResult && !validationResult.is_valid) ||
                      isValidating
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Regenerate
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Email list */}
              {emails.map((email, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{email.block_name}</h4>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        Step {email.sequence_step}
                      </span>
                      {email.status === 'edited' && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                          Edited
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRegenerateClick(index)}
                        className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                        title="Regenerate email with different prompts"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => copyToClipboard(`Subject: ${email.subject}\n\n${email.body}`, index)}
                        className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Copy email"
                      >
                        {copySuccess === index ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(index)}
                        className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        title="Edit email"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {editingEmailIndex === index ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                        <input
                          type="text"
                          value={editedSubject}
                          onChange={(e) => setEditedSubject(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                        <textarea
                          value={editedBody}
                          onChange={(e) => setEditedBody(e.target.value)}
                          rows={12}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={saveEdit}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Subject:</div>
                        <div className="bg-gray-50 rounded p-3 text-sm">{email.subject}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Body:</div>
                        <div className="bg-gray-50 rounded p-3 text-sm whitespace-pre-wrap">{email.body}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Regenerate Email Modal */}
      {showRegenerateModal && regeneratingEmailIndex !== null && (
        <RegenerateEmailModal
          isOpen={showRegenerateModal}
          onClose={() => {
            setShowRegenerateModal(false)
            setRegeneratingEmailIndex(null)
          }}
          onRegenerate={handleRegenerateEmail}
          initialSubjectPrompt=""
          initialBodyPrompt=""
          initialDataSources={[]}
          contactName={`${contact?.first_name} ${contact?.last_name}`}
          companyName={companyName}
          sequenceStep={emails[regeneratingEmailIndex]?.sequence_step || 1}
        />
      )}
    </div>
  )
}