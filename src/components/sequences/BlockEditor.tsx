import React, { useState, useEffect } from 'react'
import { X, Save, Mail, MessageCircle, UserPlus, Phone, CheckSquare, Clock, Settings } from 'lucide-react'
import { SequenceBlock, SequenceBlockType } from '../../types/sequences'
import { DataSourcesEditor } from './DataSourcesEditor'

interface BlockEditorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (block: SequenceBlock) => Promise<void>
  block: SequenceBlock
}

export const BlockEditor: React.FC<BlockEditorProps> = ({ isOpen, onClose, onSave, block }) => {
  const [formData, setFormData] = useState<SequenceBlock>(block)
  const [isSaving, setIsSaving] = useState(false)

  // Update form data when block changes
  useEffect(() => {
    setFormData(block)
  }, [block])

  if (!isOpen) return null

  const getBlockIcon = (type: SequenceBlockType) => {
    switch (type) {
      case SequenceBlockType.EMAIL:
        return <Mail className="w-6 h-6" />
      case SequenceBlockType.LINKEDIN_MESSAGE:
        return <MessageCircle className="w-6 h-6" />
      case SequenceBlockType.LINKEDIN_CONNECTION:
        return <UserPlus className="w-6 h-6" />
      case SequenceBlockType.PHONE_CALL:
        return <Phone className="w-6 h-6" />
      case SequenceBlockType.TASK:
        return <CheckSquare className="w-6 h-6" />
      case SequenceBlockType.WAIT:
        return <Clock className="w-6 h-6" />
      default:
        return <Settings className="w-6 h-6" />
    }
  }

  const getBlockColor = (type: SequenceBlockType) => {
    switch (type) {
      case SequenceBlockType.EMAIL:
        return 'bg-blue-50 border-blue-200 text-blue-700'
      case SequenceBlockType.LINKEDIN_MESSAGE:
        return 'bg-indigo-50 border-indigo-200 text-indigo-700'
      case SequenceBlockType.LINKEDIN_CONNECTION:
        return 'bg-purple-50 border-purple-200 text-purple-700'
      case SequenceBlockType.PHONE_CALL:
        return 'bg-green-50 border-green-200 text-green-700'
      case SequenceBlockType.TASK:
        return 'bg-orange-50 border-orange-200 text-orange-700'
      case SequenceBlockType.WAIT:
        return 'bg-gray-50 border-gray-200 text-gray-700'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  const getBlockTypeLabel = (type: SequenceBlockType) => {
    switch (type) {
      case SequenceBlockType.EMAIL:
        return 'Email'
      case SequenceBlockType.LINKEDIN_MESSAGE:
        return 'LinkedIn Message'
      case SequenceBlockType.LINKEDIN_CONNECTION:
        return 'LinkedIn Connection'
      case SequenceBlockType.PHONE_CALL:
        return 'Phone Call'
      case SequenceBlockType.TASK:
        return 'Task'
      case SequenceBlockType.WAIT:
        return 'Wait Period'
      default:
        return 'Unknown'
    }
  }

  const handleSave = async () => {
    // Validate email blocks
    if (formData.block_type === SequenceBlockType.EMAIL) {
      if (!formData.config.subject_prompt?.trim() || !formData.config.body_prompt?.trim()) {
        alert('Please enter both subject and body prompts for email blocks')
        return
      }
    }

    setIsSaving(true)
    try {
      // Save the block (SequenceEditor will handle backend save)
      await onSave(formData)
      
      // Only close after successful save
      onClose()
    } catch (error) {
      console.error('Failed to save block:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to save block: ${errorMessage}`)
    } finally {
      setIsSaving(false)
    }
  }

  const updateFormData = (updates: Partial<SequenceBlock>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const updateConfig = (configUpdates: Partial<typeof formData.config>) => {
    setFormData(prev => ({
      ...prev,
      config: { ...prev.config, ...configUpdates }
    }))
  }

  const renderBlockSpecificFields = () => {
    switch (formData.block_type) {
      case SequenceBlockType.EMAIL:
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Line Prompt *
              </label>
              <textarea
                value={formData.config.subject_prompt || ''}
                onChange={(e) => updateConfig({ subject_prompt: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="AI prompt for generating email subject lines..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Use variables like {'{{first_name}}'}, {'{{company_name}}'}, {'{{job_title}}'} in your prompt
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Body Prompt *
              </label>
              <textarea
                value={formData.config.body_prompt || ''}
                onChange={(e) => updateConfig({ body_prompt: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="AI prompt for generating email content..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Describe the tone, style, and content you want the AI to generate
              </p>
            </div>
          </>
        )

      case SequenceBlockType.LINKEDIN_MESSAGE:
      case SequenceBlockType.LINKEDIN_CONNECTION:
      case SequenceBlockType.PHONE_CALL:
      case SequenceBlockType.TASK:
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              {getBlockIcon(formData.block_type)}
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {getBlockTypeLabel(formData.block_type)} Step
            </h4>
            <p className="text-gray-600 max-w-md mx-auto">
              This step will be executed manually or through integrations. No AI content generation is required.
            </p>
          </div>
        )

      case SequenceBlockType.WAIT:
        return (
          <div className="text-center py-6">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              Wait blocks only require delay configuration
            </p>
          </div>
        )

      default:
        return null
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
          <div className={`flex items-center justify-between p-6 border-b ${getBlockColor(formData.block_type)} border-opacity-30`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${getBlockColor(formData.block_type)} rounded-lg flex items-center justify-center border`}>
                {getBlockIcon(formData.block_type)}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Edit {getBlockTypeLabel(formData.block_type)}
                </h2>
                <p className="text-sm text-gray-600">Step {formData.step_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
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
              {/* Block-Specific Configuration */}
              {formData.block_type !== SequenceBlockType.WAIT && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getBlockTypeLabel(formData.block_type)} Configuration
                  </h3>
                  {renderBlockSpecificFields()}
                </div>
              )}

              {/* Data Sources Configuration - Only for Email blocks */}
              {formData.block_type === SequenceBlockType.EMAIL && (
                <DataSourcesEditor
                  blockType={formData.block_type}
                  dataSources={formData.config.data_sources || []}
                  onDataSourcesChange={(sources) => updateConfig({ data_sources: sources })}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}