import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Se recuerda la ruta pedida para volver a ella tras iniciar sesión
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Si no tiene el rol, mandarlo a su página por defecto
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/habitaciones" replace />;
  }

  return children;
}
