import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Boxes, Building2, ChevronRight, Plus, Users } from 'lucide-react'
import { adminApi } from '../../../lib/api/admin'
import type { AdminOrganizationSummary, AdminProduct } from '../../../types/admin'
import { Badge, Button, EmptyState, Field, Input, Modal, PageHeader, Spinner, useToast } from '../../ui'

export const AccountsPage = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [orgs, setOrgs] = useState<AdminOrganizationSummary[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    const [oRes, pRes] = await Promise.all([adminApi.organizations.list(1, 100), adminApi.products.list()])
    setOrgs(oRes.data?.organizations ?? [])
    setProducts(pRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const prodCount = useMemo(() => {
    const m: Record<string, number> = {}
    products.forEach((p) => {
      m[p.organization_id] = (m[p.organization_id] || 0) + 1
    })
    return m
  }, [products])

  const create = async () => {
    if (!newName.trim()) {
      toast.error('Name is required')
      return
    }
    setCreating(true)
    const res = await adminApi.organizations.create({ name: newName.trim() })
    setCreating(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success('Account created')
    setCreateOpen(false)
    setNewName('')
    if (res.data?.id) navigate(`/admin/accounts/${res.data.id}`)
    else void load()
  }

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Client company accounts (tenants). Each account has its own products, users and signals."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            New account
          </Button>
        }
      />

      {loading ? (
        <div className="py-16">
          <Spinner label="Loading accounts..." />
        </div>
      ) : orgs.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="No accounts"
          description="Create the first client account."
          action={
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
              New account
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => navigate(`/admin/accounts/${o.id}`)}
              className="group rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-orange-300 hover:shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-orange-400" />
              </div>
              <p className="mt-3 text-base font-semibold text-slate-900">{o.name || o.id}</p>
              <div className="mt-1">
                <Badge tone={o.state === 'active' ? 'success' : 'neutral'}>{o.state || 'unknown'}</Badge>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-4 w-4" /> {o.user_count}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Boxes className="h-4 w-4" /> {prodCount[o.id] ?? 0} products
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        size="sm"
        title="New account"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={create} loading={creating}>
              Create
            </Button>
          </>
        }
      >
        <Field label="Account name" required>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Acme Corp" />
        </Field>
      </Modal>
    </div>
  )
}
