import React, { useState, useEffect, useCallback } from 'react'
import { Calendar, Filter, RotateCcw, Building, TrendingUp } from 'lucide-react'
import { EnerpacProjectCard } from './EnerpacProjectCard'
import { EnerpacQueueSidebar } from './EnerpacQueueSidebar'
import { useDemoContext } from './EnerpacDemoContainer'

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
    id: "mf-41249",
    organization_id: "org_enerpac_demo",
    project_name: "Campbell Dr Bridge Replacement",
    location: "Menomonee Falls, WI",
    bid_due: "TBD 2026",
    spec_fit: 0.95,
    urgency: 0.6,
    confidence: 0.9,
    reason_codes: ["bridge_work", "heavy_lift_potential", "structural_steel", "girder_placement"],
    description: "Complete bridge removal and replacement over waterway. Project includes demolition of existing structure, installation of new bridge deck, girder placement, and structural steel work.",
    project_url: "https://www.menomonee-falls.org/832/Project-Bidding"
  },
  {
    id: "mf-41248",
    organization_id: "org_enerpac_demo",
    project_name: "Overview Dr Bridge",
    location: "Menomonee Falls, WI",
    bid_due: "Summer 2025",
    spec_fit: 0.90,
    urgency: 0.8,
    confidence: 0.85,
    reason_codes: ["bridge_work", "heavy_lift_potential", "infrastructure_project"],
    description: "Bridge construction and rehabilitation project. Scope includes structural improvements, deck work, and associated infrastructure.",
    project_url: "https://www.menomonee-falls.org/832/Project-Bidding"
  },
  {
    id: "mf-64080",
    organization_id: "org_enerpac_demo",
    project_name: "Pedestrian Bridges - Lime Kiln & Rotary Parks",
    location: "Menomonee Falls, WI",
    bid_due: "Oct-Nov 2025",
    spec_fit: 0.65,
    urgency: 0.7,
    confidence: 0.8,
    reason_codes: ["bridge_work", "structural_steel"],
    description: "Installation of pedestrian bridges at Lime Kiln Park and Rotary Park. Project includes bridge fabrication, delivery, and installation.",
    project_url: "https://www.menomonee-falls.org/832/Project-Bidding"
  }
]

export const EnerpacDemoPage = () => {
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
      console.log('Fetching static Enerpac projects...')
      const res = await fetch('/enerpac_projects.json')
      console.log('Response:', res.status, res.statusText)

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()
      console.log('Static data received:', data)
      console.log('Number of leads:', data?.length || 0)

      if (data && Array.isArray(data) && data.length > 0) {
        // Filter out projects with 0 spec_fit (0 score)
        const filteredData = data.filter((project: any) => project.spec_fit > 0)
        setLeads(filteredData)
        setUsingFallback(false)
      } else {
        throw new Error('No data in static file')
      }

    } catch (e: any) {
      console.error('Static file error, using fallback data:', e)
      // Filter fallback data as well
      const filteredFallback = DEMO_LEADS.filter(project => project.spec_fit > 0)
      setLeads(filteredFallback)
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
      const newApprovedProjects = [...approvedProjects.filter(id => id !== leadId), leadId]
      setApprovedProjects(newApprovedProjects)
    } else {
      const newApprovedProjects = approvedProjects.filter(id => id !== leadId)
      setApprovedProjects(newApprovedProjects)
    }

    // Auto-advance to next project (like in signals page)
    if (decision === 'approve' || decision === 'reject') {
      if (currentIndex < leads.length - 1) {
        setTimeout(() => setCurrentIndex(currentIndex + 1), 300) // Small delay for UX
      }
    }
  }, [approvedProjects, setApprovedProjects, currentIndex, leads.length])

  return (
    <div className="h-full bg-gray-50 overflow-hidden flex flex-col">
      {/* Sticky Header */}
      <div className="flex-shrink-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-gray-900">Menomonee Falls Bids</h1>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Status Text */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>Source: QuestCDN / City Website</span>
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
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl mx-auto flex gap-6 px-4 sm:px-6 lg:px-8 min-h-0 pb-6 pt-6">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ height: 'calc(100% - 2rem)' }}>

          {/* Loading Status */}
          {loading && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                <div className="text-blue-700">Loading Menomonee Falls bids...</div>
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
                No bids are currently available for Menomonee Falls.
                Try refreshing to check for new opportunities.
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
            <div className="h-full">
              <EnerpacProjectCard
                lead={currentLead}
                isLoading={loading}
                onDecisionChange={handleDecisionChange}
              />
            </div>
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
                You've completed your review of all {leads.length} Menomonee Falls bids.
              </p>
              <button
                onClick={() => {
                  setCurrentIndex(0)
                  handleRefresh()
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Review Again
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 min-h-0" style={{ height: 'calc(100% - 2rem)' }}>
          <EnerpacQueueSidebar
            leads={leads.map(lead => ({
              ...lead,
              decision: approvedProjects.includes(lead.id) ? 'approve' as const : null
            }))}
            currentIndex={currentIndex}
            onLeadSelect={handleLeadSelect}
            isLoading={loading}
          />
        </div>
      </div>
    </div>
  )
}