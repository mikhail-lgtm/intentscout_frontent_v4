import { cn } from '../../utils/cn'

export type DemoTabKey = "projects" | "outreach"

interface USGDemoNavProps {
  activeTab: DemoTabKey
  setActiveTab: (tab: DemoTabKey) => void
}

export const USGDemoNav = ({ activeTab, setActiveTab }: USGDemoNavProps) => {
  const navButtonClass = (tabName: DemoTabKey) =>
    cn(
      "px-4 py-2 font-medium rounded-lg transition-all",
      activeTab === tabName
        ? "bg-orange-100 text-orange-600 shadow-sm"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
    )

  return (
    <div className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center">
        <div className="flex items-center mr-4 flex-col">
          <img src="/IntentScoutFull.png" alt="IntentScout Logo" className="h-auto w-auto max-h-10 max-w-full mb-1" />
          <p className="text-xs text-gray-500 leading-tight">USG Demo - AI-Powered Sales Intelligence</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <nav className="flex space-x-1">
          <button
            className={navButtonClass("projects")}
            onClick={() => setActiveTab("projects")}
          >
            Projects
          </button>
          <button
            className={navButtonClass("outreach")}
            onClick={() => setActiveTab("outreach")}
          >
            Outreach
          </button>
        </nav>

        <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
          <div className="text-sm text-gray-600">
            Demo Mode
          </div>
        </div>
      </div>
    </div>
  )
}