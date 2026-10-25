import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CatalogPage  from './pages/catalog/CatalogPage';
import MyReservationsPage from './pages/reservations/MyReservationsPage';
import ReservationDetailPage from './pages/reservations/ReservationDetailPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminGuests from './pages/admin/AdminGuests';
import ProfilePage from './pages/profile/ProfilePage';
import AdminRooms from './pages/admin/AdminRooms';
import HomePage from './pages/home/HomePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"         element={<HomePage />} />
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route path="/habitaciones"  element={<ProtectedRoute allowedRoles={['huesped']}><CatalogPage /></ProtectedRoute>} />
          <Route path="/reservas"  element={<ProtectedRoute allowedRoles={['huesped']}><MyReservationsPage /></ProtectedRoute>} />
          <Route path="/reservas/:id" element={<ProtectedRoute allowedRoles={['huesped']}><ReservationDetailPage /></ProtectedRoute>} />
          <Route path="/perfil"   element={<ProtectedRoute allowedRoles={['huesped']}><ProfilePage /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/habitaciones" element={<ProtectedRoute allowedRoles={['admin']}><AdminRooms /></ProtectedRoute>} />
          <Route path="/admin/huespedes" element={<ProtectedRoute allowedRoles={['admin']}><AdminGuests /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}