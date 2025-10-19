import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { adminApi } from '../../lib/api/admin'
import type { AdminProfile } from '../../types/admin'

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/logs', label: 'Logs' },
  { to: '/admin/system', label: 'System Health' },
]

export const AdminLayout = () => {
  const [profile, setProfile] = useState<AdminProfile | null>(null)

  useEffect(() => {
    let active = true

    const loadProfile = async () => {
      const response = await adminApi.auth.profile()
      if (!active) return
      if (response.data) {
        setProfile(response.data)
      }
    }

    void loadProfile()
    return () => { active = false }
  }, [])

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="w-64 border-r border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="px-6 py-6 border-b border-slate-800">
          <p className="text-sm uppercase tracking-wide text-slate-500">IntentScout</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Admin Console</h1>
        </div>
        <nav className="px-4 py-6 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-orange-500/20 text-orange-300'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col bg-slate-50 text-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur px-8 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Overview</h2>
            <p className="text-sm text-slate-500">Monitor platform health, usage, and services.</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-700">{profile?.email ?? 'Admin user'}</p>
            <p className="text-xs text-slate-400 uppercase tracking-wide">
              {profile?.role ? `Role: ${profile.role}` : 'Role: admin'}
            </p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
