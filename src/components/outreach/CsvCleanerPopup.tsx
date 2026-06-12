import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Upload, Loader2, CheckCircle, AlertCircle, Download, FileSpreadsheet, Sparkles, ArrowRight, Clock, Search, ArrowUp, ArrowDown, ChevronDown, History, Trash2, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { buildApiUrl } from '../../lib/config'
import { SendToHubSpotModal } from './SendToHubSpotModal'

interface CsvCleanerPopupProps {
  isOpen: boolean
  onClose: () => void
}

interface CleanStats {
  rows_in: number
  rows_out: number
  duplicates_removed: number
  names_cleaned: number
  last_names_cleaned: number
  full_names_cleaned: number
  companies_cleaned: number
  companies_merged: number
  titles_normalized: number
  decision_makers: number
  emails_guessed: number
  emails_from_apollo: number
  columns_dropped_count: number
}

interface PreviewResponse {
  stats: CleanStats
  detected_columns: Record<string, string>
  columns_dropped: string[]
  standout_companies: string[]
  domain_patterns: Record<string, string>
  issues: string[]
  preview_rows: Record<string, string>[]
  cleaned_csv_base64: string
  instruction_summary: string
  resolved_options?: Record<string, boolean | string>
  history_id?: string
  file_hash?: string
}

interface HistoryItem {
  id: string
  filename: string
  file_hash: string
  file_size: number
  rows_in: number
  rows_out: number
  duplicates_removed: number
  emails_from_apollo: number
  emails_guessed: number
  user_email: string
  duration_ms: number
  blob_truncated: boolean
  created_at: string
}

interface CleanOptions {
  clean_first_names: boolean
  clean_last_names: boolean
  clean_full_names: boolean
  clean_companies: boolean
  dedup_emails: boolean
  dedup_linkedin: boolean
  drop_extra_columns: boolean
  flag_standout: boolean
  standout_threshold: number
  preserve_accents: boolean
  normalize_titles: boolean
  guess_emails: boolean
  enrich_via_apollo: boolean
  use_llm: boolean
  output_template: 'dima' | 'preserve'
}

const DEFAULT_OPTIONS: CleanOptions = {
  clean_first_names: true,
  clean_last_names: true,
  clean_full_names: true,
  clean_companies: true,
  dedup_emails: true,
  dedup_linkedin: true,
  drop_extra_columns: true,
  flag_standout: true,
  standout_threshold: 3,
  preserve_accents: true,
  normalize_titles: true,
  guess_emails: true,
  enrich_via_apollo: true,
  use_llm: false,
  output_template: 'dima',
}

// Module-level cache survives component unmount so switching tabs
// does NOT reset the Clean List state (file, options, results).
// Cleared explicitly via reset() / Clean another file.
type CleanerCache = {
  file: File | null
  options: CleanOptions
  instructions: string
  result: PreviewResponse | null
  advancedOpen: boolean
}
const cleanerCache: CleanerCache = {
  file: null,
  options: DEFAULT_OPTIONS,
  instructions: '',
  result: null,
  advancedOpen: false,
}

type ProcessingStage = {
  id: string
  label: string
  estimatedSeconds: number
}

const PROCESSING_STAGES: ProcessingStage[] = [
  { id: 'parse', label: 'Parsing file', estimatedSeconds: 3 },
  { id: 'names', label: 'Cleaning names', estimatedSeconds: 4 },
  { id: 'companies', label: 'Cleaning companies and detecting variants', estimatedSeconds: 5 },
  { id: 'titles', label: 'Normalizing job titles', estimatedSeconds: 3 },
  { id: 'patterns', label: 'Detecting per-company email patterns', estimatedSeconds: 4 },
  { id: 'apollo', label: 'Enriching missing emails via Apollo', estimatedSeconds: 60 },
  { id: 'dedup', label: 'Deduplicating and finalizing', estimatedSeconds: 2 },
]

export const CsvCleanerPopup: React.FC<CsvCleanerPopupProps> = ({ isOpen }) => {
  // Init from module-level cache so state survives tab switches
  const [file, setFile] = useState<File | null>(cleanerCache.file)
  const [options, setOptions] = useState<CleanOptions>(cleanerCache.options)
  const [instructions, setInstructions] = useState<string>(cleanerCache.instructions)
  const [advancedOpen, setAdvancedOpen] = useState(cleanerCache.advancedOpen)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<PreviewResponse | null>(cleanerCache.result)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showHubSpotModal, setShowHubSpotModal] = useState(false)
  const [processingElapsed, setProcessingElapsed] = useState(0)
  const [previewSearch, setPreviewSearch] = useState('')
  const [previewSort, setPreviewSort] = useState<{ col: string; dir: 'asc' | 'desc' } | null>(null)
  const [previewSourceFilter, setPreviewSourceFilter] = useState<string>('all')
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
  const [estimate, setEstimate] = useState<{
    total_rows: number
    missing_emails: number
    estimated_apollo_credits: number
    estimated_cost_usd: number
  } | null>(null)
  const [streamProgress, setStreamProgress] = useState<{
    stage: string
    current?: number
    total?: number
    extras?: Record<string, number>
  } | null>(null)
  const [presets, setPresets] = useState<Array<{
    id: string
    name: string
    options: Partial<CleanOptions>
    instructions: string
  }>>([])
  const [selectedPresetId, setSelectedPresetId] = useState<string>('')
  const [showSavePresetModal, setShowSavePresetModal] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  // History
  const [viewMode, setViewMode] = useState<'cleaner' | 'history'>('cleaner')
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [duplicateMatch, setDuplicateMatch] = useState<HistoryItem | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const processingStartRef = useRef<number | null>(null)

  // Fetch presets on mount
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    ;(async () => {
      try {
        const headers = await requestHeaders()
        const r = await fetch(buildApiUrl('/csv-cleaner/presets'), { headers })
        if (!r.ok) return
        const data = await r.json()
        if (!cancelled) setPresets(data || [])
      } catch {
        // ignore
      }
    })()
    return () => { cancelled = true }
  }, [isOpen])

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) return
    try {
      const headers = await requestHeaders()
      headers['Content-Type'] = 'application/json'
      const r = await fetch(buildApiUrl('/csv-cleaner/presets'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newPresetName.trim(),
          options,
          instructions,
        }),
      })
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        throw new Error(data.detail || `HTTP ${r.status}`)
      }
      const saved = await r.json()
      setPresets((prev) => {
        const filtered = prev.filter((p) => p.id !== saved.id)
        return [saved, ...filtered]
      })
      setSelectedPresetId(saved.id)
      setShowSavePresetModal(false)
      setNewPresetName('')
    } catch (e: any) {
      setError(e?.message || 'Save preset failed')
    }
  }

  // SHA-256 of file content; matches backend hashlib.sha256() output (hex).
  const computeFileHash = async (f: File): Promise<string> => {
    const buf = await f.arrayBuffer()
    const hashBuf = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  const historyLoadedRef = useRef(false)
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const headers = await requestHeaders()
      const r = await fetch(buildApiUrl('/csv-cleaner/history?limit=50'), { headers })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setHistoryItems(data?.items || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load history')
    } finally {
      setHistoryLoading(false)
      historyLoadedRef.current = true
    }
  }, [])

  // Lazy-load history once when user first opens the History tab. Refire
  // happens only via the explicit Reload button -- otherwise an /history 500
  // would put us in a useEffect loop (items stays empty -> effect refires).
  useEffect(() => {
    if (viewMode === 'history' && !historyLoadedRef.current && !historyLoading) {
      loadHistory()
    }
  }, [viewMode, historyLoading, loadHistory])

  const openHistoryEntry = async (id: string) => {
    setError(null)
    setHistoryLoading(true)
    try {
      const headers = await requestHeaders()
      const r = await fetch(buildApiUrl(`/csv-cleaner/history/${id}`), { headers })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      const synthesized: PreviewResponse = {
        stats: data.stats,
        detected_columns: data.detected_columns || {},
        columns_dropped: data.columns_dropped || [],
        standout_companies: data.standout_companies || [],
        domain_patterns: data.domain_patterns || {},
        issues: data.issues || [],
        preview_rows: data.preview_rows || [],
        cleaned_csv_base64: data.cleaned_csv_base64 || '',
        instruction_summary: data.instruction_summary || '',
        history_id: data.id,
        file_hash: data.file_hash,
      }
      setResult(synthesized)
      // Restore file name only (we don't have actual file content)
      setFile(new File([''], data.filename || 'history.csv', { type: 'text/csv' }))
      setViewMode('cleaner')
      setDuplicateMatch(null)
    } catch (e: any) {
      setError(e?.message || 'Failed to load history entry')
    } finally {
      setHistoryLoading(false)
    }
  }

  const deleteHistoryEntry = async (id: string) => {
    try {
      const headers = await requestHeaders()
      const r = await fetch(buildApiUrl(`/csv-cleaner/history/${id}`), { method: 'DELETE', headers })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setHistoryItems((prev) => prev.filter((h) => h.id !== id))
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
    }
  }

  const downloadHistoryFile = async (id: string, filename: string, format: 'csv' | 'xlsx') => {
    try {
      const headers = await requestHeaders()
      const r = await fetch(buildApiUrl(`/csv-cleaner/history/${id}/download?format=${format}`), { headers })
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        throw new Error(data.detail || `HTTP ${r.status}`)
      }
      const blob = await r.blob()
      const baseName = (filename || 'cleaned').replace(/\.[^.]+$/, '')
      downloadBlob(blob, `${baseName} - cleaned.${format}`)
    } catch (e: any) {
      setError(e?.message || 'Download failed')
    }
  }

  // Persist state to module-level cache on every change
  useEffect(() => {
    cleanerCache.file = file
    cleanerCache.options = options
    cleanerCache.instructions = instructions
    cleanerCache.result = result
    cleanerCache.advancedOpen = advancedOpen
  }, [file, options, instructions, result, advancedOpen])

  // Tick elapsed-time counter while processing
  useEffect(() => {
    if (!isProcessing) {
      setProcessingElapsed(0)
      processingStartRef.current = null
      return
    }
    processingStartRef.current = Date.now()
    const interval = setInterval(() => {
      if (processingStartRef.current) {
        setProcessingElapsed(Math.floor((Date.now() - processingStartRef.current) / 1000))
      }
    }, 500)
    return () => clearInterval(interval)
  }, [isProcessing])

  const reset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setOptions(DEFAULT_OPTIONS)
    setInstructions('')
    setAdvancedOpen(false)
    cleanerCache.file = null
    cleanerCache.result = null
    cleanerCache.options = DEFAULT_OPTIONS
    cleanerCache.instructions = ''
    cleanerCache.advancedOpen = false
  }

  const acceptFile = (selected: File) => {
    setError(null)
    setResult(null)
    setFile(selected)
    setEstimate(null)
    fetchEstimate(selected)
  }

  const handleFileSelect = async (selected: File | null | undefined) => {
    if (!selected) return
    const name = selected.name.toLowerCase()
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setError('Only CSV and Excel files (.csv, .xlsx, .xls) are supported')
      return
    }
    if (selected.size > 25 * 1024 * 1024) {
      setError('File too large (max 25 MB)')
      return
    }
    // Check for duplicate before triggering full upload + Apollo
    try {
      const hash = await computeFileHash(selected)
      const headers = await requestHeaders()
      const r = await fetch(buildApiUrl(`/csv-cleaner/history/by-hash/${hash}`), { headers })
      if (r.ok) {
        const data = await r.json()
        if (data?.match && data.history) {
          setPendingFile(selected)
          setDuplicateMatch(data.history as HistoryItem)
          return
        }
      }
    } catch {
      // duplicate-check failures are non-blocking
    }
    acceptFile(selected)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files?.[0])
  }, [])

  const buildFormData = (): FormData => {
    const formData = new FormData()
    formData.append('file', file as File)
    formData.append('clean_first_names', String(options.clean_first_names))
    formData.append('clean_last_names', String(options.clean_last_names))
    formData.append('clean_companies', String(options.clean_companies))
    formData.append('dedup_emails', String(options.dedup_emails))
    formData.append('dedup_linkedin', String(options.dedup_linkedin))
    formData.append('drop_extra_columns', String(options.drop_extra_columns))
    formData.append('flag_standout', String(options.flag_standout))
    formData.append('standout_threshold', String(options.standout_threshold))
    formData.append('preserve_accents', String(options.preserve_accents))
    formData.append('normalize_titles', String(options.normalize_titles))
    formData.append('guess_emails', String(options.guess_emails))
    formData.append('use_llm', String(options.use_llm))
    formData.append('output_template', options.output_template)
    formData.append('clean_full_names', String(options.clean_full_names))
    formData.append('enrich_via_apollo', String(options.enrich_via_apollo))
    formData.append('instructions', instructions)
    return formData
  }

  const requestHeaders = async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const orgId = localStorage.getItem('currentOrganizationId')
    if (orgId) headers['X-Organization-Id'] = orgId
    return headers
  }

  // Quick estimate of Apollo cost before user kicks off real cleaning.
  // Called whenever a new file is selected.
  const fetchEstimate = useCallback(async (selectedFile: File) => {
    try {
      const headers = await requestHeaders()
      const fd = new FormData()
      fd.append('file', selectedFile)
      const resp = await fetch(buildApiUrl('/csv-cleaner/estimate'), {
        method: 'POST',
        headers,
        body: fd,
      })
      if (!resp.ok) {
        setEstimate(null)
        return
      }
      setEstimate(await resp.json())
    } catch {
      setEstimate(null)
    }
  }, [])

  const handlePreview = async () => {
    if (!file) return
    setIsProcessing(true)
    setError(null)
    setResult(null)
    setStreamProgress(null)

    try {
      const headers = await requestHeaders()
      const response = await fetch(buildApiUrl('/csv-cleaner/preview-stream'), {
        method: 'POST',
        headers,
        body: buildFormData(),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || `HTTP ${response.status}`)
      }
      if (!response.body) throw new Error('Streaming not supported')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        // SSE messages are separated by double-newline. Process complete events only.
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''
        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data:')) continue
          let payload: any
          try {
            payload = JSON.parse(line.slice(5).trim())
          } catch {
            continue
          }
          if (payload.stage === 'error') {
            throw new Error(payload.message || 'Cleaning failed')
          }
          if (payload.stage === 'result') {
            setResult(payload as PreviewResponse)
            setStreamProgress({ stage: 'result' })
          } else {
            setStreamProgress(payload)
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Cleaning failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDownloadCsv = () => {
    if (!result || !file) return
    // cleaned_csv_base64 already contains UTF-8 BOM, so Excel reads accents correctly
    const binary = atob(result.cleaned_csv_base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'text/csv;charset=utf-8' })
    const baseName = file.name.replace(/\.[^.]+$/, '')
    downloadBlob(blob, `${baseName} - cleaned.csv`)
  }

  const handleDownloadXlsx = async () => {
    if (!result || !file) return
    try {
      const headers = await requestHeaders()
      headers['Content-Type'] = 'application/json'
      const baseName = file.name.replace(/\.[^.]+$/, '')
      const response = await fetch(buildApiUrl('/csv-cleaner/to-xlsx'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          csv_base64: result.cleaned_csv_base64,
          filename: `${baseName} - cleaned.xlsx`,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || `HTTP ${response.status}`)
      }
      const blob = await response.blob()
      downloadBlob(blob, `${baseName} - cleaned.xlsx`)
    } catch (err: any) {
      setError(err?.message || 'Excel export failed')
    }
  }

  if (!isOpen) return null

  const previewColumns = result?.preview_rows[0] ? Object.keys(result.preview_rows[0]) : []

  // Filter + sort preview rows (computed every render — preview is capped at 100)
  const visiblePreviewRows = useMemo(() => {
    if (!result?.preview_rows) return []
    let rows = result.preview_rows
    if (previewSourceFilter !== 'all') {
      rows = rows.filter((r) => {
        const src = String(r['Email Source'] || '').toLowerCase()
        if (previewSourceFilter === 'empty') return src === ''
        return src === previewSourceFilter
      })
    }
    if (previewSearch.trim()) {
      const needle = previewSearch.trim().toLowerCase()
      rows = rows.filter((r) =>
        Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(needle))
      )
    }
    if (previewSort) {
      const { col, dir } = previewSort
      rows = [...rows].sort((a, b) => {
        const av = String(a[col] ?? '')
        const bv = String(b[col] ?? '')
        const an = Number(av)
        const bn = Number(bv)
        let cmp = 0
        if (!isNaN(an) && !isNaN(bn) && av && bv) {
          cmp = an - bn
        } else {
          cmp = av.localeCompare(bv)
        }
        return dir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [result?.preview_rows, previewSourceFilter, previewSearch, previewSort])

  const toggleSort = (col: string) => {
    setPreviewSort((prev) => {
      if (!prev || prev.col !== col) return { col, dir: 'asc' }
      if (prev.dir === 'asc') return { col, dir: 'desc' }
      return null
    })
  }

  return (
    <div className="animate-tab-fade-in flex flex-col h-full">
      {/* Tab toggle */}
      <div className="flex items-center gap-1 mb-3 border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => setViewMode('cleaner')}
          className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            viewMode === 'cleaner'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Cleaner
          </span>
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            viewMode === 'history'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            History
            {historyItems.length > 0 && (
              <span className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                {historyItems.length}
              </span>
            )}
          </span>
        </button>
      </div>

      {viewMode === 'history' && (
        <HistoryView
          items={historyItems}
          loading={historyLoading}
          onReload={loadHistory}
          onOpen={openHistoryEntry}
          onDelete={deleteHistoryEntry}
          onDownload={downloadHistoryFile}
        />
      )}

      {viewMode === 'cleaner' && (
      <>
      <div className="flex-1 overflow-y-auto pr-1">
        {!result && (
          <div className="space-y-4">
            <div className="text-center pb-2">
              <Sparkles className="w-10 h-10 text-orange-400 mx-auto mb-2" />
              <h3 className="text-base font-semibold text-gray-900">Clean & Enrich a Lead List</h3>
              <p className="text-sm text-gray-500 mt-1">
                Upload a CSV or Excel file, normalize names and companies, dedup, recover missing emails, and tag decision-makers.
              </p>
            </div>

            {/* File upload section */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Upload File
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                }`}
              >
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="w-8 h-8 text-green-600" />
                    <p className="text-sm text-gray-900 font-medium">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB · click to change file</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-400" />
                    <p className="text-sm text-gray-600">Drop CSV or Excel file here, or click to browse</p>
                    <p className="text-xs text-gray-500">Supports .csv, .xlsx, .xls (max 25 MB, multi-sheet OK)</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                />
              </div>

              {estimate && file && (
                <div className="mt-3 flex items-start gap-2 p-2.5 rounded-md bg-sky-50 border border-sky-200 text-xs text-sky-900">
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>{estimate.total_rows.toLocaleString()}</strong> contacts loaded ·{' '}
                    <strong>{estimate.missing_emails.toLocaleString()}</strong> missing emails
                    {options.enrich_via_apollo && (
                      <>
                        {' '}→ Apollo will use up to{' '}
                        <strong>{estimate.estimated_apollo_credits.toLocaleString()}</strong> credits
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Preset section */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preset
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedPresetId}
                  onChange={(e) => {
                    const id = e.target.value
                    setSelectedPresetId(id)
                    if (!id) return
                    const p = presets.find((x) => x.id === id)
                    if (p) {
                      setOptions({ ...DEFAULT_OPTIONS, ...p.options } as CleanOptions)
                      setInstructions(p.instructions || '')
                    }
                  }}
                  className="flex-1 min-w-[180px] px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Default settings</option>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => { setNewPresetName(''); setShowSavePresetModal(true) }}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-white text-gray-700"
                >
                  Save as preset...
                </button>
                {selectedPresetId && (
                  <button
                    onClick={async () => {
                      const id = selectedPresetId
                      const headers = await requestHeaders()
                      headers['Content-Type'] = 'application/json'
                      const r = await fetch(buildApiUrl(`/csv-cleaner/presets/${id}`), { method: 'DELETE', headers })
                      if (r.ok) {
                        setPresets((prev) => prev.filter((x) => x.id !== id))
                        setSelectedPresetId('')
                      }
                    }}
                    className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-md"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Save the current options + instructions to reuse on future cleanings.
              </p>
            </div>

            {/* Instructions section */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Cleaning Instructions <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder='Describe how to clean the list, e.g. "clean names and dedup, but don&apos;t touch companies" or "only fix emails and reduce columns"'
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                Leave blank to use sensible defaults. Advanced options below let you override individual rules.
              </p>
            </div>

            {/* Advanced options section */}
            <details
              className="border border-gray-200 rounded-lg bg-gray-50 group"
              open={advancedOpen}
              onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
            >
              <summary className="cursor-pointer p-4 text-sm font-medium text-gray-700 hover:text-gray-900 select-none flex items-center justify-between">
                <span>Advanced Options</span>
                <span className="text-xs text-gray-500">{advancedOpen ? 'Hide' : 'Show'}</span>
              </summary>
              <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm border-t border-gray-200 pt-3">
                <CheckOption
                  checked={options.clean_first_names}
                  onChange={(v) => setOptions({ ...options, clean_first_names: v })}
                  label="Clean first names"
                />
                <CheckOption
                  checked={options.clean_last_names}
                  onChange={(v) => setOptions({ ...options, clean_last_names: v })}
                  label="Clean last names"
                />
                <CheckOption
                  checked={options.clean_full_names}
                  onChange={(v) => setOptions({ ...options, clean_full_names: v })}
                  label="Clean full names"
                />
                <CheckOption
                  checked={options.clean_companies}
                  onChange={(v) => setOptions({ ...options, clean_companies: v })}
                  label="Clean company names"
                />
                <CheckOption
                  checked={options.normalize_titles}
                  onChange={(v) => setOptions({ ...options, normalize_titles: v })}
                  label="Normalize job titles"
                />
                <CheckOption
                  checked={options.guess_emails}
                  onChange={(v) => setOptions({ ...options, guess_emails: v })}
                  label="Guess missing emails"
                />
                <CheckOption
                  checked={options.dedup_emails}
                  onChange={(v) => setOptions({ ...options, dedup_emails: v })}
                  label="Dedup by email"
                />
                <CheckOption
                  checked={options.dedup_linkedin}
                  onChange={(v) => setOptions({ ...options, dedup_linkedin: v })}
                  label="Dedup by LinkedIn"
                />
                <CheckOption
                  checked={options.drop_extra_columns}
                  onChange={(v) => setOptions({ ...options, drop_extra_columns: v })}
                  label="Reduce columns to HubSpot template"
                />
                <CheckOption
                  checked={options.flag_standout}
                  onChange={(v) => setOptions({ ...options, flag_standout: v })}
                  label="Flag stand-out companies"
                />
                <CheckOption
                  checked={options.preserve_accents}
                  onChange={(v) => setOptions({ ...options, preserve_accents: v })}
                  label="Preserve European characters"
                />
                <CheckOption
                  checked={options.use_llm}
                  onChange={(v) => setOptions({ ...options, use_llm: v })}
                  label="Use AI for ambiguous names"
                />
                <CheckOption
                  className="sm:col-span-2"
                  checked={options.enrich_via_apollo}
                  onChange={(v) => setOptions({ ...options, enrich_via_apollo: v })}
                  label="Enrich missing emails via Apollo"
                />
              </div>
            </details>
          </div>
        )}

        {isProcessing && (
          <ProcessingPanel
            elapsedSeconds={processingElapsed}
            apolloEnabled={options.enrich_via_apollo}
            fileSizeKb={file ? Math.round(file.size / 1024) : 0}
            progress={streamProgress}
          />
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-800 bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">List cleaned successfully</span>
            </div>

            {result.instruction_summary && (
              <div className="border border-gray-200 rounded-lg p-3 text-sm bg-gray-50">
                <div className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1">Interpretation</div>
                <div className="text-gray-700">{result.instruction_summary}</div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Stat label="Rows in" value={result.stats.rows_in} />
              <Stat label="Rows out" value={result.stats.rows_out} highlight />
              <Stat label="Duplicates removed" value={result.stats.duplicates_removed} />
              <Stat label="Decision makers" value={result.stats.decision_makers} highlight />
              <Stat label="Emails guessed" value={result.stats.emails_guessed} highlight />
              {result.stats.emails_from_apollo > 0 && (
                <Stat label="Emails from Apollo" value={result.stats.emails_from_apollo} highlight />
              )}
              <Stat label="Titles normalized" value={result.stats.titles_normalized} />
              <Stat label="First names cleaned" value={result.stats.names_cleaned} />
              <Stat label="Last names cleaned" value={result.stats.last_names_cleaned ?? 0} />
              <Stat label="Full names cleaned" value={result.stats.full_names_cleaned} />
              <Stat label="Companies cleaned" value={result.stats.companies_cleaned} />
            </div>

            {result.issues.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                <div className="font-medium text-yellow-900 mb-1">Notes</div>
                <ul className="text-gray-700 space-y-0.5">
                  {result.issues.map((iss, i) => {
                    const lower = iss.toLowerCase()
                    const looksLikeMissing = lower.includes('missing email')
                    const looksLikeInvalid = lower.includes('invalid email')
                    const looksLikeInfo = lower.startsWith('combined ')
                    const looksLikeApolloSkip = lower.includes('apollo enrichment skipped')

                    let icon = '·'
                    let cls = 'text-gray-700'
                    if (looksLikeMissing) { icon = '⚠'; cls = 'text-yellow-800' }
                    else if (looksLikeInvalid) { icon = '⚠'; cls = 'text-yellow-800' }
                    else if (looksLikeApolloSkip) { icon = '⚠'; cls = 'text-yellow-800' }
                    else if (looksLikeInfo) { icon = 'ℹ'; cls = 'text-blue-700' }

                    const clickable = looksLikeMissing
                    return (
                      <li key={i} className={`flex items-start gap-2 ${cls} ${clickable ? 'cursor-pointer hover:underline' : ''}`}
                        onClick={() => {
                          if (looksLikeMissing && previewColumns.includes('Email Source')) {
                            setPreviewSourceFilter('empty')
                          }
                        }}
                      >
                        <span className="font-mono text-xs">{icon}</span>
                        <span>{iss}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {result.standout_companies.length > 0 && (
              <details className="border border-gray-200 rounded-lg bg-gray-50 text-sm">
                <summary className="cursor-pointer p-3 font-medium text-gray-700 hover:text-gray-900">
                  Stand-out companies ({result.standout_companies.length})
                  <span className="font-normal text-gray-500"> — appear fewer than {options.standout_threshold} times</span>
                </summary>
                <div className="px-3 pb-3 text-gray-700 max-h-32 overflow-y-auto border-t border-gray-200 pt-2">
                  {result.standout_companies.join(', ')}
                </div>
              </details>
            )}

            {result.domain_patterns && Object.keys(result.domain_patterns).length > 0 && (
              <details className="border border-gray-200 rounded-lg bg-gray-50 text-sm">
                <summary className="cursor-pointer p-3 font-medium text-gray-700 hover:text-gray-900">
                  Email patterns detected
                  <span className="font-normal text-gray-500"> ({Object.keys(result.domain_patterns).length} domains)</span>
                </summary>
                <div className="px-3 pb-3 max-h-40 overflow-y-auto font-mono text-xs text-gray-700 border-t border-gray-200 pt-2 space-y-0.5">
                  {Object.entries(result.domain_patterns).slice(0, 50).map(([d, p]) => (
                    <div key={d}><span className="text-gray-500">{d}</span> {'->'} {p}</div>
                  ))}
                </div>
              </details>
            )}

            {result.columns_dropped.length > 0 && (
              <details className="border border-gray-200 rounded-lg bg-gray-50 text-sm">
                <summary className="cursor-pointer p-3 font-medium text-gray-700 hover:text-gray-900">
                  Columns dropped
                  <span className="font-normal text-gray-500"> ({result.columns_dropped.length})</span>
                </summary>
                <div className="px-3 pb-3 text-gray-700 break-words border-t border-gray-200 pt-2">
                  {result.columns_dropped.join(', ')}
                </div>
              </details>
            )}

            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">
                Preview <span className="font-normal text-gray-500">
                  ({visiblePreviewRows.length} of {result.preview_rows.length} {result.preview_rows.length === 1 ? 'row' : 'rows'})
                </span>
              </h4>

              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    placeholder="Search preview..."
                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                {previewColumns.includes('Email Source') && (
                  <select
                    value={previewSourceFilter}
                    onChange={(e) => setPreviewSourceFilter(e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">All email sources</option>
                    <option value="original">Original</option>
                    <option value="apollo">Apollo</option>
                    <option value="pattern">Pattern guess</option>
                    <option value="empty">Empty (no email)</option>
                  </select>
                )}
                {(previewSearch || previewSourceFilter !== 'all' || previewSort) && (
                  <button
                    onClick={() => {
                      setPreviewSearch('')
                      setPreviewSourceFilter('all')
                      setPreviewSort(null)
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg overflow-auto max-h-80 text-xs bg-white">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {previewColumns.map((c) => {
                        const isSorted = previewSort?.col === c
                        return (
                          <th
                            key={c}
                            onClick={() => toggleSort(c)}
                            className="text-left px-3 py-2 font-medium text-gray-700 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                          >
                            <span className="inline-flex items-center gap-1">
                              {c}
                              {isSorted && previewSort?.dir === 'asc' && <ArrowUp className="w-3 h-3" />}
                              {isSorted && previewSort?.dir === 'desc' && <ArrowDown className="w-3 h-3" />}
                            </span>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePreviewRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={previewColumns.length}
                          className="px-3 py-6 text-center text-gray-400"
                        >
                          No rows match the current filter
                        </td>
                      </tr>
                    ) : (
                      visiblePreviewRows.map((row, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          {previewColumns.map((c) => (
                            <td key={c} className="px-3 py-2 text-gray-900 truncate max-w-[200px]">
                              {row[c]}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-gray-200">
        {result ? (
          <>
            <button
              onClick={reset}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
            >
              Clean another file
            </button>
            <div className="relative">
              <button
                onClick={() => setDownloadMenuOpen((v) => !v)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium text-gray-700"
              >
                <Download className="w-4 h-4" />
                Download
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {downloadMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDownloadMenuOpen(false)} />
                  <div className="absolute right-0 bottom-full mb-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[160px]">
                    <button
                      onClick={() => { setDownloadMenuOpen(false); handleDownloadCsv() }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                      Download CSV
                    </button>
                    <button
                      onClick={() => { setDownloadMenuOpen(false); handleDownloadXlsx() }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      Download Excel (.xlsx)
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setShowHubSpotModal(true)}
              className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 font-medium"
            >
              <ArrowRight className="w-4 h-4" />
              Send to HubSpot
            </button>
          </>
        ) : (
          <button
            onClick={handlePreview}
            disabled={!file || isProcessing}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Cleaning...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Clean List
              </>
            )}
          </button>
        )}
      </div>
      </>
      )}

      {result && (
        <SendToHubSpotModal
          isOpen={showHubSpotModal}
          onClose={() => setShowHubSpotModal(false)}
          contacts={result.preview_rows}
        />
      )}

      {duplicateMatch && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Already cleaned</h3>
            <p className="text-sm text-gray-600 mb-3">
              This file was already cleaned on{' '}
              <strong>{new Date(duplicateMatch.created_at).toLocaleString()}</strong>
              {duplicateMatch.user_email ? <> by <strong>{duplicateMatch.user_email}</strong></> : null}.
            </p>
            <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md p-2 mb-4">
              <div>{duplicateMatch.filename}</div>
              <div>
                {duplicateMatch.rows_in.toLocaleString()} {'->'}{' '}
                {duplicateMatch.rows_out.toLocaleString()} rows
                {duplicateMatch.emails_from_apollo > 0 && (
                  <> · {duplicateMatch.emails_from_apollo} Apollo</>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  // Re-clean anyway: drop duplicate marker, accept file normally
                  if (pendingFile) acceptFile(pendingFile)
                  setPendingFile(null)
                  setDuplicateMatch(null)
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
              >
                Clean again
              </button>
              <button
                onClick={() => {
                  const id = duplicateMatch.id
                  setPendingFile(null)
                  setDuplicateMatch(null)
                  openHistoryEntry(id)
                }}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
              >
                Open previous result
              </button>
            </div>
          </div>
        </div>
      )}

      {showSavePresetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Save preset</h3>
            <p className="text-sm text-gray-600 mb-3">
              Save the current cleaning options and instructions for quick reuse.
            </p>
            <input
              type="text"
              autoFocus
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSavePreset()
                if (e.key === 'Escape') setShowSavePresetModal(false)
              }}
              placeholder="e.g. ITSM full clean"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSavePresetModal(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!newPresetName.trim()}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const CheckOption = ({
  checked,
  onChange,
  label,
  hint,
  className = '',
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
  className?: string
}) => (
  <label className={`flex items-start gap-2 cursor-pointer ${className}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
    />
    <span>
      <span className="text-gray-900">{label}</span>
      {hint && <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>}
    </span>
  </label>
)

const activeStageIndexFallback = (elapsedSeconds: number, stages: ProcessingStage[]): number => {
  let cumulative = 0
  for (let i = 0; i < stages.length; i++) {
    cumulative += stages[i].estimatedSeconds
    if (elapsedSeconds < cumulative) return i
  }
  return stages.length - 1
}

const formatElapsed = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const ProcessingPanel: React.FC<{
  elapsedSeconds: number
  apolloEnabled: boolean
  fileSizeKb: number
  progress?: { stage: string; current?: number; total?: number } | null
}> = ({ elapsedSeconds, apolloEnabled, fileSizeKb, progress }) => {
  const stages = PROCESSING_STAGES.filter(
    (s) => apolloEnabled || s.id !== 'apollo'
  )
  const totalEstimate = stages.reduce((sum, s) => sum + s.estimatedSeconds, 0)

  // Real-time stage from streaming progress (if available), otherwise estimate by elapsed time
  const stageIdxByEvent: Record<string, number> = {
    start: 0,
    first_names: 1,
    last_names: 1,
    full_names: 1,
    companies: 2,
    titles: 3,
    apollo: 4,
    apollo_done: 4,
    pattern_guess: 5,
    done: stages.length - 1,
    result: stages.length - 1,
  }

  let activeStageIdx: number
  let pct: number
  let apolloDetail: string | null = null

  if (progress) {
    const eventStage = progress.stage
    // Map "apollo" with parsing offset to step 4 (or adjusted if Apollo skipped)
    const apolloPos = stages.findIndex((s) => s.id === 'apollo')
    let idx = stageIdxByEvent[eventStage] ?? activeStageIndexFallback(elapsedSeconds, stages)
    if (eventStage === 'apollo' && apolloPos === -1) {
      // Apollo wasn't planned but emitted -> defensive
      idx = stages.length - 2
    }
    activeStageIdx = Math.min(idx, stages.length - 1)

    if (progress.stage === 'apollo' && progress.total) {
      const apolloPct = Math.round(((progress.current || 0) / progress.total) * 100)
      apolloDetail = `${progress.current || 0} / ${progress.total} contacts (${apolloPct}%)`
    }
    if (progress.stage === 'result' || progress.stage === 'done') {
      pct = 100
    } else {
      const stagesDone = activeStageIdx
      const stageProgress = progress.stage === 'apollo' && progress.total
        ? Math.min(0.99, (progress.current || 0) / progress.total)
        : 0.5
      const completedTime = stages.slice(0, stagesDone).reduce((s, x) => s + x.estimatedSeconds, 0)
      const partial = (stages[stagesDone]?.estimatedSeconds || 0) * stageProgress
      pct = Math.min(95, Math.round(((completedTime + partial) / totalEstimate) * 100))
    }
  } else {
    activeStageIdx = activeStageIndexFallback(elapsedSeconds, stages)
    pct = Math.min(95, Math.round((elapsedSeconds / totalEstimate) * 100))
  }

  return (
    <div className="mt-4 border border-orange-200 bg-orange-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
          <span className="text-sm font-semibold text-gray-900">Cleaning your list</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-mono">
          <Clock className="w-3.5 h-3.5" />
          {formatElapsed(elapsedSeconds)}
        </div>
      </div>

      <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="space-y-1.5">
        {stages.map((stage, i) => {
          const isDone = i < activeStageIdx
          const isActive = i === activeStageIdx
          return (
            <li key={stage.id} className="flex items-center gap-2 text-xs">
              {isDone ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              ) : isActive ? (
                <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin flex-shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-gray-300 flex-shrink-0" />
              )}
              <span
                className={
                  isDone
                    ? 'text-gray-500 line-through'
                    : isActive
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-500'
                }
              >
                {stage.label}
                {isActive && stage.id === 'apollo' && apolloDetail && (
                  <span className="ml-2 text-orange-700 font-mono">{apolloDetail}</span>
                )}
              </span>
            </li>
          )
        })}
      </ul>

      {apolloEnabled && (
        <p className="text-xs text-gray-600 italic">
          Apollo enrichment talks to an external service for each contact without a known email,
          so this step can take 1–3 minutes on larger lists. You can switch tabs — progress is
          saved.
        </p>
      )}
      {!apolloEnabled && fileSizeKb > 500 && (
        <p className="text-xs text-gray-600 italic">
          Larger files take longer to upload and parse. You can switch tabs — progress is saved.
        </p>
      )}
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

const HistoryView: React.FC<{
  items: HistoryItem[]
  loading: boolean
  onReload: () => void
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onDownload: (id: string, filename: string, format: 'csv' | 'xlsx') => void
}> = ({ items, loading, onReload, onOpen, onDelete, onDownload }) => {
  const fmtTime = (iso: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    const diffMs = Date.now() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}h ago`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7) return `${diffD}d ago`
    return d.toLocaleDateString()
  }

  const fmtSize = (bytes: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="flex-1 overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          Past cleanings in your organization, last 90 days. Shared between SDRs.
        </p>
        <button
          onClick={onReload}
          disabled={loading}
          className="px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Reload
        </button>
      </div>

      {loading && items.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm">
          <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
          Loading history...
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
          <History className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <div>No past cleanings yet.</div>
          <div className="text-xs mt-1">Cleaned files will appear here for 90 days.</div>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((it) => (
            <div
              key={it.id}
              className="border border-gray-200 rounded-lg p-3 hover:border-orange-300 transition-colors bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onOpen(it.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileSpreadsheet className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {it.filename || 'upload.csv'}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0 inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {fmtTime(it.created_at)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>
                      <strong className="text-gray-700">{it.rows_in.toLocaleString()}</strong> {'->'}{' '}
                      <strong className="text-gray-700">{it.rows_out.toLocaleString()}</strong> rows
                    </span>
                    {it.duplicates_removed > 0 && (
                      <span>-{it.duplicates_removed} dup</span>
                    )}
                    {it.emails_from_apollo > 0 && (
                      <span className="text-purple-700">
                        +{it.emails_from_apollo} Apollo
                      </span>
                    )}
                    {it.emails_guessed > 0 && (
                      <span className="text-blue-700">
                        +{it.emails_guessed} pattern
                      </span>
                    )}
                    {it.file_size > 0 && <span>{fmtSize(it.file_size)}</span>}
                    {it.user_email && (
                      <span className="text-gray-400">by {it.user_email}</span>
                    )}
                    {it.blob_truncated && (
                      <span className="text-amber-700">file too large - no download</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onOpen(it.id)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
                  >
                    Open
                  </button>
                  {!it.blob_truncated && (
                    <button
                      onClick={() => onDownload(it.id, it.filename, 'csv')}
                      className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded"
                      title="Download CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${it.filename}" from history?`)) {
                        onDelete(it.id)
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
