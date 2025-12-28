import { useState } from 'react'
import { Ban, Unlock, Search, Building, Calendar, AlertCircle } from 'lucide-react'
import { useBlockedCompanies, BlockedCompany } from '../../hooks/useBlockedCompanies'
import { ConfirmationModal } from '../ui/ConfirmationModal'

export const BlockedCompaniesSection = () => {
  const { blockedCompanies, isLoading, error, unblockCompany } = useBlockedCompanies()
  const [searchTerm, setSearchTerm] = useState('')
  const [unblockModal, setUnblockModal] = useState<{
    isOpen: boolean
    company: BlockedCompany | null
  }>({
    isOpen: false,
    company: null
  })
  const [isUnblocking, setIsUnblocking] = useState(false)

  const filteredCompanies = blockedCompanies.filter(company =>
    company.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleUnblock = async () => {
    if (!unblockModal.company) return

    setIsUnblocking(true)
    const result = await unblockCompany(unblockModal.company.companyId)
    setIsUnblocking(false)

    if (result.success) {
      setUnblockModal({ isOpen: false, company: null })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Ban className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">Blocked Companies</h3>
        </div>
        <span className="text-sm text-gray-500">
          {blockedCompanies.length} {blockedCompanies.length === 1 ? 'company' : 'companies'}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Companies you have blocked will not appear in your signals. You can unblock them at any time.
      </p>

      {/* Search */}
      {blockedCompanies.length > 5 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search blocked companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
          />
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && blockedCompanies.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Ban className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No blocked companies yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Block companies from the Signals page to hide them from your feed
          </p>
        </div>
      )}

      {/* Companies List */}
      {!isLoading && !error && filteredCompanies.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Building className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{company.companyName}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>Blocked {formatDate(company.blockedAt)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setUnblockModal({ isOpen: true, company })}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                <Unlock className="w-4 h-4" />
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading && !error && blockedCompanies.length > 0 && filteredCompanies.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No companies matching "{searchTerm}"
        </div>
      )}

      {/* Unblock Confirmation Modal */}
      <ConfirmationModal
        isOpen={unblockModal.isOpen}
        onClose={() => setUnblockModal({ isOpen: false, company: null })}
        onConfirm={handleUnblock}
        title="Unblock Company"
        message={`Are you sure you want to unblock "${unblockModal.company?.companyName}"? This company will start appearing in your signals again.`}
        variant="success"
        confirmText={isUnblocking ? "Unblocking..." : "Unblock"}
        cancelText="Cancel"
      />
    </div>
  )
}
