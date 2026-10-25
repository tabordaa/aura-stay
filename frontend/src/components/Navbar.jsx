import { useAuth } from '../hooks/useAuth';
import { IconCart, IconSearch, IconTruck } from './Icons';
import { initials } from '../utils/format';
import styles from '../pages/catalog/Catalog.module.css';

export default function Navbar({ search, setSearch, cartCount, setCartOpen, navigate }) {
  const { user } = useAuth();

  return (
    <nav className={styles['navbar']}>
      <div className={styles['brand']}>
        <IconCart size={22} /> {import.meta.env.VITE_APP_NAME || 'Aura Food'}
      </div>
      <div className={styles['navbar-search']}>
        <span className={styles['search-icon']}><IconSearch size={16} /></span>
        <input
          type="text"
          placeholder="Buscar productos..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className={styles['navbar-actions']}>
        <button className={styles['orders-btn']} onClick={() => navigate('/pedidos')} aria-label="Mis pedidos">
          <IconTruck size={17} /> <span>Mis pedidos</span>
        </button>
        <button className={styles['cart-btn']} aria-label="Carrito" onClick={() => setCartOpen(true)}>
          <IconCart size={22} />
          {cartCount > 0 && <span className={styles['cart-badge']}>{cartCount}</span>}
        </button>
        <button className={styles['user-btn']} onClick={() => navigate('/perfil')} title="Mi perfil">
          <div className={styles['user-avatar']}>{initials(user?.name)}</div>
          <span className={styles['user-name']}>{user?.name || 'Invitado'}</span>
        </button>
      </div>
    </nav>
  );
}
