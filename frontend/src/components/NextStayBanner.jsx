import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { reservationsService } from '../services/reservations.service';
import { formatStayRange } from '../utils/dates';
import { TIMELINE, pickNextStay, statusMeta, timelineIndex } from '../utils/reservations';
import styles from '../pages/catalog/Catalog.module.css';

// Aviso en el catálogo con la reserva activa más cercana; no se muestra si no hay ninguna
export default function NextStayBanner({ userId, refreshKey = 0 }) {
  const [stay, setStay] = useState(null);

  useEffect(() => {
    let active = true;
    reservationsService.listMine()
      .then(list => { if (active) setStay(pickNextStay(list)); })
      .catch(() => { if (active) setStay(null); });
    return () => { active = false; };
  }, [userId, refreshKey]);

  if (!stay) return null;

  const current = timelineIndex(stay.status);
  const meta = statusMeta(stay.status);

  return (
    <Link to={`/reservas/${stay.id}`} className={styles['order-banner']}>
      <span className={styles['order-banner-icon']}>{TIMELINE[current].icon}</span>
      <div className={styles['order-banner-text']}>
        <strong>Tu próxima estadía • {stay.room.name}</strong>
        <span>{formatStayRange(stay.check_in, stay.check_out)} • {stay.code} • {meta.label}</span>
        <div className={styles['order-banner-bar']}>
          {TIMELINE.map((s, i) => (
            <span key={s.status} className={i <= current ? styles.filled : ''} />
          ))}
        </div>
      </div>
      <span className={styles['order-banner-cta']}>Ver detalle →</span>
    </Link>
  );
}
