import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { IconBed, IconMail, IconLock, IconEye, IconEyeOff, IconUser, IconPhone, IconArrowRight, IconShield, IconMapPin } from '../../components/Icons';
import { nameError } from '../../utils/validation';
import styles from './Auth.module.css';

function getStrength(p) {
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}
const strengthLabels = ['', 'Muy débil', 'Débil', 'Regular', 'Buena', 'Segura'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', password: '', confirm: '' });
  const [error, setError] = useState('');

  const handleChange = f => e => setForm(prev => ({ ...prev, [f]: e.target.value }));
  const strength = getStrength(form.password);

  // Redirigir si ya está logueado
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/habitaciones" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nameMsg = nameError(form.name);
    if (nameMsg) { setError(nameMsg); return; }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return; }
    if (!accepted) { setError('Debes aceptar los Términos y Condiciones'); return; }

    try {
      setError('');
      // Enviar solo los campos que espera el backend
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        city: form.city,
        password: form.password,
      });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles['auth-page']}>
      <div className={styles['auth-topbar']}>
        <div className={styles['brand']}><IconBed size={22} /> {import.meta.env.VITE_APP_NAME || 'Aura Stay'}</div>
      </div>

      <div className={styles['auth-body']}>
        <div className={[styles['auth-card'], styles['auth-card-register']].join(' ')}>
          <div className={styles['card-brand']}>
            <div className={[styles.brand, styles['brand-lg']].join(' ')}><IconBed size={26} /> {import.meta.env.VITE_APP_NAME || 'Aura Stay'}</div>
            <h2>Crea tu cuenta</h2>
            <p className={styles['subtitle']}>Reserva tu próxima estadía, rápido y fácil</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className={styles['form-error']} role="alert">{error}</div>}
            <div className={styles['form-group']}>
              <label htmlFor="reg-name">Nombre completo</label>
              <div className={styles['input-wrapper']}>
                <span className={styles['input-icon']}><IconUser size={16} /></span>
                <input id="reg-name" type="text" placeholder="Tu nombre y apellido" value={form.name} onChange={handleChange('name')} required />
              </div>
            </div>
            <div className={styles['form-group']}>
              <label htmlFor="reg-email">Correo electrónico</label>
              <div className={styles['input-wrapper']}>
                <span className={styles['input-icon']}><IconMail size={16} /></span>
                <input id="reg-email" type="email" placeholder="tu@correo.com" value={form.email} onChange={handleChange('email')} required />
              </div>
            </div>
            <div className={styles['form-group']}>
              <label htmlFor="reg-phone">Teléfono</label>
              <div className={styles['input-wrapper']}>
                <span className={styles['input-icon']}><IconPhone size={16} /></span>
                <input id="reg-phone" type="tel" placeholder="+57 300 000 0000" value={form.phone} onChange={handleChange('phone')} />
              </div>
            </div>
            <div className={styles['form-group']}>
              <label htmlFor="reg-city">Ciudad</label>
              <div className={styles['input-wrapper']}>
                <span className={styles['input-icon']}><IconMapPin size={16} /></span>
                <input id="reg-city" type="text" placeholder="Medellín" value={form.city} onChange={handleChange('city')} />
              </div>
            </div>
            <div className={styles['form-group']}>
              <label htmlFor="reg-password">Contraseña</label>
              <div className={styles['input-wrapper']}>
                <span className={styles['input-icon']}><IconLock size={16} /></span>
                <input id="reg-password" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={handleChange('password')} required minLength={8} maxLength={72} />
                <button type="button" className={styles['input-toggle']} onClick={() => setShowPass(v => !v)} aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPass ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
              {form.password.length > 0 && (
                <div className={styles['strength-bar-wrapper']}>
                  <span>Seguridad</span>
                  <div className={styles['strength-bars']}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={[styles['strength-bar'], i <= strength ? (strength >= 4 ? styles.active : styles.half) : ''].join(' ')} />
                    ))}
                  </div>
                  <span className={styles['strength-label']}>{strengthLabels[strength]}</span>
                </div>
              )}
            </div>
            <div className={styles['form-group']}>
              <label htmlFor="reg-confirm">Confirmar contraseña</label>
              <div className={styles['input-wrapper']}>
                <span className={styles['input-icon']}><IconLock size={16} /></span>
                <input id="reg-confirm" type={showConfirm ? 'text' : 'password'} placeholder="••••••••" value={form.confirm} onChange={handleChange('confirm')} required />
                <button type="button" className={styles['input-toggle']} onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showConfirm ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>
            <div className={styles['checkbox-group']}>
              <input id="reg-terms" type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
              <label htmlFor="reg-terms">Acepto los <a href="#terms">Términos y Condiciones</a> y la <a href="#privacy">Política de Privacidad</a></label>
            </div>
            <button type="submit" className={styles['btn-primary']}>Crear Cuenta <IconArrowRight size={16} /></button>
          </form>


          <div className={styles['auth-bottom-link']}>
            ¿Ya tienes cuenta?{' '}
            <a href="#" onClick={e => { e.preventDefault(); navigate('/login'); }}>Inicia sesión</a>
          </div>
        </div>
      </div>

      <div className={styles['auth-footer-text']}><IconShield size={14} /> Acceso seguro · Tu estadía, reservada con confianza</div>
    </div>
  );
}
