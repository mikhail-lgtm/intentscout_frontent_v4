import { useEffect, useState, type KeyboardEvent } from 'react'
import { Building2, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, UploadCloud } from 'lucide-react'
import { adminApi } from '../../../lib/api/admin'
import type { AdminCompany } from '../../../types/admin'
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  PageHeader,
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '../../ui'
import { CompanyFormModal } from './CompanyFormModal'
import { ImportCompaniesModal } from './ImportCompaniesModal'

const PAGE_SIZE = 25

const money = (n?: number | null): string => {
  if (n == null) return '-'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}

export const CompaniesPage = () => {
  const toast = useToast()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [target, setTarget] = useState('')
  const [country, setCountry] = useState('')
  const [applied, setApplied] = useState({ search: '', target: '', country: '' })

  const [companies, setCompanies] = useState<AdminCompany[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AdminCompany | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<AdminCompany | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    const res = await adminApi.companies.list({
      search: applied.search || undefined,
      target_organizations: applied.target || undefined,
      hq_country: applied.country || undefined,
      page,
      page_size: PAGE_SIZE,
    })
    if (res.error) setError(res.error)
    setCompanies(res.data?.companies ?? [])
    setTotal(res.data?.total ?? 0)
    setLoading(false)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, applied])

  const apply = () => {
    setPage(1)
    setApplied({ search: search.trim(), target: target.trim(), country: country.trim() })
  }

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') apply()
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    const res = await adminApi.companies.remove(pendingDelete.id)
    setDeleting(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(`Deleted "${pendingDelete.company_name}"`)
    setPendingDelete(null)
    void load()
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <PageHeader
        title="Companies"
        description="The scraping pool. Create a company to add it to MongoDB instantly, or bulk import from CSV."
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<UploadCloud className="h-4 w-4" />}
              onClick={() => setImportOpen(true)}
            >
              Import CSV
            </Button>
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              New company
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder="Search name or company id..."
            className="w-64 pl-9"
          />
        </div>
        <Input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder="Target tag"
          className="w-40 font-mono"
        />
        <Input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder="HQ country"
          className="w-32 font-mono"
        />
        <Button variant="secondary" onClick={apply}>
          Apply
        </Button>
        <span className="ml-auto text-sm text-slate-500">{total.toLocaleString()} companies</span>
      </div>

      {loading ? (
        <div className="py-16">
          <Spinner label="Loading companies..." />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : companies.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="No companies found"
          description="Adjust your search, or add a company."
          action={
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              New company
            </Button>
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Company</TH>
                <TH>Country</TH>
                <TH>Industry</TH>
                <TH>Revenue</TH>
                <TH>Tags</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {companies.map((c) => (
                <TR
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setEditing(c)
                    setFormOpen(true)
                  }}
                >
                  <TD>
                    <div className="font-medium text-slate-900">{c.company_name}</div>
                    {c.company_id != null && <div className="font-mono text-xs text-slate-400">{c.company_id}</div>}
                  </TD>
                  <TD className="text-slate-600">{c.hq_country ?? '-'}</TD>
                  <TD className="max-w-[200px] truncate text-slate-600">{c.industry ?? '-'}</TD>
                  <TD className="text-slate-600">{money(c.est_rev_high_usd)}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {(c.target_organizations ?? []).slice(0, 3).map((t) => (
                        <Badge key={t} tone="accent">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </TD>
                  <TD className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Pencil className="h-4 w-4" />}
                        onClick={() => {
                          setEditing(c)
                          setFormOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        leftIcon={<Trash2 className="h-4 w-4" />}
                        onClick={() => setPendingDelete(c)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>
              Page {page} of {pages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <CompanyFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        company={editing}
        onSaved={() => void load()}
      />
      <ImportCompaniesModal open={importOpen} onClose={() => setImportOpen(false)} onImported={() => void load()} />
      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete company"
        message={pendingDelete ? `Delete "${pendingDelete.company_name}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        tone="danger"
        loading={deleting}
      />
    </div>
  )
}
