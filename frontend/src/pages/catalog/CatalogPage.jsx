import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { IconTruck, IconBolt, IconCheck } from '../../components/Icons';
import Navbar from '../../components/Navbar';
import ProductCard from '../../components/ProductCard';
import CartDrawer from '../../components/CartDrawer';
import CheckoutModal from '../../components/CheckoutModal';
import ActiveOrderBanner from '../../components/ActiveOrderBanner';
import { isActiveOrder } from '../../utils/orders';
import { CATEGORIES } from '../../utils/categories';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { productService } from '../../services/product.service';
import { orderService } from '../../services/order.service';
import { configService } from '../../services/config.service';
import styles from './Catalog.module.css';

const FILTERS = ['Todos', 'Más vendidos', 'Ofertas del día', 'Orgánicos'];

const isOnSale = (p) => p.old_price != null && p.old_price > p.price;
// Sin tildes ni mayúsculas: "organico" encuentra "Orgánico"
const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const isOrganic = (p) => normalize([p.tag, p.origin, p.name].filter(Boolean).join(' ')).includes('organic');

export default function CatalogPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('frutas');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [latestOrderId, setLatestOrderId] = useState(null);
  const [dbProducts, setDbProducts] = useState([]);
  const [catalogState, setCatalogState] = useState('loading'); // loading | ready | error
  const [notice, setNotice] = useState('');
  // Lo define el backend; null mientras carga
  const [deliveryFee, setDeliveryFee] = useState(null);

  const { cart, qtyOf, addToCart: addEntry, changeQty, removeFromCart, clearCart } = useCart(user?.id, dbProducts);

  // Los más vendidos llegan primero; cada filtro decide luego el orden
  const loadProducts = useCallback(() => productService.getAllProducts('best_sellers')
    .then(data => { setDbProducts(data); setCatalogState('ready'); })
    .catch(() => setCatalogState('error')), []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const retryCatalog = () => { setCatalogState('loading'); loadProducts(); };

  useEffect(() => {
    configService.getConfig()
      .then(config => setDeliveryFee(config.delivery_fee))
      .catch(() => {});
  }, []);

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
  const deliveryCost = cartSubtotal > 0 ? deliveryFee : 0;
  const cartTotal = cartSubtotal + (deliveryCost || 0);

  const closeCheckout = useCallback(() => setCheckoutOpen(false), []);

  const toggleFav = (id) => setFavorites(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);

  const addToCart = (product) => {
    if (!addEntry(product)) setNotice(`No hay más unidades disponibles de ${product.name}`);
  };

  // Al buscar se recorre todo el catálogo, no solo la categoría abierta
  const term = normalize(search.trim());
  const filtered = dbProducts.filter(p => {
    const matchCategory = term ? true : p.category === activeCategory;
    const matchSearch   = !term || normalize([p.name, p.tag, p.origin].filter(Boolean).join(' ')).includes(term);
    const matchFilter   = activeFilter === 'Todos' ? true
      : activeFilter === 'Más vendidos' ? p.units_sold > 0
      : activeFilter === 'Ofertas del día' ? isOnSale(p)
      : activeFilter === 'Orgánicos' ? isOrganic(p)
      : true;
    return matchCategory && matchSearch && matchFilter;
  });
  // La API los entrega por unidades vendidas; fuera de "Más vendidos" se conserva el orden de siempre
  if (activeFilter !== 'Más vendidos') filtered.sort((a, b) => a.id - b.id);

  const activeCategoryLabel = term
    ? `Resultados para "${search.trim()}"`
    : CATEGORIES.find(c => c.id === activeCategory)?.label ?? '';
  const emptyMessage = term
    ? 'No encontramos productos con esa búsqueda. Prueba con otra palabra.'
    : activeFilter === 'Todos' ? 'Pronto tendremos productos en esta categoría.'
    : 'Ningún producto de esta categoría coincide con el filtro.';

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
          {/* Sidebar */}
          <aside className={styles['sidebar']}>
            <p className={styles['sidebar-title']}>Categorías</p>
            {CATEGORIES.map(cat => (
              <div key={cat.id} className={[styles['sidebar-item'], activeCategory === cat.id ? styles.active : ''].join(' ')}
                onClick={() => { setActiveCategory(cat.id); setActiveFilter('Todos'); }}
                role="button"
              >
                <span className={styles['cat-icon']}>{cat.icon}</span>
                {cat.label}
              </div>
            ))}
          </aside>

          {/* Main */}
          <main className={styles['catalog-main']}>
            {latestOrderId && <ActiveOrderBanner orderId={latestOrderId} />}

            {/* Welcome Banner */}
            <div className={styles['welcome-banner']}>
              <div className={styles['banner-left']}>
                <div className={styles['banner-badge']}><IconTruck size={13} /> Domicilio a tu puerta</div>
                <h1>¡Hola, {user?.name || 'Invitado'}!<br />¿Qué necesitas hoy?</h1>
                <p>Encuentra tus alimentos frescos directamente del campo a tu mesa en minutos. Cosecha del día garantizada.</p>
                <div className={styles['banner-meta']}>
                  <span><IconCheck size={13} /> 100% Calidad local</span>
                  <span><IconBolt size={13} /> Entrega express 45 min</span>
                </div>
              </div>
              <div className={styles['banner-right']}>🥦🍅<br />🥑🍞</div>
            </div>

            {/* Section header */}
            <div className={styles['section-header']}>
              <div>
                <div className={styles['section-meta']}>
                  <div className={styles['section-dot']} />
                  <span>Catálogo Selección</span>
                </div>
                <h2>{activeCategoryLabel}</h2>
                <p className={styles['section-sub']}>{filtered.length} producto{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}</p>
              </div>
              <div className={styles['filter-tabs']}>
                {FILTERS.map(f => (
                  <button key={f} className={[styles['tab-btn'], activeFilter === f ? styles.active : ''].join(' ')} onClick={() => setActiveFilter(f)}>{f}</button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            {catalogState === 'loading' ? (
              <div className={styles['catalog-state']} role="status">
                <span className={styles.spinner} /> Cargando productos frescos…
              </div>
            ) : catalogState === 'error' ? (
              <div className={styles['catalog-state']} role="alert">
                <span className={styles['state-icon']}>📡</span>
                <p>No pudimos cargar el catálogo. Revisa tu conexión e intenta de nuevo.</p>
                <button type="button" className={styles['btn-secondary']} onClick={retryCatalog}>Reintentar</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className={styles['catalog-state']}>
                <span className={styles['state-icon']}>🔎</span>
                <p>{emptyMessage}</p>
                {(term || activeFilter !== 'Todos') && (
                  <button type="button" className={styles['btn-secondary']} onClick={() => { setSearch(''); setActiveFilter('Todos'); }}>
                    Ver todos los productos
                  </button>
                )}
              </div>
            ) : (
              <div className={styles['product-grid']}>
                {filtered.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    inCart={qtyOf(product.id)}
                    favorites={favorites}
                    toggleFav={toggleFav}
                    addToCart={addToCart}
                  />
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
        onOrderPlaced={(receipt) => { setLatestOrderId(receipt.id); loadProducts(); }}
      />
    </>
  );
}
