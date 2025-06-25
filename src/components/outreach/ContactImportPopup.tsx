import { useState, useEffect } from 'react'
import { X, Users, Loader2, CheckCircle, ExternalLink } from 'lucide-react'
import { api } from '../../lib/apiClient'

interface ContactImportPopupProps {
  isOpen: boolean
  onClose: () => void
  signalId: string
  onImportSuccess: () => void
}

interface ContactData {
  contact_id: string
  first_name: string
  last_name: string
  email_address?: string
  job_title: string
  linkedin_contact: string
  direct_phone?: string
  mobile_phone?: string
  person_city?: string
  person_state?: string
  country?: string
  notes: string
}

interface HubSpotContactProperties {
  firstname: string
  lastname: string
  email: string
  jobtitle: string
  phone: string
  linkedin_bio: string
  city: string
  state: string
  country: string
  notes_last_contacted: string
  [key: string]: string
}

interface MappedContact {
  contact_id: string
  raw_data: ContactData
  hubspot_properties: HubSpotContactProperties
}

export const ContactImportPopup: React.FC<ContactImportPopupProps> = ({
  isOpen,
  onClose,
  signalId,
  onImportSuccess
}) => {
  const [contactsData, setContactsData] = useState<MappedContact[]>([])
  const [editedContacts, setEditedContacts] = useState<MappedContact[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalContacts, setTotalContacts] = useState(0)

  useEffect(() => {
    if (isOpen && signalId) {
      loadContactsData()
    }
  }, [isOpen, signalId])

  const loadContactsData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await api.settings.previewContacts(signalId)
      if (response.data && typeof response.data === 'object') {
        const data = response.data as any
        setContactsData(data.contacts)
        setEditedContacts(data.contacts)
        setTotalContacts(data.total_contacts)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load contacts data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!editedContacts.length) return
    
    setIsImporting(true)
    setError(null)
    
    try {
      const response = await api.settings.importContacts(signalId, {
        contacts: editedContacts
      })
      if (response.data && typeof response.data === 'object') {
        const data = response.data as any
        if (data.success) {
          onImportSuccess()
          onClose()
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to import contacts')
    } finally {
      setIsImporting(false)
    }
  }

  const handleContactPropertyChange = (contactIndex: number, key: string, value: string) => {
    const updated = [...editedContacts]
    updated[contactIndex] = {
      ...updated[contactIndex],
      hubspot_properties: {
        ...updated[contactIndex].hubspot_properties,
        [key]: value
      }
    }
    setEditedContacts(updated)
  }

  const handleClose = () => {
    if (!isImporting) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Import Contacts to HubSpot</h2>
            {totalContacts > 0 && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                {totalContacts} contacts
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <div className="text-sm text-gray-600">Loading contacts data...</div>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="text-red-600 text-sm font-medium">Error</div>
              </div>
              <div className="text-red-600 text-sm mt-1">{error}</div>
            </div>
          ) : editedContacts.length > 0 ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-blue-800 text-sm">
                  <strong>Import Preview:</strong> {editedContacts.length} contacts will be imported to your HubSpot CRM.
                  Each contact will have a note indicating they were "Imported from IntentScout".
                </div>
              </div>

              {/* Contact List */}
              <div className="space-y-4">
                {editedContacts.map((contact, index) => (
                  <div key={contact.contact_id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">
                        Contact {index + 1}: {contact.hubspot_properties.firstname} {contact.hubspot_properties.lastname}
                      </h3>
                      {contact.hubspot_properties.linkedin_bio && (
                        <a
                          href={contact.hubspot_properties.linkedin_bio}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          LinkedIn
                        </a>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={contact.hubspot_properties.firstname || ''}
                          onChange={(e) => handleContactPropertyChange(index, 'firstname', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={contact.hubspot_properties.lastname || ''}
                          onChange={(e) => handleContactPropertyChange(index, 'lastname', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={contact.hubspot_properties.email || ''}
                          onChange={(e) => handleContactPropertyChange(index, 'email', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Job Title
                        </label>
                        <input
                          type="text"
                          value={contact.hubspot_properties.jobtitle || ''}
                          onChange={(e) => handleContactPropertyChange(index, 'jobtitle', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="text"
                          value={contact.hubspot_properties.phone || ''}
                          onChange={(e) => handleContactPropertyChange(index, 'phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={contact.hubspot_properties.city || ''}
                          onChange={(e) => handleContactPropertyChange(index, 'city', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600">
              No contacts found for this signal.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting || !editedContacts.length}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Import {editedContacts.length} Contacts to HubSpot
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}