import React, { useState, useEffect, useRef } from 'react'
import { X, Search, CheckCircle, Users, Loader2, AlertCircle, ExternalLink, UserPlus, UserMinus, Check, Upload, FileSpreadsheet } from 'lucide-react'
import { useDecisionMakers } from '../../hooks/useDecisionMakers'
import { useContacts } from '../../hooks/useContacts'
import { DecisionMakersListSkeleton } from './DecisionMakerSkeleton'

interface DecisionMakerPopupProps {
  isOpen: boolean
  onClose: () => void
  signalId: string
  companyName: string
  onContactAdded?: () => void
}

const LinkedInIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

const ApplePayCheckmark: React.FC = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        {/* Background circle */}
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
          {/* Checkmark */}
          <CheckCircle className="w-8 h-8 text-white animate-bounce" />
        </div>
        {/* Success rings */}
        <div className="absolute inset-0 border-2 border-green-300 rounded-full animate-ping"></div>
        <div className="absolute inset-2 border-2 border-green-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  )
}

const LoadingSpinner: React.FC<{ message?: string; subtitle?: string }> = ({
  message = "Finding decision makers...",
  subtitle = "This usually takes around 2 minutes"
}) => {
  return (
    <div className="flex items-center justify-center space-x-2">
      <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      <div className="text-gray-600">
        <div className="font-medium">{message}</div>
        <div className="text-sm text-gray-500">{subtitle}</div>
      </div>
    </div>
  )
}

export const DecisionMakerPopup: React.FC<DecisionMakerPopupProps> = ({
  isOpen,
  onClose,
  signalId,
  companyName,
  onContactAdded
}) => {
  const [guidance, setGuidance] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set())
  const [importingAll, setImportingAll] = useState(false)
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [isScrapingLinkedIn, setIsScrapingLinkedIn] = useState(false)
  const [showLinkedInLoading, setShowLinkedInLoading] = useState(false)
  const [linkedInError, setLinkedInError] = useState<string | null>(null)
  const [linkedInInitialContactCount, setLinkedInInitialContactCount] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploadingCSV, setIsUploadingCSV] = useState(false)
  const [csvPreviewData, setCsvPreviewData] = useState<any[] | null>(null)
  const [csvError, setCsvError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const linkedinPollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Use the decision makers hook
  const {
    searchStatus,
    isLoading,
    error,
    startSearch,
    restartSearch,
    isSearchInProgress,
    hasResults,
    hasFailed
  } = useDecisionMakers(signalId)

  // Use contacts hook to track imported contacts
  const { contacts, refetch: refetchContacts } = useContacts(signalId)

  // Track which decision makers are already imported
  const [importedDecisionMakers, setImportedDecisionMakers] = useState<Set<string>>(new Set())

  // Update imported decision makers when contacts change
  useEffect(() => {
    const imported = new Set<string>()
    contacts.forEach(contact => {
      if (contact.decision_maker_id && contact.source === 'decision_maker_finder') {
        imported.add(contact.decision_maker_id)
      }
    })
    setImportedDecisionMakers(imported)
  }, [contacts])

  // Debug: Log when search status changes to help diagnose rendering issues
  useEffect(() => {
    console.log('DecisionMakerPopup: RENDER', {
      searchStatusExists: !!searchStatus,
      status: searchStatus?.status,
      dmCount: searchStatus?.decision_makers?.length || 0,
      isSearchInProgress,
      hasResults
    })
  }, [searchStatus, isSearchInProgress, hasResults])

  // Watch for contact changes during LinkedIn scraping
  useEffect(() => {
    if (showLinkedInLoading && contacts.length > linkedInInitialContactCount) {
      // New contact appeared (success or failure)
      console.log('LinkedIn scraping complete - contact appeared')

      // Check if the new contact is a failed scraping
      const newContact = contacts[contacts.length - 1]
      if (newContact && newContact.first_name === 'Failed' && newContact.last_name === 'Scraping') {
        // Show error message FIRST
        const errorMsg = newContact.job_title || 'LinkedIn scraping failed. Please check your BrightData configuration.'
        console.log('LinkedIn scraping failed:', errorMsg)
        setLinkedInError(errorMsg)

        // Then delete the failed contact from database so it doesn't appear in UI
        const deleteFailedContact = async () => {
          try {
            const { api } = await import('../../lib/apiClient')
            await api.contacts.delete(newContact.id)
            await refetchContacts() // Refresh to remove from UI
          } catch (err) {
            console.error('Failed to delete failed contact:', err)
          }
        }
        // Use setTimeout to ensure error is displayed first
        setTimeout(() => {
          deleteFailedContact()
        }, 100)

        // Close loading screen but keep modal open to show error
        setShowLinkedInLoading(false)
      } else {
        // Successful scraping - close modal completely
        console.log('LinkedIn scraping successful - closing modal')
        if (linkedinPollIntervalRef.current) {
          clearInterval(linkedinPollIntervalRef.current)
          linkedinPollIntervalRef.current = null
        }
        if (onContactAdded) {
          onContactAdded()
        }
        // Close the entire modal so user can see the new contact in the main list
        handleClose()
      }
    }
  }, [contacts.length, showLinkedInLoading, linkedInInitialContactCount, onContactAdded, contacts, refetchContacts])

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (linkedinPollIntervalRef.current) {
        clearInterval(linkedinPollIntervalRef.current)
      }
    }
  }, [])

  const handleStartSearch = async () => {
    const searchId = await startSearch(guidance)
    
    if (searchId) {
      // Show success animation
      setShowSuccess(true)
      
      // Hide success animation after 2 seconds
      setTimeout(() => {
        setShowSuccess(false)
      }, 2000)
    }
  }

  const handleImportDecisionMaker = async (dm: any) => {
    setImportingIds(prev => new Set([...prev, dm.id]))
    
    try {
      const { api } = await import('../../lib/apiClient')
      
      const response = await api.contacts.importDecisionMaker({
        signal_id: signalId,
        decision_maker_id: dm.id,
        first_name: dm.first_name,
        last_name: dm.last_name,
        job_title: dm.job_title,
        linkedin_url: dm.linkedin_url,
        why_reach_out: dm.why_reach_out
      })

      if (response.error) {
        throw new Error(response.error)
      }

      // Refresh contacts and notify parent
      await refetchContacts()
      if (onContactAdded) {
        onContactAdded()
      }

    } catch (err) {
      console.error('Failed to import decision maker:', err)
    } finally {
      setImportingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(dm.id)
        return newSet
      })
    }
  }

  const handleUnimportDecisionMaker = async (dm: any) => {
    setImportingIds(prev => new Set([...prev, dm.id]))
    
    try {
      const { api } = await import('../../lib/apiClient')
      
      // Find the contact to delete
      const contact = contacts.find(c => c.decision_maker_id === dm.id)
      if (!contact) {
        throw new Error('Contact not found')
      }

      const response = await api.contacts.delete(contact.id)

      if (response.error) {
        throw new Error(response.error)
      }

      // Refresh contacts and notify parent
      await refetchContacts()
      if (onContactAdded) {
        onContactAdded()
      }

    } catch (err) {
      console.error('Failed to unimport decision maker:', err)
    } finally {
      setImportingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(dm.id)
        return newSet
      })
    }
  }

  const handleImportAll = async () => {
    if (!searchStatus?.decision_makers) return

    setImportingAll(true)
    
    try {
      const { api } = await import('../../lib/apiClient')
      
      // Import all non-imported decision makers using bulk import
      const toImport = searchStatus.decision_makers.filter(dm => !importedDecisionMakers.has(dm.id))
      
      if (toImport.length === 0) {
        console.log('No decision makers to import')
        return
      }

      // Use bulk import for much faster performance
      const response = await api.contacts.bulkImportDecisionMakers({
        signal_id: signalId,
        decision_makers: toImport.map(dm => ({
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

      const importedCount = (response.data as any)?.imported_count || toImport.length
      console.log(`Successfully imported ${importedCount} decision makers`)

      // Refresh contacts and notify parent
      await refetchContacts()
      if (onContactAdded) {
        onContactAdded()
      }

    } catch (err) {
      console.error('Failed to bulk import decision makers:', err)
    } finally {
      setImportingAll(false)
    }
  }

  const handleAddFromLinkedIn = async () => {
    if (!linkedinUrl.trim()) {
      setLinkedInError('Please enter a LinkedIn URL')
      return
    }

    setIsScrapingLinkedIn(true)
    setLinkedInError(null)

    try {
      const { api } = await import('../../lib/apiClient')

      // Create a temporary contact first to get contact_id
      const tempContact = await api.contacts.create({
        signal_id: signalId,
        first_name: 'Pending',
        last_name: 'LinkedIn Scrape',
        job_title: '',
        linkedin_contact: linkedinUrl.trim(),
        source: 'manual'
      })

      console.log('Create contact response:', tempContact)

      if (tempContact.error) {
        const errorMsg = typeof tempContact.error === 'string'
          ? tempContact.error
          : JSON.stringify(tempContact.error)
        console.error('Contact creation failed:', errorMsg)
        throw new Error(errorMsg)
      }

      const contactId = (tempContact.data as any).id

      // Trigger LinkedIn scraping for this contact
      const scrapingResponse = await api.linkedInScraping.scrape({
        contacts: [{
          id: contactId,
          first_name: 'Pending',
          last_name: 'LinkedIn Scrape',
          linkedin_contact: linkedinUrl.trim()
        }],
        signal_id: signalId
      })

      if (scrapingResponse.error) {
        const errorMsg = typeof scrapingResponse.error === 'string'
          ? scrapingResponse.error
          : JSON.stringify(scrapingResponse.error)
        throw new Error(errorMsg)
      }

      // Clear input and show loading screen
      setLinkedinUrl('')
      setIsScrapingLinkedIn(false)
      setLinkedInInitialContactCount(contacts.length) // Save initial count
      setShowLinkedInLoading(true)

      // Clear any existing polling interval
      if (linkedinPollIntervalRef.current) {
        clearInterval(linkedinPollIntervalRef.current)
      }

      // Poll for updates - refresh contacts every 5 seconds for 2 minutes
      let pollCount = 0
      const maxPolls = 24 // 2 minutes (5 seconds * 24 = 120 seconds)

      linkedinPollIntervalRef.current = setInterval(async () => {
        pollCount++
        await refetchContacts()

        // Timeout fallback - stop after 2 minutes even if no contact appeared
        if (pollCount >= maxPolls) {
          console.log('LinkedIn scraping timeout - stopping polling')
          if (linkedinPollIntervalRef.current) {
            clearInterval(linkedinPollIntervalRef.current)
            linkedinPollIntervalRef.current = null
          }
          setShowLinkedInLoading(false)
          if (onContactAdded) {
            onContactAdded()
          }
        }
      }, 5000)

    } catch (err: any) {
      console.error('Failed to add from LinkedIn:', err)
      let errorMessage = 'Failed to scrape LinkedIn profile'

      if (typeof err === 'string') {
        errorMessage = err
      } else if (err?.message) {
        errorMessage = err.message
      } else if (err?.error) {
        errorMessage = typeof err.error === 'string' ? err.error : JSON.stringify(err.error)
      }

      setLinkedInError(errorMessage)
      setIsScrapingLinkedIn(false)
      setShowLinkedInLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const validTypes = ['.csv', '.xlsx', '.xls']
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

    if (!validTypes.includes(fileExt)) {
      setCsvError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)')
      return
    }

    setUploadedFile(file)
    setCsvError(null)
    setIsUploadingCSV(true)

    try {
      const { api } = await import('../../lib/apiClient')

      // Upload file to backend for parsing
      const formData = new FormData()
      formData.append('file', file)
      formData.append('signal_id', signalId)

      const response = await api.post('/contacts/parse-csv', formData)

      if (response.error) {
        throw new Error(response.error)
      }

      // Show preview
      setCsvPreviewData((response.data as any).contacts || [])

    } catch (err: any) {
      console.error('Failed to parse CSV:', err)
      setCsvError(err.message || 'Failed to parse file')
    } finally {
      setIsUploadingCSV(false)
    }
  }

  const handleImportFromCSV = async () => {
    if (!csvPreviewData || csvPreviewData.length === 0) return

    setIsUploadingCSV(true)

    try {
      const { api } = await import('../../lib/apiClient')

      // Bulk import contacts
      const response = await api.contacts.bulkCreate({
        signal_id: signalId,
        contacts: csvPreviewData
      })

      if (response.error) {
        throw new Error(response.error)
      }

      // Clear and refresh
      setUploadedFile(null)
      setCsvPreviewData(null)
      await refetchContacts()

      if (onContactAdded) {
        onContactAdded()
      }

      alert(`Successfully imported ${csvPreviewData.length} contacts!`)

    } catch (err: any) {
      console.error('Failed to import contacts:', err)
      setCsvError(err.message || 'Failed to import contacts')
    } finally {
      setIsUploadingCSV(false)
    }
  }

  const handleClose = () => {
    setGuidance('')
    setShowSuccess(false)
    setImportingIds(new Set())
    setLinkedinUrl('')
    setLinkedInError(null)
    setShowLinkedInLoading(false)
    setLinkedInInitialContactCount(0)
    setUploadedFile(null)
    setCsvPreviewData(null)
    setCsvError(null)
    // Clear LinkedIn polling interval
    if (linkedinPollIntervalRef.current) {
      clearInterval(linkedinPollIntervalRef.current)
      linkedinPollIntervalRef.current = null
    }
    onClose()
  }

  const renderContent = () => {
    // Show success animation
    if (showSuccess) {
      return (
        <div className="text-center py-16">
          <ApplePayCheckmark />
          <div className="mt-6">
            <h3 className="text-xl font-semibold text-gray-900">Search Started!</h3>
            <p className="text-gray-600 mt-3 leading-relaxed">Finding decision makers at {companyName}</p>
          </div>
        </div>
      )
    }

    // Show LinkedIn scraping loading state
    if (showLinkedInLoading) {
      return (
        <div>
          <div className="text-center py-8">
            <LoadingSpinner
              message="Scraping LinkedIn profile..."
              subtitle="This usually takes 1-2 minutes"
            />
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800 leading-relaxed">
                We're extracting contact information from the LinkedIn profile. The contact will appear automatically when complete.
              </p>
            </div>
          </div>
          <div className="mt-8">
            <DecisionMakersListSkeleton count={1} />
          </div>
        </div>
      )
    }

    // Show AI search loading state
    if (isSearchInProgress) {
      return (
        <div>
          <div className="text-center py-8">
            <LoadingSpinner />
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800 leading-relaxed">
                We're analyzing job postings, LinkedIn profiles, and company information to find the best contacts at {companyName}.
              </p>
            </div>
          </div>
          <div className="mt-8">
            <DecisionMakersListSkeleton count={5} />
          </div>
        </div>
      )
    }

    // Show results
    if (hasResults) {
      const totalDMs = searchStatus?.decision_makers.length || 0
      const importedCount = searchStatus?.decision_makers.filter(dm => importedDecisionMakers.has(dm.id)).length || 0
      const canImportAll = totalDMs > importedCount

      return (
        <div className="space-y-6">
          {/* Manual Options - Always show */}
          <div className="space-y-4">
            {/* LinkedIn URL Input */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Add from LinkedIn URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={linkedinUrl}
                  onChange={(e) => {
                    setLinkedinUrl(e.target.value)
                    setLinkedInError(null)
                  }}
                  placeholder="https://www.linkedin.com/in/username"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                />
                <button
                  onClick={handleAddFromLinkedIn}
                  disabled={isScrapingLinkedIn}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                >
                  {isScrapingLinkedIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <LinkedInIcon className="w-4 h-4" />
                      Add
                    </>
                  )}
                </button>
              </div>
              {linkedInError && (
                <p className="text-xs text-red-600 mt-2">{linkedInError}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Paste a LinkedIn profile URL to automatically extract and add contact details
              </p>
            </div>

            {/* CSV/Spreadsheet Upload */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Upload Spreadsheet
              </label>

              {!csvPreviewData ? (
                <>
                  <div
                    onDrop={handleFileDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
                  >
                    {isUploadingCSV ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        <p className="text-sm text-gray-600">Parsing file...</p>
                      </div>
                    ) : uploadedFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileSpreadsheet className="w-8 h-8 text-green-600" />
                        <p className="text-sm text-gray-900 font-medium">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-500">Click to change file</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          Drop CSV or Excel file here, or click to browse
                        </p>
                        <p className="text-xs text-gray-500">Supports .csv, .xlsx, .xls files</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {csvError && (
                    <p className="text-xs text-red-600 mt-2">{csvError}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Required columns: first_name, last_name, job_title (optional: email, linkedin_url)
                  </p>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-900">
                        {csvPreviewData.length} contacts ready to import
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setCsvPreviewData(null)
                        setUploadedFile(null)
                      }}
                      className="text-xs text-gray-600 hover:text-gray-900"
                    >
                      Change file
                    </button>
                  </div>

                  {/* Preview table */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Title</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">Email</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {csvPreviewData.slice(0, 10).map((contact, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 text-gray-900">{contact.first_name} {contact.last_name}</td>
                            <td className="px-3 py-2 text-gray-600">{contact.job_title || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{contact.email_address || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvPreviewData.length > 10 && (
                      <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 text-center">
                        And {csvPreviewData.length - 10} more contacts...
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleImportFromCSV}
                    disabled={isUploadingCSV}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    {isUploadingCSV ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Import {csvPreviewData.length} Contacts
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">AI Found Decision Makers</span>
            </div>
          </div>

          {/* AI Search Results */}
          <div>
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {totalDMs} Decision Makers from AI Search
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {importedCount} imported • Ready for outreach at {companyName}
                  </p>
                </div>
                {canImportAll && (
                  <button
                    onClick={handleImportAll}
                    disabled={importingAll}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importingAll ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3" />
                        Import All
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {searchStatus?.decision_makers.map((dm) => {
                const isImported = importedDecisionMakers.has(dm.id)
                const isProcessing = importingIds.has(dm.id)

                return (
                  <div key={dm.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {dm.first_name} {dm.last_name}
                          </h4>
                          {isImported && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Imported
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-xs mt-0.5">{dm.job_title}</p>
                        <p className="text-gray-500 text-xs mt-1 line-clamp-2">{dm.why_reach_out}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-3">
                        <button
                          onClick={() => isImported ? handleUnimportDecisionMaker(dm) : handleImportDecisionMaker(dm)}
                          disabled={isProcessing}
                          className={`flex items-center justify-center w-7 h-7 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isImported
                              ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                              : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                          }`}
                          title={isImported ? "Remove from Contacts" : "Add to Contacts"}
                        >
                          {isProcessing ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isImported ? (
                            <UserMinus className="w-3 h-3" />
                          ) : (
                            <UserPlus className="w-3 h-3" />
                          )}
                        </button>
                        <a
                          href={dm.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors group"
                          title="View LinkedIn Profile"
                        >
                          <LinkedInIcon className="w-3.5 h-3.5" />
                          <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
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
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Search Failed</h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
            {searchStatus?.error_message || error || 'Something went wrong while finding decision makers.'}
          </p>
          <button
            onClick={restartSearch}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
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
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Find Decision Makers</h3>
          <p className="text-gray-600">Discover the right contacts at {companyName}</p>
        </div>

        <div className="space-y-6">
          {/* LinkedIn URL Input */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Add from LinkedIn URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={linkedinUrl}
                onChange={(e) => {
                  setLinkedinUrl(e.target.value)
                  setLinkedInError(null)
                }}
                placeholder="https://www.linkedin.com/in/username"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
              <button
                onClick={handleAddFromLinkedIn}
                disabled={isScrapingLinkedIn}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
              >
                {isScrapingLinkedIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <LinkedInIcon className="w-4 h-4" />
                    Add
                  </>
                )}
              </button>
            </div>
            {linkedInError && (
              <p className="text-xs text-red-600 mt-2">{linkedInError}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Paste a LinkedIn profile URL to automatically extract and add contact details
            </p>
          </div>

          {/* CSV/Spreadsheet Upload */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Upload Spreadsheet
            </label>

            {!csvPreviewData ? (
              <>
                <div
                  onDrop={handleFileDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
                >
                  {isUploadingCSV ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                      <p className="text-sm text-gray-600">Parsing file...</p>
                    </div>
                  ) : uploadedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet className="w-8 h-8 text-green-600" />
                      <p className="text-sm text-gray-900 font-medium">{uploadedFile.name}</p>
                      <p className="text-xs text-gray-500">Click to change file</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        Drop CSV or Excel file here, or click to browse
                      </p>
                      <p className="text-xs text-gray-500">Supports .csv, .xlsx, .xls files</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {csvError && (
                  <p className="text-xs text-red-600 mt-2">{csvError}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Required columns: first_name, last_name, job_title (optional: email, linkedin_url)
                </p>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {csvPreviewData.length} contacts ready to import
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setCsvPreviewData(null)
                      setUploadedFile(null)
                    }}
                    className="text-xs text-gray-600 hover:text-gray-900"
                  >
                    Change file
                  </button>
                </div>

                {/* Preview table */}
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left">Name</th>
                        <th className="px-2 py-1 text-left">Title</th>
                        <th className="px-2 py-1 text-left">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreviewData.slice(0, 10).map((contact, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-2 py-1">{contact.first_name} {contact.last_name}</td>
                          <td className="px-2 py-1">{contact.job_title || '-'}</td>
                          <td className="px-2 py-1">{contact.email || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvPreviewData.length > 10 && (
                    <div className="px-2 py-1 text-xs text-gray-500 bg-gray-50 text-center">
                      +{csvPreviewData.length - 10} more contacts
                    </div>
                  )}
                </div>

                <button
                  onClick={handleImportFromCSV}
                  disabled={isUploadingCSV}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                >
                  {isUploadingCSV ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Import {csvPreviewData.length} Contacts
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or use AI search</span>
            </div>
          </div>

          {/* AI Search Guidance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Additional Guidance (Optional)
            </label>
            <textarea
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              placeholder="e.g., Focus on CTOs and VPs of Engineering, or target procurement decision makers..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none text-sm"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-2">
              Help us target specific roles or departments for better results
            </p>
          </div>

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
              onClick={handleStartSearch}
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting...
                </>
              ) : (
                'Start Finding'
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
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Search className="w-4 h-4 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Decision Maker Finder</h2>
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