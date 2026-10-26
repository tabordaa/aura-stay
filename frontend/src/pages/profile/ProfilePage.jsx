import { useId, useState } from 'react';
import { IconMail, IconMapPin, IconPhone, IconUser, IconShield } from '../../components/Icons';
import { useAuth } from '../../hooks/useAuth';
import { formatMonthYear } from '../../utils/dates';
import { initials } from '../../utils/format';
import { normalizePhone, validateProfile } from '../../utils/validation';
import ReservationsTopbar from '../reservations/ReservationsTopbar';
import styles from './Profile.module.css';

function toForm(user) {
  return {
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    document: user?.document ?? '',
    city: user?.city ?? '',
  };
}

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const uid = useId();
  const errId = (name) => `${uid}-${name}-error`;
  const [form, setForm] = useState(() => toForm(user));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text }

  const errors = validateProfile(form);
  const saved = toForm(user);
  const dirty = Object.keys(form).some(key => form[key].trim() !== saved[key]);
  const fieldError = (name) => (submitted ? errors[name] : '');
  const describedBy = (name) => (fieldError(name) ? errId(name) : undefined);
  const inputClass = (name) => [styles.input, fieldError(name) ? styles['input-error'] : ''].join(' ');

  const setField = (field, clean = (v) => v) => (e) => {
    setForm(f => ({ ...f, [field]: clean(e.target.value) }));
    setFeedback(null);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      const updated = await updateProfile(form);
      setForm(toForm(updated));
      setSubmitted(false);
      setFeedback({ type: 'success', text: 'Perfil actualizado. Usaremos estos datos en tu próxima reserva.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'No pudimos guardar tus datos. Intenta de nuevo.' });
    } finally {
      setSaving(false);
    }
  }

  const memberSince = user?.created_at
    ? formatMonthYear(user.created_at)
    : null;

  return (
    <div className={styles.page}>
      <ReservationsTopbar />
      <main className={styles.container}>
        <div className={styles.head}>
          <h1>Mi perfil</h1>
          <p>Tus datos se usan para precargar tus reservas</p>
        </div>

        <section className={styles.identity}>
          <span className={styles.avatar}>{initials(user?.name)}</span>
          <div className={styles['identity-info']}>
            <strong>{user?.name}</strong>
            <span><IconMail size={14} /> {user?.email}</span>
            {memberSince && <small>Huésped desde {memberSince}</small>}
          </div>
          <button type="button" className={styles['btn-logout']} onClick={logout}>Cerrar sesión</button>
        </section>

        <form className={styles.panel} onSubmit={handleSubmit} noValidate>
          <h3>Datos del huésped</h3>

          <label className={styles.field}>
            <span className={styles.label}>Nombre completo</span>
            <span className={styles['input-wrap']}>
              <span className={styles['input-icon']}><IconUser size={16} /></span>
              <input
                className={inputClass('name')}
                value={form.name}
                onChange={setField('name')}
                aria-invalid={!!fieldError('name')}
                aria-describedby={describedBy('name')}
                autoComplete="name"
                maxLength={100}
                disabled={saving}
              />
            </span>
            {fieldError('name') && <span id={errId('name')} className={styles['field-error']}>{fieldError('name')}</span>}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Correo electrónico</span>
            <span className={styles['input-wrap']}>
              <span className={styles['input-icon']}><IconMail size={16} /></span>
              <input className={styles.input} value={user?.email ?? ''} readOnly aria-describedby="profile-email-hint" />
            </span>
          </label>

          <div className={styles['field-row']}>
            <label className={styles.field}>
              <span className={styles.label}>Teléfono <em>(opcional)</em></span>
              <span className={styles['input-wrap']}>
                <span className={styles['input-icon']}><IconPhone size={16} /></span>
                <input
                  className={inputClass('phone')}
                  type="tel"
                  value={form.phone}
                  onChange={setField('phone', normalizePhone)}
                  aria-invalid={!!fieldError('phone')}
                  aria-describedby={describedBy('phone')}
                  placeholder="+57 300 123 4567"
                  autoComplete="tel"
                  disabled={saving}
                />
              </span>
              {fieldError('phone') && <span id={errId('phone')} className={styles['field-error']}>{fieldError('phone')}</span>}
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Documento <em>(opcional)</em></span>
              <span className={styles['input-wrap']}>
                <span className={styles['input-icon']}><IconShield size={16} /></span>
                <input
                  className={inputClass('document')}
                  value={form.document}
                  onChange={setField('document', v => v.replace(/[^A-Za-z0-9]/g, ''))}
                  aria-invalid={!!fieldError('document')}
                  aria-describedby={describedBy('document')}
                  placeholder="Cédula o pasaporte"
                  maxLength={15}
                  disabled={saving}
                />
              </span>
              {fieldError('document') && <span id={errId('document')} className={styles['field-error']}>{fieldError('document')}</span>}
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Ciudad <em>(opcional)</em></span>
            <span className={styles['input-wrap']}>
              <span className={styles['input-icon']}><IconMapPin size={16} /></span>
              <input
                className={inputClass('city')}
                value={form.city}
                onChange={setField('city')}
                aria-invalid={!!fieldError('city')}
                aria-describedby={describedBy('city')}
                placeholder="Ej. Bogotá"
                autoComplete="address-level2"
                maxLength={60}
                disabled={saving}
              />
            </span>
            {fieldError('city') && <span id={errId('city')} className={styles['field-error']}>{fieldError('city')}</span>}
          </label>

          <p id="profile-email-hint" className={styles.hint}>El correo no se puede cambiar porque es tu usuario para iniciar sesión.</p>

          {feedback && (
            <p className={styles[`feedback-${feedback.type}`]} role={feedback.type === 'error' ? 'alert' : 'status'}>
              {feedback.text}
            </p>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles['btn-secondary']} onClick={() => { setForm(saved); setSubmitted(false); setFeedback(null); }} disabled={!dirty || saving}>
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
