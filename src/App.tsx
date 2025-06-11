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

function App() {
  return (
    <Router>
      <Routes>
        {/* Public authentication routes */}
        <Route path="/auth" element={<AuthHandler />} />
        <Route path="/invite" element={<InvitePage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/magic-link" element={<MagicLinkPage />} />
        <Route path="/confirm-signup" element={<ConfirmSignupPage />} />
        <Route path="/change-email" element={<ChangeEmailPage />} />
        
        {/* Protected routes */}
        <Route path="/reauth" element={
          <ProtectedRoute>
            <ReauthPage />
          </ProtectedRoute>
        } />
        
        {/* Main application - all other routes */}
        <Route path="/*" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  )
}

export default App