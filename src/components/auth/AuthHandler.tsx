import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export const AuthHandler = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Parse both URL search params and hash params
        const urlParams = new URLSearchParams(location.search)
        const hashParams = new URLSearchParams(location.hash.substring(1))
        
        // Get all possible parameters
        const type = urlParams.get('type') || hashParams.get('type')
        const accessToken = urlParams.get('access_token') || hashParams.get('access_token')
        const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token')
        const error_code = urlParams.get('error_code') || hashParams.get('error_code')
        const error_description = urlParams.get('error_description') || hashParams.get('error_description')

        console.log('Auth handler params:', { 
          type, 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken,
          error_code,
          search: location.search,
          hash: location.hash 
        })

        // Handle errors
        if (error_code) {
          let errorMessage = 'Authentication failed'
          if (error_code === 'otp_expired') {
            errorMessage = 'The link has expired. Please request a new one.'
          } else if (error_description) {
            errorMessage = decodeURIComponent(error_description.replace(/\+/g, ' '))
          }
          setError(errorMessage)
          setIsProcessing(false)
          return
        }

        // Handle password reset
        if (type === 'recovery' && accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            console.error('Session error:', sessionError)
            setError('Failed to establish session for password reset')
          } else {
            // Redirect to reset password page in reset mode
            navigate('/reset-password?mode=reset', { replace: true })
          }
          return
        }

        // Handle invite
        if (type === 'invite' && accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            console.error('Invite session error:', sessionError)
            setError('Failed to process invitation')
          } else {
            navigate('/invite?setup=true', { replace: true })
          }
          return
        }

        // Handle magic link
        if (type === 'magiclink' && accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            console.error('Magic link session error:', sessionError)
            setError('Failed to sign in with magic link')
          } else {
            navigate('/', { replace: true })
          }
          return
        }

        // Handle email change confirmation
        if (type === 'email_change') {
          navigate('/change-email?confirmed=true', { replace: true })
          return
        }

        // Handle signup confirmation
        if (type === 'signup') {
          navigate('/confirm-signup', { replace: true })
          return
        }

        // If no recognized type, redirect to login
        navigate('/login', { replace: true })

      } catch (err) {
        console.error('Auth callback error:', err)
        setError('Authentication processing failed')
      }

      setIsProcessing(false)
    }

    handleAuthCallback()
  }, [location, navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <img
            className="mx-auto h-20 w-auto mb-8"
            src="/IntentScoutFull.png"
            alt="IntentScout"
          />
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Authentication Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
            >
              Return to Sign In
            </button>
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
          src="/IntentScoutFull.png"
          alt="IntentScout"
        />
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  )
}