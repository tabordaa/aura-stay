import { useEffect, useId, useRef, useState } from 'react';
import StatusBadge from '../../components/StatusBadge';
import { adminService } from '../../services/admin.service';
import { formatStayDate } from '../../utils/dates';
import { formatPrice } from '../../utils/format';
import styles from './Admin.module.css';

// Detalle del huésped: las cifras vienen de la misma función del servicio que la fila de la tabla
export default function GuestDetailModal({ guest, onClose }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const closeRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    adminService.getGuest(guest.id)
      .then(d => { if (alive) setDetail(d); })
      .catch(e => { if (alive) setError(e.message || 'No pudimos cargar el historial'); });
    return () => { alive = false; };
  }, [guest.id]);

  const g = detail ?? guest;
  const history = detail?.reservations;

  return (
    <div className={styles['modal-overlay']} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={[styles.modal, styles['modal-wide']].join(' ')} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={styles['modal-head']}>
          <div>
            <h2 id={titleId}>{g.name}</h2>
            <p>{g.email}</p>
          </div>
          <button type="button" ref={closeRef} className={styles['modal-close']} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className={styles['modal-body']}>
          <dl className={styles['guest-info']}>
            <div><dt>Correo</dt><dd>{g.email}</dd></div>
            <div><dt>Teléfono</dt><dd>{g.phone || '—'}</dd></div>
            <div><dt>Documento</dt><dd>{g.document || '—'}</dd></div>
            <div><dt>Ciudad</dt><dd>{g.city || '—'}</dd></div>
          </dl>

          <div className={styles['guest-stats']}>
            <div className={styles['guest-stat']}><span>Estadías</span><strong>{g.stays}</strong></div>
            <div className={styles['guest-stat']}><span>Noches</span><strong>{g.nights}</strong></div>
            <div className={styles['guest-stat']}><span>Gasto total</span><strong>{formatPrice(g.total_spent)}</strong></div>
            <div className={styles['guest-stat']}>
              <span>{g.last_stay ? 'Última estadía' : 'Próxima'}</span>
              <strong>{g.last_stay ? formatStayDate(g.last_stay) : g.next_stay ? formatStayDate(g.next_stay) : '—'}</strong>
            </div>
          </div>
          {g.cancelled_count > 0 && (
            <p className={styles.muted}>
              {g.cancelled_count} reserva{g.cancelled_count !== 1 ? 's' : ''} cancelada{g.cancelled_count !== 1 ? 's' : ''} o rechazada{g.cancelled_count !== 1 ? 's' : ''} (no suman a las cifras).
            </p>
          )}

          <h3 className={styles['guest-section-title']}>Historial de reservas</h3>
          {error && <p className={styles['form-error']} role="alert">{error}</p>}
          <div className={styles['table-wrap']}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Habitación</th>
                  <th>Fechas</th>
                  <th>Noches</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {!history ? (
                  <tr><td colSpan={6} className={styles.empty}>{error ? 'Sin datos' : 'Cargando historial…'}</td></tr>
                ) : history.length === 0 ? (
                  <tr><td colSpan={6} className={styles.empty}>Este huésped aún no tiene reservas.</td></tr>
                ) : history.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.code}</strong></td>
                    <td>{r.room_name}</td>
                    <td>{formatStayDate(r.check_in)} → {formatStayDate(r.check_out)}</td>
                    <td>{r.nights}</td>
                    <td className={styles.total}>{formatPrice(r.total)}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles['modal-foot']}>
          <button type="button" className={styles['btn-ghost']} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
