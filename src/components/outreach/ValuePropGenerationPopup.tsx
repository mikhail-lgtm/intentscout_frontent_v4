import React, { useState } from 'react'
import { X, AlertTriangle, Loader2, CheckCircle, Lightbulb } from 'lucide-react'
import { api } from '../../lib/apiClient'

interface ValuePropGenerationPopupProps {
  isOpen: boolean
  onClose: () => void
  signalId: string
  companyName: string
  onValuePropGenerated: (valueProp: string) => void
  hasExistingContent: boolean
}

export const ValuePropGenerationPopup: React.FC<ValuePropGenerationPopupProps> = ({
  isOpen,
  onClose,
  signalId,
  companyName,
  onValuePropGenerated,
  hasExistingContent
}) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedValueProp, setGeneratedValueProp] = useState<string | null>(null)
  const [customGuidance, setCustomGuidance] = useState('')

  const handleGenerate = async () => {
    try {
      setIsGenerating(true)
      setError(null)
      
      const response = await api.coactor.generateValueProp({
        signal_id: signalId,
        custom_guidance: customGuidance.trim() || undefined
      })
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      const data = response.data as any
      if (data && data.value_proposition) {
        setGeneratedValueProp(data.value_proposition)
      } else {
        throw new Error('No value proposition returned')
      }
    } catch (err) {
      console.error('Failed to generate value proposition:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate value proposition')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAccept = () => {
    if (generatedValueProp) {
      onValuePropGenerated(generatedValueProp)
      onClose()
    }
  }

  const handleCancel = () => {
    setGeneratedValueProp(null)
    setError(null)
    setCustomGuidance('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">Generate Value Proposition</h2>
            <span className="text-sm text-gray-500">• {companyName}</span>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Warning if existing content */}
          {hasExistingContent && !generatedValueProp && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Override Existing Content</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    You have existing content in the "Our Offer/Value Prop" field. 
                    Generating a new value proposition will replace this content.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Generation States */}
          {!isGenerating && !generatedValueProp && !error && (
            <div className="py-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Value Proposition Generator</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Our AI will analyze <strong>{companyName}</strong>'s intent signal and generate a 
                  tailored value proposition for Customer Times.
                </p>
              </div>

              {/* Custom Guidance Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Guidance (Optional)
                </label>
                <textarea
                  value={customGuidance}
                  onChange={(e) => setCustomGuidance(e.target.value)}
                  placeholder="Provide any specific details about your value proposition, key benefits to highlight, or context that would help generate a more targeted offer..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-y"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This guidance will be included in the AI prompt to create a more personalized value proposition.
                </p>
              </div>

              <div className="text-center">
                <button
                  onClick={handleGenerate}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Generate Value Proposition
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isGenerating && (
            <div className="text-center py-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                <div className="text-gray-600">
                  <div className="font-medium">Analyzing signal and generating value proposition...</div>
                  <div className="text-sm text-gray-500">This may take 30-60 seconds</div>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Generation Failed</h3>
              <p className="text-red-600 mb-6 max-w-md mx-auto">
                {error}
              </p>
              <button
                onClick={handleGenerate}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Success State */}
          {generatedValueProp && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Generated Value Proposition</h3>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {generatedValueProp}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-800">
                  <strong>Preview:</strong> This value proposition will be saved to the "Our Offer/Value Prop" 
                  field and can be used for email personalization.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleCancel}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          
          {generatedValueProp && (
            <button
              onClick={handleAccept}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Use This Value Proposition
            </button>
          )}
        </div>
      </div>
    </div>
  )
}