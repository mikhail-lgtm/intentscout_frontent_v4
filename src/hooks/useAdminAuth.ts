import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../lib/api/admin'

interface AdminAuthState {
  isAdmin: boolean
  loading: boolean
  error: string | null
}

export const useAdminAuth = () => {
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    loading: true,
    error: null,
  })

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))

    try {
      const response = await adminApi.auth.check()

      if (response.data?.is_admin) {
        setState({ isAdmin: true, loading: false, error: null })
        return
      }

      if (response.status === 403) {
        setState({ isAdmin: false, loading: false, error: 'Admin access required' })
        return
      }

      const errorMessage = response.error || 'Failed to verify admin access'
      setState({ isAdmin: false, loading: false, error: errorMessage })
    } catch (error) {
      setState({
        isAdmin: false,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to verify admin access',
      })
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { ...state, refresh }
}
