import { useState, useEffect } from 'react'
import { Settings, Plus, MoreVertical, Check, Search, Mail, Linkedin, UserPlus, ExternalLink, Building, MapPin, Calendar, DollarSign } from 'lucide-react'
import { useDemoContext } from './EnerpacDemoContainer'
import { config } from '../../lib/config'

// Convert spec_fit (0-1) to intent score (1-5)
const getIntentScore = (spec_fit: number) => Math.round(spec_fit * 5)

// Demo projects data - will be replaced with real data
const DEMO_PROJECTS_FALLBACK = [
  { id: "mil-16th-st", name: "16th Street Bridge", project: "Bridge over Menomonee River", score: 5 },
  { id: "mil-bridge-maint-2025", name: "Milwaukee Bridge Program", project: "Bridge maintenance", score: 4 },
  { id: "mil-industrial-mro", name: "We Energies", project: "Power plant maintenance", score: 5 }
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
              name: project.project_name,
              project: project.description ? project.description.substring(0, 50) + '...' : 'Construction Project',
              score: getIntentScore(project.spec_fit || 0.8),
              location: project.location,
              bid_due: project.bid_due,
              contacts: project.contacts || [],
              ...project
            }))
          setRealProjects(outreachProjects)
        } else {
          setRealProjects(DEMO_PROJECTS_FALLBACK)
        }
      } catch (error) {
        console.error('Error loading projects:', error)
        setRealProjects(DEMO_PROJECTS_FALLBACK)
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
        Approved Signals ({approvedProjectsData.length})
      </h3>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {approvedProjectsData.length === 0 ? (
        <div className="text-center py-8 flex-1">
          <div className="text-gray-500 text-sm">
            {searchTerm ? 'No matching projects.' : 'No approved projects yet.'}
            <br />
            Go to Projects tab and approve some signals.
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
                  <div className="font-medium text-sm truncate">{project.name || project.project_name}</div>
                  <div className="text-xs text-gray-500 truncate">{project.location}</div>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  project.score >= 4 ? 'bg-green-100 text-green-700' :
                  project.score >= 3 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {project.score}
                </div>
              </div>
              {project.bid_due && (
                <div className="text-xs text-orange-600 mt-1">Due: {project.bid_due}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Intent Card - Shows project details
const DemoIntentCard = ({ selectedProject }: { selectedProject?: any }) => {
  if (!selectedProject) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <Building className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <div className="text-lg font-medium mb-2">No Project Selected</div>
          <div className="text-sm">Select a project from the sidebar to view details.</div>
        </div>
      </div>
    )
  }

  const score = selectedProject.score || getIntentScore(selectedProject.spec_fit || 0.8)

  return (
    <div className="p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{selectedProject.name || selectedProject.project_name}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            <span>{selectedProject.location}</span>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-bold ${
          score >= 4 ? 'bg-green-100 text-green-700' :
          score >= 3 ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          Score: {score}
        </div>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {selectedProject.budget && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <DollarSign className="w-3 h-3" />
              Budget
            </div>
            <div className="font-medium text-sm">{selectedProject.budget}</div>
          </div>
        )}
        {selectedProject.timeline && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Calendar className="w-3 h-3" />
              Timeline
            </div>
            <div className="font-medium text-sm">{selectedProject.timeline}</div>
          </div>
        )}
        {selectedProject.project_type && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Type</div>
            <div className="font-medium text-sm">{selectedProject.project_type}</div>
          </div>
        )}
        {selectedProject.stage && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Stage</div>
            <div className="font-medium text-sm">{selectedProject.stage}</div>
          </div>
        )}
      </div>

      {/* Description */}
      {selectedProject.description && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 mb-2">Description</div>
          <p className="text-sm text-gray-700">{selectedProject.description}</p>
        </div>
      )}

      {/* Reasoning / AI Analysis */}
      {selectedProject.reasoning && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs font-medium text-green-700 mb-2">AI Analysis</div>
          <p className="text-sm text-green-800">{selectedProject.reasoning}</p>
        </div>
      )}

      {/* Reason Codes */}
      {selectedProject.reason_codes && selectedProject.reason_codes.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 mb-2">Matched Keywords</div>
          <div className="flex flex-wrap gap-2">
            {selectedProject.reason_codes.map((code: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                {code.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Source */}
      {selectedProject.source && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500">Source: {selectedProject.source}</div>
          {selectedProject.project_url && (
            <a
              href={selectedProject.project_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              View Source <ExternalLink className="w-3 h-3" />
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

// Contacts Component with actions menu
const DemoContactsComponent = ({ selectedProject }: { selectedProject?: any }) => {
  const [contacts, setContacts] = useState<any[]>([])
  const [contactedIds, setContactedIds] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [activeContactMenu, setActiveContactMenu] = useState<string | null>(null)
  const [newContact, setNewContact] = useState({ name: '', role: '', email: '' })
  const [actionStatus, setActionStatus] = useState<{[key: string]: 'idle' | 'loading' | 'done'}>({
    findDM: 'idle',
    generateEmails: 'idle',
    scrapeLinkedIn: 'idle',
    findEmails: 'idle'
  })

  // Load contacts from project
  useEffect(() => {
    if (selectedProject?.contacts) {
      const projectContacts = selectedProject.contacts.map((contact: any, index: number) => ({
        id: `${selectedProject.id}-contact-${index}`,
        name: contact.name || 'Unknown Contact',
        role: contact.role || 'Contact',
        email: contact.email || '',
        phone: contact.phone || '',
        linkedin: Math.random() > 0.5,
        hasEmail: !!contact.email,
        emailGenerated: false,
        source: 'Project Data'
      }))
      setContacts(projectContacts)
    } else {
      setContacts([])
    }
    setContactedIds([])
    setActionStatus({ findDM: 'idle', generateEmails: 'idle', scrapeLinkedIn: 'idle', findEmails: 'idle' })
  }, [selectedProject?.id])

  const handleFindContacts = async () => {
    if (!selectedProject) return
    setIsSearching(true)
    setSearchError(null)

    try {
      const apiUrl = `${config.api.baseUrl.replace(/\/$/, '')}/api/enerpac/enrich-contacts`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: selectedProject.project_name || selectedProject.name,
          company_name: selectedProject.source || 'City of Milwaukee',
          location: selectedProject.location || 'Milwaukee, WI',
          project_type: selectedProject.project_type,
          description: selectedProject.description
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.contacts && data.contacts.length > 0) {
          const newContacts = data.contacts.map((contact: any, index: number) => ({
            id: `enriched-${selectedProject.id}-${index}-${Date.now()}`,
            name: contact.name,
            role: contact.role,
            email: contact.email || '',
            phone: contact.phone || '',
            linkedin: !!contact.linkedin,
            hasEmail: !!contact.email,
            emailGenerated: false,
            source: 'AI Search'
          }))
          setContacts(prev => [...prev, ...newContacts])
        } else {
          setSearchError('No new contacts found.')
        }
      } else {
        setSearchError('Search failed. Please try again.')
      }
    } catch (error) {
      console.error('Error finding contacts:', error)
      setSearchError('Connection error. Check API.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAction = async (action: string) => {
    setShowActionsMenu(false)
    setActionStatus(prev => ({ ...prev, [action]: 'loading' }))
    await new Promise(resolve => setTimeout(resolve, 2000))
    setActionStatus(prev => ({ ...prev, [action]: 'done' }))

    // Simulate action results
    if (action === 'findDM') {
      const newDM = {
        id: `dm-${Date.now()}`,
        name: 'John Anderson',
        role: 'Project Manager',
        email: 'j.anderson@example.com',
        linkedin: true,
        hasEmail: true,
        emailGenerated: false,
        source: 'Decision Maker Search'
      }
      setContacts(prev => [...prev, newDM])
    }
    if (action === 'generateEmails') {
      setContacts(prev => prev.map(c => ({ ...c, emailGenerated: true })))
    }
  }

  const handleAddContact = () => {
    if (!newContact.name || !newContact.email) return
    const contact = {
      id: `manual-${Date.now()}`,
      ...newContact,
      linkedin: false,
      hasEmail: true,
      emailGenerated: false,
      source: 'Manual'
    }
    setContacts(prev => [...prev, contact])
    setNewContact({ name: '', role: '', email: '' })
    setShowAddContact(false)
  }

  const handleContactAction = (contactId: string, action: 'email' | 'linkedin' | 'phone') => {
    const contact = contacts.find(c => c.id === contactId)
    if (!contact) return

    setActiveContactMenu(null)

    if (action === 'email' && contact.email) {
      // Open email client with pre-filled subject
      const subject = encodeURIComponent(`Re: ${selectedProject?.project_name || 'Project Inquiry'}`)
      window.open(`mailto:${contact.email}?subject=${subject}`, '_blank')
      setContactedIds(prev => prev.includes(contactId) ? prev : [...prev, contactId])
    } else if (action === 'linkedin') {
      // Open LinkedIn search - only by name for better results
      const searchQuery = encodeURIComponent(contact.name)
      window.open(`https://www.linkedin.com/search/results/people/?keywords=${searchQuery}`, '_blank')
      setContactedIds(prev => prev.includes(contactId) ? prev : [...prev, contactId])
    } else if (action === 'phone' && contact.phone) {
      // Copy phone to clipboard
      navigator.clipboard.writeText(contact.phone)
      alert(`Phone copied: ${contact.phone}`)
    }
  }

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <div className="text-lg font-medium mb-2">No Contacts</div>
          <div className="text-sm">Select a project to view contacts.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Contacts ({contacts.length})</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddContact(true)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Add Contact"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showActionsMenu && (
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-48">
                <button
                  onClick={() => handleAction('findDM')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Find Decision Makers
                  {actionStatus.findDM === 'done' && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                </button>
                <button
                  onClick={() => handleAction('generateEmails')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Generate Emails
                  {actionStatus.generateEmails === 'done' && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                </button>
                <button
                  onClick={() => handleAction('scrapeLinkedIn')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Linkedin className="w-4 h-4" />
                  Scrape LinkedIn
                  {actionStatus.scrapeLinkedIn === 'done' && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                </button>
                <button
                  onClick={() => handleAction('findEmails')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Find Email Addresses
                  {actionStatus.findEmails === 'done' && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleFindContacts}
            disabled={isSearching}
            className="px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 disabled:bg-gray-300 transition-colors flex items-center gap-2"
          >
            {isSearching ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Searching...
              </>
            ) : (
              'Find Contacts'
            )}
          </button>
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-sm font-medium mb-2">Add Contact</div>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Name"
              value={newContact.name}
              onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm"
            />
            <input
              type="text"
              placeholder="Role"
              value={newContact.role}
              onChange={(e) => setNewContact(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm"
            />
            <input
              type="email"
              placeholder="Email"
              value={newContact.email}
              onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddContact}
                className="flex-1 px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddContact(false)}
                className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {searchError && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          {searchError}
        </div>
      )}

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className={`p-3 border rounded-lg transition-all duration-200 ${
              contactedIds.includes(contact.id)
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm truncate">{contact.name}</div>
                  {contact.emailGenerated && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Email Ready</span>
                  )}
                  {contact.source === 'Decision Maker Search' && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">DM</span>
                  )}
                  {contactedIds.includes(contact.id) && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <div className="text-xs text-gray-500">{contact.role}</div>
                {contact.email && <div className="text-xs text-gray-400">{contact.email}</div>}
              </div>

              {/* Contact Actions Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setActiveContactMenu(activeContactMenu === contact.id ? null : contact.id)}
                  className="px-3 py-1.5 text-xs rounded font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-1"
                >
                  Reach Out
                  <MoreVertical className="w-3 h-3" />
                </button>

                {activeContactMenu === contact.id && (
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 w-40">
                    {contact.email && (
                      <button
                        onClick={() => handleContactAction(contact.id, 'email')}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Mail className="w-4 h-4 text-gray-500" />
                        Send Email
                      </button>
                    )}
                    <button
                      onClick={() => handleContactAction(contact.id, 'linkedin')}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Linkedin className="w-4 h-4 text-blue-600" />
                      Find on LinkedIn
                    </button>
                    {contact.phone && (
                      <button
                        onClick={() => handleContactAction(contact.id, 'phone')}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-500" />
                        Copy Phone
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {contacts.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No contacts yet. Click "Find Contacts" to search.
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {activeContactMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setActiveContactMenu(null)}
        />
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

    const projectType = selectedProject.project_type || 'construction'
    const templates: {[key: string]: string} = {
      'Bridge': `Enerpac's synchronized lifting systems are ideal for your bridge project. Our EVO hydraulic systems can safely lift bridge decks for bearing replacement with precision up to 0.040" between lift points. We've successfully supported similar projects including the Savio Viaduct (1,224-6,600 tonnes) and UK bridge deck installations.`,
      'Energy': `For your power plant work, Enerpac offers precision bolting and tensioning tools essential for turbine maintenance and generator repairs. Our tools ensure joint integrity on critical flanges, and we can mobilize quickly for scheduled outages. Our heat exchanger positioning equipment can speed up your maintenance schedule.`,
      'Industrial': `Enerpac provides heavy lifting and positioning solutions for industrial equipment installation. Our hydraulic gantry systems and jack-up equipment can handle multi-ton generators, cooling systems, and manufacturing machinery with precision positioning and leveling capabilities.`,
      'default': `Enerpac offers high-pressure hydraulic tools and synchronized lifting systems for your project. Our equipment is proven in bridge construction, power generation, and industrial maintenance applications. We can provide customized solutions based on your specific lifting, positioning, and bolting requirements.`
    }

    setValueProp(templates[projectType] || templates.default)
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
          <div className="text-lg font-medium mb-2">No Project Selected</div>
          <div className="text-sm">Select a project to draft outreach.</div>
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
            placeholder="Describe how Enerpac can help with this project..."
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
