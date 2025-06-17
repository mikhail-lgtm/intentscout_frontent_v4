import { useState, useEffect } from 'react'
import { X, Building, Loader2, CheckCircle, ExternalLink } from 'lucide-react'
import { api } from '../../lib/apiClient'

interface CompanyImportPopupProps {
  isOpen: boolean
  onClose: () => void
  signalId: string
  onImportSuccess: () => void
}

interface CompanyData {
  company_name: string
  website: string
  industry: string
  company_size: string
  headquarters: string
  founded: number
  company_url: string
  about_us: string
  type: string
}

interface HubSpotProperties {
  name: string
  website: string
  industry: string
  description: string
  numberofemployees: string
  founded_year: string
  city: string
  state: string
  country: string
  linkedin_company_page: string
}

export const CompanyImportPopup: React.FC<CompanyImportPopupProps> = ({
  isOpen,
  onClose,
  signalId,
  onImportSuccess
}) => {
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)
  const [hubspotProperties, setHubspotProperties] = useState<HubSpotProperties | null>(null)
  const [editedProperties, setEditedProperties] = useState<HubSpotProperties | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && signalId) {
      loadCompanyData()
    }
  }, [isOpen, signalId])

  const loadCompanyData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await api.settings.previewCompany(signalId)
      if (response.data) {
        setCompanyData(response.data.company_data)
        setHubspotProperties(response.data.hubspot_properties)
        setEditedProperties(response.data.hubspot_properties)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load company data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!editedProperties) return
    
    setIsImporting(true)
    setError(null)
    
    try {
      const response = await api.settings.importCompany(signalId, {
        properties: editedProperties
      })
      if (response.data && response.data.success) {
        onImportSuccess()
        onClose()
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to import company')
    } finally {
      setIsImporting(false)
    }
  }

  const handlePropertyChange = (key: string, value: string) => {
    if (editedProperties) {
      setEditedProperties({
        ...editedProperties,
        [key]: value
      })
    }
  }

  const handleClose = () => {
    if (!isImporting) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Building className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900">Import Company to HubSpot</h2>
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <div className="text-sm text-gray-600">Loading company data...</div>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="text-red-600 text-sm font-medium">Error</div>
              </div>
              <div className="text-red-600 text-sm mt-1">{error}</div>
            </div>
          ) : companyData && editedProperties ? (
            <div className="space-y-6">
              {/* Editable HubSpot Properties */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Edit Company Data for HubSpot:</h3>
                <div className="space-y-3">
                  {Object.entries(editedProperties).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-xs font-medium text-gray-700 block mb-1 capitalize">
                        {key.replace(/_/g, ' ')}
                      </label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handlePropertyChange(key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isImporting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting || !editedProperties}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Building className="w-4 h-4" />
                Import to HubSpot
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}