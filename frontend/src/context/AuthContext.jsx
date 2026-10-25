import { useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { AUTH_EXPIRED_EVENT } from '../services/api';
import { AuthContext } from './authContextObject';
import { stayStorageKey } from '../hooks/useStay';
import { useNavigate } from 'react-router';
import styles from './AuthContext.module.css';
import reservationsStyles from '../pages/reservations/Reservations.module.css';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // La sesión se restaura leyendo me() al cargar la app
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    authService.me()
      .then(userData => { if (active) setUser(userData); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  // Andamiaje para la v2: en la v1 nadie emite este evento. Con backend, api.js lo emitirá al recibir
  // un 401 (token vencido o inválido) y aquí se cierra la sesión y se vuelve al login
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      navigate('/login?expired=1', { replace: true });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [navigate]);

  // Lleva a cada rol a su pantalla
  const goHome = (userData) => navigate(userData.role === 'admin' ? '/admin' : '/habitaciones');

  const login = async (email, password) => {
    const userData = await authService.login(email, password);
    setUser(userData);
    goHome(userData);
  };

  const register = async (userData) => {
    await authService.register(userData);
    // Después de registrar, hacemos login automáticamente
    await login(userData.email, userData.password);
  };

  // Guarda cambios del perfil y actualiza el usuario en memoria (navbar, checkout…)
  const updateProfile = async (changes) => {
    const updated = await authService.updateMe(changes);
    setUser(updated);
    return updated;
  };

  const logout = () => {
    // En un computador compartido, el siguiente usuario no debe ver la estadía del anterior
    if (user) localStorage.removeItem(stayStorageKey(user.id));
    authService.logout();
    setUser(null);
    navigate('/', { replace: true });
  };

  if (loading) {
    return (
      <div className={styles.loading} role="status" aria-label="Cargando">
        <div className={reservationsStyles.spinner} />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
