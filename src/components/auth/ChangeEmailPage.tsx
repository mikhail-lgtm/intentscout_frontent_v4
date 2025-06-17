import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { cn } from '../../utils/cn'

export const ChangeEmailPage = () => {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [newEmail, setNewEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mode, setMode] = useState<'request' | 'confirm'>('request')

  // Parse URL parameters for email confirmation
  const urlParams = new URLSearchParams(location.search)
  const type = urlParams.get('type')
  const token = urlParams.get('token')

  useEffect(() => {
    // If we have an email change confirmation token
    if (type === 'email_change' && token) {
      setMode('confirm')
      handleEmailConfirmation()
    }
  }, [type, token])

  const handleEmailConfirmation = async () => {
    try {
      setIsSubmitting(true)
      
      const { error: confirmError } = await supabase.auth.verifyOtp({
        token_hash: token!,
        type: 'email_change',
      })

      if (confirmError) {
        setError('Invalid or expired confirmation link')
      } else {
        setSuccess('Email successfully updated!')
        setTimeout(() => navigate('/'), 2000)
      }
    } catch (err) {
      console.error('Email confirmation error:', err)
      setError('Failed to confirm email change')
    }
    
    setIsSubmitting(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newEmail.trim()) {
      setError('Please enter a new email address')
      return
    }

    if (newEmail === user?.email) {
      setError('New email must be different from current email')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      })

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess('Confirmation email sent to your new email address. Please check both your current and new email inboxes.')
      }
    } catch (err) {
      console.error('Change email error:', err)
      setError('Failed to initiate email change')
    }

    setIsSubmitting(false)
  }

  if (mode === 'confirm') {
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
              Email Confirmation
            </h2>
            {isSubmitting ? (
              <div className="mt-6">
                <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Confirming your email change...</p>
              </div>
            ) : error ? (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
                <p className="text-red-600">{error}</p>
                <button
                  onClick={() => navigate('/login')}
                  className="mt-4 text-sm text-orange-600 hover:text-orange-500"
                >
                  Return to Sign In
                </button>
              </div>
            ) : success ? (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
                <p className="text-green-600">{success}</p>
                <p className="text-sm text-gray-600 mt-2">Redirecting to application...</p>
              </div>
            ) : null}
          </div>
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
            Change Email Address
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Update your account email address
          </p>
          {user?.email && (
            <p className="mt-1 text-sm text-gray-500">
              Current email: {user.email}
            </p>
          )}
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700">
              New Email Address
            </label>
            <input
              id="newEmail"
              name="newEmail"
              type="email"
              autoComplete="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className={cn(
                "input-field mt-1",
                error && "border-red-300 focus:ring-red-500 focus:border-red-500"
              )}
              placeholder="Enter new email address"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              You'll receive confirmation emails at both your current and new email addresses
            </p>
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

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={isSubmitting || !newEmail.trim()}
              className={cn(
                "flex-1 btn-primary py-3 text-base",
                (isSubmitting || !newEmail.trim()) && 
                "opacity-50 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending confirmation...
                </div>
              ) : (
                'Send Confirmation'
              )}
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/')}
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