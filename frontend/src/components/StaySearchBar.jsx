import { useState } from 'react';
import { todayISO, addDays } from '../utils/dates';
import { MAX_GUESTS, MAX_NIGHTS, validateStay } from '../utils/stay';
import styles from './StaySearchBar.module.css';

const ERRORS_ID = 'stay-errors';
const GUEST_OPTIONS = Array.from({ length: MAX_GUESTS }, (_, i) => i + 1);

// Buscador de estadía: llegada · salida · huéspedes. Reutilizable (catálogo y home).
// `initial` viene de la URL; si ya trae valores inválidos se muestran sus errores de entrada.
export default function StaySearchBar({ initial, onSearch, onClear }) {
  const [draft, setDraft] = useState({ checkIn: initial.checkIn, checkOut: initial.checkOut, guests: initial.guests || '1' });
  const [errors, setErrors] = useState(() => validateStay(initial));
  const today = todayISO();
  const hasValues = Boolean(initial.checkIn || initial.checkOut || initial.guests);

  const change = (key) => (e) => {
    const value = e.target.value;
    setDraft((d) => {
      const next = { ...d, [key]: value };
      // Si la salida quedó antes o igual a la nueva llegada, se mueve al día siguiente
      if (key === 'checkIn' && value && next.checkOut && next.checkOut <= value) next.checkOut = addDays(value, 1);
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const found = validateStay(draft);
    if (!draft.checkIn && !draft.checkOut) {
      found.checkIn = 'Elige la fecha de llegada';
      found.checkOut = 'Elige la fecha de salida';
    }
    setErrors(found);
    if (Object.keys(found).length === 0) onSearch(draft);
  };

  const clear = () => {
    setDraft({ checkIn: '', checkOut: '', guests: '1' });
    setErrors({});
    onClear();
  };

  const errorList = Object.entries(errors).filter(([, msg]) => msg);

  return (
    <form className={styles.bar} onSubmit={submit} noValidate aria-label="Buscar estadía">
      <div className={styles.field}>
        <label htmlFor="stay-in" className={styles.label}>Llegada</label>
        <input id="stay-in" type="date" className={styles.input} min={today} value={draft.checkIn}
          onChange={change('checkIn')} aria-invalid={Boolean(errors.checkIn)} aria-describedby={errors.checkIn ? ERRORS_ID : undefined} />
      </div>
      <div className={styles.field}>
        <label htmlFor="stay-out" className={styles.label}>Salida</label>
        <input id="stay-out" type="date" className={styles.input}
          min={draft.checkIn ? addDays(draft.checkIn, 1) : addDays(today, 1)}
          max={draft.checkIn ? addDays(draft.checkIn, MAX_NIGHTS) : undefined}
          value={draft.checkOut} onChange={change('checkOut')} aria-invalid={Boolean(errors.checkOut)} aria-describedby={errors.checkOut ? ERRORS_ID : undefined} />
      </div>
      <div className={styles.field}>
        <label htmlFor="stay-guests" className={styles.label}>Huéspedes</label>
        <select id="stay-guests" className={styles.input} value={draft.guests}
          onChange={change('guests')} aria-invalid={Boolean(errors.guests)} aria-describedby={errors.guests ? ERRORS_ID : undefined}>
          {GUEST_OPTIONS.map((n) => <option key={n} value={n}>{n} {n === 1 ? 'huésped' : 'huéspedes'}</option>)}
        </select>
      </div>
      <div className={styles.actions}>
        <button type="submit" className={styles['btn-primary']}>Buscar</button>
        {hasValues && <button type="button" className={styles['btn-ghost']} onClick={clear}>Quitar fechas</button>}
      </div>
      {errorList.length > 0 && (
        <ul id={ERRORS_ID} className={styles.errors} role="alert">
          {errorList.map(([key, msg]) => <li key={key}>{msg}</li>)}
        </ul>
      )}
    </form>
  );
}
