import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminGuard } from './AdminGuard'
import { AdminLayout } from './components/AdminLayout'
import { DashboardPage } from './pages/DashboardPage'
import { UsersPage } from './pages/UsersPage'
import { SystemPage } from './pages/SystemPage'

export const AdminApp = () => {
  return (
    <AdminGuard>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="system" element={<SystemPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AdminGuard>
  )
}

