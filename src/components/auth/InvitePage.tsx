import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { cn } from '../../utils/cn'

export const InvitePage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProcessingInvite, setIsProcessingInvite] = useState(true)

  // Parse URL parameters manually since we're coming from an external link
  const urlParams = new URLSearchParams(location.search)
  const token = urlParams.get('token')
  const type = urlParams.get('type')

  useEffect(() => {
    const processInvite = async () => {
      // Check if we're coming from the invite setup flow
      const isSetupFlow = urlParams.get('setup') === 'true'
      
      if (isSetupFlow) {
        // User has completed Supabase verification, show password setup form
        setIsProcessingInvite(false)
        return
      }

      if (!token || type !== 'invite') {
        setError('Invalid invitation link')
        setIsProcessingInvite(false)
        return
      }

      try {
        // For invite links, we'll redirect to Supabase auth which will redirect back
        // This is the correct flow for Supabase invites
        window.location.href = `https://aobnlsdjzbukbsefntjj.supabase.co/auth/v1/verify?token=${token}&type=invite&redirect_to=${window.location.origin}/invite?setup=true`
      } catch (err) {
        console.error('Error processing invite:', err)
        setError('Failed to process invitation')
        setIsProcessingInvite(false)
      }
    }

    processInvite()
  }, [token, type, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
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
      // Accept the invitation by setting up the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        console.error('Password setup error:', updateError)
        setError(updateError.message)
      } else {
        // Successfully set up account, redirect to app
        navigate('/')
      }
    } catch (err) {
      console.error('Error setting up account:', err)
      setError('Failed to set up your account')
    }

    setIsSubmitting(false)
  }

  if (isProcessingInvite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <img
            className="mx-auto h-20 w-auto mb-8"
            src="/IntentScout.png"
            alt="IntentScout"
          />
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Processing your invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <img
            className="mx-auto h-20 w-auto mb-8"
            src="/IntentScout.png"
            alt="IntentScout"
          />
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Invalid Invitation</h2>
            <p className="text-red-600">{error}</p>
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
            src="/IntentScout.png"
            alt="IntentScout"
          />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Complete Your Setup
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Set up your password to access IntentScout
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
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
                placeholder="Enter your password (min 6 characters)"
                disabled={isSubmitting}
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
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
                placeholder="Confirm your password"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
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
                  Setting up your account...
                </div>
              ) : (
                'Complete Setup'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}