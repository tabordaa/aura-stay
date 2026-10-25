import { useEffect, useId, useRef } from 'react';
import styles from './Reservations.module.css';

// Confirmación de cancelación: foco inicial en "Mantener reserva" y cierre con Escape
export default function CancelReservationModal({ reservation, busy, error, onConfirm, onClose }) {
  const keepRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement;
    keepRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>¿Cancelar tu reserva?</h2>
        <p>
          Vas a cancelar <strong>{reservation.room.name}</strong> ({reservation.code}).
          Las fechas quedarán libres para otros huéspedes y no podrás deshacerlo.
        </p>
        {error && <p className={styles['action-error']} role="alert">{error}</p>}
        <div className={styles['modal-actions']}>
          <button type="button" className={styles['btn-secondary']} ref={keepRef} onClick={onClose} disabled={busy}>
            Mantener reserva
          </button>
          <button type="button" className={styles['btn-danger']} onClick={onConfirm} disabled={busy}>
            {busy ? 'Cancelando…' : 'Sí, cancelar reserva'}
          </button>
        </div>
      </div>
    </div>
  );
}
