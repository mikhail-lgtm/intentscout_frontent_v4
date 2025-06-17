import React, { useState, useRef } from 'react'
import { Database, Info, Signal, Building2, User, Linkedin, Users, FileText } from 'lucide-react'
import { DataSourceConfig, DataSourceType, SequenceBlockType } from '../../types/sequences'
import { TooltipPortal } from '../ui/TooltipPortal'

interface DataSourcesEditorProps {
  blockType: SequenceBlockType
  dataSources: DataSourceConfig[]
  onDataSourcesChange: (sources: DataSourceConfig[]) => void
}

// Data source info with descriptions and icons
const DATA_SOURCE_INFO: Record<DataSourceType, {
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  needsPrompt: boolean
  example: string
}> = {
  [DataSourceType.SIGNAL]: {
    label: 'Intent Signal',
    description: 'Buying intent data including intent scores, reasoning, and citations from job postings and website activity',
    icon: Signal,
    needsPrompt: false,
    example: 'Intent score: 8.5/10, Recent job posting for "Sales Manager", Company expanding sales team'
  },
  [DataSourceType.COMPANY]: {
    label: 'Company Data',
    description: 'Company information including industry, size, headquarters, about us, and specialties',
    icon: Building2,
    needsPrompt: false,
    example: 'SaaS company, 50-200 employees, San Francisco HQ, Specializes in CRM software'
  },
  [DataSourceType.CONTACT]: {
    label: 'Contact Info',
    description: 'Contact details including name, job title, LinkedIn profile, and other contact information',
    icon: User,
    needsPrompt: false,
    example: 'John Smith, VP of Sales, 5+ years at company, LinkedIn: linkedin.com/in/johnsmith'
  },
  [DataSourceType.LINKEDIN]: {
    label: 'LinkedIn Profile',
    description: 'LinkedIn profile data including experience, education, skills, and recent activity',
    icon: Linkedin,
    needsPrompt: false,
    example: 'MBA from Stanford, Previously at Salesforce, Recently posted about sales automation'
  },
  [DataSourceType.COACTOR]: {
    label: 'Coactor Data',
    description: 'RAG database of company research and intelligence data. You can query specific information about the company.',
    icon: Users,
    needsPrompt: true,
    example: 'Recent news about product launches, competitor analysis, market position, funding rounds'
  },
  [DataSourceType.CUSTOM]: {
    label: 'Custom Notes',
    description: 'Custom user-provided data, notes, and additional context for personalization',
    icon: FileText,
    needsPrompt: true,
    example: 'Met at trade show last year, Interested in automation solutions, Budget approved for Q1'
  }
}

export const DataSourcesEditor: React.FC<DataSourcesEditorProps> = ({
  blockType,
  dataSources,
  onDataSourcesChange
}) => {
  const [hoveredSource, setHoveredSource] = useState<DataSourceType | null>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const isSourceSelected = (sourceType: DataSourceType): boolean => {
    return dataSources.some(source => source.source_type === sourceType)
  }

  const toggleDataSource = (sourceType: DataSourceType) => {
    const sourceInfo = DATA_SOURCE_INFO[sourceType]
    
    if (isSourceSelected(sourceType)) {
      // Remove the source
      onDataSourcesChange(dataSources.filter(source => source.source_type !== sourceType))
    } else {
      // Add the source
      const newSource: DataSourceConfig = {
        source_type: sourceType,
        fields: [], // No longer using specific fields
        required: false,
        fallback_text: sourceInfo.needsPrompt ? '' : undefined
      }
      onDataSourcesChange([...dataSources, newSource])
    }
  }

  const updateSourcePrompt = (sourceType: DataSourceType, prompt: string) => {
    const updated = dataSources.map(source => 
      source.source_type === sourceType 
        ? { ...source, fallback_text: prompt }
        : source
    )
    onDataSourcesChange(updated)
  }

  const getSourcePrompt = (sourceType: DataSourceType): string => {
    const source = dataSources.find(s => s.source_type === sourceType)
    return source?.fallback_text || ''
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Database className="w-5 h-5 text-orange-600" />
        <h3 className="text-lg font-semibold text-gray-900">Data Sources</h3>
      </div>
      
      <p className="text-sm text-gray-600">
        Select which data sources the AI should use when generating {blockType} content. Hover over each source to see what data it includes.
      </p>

      {/* Data source grid */}
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(DATA_SOURCE_INFO)
          .filter(([sourceType]) => sourceType !== DataSourceType.CUSTOM)
          .map(([sourceType, info], index) => {
          const Icon = info.icon
          const isSelected = isSourceSelected(sourceType as DataSourceType)
          const isRightColumn = index % 2 === 1
          
          return (
            <div 
              key={sourceType} 
              className="space-y-2"
              ref={(el) => cardRefs.current[sourceType] = el}
            >
              {/* Checkbox card */}
              <div
                className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => toggleDataSource(sourceType as DataSourceType)}
                onMouseEnter={() => setHoveredSource(sourceType as DataSourceType)}
                onMouseLeave={() => setHoveredSource(null)}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // Handled by parent click
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-orange-600' : 'text-gray-500'}`} />
                  <div className="flex-1">
                    <div className={`font-medium ${isSelected ? 'text-orange-900' : 'text-gray-900'}`}>
                      {info.label}
                    </div>
                  </div>
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Portalled tooltip */}
              {hoveredSource === sourceType && (
                <TooltipPortal
                  anchor={cardRefs.current[sourceType]}
                  preferLeft={isRightColumn}
                >
                  <div className="relative w-80 p-3 rounded-lg shadow-lg bg-gray-900 text-white text-sm pointer-events-none">
                    <div className="font-medium mb-1">{info.label}</div>
                    <div className="text-gray-300 mb-2">{info.description}</div>
                    <div className="text-xs text-gray-400">
                      <strong>Example:</strong> {info.example}
                    </div>
                    {/* Arrow pointing to the card */}
                    <div className={`absolute ${isRightColumn ? 'left-full top-4 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900' : 'right-full top-4 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900'}`}></div>
                  </div>
                </TooltipPortal>
              )}

              {/* Prompt input for sources that need it */}
              {isSelected && info.needsPrompt && (
                <div className="ml-9">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom instruction for {info.label}:
                  </label>
                  <textarea
                    value={getSourcePrompt(sourceType as DataSourceType)}
                    onChange={(e) => updateSourcePrompt(sourceType as DataSourceType, e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder={
                      sourceType === DataSourceType.COACTOR 
                        ? "Query the company database (e.g., 'recent funding rounds', 'competitor analysis', 'market position')"
                        : `Describe how the AI should use ${info.label.toLowerCase()} in the email...`
                    }
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary */}
      {dataSources.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="text-sm text-orange-800">
            <strong>{dataSources.length} data source{dataSources.length !== 1 ? 's' : ''} selected:</strong>{' '}
            {dataSources.map(source => DATA_SOURCE_INFO[source.source_type].label).join(', ')}
          </div>
        </div>
      )}
    </div>
  )
}