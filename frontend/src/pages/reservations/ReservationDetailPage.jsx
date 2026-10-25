import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { IconCheck, IconCalendar, IconPhone } from '../../components/Icons';
import StatusBadge from '../../components/StatusBadge';
import { reservationsService } from '../../services/reservations.service';
import { formatPrice } from '../../utils/format';
import { formatLongDate, formatStayDate } from '../../utils/dates';
import { categoryLabel } from '../../utils/categories';
import { CANCEL_TOO_LATE_MESSAGE, PAYMENT_LABELS, TIMELINE, canCancel, statusMeta, timelineIndex } from '../../utils/reservations';
import CancelReservationModal from './CancelReservationModal';
import ReservationsTopbar from './ReservationsTopbar';
import styles from './Reservations.module.css';

export default function ReservationDetailPage() {
  const { id } = useParams();
  const [state, setState] = useState({ id: null, reservation: null, notFound: false, error: '' });
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState('');
  const [toast, setToast] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    reservationsService.get(id)
      .then(reservation => { if (active) setState({ id, reservation, notFound: false, error: '' }); })
      .catch(err => {
        if (!active) return;
        const notFound = err.message === 'Reserva no encontrada';
        setState({ id, reservation: null, notFound, error: notFound ? '' : 'No pudimos cargar tu reserva. Intenta de nuevo en un momento.' });
      });
    return () => { active = false; };
  }, [id, retryKey]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const closeModal = useCallback(() => { setConfirmCancel(false); setActionError(''); }, []);

  async function cancelReservation() {
    setCancelling(true);
    setActionError('');
    try {
      const updated = await reservationsService.cancel(id);
      setState(s => ({ ...s, reservation: updated }));
      setConfirmCancel(false);
      setToast('Tu reserva fue cancelada');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setCancelling(false);
    }
  }

  const { reservation, notFound, error } = state;
  let content;
  if (state.id !== id) {
    content = <div className={styles['state-card']} role="status"><span className={styles.spinner} /> Buscando tu reserva…</div>;
  } else if (notFound) {
    content = (
      <div className={styles['state-card']}>
        <span className={styles['state-icon']}>🔎</span>
        <h2>Reserva no encontrada</h2>
        <p>Revisa el enlace o mira la lista de tus reservas.</p>
        <Link to="/reservas" className={styles['btn-primary']}>Ver mis reservas</Link>
      </div>
    );
  } else if (!reservation) {
    content = <div className={styles['state-card']} role="alert"><span className={styles['state-icon']}>📡</span><p>{error}</p><button type="button" className={styles['btn-secondary']} onClick={() => { setState({ id: null, reservation: null, notFound: false, error: '' }); setRetryKey(k => k + 1); }}>Reintentar</button></div>;
  } else {
    const r = reservation;
    const meta = statusMeta(r.status);
    const closed = r.status === 'cancelada' || r.status === 'rechazada';
    const finished = r.status === 'finalizada';
    const current = timelineIndex(r.status);
    const step = closed ? meta : TIMELINE[current];
    const cancellable = canCancel(r);

    content = (
      <>
        <section className={[styles.hero, finished ? styles.delivered : '', closed ? styles.closed : ''].join(' ')}>
          <div className={styles['hero-main']}>
            <p className={styles['hero-meta']}>Reserva <strong>{r.code}</strong> • {r.room.name}</p>
            <div className={styles['hero-status']}>
              <span className={styles['hero-icon']}>{step.icon}</span>
              <div>
                <h1>{meta.label}</h1>
                <p>{closed ? (r.status === 'cancelada' ? 'Cancelaste esta reserva' : 'El hotel no pudo atender tu reserva') : step.desc}</p>
              </div>
            </div>
            <StatusBadge status={r.status} />
          </div>
          <div className={styles.eta}>
            <small>Llegada</small>
            <strong>{formatStayDate(r.check_in)}</strong>
            <span>{r.nights} noche{r.nights !== 1 ? 's' : ''} • salida {formatStayDate(r.check_out)}</span>
          </div>
        </section>

        {r.status === 'rechazada' && (
          <p className={styles.notice} role="status">
            <strong>Motivo del hotel:</strong> {r.rejection_reason || 'El hotel no indicó un motivo.'}
          </p>
        )}
        {r.status === 'cancelada' && (
          <p className={styles.notice} role="status">
            Cancelaste esta reserva{r.cancelled_at ? ` el ${formatLongDate(r.cancelled_at)}` : ''}.
          </p>
        )}

        {!closed && (
          <section className={styles.panel}>
            <ol className={styles.progress} style={{ '--progress': `${(current / (TIMELINE.length - 1)) * 100}%` }}>
              {TIMELINE.map((s, i) => (
                <li
                  key={s.status}
                  className={[
                    styles['progress-step'],
                    i < current || finished ? styles.done : '',
                    i === current && !finished ? styles.current : '',
                  ].join(' ')}
                >
                  <span className={styles['progress-dot']}>{i < current || finished ? <IconCheck size={14} /> : s.icon}</span>
                  <strong>{s.label}</strong>
                  <small>{s.desc}</small>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className={styles.grid}>
          <section className={styles.panel}>
            <h3>Tu habitación</h3>
            <div className={styles.items}>
              <div className={styles.item}>
                <span className={[styles['item-emoji'], styles['item-photo']].join(' ')}>
                  {r.room.image ? <img src={r.room.image} alt="" /> : '🛏️'}
                </span>
                <span className={styles['item-name']}>
                  {r.room.name}
                  <em> {categoryLabel(r.room.category)}{r.room.beds ? ` • ${r.room.beds}` : ''}</em>
                </span>
              </div>
            </div>
            <div className={styles.row}><span>{r.nights} noche{r.nights !== 1 ? 's' : ''}</span><span>{formatPrice(r.subtotal)}</span></div>
            {r.extra_lines.map(x => (
              <div key={x.extra_id} className={styles.row}><span>{x.name} <em>× {x.qty}</em></span></div>
            ))}
            {r.extras_total > 0 && (
              <div className={styles.row}><span>Servicios adicionales</span><span>{formatPrice(r.extras_total)}</span></div>
            )}
            <div className={styles.row}><span>Impuestos</span><span>{formatPrice(r.taxes)}</span></div>
            <div className={[styles.row, styles['row-total']].join(' ')}><span>Total</span><span>{formatPrice(r.total)}</span></div>
          </section>

          <section className={styles.panel}>
            <h3>Tu estadía</h3>
            <div className={styles.detail}>
              <span className={styles['detail-icon']}><IconCalendar size={16} /></span>
              <div>
                <small>Fechas</small>
                <p>{formatStayDate(r.check_in)} → {formatStayDate(r.check_out)}</p>
                <p className={styles.muted}>Check-in desde las 15:00 • Check-out hasta las 12:00</p>
              </div>
            </div>
            <div className={styles.detail}>
              <span className={styles['detail-icon']}>👤</span>
              <div><small>Huéspedes</small><p>{r.guests} huésped{r.guests !== 1 ? 'es' : ''} • {r.guest_name}</p></div>
            </div>
            {r.guest_phone && (
              <div className={styles.detail}>
                <span className={styles['detail-icon']}><IconPhone size={15} /></span>
                <div><small>Contacto</small><p>{r.guest_phone}</p></div>
              </div>
            )}
            <div className={styles.detail}>
              <span className={styles['detail-icon']}>💳</span>
              <div>
                <small>Pago</small>
                <p>{PAYMENT_LABELS[r.payment_method] ?? r.payment_method}{r.card_last4 ? ` •••• ${r.card_last4}` : ''}</p>
              </div>
            </div>
            {r.special_requests && (
              <div className={styles.detail}>
                <span className={styles['detail-icon']}>📝</span>
                <div><small>Solicitudes especiales</small><p>{r.special_requests}</p></div>
              </div>
            )}
          </section>
        </div>

        <div className={styles.actions}>
          <Link to="/habitaciones" className={styles['btn-primary']}>Buscar habitaciones</Link>
          <Link to="/reservas" className={styles['btn-secondary']}>Ver todas mis reservas</Link>
          {cancellable && (
            <button type="button" className={styles['btn-cancel']} onClick={() => setConfirmCancel(true)}>
              Cancelar reserva
            </button>
          )}
        </div>
        {(r.status === 'pendiente' || r.status === 'confirmada') && !cancellable && (
          <p className={styles.hint}>{CANCEL_TOO_LATE_MESSAGE}</p>
        )}

        {confirmCancel && (
          <CancelReservationModal
            reservation={r}
            busy={cancelling}
            error={actionError}
            onConfirm={cancelReservation}
            onClose={closeModal}
          />
        )}
      </>
    );
  }

  return (
    <div className={styles.page}>
      <ReservationsTopbar />
      <main className={styles.container}>{content}</main>
      {toast && <div className={styles.toast} role="status">{toast}</div>}
    </div>
  );
}
