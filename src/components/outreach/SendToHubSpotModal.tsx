import { useEffect, useState } from 'react'
import { X, Loader2, CheckCircle, AlertCircle, ArrowRight, Eye } from 'lucide-react'
import { api } from '../../lib/apiClient'
import { supabase } from '../../lib/supabase'

interface CleanedContact {
  [key: string]: any
}

interface SendToHubSpotModalProps {
  isOpen: boolean
  onClose: () => void
  contacts: CleanedContact[]
  onComplete?: (result: ImportResult) => void
}

interface ImportResult {
  total: number
  created: number
  updated: number
  skipped: number
  errors: any[]
  created_ids: string[]
  skipped_reasons: any[]
  duplicates_in_payload: number
  invalid_emails: number
  dry_run: boolean
}

interface EnrollResult {
  total: number
  enrolled: number
  skipped: number
  quota_remaining: number
  enrolled_contact_ids: string[]
}

interface SequenceOption {
  id: string
  name: string
  emailStepCount?: number
}

interface QuotaInfo {
  mailbox: string
  used_today: number
  daily_limit: number
  remaining: number
}

const CANONICAL_TO_API: Record<string, string> = {
  'First Name': 'first_name',
  'Last Name': 'last_name',
  'Full Name': 'full_name',
  'Current Job': 'job_title',
  'Job Title': 'job_title',
  Email: 'email',
  'LinkedIn URL': 'linkedin_url',
  'Sales Navigator URL': 'sales_nav_url',
  'Company Name': 'company',
  'Company Website': 'company_url',
  Location: 'location',
  'Source Sheet': 'sdr_owner',
}

function normalizeContact(row: CleanedContact): Record<string, any> {
  const out: Record<string, any> = { extra: {} }
  for (const [key, value] of Object.entries(row)) {
    if (value == null || value === '') continue
    const apiField = CANONICAL_TO_API[key]
    if (apiField) {
      out[apiField] = value
    } else if (typeof value === 'string') {
      out.extra[key] = value
    }
  }
  if (Object.keys(out.extra).length === 0) {
    delete out.extra
  }
  return out
}

export const SendToHubSpotModal: React.FC<SendToHubSpotModalProps> = ({
  isOpen,
  onClose,
  contacts,
  onComplete,
}) => {
  const [step, setStep] = useState<'configure' | 'preview' | 'sending' | 'done'>('configure')
  const [sequences, setSequences] = useState<SequenceOption[]>([])
  const [sequencesLoading, setSequencesLoading] = useState(false)
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>('')
  const [campaignName, setCampaignName] = useState<string>('')
  const [senderEmail, setSenderEmail] = useState<string>('')
  const [dontOverwrite, setDontOverwrite] = useState(true)
  const [enrollAfterImport, setEnrollAfterImport] = useState(true)
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [previewResult, setPreviewResult] = useState<ImportResult | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [enrollResult, setEnrollResult] = useState<EnrollResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email || ''
      setSenderEmail((prev) => prev || email)
    })
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    setSequencesLoading(true)
    api.settings
      .getHubSpotSequences()
      .then((resp) => {
        if (resp.error) throw new Error(resp.error)
        const data = resp.data as any
        const list = (data?.sequences || []).map((s: any) => ({
          id: String(s.id),
          name: String(s.name || `Sequence ${s.id}`),
          emailStepCount: s.email_step_count,
        }))
        setSequences(list)
      })
      .catch((e) => {
        console.error('Failed to load sequences:', e)
        setError(e instanceof Error ? e.message : 'Failed to load HubSpot sequences')
      })
      .finally(() => setSequencesLoading(false))
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !senderEmail) return
    api.hubspot
      .getQuota(senderEmail)
      .then((resp) => {
        if (!resp.error && resp.data) setQuota(resp.data as QuotaInfo)
      })
      .catch(() => {})
  }, [isOpen, senderEmail])

  const reset = () => {
    setStep('configure')
    setPreviewResult(null)
    setImportResult(null)
    setEnrollResult(null)
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const buildPayloadContacts = () => contacts.map(normalizeContact)

  const handlePreview = async () => {
    setError(null)
    setBusy(true)
    try {
      const resp = await api.hubspot.bulkImportContacts({
        contacts: buildPayloadContacts(),
        campaign_name: campaignName || undefined,
        sender_email: senderEmail || undefined,
        dont_overwrite: dontOverwrite,
        dry_run: true,
      })
      if (resp.error) throw new Error(resp.error)
      setPreviewResult(resp.data as ImportResult)
      setStep('preview')
    } catch (e: any) {
      setError(e?.message || 'Preview failed')
    } finally {
      setBusy(false)
    }
  }

  const handleConfirm = async () => {
    setError(null)
    setBusy(true)
    setStep('sending')
    try {
      const importResp = await api.hubspot.bulkImportContacts({
        contacts: buildPayloadContacts(),
        campaign_name: campaignName || undefined,
        sender_email: senderEmail || undefined,
        dont_overwrite: dontOverwrite,
        dry_run: false,
      })
      if (importResp.error) throw new Error(importResp.error)
      const result = importResp.data as ImportResult
      setImportResult(result)

      if (enrollAfterImport && selectedSequenceId && result.created_ids.length > 0) {
        const enrollResp = await api.hubspot.enrollSequence({
          sequence_id: selectedSequenceId,
          contacts: result.created_ids.map((id) => ({ hubspot_id: id })),
          sender_mailbox: senderEmail || undefined,
        })
        if (!enrollResp.error) {
          setEnrollResult(enrollResp.data as EnrollResult)
        }
      }

      setStep('done')
      onComplete?.(result)
    } catch (e: any) {
      setError(e?.message || 'Send to HubSpot failed')
      setStep('preview')
    } finally {
      setBusy(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-orange-600" />
            <h2 className="text-base font-semibold text-gray-900">Send to HubSpot</h2>
            <span className="text-xs text-gray-500 ml-2">{contacts.length} contacts</span>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 'configure' && (
            <>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Sender mailbox</span>
                  <input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="you@customertimes.com"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                  {quota && (
                    <p className="text-xs text-gray-500 mt-1">
                      Quota today: <strong>{quota.used_today}</strong> / {quota.daily_limit} used,{' '}
                      <strong>{quota.remaining}</strong> remaining
                    </p>
                  )}
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Campaign name (optional)</span>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. ITSM Q2 2026"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Enroll into sequence (optional)</span>
                  <select
                    value={selectedSequenceId}
                    onChange={(e) => setSelectedSequenceId(e.target.value)}
                    disabled={sequencesLoading}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white"
                  >
                    <option value="">— None (just import) —</option>
                    {sequences.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {sequencesLoading && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading sequences...
                    </p>
                  )}
                </label>

                <div className="flex items-center gap-4 pt-1 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={dontOverwrite}
                      onChange={(e) => setDontOverwrite(e.target.checked)}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    Don't Overwrite (preserve existing HubSpot values)
                  </label>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enrollAfterImport}
                      onChange={(e) => setEnrollAfterImport(e.target.checked)}
                      disabled={!selectedSequenceId}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    Enroll into sequence after import
                  </label>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Step 1 of 2 — review and preview, then confirm. Lifecycle Stage is NOT set here
                (that's the irreversible Salesforce sync trigger; do it from the Workspace after
                review).
              </div>
            </>
          )}

          {step === 'preview' && previewResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <Eye className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>Dry-run preview</strong> — nothing has been written to HubSpot yet.
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label="Will create" value={previewResult.created} highlight />
                <Stat label="Will update" value={previewResult.updated} highlight />
                <Stat label="Will skip" value={previewResult.skipped} />
                <Stat label="Total input" value={previewResult.total} />
              </div>

              {(previewResult.duplicates_in_payload > 0 || previewResult.invalid_emails > 0) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                  <div className="font-medium text-yellow-900 mb-1">Notes</div>
                  <ul className="list-disc ml-5 text-gray-700 space-y-0.5">
                    {previewResult.duplicates_in_payload > 0 && (
                      <li>{previewResult.duplicates_in_payload} duplicates in input</li>
                    )}
                    {previewResult.invalid_emails > 0 && (
                      <li>{previewResult.invalid_emails} contacts have invalid email format</li>
                    )}
                  </ul>
                </div>
              )}

              {previewResult.skipped_reasons.length > 0 && (
                <details className="border border-gray-200 rounded-lg bg-gray-50 text-sm">
                  <summary className="cursor-pointer p-3 font-medium text-gray-700">
                    Skipped ({previewResult.skipped_reasons.length}) — reasons
                  </summary>
                  <div className="px-3 pb-3 text-xs text-gray-700 max-h-40 overflow-y-auto border-t border-gray-200 pt-2">
                    {previewResult.skipped_reasons.map((r, i) => (
                      <div key={i}>
                        {r.email ? `${r.email}: ` : `#${r.index}: `}
                        {r.reason}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {step === 'sending' && (
            <div className="text-center py-10">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-700 font-medium">Sending to HubSpot...</p>
              <p className="text-xs text-gray-500 mt-1">
                Importing {contacts.length} contacts
                {enrollAfterImport && selectedSequenceId ? ' + enrolling into sequence' : ''}
              </p>
            </div>
          )}

          {step === 'done' && importResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>
                  <strong>Done!</strong> {importResult.created} created, {importResult.updated} updated.
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label="Created" value={importResult.created} highlight />
                <Stat label="Updated" value={importResult.updated} highlight />
                <Stat label="Skipped" value={importResult.skipped} />
                <Stat label="Total" value={importResult.total} />
              </div>

              {enrollResult && (
                <div className="border border-orange-200 bg-orange-50 rounded-lg p-3 text-sm">
                  <div className="font-medium text-orange-900 mb-1">Sequence Enrollment</div>
                  <div className="text-gray-700">
                    {enrollResult.enrolled} enrolled · {enrollResult.skipped} skipped · {' '}
                    <strong>{enrollResult.quota_remaining}</strong> daily quota remaining
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500">
                Next step: open Workspace → review contacts → set Lifecycle Stage = Prospect when
                everything looks correct (this triggers Salesforce sync, irreversible).
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          {step === 'configure' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white transition-colors text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handlePreview}
                disabled={busy || !senderEmail}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Preview
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('configure')}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white transition-colors text-gray-700"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={busy}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Send to HubSpot
              </button>
            </>
          )}
          {step === 'done' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const Stat = ({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) => (
  <div
    className={`rounded-lg p-3 border ${
      highlight ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'
    }`}
  >
    <div className={`text-2xl font-semibold ${highlight ? 'text-orange-700' : 'text-gray-900'}`}>
      {value}
    </div>
    <div className="text-xs text-gray-600 mt-0.5">{label}</div>
  </div>
)
