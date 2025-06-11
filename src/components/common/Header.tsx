import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../utils/cn'
import type { TabKey } from '../../types'

interface HeaderProps {
  activeTab: TabKey
  setActiveTab: (tab: TabKey) => void
}

export const Header = ({ activeTab, setActiveTab }: HeaderProps) => {
  const { user, organization, signOut } = useAuth()
  const navigate = useNavigate()

  const navButtonClass = (tabName: TabKey) =>
    cn(
      "px-4 py-2 font-medium rounded-lg transition-all",
      activeTab === tabName
        ? "bg-orange-100 text-orange-600 shadow-sm"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
    )

  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center">
        <div className="flex items-center mr-4 flex-col">
          <img src="/IntentScout.png" alt="IntentScout Logo" className="h-auto w-auto max-h-10 max-w-full mb-1" />
          <p className="text-xs text-gray-500 leading-tight">AI-Powered Sales Intelligence</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <nav className="flex space-x-1">
          <button
            className={navButtonClass("signals")}
            onClick={() => {
              setActiveTab("signals")
              navigate("/signals")
            }}
          >
            Signals
          </button>
          <button
            className={navButtonClass("outreach")}
            onClick={() => {
              setActiveTab("outreach")
              navigate("/outreach")
            }}
          >
            Outreach
          </button>
        </nav>
        
        <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
          <div className="flex items-center space-x-3">
            {/* User Info */}
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-gray-700">{user?.email}</span>
              {organization && (
                <div className="flex items-center space-x-1">
                  {organization.logoUrl && (
                    <img 
                      src={organization.logoUrl} 
                      alt={`${organization.name} logo`}
                      className="w-4 h-4 rounded object-cover"
                      onError={(e) => {
                        // Hide image if it fails to load
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                  <span className="text-xs text-gray-500">{organization.name}</span>
                </div>
              )}
            </div>
            
            {/* Sign Out Button */}
            <button
              onClick={signOut}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}