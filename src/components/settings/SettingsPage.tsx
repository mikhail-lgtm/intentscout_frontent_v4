import { Crown, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useOrganizationMembers } from '../../hooks/useOrganizationMembers'
import { useHubSpot } from '../../hooks/useHubSpot'

export const SettingsPage = () => {
  const { user, organization } = useAuth()
  const { members, loading: membersLoading, adminUser } = useOrganizationMembers()
  const { status: hubspotStatus, loading: hubspotLoading, error: hubspotError, connect: connectHubSpot, disconnect: disconnectHubSpot } = useHubSpot()
  
  // HubSpot configuration state
  const [senderEmail, setSenderEmail] = useState('')
  const [configLoading, setConfigLoading] = useState(false)
  
  const handleSaveConfig = async () => {
    if (!senderEmail) {
      alert('Please enter sender email')
      return
    }
    
    setConfigLoading(true)
    try {
      // TODO: Implement API call to save HubSpot configuration
      console.log('Saving HubSpot config:', { senderEmail })
      alert('Configuration saved successfully!')
    } catch (error) {
      console.error('Failed to save configuration:', error)
      alert('Failed to save configuration')
    } finally {
      setConfigLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-1">Manage your organization and integrations</p>
      </div>

      <div className="space-y-6">
        
        {/* Organization Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization</h3>
          
          <div className="flex items-center gap-4 mb-4">
            {organization?.logoUrl && (
              <img 
                src={organization.logoUrl} 
                alt={organization.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div>
              <p className="text-sm text-gray-600 mb-1">Organization Name</p>
              <p className="font-medium text-gray-900">{organization?.name || 'Not available'}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Team Members</p>
            {membersLoading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                    <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-2">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xs text-gray-600 font-medium">
                        {member.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">{member.email}</span>
                      {member.isAdmin && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                          <Crown className="w-3 h-3" />
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Integrations Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Integrations</h3>

          {/* HubSpot Integration */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <img 
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGKQNpE5KbwgQjYkdxK6sLoEyhPeacS7RKgw&s" 
                  alt="HubSpot"
                  className="w-8 h-8 rounded"
                />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">HubSpot</h4>
                <p className="text-sm text-gray-600">CRM and marketing automation</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hubspotLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
                  Loading...
                </div>
              ) : hubspotStatus?.connected ? (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    <CheckCircle className="w-3 h-3" />
                    Connected
                  </span>
                  <button
                    onClick={disconnectHubSpot}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded border border-red-200 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={connectHubSpot}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Connect
                </button>
              )}
            </div>
          </div>

          {/* Connection Details */}
          {hubspotStatus?.connected && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {hubspotStatus.connected_at && (
                  <div>
                    <span className="text-gray-600">Connected:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(hubspotStatus.connected_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {hubspotStatus.hub_id && (
                  <div>
                    <span className="text-gray-600">Portal ID:</span>
                    <span className="ml-2 font-mono text-gray-900">{hubspotStatus.hub_id}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {hubspotError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-red-800">
                <AlertCircle className="w-4 h-4" />
                {typeof hubspotError === 'string' ? hubspotError : 'An error occurred with HubSpot integration'}
              </div>
            </div>
          )}

          {/* Coming Soon */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              More integrations coming soon: Salesforce, Pipedrive, and other CRM platforms.
            </p>
          </div>
        </div>

        {/* HubSpot Configuration */}
        {hubspotStatus?.connected && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">HubSpot Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Sender Email
                </label>
                <input
                  type="email"
                  placeholder="sender@yourcompany.com"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <button 
                onClick={handleSaveConfig}
                disabled={configLoading || !senderEmail}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {configLoading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}