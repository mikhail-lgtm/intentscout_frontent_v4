import { useState, useEffect } from 'react'
import { Mail, Save, FileText, HelpCircle } from 'lucide-react'
import { api } from '../../lib/apiClient'

interface EmailNotesProps {
  signalId?: string
  companyName?: string
}

export const EmailDrafting = ({ 
  signalId, 
  companyName
}: EmailNotesProps) => {
  const [emailFooterName, setEmailFooterName] = useState('')
  const [emailFooterCompany, setEmailFooterCompany] = useState('')
  const [otherNotes, setOtherNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Load existing notes
  useEffect(() => {
    const loadNotes = async () => {
      if (!signalId) return
      
      try {
        const response = await api.signalNotes.get(signalId)
        if (response.data) {
          setEmailFooterName(response.data.email_footer_name || '')
          setEmailFooterCompany(response.data.email_footer_company || '')
          setOtherNotes(response.data.other_notes || '')
        }
      } catch (error) {
        console.error('Failed to load notes:', error)
      }
    }
    
    loadNotes()
  }, [signalId])

  const saveNotes = async () => {
    if (!signalId) return
    
    setIsSaving(true)
    try {
      await api.signalNotes.save({
        signal_id: signalId,
        email_footer_name: emailFooterName.trim() || undefined,
        email_footer_company: emailFooterCompany.trim() || undefined,
        other_notes: otherNotes.trim() || undefined
      })
      setLastSaved(new Date())
    } catch (error) {
      console.error('Failed to save notes:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4">
        <h3 className="font-semibold text-gray-900">Email Notes</h3>
      </div>

      {/* Content - Now scrollable */}
      <div className="flex-1 p-6 flex flex-col space-y-4 overflow-y-auto">
        {/* Other Notes - Moved to top */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Other Notes
            </label>
            <div className="relative group">
              <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                General notes for email personalization
              </div>
            </div>
          </div>
          <textarea
            value={otherNotes}
            onChange={(e) => setOtherNotes(e.target.value)}
            placeholder="Add any additional notes for email personalization..."
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[120px]"
          />
        </div>

        {/* Email Footer Instructions - Moved below Other Notes */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              Email Footer Instructions
            </label>
            <div className="relative group">
              <HelpCircle className="w-3 h-3 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                Instructions for AI on email footer content
              </div>
            </div>
          </div>
          <textarea
            value={emailFooterName}
            onChange={(e) => setEmailFooterName(e.target.value)}
            placeholder="e.g., Sign emails as John Smith from Acme Corp, include phone number..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[80px]"
          />
        </div>

        {/* Last saved indicator */}
        {lastSaved && (
          <div className="text-xs text-gray-500">
            Last saved: {lastSaved.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex-shrink-0 p-6 border-t border-gray-200">
        <button
          onClick={saveNotes}
          disabled={isSaving || !signalId}
          className={`w-full px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-2 ${
            !signalId
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Notes
            </>
          )}
        </button>
      </div>
    </div>
  )
}