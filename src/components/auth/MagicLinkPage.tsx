import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { cn } from '../../utils/cn'

export const MagicLinkPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mode, setMode] = useState<'request' | 'verify'>('request')

  // Parse URL parameters for magic link verification
  const urlParams = new URLSearchParams(location.search)
  const type = urlParams.get('type')
  const token = urlParams.get('token')

  useEffect(() => {
    // If we have a magic link token, verify it
    if (type === 'magiclink' && token) {
      setMode('verify')
      handleMagicLinkVerification()
    }
  }, [type, token])

  const handleMagicLinkVerification = async () => {
    try {
      setIsSubmitting(true)
      
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token!,
        type: 'magiclink',
      })

      if (verifyError) {
        setError('Invalid or expired magic link')
      } else {
        setSuccess('Successfully signed in!')
        setTimeout(() => navigate('/'), 2000)
      }
    } catch (err) {
      console.error('Magic link verification error:', err)
      setError('Failed to verify magic link')
    }
    
    setIsSubmitting(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      })

      if (magicLinkError) {
        setError(magicLinkError.message)
      } else {
        setSuccess('Magic link sent! Check your email for the sign-in link.')
      }
    } catch (err) {
      console.error('Magic link error:', err)
      setError('Failed to send magic link')
    }

    setIsSubmitting(false)
  }

  if (mode === 'verify') {
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
              Magic Link Verification
            </h2>
            {isSubmitting ? (
              <div className="mt-6">
                <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Verifying your magic link...</p>
              </div>
            ) : error ? (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-red-800 mb-2">Verification Failed</h3>
                <p className="text-red-600">{error}</p>
                <button
                  onClick={() => navigate('/magic-link')}
                  className="mt-4 text-sm text-orange-600 hover:text-orange-500"
                >
                  Request a new magic link
                </button>
              </div>
            ) : success ? (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-green-800 mb-2">Success!</h3>
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
            src="/IntentScout.png"
            alt="IntentScout"
          />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Sign in with Magic Link
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email and we'll send you a secure sign-in link
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
            <p className="mt-1 text-xs text-gray-500">
              We'll send a secure link to sign you in without a password
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
              <p className="text-xs text-gray-600 mt-1">
                Check your email and click the link to sign in. The link will expire in 1 hour.
              </p>
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
                  Sending magic link...
                </div>
              ) : (
                'Send Magic Link'
              )}
            </button>
          </div>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-orange-600 hover:text-orange-500"
            >
              Back to Password Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}