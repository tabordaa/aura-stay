import { useState } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { IconBed, IconMail, IconLock, IconEye, IconEyeOff, IconArrowRight, IconShield } from '../../components/Icons';
import styles from './Auth.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('expired') === '1';

  // Redirigir si ya está logueado
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/habitaciones" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await login(email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles['auth-page']}>
      <div className={styles['auth-topbar']}>
        <div className={styles['brand']}>
          <IconBed size={22} />
          {import.meta.env.VITE_APP_NAME || 'Aura Stay'}
        </div>
      </div>

      <div className={styles['auth-body']}>
        <div className={styles['auth-card']}>
          <div className={styles['card-brand']}>
            <div className={[styles.brand, styles['brand-lg']].join(' ')}>
              <IconBed size={26} />
              {import.meta.env.VITE_APP_NAME || 'Aura Stay'}
            </div>
            <p className={styles['subtitle']}>Bienvenido de nuevo</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className={styles['form-error']} role="alert">{error}</div>}
            {!error && sessionExpired && (
              <div className={styles['form-notice']} role="status">
                Tu sesión expiró. Inicia sesión de nuevo para continuar.
              </div>
            )}
            <div className={styles['form-group']}>
              <label htmlFor="login-email">Correo electrónico</label>
              <div className={styles['input-wrapper']}>
                <span className={styles['input-icon']}><IconMail size={16} /></span>
                <input id="login-email" type="email" placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
            </div>

            <div className={styles['form-group']}>
              <label htmlFor="login-password">Contraseña</label>
              <div className={styles['input-wrapper']}>
                <span className={styles['input-icon']}><IconLock size={16} /></span>
                <input id="login-password" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                <button type="button" className={styles['input-toggle']} onClick={() => setShowPass(v => !v)} aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPass ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className={styles['btn-primary']}>
              Iniciar Sesión <IconArrowRight size={16} />
            </button>
          </form>


          <div className={styles['auth-bottom-link']}>
            ¿No tienes cuenta?{' '}
            <a href="#" onClick={e => { e.preventDefault(); navigate('/register'); }}>Regístrate aquí</a>
          </div>
        </div>
      </div>

      <div className={styles['auth-footer-text']}>
        <IconShield size={14} />
        Acceso seguro · Tu estadía, reservada con confianza
      </div>
    </div>
  );
}
