import { useId, useRef, useState } from 'react';
import { IconCheck } from '../../components/Icons';
import useFocusTrap from '../../hooks/useFocusTrap';
import styles from './Admin.module.css';

// Opciones de estado de habitación física con el mismo tono semántico que AdminRooms
const STATUS_OPTIONS = [
  { id: 'disponible',    label: 'Disponible',    tone: 'done',     hint: 'Lista para recibir huéspedes' },
  { id: 'ocupada',       label: 'Ocupada',       tone: 'progress', hint: 'Con huésped en estadía' },
  { id: 'mantenimiento', label: 'Mantenimiento', tone: 'rejected', hint: 'Temporalmente fuera de servicio' },
];

// Modal compacto para consultar una habitación del rack y actualizar su estado
export default function RoomStatusModal({ room, onClose, onSave }) {
  const [status, setStatus] = useState(room.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const dialogRef = useRef(null);
  const firstOptionRef = useRef(null);
  const titleId = useId();
  const groupId = useId();

  useFocusTrap(dialogRef, { initialFocusRef: firstOptionRef, onEscape: saving ? undefined : onClose });

  const currentMeta = STATUS_OPTIONS.find((opt) => opt.id === room.status) ?? STATUS_OPTIONS[0];
  const unchanged = status === room.status;

  async function handleSave() {
    if (unchanged || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSave(room, status);
    } catch (err) {
      setError(err.message || 'No pudimos actualizar el estado');
      setSaving(false);
    }
  }

  return (
    <div
      className={styles['modal-overlay']}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div
        className={[styles.modal, styles['modal-narrow']].join(' ')}
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles['modal-head']}>
          <div>
            <h2 id={titleId}>Habitación {room.number}</h2>
            <p>Piso {room.floor} · {room.room_type_name}</p>
          </div>
          <button
            type="button"
            className={styles['modal-close']}
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className={styles['modal-body']}>
          <dl className={styles['guest-info']}>
            <div><dt>Número</dt><dd><strong>{room.number}</strong></dd></div>
            <div><dt>Piso</dt><dd>Piso {room.floor}</dd></div>
            <div><dt>Tipo</dt><dd>{room.room_type_name}</dd></div>
            <div>
              <dt>Estado actual</dt>
              <dd>
                <span className={[styles.status, styles[`status-${currentMeta.tone}`]].join(' ')}>
                  {currentMeta.tone === 'done' ? <IconCheck size={12} /> : <span className={styles['status-dot']} />}
                  {currentMeta.label}
                </span>
              </dd>
            </div>
          </dl>

          <div className={styles.field}>
            <span id={groupId} className={styles.label}>Cambiar estado</span>
            <div className={styles['rack-status-options']} role="group" aria-labelledby={groupId}>
              {STATUS_OPTIONS.map((opt, idx) => {
                const active = status === opt.id;
                return (
                  <button
                    key={opt.id}
                    ref={idx === 0 ? firstOptionRef : undefined}
                    type="button"
                    aria-pressed={active}
                    disabled={saving}
                    className={[
                      styles['rack-status-btn'],
                      styles[`rack-tone-${opt.tone}`],
                      active ? styles['rack-status-active'] : '',
                    ].join(' ')}
                    onClick={() => setStatus(opt.id)}
                  >
                    <span className={styles['rack-status-head']}>
                      <span className={styles['status-dot']} aria-hidden="true" />
                      <strong>{opt.label}</strong>
                      {active && <IconCheck size={13} />}
                    </span>
                    <small>{opt.hint}</small>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className={styles['form-error']} role="alert">{error}</p>}
        </div>

        <div className={styles['modal-foot']}>
          <button type="button" className={styles['btn-ghost']} onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            type="button"
            className={[styles['btn-refresh'], unchanged && !saving ? styles['rack-save-idle'] : ''].join(' ')}
            onClick={handleSave}
            disabled={saving || unchanged}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
