import { useEffect, useState } from 'react'

interface Lead {
  id: string
  organization_id: string
  project_name?: string
  location?: string
  bid_due?: string
  spec_fit?: number
  urgency?: number
  confidence?: number
  reason_codes?: string[]
  description?: string
  project_url?: string
}

export const USGDemoPage = () => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        console.log('🔍 Fetching /api/usg/leads...')
        const res = await fetch('/api/usg/leads')
        console.log('📡 Response:', res.status, res.statusText)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        console.log('📊 Data received:', data)
        console.log('📋 Number of leads:', data?.length || 0)
        setLeads(data)
      } catch (e: any) {
        console.error('❌ Error:', e)
        setError(e.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">USG Demo — ConstructConnect Leads</h1>
      {loading && <div className="text-gray-600">Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div>
          <div className="mb-4 text-sm text-gray-600">
            Found {leads.length} projects
          </div>
          <div className="overflow-x-auto bg-white border rounded-md">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Project</th>
                  <th className="px-3 py-2 text-left">Location</th>
                  <th className="px-3 py-2 text-left">Bid Due</th>
                  <th className="px-3 py-2 text-left">Spec Fit</th>
                  <th className="px-3 py-2 text-left">Urgency</th>
                  <th className="px-3 py-2 text-left">Confidence</th>
                  <th className="px-3 py-2 text-left">Reasons</th>
                  <th className="px-3 py-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">
                      {l.project_url ? (
                        <a 
                          href={l.project_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {l.project_name || '-'}
                        </a>
                      ) : (
                        l.project_name || '-'
                      )}
                    </td>
                    <td className="px-3 py-2">{l.location || '-'}</td>
                    <td className="px-3 py-2">{l.bid_due || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        (l.spec_fit ?? 0) >= 0.7 ? 'bg-green-100 text-green-800' : 
                        (l.spec_fit ?? 0) >= 0.5 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {(l.spec_fit ?? 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-3 py-2">{(l.urgency ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2">{(l.confidence ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {l.reason_codes?.map((reason) => (
                          <span key={reason} className="px-1 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 max-w-xs">
                      <div className="truncate" title={l.description}>
                        {l.description?.substring(0, 100) || '-'}
                        {l.description && l.description.length > 100 && '...'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
