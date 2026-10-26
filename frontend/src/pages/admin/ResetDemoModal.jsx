import { useId, useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import styles from './Admin.module.css';

// Confirmación para restaurar los datos de la demo: foco inicial en "Cancelar" (acción segura)
export default function ResetDemoModal({ busy, error, onConfirm, onClose }) {
  const cancelRef = useRef(null);
  const dialogRef = useRef(null);
  const titleId = useId();
  useFocusTrap(dialogRef, { initialFocusRef: cancelRef, onEscape: busy ? undefined : onClose });

  return (
    <div className={styles['modal-overlay']} onClick={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className={[styles.modal, styles['modal-narrow']].join(' ')} ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={styles['modal-head']}>
          <div>
            <h2 id={titleId}>Restaurar datos demo</h2>
            <p>Se borrarán las reservas y cambios hechos en la demo.</p>
          </div>
        </div>
        <div className={styles['modal-body']}>
          <p className={styles.muted}>Volverás a los datos de ejemplo iniciales. Tu sesión de administrador se mantiene.</p>
          {error && <p className={styles['form-error']} role="alert">{error}</p>}
        </div>
        <div className={styles['modal-foot']}>
          <button type="button" className={styles['btn-ghost']} ref={cancelRef} onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="button" className={styles['btn-danger']} onClick={onConfirm} disabled={busy}>
            {busy ? 'Restaurando…' : 'Restaurar datos'}
          </button>
        </div>
      </div>
    </div>
  );
}
