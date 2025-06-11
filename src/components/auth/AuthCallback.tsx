import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export const AuthCallback = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the URL hash/search params
        const urlParams = new URLSearchParams(window.location.search)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        
        // Check both URL params and hash params for tokens
        const accessToken = urlParams.get('access_token') || hashParams.get('access_token')
        const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token')
        const tokenType = urlParams.get('token_type') || hashParams.get('token_type')
        const type = urlParams.get('type') || hashParams.get('type')

        if (accessToken && refreshToken && type === 'invite') {
          // Set the session with the tokens
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            console.error('Session error:', sessionError)
            setError('Failed to establish session')
            return
          }

          // Redirect to password setup page with special flag
          navigate('/invite?setup=true')
        } else {
          // Handle other auth flows or redirect to login
          navigate('/login')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setError('Authentication failed')
      }
    }

    handleAuthCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <img
            className="mx-auto h-20 w-auto mb-8"
            src="/IntentScout.png"
            alt="IntentScout"
          />
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Authentication Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <img
          className="mx-auto h-20 w-auto mb-8"
          src="/IntentScout.png"
          alt="IntentScout"
        />
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  )
}