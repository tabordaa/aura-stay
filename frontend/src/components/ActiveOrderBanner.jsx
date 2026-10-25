import { Link } from 'react-router';
import useOrderStatus from '../hooks/useOrderStatus';
import { ORDER_STEPS, formatOrderId, isActiveOrder, stepIndex } from '../utils/orders';
import styles from '../pages/catalog/Catalog.module.css';

// Aviso en la portada con el estado en vivo del último pedido (se oculta al terminar)
export default function ActiveOrderBanner({ orderId }) {
  const { order } = useOrderStatus(orderId);
  if (!order || !isActiveOrder(order.status)) return null;

  const current = stepIndex(order.status);
  const step = ORDER_STEPS[current];

  return (
    <Link to={`/pedidos/${order.id}`} className={styles['order-banner']}>
      <span className={styles['order-banner-icon']}>{step.icon}</span>
      <div className={styles['order-banner-text']}>
        <strong>Tu pedido {formatOrderId(order.id)} • {step.label}</strong>
        <span>{step.desc}</span>
        <div className={styles['order-banner-bar']}>
          {ORDER_STEPS.map((s, i) => (
            <span key={s.status} className={i <= current ? styles.filled : ''} />
          ))}
        </div>
      </div>
      <span className={styles['order-banner-cta']}>Ver seguimiento →</span>
    </Link>
  );
}
