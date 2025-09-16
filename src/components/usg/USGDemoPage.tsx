import React, { useState, useEffect, useCallback } from 'react'
import { Calendar, Filter, RotateCcw, Building, TrendingUp } from 'lucide-react'
import { USGProjectCard } from './USGProjectCard'
import { USGQueueSidebar } from './USGQueueSidebar'
import { useDemoContext } from './USGDemoContainer'

interface Lead {
  id: string
  organization_id: string
  project_name: string
  location: string
  bid_due: string
  spec_fit: number
  urgency: number
  confidence: number
  reason_codes?: string[]
  description?: string
  project_url?: string
  decision?: 'approve' | 'reject' | null
}

// Demo data for fallback (safe for production)
const DEMO_LEADS: Lead[] = [
  {
    id: "cc-0",
    organization_id: "org_usg_demo",
    project_name: "Replacement of Emergency Doors at Metrorail Station",
    location: "Miami, FL 33131",
    bid_due: "Oct 15, 2025",
    spec_fit: 0.85,
    urgency: 0.7,
    confidence: 0.9,
    reason_codes: ["has_bid_due", "has_project_name", "fire_rated_materials", "drywall_specs"],
    description: "Renovation of a transportation facility in Miami, Florida. This project involves removing and installing seventy-one (71) fire-rated three-hour (3) stainless steel doors, frames, hinges, including all hardware listed. Door, frame, and hardware must have the same fire-resistance rating of three hours.",
    project_url: "https://app.constructconnect.com/project/5880869/p?sourceType=3"
  },
  {
    id: "cc-1", 
    organization_id: "org_usg_demo",
    project_name: "Pan American Wastewater Reclamation Facility",
    location: "North Port, FL 34287",
    bid_due: "Sep 13, 2025",
    spec_fit: 0.65,
    urgency: 0.8,
    confidence: 0.75,
    reason_codes: ["has_bid_due", "has_project_name", "construction_specs"],
    description: "Renovation of a water/sewer project in North Port, Florida. The City of North Port is requesting sealed bids for construction services to construct the Pan American Wastewater Reclamation Facility Centrifuge Building in its entirety.",
    project_url: "https://app.constructconnect.com/project/5899156/p?sourceType=3"
  },
  {
    id: "cc-2",
    organization_id: "org_usg_demo", 
    project_name: "Blue Heron Park Pickleball Court Expansion",
    location: "Jupiter, FL 33458",
    bid_due: "Sep 25, 2025",
    spec_fit: 0.45,
    urgency: 0.6,
    confidence: 0.7,
    reason_codes: ["has_bid_due", "has_project_name"],
    description: "Expansion of recreational facilities including new court surfaces, lighting, and support structures. Project includes site preparation and infrastructure improvements.",
    project_url: "https://app.constructconnect.com/project/5880868/p?sourceType=3"
  }
]

export const USGDemoPage = () => {
  const { approvedProjects, setApprovedProjects } = useDemoContext()

  // State management
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Get current lead with updated decision from context
  const currentLead = leads[currentIndex] ? {
    ...leads[currentIndex],
    decision: approvedProjects.includes(leads[currentIndex].id) ? 'approve' as const : null
  } : null

  // Data fetching - Load from static JSON file
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('Fetching static USG projects...')
      const res = await fetch('/usg_projects.json')
      console.log('Response:', res.status, res.statusText)

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()
      console.log('Static data received:', data)
      console.log('Number of leads:', data?.length || 0)

      if (data && Array.isArray(data) && data.length > 0) {
        setLeads(data)
        setUsingFallback(false)
      } else {
        throw new Error('No data in static file')
      }

    } catch (e: any) {
      console.error('Static file error, using fallback data:', e)
      setLeads(DEMO_LEADS)
      setUsingFallback(true)
      setError(null) // Clear error since we have fallback
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handlers
  const handleLeadSelect = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  const handleRefresh = useCallback(() => {
    setCurrentIndex(0)
    fetchData()
  }, [fetchData])

  const handleDecisionChange = useCallback((leadId: string, decision: 'approve' | 'reject' | null) => {
    // Update approved projects in context
    if (decision === 'approve') {
      setApprovedProjects([...approvedProjects.filter(id => id !== leadId), leadId])
    } else {
      setApprovedProjects(approvedProjects.filter(id => id !== leadId))
    }
  }, [approvedProjects, setApprovedProjects])

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-gray-900">ConstructConnect Projects</h1>

            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Status Text */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>Source: ConstructConnect</span>
            {usingFallback && <span className="text-orange-600">Demo Data</span>}
            <span>Projects: {leads.length}</span>
            {leads.length > 0 && (
              <>
                <span>|</span>
                <span className="text-green-600 font-medium">
                  {approvedProjects.length} Approved
                </span>
                <span className="text-blue-600 font-medium">
                  {leads.filter(l => Math.round(l.spec_fit * 5) === 3).length} Score 3
                </span>
              </>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
          
          {/* Loading Status */}
          {loading && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                <div className="text-blue-700">Loading ConstructConnect projects...</div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 text-lg">⚠</span>
                </div>
                <h3 className="text-red-800 font-semibold">Error Loading Projects</h3>
              </div>
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Retry
              </button>
            </div>
          )}

          {/* Empty State - only show when all loading is done */}
          {!loading && leads.length === 0 && !error && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Projects Found
              </h3>
              <p className="text-gray-600 mb-6">
                No ConstructConnect projects are currently available. 
                Try refreshing to check for new projects.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}

            {/* Project Card */}
            {(currentLead || loading) && (
              <USGProjectCard
                lead={currentLead}
                isLoading={loading}
                onDecisionChange={handleDecisionChange}
              />
            )}

          {/* Completion State */}
          {!loading && leads.length > 0 && currentIndex >= leads.length && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-2xl">🎉</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                All Projects Reviewed!
              </h3>
              <p className="text-gray-600 mb-6">
                You've viewed all {leads.length} ConstructConnect projects.
              </p>
              <button
                onClick={() => {
                  setCurrentIndex(0)
                  handleRefresh()
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Review Again
              </button>
            </div>
          )}
          </div>

          {/* Sidebar */}
          <div className="w-80 flex-shrink-0">
            <USGQueueSidebar
              leads={leads}
              currentIndex={currentIndex}
              onLeadSelect={handleLeadSelect}
              isLoading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}