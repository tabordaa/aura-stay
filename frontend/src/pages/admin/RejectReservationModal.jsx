import { useId, useRef, useState } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import { REASON_MAX, REASON_MIN } from '../../utils/reservations';
import styles from './Admin.module.css';

// Motivo del rechazo (lo verá el huésped): foco inicial en el campo y cierre con Escape
export default function RejectReservationModal({ reservation, busy, error, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const fieldRef = useRef(null);
  const titleId = useId();
  const inputId = useId();
  const errorId = useId();

  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, { initialFocusRef: fieldRef, onEscape: busy ? undefined : onClose });

  const length = reason.trim().length;
  const invalid = length < REASON_MIN || length > REASON_MAX;
  const fieldError = touched && invalid ? `El motivo debe tener entre ${REASON_MIN} y ${REASON_MAX} caracteres` : '';

  function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (!invalid) onConfirm(reason.trim());
  }

  return (
    <div className={styles['modal-overlay']} onClick={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <form className={styles.modal} ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={submit} noValidate>
        <div className={styles['modal-head']}>
          <div>
            <h2 id={titleId}>Rechazar reserva</h2>
            <p>{reservation.code} · {reservation.guest_display_name} · {reservation.room_name}</p>
          </div>
          <button type="button" className={styles['modal-close']} onClick={onClose} disabled={busy} aria-label="Cerrar">✕</button>
        </div>
        <div className={styles['modal-body']}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={inputId}>Motivo del rechazo</label>
            <textarea
              id={inputId}
              ref={fieldRef}
              className={[styles.input, styles.textarea].join(' ')}
              rows={4}
              maxLength={REASON_MAX}
              placeholder="Cuéntale al huésped por qué no podemos confirmar su reserva"
              value={reason}
              onChange={e => setReason(e.target.value)}
              onBlur={() => setTouched(true)}
              disabled={busy}
              aria-invalid={fieldError ? 'true' : 'false'}
              aria-describedby={fieldError ? errorId : undefined}
            />
            <span className={styles['char-count']}>{length}/{REASON_MAX}</span>
            {fieldError && <span id={errorId} className={styles['field-error']} role="alert">{fieldError}</span>}
          </div>
          {error && <p className={styles['form-error']} role="alert">{error}</p>}
        </div>
        <div className={styles['modal-foot']}>
          <button type="button" className={styles['btn-ghost']} onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" className={styles['btn-danger']} disabled={busy}>
            {busy ? 'Rechazando…' : 'Rechazar reserva'}
          </button>
        </div>
      </form>
    </div>
  );
}
