import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CatalogPage  from './pages/catalog/CatalogPage';
import MyOrdersPage from './pages/orders/MyOrdersPage';
import OrderTrackingPage from './pages/orders/OrderTrackingPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminClients from './pages/admin/AdminClients';
import ProfilePage from './pages/profile/ProfilePage';
import AdminProducts from './pages/admin/AdminProducts';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"         element={<Navigate to="/login" replace />} />
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route path="/habitaciones"  element={<ProtectedRoute allowedRoles={['huesped']}><CatalogPage /></ProtectedRoute>} />
          <Route path="/reservas"  element={<ProtectedRoute allowedRoles={['huesped']}><MyOrdersPage /></ProtectedRoute>} />
          <Route path="/reservas/:id" element={<ProtectedRoute allowedRoles={['huesped']}><OrderTrackingPage /></ProtectedRoute>} />
          <Route path="/perfil"   element={<ProtectedRoute allowedRoles={['huesped']}><ProfilePage /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/habitaciones" element={<ProtectedRoute allowedRoles={['admin']}><AdminProducts /></ProtectedRoute>} />
          <Route path="/admin/huespedes" element={<ProtectedRoute allowedRoles={['admin']}><AdminClients /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}