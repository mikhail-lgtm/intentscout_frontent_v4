import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminGuard } from './AdminGuard'
import { ToastProvider } from './ui'
import { AdminLayout } from './components/AdminLayout'
import { DashboardPage } from './pages/DashboardPage'
import { MonitoringPage } from './pages/MonitoringPage'
import { ActivityPage } from './pages/ActivityPage'
import { PipelinePage } from './pages/PipelinePage'
import { CostsPage } from './pages/CostsPage'
import { ProductsPage } from './pages/products/ProductsPage'
import { ProductEditPage } from './pages/products/ProductEditPage'
import { CompaniesPage } from './pages/companies/CompaniesPage'
import { PeoplePage } from './pages/people/PeoplePage'

export const AdminApp = () => {
  return (
    <AdminGuard>
      <ToastProvider>
        <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductEditPage />} />
          <Route path="products/:productId" element={<ProductEditPage />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="people" element={<PeoplePage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="costs" element={<CostsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
        </Routes>
      </ToastProvider>
    </AdminGuard>
  )
}
