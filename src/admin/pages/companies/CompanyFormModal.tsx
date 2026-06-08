import { useEffect, useState } from 'react'
import { adminApi } from '../../../lib/api/admin'
import type { AdminCompany, CompanyPayload } from '../../../types/admin'
import { Button, Field, Input, Modal, Textarea, useToast } from '../../ui'

interface CompanyFormModalProps {
  open: boolean
  onClose: () => void
  company: AdminCompany | null
  onSaved: () => void
}

interface FormState {
  company_name: string
  company_id: string
  company_url: string
  website: string
  industry: string
  company_size: string
  headquarters: string
  hq_country: string
  est_rev_high_usd: string
  est_rev_low_usd: string
  type: string
  founded: string
  specialties: string
  about_us: string
  target: string
}

const EMPTY: FormState = {
  company_name: '',
  company_id: '',
  company_url: '',
  website: '',
  industry: '',
  company_size: '',
  headquarters: '',
  hq_country: '',
  est_rev_high_usd: '',
  est_rev_low_usd: '',
  type: '',
  founded: '',
  specialties: '',
  about_us: '',
  target: '',
}

const num = (s: string): number | null => {
  const t = s.trim().replace(/,/g, '')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

const str = (s: string): string | null => (s.trim() ? s.trim() : null)

export const CompanyFormModal = ({ open, onClose, company, onSaved }: CompanyFormModalProps) => {
  const toast = useToast()
  const [f, setF] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(company)

  useEffect(() => {
    if (!open) return
    if (company) {
      setF({
        company_name: company.company_name ?? '',
        company_id: company.company_id != null ? String(company.company_id) : '',
        company_url: company.company_url ?? '',
        website: company.website ?? '',
        industry: company.industry ?? '',
        company_size: company.company_size ?? '',
        headquarters: company.headquarters ?? '',
        hq_country: company.hq_country ?? '',
        est_rev_high_usd: company.est_rev_high_usd != null ? String(company.est_rev_high_usd) : '',
        est_rev_low_usd: company.est_rev_low_usd != null ? String(company.est_rev_low_usd) : '',
        type: company.type ?? '',
        founded: company.founded != null ? String(company.founded) : '',
        specialties: company.specialties ?? '',
        about_us: company.about_us ?? '',
        target: (company.target_organizations ?? []).join(', '),
      })
    } else {
      setF(EMPTY)
    }
  }, [open, company])

  const set = (key: keyof FormState) => (e: { target: { value: string } }) =>
    setF((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSave = async () => {
    if (!f.company_name.trim()) {
      toast.error('Company name is required')
      return
    }
    setSaving(true)
    const payload: CompanyPayload = {
      company_name: f.company_name.trim(),
      company_id: num(f.company_id),
      company_url: str(f.company_url),
      website: str(f.website),
      industry: str(f.industry),
      company_size: str(f.company_size),
      headquarters: str(f.headquarters),
      hq_country: str(f.hq_country),
      est_rev_high_usd: num(f.est_rev_high_usd),
      est_rev_low_usd: num(f.est_rev_low_usd),
      type: str(f.type),
      founded: num(f.founded),
      specialties: str(f.specialties),
      about_us: str(f.about_us),
      target_organizations: f.target
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }
    const res =
      isEdit && company
        ? await adminApi.companies.update(company.id, payload)
        : await adminApi.companies.create(payload)
    setSaving(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(isEdit ? 'Company updated' : 'Company created')
    onSaved()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit company' : 'New company'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {isEdit ? 'Save changes' : 'Create company'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Company name" required>
          <Input value={f.company_name} onChange={set('company_name')} placeholder="Acme Corp" />
        </Field>
        <Field label="LinkedIn company id" hint="Numeric id used to match scraped jobs (optional)">
          <Input value={f.company_id} onChange={set('company_id')} placeholder="1234567" className="font-mono" />
        </Field>
        <Field label="Website">
          <Input value={f.website} onChange={set('website')} placeholder="https://acme.com" />
        </Field>
        <Field label="LinkedIn URL">
          <Input value={f.company_url} onChange={set('company_url')} placeholder="https://linkedin.com/company/acme" />
        </Field>
        <Field label="Industry">
          <Input value={f.industry} onChange={set('industry')} placeholder="Software" />
        </Field>
        <Field label="Company size">
          <Input value={f.company_size} onChange={set('company_size')} placeholder="1001-5000" />
        </Field>
        <Field label="HQ country" hint="ISO code, e.g. US">
          <Input value={f.hq_country} onChange={set('hq_country')} placeholder="US" className="font-mono" />
        </Field>
        <Field label="Headquarters">
          <Input value={f.headquarters} onChange={set('headquarters')} placeholder="New York, NY" />
        </Field>
        <Field label="Revenue high (USD)">
          <Input value={f.est_rev_high_usd} onChange={set('est_rev_high_usd')} placeholder="1000000000" />
        </Field>
        <Field label="Revenue low (USD)">
          <Input value={f.est_rev_low_usd} onChange={set('est_rev_low_usd')} placeholder="500000000" />
        </Field>
        <Field label="Type">
          <Input value={f.type} onChange={set('type')} placeholder="Public Company" />
        </Field>
        <Field label="Founded">
          <Input value={f.founded} onChange={set('founded')} placeholder="1999" />
        </Field>
        <Field label="Target tags" className="sm:col-span-2" hint="Comma separated, e.g. intentscout, customertimes">
          <Input value={f.target} onChange={set('target')} placeholder="intentscout" className="font-mono" />
        </Field>
        <Field label="Specialties" className="sm:col-span-2">
          <Input value={f.specialties} onChange={set('specialties')} placeholder="CRM, ERP, ..." />
        </Field>
        <Field label="About" className="sm:col-span-2">
          <Textarea value={f.about_us} onChange={set('about_us')} placeholder="Short description..." className="min-h-[80px]" />
        </Field>
      </div>
    </Modal>
  )
}
