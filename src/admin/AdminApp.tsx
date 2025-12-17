import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminGuard } from './AdminGuard'
import { AdminLayout } from './components/AdminLayout'
import { DashboardPage } from './pages/DashboardPage'
import { UsersPage } from './pages/UsersPage'
import { SystemPage } from './pages/SystemPage'
import { UserDetailPage } from './pages/UserDetailPage'
import { LogsPage } from './pages/LogsPage'
import { PipelinePage } from './pages/PipelinePage'
import { CostsPage } from './pages/CostsPage'

export const AdminApp = () => {
  return (
    <AdminGuard>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:userId" element={<UserDetailPage />} />
          <Route path="system" element={<SystemPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="costs" element={<CostsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AdminGuard>
  )
}
