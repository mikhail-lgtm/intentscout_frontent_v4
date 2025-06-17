import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { cn } from '../../utils/cn'

export const ResetPasswordPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mode, setMode] = useState<'request' | 'reset'>('request')

  // Parse URL parameters from both search and hash
  const urlParams = new URLSearchParams(location.search)
  const hashParams = new URLSearchParams(location.hash.substring(1))
  
  const type = urlParams.get('type') || hashParams.get('type')
  const accessToken = urlParams.get('access_token') || hashParams.get('access_token') || 
                     urlParams.get('token') || hashParams.get('token')

  useEffect(() => {
    // Check if we're in reset mode via URL parameter
    const resetMode = urlParams.get('mode')
    
    if (resetMode === 'reset') {
      setMode('reset')
    } else if ((type === 'recovery' || type === 'magiclink') && accessToken) {
      setMode('reset')
      handleTokenSession()
    }
  }, [type, accessToken, location.search, location.hash])

  const handleTokenSession = async () => {
    if (!accessToken) return
    
    try {
      // Extract refresh token if available
      const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token')
      
      if (refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) {
          console.error('Session error:', error)
        }
      }
    } catch (err) {
      console.error('Token session error:', err)
    }
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      })

      if (resetError) {
        setError(resetError.message)
      } else {
        setSuccess('Password reset email sent! Check your inbox for instructions.')
      }
    } catch (err) {
      console.error('Reset password error:', err)
      setError('Failed to send reset email')
    }

    setIsSubmitting(false)
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess('Password updated successfully!')
        setTimeout(() => navigate('/'), 2000)
      }
    } catch (err) {
      console.error('Update password error:', err)
      setError('Failed to update password')
    }

    setIsSubmitting(false)
  }

  if (mode === 'reset') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <img
              className="mx-auto h-20 w-auto"
              src="/IntentScoutFull.png"
              alt="IntentScout"
            />
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              Reset Your Password
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Enter your new password below
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handlePasswordReset}>
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "input-field mt-1",
                    error && "border-red-300 focus:ring-red-500 focus:border-red-500"
                  )}
                  placeholder="Enter new password (min 6 characters)"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(
                    "input-field mt-1",
                    error && "border-red-300 focus:ring-red-500 focus:border-red-500"
                  )}
                  placeholder="Confirm new password"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting || !password.trim() || !confirmPassword.trim()}
                className={cn(
                  "w-full btn-primary py-3 text-base",
                  (isSubmitting || !password.trim() || !confirmPassword.trim()) && 
                  "opacity-50 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Updating password...
                  </div>
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            className="mx-auto h-20 w-auto"
            src="/IntentScoutFull.png"
            alt="IntentScout"
          />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Reset Password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we'll send you a reset link
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleRequestReset}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                "input-field mt-1",
                error && "border-red-300 focus:ring-red-500 focus:border-red-500"
              )}
              placeholder="Enter your email"
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className={cn(
                "w-full btn-primary py-3 text-base",
                (isSubmitting || !email.trim()) && 
                "opacity-50 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending reset email...
                </div>
              ) : (
                'Send Reset Email'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-orange-600 hover:text-orange-500"
            >
              Back to Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}