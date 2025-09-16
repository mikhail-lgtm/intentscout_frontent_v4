import { useState, useCallback, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { useDemoContext } from './USGDemoContainer'

// Convert spec_fit (0-1) to intent score (1-5)
const getIntentScore = (spec_fit: number) => Math.round(spec_fit * 5)

// Demo projects data - will be replaced with real data
const DEMO_PROJECTS_FALLBACK = [
  { id: "cc-0", name: "Miami Metro Construction", project: "Emergency Doors Project", score: 4 },
  { id: "cc-1", name: "North Port Engineering", project: "Wastewater Facility", score: 4 },
  { id: "cc-2", name: "Jupiter Parks & Recreation", project: "Pickleball Courts", score: 3 }
]

// Demo components (simplified versions of the real ones)
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

  // Load real projects data
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/usg_projects.json')
        if (res.ok) {
          const data = await res.json()
          // Convert to outreach format
          const outreachProjects = data.map((project: any) => ({
            id: project.id || `project-${Math.random()}`, // Use the 'id' field that matches demo data
            name: project.project_name,
            project: project.description ? project.description.substring(0, 50) + '...' : 'Construction Project',
            score: getIntentScore(project.spec_fit || 0.8),
            location: project.location,
            bid_due: project.bid_due,
            contacts: project.contacts || [],
            // Include all original data
            ...project
          }))
          setRealProjects(outreachProjects)
        } else {
          // Fallback to demo data
          setRealProjects(DEMO_PROJECTS_FALLBACK)
        }
      } catch (error) {
        console.error('Error loading projects:', error)
        setRealProjects(DEMO_PROJECTS_FALLBACK)
      }
    }

    fetchProjects()
  }, [])

  const approvedProjectsData = realProjects.filter(p => approvedProjects.includes(p.id))

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Approved Signals ({approvedProjectsData.length})
      </h3>
      {approvedProjectsData.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 text-sm">
            No approved projects yet.
            <br />
            Go to Projects tab and approve some signals to see them here.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {approvedProjectsData.map((project) => (
            <div
              key={project.id}
              onClick={() => onProjectSelect(project)}
              className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                selectedProject?.id === project.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm">{project.name}</div>
              <div className="text-xs text-gray-500">{project.project}</div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-green-600">Score: {project.score}</div>
                {selectedProject?.id === project.id && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const DemoIntentCard = ({ selectedProject }: { selectedProject?: any }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!selectedProject) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">No Project Selected</div>
          <div className="text-sm">Select an approved project from the sidebar to view intent signals.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Intent Signals</h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-600 font-medium">Live Analysis</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border-l-4 border-green-500 pl-4 bg-green-50 rounded-r-lg p-3 transition-all duration-200 hover:bg-green-100">
          <div className="flex items-center justify-between">
            <div className="font-medium text-green-800">High Intent Signal Detected</div>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Score: {selectedProject.score}</span>
          </div>
          <div className="text-sm text-green-700 mt-1">
            {selectedProject.name} is actively seeking construction materials with specific requirements for {selectedProject.project}.
          </div>
          <div className="text-xs text-green-600 mt-2 flex items-center gap-2">
            <span>Confidence: 90%</span>
            <span>•</span>
            <span>Updated 2 min ago</span>
          </div>
        </div>

        <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 rounded-r-lg p-3 transition-all duration-200 hover:bg-blue-100">
          <div className="font-medium text-blue-800">Project Timeline Signal</div>
          <div className="text-sm text-blue-700 mt-1">
            Bid due date indicates urgent procurement needs for this construction project.
          </div>
          <div className="text-xs text-blue-600 mt-2">Confidence: 75%</div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left border-l-4 border-orange-500 pl-4 bg-orange-50 rounded-r-lg p-3 transition-all duration-200 hover:bg-orange-100"
        >
          <div className="flex items-center justify-between">
            <div className="font-medium text-orange-800">Technical Specification Signals</div>
            <span className="text-orange-600">{isExpanded ? '−' : '+'}</span>
          </div>
          {isExpanded && (
            <div className="mt-2 space-y-2">
              <div className="text-sm text-orange-700">Fire-rating requirements detected</div>
              <div className="text-sm text-orange-700">Steel construction materials specified</div>
              <div className="text-sm text-orange-700">3-hour rating compliance needed</div>
            </div>
          )}
        </button>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
          Generate AI Insights
        </button>
      </div>
    </div>
  )
}

const DemoHubSpotSending = ({ selectedProject }: { selectedProject?: any }) => {
  const [isConfigured, setIsConfigured] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [emailsSent, setEmailsSent] = useState(0)

  const handleConfigure = () => {
    setIsConfigured(true)
  }

  const handleSendEmails = async () => {
    setIsSending(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setEmailsSent(prev => prev + Math.floor(Math.random() * 3) + 1)
    setIsSending(false)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">HubSpot Integration</h3>
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-gray-400'}`}></div>
      </div>

      {!isConfigured ? (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm font-medium text-yellow-800 mb-2">Setup Required</div>
            <div className="text-xs text-yellow-700">
              Connect your HubSpot account to sync contacts and send personalized emails.
            </div>
          </div>
          <button
            onClick={handleConfigure}
            className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
          >
            Configure HubSpot
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm font-medium text-green-800 mb-2">Connected</div>
            <div className="text-xs text-green-700">
              HubSpot integration is active. Ready to send emails.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-lg font-bold text-gray-900">{emailsSent}</div>
              <div className="text-xs text-gray-600">Emails Sent</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-lg font-bold text-gray-900">{selectedProject ? '3' : '0'}</div>
              <div className="text-xs text-gray-600">Contacts Found</div>
            </div>
          </div>

          <button
            onClick={handleSendEmails}
            disabled={isSending || !selectedProject}
            className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isSending
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : selectedProject
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSending ? 'Sending...' : 'Send Personalized Emails'}
          </button>

          {!selectedProject && (
            <div className="text-xs text-gray-500 text-center">
              Select a project to send emails
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const DemoContactsComponent = ({ selectedProject }: { selectedProject?: any }) => {
  const [contactedIds, setContactedIds] = useState<string[]>([])

  // Get real contacts from project data
  const contacts = selectedProject?.contacts ?
    selectedProject.contacts.map((contact: any, index: number) => ({
      id: `${selectedProject.id}-contact-${index}`,
      name: contact.name || 'Unknown Contact',
      role: contact.role || 'Contact',
      email: contact.email || '',
      linkedin: Math.random() > 0.5 // Random LinkedIn presence
    })).filter((contact: any) => contact.email) // Only show contacts with emails
    : []

  const handleContact = (contactId: string) => {
    setContactedIds(prev => [...prev, contactId])
  }

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">No Contacts</div>
          <div className="text-sm">Select a project to view contacts.</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Contacts ({contacts.length})</h3>
      </div>

      <div className="space-y-3">
        {contacts.map((contact: any) => (
          <div
            key={contact.id}
            className={`p-3 border rounded-lg transition-all duration-200 ${
              contactedIds.includes(contact.id)
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm">{contact.name}</div>
                  {contact.linkedin && (
                    <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
                  )}
                  {contactedIds.includes(contact.id) && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Contacted
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">{contact.role}</div>
                <div className="text-xs text-gray-500">{contact.email}</div>
              </div>
              <button
                onClick={() => handleContact(contact.id)}
                disabled={contactedIds.includes(contact.id)}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  contactedIds.includes(contact.id)
                    ? 'bg-green-100 text-green-700 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {contactedIds.includes(contact.id) ? 'Contacted' : 'Contact'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          Found {contacts.length} decision makers for {selectedProject.name}
        </div>
      </div>
    </div>
  )
}

const DemoEmailDrafting = ({ selectedProject }: { selectedProject?: any }) => {
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)

  const generateEmail = async () => {
    if (!selectedProject) return

    setIsGenerating(true)
    await new Promise(resolve => setTimeout(resolve, 2000))

    setSubject(`${selectedProject.project} - Partnership Opportunity`)
    setContent(`Hi there,

I noticed your ${selectedProject.project} and wanted to reach out about a potential partnership opportunity.

We specialize in construction materials and have successfully completed similar projects. Our solutions could be a great fit for your requirements.

Would you be interested in discussing how we can support your project needs?

Best regards,
Your Sales Team`)

    setIsGenerated(true)
    setIsGenerating(false)
  }

  const handleEdit = () => {
    setIsGenerated(false)
  }

  if (!selectedProject) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">No Project Selected</div>
          <div className="text-sm">Select a project to draft personalized emails.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Email Drafting</h3>
        {isGenerated && (
          <button
            onClick={handleEdit}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            readOnly={isGenerated}
            placeholder="Enter email subject..."
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${
              isGenerated ? 'bg-gray-50' : 'bg-white'
            }`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            readOnly={isGenerated}
            placeholder="Enter email content..."
            rows={8}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm ${
              isGenerated ? 'bg-gray-50' : 'bg-white'
            }`}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={generateEmail}
            disabled={isGenerating}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isGenerating
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isGenerating ? 'Generating...' : 'Generate with AI'}
          </button>

          {isGenerated && (
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              Send
            </button>
          )}
        </div>

        {isGenerated && (
          <div className="text-xs text-green-600 text-center">
            Email generated for {selectedProject.name}
          </div>
        )}
      </div>
    </div>
  )
}

export const USGOutreachPage = () => {
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
            Sequence Builder (Demo)
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 px-4 sm:px-6 lg:px-8 pb-6 min-h-0">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 min-h-0">
          <DemoOutreachSidebar
            approvedProjects={approvedProjects}
            selectedProject={selectedProject}
            onProjectSelect={setSelectedProject}
          />
        </div>

        {/* Main Content - 2x2 Grid Layout */}
        <div className="flex-1 p-4 min-h-0">
          <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full max-w-6xl mx-auto">
            {/* Top-left: Intent Signals */}
            <div className="overflow-y-auto custom-scrollbar bg-white rounded-lg shadow-sm border border-gray-200">
              <DemoIntentCard selectedProject={selectedProject} />
            </div>

            {/* Top-right: HubSpot Sending */}
            <div className="overflow-y-auto custom-scrollbar bg-white rounded-lg shadow-sm border border-gray-200">
              <DemoHubSpotSending selectedProject={selectedProject} />
            </div>

            {/* Bottom-left: Contacts */}
            <div className="overflow-y-auto custom-scrollbar bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <DemoContactsComponent selectedProject={selectedProject} />
            </div>

            {/* Bottom-right: Email Notes */}
            <div className="overflow-y-auto custom-scrollbar bg-white rounded-lg shadow-sm border border-gray-200">
              <DemoEmailDrafting selectedProject={selectedProject} />
            </div>
          </div>
        </div>
      </div>

      {/* Demo Notice Modal */}
      {showSequenceBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo Mode</h3>
            <p className="text-gray-600 mb-6">
              The Sequence Builder is available in the full version. This demo shows the interface layout and basic functionality.
            </p>
            <button
              onClick={() => setShowSequenceBuilder(false)}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}