import { useState, useCallback } from 'react'
import { Settings } from 'lucide-react'

// Demo components (simplified versions of the real ones)
const DemoOutreachSidebar = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo Signals</h3>
    <div className="space-y-3">
      <div className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
        <div className="font-medium text-sm">Miami Metro Construction</div>
        <div className="text-xs text-gray-500">Emergency Doors Project</div>
        <div className="text-xs text-green-600 mt-1">Score: 4.5</div>
      </div>
      <div className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
        <div className="font-medium text-sm">North Port Engineering</div>
        <div className="text-xs text-gray-500">Wastewater Facility</div>
        <div className="text-xs text-blue-600 mt-1">Score: 3.8</div>
      </div>
      <div className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
        <div className="font-medium text-sm">Jupiter Parks & Recreation</div>
        <div className="text-xs text-gray-500">Pickleball Courts</div>
        <div className="text-xs text-orange-600 mt-1">Score: 3.2</div>
      </div>
    </div>
  </div>
)

const DemoIntentCard = () => (
  <div className="p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Intent Signals</h3>
    <div className="space-y-4">
      <div className="border-l-4 border-green-500 pl-4">
        <div className="font-medium">High Intent Signal Detected</div>
        <div className="text-sm text-gray-600 mt-1">
          Company is actively seeking construction materials with specific fire-rating requirements.
        </div>
        <div className="text-xs text-green-600 mt-2">Confidence: 90%</div>
      </div>
      <div className="border-l-4 border-blue-500 pl-4">
        <div className="font-medium">Project Timeline Signal</div>
        <div className="text-sm text-gray-600 mt-1">
          Bid due date indicates urgent procurement needs.
        </div>
        <div className="text-xs text-blue-600 mt-2">Confidence: 75%</div>
      </div>
    </div>
  </div>
)

const DemoHubSpotSending = () => (
  <div className="p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">HubSpot Integration</h3>
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Demo Mode</div>
        <div className="text-xs text-gray-600">
          HubSpot integration would sync contacts and track email campaigns here.
        </div>
      </div>
      <button className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm">
        Configure HubSpot (Demo)
      </button>
    </div>
  </div>
)

const DemoContactsComponent = () => (
  <div>
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contacts</h3>
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
        <div>
          <div className="font-medium text-sm">Mike Johnson</div>
          <div className="text-xs text-gray-500">Project Manager</div>
          <div className="text-xs text-gray-500">mike.johnson@miamimetro.com</div>
        </div>
        <button className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
          Contact
        </button>
      </div>
      <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
        <div>
          <div className="font-medium text-sm">Sarah Davis</div>
          <div className="text-xs text-gray-500">Procurement Lead</div>
          <div className="text-xs text-gray-500">s.davis@northporteng.com</div>
        </div>
        <button className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
          Contact
        </button>
      </div>
    </div>
  </div>
)

const DemoEmailDrafting = () => (
  <div className="p-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Drafting</h3>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line</label>
        <input
          type="text"
          value="Fire-Rated Door Solutions for Your Miami Project"
          readOnly
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email Content</label>
        <textarea
          value="Hi Mike,&#10;&#10;I noticed your upcoming emergency door replacement project at the Metrorail station. We specialize in 3-hour fire-rated steel doors and have successfully completed similar transit projects.&#10;&#10;Would you be interested in discussing how we can support your project requirements?"
          readOnly
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
        />
      </div>
      <button className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm">
        Generate with AI (Demo)
      </button>
    </div>
  </div>
)

export const USGOutreachPage = () => {
  const [showSequenceBuilder, setShowSequenceBuilder] = useState(false)

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
          <DemoOutreachSidebar />
        </div>

        {/* Main Content - 2x2 Grid Layout */}
        <div className="flex-1 p-4 min-h-0">
          <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full max-w-6xl mx-auto">
            {/* Top-left: Intent Signals */}
            <div className="overflow-y-auto custom-scrollbar bg-white rounded-lg shadow-sm border border-gray-200">
              <DemoIntentCard />
            </div>

            {/* Top-right: HubSpot Sending */}
            <div className="overflow-y-auto custom-scrollbar bg-white rounded-lg shadow-sm border border-gray-200">
              <DemoHubSpotSending />
            </div>

            {/* Bottom-left: Contacts */}
            <div className="overflow-y-auto custom-scrollbar bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <DemoContactsComponent />
            </div>

            {/* Bottom-right: Email Notes */}
            <div className="overflow-y-auto custom-scrollbar bg-white rounded-lg shadow-sm border border-gray-200">
              <DemoEmailDrafting />
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