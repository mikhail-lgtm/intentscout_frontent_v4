import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Settings2, UserPlus, Users } from 'lucide-react'
import { adminApi } from '../../../lib/api/admin'
import type { AdminOrganizationSummary, AdminUserSummary } from '../../../types/admin'
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
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
import { InviteUserModal } from './InviteUserModal'
import { UserManageModal } from './UserManageModal'

const PAGE_SIZE = 20

const formatDate = (value?: string | null): string => {
  if (!value) return 'never'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'never'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export const PeoplePage = () => {
  const toast = useToast()
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [orgs, setOrgs] = useState<AdminOrganizationSummary[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [inviteOpen, setInviteOpen] = useState(false)
  const [manageUser, setManageUser] = useState<AdminUserSummary | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

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
    const [uRes, oRes] = await Promise.all([adminApi.users.list(page, PAGE_SIZE), adminApi.organizations.list(1, 100)])
    if (uRes.error) setError(uRes.error)
    setUsers(uRes.data?.users ?? [])
    setOrgs(oRes.data?.organizations ?? [])
    setSelected(new Set())
    setLoading(false)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const allOnPageSelected = users.length > 0 && users.every((u) => selected.has(u.id))
  const toggleAll = () => {
    setSelected((prev) => {
      if (users.every((u) => prev.has(u.id))) return new Set()
      return new Set(users.map((u) => u.id))
    })
  }
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const runBulk = async (action: 'deactivate' | 'activate' | 'set_role' | 'delete', role?: string | null) => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    setBulkBusy(true)
    const res = await adminApi.users.bulk(ids, action, role)
    setBulkBusy(false)
    setBulkDeleteOpen(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    const data = res.data
    toast.success(`Done: ${data?.succeeded ?? 0} ok${data?.failed ? `, ${data.failed} failed` : ''}`)
    void load()
  }

  const hasNext = users.length === PAGE_SIZE

  return (
    <div>
      <PageHeader
        title="People"
        description="Supabase users. Invite new people, manage roles, organizations and access."
        actions={
          <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
            Add person
          </Button>
        }
      />

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm">
          <span className="font-medium text-orange-800">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => void runBulk('set_role', 'admin')} disabled={bulkBusy}>
              Make admin
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void runBulk('set_role', null)} disabled={bulkBusy}>
              Remove admin
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void runBulk('deactivate')} disabled={bulkBusy}>
              Deactivate
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void runBulk('activate')} disabled={bulkBusy}>
              Activate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={bulkBusy}
            >
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16">
          <Spinner label="Loading people..." />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No users"
          description="Invite your first user."
          action={
            <Button leftIcon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
              Add person
            </Button>
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH className="w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                  />
                </TH>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH>Organizations</TH>
                <TH>Last sign-in</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {users.map((u) => {
                const names = (u.organizations ?? []).map((id) => orgName[id] ?? id)
                return (
                  <TR key={u.id}>
                    <TD onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleOne(u.id)}
                        className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                      />
                    </TD>
                    <TD className="font-medium text-slate-900">{u.email ?? '-'}</TD>
                    <TD>
                      <Badge tone={u.is_admin ? 'accent' : 'neutral'}>{u.is_admin ? 'admin' : 'user'}</Badge>
                    </TD>
                    <TD className="text-slate-600">
                      {names.length === 0 ? (
                        <span className="text-slate-400">-</span>
                      ) : names.length <= 2 ? (
                        names.join(', ')
                      ) : (
                        `${names.slice(0, 2).join(', ')} +${names.length - 2}`
                      )}
                    </TD>
                    <TD className="text-slate-500">{formatDate(u.last_sign_in_at)}</TD>
                    <TD className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Settings2 className="h-4 w-4" />}
                        onClick={() => setManageUser(u)}
                      >
                        Manage
                      </Button>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>Page {page}</span>
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
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} orgs={orgs} onDone={() => void load()} />
      <UserManageModal
        open={manageUser !== null}
        onClose={() => setManageUser(null)}
        user={manageUser}
        orgs={orgs}
        onChanged={() => void load()}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() => void runBulk('delete')}
        title="Delete users"
        message={`Permanently delete ${selected.size} user(s)? This removes their Supabase accounts.`}
        confirmLabel="Delete"
        tone="danger"
        loading={bulkBusy}
      />
    </div>
  )
}
