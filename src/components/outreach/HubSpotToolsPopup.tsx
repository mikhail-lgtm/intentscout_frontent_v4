import { useState } from 'react'
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  Activity,
  Send,
} from 'lucide-react'
import { api } from '../../lib/apiClient'
import { HubSpotSending } from './HubSpotSending'

interface HubSpotToolsPopupProps {
  isOpen: boolean
  onClose: () => void
  signalId?: string
  companyName?: string
}

type Section = 'send' | 'lifecycle' | 'engagement'

/**
 * Merged HubSpot panel — renders in the workspace `hubspot` tab.
 *
 * Sections:
 *   - Send: existing HubSpotSending flow (sequence enrollment per signal)
 *   - Lifecycle Stage: bulk-set with preflight + irreversible-action guard
 *   - Engagement: look up opens/clicks/replies for a specific contact
 *
 * Reassign-owner and pause-sequence sections were removed from the UI to
 * reduce surface area. Backend endpoints are still available for future use:
 *   POST /hubspot/bulk/reassign-owner
 *   POST /hubspot/bulk/pause-sequence
 */
export const HubSpotToolsPopup: React.FC<HubSpotToolsPopupProps> = ({
  isOpen,
  signalId,
  companyName,
}) => {
  const [section, setSection] = useState<Section>(signalId ? 'send' : 'lifecycle')

  if (!isOpen) return null

  return (
    <div className="animate-tab-fade-in flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
          {signalId && (
            <SectionTab
              active={section === 'send'}
              onClick={() => setSection('send')}
              icon={<Send className="w-4 h-4" />}
            >
              Send
            </SectionTab>
          )}
          <SectionTab
            active={section === 'lifecycle'}
            onClick={() => setSection('lifecycle')}
            icon={<ShieldAlert className="w-4 h-4" />}
          >
            Lifecycle Stage
          </SectionTab>
          <SectionTab
            active={section === 'engagement'}
            onClick={() => setSection('engagement')}
            icon={<Activity className="w-4 h-4" />}
          >
            Engagement
          </SectionTab>
        </div>

        {section === 'send' && signalId && (
          <HubSpotSending signalId={signalId} companyName={companyName || ''} />
        )}
        {section === 'lifecycle' && <LifecycleSection />}
        {section === 'engagement' && <EngagementSection />}
      </div>
    </div>
  )
}

const SectionTab: React.FC<{
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}> = ({ active, onClick, icon, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
      active
        ? 'bg-orange-100 text-orange-700 font-medium'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`}
  >
    {icon}
    {children}
  </button>
)

const parseIds = (raw: string): string[] =>
  raw
    .split(/[\s,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)

// =====================================================
// Lifecycle Stage — Дима's final step that triggers SF sync
// =====================================================
const LifecycleSection: React.FC = () => {
  const [ids, setIds] = useState('')
  const [stage, setStage] = useState('prospect')
  const [preflightResult, setPreflightResult] = useState<any>(null)
  const [confirmModal, setConfirmModal] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePreflight = async () => {
    setError(null)
    setResult(null)
    setBusy(true)
    try {
      const resp = await api.hubspot.lifecycleStagePreflight({ contact_ids: parseIds(ids) })
      if (resp.error) throw new Error(resp.error)
      setPreflightResult(resp.data)
    } catch (e: any) {
      setError(e?.message || 'Preflight failed')
    } finally {
      setBusy(false)
    }
  }

  const handleApply = async () => {
    setError(null)
    setBusy(true)
    setConfirmModal(false)
    try {
      const resp = await api.hubspot.setLifecycleStage({
        contact_ids: parseIds(ids),
        stage,
        confirm_irreversible: true,
      })
      if (resp.error) throw new Error(resp.error)
      setResult(resp.data)
    } catch (e: any) {
      setError(e?.message || 'Set Lifecycle Stage failed')
    } finally {
      setBusy(false)
    }
  }

  const ready = preflightResult?.ready || 0
  const isProspect = stage.toLowerCase() === 'prospect'

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          HubSpot contact IDs (comma / newline separated)
        </label>
        <textarea
          rows={3}
          value={ids}
          onChange={(e) => setIds(e.target.value)}
          placeholder="12345&#10;67890&#10;..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm resize-none font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Target stage</label>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white"
        >
          <option value="lead">Lead</option>
          <option value="marketingqualifiedlead">Marketing Qualified Lead</option>
          <option value="salesqualifiedlead">Sales Qualified Lead</option>
          <option value="opportunity">Opportunity</option>
          <option value="customer">Customer</option>
          <option value="prospect">Prospect — triggers Salesforce sync (irreversible)</option>
        </select>
      </div>

      {isProspect && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Setting Lifecycle Stage to <strong>Prospect</strong> triggers Salesforce sync.
            This is <strong>irreversible</strong>. Run preflight first.
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handlePreflight}
          disabled={busy || !ids.trim()}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed font-medium text-gray-700"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
          Preflight
        </button>
        <button
          onClick={() => setConfirmModal(true)}
          disabled={busy || !ids.trim() || !preflightResult}
          className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isProspect ? 'Set Prospect (with confirm)' : `Set ${stage}`}
        </button>
      </div>

      {preflightResult && (
        <div className="grid grid-cols-3 gap-2 text-sm">
          <StatBox label="Total" value={preflightResult.total} />
          <StatBox label="Ready" value={preflightResult.ready} highlight />
          <StatBox label="Not ready" value={preflightResult.not_ready} />
        </div>
      )}

      {preflightResult?.issues?.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-gray-700">
            Issues ({preflightResult.issues.length})
          </summary>
          <div className="mt-2 max-h-40 overflow-y-auto text-xs text-gray-700 space-y-1 font-mono">
            {preflightResult.issues.map((iss: any, i: number) => (
              <div key={i}>
                {iss.contact_id}: {iss.reason || iss.missing}
              </div>
            ))}
          </div>
        </details>
      )}

      {result && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Updated: {result.updated} · Blocked: {result.blocked} · Requested: {result.requested}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5">
            <div className="flex items-start gap-3 mb-4">
              <ShieldAlert className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Confirm Lifecycle Stage change
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  About to set stage <strong>{stage}</strong> on{' '}
                  <strong>{ready || parseIds(ids).length} contact(s)</strong>.
                </p>
                {isProspect && (
                  <p className="text-sm text-amber-700 mt-2">
                    This triggers <strong>Salesforce sync</strong> and is{' '}
                    <strong>irreversible</strong>. Make sure all contacts have correct data.
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
              >
                Yes, apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =====================================================
// Engagement lookup — opens/clicks/replies for one contact
// =====================================================
const EngagementSection: React.FC = () => {
  const [contactId, setContactId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFetch = async () => {
    setError(null)
    setResult(null)
    setBusy(true)
    try {
      const resp = await api.hubspot.getContactEngagement(contactId.trim())
      if (resp.error) throw new Error(resp.error)
      setResult(resp.data)
    } catch (e: any) {
      setError(e?.message || 'Fetch engagement failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          HubSpot contact ID
        </label>
        <input
          type="text"
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          placeholder="12345"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm font-mono"
        />
      </div>

      <button
        onClick={handleFetch}
        disabled={busy || !contactId.trim()}
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
        Fetch engagement
      </button>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
            <StatBox label="Sent" value={result.emails_sent || 0} />
            <StatBox label="Opens" value={result.opens || 0} highlight />
            <StatBox label="Clicks" value={result.clicks || 0} highlight />
            <StatBox label="Replies" value={result.replies || 0} highlight />
            <StatBox label="Bounces" value={result.bounces || 0} />
          </div>
          {result.last_activity_at && (
            <div className="text-xs text-gray-500">
              Last activity: {new Date(result.last_activity_at).toLocaleString()}
            </div>
          )}
          {result.events?.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-gray-700">
                Recent events ({result.events.length})
              </summary>
              <div className="mt-2 max-h-48 overflow-y-auto text-xs space-y-1 border-l-2 border-gray-200 pl-3">
                {result.events.slice(0, 30).map((evt: any, i: number) => (
                  <div key={i} className="text-gray-700">
                    <span className="font-medium">{evt.type}</span>
                    {evt.subject ? ` — ${evt.subject}` : ''}
                    {evt.timestamp ? (
                      <span className="text-gray-400 ml-2">
                        {new Date(parseInt(evt.timestamp) || evt.timestamp).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

const StatBox: React.FC<{ label: string; value: number; highlight?: boolean }> = ({
  label,
  value,
  highlight = false,
}) => (
  <div
    className={`rounded-lg p-2 border text-center ${
      highlight ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'
    }`}
  >
    <div className={`text-lg font-semibold ${highlight ? 'text-orange-700' : 'text-gray-900'}`}>
      {value}
    </div>
    <div className="text-xs text-gray-600">{label}</div>
  </div>
)
