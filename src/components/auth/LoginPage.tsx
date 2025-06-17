import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../utils/cn'

export const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signIn, error, loading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      return
    }

    setIsSubmitting(true)
    await signIn(email, password)
    setIsSubmitting(false)
  }

  const isLoading = loading || isSubmitting

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
            Sign in to IntentScout
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            AI-Powered Sales Intelligence Platform
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
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
                disabled={isLoading}
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
              disabled={isLoading || !email.trim() || !password.trim()}
              className={cn(
                "w-full btn-primary py-3 text-base",
                (isLoading || !email.trim() || !password.trim()) && 
                "opacity-50 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center space-y-2">
            <a
              href="/reset-password"
              className="text-sm text-orange-600 hover:text-orange-500"
            >
              Forgot your password?
            </a>
            <br />
            <a
              href="/magic-link"
              className="text-sm text-gray-600 hover:text-gray-500"
            >
              Sign in with magic link instead
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}