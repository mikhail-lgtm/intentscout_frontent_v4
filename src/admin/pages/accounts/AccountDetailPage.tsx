import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Boxes, Mail, Pencil, Plus, Signal, Users } from 'lucide-react'
import { adminApi } from '../../../lib/api/admin'
import type { AdminOrganizationDetail, AdminProduct, AdminUserSummary } from '../../../types/admin'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatCard,
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

export const AccountDetailPage = () => {
  const { accountId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [org, setOrg] = useState<AdminOrganizationDetail | null>(null)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [members, setMembers] = useState<AdminUserSummary[]>([])
  const [loading, setLoading] = useState(true)

  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editState, setEditState] = useState('active')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!accountId) return
    setLoading(true)
    const [oRes, pRes, mRes] = await Promise.all([
      adminApi.organizations.detail(accountId),
      adminApi.products.list(accountId),
      adminApi.organizations.members(accountId),
    ])
    setOrg(oRes.data ?? null)
    setProducts(pRes.data ?? [])
    setMembers(mRes.data ?? [])
    if (oRes.data) {
      setEditName(oRes.data.name ?? '')
      setEditState(oRes.data.state ?? 'active')
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  const saveEdit = async () => {
    if (!accountId) return
    setSaving(true)
    const res = await adminApi.organizations.update(accountId, { name: editName.trim(), state: editState })
    setSaving(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success('Account updated')
    setEditOpen(false)
    void load()
  }

  if (loading) {
    return (
      <div className="py-16">
        <Spinner label="Loading account..." />
      </div>
    )
  }

  if (!org) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Account not found</div>
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/admin/accounts')}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to accounts
      </button>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {org.name || org.id}
            <Badge tone={org.state === 'active' ? 'success' : 'neutral'}>{org.state || 'unknown'}</Badge>
          </span>
        }
        actions={
          <Button variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>
            Edit
          </Button>
        }
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Signals" value={(org.stats?.signals_total ?? 0).toLocaleString()} icon={<Signal className="h-5 w-5" />} tone="accent" />
          <StatCard label="Contacts" value={(org.stats?.contacts_total ?? 0).toLocaleString()} icon={<Users className="h-5 w-5" />} />
          <StatCard label="Email gens" value={(org.stats?.email_generations_total ?? 0).toLocaleString()} icon={<Mail className="h-5 w-5" />} />
          <StatCard label="Users" value={org.user_count} icon={<Users className="h-5 w-5" />} />
        </div>

        <Card>
          <CardHeader
            title="Products"
            description="Scoring products for this account"
            actions={
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate(`/admin/products/new?org=${org.id}`)}
              >
                Add product
              </Button>
            }
          />
          {products.length === 0 ? (
            <CardBody>
              <p className="py-6 text-center text-sm text-slate-400">No products for this account yet</p>
            </CardBody>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Product</TH>
                  <TH>Status</TH>
                  <TH>Source</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {products.map((p) => (
                  <TR key={p.id} className="cursor-pointer" onClick={() => navigate(`/admin/products/${p.id}`)}>
                    <TD>
                      <div className="font-medium text-slate-900">{p.name}</div>
                      <div className="font-mono text-xs text-slate-400">{p.product_id}</div>
                    </TD>
                    <TD>
                      <Badge tone={p.status === 'active' ? 'success' : 'warning'}>{p.status}</Badge>
                    </TD>
                    <TD className="text-slate-600">{MODE_LABEL[p.scrape_source?.company_filter?.mode] ?? '-'}</TD>
                    <TD className="text-right">
                      <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => navigate(`/admin/products/${p.id}`)}>
                        Edit
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Users" description="People that belong to this account (manage in People)" />
          {members.length === 0 ? (
            <CardBody>
              <p className="py-6 text-center text-sm text-slate-400">No users in this account</p>
            </CardBody>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Email</TH>
                  <TH>Role</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {members.map((u) => (
                  <TR key={u.id}>
                    <TD className="font-medium text-slate-900">{u.email ?? u.id}</TD>
                    <TD>
                      <Badge tone={u.is_admin ? 'accent' : 'neutral'}>{u.is_admin ? 'admin' : 'user'}</Badge>
                    </TD>
                    <TD className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/people')}>
                        Manage
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        size="sm"
        title="Edit account"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveEdit} loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" required>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </Field>
          <Field label="State">
            <Select value={editState} onChange={(e) => setEditState(e.target.value)}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="suspended">suspended</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </div>
  )
}
