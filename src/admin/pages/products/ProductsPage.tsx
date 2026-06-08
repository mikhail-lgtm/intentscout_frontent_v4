import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Boxes, Plus, Pencil, Trash2, Search } from 'lucide-react'
import { adminApi } from '../../../lib/api/admin'
import type { AdminProduct, AdminOrganizationSummary } from '../../../types/admin'
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '../../ui'

const MODE_LABEL: Record<string, string> = {
  all: 'All companies',
  target_organizations: 'Target tag',
  country_revenue: 'Country + revenue',
}

const formatDate = (value?: string | null): string => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export const ProductsPage = () => {
  const navigate = useNavigate()
  const toast = useToast()

  const [products, setProducts] = useState<AdminProduct[]>([])
  const [orgs, setOrgs] = useState<AdminOrganizationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [orgFilter, setOrgFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [pendingDelete, setPendingDelete] = useState<AdminProduct | null>(null)
  const [deleting, setDeleting] = useState(false)

  const orgName = useMemo(() => {
    const map: Record<string, string> = {}
    orgs.forEach((o) => {
      map[o.id] = o.name || o.id
    })
    return map
  }, [orgs])

  const load = async () => {
    setLoading(true)
    setError(null)
    const [pRes, oRes] = await Promise.all([adminApi.products.list(), adminApi.organizations.list(1, 100)])
    if (pRes.error) setError(pRes.error)
    setProducts(pRes.data ?? [])
    setOrgs(oRes.data?.organizations ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (orgFilter && p.organization_id !== orgFilter) return false
      if (statusFilter && p.status !== statusFilter) return false
      if (q && !`${p.name} ${p.product_id}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [products, search, orgFilter, statusFilter])

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    const res = await adminApi.products.remove(pendingDelete.id)
    setDeleting(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(`Deleted "${pendingDelete.name}"`)
    setPendingDelete(null)
    void load()
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Scoring products that drive intent analysis. Configure the prompt, search query and where to scrape from - no code edits."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/admin/products/new')}>
            New product
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-64 pl-9"
          />
        </div>
        <Select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className="w-56">
          <option value="">All organizations</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name || o.id}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </Select>
        <span className="text-sm text-slate-500">
          {filtered.length} of {products.length}
        </span>
      </div>

      {loading ? (
        <div className="py-16">
          <Spinner label="Loading products..." />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-6 w-6" />}
          title={products.length === 0 ? 'No products yet' : 'No products match your filters'}
          description={
            products.length === 0
              ? 'Create your first product to configure its prompt, query and scraping source.'
              : 'Try clearing the search or filters.'
          }
          action={
            products.length === 0 ? (
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/admin/products/new')}>
                New product
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Product</TH>
              <TH>Organization</TH>
              <TH>Status</TH>
              <TH>Source</TH>
              <TH>Updated</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((p) => (
              <TR
                key={p.id}
                className="cursor-pointer"
                onClick={() => navigate(`/admin/products/${p.id}`)}
              >
                <TD>
                  <div className="font-medium text-slate-900">{p.name}</div>
                  <div className="font-mono text-xs text-slate-400">{p.product_id}</div>
                </TD>
                <TD className="text-slate-600">{orgName[p.organization_id] ?? p.organization_id}</TD>
                <TD>
                  <Badge tone={p.status === 'active' ? 'success' : 'warning'}>{p.status}</Badge>
                </TD>
                <TD className="text-slate-600">{MODE_LABEL[p.scrape_source?.company_filter?.mode] ?? '-'}</TD>
                <TD className="text-slate-500">{formatDate(p.updated_at)}</TD>
                <TD className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="inline-flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/admin/products/${p.id}`)}
                      leftIcon={<Pencil className="h-4 w-4" />}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDelete(p)}
                      className="text-red-600 hover:bg-red-50"
                      leftIcon={<Trash2 className="h-4 w-4" />}
                    >
                      Delete
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete product"
        message={
          pendingDelete
            ? `Delete "${pendingDelete.name}" (${pendingDelete.product_id})? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        tone="danger"
        loading={deleting}
      />
    </div>
  )
}
