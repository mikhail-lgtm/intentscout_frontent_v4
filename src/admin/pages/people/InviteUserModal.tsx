import { useEffect, useState } from 'react'
import { adminApi } from '../../../lib/api/admin'
import type { AdminOrganizationSummary } from '../../../types/admin'
import { Button, Field, Input, Modal, Select, useToast } from '../../ui'

interface InviteUserModalProps {
  open: boolean
  onClose: () => void
  orgs: AdminOrganizationSummary[]
  onDone: () => void
}

export const InviteUserModal = ({ open, onClose, orgs, onDone }: InviteUserModalProps) => {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('user')
  const [orgId, setOrgId] = useState('')
  const [mode, setMode] = useState<'invite' | 'create'>('invite')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEmail('')
      setRole('user')
      setOrgId('')
      setMode('invite')
      setPassword('')
    }
  }, [open])

  const submit = async () => {
    if (!email.trim()) {
      toast.error('Email is required')
      return
    }
    setSubmitting(true)
    const roleValue = role === 'admin' ? 'admin' : null
    const res =
      mode === 'invite'
        ? await adminApi.users.invite({ email: email.trim(), role: roleValue, organization_id: orgId || undefined })
        : await adminApi.users.createUser({
            email: email.trim(),
            password: password || undefined,
            role: roleValue,
            organization_id: orgId || undefined,
          })
    setSubmitting(false)
    if (res.error) {
      toast.error(res.error)
      return
    }
    toast.success(mode === 'invite' ? `Invite sent to ${email.trim()}` : `User ${email.trim()} created`)
    onDone()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Add a person"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            {mode === 'invite' ? 'Send invite' : 'Create user'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-sm">
          <button
            type="button"
            onClick={() => setMode('invite')}
            className={
              mode === 'invite'
                ? 'rounded-md bg-orange-500 px-3 py-1 font-medium text-white'
                : 'rounded-md px-3 py-1 text-slate-600'
            }
          >
            Invite by email
          </button>
          <button
            type="button"
            onClick={() => setMode('create')}
            className={
              mode === 'create'
                ? 'rounded-md bg-orange-500 px-3 py-1 font-medium text-white'
                : 'rounded-md px-3 py-1 text-slate-600'
            }
          >
            Create directly
          </button>
        </div>

        <Field
          label="Email"
          required
          hint={mode === 'invite' ? 'Supabase sends a real invite email to this address.' : 'No email is sent.'}
        >
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@company.com" type="email" />
        </Field>

        {mode === 'create' && (
          <Field label="Temporary password" hint="Optional - leave empty to auto-generate">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="text" />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          <Field label="Organization" hint="Optional">
            <Select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              <option value="">None</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name || o.id}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  )
}
