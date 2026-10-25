import { useAuth } from '../hooks/useAuth';
import { IconBed, IconCart, IconSearch, IconCalendar, IconLogout } from './Icons';
import { initials } from '../utils/format';
import styles from '../pages/catalog/Catalog.module.css';

export default function Navbar({ search, setSearch, cartCount, setCartOpen, navigate }) {
  const { user, logout } = useAuth();

  return (
    <nav className={styles['navbar']}>
      <div className={styles['brand']}>
        <IconBed size={22} /> {import.meta.env.VITE_APP_NAME || 'Aura Stay'}
      </div>
      <div className={styles['navbar-search']}>
        <span className={styles['search-icon']}><IconSearch size={16} /></span>
        <input
          type="text"
          placeholder="Buscar habitaciones..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className={styles['navbar-actions']}>
        <button className={styles['orders-btn']} onClick={() => navigate('/reservas')} aria-label="Mis reservas">
          <IconCalendar size={17} /> <span>Mis reservas</span>
        </button>
        <button className={styles['cart-btn']} aria-label="Mi estadía" title="Mi estadía" onClick={() => setCartOpen(true)}>
          <IconCart size={22} />
          {cartCount > 0 && <span className={styles['cart-badge']}>{cartCount}</span>}
        </button>
        <button className={styles['user-btn']} onClick={() => navigate('/perfil')} title="Mi perfil" aria-label="Mi perfil">
          <div className={styles['user-avatar']}>{initials(user?.name)}</div>
          <span className={styles['user-name']}>{user?.name || 'Invitado'}</span>
        </button>
        <button className={styles['cart-btn']} onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión">
          <IconLogout size={20} />
        </button>
      </div>
    </nav>
  );
}
