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
        const res = await fetch('/api/usg/leads')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setLeads(data)
      } catch (e: any) {
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
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2">{l.project_name || '-'}</td>
                  <td className="px-3 py-2">{l.location || '-'}</td>
                  <td className="px-3 py-2">{l.bid_due || '-'}</td>
                  <td className="px-3 py-2">{(l.spec_fit ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-2">{(l.urgency ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-2">{(l.confidence ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-2">{l.reason_codes?.join(', ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
