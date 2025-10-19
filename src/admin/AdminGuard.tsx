import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAdminAuth } from '../hooks/useAdminAuth'

interface AdminGuardProps {
  children: ReactNode
}

export const AdminGuard = ({ children }: AdminGuardProps) => {
  const { isAdmin, loading, error, refresh } = useAdminAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <p className="text-lg font-semibold">Checking admin access…</p>
            <p className="text-sm text-slate-400">Hold tight while we verify your permissions.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-md w-full space-y-6 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-lg">
          <div>
            <p className="text-xl font-semibold text-slate-100">Admin access required</p>
            <p className="mt-2 text-sm text-slate-400">
              {error ?? 'Your account does not have access to the admin dashboard.'}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => { void refresh() }}
              className="inline-flex justify-center items-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
            >
              Retry check
            </button>
            <Link
              to="/"
              className="inline-flex justify-center items-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Return to app
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

