import { useEffect, useState } from 'react'
import { KeyRound, Trash2, UserCheck, UserX } from 'lucide-react'
import { adminApi } from '../../../lib/api/admin'
import type { AdminOrganizationSummary, AdminUserSummary } from '../../../types/admin'
import { Badge, Button, ConfirmDialog, Field, Modal, Select, useToast } from '../../ui'

interface UserManageModalProps {
  open: boolean
  onClose: () => void
  user: AdminUserSummary | null
  orgs: AdminOrganizationSummary[]
  onChanged: () => void
}

export const UserManageModal = ({ open, onClose, user, orgs, onChanged }: UserManageModalProps) => {
  const toast = useToast()
  const [role, setRole] = useState('user')
  const [memberOrgs, setMemberOrgs] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open && user) {
      setRole(user.is_admin ? 'admin' : 'user')
      setMemberOrgs(new Set(user.organizations ?? []))
    }
  }, [open, user])

  if (!user) return null

  const changeRole = async (next: string) => {
    setRole(next)
    setBusy(true)
    const res = await adminApi.users.setRole(user.id, next === 'admin' ? 'admin' : null)
    setBusy(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(next === 'admin' ? 'Granted admin' : 'Removed admin')
    onChanged()
  }

  const toggleOrg = async (orgId: string, isMember: boolean) => {
    setBusy(true)
    const res = await adminApi.users.setOrg(user.id, orgId, isMember ? 'remove' : 'add')
    setBusy(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    setMemberOrgs((prev) => {
      const next = new Set(prev)
      if (isMember) next.delete(orgId)
      else next.add(orgId)
      return next
    })
    toast.success(isMember ? 'Removed from organization' : 'Added to organization')
    onChanged()
  }

  const setActive = async (active: boolean) => {
    setBusy(true)
    const res = await adminApi.users.setStatus(user.id, active)
    setBusy(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(active ? 'User reactivated' : 'User deactivated')
    onChanged()
  }

  const sendRecovery = async () => {
    setBusy(true)
    const res = await adminApi.users.recovery(user.id)
    setBusy(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success('Password reset email sent')
  }

  const doDelete = async () => {
    setBusy(true)
    const res = await adminApi.users.remove(user.id)
    setBusy(false)
    setConfirmDelete(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success('User deleted')
    onChanged()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} size="md" title={user.email ?? 'User'} description={user.id}>
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Badge tone={user.is_admin ? 'accent' : 'neutral'}>{user.is_admin ? 'admin' : 'user'}</Badge>
        </div>

        <Field label="Role">
          <Select value={role} onChange={(e) => void changeRole(e.target.value)} disabled={busy}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Organizations</p>
          <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {orgs.length === 0 && <p className="px-1 py-2 text-sm text-slate-400">No organizations</p>}
            {orgs.map((o) => {
              const isMember = memberOrgs.has(o.id)
              return (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={isMember}
                    disabled={busy}
                    onChange={() => void toggleOrg(o.id, isMember)}
                    className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                  />
                  {o.name || o.id}
                </label>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" size="sm" leftIcon={<KeyRound className="h-4 w-4" />} onClick={sendRecovery} disabled={busy}>
            Send password reset
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<UserX className="h-4 w-4" />} onClick={() => void setActive(false)} disabled={busy}>
            Deactivate
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<UserCheck className="h-4 w-4" />} onClick={() => void setActive(true)} disabled={busy}>
            Activate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
          >
            Delete
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={doDelete}
        title="Delete user"
        message={`Permanently delete ${user.email ?? user.id}? This removes their Supabase account.`}
        confirmLabel="Delete"
        tone="danger"
        loading={busy}
      />
    </Modal>
  )
}
