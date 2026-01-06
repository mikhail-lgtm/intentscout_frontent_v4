import { useState, useEffect, useCallback, useRef } from 'react'
import { Settings, Plus, MoreVertical, Check, Search, Mail, Linkedin, UserPlus, ExternalLink, Building, MapPin, Calendar, DollarSign, X, Loader2, Users, Sparkles, Copy, CheckCircle, AlertCircle } from 'lucide-react'
import { useDemoContext } from './EnerpacDemoContainer'

// Convert spec_fit (0-1) to intent score (1-5)
const getIntentScore = (spec_fit: number) => Math.round(spec_fit * 5)

// Demo permits data - will be replaced with real data
const DEMO_PERMITS_FALLBACK = [
  { id: "chi-101071588", address: "10000 W O'Hare St", city: "Chicago", state: "IL", valuation_display: "$100M", enerpac_score: 92 },
  { id: "mil-2025-ind-002", address: "6701 W Calumet Rd", city: "Milwaukee", state: "WI", valuation_display: "$8.5M", enerpac_score: 94 },
  { id: "ind-2025-ind-001", address: "4500 Indianapolis Blvd", city: "East Chicago", state: "IN", valuation_display: "$65M", enerpac_score: 98 }
]

// Demo Sidebar Component
const DemoOutreachSidebar = ({
  approvedProjects,
  selectedProject,
  onProjectSelect
}: {
  approvedProjects: string[]
  selectedProject?: any
  onProjectSelect: (project: any) => void
}) => {
  const [realProjects, setRealProjects] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/enerpac_projects.json')
        if (res.ok) {
          const data = await res.json()
          const outreachProjects = data
            .filter((project: any) => project.spec_fit > 0)
            .map((project: any) => ({
              id: project.id || `project-${Math.random()}`,
              name: project.address || project.project_name,
              project: project.work_description ? project.work_description.substring(0, 50) + '...' : 'Building Permit',
              score: project.enerpac_score || getIntentScore(project.spec_fit || 0.8),
              location: project.city && project.state ? `${project.city}, ${project.state}` : project.location,
              valuation_display: project.valuation_display,
              contacts: project.contacts || [],
              ...project
            }))
          setRealProjects(outreachProjects)
        } else {
          setRealProjects(DEMO_PERMITS_FALLBACK)
        }
      } catch (error) {
        console.error('Error loading projects:', error)
        setRealProjects(DEMO_PERMITS_FALLBACK)
      }
    }
    fetchProjects()
  }, [])

  const approvedProjectsData = realProjects
    .filter(p => approvedProjects.includes(p.id))
    .filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 p.project_name?.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Approved Permits ({approvedProjectsData.length})
      </h3>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search permits..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {approvedProjectsData.length === 0 ? (
        <div className="text-center py-8 flex-1">
          <div className="text-gray-500 text-sm">
            {searchTerm ? 'No matching permits.' : 'No approved permits yet.'}
            <br />
            Go to Permits tab and approve some permits.
          </div>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto">
          {approvedProjectsData.map((project) => (
            <div
              key={project.id}
              onClick={() => onProjectSelect(project)}
              className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                selectedProject?.id === project.id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{project.address || project.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {project.location}
                    {project.valuation_display && ` - ${project.valuation_display}`}
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  project.score >= 90 ? 'bg-green-100 text-green-700' :
                  project.score >= 80 ? 'bg-blue-100 text-blue-700' :
                  project.score >= 70 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {project.score}
                </div>
              </div>
              {project.contractor_name && (
                <div className="text-xs text-orange-600 mt-1">{project.contractor_name}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Intent Card - Shows permit details
const DemoIntentCard = ({ selectedProject }: { selectedProject?: any }) => {
  if (!selectedProject) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <Building className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <div className="text-lg font-medium mb-2">No Permit Selected</div>
          <div className="text-sm">Select a permit from the sidebar to view details.</div>
        </div>
      </div>
    )
  }

  const score = selectedProject.enerpac_score || selectedProject.score || getIntentScore(selectedProject.spec_fit || 0.8)

  return (
    <div className="p-4 overflow-y-auto h-full">
      {/* Header - Compact */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">{selectedProject.address || selectedProject.name}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{selectedProject.city && selectedProject.state ? `${selectedProject.city}, ${selectedProject.state}` : selectedProject.location}</span>
            {selectedProject.permit_number && (
              <span className="text-gray-400">#{selectedProject.permit_number}</span>
            )}
          </div>
        </div>
        <div className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${
          score >= 90 ? 'bg-green-100 text-green-700' :
          score >= 80 ? 'bg-blue-100 text-blue-700' :
          score >= 70 ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {score}
        </div>
      </div>

      {/* Permit Details - Compact Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {selectedProject.valuation_display && (
          <div className="bg-gray-50 rounded p-2">
            <div className="text-[10px] text-gray-500">Valuation</div>
            <div className="font-medium text-xs">{selectedProject.valuation_display}</div>
          </div>
        )}
        {selectedProject.issue_date && (
          <div className="bg-gray-50 rounded p-2">
            <div className="text-[10px] text-gray-500">Issue Date</div>
            <div className="font-medium text-xs">{selectedProject.issue_date}</div>
          </div>
        )}
        {selectedProject.contractor_name && (
          <div className="bg-gray-50 rounded p-2">
            <div className="text-[10px] text-gray-500">Contractor</div>
            <div className="font-medium text-xs truncate">{selectedProject.contractor_name}</div>
          </div>
        )}
        {selectedProject.permit_type && (
          <div className="bg-gray-50 rounded p-2 col-span-2">
            <div className="text-[10px] text-gray-500">Type</div>
            <div className="font-medium text-xs truncate">{selectedProject.permit_type}</div>
          </div>
        )}
        {selectedProject.outreach_window && (
          <div className="bg-gray-50 rounded p-2">
            <div className="text-[10px] text-gray-500">Window</div>
            <div className="font-medium text-xs">{selectedProject.outreach_window}</div>
          </div>
        )}
      </div>

      {/* Work Description - Compact */}
      {(selectedProject.work_description || selectedProject.description) && (
        <div className="mb-3">
          <div className="text-[10px] font-medium text-gray-500 mb-1">Work Description</div>
          <p className="text-xs text-gray-700 line-clamp-3">{selectedProject.work_description || selectedProject.description}</p>
        </div>
      )}

      {/* AI Analysis - Compact */}
      {selectedProject.reasoning && (
        <div className="mb-3 bg-green-50 border border-green-200 rounded p-2">
          <div className="text-[10px] font-medium text-green-700 mb-1">AI Analysis</div>
          <p className="text-xs text-green-800 line-clamp-2">{selectedProject.reasoning}</p>
        </div>
      )}

      {/* Reason Codes - Compact */}
      {selectedProject.reason_codes && selectedProject.reason_codes.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {selectedProject.reason_codes.slice(0, 4).map((code: string, i: number) => (
              <span key={i} className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px]">
                {code.replace(/_/g, ' ')}
              </span>
            ))}
            {selectedProject.reason_codes.length > 4 && (
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">
                +{selectedProject.reason_codes.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Source - Compact */}
      {selectedProject.source && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <div className="text-[10px] text-gray-500">{selectedProject.source}</div>
          {(selectedProject.permit_url || selectedProject.project_url) && (
            <a
              href={selectedProject.permit_url || selectedProject.project_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800"
            >
              View <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// CRM Connection with 3-step workflow
const DemoCRMConnection = ({ selectedProject }: { selectedProject?: any }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [step1Done, setStep1Done] = useState(false)
  const [step2Done, setStep2Done] = useState(false)
  const [step3Done, setStep3Done] = useState(false)
  const [isLoading, setIsLoading] = useState<number | null>(null)
  const [selectedSequence, setSelectedSequence] = useState('')

  const sequences = [
    { id: 'seq1', name: 'Bridge Project Outreach', steps: 5 },
    { id: 'seq2', name: 'Power Plant Follow-up', steps: 4 },
    { id: 'seq3', name: 'Industrial Equipment Intro', steps: 3 },
  ]

  const handleConnect = () => {
    setIsConnected(true)
  }

  const handleStep = async (step: number) => {
    setIsLoading(step)
    await new Promise(resolve => setTimeout(resolve, 1500))
    if (step === 1) setStep1Done(true)
    if (step === 2) setStep2Done(true)
    if (step === 3) setStep3Done(true)
    setIsLoading(null)
  }

  const resetSteps = () => {
    setStep1Done(false)
    setStep2Done(false)
    setStep3Done(false)
  }

  // Reset steps when project changes
  useEffect(() => {
    resetSteps()
  }, [selectedProject?.id])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">CRM Connection</h3>
        <div className={`flex items-center gap-2 text-xs ${isConnected ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          {isConnected ? 'Connected' : 'Not Connected'}
        </div>
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm font-medium text-yellow-800 mb-2">Setup Required</div>
            <div className="text-xs text-yellow-700">
              Connect your CRM to sync contacts and enroll in sequences.
            </div>
          </div>
          <button
            onClick={handleConnect}
            className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
          >
            Connect CRM
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Sequence Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Select Sequence</label>
            <select
              value={selectedSequence}
              onChange={(e) => setSelectedSequence(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Choose a sequence...</option>
              {sequences.map(seq => (
                <option key={seq.id} value={seq.id}>{seq.name} ({seq.steps} steps)</option>
              ))}
            </select>
          </div>

          {/* 3-Step Workflow */}
          <div className="space-y-2">
            {/* Step 1: Import Company */}
            <button
              onClick={() => handleStep(1)}
              disabled={!selectedProject || step1Done || isLoading !== null}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                step1Done
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : isLoading === 1
                  ? 'bg-gray-100 text-gray-500'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {step1Done ? <Check className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                <span>1. Import Company</span>
              </div>
              {isLoading === 1 && (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              )}
            </button>

            {/* Step 2: Import Contacts */}
            <button
              onClick={() => handleStep(2)}
              disabled={!step1Done || step2Done || isLoading !== null}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                step2Done
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : !step1Done
                  ? 'bg-gray-50 text-gray-400 border border-gray-100 cursor-not-allowed'
                  : isLoading === 2
                  ? 'bg-gray-100 text-gray-500'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {step2Done ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                <span>2. Import Contacts</span>
              </div>
              {isLoading === 2 && (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              )}
            </button>

            {/* Step 3: Enroll in Sequence */}
            <button
              onClick={() => handleStep(3)}
              disabled={!step2Done || step3Done || isLoading !== null || !selectedSequence}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                step3Done
                  ? 'bg-orange-100 text-orange-700 border border-orange-200'
                  : !step2Done || !selectedSequence
                  ? 'bg-gray-50 text-gray-400 border border-gray-100 cursor-not-allowed'
                  : isLoading === 3
                  ? 'bg-gray-100 text-gray-500'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {step3Done ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                <span>3. Enroll in Sequence</span>
              </div>
              {isLoading === 3 && (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              )}
            </button>
          </div>

          {step3Done && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <Check className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <div className="text-sm font-medium text-green-700">All contacts enrolled!</div>
              <div className="text-xs text-green-600">Sequence will start automatically</div>
            </div>
          )}

          {!selectedProject && (
            <div className="text-xs text-gray-500 text-center">
              Select a project to start workflow
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Real contact data for demo - actual professionals in Wisconsin construction
const SIMULATED_DECISION_MAKERS = [
  { name: 'Butch Knuppel', title: 'Director of Equipment Operations', linkedin: 'https://www.linkedin.com/in/butch-knuppel-187aab77/', reason: 'Procures equipment and materials for jobsites. Manages yard operations at The Boldt Company.' },
  { name: 'Brian Wiza', title: 'Equipment Manager', linkedin: 'https://www.linkedin.com/in/brian-wiza-a1a00ba6/', reason: 'Equipment Manager at The Boldt Company. Oversees heavy equipment fleet and rentals.' },
  { name: 'Chad Kraus', title: 'Project Manager', linkedin: 'https://www.linkedin.com/in/chadrkraus/', reason: 'Project Manager at C.D. Smith Construction. Previously at The Boldt Company. MSOE graduate.' },
  { name: 'Dan O\'Brien', title: 'Project Executive', linkedin: 'https://www.linkedin.com/in/dan-o-brien-9a60b217/', reason: 'Project Executive at Mortenson Milwaukee. Named Project Manager of the Year by The Daily Reporter.' },
]

const SIMULATED_EMAILS = [
  { name: 'Butch Knuppel', email: 'butch.knuppel@boldt.com', confidence: 0.94 },
  { name: 'Brian Wiza', email: 'brian.wiza@boldt.com', confidence: 0.92 },
  { name: 'Chad Kraus', email: 'ckraus@cdsmith.com', confidence: 0.89 },
  { name: 'Dan O\'Brien', email: 'dan.obrien@mortenson.com', confidence: 0.91 },
]

const SIMULATED_LINKEDIN_PROFILES = [
  { name: 'Butch Knuppel', headline: 'Director of Equipment Operations at The Boldt Company', location: 'Appleton, WI', summary: 'Procures equipment and materials for jobsites and yard operations. Fox Valley Technical College graduate.' },
  { name: 'Brian Wiza', headline: 'Equipment Manager at The Boldt Company', location: 'Wausau-Stevens Point Area', summary: 'Equipment fleet management for one of the largest construction firms in the US.' },
  { name: 'Chad Kraus', headline: 'Project Manager at C.D. Smith Construction', location: 'Milwaukee, WI', summary: 'Construction project management. Previously at The Boldt Company. Milwaukee School of Engineering graduate.' },
  { name: 'Dan O\'Brien', headline: 'Project Executive at Mortenson', location: 'Greater Milwaukee', summary: 'Named Project Manager of the Year. UW-Madison graduate. Working on Nature & Culture Museum of Wisconsin.' },
]

// LinkedIn Icon Component
const LinkedInIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

// Store contacts per project (persists across signal switches) - module level cache
const projectContactsCache: Record<string, {
  contacts: any[]
  dmStatus: 'idle' | 'searching' | 'completed'
  foundDMs: any[]
  emailFinderStatus: 'idle' | 'searching' | 'completed'
  foundEmails: any[]
  linkedinStatus: 'idle' | 'scraping' | 'completed'
  scrapedProfiles: any[]
  emailGenStatus: 'idle' | 'generating' | 'completed'
  generatedEmails: any[]
}> = {}

// Contacts Component - Matches main site design
const DemoContactsComponent = ({ selectedProject }: { selectedProject?: any }) => {
  const [contacts, setContacts] = useState<any[]>([])
  const [activeContactMenu, setActiveContactMenu] = useState<string | null>(null)
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)

  // Modal states
  const [showDMFinder, setShowDMFinder] = useState(false)
  const [showEmailFinder, setShowEmailFinder] = useState(false)
  const [showLinkedInScraper, setShowLinkedInScraper] = useState(false)
  const [showEmailGenerator, setShowEmailGenerator] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)

  // Process states
  const [dmStatus, setDmStatus] = useState<'idle' | 'searching' | 'completed'>('idle')
  const [dmProgress, setDmProgress] = useState(0)
  const [foundDMs, setFoundDMs] = useState<any[]>([])

  const [emailFinderStatus, setEmailFinderStatus] = useState<'idle' | 'searching' | 'completed'>('idle')
  const [emailFinderProgress, setEmailFinderProgress] = useState(0)
  const [foundEmails, setFoundEmails] = useState<any[]>([])

  const [linkedinStatus, setLinkedinStatus] = useState<'idle' | 'scraping' | 'completed'>('idle')
  const [linkedinProgress, setLinkedinProgress] = useState(0)
  const [scrapedProfiles, setScrapedProfiles] = useState<any[]>([])

  const [emailGenStatus, setEmailGenStatus] = useState<'idle' | 'generating' | 'completed'>('idle')
  const [generatedEmails, setGeneratedEmails] = useState<any[]>([])

  const [newContact, setNewContact] = useState({ name: '', role: '', email: '' })
  const prevProjectId = useRef<string | null>(null)

  // Save current project state before switching, restore when switching back
  useEffect(() => {
    const projectId = selectedProject?.id

    // Save previous project state
    if (prevProjectId.current && prevProjectId.current !== projectId) {
      projectContactsCache[prevProjectId.current] = {
        contacts,
        dmStatus,
        foundDMs,
        emailFinderStatus,
        foundEmails,
        linkedinStatus,
        scrapedProfiles,
        emailGenStatus,
        generatedEmails
      }
    }

    // Load state for new project (or initialize empty)
    if (projectId) {
      const cached = projectContactsCache[projectId]
      if (cached) {
        setContacts(cached.contacts)
        setDmStatus(cached.dmStatus)
        setFoundDMs(cached.foundDMs)
        setEmailFinderStatus(cached.emailFinderStatus)
        setFoundEmails(cached.foundEmails)
        setLinkedinStatus(cached.linkedinStatus)
        setScrapedProfiles(cached.scrapedProfiles)
        setEmailGenStatus(cached.emailGenStatus)
        setGeneratedEmails(cached.generatedEmails)
      } else {
        // New project - start fresh
        setContacts([])
        setDmStatus('idle')
        setFoundDMs([])
        setEmailFinderStatus('idle')
        setFoundEmails([])
        setLinkedinStatus('idle')
        setScrapedProfiles([])
        setEmailGenStatus('idle')
        setGeneratedEmails([])
      }
    }

    prevProjectId.current = projectId
  }, [selectedProject?.id])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveContactMenu(null)
      setShowHeaderMenu(false)
    }
    if (activeContactMenu || showHeaderMenu) {
      document.addEventListener('click', handleClickOutside)
    }
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [activeContactMenu, showHeaderMenu])

  // Decision Maker Finder simulation
  const startDMSearch = useCallback(() => {
    setDmStatus('searching')
    setDmProgress(0)
    setFoundDMs([])

    const interval = setInterval(() => {
      setDmProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setDmStatus('completed')
          setFoundDMs(SIMULATED_DECISION_MAKERS)
          return 100
        }
        return prev + Math.random() * 15 + 5
      })
    }, 500)
  }, [])

  const importDMs = useCallback(() => {
    const newContacts = foundDMs.map((dm, index) => ({
      id: `dm-${Date.now()}-${index}`,
      name: dm.name,
      role: dm.title,
      email: '',
      phone: '',
      linkedinUrl: dm.linkedin,
      linkedinScraped: false,
      emailFound: false,
      emailConfidence: 0,
      source: 'decision_maker_finder',
      reason: dm.reason
    }))
    setContacts(prev => [...prev, ...newContacts])
    setShowDMFinder(false)
  }, [foundDMs])

  // Email Finder simulation
  const startEmailSearch = useCallback(() => {
    setEmailFinderStatus('searching')
    setEmailFinderProgress(0)
    setFoundEmails([])

    const interval = setInterval(() => {
      setEmailFinderProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setEmailFinderStatus('completed')
          const emailResults = contacts.map(c => {
            const match = SIMULATED_EMAILS.find(e => e.name === c.name)
            return match || { name: c.name, email: `${c.name.toLowerCase().replace(' ', '.')}@company.com`, confidence: 0.6 + Math.random() * 0.35 }
          })
          setFoundEmails(emailResults)
          return 100
        }
        return prev + Math.random() * 12 + 3
      })
    }, 400)
  }, [contacts])

  const applyEmails = useCallback(() => {
    setContacts(prev => prev.map(c => {
      const found = foundEmails.find(e => e.name === c.name)
      if (found) {
        return { ...c, email: found.email, emailFound: true, emailConfidence: found.confidence }
      }
      return c
    }))
    setShowEmailFinder(false)
  }, [foundEmails])

  // LinkedIn Scraper simulation
  const startLinkedInScrape = useCallback(() => {
    setLinkedinStatus('scraping')
    setLinkedinProgress(0)
    setScrapedProfiles([])

    const contactsToScrape = contacts.filter(c => c.linkedinUrl || c.source === 'decision_maker_finder')
    let currentIndex = 0

    const interval = setInterval(() => {
      setLinkedinProgress(prev => {
        const newProgress = prev + (100 / Math.max(contactsToScrape.length, 1)) * 0.3
        if (newProgress >= 100) {
          clearInterval(interval)
          setLinkedinStatus('completed')
          setScrapedProfiles(SIMULATED_LINKEDIN_PROFILES)
          return 100
        }
        if (newProgress > (currentIndex + 1) * (100 / Math.max(contactsToScrape.length, 1))) {
          currentIndex++
        }
        return newProgress
      })
    }, 600)
  }, [contacts])

  const applyLinkedInData = useCallback(() => {
    setContacts(prev => prev.map(c => {
      const profile = scrapedProfiles.find(p => p.name === c.name)
      if (profile) {
        return { ...c, linkedinScraped: true, linkedinHeadline: profile.headline, linkedinSummary: profile.summary }
      }
      return c
    }))
    setShowLinkedInScraper(false)
  }, [scrapedProfiles])

  // Email Generator simulation
  const startEmailGeneration = useCallback(() => {
    setEmailGenStatus('generating')
    setGeneratedEmails([])

    setTimeout(() => {
      const emails = contacts.filter(c => c.email).map(c => ({
        contactId: c.id,
        contactName: c.name,
        subject: `Hydraulic Equipment for ${selectedProject?.address || 'Your Project'}`,
        body: `Hi ${c.name.split(' ')[0]},\n\nI noticed ${selectedProject?.contractor_name || 'your company'} is working on the ${selectedProject?.work_description?.substring(0, 50) || 'construction project'}...\n\nEnerpac specializes in synchronized lifting and positioning systems that could help with your equipment installation needs.\n\nWould you have 15 minutes this week to discuss?\n\nBest regards,\nEnerpac Sales Team`
      }))
      setGeneratedEmails(emails)
      setEmailGenStatus('completed')
    }, 3000)
  }, [contacts, selectedProject])

  const handleAddContact = () => {
    if (!newContact.name) return
    const contact = {
      id: `manual-${Date.now()}`,
      name: newContact.name,
      role: newContact.role || 'Contact',
      email: newContact.email || '',
      phone: '',
      linkedinUrl: '',
      linkedinScraped: false,
      emailFound: !!newContact.email,
      emailConfidence: newContact.email ? 1.0 : 0,
      source: 'Manual'
    }
    setContacts(prev => [...prev, contact])
    setNewContact({ name: '', role: '', email: '' })
    setShowAddContact(false)
  }

  const handleContactAction = (contactId: string, action: 'email' | 'linkedin' | 'copy') => {
    const contact = contacts.find(c => c.id === contactId)
    if (!contact) return
    setActiveContactMenu(null)

    if (action === 'email' && contact.email) {
      window.open(`mailto:${contact.email}`, '_blank')
    } else if (action === 'linkedin') {
      const searchQuery = encodeURIComponent(contact.name)
      window.open(`https://www.linkedin.com/search/results/people/?keywords=${searchQuery}`, '_blank')
    } else if (action === 'copy' && contact.email) {
      navigator.clipboard.writeText(contact.email)
    }
  }

  if (!selectedProject) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Contacts</h3>
          </div>
          <button disabled className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-500 text-white opacity-50 cursor-not-allowed">
            <MoreVertical className="w-3 h-3" />
            Actions
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-sm">Select a signal to view contacts</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with title and Actions button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Contacts</h3>
          {contacts.length > 0 && (
            <span className="text-sm text-gray-500">({contacts.length})</span>
          )}
        </div>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowHeaderMenu(!showHeaderMenu); }}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors bg-blue-500 hover:bg-blue-600 text-white"
          >
            <MoreVertical className="w-3 h-3" />
            Actions
            {dmStatus === 'searching' && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
            {dmStatus === 'completed' && (
              <div className="relative ml-1">
                <Users className="w-3 h-3 text-green-300" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            )}
            {linkedinStatus === 'completed' && (
              <div className="relative ml-1">
                <Linkedin className="w-3 h-3 text-blue-300" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              </div>
            )}
          </button>

          {/* Header Dropdown Menu */}
          {showHeaderMenu && (
            <div
              className="absolute right-0 top-8 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Add Contact */}
              <button
                onClick={() => { setShowAddContact(true); setShowHeaderMenu(false); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                <Plus className="w-4 h-4 text-orange-500" />
                <span className="text-gray-700">Add Contact</span>
              </button>

              <div className="border-t border-gray-100 my-1"></div>

              {/* Decision Makers */}
              <button
                onClick={() => { setShowDMFinder(true); setShowHeaderMenu(false); if (dmStatus === 'idle') startDMSearch(); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                {dmStatus === 'searching' ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> :
                 dmStatus === 'completed' ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                 <Search className="w-4 h-4 text-orange-500" />}
                <div className="flex flex-col">
                  <span className={dmStatus === 'completed' ? 'text-green-700' : 'text-gray-700'}>
                    {dmStatus === 'completed' ? `Found ${foundDMs.length} DMs` : dmStatus === 'searching' ? 'Finding...' : 'Find Decision Makers'}
                  </span>
                  <span className="text-xs text-gray-500">Search for key contacts</span>
                </div>
              </button>

              {/* Email Finder */}
              <button
                onClick={() => { setShowEmailFinder(true); setShowHeaderMenu(false); if (emailFinderStatus === 'idle' && contacts.length > 0) startEmailSearch(); }}
                disabled={contacts.length === 0}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50"
              >
                {emailFinderStatus === 'searching' ? <Loader2 className="w-4 h-4 animate-spin text-purple-500" /> :
                 emailFinderStatus === 'completed' ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                 <Mail className="w-4 h-4 text-purple-500" />}
                <div className="flex flex-col">
                  <span className={emailFinderStatus === 'completed' ? 'text-green-700' : 'text-gray-700'}>
                    {emailFinderStatus === 'completed' ? `Found ${foundEmails.length} Emails` : emailFinderStatus === 'searching' ? 'Finding...' : 'Find Email Addresses'}
                  </span>
                  <span className="text-xs text-gray-500">Find email addresses for contacts</span>
                </div>
              </button>

              {/* LinkedIn Scraping */}
              <button
                onClick={() => { setShowLinkedInScraper(true); setShowHeaderMenu(false); if (linkedinStatus === 'idle' && contacts.length > 0) startLinkedInScrape(); }}
                disabled={contacts.length === 0}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50"
              >
                {linkedinStatus === 'scraping' ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> :
                 linkedinStatus === 'completed' ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                 <Linkedin className="w-4 h-4 text-blue-600" />}
                <div className="flex flex-col">
                  <span className={linkedinStatus === 'completed' ? 'text-green-700' : 'text-gray-700'}>
                    {linkedinStatus === 'completed' ? `Found ${scrapedProfiles.length} Profiles` : linkedinStatus === 'scraping' ? 'Scraping...' : 'Scrape LinkedIn Profiles'}
                  </span>
                  <span className="text-xs text-gray-500">Scrape LinkedIn profiles</span>
                </div>
              </button>

              {/* Email Generation */}
              <button
                onClick={() => { setShowEmailGenerator(true); setShowHeaderMenu(false); if (emailGenStatus === 'idle') startEmailGeneration(); }}
                disabled={contacts.filter(c => c.email).length === 0}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-3 disabled:opacity-50"
              >
                {emailGenStatus === 'generating' ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> :
                 emailGenStatus === 'completed' ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                 <Sparkles className="w-4 h-4 text-orange-500" />}
                <div className="flex flex-col">
                  <span className={emailGenStatus === 'completed' ? 'text-green-700' : 'text-gray-700'}>
                    {emailGenStatus === 'completed' ? 'Email Results' : emailGenStatus === 'generating' ? 'Generating...' : 'Generate Emails'}
                  </span>
                  <span className="text-xs text-gray-500">Generate emails for all contacts</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Decision Makers Search Status Banner */}
        {dmStatus === 'searching' && (
          <div className="mb-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-orange-600 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-orange-900 text-sm">Finding Decision Makers</h4>
                  <span className="text-xs text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">AI Analyzing...</span>
                </div>
                <p className="text-xs text-orange-800 mt-1">Searching job postings, LinkedIn, and company data...</p>
                <div className="mt-2">
                  <div className="flex-1 bg-orange-200 rounded-full h-1.5">
                    <div className="bg-orange-500 h-1.5 rounded-full transition-all duration-300" style={{width: `${Math.min(dmProgress, 100)}%`}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Decision Makers Completed Banner */}
        {dmStatus === 'completed' && foundDMs.length > 0 && (
          <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-green-900 text-sm">Decision Makers Found</h4>
                  <button
                    onClick={() => setShowDMFinder(true)}
                    className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full hover:bg-green-200"
                  >
                    {foundDMs.length} DMs - View
                  </button>
                </div>
                <p className="text-xs text-green-800 mt-1">Click to view and import decision makers as contacts.</p>
              </div>
            </div>
          </div>
        )}

        {/* LinkedIn Scraping Status Banner */}
        {linkedinStatus === 'scraping' && (
          <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-blue-900 text-sm">Scraping LinkedIn Profiles</h4>
                  <span className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                    {Math.round(linkedinProgress)}%
                  </span>
                </div>
                <p className="text-xs text-blue-800 mt-1">Gathering profile information from LinkedIn...</p>
              </div>
            </div>
          </div>
        )}

        {/* Email Finder Status Banner */}
        {emailFinderStatus === 'searching' && (
          <div className="mb-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-purple-600 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-purple-900 text-sm">Finding Email Addresses</h4>
                  <span className="text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    {Math.round(emailFinderProgress)}%
                  </span>
                </div>
                <p className="text-xs text-purple-800 mt-1">Predicting and verifying email addresses...</p>
              </div>
            </div>
          </div>
        )}

        {/* Contacts List */}
        {contacts.length > 0 ? (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div key={contact.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 text-sm">{contact.name}</h4>

                      {/* Status Icons */}
                      <div className="flex items-center gap-1">
                        {contact.emailFound && (
                          <div className="relative group">
                            <Mail className="w-3 h-3 text-green-500" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              Email Found ({Math.round(contact.emailConfidence * 100)}%)
                            </div>
                          </div>
                        )}
                        {contact.linkedinScraped && (
                          <div className="relative group">
                            <Linkedin className="w-3 h-3 text-blue-500" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              LinkedIn Scraped
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 text-xs mt-0.5">{contact.role}</p>
                    {contact.email && (
                      <p className="text-gray-500 text-xs mt-1">{contact.email}</p>
                    )}
                    {contact.linkedinHeadline && (
                      <p className="text-gray-400 text-xs mt-1 line-clamp-1">{contact.linkedinHeadline}</p>
                    )}
                  </div>

                  {/* Right Side - LinkedIn Link, DM Badge, Actions */}
                  <div className="flex items-center gap-2 ml-3">
                    {contact.linkedinUrl && (
                      <a
                        href={contact.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded px-1 py-0.5 transition-colors"
                        title="View LinkedIn Profile"
                      >
                        <LinkedInIcon className="w-3 h-3" />
                        <ExternalLink className="w-2 h-2 opacity-70" />
                      </a>
                    )}

                    {contact.source === 'decision_maker_finder' && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">DM</span>
                    )}

                    {/* Actions Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveContactMenu(activeContactMenu === contact.id ? null : contact.id); }}
                        className="flex items-center justify-center w-7 h-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeContactMenu === contact.id && (
                        <div
                          className="absolute right-0 top-8 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {contact.email && (
                            <button
                              onClick={() => handleContactAction(contact.id, 'email')}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3"
                            >
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">Send Email</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleContactAction(contact.id, 'linkedin')}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3"
                          >
                            <Linkedin className="w-4 h-4 text-blue-600" />
                            <span className="text-gray-700">Find on LinkedIn</span>
                          </button>
                          {contact.email && (
                            <button
                              onClick={() => handleContactAction(contact.id, 'copy')}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3"
                            >
                              <Copy className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700">Copy Email</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 flex items-center justify-center h-32">
            <div>
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <div className="text-sm">No contacts yet</div>
              <div className="text-xs mt-1">Add a contact or find decision makers</div>
            </div>
          </div>
        )}
      </div>

      {/* Add Contact Popup */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Contact</h3>
              <button onClick={() => setShowAddContact(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={newContact.name} onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Full name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input type="text" value={newContact.role} onChange={(e) => setNewContact(prev => ({ ...prev, role: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g. Equipment Manager" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                <input type="email" value={newContact.email} onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="email@company.com" />
              </div>
              <button onClick={handleAddContact} disabled={!newContact.name} className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                Add Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Maker Finder Modal */}
      {showDMFinder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Find Decision Makers</h3>
              <button onClick={() => setShowDMFinder(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {dmStatus === 'searching' && (
              <div className="text-center py-8">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
                <div className="text-sm font-medium text-gray-700 mb-2">AI Analyzing Company...</div>
                <div className="text-xs text-gray-500 mb-4">Searching job postings, LinkedIn, and company data</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(dmProgress, 100)}%` }} />
                </div>
                <div className="text-xs text-gray-400 mt-2">{Math.round(Math.min(dmProgress, 100))}%</div>
              </div>
            )}

            {dmStatus === 'completed' && (
              <div>
                <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Found {foundDMs.length} decision makers</span>
                </div>
                <div className="space-y-3 mb-4">
                  {foundDMs.map((dm, i) => (
                    <div key={i} className="p-3 border border-gray-200 rounded-lg">
                      <div className="font-medium text-sm">{dm.name}</div>
                      <div className="text-xs text-gray-500">{dm.title}</div>
                      <div className="text-xs text-gray-400 mt-1">{dm.reason}</div>
                    </div>
                  ))}
                </div>
                <button onClick={importDMs} className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium">
                  Import All Contacts
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Finder Modal */}
      {showEmailFinder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Find Email Addresses</h3>
              <button onClick={() => setShowEmailFinder(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {emailFinderStatus === 'searching' && (
              <div className="text-center py-8">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto mb-4" />
                <div className="text-sm font-medium text-gray-700 mb-2">Predicting Email Addresses...</div>
                <div className="text-xs text-gray-500 mb-4">Analyzing email patterns and verifying addresses</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(emailFinderProgress, 100)}%` }} />
                </div>
              </div>
            )}

            {emailFinderStatus === 'completed' && (
              <div>
                <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Found {foundEmails.length} email addresses</span>
                </div>
                <div className="space-y-2 mb-4">
                  {foundEmails.map((e, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <div className="text-sm font-medium">{e.name}</div>
                        <div className="text-xs text-blue-600">{e.email}</div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        e.confidence >= 0.85 ? 'text-green-600 bg-green-50' :
                        e.confidence >= 0.7 ? 'text-yellow-600 bg-yellow-50' :
                        'text-red-600 bg-red-50'
                      }`}>
                        {Math.round(e.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
                <button onClick={applyEmails} className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium">
                  Apply Email Addresses
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LinkedIn Scraper Modal */}
      {showLinkedInScraper && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Scrape LinkedIn Profiles</h3>
              <button onClick={() => setShowLinkedInScraper(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {linkedinStatus === 'scraping' && (
              <div className="text-center py-8">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                <div className="text-sm font-medium text-gray-700 mb-2">Scraping LinkedIn Profiles...</div>
                <div className="text-xs text-gray-500 mb-4">Extracting profile information</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(linkedinProgress, 100)}%` }} />
                </div>
                <div className="text-xs text-gray-400 mt-2">{Math.round(Math.min(linkedinProgress, 100))}%</div>
              </div>
            )}

            {linkedinStatus === 'completed' && (
              <div>
                <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Scraped {scrapedProfiles.length} profiles</span>
                </div>
                <div className="space-y-3 mb-4">
                  {scrapedProfiles.map((p, i) => (
                    <div key={i} className="p-3 border border-gray-200 rounded-lg">
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-xs text-blue-600">{p.headline}</div>
                      <div className="text-xs text-gray-400 mt-1">{p.location}</div>
                      <div className="text-xs text-gray-500 mt-2">{p.summary}</div>
                    </div>
                  ))}
                </div>
                <button onClick={applyLinkedInData} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Apply Profile Data
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Generator Modal */}
      {showEmailGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Generate Emails</h3>
              <button onClick={() => setShowEmailGenerator(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {emailGenStatus === 'generating' && (
              <div className="text-center py-8">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
                <div className="text-sm font-medium text-gray-700 mb-2">Generating Personalized Emails...</div>
                <div className="text-xs text-gray-500">Creating outreach for {contacts.filter(c => c.email).length} contacts</div>
              </div>
            )}

            {emailGenStatus === 'completed' && (
              <div>
                <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Generated {generatedEmails.length} emails</span>
                </div>
                <div className="space-y-4">
                  {generatedEmails.map((email, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                        <div className="text-sm font-medium">{email.contactName}</div>
                        <button
                          onClick={() => navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`)}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="text-xs text-gray-500 mb-1">Subject:</div>
                        <div className="text-sm font-medium mb-3">{email.subject}</div>
                        <div className="text-xs text-gray-500 mb-1">Body:</div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">{email.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Outreach Drafting with Value Prop generation
const DemoOutreachDrafting = ({ selectedProject }: { selectedProject?: any }) => {
  const [valueProp, setValueProp] = useState('')
  const [otherNotes, setOtherNotes] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Reset when project changes
  useEffect(() => {
    setValueProp('')
    setOtherNotes('')
    setIsSaved(false)
    setLastSaved(null)
  }, [selectedProject?.id])

  const handleGenerateValueProp = async () => {
    if (!selectedProject) return
    setIsGenerating(true)

    await new Promise(resolve => setTimeout(resolve, 2500))

    // Generate personalized value prop based on permit data
    const reasonCodes = selectedProject.reason_codes || []
    const contractor = selectedProject.contractor_name || 'your team'
    const valuation = selectedProject.valuation_display || ''
    const workDesc = selectedProject.work_description || selectedProject.description || ''

    let template = ''

    // Match based on reason codes for more specific messaging
    if (reasonCodes.some((c: string) => c.includes('bearing') || c.includes('bridge') || c.includes('jacking'))) {
      template = `For your bridge work${valuation ? ` (${valuation} project)` : ''}, Enerpac's synchronized lifting systems are the industry standard. Our EVO hydraulic systems provide precision lifting up to 0.040" between points for bearing replacement. We can support ${contractor} with rental equipment and on-site technical support.`
    } else if (reasonCodes.some((c: string) => c.includes('refinery') || c.includes('heat_exchanger') || c.includes('bolt_tensioning'))) {
      template = `For your refinery/process equipment work, Enerpac offers hydraulic bundle extractors for heat exchanger maintenance and precision bolting/tensioning tools for flange integrity. We support turnaround schedules with rapid equipment mobilization and can provide ${contractor} with the tools needed for this ${valuation} project.`
    } else if (reasonCodes.some((c: string) => c.includes('steel_mill') || c.includes('rolling_mill') || c.includes('heavy_equipment'))) {
      template = `For your heavy industrial equipment installation${valuation ? ` (${valuation})` : ''}, Enerpac provides synchronized jacking, precision alignment tools, and heavy-duty positioning systems. Our equipment is proven in steel mill and manufacturing applications - perfect for the scope ${contractor} is handling.`
    } else if (reasonCodes.some((c: string) => c.includes('generator') || c.includes('equipment_install'))) {
      template = `For your equipment installation project${valuation ? ` (${valuation})` : ''}, Enerpac hydraulic gantry and positioning systems handle multi-ton equipment with precision leveling. We can support ${contractor} with rental equipment and technical expertise for generator, HVAC, or heavy machinery placement.`
    } else if (reasonCodes.some((c: string) => c.includes('structural_steel') || c.includes('foundation'))) {
      template = `For your structural work${valuation ? ` (${valuation} project)` : ''}, Enerpac provides hydraulic jacking and positioning equipment for steel erection and foundation work. Our systems ensure precision alignment during assembly. We can support ${contractor} with the right equipment for this project.`
    } else {
      template = `Enerpac offers high-pressure hydraulic tools and synchronized lifting systems for your ${valuation} project. Our equipment supports ${contractor} with precision positioning, heavy lifting, and bolting solutions. We can customize rental packages based on your specific requirements.`
    }

    setValueProp(template)
    setIsGenerating(false)
  }

  const handleSave = async () => {
    await new Promise(resolve => setTimeout(resolve, 500))
    setIsSaved(true)
    setLastSaved(new Date())
    setTimeout(() => setIsSaved(false), 2000)
  }

  if (!selectedProject) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <div className="text-lg font-medium mb-2">No Permit Selected</div>
          <div className="text-sm">Select a permit to draft outreach.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Outreach Drafting</h3>
        {lastSaved && (
          <div className="text-xs text-gray-400">
            Saved {lastSaved.toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Value Proposition */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Our Offer / Value Prop</label>
            <button
              onClick={handleGenerateValueProp}
              disabled={isGenerating}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
            >
              {isGenerating ? (
                <>
                  <div className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                'Generate with AI'
              )}
            </button>
          </div>
          <textarea
            value={valueProp}
            onChange={(e) => setValueProp(e.target.value)}
            placeholder="Describe how Enerpac can help with this permit's scope of work..."
            rows={5}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        {/* Other Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Other Notes</label>
          <textarea
            value={otherNotes}
            onChange={(e) => setOtherNotes(e.target.value)}
            placeholder="Add personalization notes, key contacts, or follow-up reminders..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
        </div>

        {/* Email Footer Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email Footer</label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
            <p>Best regards,</p>
            <p className="font-medium">Enerpac Sales Team</p>
            <p className="text-xs text-gray-500 mt-2">Your regional equipment specialist</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={!valueProp && !otherNotes}
          className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            isSaved
              ? 'bg-green-500 text-white'
              : !valueProp && !otherNotes
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isSaved ? (
            <>
              <Check className="w-4 h-4" />
              Saved!
            </>
          ) : (
            'Save Notes'
          )}
        </button>
      </div>
    </div>
  )
}

// Main Outreach Page
export const EnerpacOutreachPage = () => {
  const { approvedProjects } = useDemoContext()
  const [showSequenceBuilder, setShowSequenceBuilder] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any>(null)

  return (
    <div className="h-full bg-gray-50 overflow-hidden flex flex-col">
      {/* Top Title Bar */}
      <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Outreach Management</h1>
          <button
            onClick={() => setShowSequenceBuilder(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            <Settings className="w-4 h-4" />
            Sequence Builder
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-4 px-4 sm:px-6 lg:px-8 pb-4 min-h-0">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 min-h-0">
          <DemoOutreachSidebar
            approvedProjects={approvedProjects}
            selectedProject={selectedProject}
            onProjectSelect={setSelectedProject}
          />
        </div>

        {/* Main Content - 2x2 Grid Layout */}
        <div className="flex-1 min-h-0">
          <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
            {/* Top-left: Intent/Project Details */}
            <div className="overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200">
              <DemoIntentCard selectedProject={selectedProject} />
            </div>

            {/* Top-right: CRM Connection */}
            <div className="overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200">
              <DemoCRMConnection selectedProject={selectedProject} />
            </div>

            {/* Bottom-left: Contacts */}
            <div className="overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <DemoContactsComponent selectedProject={selectedProject} />
            </div>

            {/* Bottom-right: Outreach Drafting */}
            <div className="overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200">
              <DemoOutreachDrafting selectedProject={selectedProject} />
            </div>
          </div>
        </div>
      </div>

      {/* Sequence Builder Modal */}
      {showSequenceBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sequence Builder</h3>
            <p className="text-gray-600 mb-4">
              Create automated email sequences for your outreach campaigns. Configure timing, templates, and follow-up rules.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="text-sm font-medium text-orange-800">Demo Mode</div>
              <div className="text-xs text-orange-700 mt-1">
                In the full version, you can create custom sequences with multiple steps, A/B testing, and automated follow-ups.
              </div>
            </div>
            <button
              onClick={() => setShowSequenceBuilder(false)}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
