import React, { useState, useEffect } from 'react'
import { X, Plus, Loader2, CheckCircle } from 'lucide-react'

interface Contact {
  id: string
  first_name: string
  last_name: string
  job_title: string
  linkedin_contact: string
  email_address: string | null
  direct_phone: string | null
  mobile_phone: string | null
  person_city: string | null
  person_state: string | null
  country: string | null
  notes: string
  source: string
  decision_maker_id?: string
}

interface AddContactPopupProps {
  isOpen: boolean
  onClose: () => void
  onContactAdded: () => void
  signalId: string
  companyName: string
  editingContact?: Contact
  mode?: 'modal' | 'inline'
}

interface ContactFormData {
  first_name: string
  last_name: string
  job_title: string
  linkedin_contact: string
  email_address: string
  direct_phone: string
  mobile_phone: string
  person_city: string
  person_state: string
  country: string
  notes: string
}

export const AddContactPopup: React.FC<AddContactPopupProps> = ({
  isOpen,
  onClose,
  onContactAdded,
  signalId,
  companyName,
  editingContact,
  mode = 'modal'
}) => {
  const [formData, setFormData] = useState<ContactFormData>({
    first_name: '',
    last_name: '',
    job_title: '',
    linkedin_contact: '',
    email_address: '',
    direct_phone: '',
    mobile_phone: '',
    person_city: '',
    person_state: '',
    country: '',
    notes: ''
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const isEditing = !!editingContact

  // Initialize form data when editing contact
  useEffect(() => {
    if (editingContact) {
      setFormData({
        first_name: editingContact.first_name,
        last_name: editingContact.last_name,
        job_title: editingContact.job_title,
        linkedin_contact: editingContact.linkedin_contact || '',
        email_address: editingContact.email_address || '',
        direct_phone: editingContact.direct_phone || '',
        mobile_phone: editingContact.mobile_phone || '',
        person_city: editingContact.person_city || '',
        person_state: editingContact.person_state || '',
        country: editingContact.country || '',
        notes: editingContact.notes || ''
      })
    } else {
      // Reset to empty form for new contact
      setFormData({
        first_name: '',
        last_name: '',
        job_title: '',
        linkedin_contact: '',
        email_address: '',
        direct_phone: '',
        mobile_phone: '',
        person_city: '',
        person_state: '',
        country: '',
        notes: ''
      })
    }
  }, [editingContact])

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.job_title) {
      setError('First name, last name, and job title are required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { api } = await import('../../lib/apiClient')
      
      const contactData = {
        signal_id: signalId,
        first_name: formData.first_name,
        last_name: formData.last_name,
        job_title: formData.job_title,
        linkedin_contact: formData.linkedin_contact || '',
        email_address: formData.email_address || null,
        direct_phone: formData.direct_phone || null,
        mobile_phone: formData.mobile_phone || null,
        person_city: formData.person_city || null,
        person_state: formData.person_state || null,
        country: formData.country || null,
        notes: formData.notes || '',
        source: 'manual'
      }

      const response = isEditing 
        ? await api.contacts.update(editingContact.id, contactData)
        : await api.contacts.create(contactData)

      if (response.error) {
        throw new Error(response.error)
      }

      // Show success animation
      setShowSuccess(true)

      // Reset form and close after delay
      const delay = mode === 'inline' ? 800 : 1500
      setTimeout(() => {
        setShowSuccess(false)
        setFormData({
          first_name: '',
          last_name: '',
          job_title: '',
          linkedin_contact: '',
          email_address: '',
          direct_phone: '',
          mobile_phone: '',
          person_city: '',
          person_state: '',
          country: '',
          notes: ''
        })
        onContactAdded()
        onClose()
      }, delay)

    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} contact`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (isLoading) return
    setFormData({
      first_name: '',
      last_name: '',
      job_title: '',
      linkedin_contact: '',
      email_address: '',
      direct_phone: '',
      mobile_phone: '',
      person_city: '',
      person_state: '',
      country: '',
      notes: ''
    })
    setError(null)
    setShowSuccess(false)
    onClose()
  }

  if (!isOpen) return null

  // Form content shared between modal and inline
  const formContent = showSuccess ? (
    <div className={`text-center ${mode === 'inline' ? 'py-8' : 'py-16'}`}>
      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900">
        Contact {isEditing ? 'Updated!' : 'Added!'}
      </h3>
      <p className="text-gray-600 mt-2">
        Successfully {isEditing ? 'updated' : 'added to'} {companyName}
      </p>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className={mode === 'inline' ? 'space-y-4' : 'space-y-6'}>
      {/* Basic Info */}
      <div>
        <h3 className={`font-medium text-gray-900 ${mode === 'inline' ? 'text-sm mb-3' : 'text-lg mb-4'}`}>Basic Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              required
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Title *
          </label>
          <input
            type="text"
            value={formData.job_title}
            onChange={(e) => handleInputChange('job_title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            required
          />
        </div>
      </div>

      {/* Contact Information */}
      <div>
        <h3 className={`font-medium text-gray-900 ${mode === 'inline' ? 'text-sm mb-3' : 'text-lg mb-4'}`}>Contact Information</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LinkedIn URL
            </label>
            <input
              type="url"
              value={formData.linkedin_contact}
              onChange={(e) => handleInputChange('linkedin_contact', e.target.value)}
              placeholder="https://linkedin.com/in/profile"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email_address}
              onChange={(e) => handleInputChange('email_address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Direct Phone
              </label>
              <input
                type="tel"
                value={formData.direct_phone}
                onChange={(e) => handleInputChange('direct_phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Phone
              </label>
              <input
                type="tel"
                value={formData.mobile_phone}
                onChange={(e) => handleInputChange('mobile_phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Location */}
      <div>
        <h3 className={`font-medium text-gray-900 ${mode === 'inline' ? 'text-sm mb-3' : 'text-lg mb-4'}`}>Location</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={formData.person_city}
              onChange={(e) => handleInputChange('person_city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              type="text"
              value={formData.person_state}
              onChange={(e) => handleInputChange('person_state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none text-sm"
          placeholder="Additional notes about this contact..."
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className={`flex gap-3 ${mode === 'inline' ? 'pt-2' : 'pt-4'}`}>
        {mode === 'modal' && (
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            disabled={isLoading}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className={`${mode === 'inline' ? 'w-full' : 'flex-1'} px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-sm`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isEditing ? 'Updating...' : 'Adding...'}
            </>
          ) : (
            isEditing ? 'Update Contact' : 'Add Contact'
          )}
        </button>
      </div>
    </form>
  )

  // Inline mode: render directly without modal wrapper
  if (mode === 'inline') {
    return (
      <div className="animate-tab-fade-in">
        {formContent}
      </div>
    )
  }

  // Modal mode: original wrapper
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Plus className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {isEditing ? 'Edit Contact' : 'Add Contact'}
                </h2>
                <p className="text-sm text-gray-600">
                  {isEditing ? 'Update contact details for' : 'Adding contact for'} {companyName}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {formContent}
          </div>
        </div>
      </div>
    </>
  )
}