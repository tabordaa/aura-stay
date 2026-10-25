import { IconCheck } from './Icons';
import { statusMeta } from '../utils/reservations';
import styles from './StatusBadge.module.css';

// Badge de estado de reserva (huésped y admin)
export default function StatusBadge({ status }) {
  const meta = statusMeta(status);
  return (
    <span className={[styles.status, styles[`status-${meta.tone}`]].join(' ')}>
      {meta.tone === 'done' ? <IconCheck size={12} /> : <span className={styles['status-dot']} />}
      {meta.label}
    </span>
  );
}
