import { useState } from 'react';
import { IconMail, IconMapPin, IconPhone, IconUser } from '../../components/Icons';
import { useAuth } from '../../hooks/useAuth';
import { initials, parseServerDate } from '../../utils/format';
import OrdersTopbar from '../orders/OrdersTopbar';
import styles from './Profile.module.css';

function onlyDigits(value) {
  return value.replace(/\D/g, '');
}

function formatPhone(digits) {
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean).join(' ');
}

function toForm(user) {
  return { name: user?.name ?? '', address: user?.address ?? '', phone: onlyDigits(user?.phone ?? '') };
}

function validate(form) {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = 'Escribe tu nombre';
  if (form.phone && !/^3\d{9}$/.test(form.phone)) errors.phone = 'Celular de 10 dígitos que empiece por 3';
  return errors;
}

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const [form, setForm] = useState(() => toForm(user));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text }

  const errors = validate(form);
  const saved = toForm(user);
  const dirty = Object.keys(form).some(key => form[key].trim() !== saved[key]);
  const fieldError = (name) => (submitted ? errors[name] : '');

  const setField = (field) => (e) => {
    const value = field === 'phone' ? onlyDigits(e.target.value).slice(0, 10) : e.target.value;
    setForm(f => ({ ...f, [field]: value }));
    setFeedback(null);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      const updated = await updateProfile({ name: form.name, address: form.address, phone: form.phone });
      setForm(toForm(updated));
      setSubmitted(false);
      setFeedback({ type: 'success', text: 'Listo, guardamos tus datos. Los usaremos en tu próximo pedido.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof TypeError ? 'Sin conexión con el servidor. Intenta de nuevo.' : err.message });
    } finally {
      setSaving(false);
    }
  }

  const memberSince = user?.created_at
    ? parseServerDate(user.created_at).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className={styles.page}>
      <OrdersTopbar />
      <main className={styles.container}>
        <div className={styles.head}>
          <h1>Mi perfil</h1>
          <p>Tus datos de contacto y la dirección donde recibes tus pedidos</p>
        </div>

        <section className={styles.identity}>
          <span className={styles.avatar}>{initials(user?.name)}</span>
          <div className={styles['identity-info']}>
            <strong>{user?.name}</strong>
            <span><IconMail size={14} /> {user?.email}</span>
            {memberSince && <small>Cliente desde {memberSince}</small>}
          </div>
          <button type="button" className={styles['btn-logout']} onClick={logout}>Cerrar sesión</button>
        </section>

        <form className={styles.panel} onSubmit={handleSubmit} noValidate>
          <h3>Datos de entrega</h3>

          <label className={styles.field}>
            <span className={styles.label}>Nombre completo</span>
            <span className={styles['input-wrap']}>
              <span className={styles['input-icon']}><IconUser size={16} /></span>
              <input
                className={[styles.input, fieldError('name') ? styles['input-error'] : ''].join(' ')}
                value={form.name}
                onChange={setField('name')}
                autoComplete="name"
                maxLength={100}
                disabled={saving}
              />
            </span>
            {fieldError('name') && <span className={styles['field-error']}>{fieldError('name')}</span>}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Dirección de entrega <em>(opcional)</em></span>
            <span className={styles['input-wrap']}>
              <span className={styles['input-icon']}><IconMapPin size={16} /></span>
              <input
                className={styles.input}
                value={form.address}
                onChange={setField('address')}
                placeholder="Ej. Calle 80 # 15-20, Apto 301"
                autoComplete="street-address"
                maxLength={200}
                disabled={saving}
              />
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Celular <em>(opcional)</em></span>
            <span className={styles['input-wrap']}>
              <span className={styles['input-icon']}><IconPhone size={16} /></span>
              <input
                className={[styles.input, fieldError('phone') ? styles['input-error'] : ''].join(' ')}
                value={formatPhone(form.phone)}
                onChange={setField('phone')}
                placeholder="300 123 4567"
                inputMode="numeric"
                autoComplete="tel-national"
                disabled={saving}
              />
            </span>
            {fieldError('phone') && <span className={styles['field-error']}>{fieldError('phone')}</span>}
          </label>

          <p className={styles.hint}>El correo no se puede cambiar porque es tu usuario para iniciar sesión.</p>

          {feedback && (
            <p className={styles[`feedback-${feedback.type}`]} role={feedback.type === 'error' ? 'alert' : 'status'}>
              {feedback.text}
            </p>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles['btn-secondary']} onClick={() => { setForm(saved); setSubmitted(false); }} disabled={!dirty || saving}>
              Descartar cambios
            </button>
            <button type="submit" className={styles['btn-primary']} disabled={!dirty || saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
