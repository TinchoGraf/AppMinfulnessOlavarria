import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'

import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import ContentPage from './pages/ContentPage'
import ContentDetailPage from './pages/ContentDetailPage'
import ProgramsPage from './pages/ProgramsPage'
import ProgramDetailPage from './pages/ProgramDetailPage'
import BreathingPage from './pages/BreathingPage'
import ProfilePage from './pages/ProfilePage'
import PlansPage from './pages/PlansPage'
import { PaymentSuccess, PaymentFailure, PaymentPending } from './pages/PaymentResultPages'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminContent from './pages/admin/AdminContent'
import AdminPrograms from './pages/admin/AdminPrograms'
import AdminUsers from './pages/admin/AdminUsers'

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  if (token) return <Navigate to="/" replace />
  return children
}

function AdminRoute({ children }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (token && !user) return null
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { token, fetchMe } = useAuthStore()

  useEffect(() => {
    if (token) fetchMe()
  }, [token])

  return (
    <BrowserRouter>
      <Routes>

        {/* Pública */}
        <Route path="/login" element={
          <PublicRoute><LoginPage /></PublicRoute>
        } />

        {/* Resultados de pago — sin layout (página completa) */}
        <Route path="/suscripcion/exitosa" element={
          <PrivateRoute><PaymentSuccess /></PrivateRoute>
        } />
        <Route path="/suscripcion/fallida" element={
          <PrivateRoute><PaymentFailure /></PrivateRoute>
        } />
        <Route path="/suscripcion/pendiente" element={
          <PrivateRoute><PaymentPending /></PrivateRoute>
        } />

        {/* Planes — sin nav inferior */}
        <Route path="/planes" element={
          <PrivateRoute><PlansPage /></PrivateRoute>
        } />

        {/* Panel Admin */}
        <Route path="/admin" element={
          <AdminRoute><AdminLayout /></AdminRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="contenido" element={<AdminContent />} />
          <Route path="programas" element={<AdminPrograms />} />
          <Route path="usuarios" element={<AdminUsers />} />
        </Route>

        {/* App principal */}
        <Route path="/" element={
          <PrivateRoute><Layout /></PrivateRoute>
        }>
          <Route index element={<HomePage />} />
          <Route path="contenido" element={<ContentPage />} />
          <Route path="contenido/:id" element={<ContentDetailPage />} />
          <Route path="programas" element={<ProgramsPage />} />
          <Route path="programas/:id" element={<ProgramDetailPage />} />
          <Route path="respiracion" element={<BreathingPage />} />
          <Route path="respiracion/:id" element={<BreathingPage />} />
          <Route path="perfil" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
