import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Boxes,
  Building2,
  Database,
  Users,
  PlayCircle,
  DollarSign,
  ScrollText,
  Activity,
} from 'lucide-react'
import { adminApi } from '../../lib/api/admin'
import type { AdminProfile } from '../../types/admin'
import { cn } from '../../utils/cn'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/monitoring', label: 'Monitoring', icon: Activity, end: false },
  { to: '/admin/accounts', label: 'Accounts', icon: Building2, end: false },
  { to: '/admin/products', label: 'Products', icon: Boxes, end: false },
  { to: '/admin/scraping-pool', label: 'Scraping pool', icon: Database, end: false },
  { to: '/admin/people', label: 'People', icon: Users, end: false },
  { to: '/admin/activity', label: 'Activity', icon: ScrollText, end: false },
  { to: '/admin/pipeline', label: 'Pipeline', icon: PlayCircle, end: false },
  { to: '/admin/costs', label: 'Costs', icon: DollarSign, end: false },
]

export const AdminLayout = () => {
  const [profile, setProfile] = useState<AdminProfile | null>(null)

  useEffect(() => {
    let active = true
    const loadProfile = async () => {
      const response = await adminApi.auth.profile()
      if (!active) return
      if (response.data) setProfile(response.data)
    }
    void loadProfile()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">IntentScout</p>
          <h1 className="mt-1 text-lg font-semibold text-slate-900">Admin Console</h1>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-orange-50 text-orange-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )
                }
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end border-b border-slate-200 bg-white px-8 py-4">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-700">{profile?.email ?? 'Admin user'}</p>
            <p className="text-xs uppercase tracking-wide text-slate-400">
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
