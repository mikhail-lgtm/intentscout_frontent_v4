import { useState, useEffect } from 'react'
import { Building2, Check, RefreshCw } from 'lucide-react'
import { api } from '../../lib/apiClient'

interface Organization {
  id: string
  name: string
  logoUrl?: string
  state: string
  isPrimary: boolean
}

export const OrganizationSelector = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      setLoading(true)
      const response = await api.organizations.getMyOrganizations()
      const data = response.data as any

      setOrganizations(data.organizations || [])

      // Get current org from localStorage or use first
      const savedOrgId = localStorage.getItem('currentOrganizationId')
      const current = savedOrgId || (data.organizations[0]?.id)
      setCurrentOrgId(current)

      // Save to localStorage if not set
      if (!savedOrgId && current) {
        localStorage.setItem('currentOrganizationId', current)
      }
    } catch (error) {
      console.error('Failed to load organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const switchOrganization = async (orgId: string) => {
    if (orgId === currentOrgId) return

    setSwitching(true)

    const org = organizations.find(o => o.id === orgId)
    console.log('[OrganizationSelector] Switching to:', org?.name, orgId)

    // Save to localStorage
    localStorage.setItem('currentOrganizationId', orgId)
    console.log('[OrganizationSelector] Saved to localStorage:', localStorage.getItem('currentOrganizationId'))

    // Clear organization cache to force refresh
    localStorage.removeItem('intentscout_organization')
    console.log('[OrganizationSelector] Cleared organization cache')

    // Small delay to ensure localStorage is written
    await new Promise(resolve => setTimeout(resolve, 100))

    // Reload page to refresh all data
    console.log('[OrganizationSelector] Reloading page...')
    window.location.reload()
  }

  const currentOrg = organizations.find(o => o.id === currentOrgId)

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No organizations found
      </div>
    )
  }

  if (organizations.length === 1) {
    // Only one organization - no need for switcher
    return (
      <div>
        <p className="text-sm text-gray-600 mb-2">Current Organization</p>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          {currentOrg?.logoUrl ? (
            <img
              src={currentOrg.logoUrl}
              alt={currentOrg.name}
              className="w-8 h-8 rounded object-cover"
            />
          ) : (
            <Building2 className="w-8 h-8 text-gray-400" />
          )}
          <span className="font-medium text-gray-900">{currentOrg?.name}</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-2">Current Organization</p>

      <div className="space-y-2">
        {organizations.map((org) => {
          const isCurrent = org.id === currentOrgId

          return (
            <button
              key={org.id}
              onClick={() => switchOrganization(org.id)}
              disabled={switching || isCurrent}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg border transition-all
                ${isCurrent
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                }
                ${switching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {org.logoUrl ? (
                <img
                  src={org.logoUrl}
                  alt={org.name}
                  className="w-8 h-8 rounded object-cover"
                />
              ) : (
                <Building2 className="w-8 h-8 text-gray-400" />
              )}

              <div className="flex-1 text-left">
                <div className="font-medium text-gray-900">{org.name}</div>
                {org.isPrimary && (
                  <div className="text-xs text-gray-500">Primary</div>
                )}
              </div>

              {isCurrent && (
                <Check className="w-5 h-5 text-orange-600" />
              )}

              {switching && isCurrent && (
                <RefreshCw className="w-5 h-5 text-orange-600 animate-spin" />
              )}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Switching organization will reload the page
      </p>
    </div>
  )
}
