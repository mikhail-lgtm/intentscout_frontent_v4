import React, { useState, useEffect } from 'react'
import { X, Save, RotateCcw, Mail, Sparkles } from 'lucide-react'
import { DataSourcesEditor } from '../sequences/DataSourcesEditor'
import { DataSourceConfig, SequenceBlockType } from '../../types/sequences'

interface RegenerateEmailModalProps {
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
  contactName?: string
  companyName?: string
  sequenceStep?: number
}

export const RegenerateEmailModal: React.FC<RegenerateEmailModalProps> = ({
  isOpen,
  onClose,
  onRegenerate,
  initialSubjectPrompt = '',
  initialBodyPrompt = '',
  initialDataSources = [],
  contactName = 'Contact',
  companyName = 'Company',
  sequenceStep = 1
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
      console.error('Failed to regenerate email:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to regenerate email: ${errorMessage}`)
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
                  Regenerate Email
                </h2>
                <p className="text-sm text-gray-600">
                  Step {sequenceStep} for {contactName} at {companyName}
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
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Regenerate
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="space-y-6">
              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Modify prompts to regenerate email</p>
                    <p className="text-blue-700">
                      Update the prompts below and adjust data sources to generate a new version of this email.
                      The original email will be replaced with the newly generated content.
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
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="AI prompt for generating email subject lines..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use variables like {'{{first_name}}'}, {'{{company_name}}'}, {'{{job_title}}'} in your prompt
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
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="AI prompt for generating email content..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Describe the tone, style, and content you want the AI to generate
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
