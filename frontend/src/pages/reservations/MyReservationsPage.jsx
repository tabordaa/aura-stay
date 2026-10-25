import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import StatusBadge from '../../components/StatusBadge';
import { reservationsService } from '../../services/reservations.service';
import { formatPrice } from '../../utils/format';
import { formatStayRange } from '../../utils/dates';
import { TABS, filterByTab } from '../../utils/reservations';
import ReservationsTopbar from './ReservationsTopbar';
import styles from './Reservations.module.css';

const EMPTY = {
  proximas: { icon: '🛏️', title: 'Aún no tienes reservas', text: 'Cuando reserves tu primera estadía la verás aquí.' },
  pasadas: { icon: '🧳', title: 'Todavía no tienes estadías pasadas', text: 'Tus estadías finalizadas aparecerán aquí.' },
  canceladas: { icon: '🗓️', title: 'No tienes reservas canceladas', text: 'Las reservas canceladas o rechazadas aparecerán aquí.' },
};

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('proximas');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    reservationsService.listMine()
      .then(list => { if (!cancelled) setReservations(list); })
      .catch(() => { if (!cancelled) setError('No pudimos cargar tus reservas. Intenta de nuevo en un momento.'); });
    return () => { cancelled = true; };
  }, [retryKey]);

  const retry = () => { setError(''); setRetryKey(k => k + 1); };
  const visible = reservations ? filterByTab(reservations, tab) : [];

  let content;
  if (error) {
    content = <div className={styles['state-card']} role="alert"><span className={styles['state-icon']}>📡</span><p>{error}</p><button type="button" className={styles['btn-secondary']} onClick={retry}>Reintentar</button></div>;
  } else if (!reservations) {
    content = <div className={styles['state-card']} role="status"><span className={styles.spinner} /> Cargando tus reservas…</div>;
  } else if (visible.length === 0) {
    const empty = EMPTY[tab];
    content = (
      <div className={styles['state-card']}>
        <span className={styles['state-icon']}>{empty.icon}</span>
        <h2>{empty.title}</h2>
        <p>{empty.text}</p>
        <Link to="/habitaciones" className={styles['btn-primary']}>Buscar habitaciones</Link>
      </div>
    );
  } else {
    content = (
      <div className={styles.list}>
        {visible.map(r => (
          <Link key={r.id} to={`/reservas/${r.id}`} className={styles['order-row']}>
            <span className={styles['order-thumbs']}>
              {r.room.image ? <img src={r.room.image} alt="" /> : <span>🛏️</span>}
            </span>
            <div className={styles['order-info']}>
              <strong>{r.room.name}</strong>
              <small>
                {formatStayRange(r.check_in, r.check_out)}
                {' • '}{r.nights} noche{r.nights !== 1 ? 's' : ''}
                {' • '}{r.code}
              </small>
            </div>
            <StatusBadge status={r.status} />
            <span className={styles['order-total']}>{formatPrice(r.total)}</span>
            <span className={styles['order-arrow']}>→</span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <ReservationsTopbar />
      <main className={styles.container}>
        <div className={styles['list-head']}>
          <h1>Mis reservas</h1>
          <p>Consulta y administra tus estadías</p>
        </div>
        <div className={styles.tabs} role="group" aria-label="Filtrar reservas">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id}
              className={[styles['tab-btn'], tab === t.id ? styles.active : ''].join(' ')}
              onClick={() => setTab(t.id)}
            >
              {t.label}{reservations ? ` (${filterByTab(reservations, t.id).length})` : ''}
            </button>
          ))}
        </div>
        {content}
      </main>
    </div>
  );
}
