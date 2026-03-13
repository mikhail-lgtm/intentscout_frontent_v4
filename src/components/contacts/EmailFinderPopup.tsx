import React, { useState, useEffect } from 'react'
import { X, Search, CheckCircle, Mail, Loader2, AlertCircle, ExternalLink, UserPlus, UserMinus, Check } from 'lucide-react'
import { useEmailFinder } from '../../hooks/useEmailFinder'
import { useContacts } from '../../hooks/useContacts'

interface EmailFinderPopupProps {
  isOpen: boolean
  onClose: () => void
  signalId: string
  companyName: string
  onEmailsFound?: () => void
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

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center space-x-2">
      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      <div className="text-gray-600">
        <div className="font-medium">Finding email patterns...</div>
        <div className="text-sm text-gray-500">Analyzing company email formats and predicting contact emails</div>
      </div>
    </div>
  )
}

const EmailResultsListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="p-3 border border-gray-200 rounded-lg animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="w-20 h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export const EmailFinderPopup: React.FC<EmailFinderPopupProps> = ({
  isOpen,
  onClose,
  signalId,
  companyName,
  onEmailsFound
}) => {
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [updatedContacts, setUpdatedContacts] = useState<Set<string>>(new Set())
  
  const { 
    searchStatus, 
    isLoading, 
    error, 
    startSearch, 
    restartSearch,
    isSearchInProgress,
    hasResults,
    hasFailed 
  } = useEmailFinder(signalId)

  const { refetch: refetchContacts } = useContacts(signalId)

  // Handle successful search completion
  useEffect(() => {
    if (hasResults && !showSuccessAnimation) {
      setShowSuccessAnimation(true)
      setTimeout(() => setShowSuccessAnimation(false), 2000)
      
      // Refresh contacts to show updated emails
      refetchContacts()
      onEmailsFound?.()
    }
  }, [hasResults, showSuccessAnimation, refetchContacts, onEmailsFound])

  const handleStartSearch = async () => {
    try {
      await startSearch()
    } catch (err) {
      console.error('Failed to start email search:', err)
    }
  }

  const handleRestartSearch = async () => {
    try {
      await restartSearch()
    } catch (err) {
      console.error('Failed to restart email search:', err)
    }
  }

  const formatConfidenceScore = (score?: number): string => {
    if (!score) return 'Unknown'
    return `${Math.round(score * 100)}%`
  }

  const getConfidenceColor = (score?: number): string => {
    if (!score) return 'text-gray-500'
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Email Finder</h2>
            <span className="text-sm text-gray-500">• {companyName}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Success Animation */}
          {showSuccessAnimation && (
            <div className="text-center py-8">
              <ApplePayCheckmark />
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-green-800">Email patterns found!</h3>
                <p className="text-sm text-green-600 mt-1">
                  Successfully predicted emails for {searchStatus?.email_results?.filter(r => r.email_address).length || 0} contacts
                </p>
              </div>
            </div>
          )}

          {/* No Search State */}
          {!searchStatus && !isLoading && !error && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Email Addresses</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                We'll search for email patterns at <strong>{companyName}</strong> and predict 
                email addresses for your contacts using AI analysis.
              </p>
              <button
                onClick={handleStartSearch}
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Starting...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4" />
                    <span>Find Emails</span>
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Loading State */}
          {isSearchInProgress && !showSuccessAnimation && (
            <div className="text-center py-8">
              <LoadingSpinner />
              <div className="mt-6">
                <div className="text-sm text-gray-500">
                  Status: {searchStatus?.status === 'pending' ? 'Queued...' : 'Analyzing email patterns...'}
                </div>
                {searchStatus?.started_at && (
                  <div className="text-xs text-gray-400 mt-1">
                    Started {new Date(searchStatus.started_at).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error State */}
          {(error || hasFailed) && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Email search failed</h3>
              <p className="text-red-600 mb-6 max-w-md mx-auto">
                {error || searchStatus?.error_message || 'An unexpected error occurred while finding emails.'}
              </p>
              <button
                onClick={handleRestartSearch}
                disabled={isLoading}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Restarting...</span>
                  </div>
                ) : (
                  'Try Again'
                )}
              </button>
            </div>
          )}

          {/* Results State */}
          {hasResults && !showSuccessAnimation && searchStatus?.email_results && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Email Results ({searchStatus.email_results.filter(r => r.email_address).length} found)
                </h3>
                <div className="text-sm text-gray-500">
                  Confidence scores based on pattern analysis
                </div>
              </div>

              {/* Results List */}
              <div className="space-y-3">
                {searchStatus.email_results.map((result) => (
                  <div
                    key={result.contact_id}
                    className={`p-4 border rounded-lg transition-colors ${
                      result.email_address 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          result.email_address ? 'bg-green-100' : 'bg-gray-200'
                        }`}>
                          {result.email_address ? (
                            <Mail className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {result.first_name} {result.last_name}
                          </div>
                          <div className="text-sm text-gray-600">{result.job_title}</div>
                          {result.email_address && (
                            <div className="text-sm text-blue-600 font-mono">
                              {result.email_address}
                            </div>
                          )}
                          {!result.email_address && (
                            <div className="text-sm text-gray-500">
                              No email pattern could be determined
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {result.email_address && (
                          <div className={`text-sm font-medium ${getConfidenceColor(result.confidence_score)}`}>
                            {formatConfidenceScore(result.confidence_score)}
                          </div>
                        )}
                        {result.linkedin_contact && (
                          <a
                            href={result.linkedin_contact}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm inline-flex items-center space-x-1 mt-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>LinkedIn</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>Summary:</strong> Found {searchStatus.email_results.filter(r => r.email_address).length} emails 
                  out of {searchStatus.email_results.length} contacts. 
                  Emails have been automatically added to your contact records.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}