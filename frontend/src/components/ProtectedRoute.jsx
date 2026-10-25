import { Navigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Si no tiene el rol, mandarlo a su página por defecto
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/habitaciones" replace />;
  }

  return children;
}
