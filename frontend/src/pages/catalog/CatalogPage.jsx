import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { IconBed, IconBolt, IconCheck } from '../../components/Icons';
import Navbar from '../../components/Navbar';
import RoomCard from '../../components/RoomCard';
import CartDrawer from '../../components/CartDrawer';
import CheckoutModal from '../../components/CheckoutModal';
import ActiveOrderBanner from '../../components/ActiveOrderBanner';
import { isActiveOrder } from '../../utils/orders';
import { CATEGORIES } from '../../utils/categories';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { roomsService } from '../../services/rooms.service';
import { orderService } from '../../services/order.service';
import styles from './Catalog.module.css';

const SORTS = [
  { id: 'recommended', label: 'Recomendados' },
  { id: 'price_asc', label: 'Precio: menor a mayor' },
  { id: 'price_desc', label: 'Precio: mayor a menor' },
  { id: 'popular', label: 'Más reservadas' },
];
const GUEST_OPTIONS = Array.from({ length: 6 }, (_, i) => i + 1);
const EMPTY_FILTERS = { minPrice: '', maxPrice: '', guests: '', sort: 'recommended' };
// Pausa al teclear para no consultar en cada letra
const SEARCH_DEBOUNCE_MS = 250;

export default function CatalogPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('habitacion');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [latestOrderId, setLatestOrderId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [catalogState, setCatalogState] = useState('loading'); // loading | ready | error
  const [retryKey, setRetryKey] = useState(0);
  const [notice, setNotice] = useState('');

  // "Mi estadía" se rehace en S06; mientras tanto el carrito heredado queda vacío
  const { cart, changeQty, removeFromCart, clearCart } = useCart(user?.id, []);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Al buscar por texto se recorre todo el catálogo, no solo la pestaña abierta
  const searching = query.trim() !== '';
  const { minPrice, maxPrice, guests, sort } = filters;

  useEffect(() => {
    let active = true; // descarta respuestas de consultas viejas
    roomsService.list({ category: searching ? undefined : activeCategory, q: query, minPrice, maxPrice, guests, sort })
      .then(data => { if (active) { setRooms(data); setCatalogState('ready'); } })
      .catch(() => { if (active) setCatalogState('error'); });
    return () => { active = false; };
  }, [activeCategory, searching, query, minPrice, maxPrice, guests, sort, retryKey]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const retryCatalog = () => { setCatalogState('loading'); setRetryKey(k => k + 1); };

  // Muestra el aviso de seguimiento si el cliente tiene un pedido en curso
  useEffect(() => {
    orderService.getMyOrders(5)
      .then(orders => {
        const active = orders.find(o => isActiveOrder(o.status));
        if (active) setLatestOrderId(active.id);
      })
      .catch(() => {});
  }, []);

  const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const deliveryCost = 0;
  const cartTotal = cartSubtotal + deliveryCost;

  const closeCheckout = useCallback(() => setCheckoutOpen(false), []);

  const toggleFav = (id) => setFavorites(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
  const setFilter = (key) => (e) => setFilters(f => ({ ...f, [key]: e.target.value }));
  const hasFilters = searching || Object.keys(EMPTY_FILTERS).some(k => filters[k] !== EMPTY_FILTERS[k]);
  const clearFilters = () => { setSearch(''); setQuery(''); setFilters(EMPTY_FILTERS); };

  const sectionTitle = searching
    ? `Resultados para "${query.trim()}"`
    : CATEGORIES.find(c => c.id === activeCategory)?.label ?? '';
  const count = rooms.length;
  const priceRangeInvalid = minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice);

  return (
    <>
      <div className={styles['catalog-page']}>

        <Navbar
          search={search}
          setSearch={setSearch}
          cartCount={cartCount}
          setCartOpen={setCartOpen}
          navigate={navigate}
        />

        <div className={styles['catalog-body']}>
          <main className={styles['catalog-main']}>
            {latestOrderId && <ActiveOrderBanner orderId={latestOrderId} />}

            {/* Welcome Banner */}
            <div className={styles['welcome-banner']}>
              <div className={styles['banner-left']}>
                <div className={styles['banner-badge']}><IconBed size={13} /> Reserva en minutos</div>
                <h1>¡Hola, {user?.name || 'Invitado'}!<br />¿Dónde quieres hospedarte?</h1>
                <p>Habitaciones, suites y paquetes pensados para descansar. Elige tu estadía y reserva sin filas ni llamadas.</p>
                <div className={styles['banner-meta']}>
                  <span><IconCheck size={13} /> Cancelación flexible</span>
                  <span><IconBolt size={13} /> Confirmación inmediata</span>
                </div>
              </div>
              <div className={styles['banner-right']}>🏨🛏️<br />🌴🛎️</div>
            </div>

            {/* Section header */}
            <div className={styles['section-header']}>
              <div>
                <div className={styles['section-meta']}>
                  <div className={styles['section-dot']} />
                  <span>Nuestras estancias</span>
                </div>
                <h2>{sectionTitle}</h2>
                <p className={styles['section-sub']}>
                  {catalogState === 'ready' ? `${count} opci${count !== 1 ? 'ones' : 'ón'} disponible${count !== 1 ? 's' : ''}` : ' '}
                </p>
              </div>
              <div className={styles['filter-tabs']}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={!searching && activeCategory === cat.id}
                    className={[styles['tab-btn'], !searching && activeCategory === cat.id ? styles.active : ''].join(' ')}
                    onClick={() => { setActiveCategory(cat.id); setSearch(''); setQuery(''); }}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtros: precio, huéspedes y orden */}
            <div className={styles['filters-bar']}>
              <div className={styles['filter-field']}>
                <label htmlFor="f-min">Precio mínimo</label>
                <input id="f-min" type="number" min="0" step="10000" placeholder="Sin mínimo" value={minPrice} onChange={setFilter('minPrice')} />
              </div>
              <div className={styles['filter-field']}>
                <label htmlFor="f-max">Precio máximo</label>
                <input id="f-max" type="number" min="0" step="10000" placeholder="Sin límite" value={maxPrice} onChange={setFilter('maxPrice')} />
              </div>
              <div className={styles['filter-field']}>
                <label htmlFor="f-guests">Huéspedes</label>
                <select id="f-guests" value={guests} onChange={setFilter('guests')}>
                  <option value="">Cualquiera</option>
                  {GUEST_OPTIONS.map(n => <option key={n} value={n}>{n} {n === 1 ? 'huésped' : 'huéspedes'}</option>)}
                </select>
              </div>
              <div className={styles['filter-field']}>
                <label htmlFor="f-sort">Ordenar por</label>
                <select id="f-sort" value={sort} onChange={setFilter('sort')}>
                  {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              {priceRangeInvalid && (
                <p className={styles['filter-error']} role="alert">El precio mínimo no puede ser mayor que el máximo</p>
              )}
              {hasFilters && !(catalogState === 'ready' && count === 0) && (
                <button type="button" className={styles['btn-secondary']} onClick={clearFilters}>Limpiar filtros</button>
              )}
            </div>

            {/* Grid */}
            {catalogState === 'loading' ? (
              <div className={styles['catalog-state']} role="status">
                <span className={styles.spinner} /> Buscando las mejores estancias…
              </div>
            ) : catalogState === 'error' ? (
              <div className={styles['catalog-state']} role="alert">
                <span className={styles['state-icon']}>📡</span>
                <p>No pudimos cargar las habitaciones. Revisa tu conexión e intenta de nuevo.</p>
                <button type="button" className={styles['btn-secondary']} onClick={retryCatalog}>Reintentar</button>
              </div>
            ) : count === 0 ? (
              <div className={styles['catalog-state']}>
                <span className={styles['state-icon']}>🔎</span>
                <p>No encontramos habitaciones con esos filtros</p>
                <button type="button" className={styles['btn-secondary']} onClick={clearFilters}>Limpiar filtros</button>
              </div>
            ) : (
              <div className={styles['product-grid']}>
                {rooms.map(room => (
                  <RoomCard key={room.id} room={room} favorites={favorites} toggleFav={toggleFav} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      <CartDrawer
        cartOpen={cartOpen}
        setCartOpen={setCartOpen}
        cart={cart}
        cartCount={cartCount}
        cartSubtotal={cartSubtotal}
        deliveryCost={deliveryCost}
        cartTotal={cartTotal}
        changeQty={changeQty}
        removeFromCart={removeFromCart}
        notice={notice}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
      />

      <CheckoutModal
        open={checkoutOpen}
        onClose={closeCheckout}
        cart={cart}
        cartCount={cartCount}
        cartSubtotal={cartSubtotal}
        deliveryCost={deliveryCost}
        cartTotal={cartTotal}
        clearCart={clearCart}
        onOrderPlaced={(receipt) => setLatestOrderId(receipt.id)}
      />
    </>
  );
}

