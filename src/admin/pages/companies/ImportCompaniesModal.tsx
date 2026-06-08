import { useState, type ChangeEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import { adminApi } from '../../../lib/api/admin'
import type { CompanyImportResult } from '../../../types/admin'
import { Button, Field, Input, Modal, Textarea, useToast } from '../../ui'

interface ImportCompaniesModalProps {
  open: boolean
  onClose: () => void
  onImported: () => void
}

export const ImportCompaniesModal = ({ open, onClose, onImported }: ImportCompaniesModalProps) => {
  const toast = useToast()
  const [csvText, setCsvText] = useState('')
  const [target, setTarget] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<CompanyImportResult | null>(null)

  const reset = () => {
    setCsvText('')
    setTarget('')
    setResult(null)
  }

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCsvText(String(reader.result || ''))
    reader.onerror = () => toast.error('Could not read file')
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!csvText.trim()) {
      toast.error('Paste CSV or choose a file first')
      return
    }
    setImporting(true)
    setResult(null)
    const res = await adminApi.companies.import(csvText, target.trim() || undefined)
    setImporting(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    if (res.data) {
      setResult(res.data)
      toast.success(`Imported ${res.data.inserted} companies`)
      onImported()
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      size="lg"
      title="Import companies from CSV"
      description="Header row required. Recognised columns: company_name, company_id, website, industry, company_size, headquarters, hq_country, est_rev_high_usd, est_rev_low_usd, type, founded, specialties, about_us, target_organizations. Rows with an existing company_id are skipped."
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              reset()
              onClose()
            }}
            disabled={importing}
          >
            Close
          </Button>
          <Button onClick={handleImport} loading={importing} leftIcon={<UploadCloud className="h-4 w-4" />}>
            Import
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <UploadCloud className="h-4 w-4 text-slate-400" />
            Choose CSV file
            <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          </label>
          <Field label="" className="flex-1">
            <Input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Optional: tag all imported rows (e.g. intentscout)"
              className="font-mono"
            />
          </Field>
        </div>

        <Field label="CSV content" hint={csvText ? `${csvText.split(/\r?\n/).filter(Boolean).length} lines` : undefined}>
          <Textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="company_name,company_id,hq_country,est_rev_high_usd&#10;Acme Corp,1234567,US,1000000000"
            className="min-h-[180px] font-mono text-xs"
          />
        </Field>

        {result && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex flex-wrap gap-4">
              <span className="text-emerald-700">Inserted: {result.inserted}</span>
              <span className="text-amber-700">Skipped: {result.skipped}</span>
              <span className="text-red-700">Errors: {result.errors}</span>
              <span className="text-slate-500">Total rows: {result.total_rows}</span>
            </div>
            {result.messages.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-slate-500">
                {result.messages.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
