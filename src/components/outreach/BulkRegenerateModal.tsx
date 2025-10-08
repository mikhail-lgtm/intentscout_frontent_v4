import React, { useState, useEffect } from 'react'
import { X, RotateCcw, Loader2, CheckCircle, AlertCircle, Users } from 'lucide-react'
import { DataSourcesEditor } from '../sequences/DataSourcesEditor'
import { DataSourceConfig, SequenceBlockType } from '../../types/sequences'

interface BulkRegenerateModalProps {
  isOpen: boolean
  onClose: () => void
  onRegenerate: (data: {
    subject_prompt: string
    body_prompt: string
    data_sources: DataSourceConfig[]
  }) => Promise<void>
  initialSubjectPrompt?: string
  initialBodyPrompt?: string
  initialDataSources?: DataSourceConfig[]
  companyName?: string
  contactCount: number
}

export const BulkRegenerateModal: React.FC<BulkRegenerateModalProps> = ({
  isOpen,
  onClose,
  onRegenerate,
  initialSubjectPrompt = '',
  initialBodyPrompt = '',
  initialDataSources = [],
  companyName = 'all contacts',
  contactCount = 0
}) => {
  const [subjectPrompt, setSubjectPrompt] = useState(initialSubjectPrompt)
  const [bodyPrompt, setBodyPrompt] = useState(initialBodyPrompt)
  const [dataSources, setDataSources] = useState<DataSourceConfig[]>(initialDataSources)
  const [isRegenerating, setIsRegenerating] = useState(false)

  // Update form when initial values change
  useEffect(() => {
    setSubjectPrompt(initialSubjectPrompt)
    setBodyPrompt(initialBodyPrompt)
    setDataSources(initialDataSources)
  }, [initialSubjectPrompt, initialBodyPrompt, initialDataSources])

  if (!isOpen) return null

  const handleRegenerate = async () => {
    // Validation
    if (!subjectPrompt.trim() || !bodyPrompt.trim()) {
      alert('Please enter both subject and body prompts')
      return
    }

    // Confirmation
    const confirmed = window.confirm(
      `This will regenerate emails for all ${contactCount} contacts. This may take several minutes. Continue?`
    )

    if (!confirmed) {
      return
    }

    setIsRegenerating(true)
    try {
      await onRegenerate({
        subject_prompt: subjectPrompt,
        body_prompt: bodyPrompt,
        data_sources: dataSources
      })

      // Close after successful regeneration
      onClose()
    } catch (error) {
      console.error('Failed to bulk regenerate emails:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to regenerate emails: ${errorMessage}`)
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-orange-50 border-orange-200 border-opacity-30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Bulk Regenerate Emails
                </h2>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {contactCount} contacts at {companyName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Regenerate All
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                disabled={isRegenerating}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="space-y-6">
              {/* Warning Banner */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Bulk regeneration will affect all contacts</p>
                    <p className="text-yellow-700">
                      This will regenerate emails for all {contactCount} contacts using the same prompts.
                      This process may take several minutes depending on the number of contacts.
                      All existing emails will be replaced with newly generated content.
                    </p>
                  </div>
                </div>
              </div>

              {/* Subject Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Line Prompt *
                </label>
                <textarea
                  value={subjectPrompt}
                  onChange={(e) => setSubjectPrompt(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Example: Write a compelling subject line for an outbound email to {{first_name}} at {{company_name}}. Keep it professional and engaging."
                  disabled={isRegenerating}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This prompt will be used for all {contactCount} contacts. Use variables like {'{{first_name}}'}, {'{{company_name}}'}, {'{{job_title}}'}
                </p>
              </div>

              {/* Body Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Body Prompt *
                </label>
                <textarea
                  value={bodyPrompt}
                  onChange={(e) => setBodyPrompt(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Example: Write a professional outbound email to {{first_name}} at {{company_name}}. Keep it concise (under 150 words), focus on their pain points, and include a clear call to action."
                  disabled={isRegenerating}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Describe the tone, style, and content you want for all emails. Be specific about length, focus areas, and call to action.
                </p>
              </div>

              {/* Data Sources Configuration */}
              <DataSourcesEditor
                blockType={SequenceBlockType.EMAIL}
                dataSources={dataSources}
                onDataSourcesChange={setDataSources}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
