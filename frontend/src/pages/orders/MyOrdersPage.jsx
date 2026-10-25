import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CLOSED_STATUSES, formatOrderId, formatPrice, getStatusInfo, parseServerDate } from '../../utils/orders';
import { orderService } from '../../services/order.service';
import OrdersTopbar from './OrdersTopbar';
import styles from './Orders.module.css';

function statusClass(status) {
  if (status === 'entregado') return styles['status-done'];
  if (CLOSED_STATUSES[status]) return styles['status-closed'];
  return '';
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    orderService.getMyOrders()
      .then(list => { if (!cancelled) setOrders(list); })
      .catch(() => { if (!cancelled) setError('No pudimos cargar tus pedidos. Intenta de nuevo en un momento.'); });
    return () => { cancelled = true; };
  }, []);

  let content;
  if (error) {
    content = <div className={styles['state-card']}><span className={styles['state-icon']}>📡</span><p>{error}</p></div>;
  } else if (!orders) {
    content = <div className={styles['state-card']}><span className={styles.spinner} /> Cargando tus pedidos…</div>;
  } else if (orders.length === 0) {
    content = (
      <div className={styles['state-card']}>
        <span className={styles['state-icon']}>🛒</span>
        <h2>Aún no tienes pedidos</h2>
        <p>Cuando hagas tu primera compra la verás aquí.</p>
        <Link to="/catalog" className={styles['btn-primary']}>Ir a la tienda</Link>
      </div>
    );
  } else {
    content = (
      <div className={styles.list}>
        {orders.map(o => {
          const step = getStatusInfo(o.status);
          const count = o.items.reduce((acc, i) => acc + i.quantity, 0);
          return (
            <Link key={o.id} to={`/pedidos/${o.id}`} className={styles['order-row']}>
              <span className={styles['order-thumbs']}>
                {o.items.slice(0, 3).map(i => (i.product_image_url
                  ? <img key={i.id} src={i.product_image_url} alt="" />
                  : <span key={i.id}>🛒</span>))}
              </span>
              <div className={styles['order-info']}>
                <strong>Pedido {formatOrderId(o.id)}</strong>
                <small>
                  {parseServerDate(o.created_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                  {' • '}{count} producto{count !== 1 ? 's' : ''}
                </small>
              </div>
              <span className={[styles.status, statusClass(o.status)].join(' ')}>
                {step.icon} {step.label}
              </span>
              <span className={styles['order-total']}>{formatPrice(o.total_price)}</span>
              <span className={styles['order-arrow']}>→</span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <OrdersTopbar />
      <main className={styles.container}>
        <div className={styles['list-head']}>
          <h1>Mis pedidos</h1>
          <p>Sigue el estado de tus compras en tiempo real</p>
        </div>
        {content}
      </main>
    </div>
  );
}
