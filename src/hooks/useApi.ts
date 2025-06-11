import { useState, useCallback } from 'react'
import { api, apiClient, type ApiResponse } from '../lib/apiClient'
import { useAuth } from './useAuth'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface UseApiOptions {
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
  requireAuth?: boolean
}

export const useApi = <T = any>(options: UseApiOptions = {}) => {
  const { signOut } = useAuth()
  const { onSuccess, onError, requireAuth = true } = options
  
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const handleResponse = useCallback(async (response: ApiResponse<T>) => {
    if (response.error) {
      // Handle authentication errors
      if (response.status === 401) {
        console.log('Authentication failed, signing out...')
        await signOut()
        return
      }
      
      setState(prev => ({ ...prev, loading: false, error: response.error! }))
      onError?.(response.error)
    } else {
      setState(prev => ({ ...prev, loading: false, data: response.data!, error: null }))
      onSuccess?.(response.data)
    }
  }, [onSuccess, onError, signOut])

  const request = useCallback(async (
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: any
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      let response: ApiResponse<T>
      
      switch (method) {
        case 'GET':
          response = await apiClient.get<T>(endpoint, requireAuth)
          break
        case 'POST':
          response = await apiClient.post<T>(endpoint, body, requireAuth)
          break
        case 'PUT':
          response = await apiClient.put<T>(endpoint, body, requireAuth)
          break
        case 'PATCH':
          response = await apiClient.patch<T>(endpoint, body, requireAuth)
          break
        case 'DELETE':
          response = await apiClient.delete<T>(endpoint, requireAuth)
          break
        default:
          throw new Error(`Unsupported method: ${method}`)
      }

      await handleResponse(response)
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Request failed'
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      onError?.(errorMessage)
      return { error: errorMessage, status: 0 }
    }
  }, [handleResponse, requireAuth])

  // Convenience methods
  const get = useCallback((endpoint: string) => request('GET', endpoint), [request])
  const post = useCallback((endpoint: string, body?: any) => request('POST', endpoint, body), [request])
  const put = useCallback((endpoint: string, body?: any) => request('PUT', endpoint, body), [request])
  const patch = useCallback((endpoint: string, body?: any) => request('PATCH', endpoint, body), [request])
  const del = useCallback((endpoint: string) => request('DELETE', endpoint), [request])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    get,
    post,
    put,
    patch,
    delete: del,
    reset,
  }
}

// Hook for making a single API call with automatic loading states
export const useApiCall = <T = any>(options: UseApiOptions = {}) => {
  const api = useApi<T>(options)
  
  return {
    ...api,
    execute: api.get // Default to GET, but can use other methods
  }
}