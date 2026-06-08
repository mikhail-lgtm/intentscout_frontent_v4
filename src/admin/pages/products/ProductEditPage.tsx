import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileText, Save, Trash2 } from 'lucide-react'
import { adminApi } from '../../../lib/api/admin'
import type {
  AdminOrganizationSummary,
  ProductCompanyFilter,
  ProductPayload,
  PromptTemplateSummary,
} from '../../../types/admin'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  Textarea,
  useToast,
} from '../../ui'

const emptyPayload = (): ProductPayload => ({
  product_id: '',
  name: '',
  organization_id: '',
  status: 'active',
  prompt: '',
  query: '',
  scrape_source: {
    type: 'linkedin_jobs',
    company_filter: {
      mode: 'all',
      target_organizations: '',
      allowed_countries: [],
      min_revenue_usd: null,
      include_null_revenue: true,
    },
  },
  intent_model: '',
  stage2_enabled: true,
  max_results: 20,
  notes: '',
})

export const ProductEditPage = () => {
  const { productId } = useParams()
  const isEdit = Boolean(productId)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const toast = useToast()

  const [form, setForm] = useState<ProductPayload>(emptyPayload())
  const [orgs, setOrgs] = useState<AdminOrganizationSummary[]>([])
  const [templates, setTemplates] = useState<PromptTemplateSummary[]>([])
  const [templatePick, setTemplatePick] = useState('')
  const [countriesText, setCountriesText] = useState('')

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    const init = async () => {
      const [oRes, tRes] = await Promise.all([
        adminApi.organizations.list(1, 100),
        adminApi.products.templates(),
      ])
      if (!active) return
      setOrgs(oRes.data?.organizations ?? [])
      setTemplates(tRes.data ?? [])

      if (isEdit && productId) {
        const pRes = await adminApi.products.detail(productId)
        if (!active) return
        if (pRes.data) {
          const d = pRes.data
          setForm({
            product_id: d.product_id,
            name: d.name,
            organization_id: d.organization_id,
            status: d.status,
            prompt: d.prompt,
            query: d.query,
            scrape_source: d.scrape_source,
            intent_model: d.intent_model ?? '',
            stage2_enabled: d.stage2_enabled,
            max_results: d.max_results,
            notes: d.notes,
          })
          setCountriesText((d.scrape_source?.company_filter?.allowed_countries ?? []).join(', '))
        } else if (pRes.error) {
          setError(pRes.error)
        }
      } else {
        const orgParam = searchParams.get('org')
        if (orgParam) setForm((f) => ({ ...f, organization_id: orgParam }))
      }
      setLoading(false)
    }
    void init()
    return () => {
      active = false
    }
  }, [isEdit, productId])

  const setFilter = (patch: Partial<ProductCompanyFilter>) =>
    setForm((f) => ({
      ...f,
      scrape_source: {
        ...f.scrape_source,
        company_filter: { ...f.scrape_source.company_filter, ...patch },
      },
    }))

  const applyTemplate = async (name: string) => {
    setTemplatePick(name)
    if (!name) return
    const res = await adminApi.products.template(name)
    if (res.data) {
      const content = res.data
      setForm((f) => ({ ...f, prompt: content.prompt, query: content.query || f.query }))
      toast.info(`Loaded template "${name}"`)
    } else if (res.error) {
      toast.error(res.error)
    }
    setTemplatePick('')
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.product_id.trim() || !form.organization_id) {
      toast.error('Name, product id and organization are required')
      return
    }
    setSaving(true)
    setError(null)
    const payload: ProductPayload = {
      ...form,
      product_id: form.product_id.trim(),
      name: form.name.trim(),
      intent_model: form.intent_model && form.intent_model.trim() ? form.intent_model.trim() : null,
      scrape_source: {
        type: form.scrape_source.type,
        company_filter: {
          ...form.scrape_source.company_filter,
          allowed_countries: countriesText
            .split(/[\s,]+/)
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean),
        },
      },
    }
    const res =
      isEdit && productId
        ? await adminApi.products.update(productId, payload)
        : await adminApi.products.create(payload)
    setSaving(false)
    if (res.error) {
      setError(res.error)
      toast.error(res.error)
      return
    }
    toast.success(isEdit ? 'Product updated' : 'Product created')
    navigate('/admin/products')
  }

  const handleDelete = async () => {
    if (!productId) return
    setDeleting(true)
    const res = await adminApi.products.remove(productId)
    setDeleting(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success('Product deleted')
    navigate('/admin/products')
  }

  if (loading) {
    return (
      <div className="py-16">
        <Spinner label="Loading product..." />
      </div>
    )
  }

  const filter = form.scrape_source.company_filter

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => navigate('/admin/products')}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to products
      </button>

      <PageHeader title={isEdit ? 'Edit product' : 'New product'} />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-5">
        {/* Basics */}
        <Card>
          <CardHeader title="Basics" />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" required htmlFor="name">
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Agentforce ITSM"
              />
            </Field>
            <Field label="Product id" required htmlFor="product_id" hint="Stable id used in scoring; unique per organization">
              <Input
                id="product_id"
                value={form.product_id}
                onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
                placeholder="agentforce_itsm"
                className="font-mono"
              />
            </Field>
            <Field label="Organization" required htmlFor="org">
              <Select
                id="org"
                value={form.organization_id}
                onChange={(e) => setForm((f) => ({ ...f, organization_id: e.target.value }))}
              >
                <option value="">Select organization...</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name || o.id}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="status">
              <Select
                id="status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProductPayload['status'] }))}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </Select>
            </Field>
          </CardBody>
        </Card>

        {/* Prompt & query */}
        <Card>
          <CardHeader
            title="Prompt & query"
            description="The scoring prompt and the semantic-search query. Paste your own or load a saved template as a starting point."
            actions={
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                <Select value={templatePick} onChange={(e) => void applyTemplate(e.target.value)} className="w-48">
                  <option value="">Load from template...</option>
                  {templates.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>
            }
          />
          <CardBody className="space-y-4">
            <Field label="System prompt" hint={`${form.prompt.length} characters`}>
              <Textarea
                value={form.prompt}
                onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
                placeholder="Paste the scoring prompt, or load a template above..."
                className="min-h-[220px] font-mono text-xs"
              />
            </Field>
            <Field label="Search query" hint="Used to retrieve relevant job postings from the vector store">
              <Textarea
                value={form.query}
                onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))}
                placeholder="IT Service Management platform replacement, help desk automation, ..."
                className="min-h-[80px] font-mono text-xs"
              />
            </Field>
          </CardBody>
        </Card>

        {/* Scraping source */}
        <Card>
          <CardHeader
            title="Scraping source"
            description="Where this product pulls signal from, and which companies to include."
          />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Source" htmlFor="source_type">
              <Select
                id="source_type"
                value={form.scrape_source.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scrape_source: { ...f.scrape_source, type: e.target.value } }))
                }
              >
                <option value="linkedin_jobs">LinkedIn jobs</option>
              </Select>
            </Field>
            <Field label="Company filter" htmlFor="filter_mode">
              <Select
                id="filter_mode"
                value={filter.mode}
                onChange={(e) => setFilter({ mode: e.target.value as ProductCompanyFilter['mode'] })}
              >
                <option value="all">All companies in pool</option>
                <option value="target_organizations">By target tag</option>
                <option value="country_revenue">By HQ country + revenue</option>
              </Select>
            </Field>

            {filter.mode === 'target_organizations' && (
              <Field
                label="Target tag"
                className="sm:col-span-2"
                hint="Matches companies whose target_organizations field equals this value"
              >
                <Input
                  value={filter.target_organizations ?? ''}
                  onChange={(e) => setFilter({ target_organizations: e.target.value })}
                  placeholder="intentscout"
                  className="font-mono"
                />
              </Field>
            )}

            {filter.mode === 'country_revenue' && (
              <>
                <Field
                  label="Allowed HQ countries"
                  className="sm:col-span-2"
                  hint="Comma or space separated ISO codes, e.g. US, CA, GB, DE"
                >
                  <Input
                    value={countriesText}
                    onChange={(e) => setCountriesText(e.target.value)}
                    placeholder="US, CA, GB, IE, FR, DE, ..."
                    className="font-mono"
                  />
                </Field>
                <Field label="Min revenue (USD)" htmlFor="min_rev">
                  <Input
                    id="min_rev"
                    type="number"
                    value={filter.min_revenue_usd ?? ''}
                    onChange={(e) =>
                      setFilter({ min_revenue_usd: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    placeholder="1000000000"
                  />
                </Field>
                <Field label="Include null revenue">
                  <label className="flex items-center gap-2 py-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={filter.include_null_revenue}
                      onChange={(e) => setFilter({ include_null_revenue: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                    />
                    Keep companies with unknown revenue
                  </label>
                </Field>
              </>
            )}
          </CardBody>
        </Card>

        {/* Advanced */}
        <Card>
          <CardHeader title="Advanced" />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Intent model override" htmlFor="model" hint="Leave empty to use the pipeline default">
              <Input
                id="model"
                value={form.intent_model ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, intent_model: e.target.value }))}
                placeholder="google/gemini-2.5-flash"
                className="font-mono"
              />
            </Field>
            <Field label="Max results (top-k)" htmlFor="max_results" hint="Jobs retrieved per company">
              <Input
                id="max_results"
                type="number"
                value={form.max_results}
                onChange={(e) => setForm((f) => ({ ...f, max_results: Number(e.target.value) || 0 }))}
              />
            </Field>
            <Field label="Stage-2 validation">
              <label className="flex items-center gap-2 py-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.stage2_enabled}
                  onChange={(e) => setForm((f) => ({ ...f, stage2_enabled: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                />
                Run the second-stage LLM validator
              </label>
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Internal notes (optional)"
              />
            </Field>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div>
          {isEdit && (
            <Button
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/admin/products')} disabled={saving}>
            Cancel
          </Button>
          <Button leftIcon={<Save className="h-4 w-4" />} onClick={handleSave} loading={saving}>
            {isEdit ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete product"
        message={`Delete "${form.name}" (${form.product_id})? This cannot be undone.`}
        confirmLabel="Delete"
        tone="danger"
        loading={deleting}
      />
    </div>
  )
}
