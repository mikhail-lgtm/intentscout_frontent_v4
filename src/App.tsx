import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { InvitePage } from './components/auth/InvitePage'
import { ResetPasswordPage } from './components/auth/ResetPasswordPage'
import { ReauthPage } from './components/auth/ReauthPage'
import { ChangeEmailPage } from './components/auth/ChangeEmailPage'
import { MagicLinkPage } from './components/auth/MagicLinkPage'
import { ConfirmSignupPage } from './components/auth/ConfirmSignupPage'
import { AuthHandler } from './components/auth/AuthHandler'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { Dashboard } from './components/common/Dashboard'
import ErrorBoundary from './components/common/ErrorBoundary'
import './lib/globalCleanup' // Initialize global cleanup system
import './utils/debugCleanup' // Debug utilities (dev only)

function App() {
  return (
    <ErrorBoundary onError={(error, errorInfo) => {
      console.error('Global error caught:', error, errorInfo)
      // You can send this to your error tracking service
    }}>
      <Router>
        <Routes>
          {/* Public authentication routes */}
          <Route path="/auth" element={
            <ErrorBoundary>
              <AuthHandler />
            </ErrorBoundary>
          } />
          <Route path="/invite" element={
            <ErrorBoundary>
              <InvitePage />
            </ErrorBoundary>
          } />
          <Route path="/reset-password" element={
            <ErrorBoundary>
              <ResetPasswordPage />
            </ErrorBoundary>
          } />
          <Route path="/magic-link" element={
            <ErrorBoundary>
              <MagicLinkPage />
            </ErrorBoundary>
          } />
          <Route path="/confirm-signup" element={
            <ErrorBoundary>
              <ConfirmSignupPage />
            </ErrorBoundary>
          } />
          <Route path="/change-email" element={
            <ErrorBoundary>
              <ChangeEmailPage />
            </ErrorBoundary>
          } />

          {/* Protected routes */}
          <Route path="/reauth" element={
            <ErrorBoundary>
              <ProtectedRoute>
                <ReauthPage />
              </ProtectedRoute>
            </ErrorBoundary>
          } />

          {/* Main application - all other routes */}
          <Route path="/*" element={
            <ErrorBoundary>
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            </ErrorBoundary>
          } />
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}

export default App