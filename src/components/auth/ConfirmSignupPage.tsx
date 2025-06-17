import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export const ConfirmSignupPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isConfirming, setIsConfirming] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Parse URL parameters
  const urlParams = new URLSearchParams(location.search)
  const type = urlParams.get('type')
  const token = urlParams.get('token')

  useEffect(() => {
    const confirmSignup = async () => {
      if (!token || type !== 'signup') {
        setError('Invalid confirmation link')
        setIsConfirming(false)
        return
      }

      try {
        const { error: confirmError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup',
        })

        if (confirmError) {
          console.error('Signup confirmation error:', confirmError)
          setError('Invalid or expired confirmation link')
        } else {
          setSuccess('Account confirmed successfully!')
          setTimeout(() => navigate('/'), 2000)
        }
      } catch (err) {
        console.error('Error confirming signup:', err)
        setError('Failed to confirm account')
      }

      setIsConfirming(false)
    }

    confirmSignup()
  }, [token, type, navigate])

  const handleResendConfirmation = async () => {
    // This would typically require the email, which we don't have here
    // You might want to redirect to a page where they can enter their email
    navigate('/login')
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
            Account Confirmation
          </h2>
          
          {isConfirming ? (
            <div className="mt-6">
              <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Confirming your account...</p>
            </div>
          ) : error ? (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-red-800 mb-2">Confirmation Failed</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  The confirmation link may have expired or already been used.
                </p>
                <button
                  onClick={handleResendConfirmation}
                  className="btn-primary"
                >
                  Go to Sign In
                </button>
              </div>
            </div>
          ) : success ? (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-green-800 mb-2">Welcome to IntentScout!</h3>
              <p className="text-green-600 mb-2">{success}</p>
              <p className="text-sm text-gray-600">
                You can now access all features. Redirecting to the application...
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}