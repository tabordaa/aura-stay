import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { IconCheck, IconMapPin, IconPhone, IconTruck } from '../../components/Icons';
import { OrderMap } from '../../components/maps/LazyMaps';
import { directionsUrl, toLocation } from '../../utils/location';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { orderService } from '../../services/order.service';
import { formatOrderId, formatPrice, parseServerDate } from '../../utils/format';
import styles from './Delivery.module.css';

const PICKUP_ADDRESS = import.meta.env.VITE_PICKUP_ADDRESS || 'Punto de recogida Aura Food';
const REFRESH_MS = 20000;

const TABS = [
  { id: 'available', label: 'Disponibles' },
  { id: 'active',    label: 'En curso' },
  { id: 'history',   label: 'Historial' },
];

const STATUS_LABELS = {
  preparado: 'Listo para recoger',
  asignado:  'En camino',
  entregado: 'Entregado',
};

const EMPTY_STATES = {
  available: { title: 'No hay pedidos por recoger', text: 'Cuando la tienda prepare un pedido aparecerá aquí para que lo tomes.' },
  active:    { title: 'No tienes entregas en curso', text: 'Toma un pedido de la pestaña "Disponibles" para empezar.' },
  history:   { title: 'Aún no has entregado pedidos', text: 'Tus entregas completadas quedarán registradas aquí.' },
};

function formatDeliveredAt(value) {
  if (!value) return '';
  return parseServerDate(value).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function OrderCard({ order, mode, store, isUpdating, onAction }) {
  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);
  const cash = order.payment_method === 'cash';
  const location = toLocation(order);

  return (
    <article className={styles['order-card']}>
      <div className={styles['order-header']}>
        <div>
          <span className={styles['order-label']}>Pedido</span>
          <h2>{formatOrderId(order.id)}</h2>
        </div>
        <span className={`${styles.status} ${styles[`status-${order.status}`]}`}>
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className={styles.route}>
        <div className={styles['route-stop']}>
          <span className={`${styles['route-icon']} ${styles['pickup-icon']}`}>
            <IconMapPin size={18} />
          </span>
          <div>
            <span className={styles['route-label']}>Recoger en</span>
            <p>{store?.address || PICKUP_ADDRESS}</p>
          </div>
        </div>
        <div className={styles['route-line']} />
        <div className={styles['route-stop']}>
          <span className={`${styles['route-icon']} ${styles['delivery-icon']}`}>
            <IconMapPin size={18} />
          </span>
          <div>
            <span className={styles['route-label']}>Entregar en</span>
            <p>{order.delivery_address}</p>
          </div>
        </div>
      </div>

      {mode === 'active' && location && (
        <div className={styles['order-map']}>
          <OrderMap store={store} destination={location} height={180} />
          <a className={styles['directions-link']} href={directionsUrl(location)} target="_blank" rel="noreferrer">
            <IconMapPin size={14} /> Cómo llegar (Google Maps)
          </a>
        </div>
      )}

      {mode === 'active' && (order.phone || order.notes) && (
        <div className={styles['order-extra']}>
          {order.phone && (
            <a className={styles['phone-link']} href={`tel:${order.phone}`}>
              <IconPhone size={14} /> {order.phone}
            </a>
          )}
          {order.notes && <p className={styles.notes}>“{order.notes}”</p>}
        </div>
      )}

      <div className={styles['order-meta']}>
        <span>
          {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
          {mode !== 'history' && (cash ? ' · Cobrar en efectivo' : ' · Ya pagado')}
        </span>
        <strong>{formatPrice(order.total_price)}</strong>
      </div>

      {mode === 'available' && (
        <button className={styles['deliver-button']} type="button" onClick={() => onAction(order)} disabled={isUpdating}>
          <IconTruck size={17} />
          {isUpdating ? 'Tomando...' : 'Tomar pedido'}
        </button>
      )}
      {mode === 'active' && (
        <button className={styles['deliver-button']} type="button" onClick={() => onAction(order)} disabled={isUpdating}>
          <IconCheck size={17} />
          {isUpdating ? 'Actualizando...' : 'Marcar como entregado'}
        </button>
      )}
      {mode === 'history' && (
        <p className={styles['delivered-at']}>
          <IconCheck size={14} /> Entregado el {formatDeliveredAt(order.delivered_at)}
        </p>
      )}
    </article>
  );
}

export default function DeliveryPage() {
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState({ available: [], active: [], history: [] });
  const [tab, setTab] = useState('available');
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const store = useStoreConfig()?.store;

  const loadOrders = useCallback(() => orderService.getCourierOrders()
    .then(data => { setGroups(data); setError(''); })
    .catch(loadError => setError(`No fue posible cargar los pedidos. ${loadError.message}`))
    .finally(() => setLoading(false)), []);

  // Carga inicial y refresco automático para ver los pedidos que la tienda va preparando
  useEffect(() => {
    loadOrders();
    const timer = setInterval(loadOrders, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadOrders]);

  const refreshOrders = () => {
    setLoading(true);
    loadOrders();
  };

  const handleAction = async (order) => {
    const taking = tab === 'available';
    setUpdatingOrderId(order.id);
    setError('');
    setNotice('');
    try {
      if (taking) {
        await orderService.takeOrder(order.id);
        setNotice(`Tomaste el pedido ${formatOrderId(order.id)}. Lo encuentras en "En curso".`);
      } else {
        await orderService.deliverOrder(order.id);
        setNotice(`El pedido ${formatOrderId(order.id)} fue marcado como entregado.`);
      }
    } catch (actionError) {
      setError(`No fue posible actualizar el pedido ${formatOrderId(order.id)}. ${actionError.message}`);
    } finally {
      setUpdatingOrderId(null);
      // Se recarga siempre: si otro domiciliario lo tomó primero, desaparece de "Disponibles"
      loadOrders();
    }
  };

  const orders = groups[tab];
  const empty = EMPTY_STATES[tab];

  return (
    <div className={styles['delivery-page']}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles['brand-icon']}><IconTruck size={20} /></span>
          {import.meta.env.VITE_APP_NAME || 'Aura Food'} | Repartidor
        </div>
        <div className={styles['topbar-actions']}>
          <span className={styles['role-label']}>{user?.name}</span>
          <button type="button" className={styles['logout-button']} onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles['page-heading']}>
          <div>
            <p className={styles.eyebrow}>OPERACIÓN DE ENTREGAS</p>
            <h1>Mis entregas</h1>
            <p className={styles.subtitle}>Toma los pedidos preparados, llévalos a su destino y márcalos como entregados.</p>
          </div>
          <button className={styles['refresh-button']} type="button" onClick={refreshOrders} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar pedidos'}
          </button>
        </div>

        <div className={styles.tabs} role="tablist">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={[styles.tab, tab === t.id ? styles.active : ''].join(' ')}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === 'available' && groups.available.length > 0
                ? <b className={styles['tab-alert']}>{groups.available.length}</b>
                : <span className={styles['tab-count']}>({groups[t.id].length})</span>}
            </button>
          ))}
        </div>

        {error && <p className={styles['feedback-error']} role="alert">{error}</p>}
        {notice && <p className={styles['feedback-success']} role="status">{notice}</p>}

        {loading && orders.length === 0 ? (
          <div className={styles['empty-state']} role="status">Cargando pedidos...</div>
        ) : orders.length === 0 ? (
          <div className={styles['empty-state']}>
            <span className={styles['empty-icon']}><IconTruck size={26} /></span>
            <h2>{empty.title}</h2>
            <p>{empty.text}</p>
          </div>
        ) : (
          <section className={styles['orders-grid']} aria-label={TABS.find(t => t.id === tab).label}>
            {orders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                mode={tab}
                store={store}
                isUpdating={updatingOrderId === order.id}
                onAction={handleAction}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
