import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { cn } from '../../utils/cn'

export const ReauthPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get the intended destination from location state
  const from = location.state?.from || '/'
  const reason = location.state?.reason || 'This action requires you to confirm your identity'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password.trim()) {
      setError('Please enter your password')
      return
    }

    if (!user?.email) {
      setError('User email not found')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Reauthenticate by signing in again
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      })

      if (signInError) {
        setError('Invalid password. Please try again.')
      } else {
        // Success - redirect to intended destination
        navigate(from, { replace: true })
      }
    } catch (err) {
      console.error('Reauthentication error:', err)
      setError('Authentication failed')
    }

    setIsSubmitting(false)
  }

  const handleCancel = () => {
    navigate(-1) // Go back to previous page
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
            Confirm Your Identity
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {reason}
          </p>
          {user?.email && (
            <p className="mt-1 text-sm text-gray-500">
              Signed in as: {user.email}
            </p>
          )}
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Enter your password to continue
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                "input-field mt-1",
                error && "border-red-300 focus:ring-red-500 focus:border-red-500"
              )}
              placeholder="Enter your password"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className={cn(
                "flex-1 btn-primary py-3 text-base",
                (isSubmitting || !password.trim()) && 
                "opacity-50 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Verifying...
                </div>
              ) : (
                'Continue'
              )}
            </button>
            
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 btn-secondary py-3 text-base"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}