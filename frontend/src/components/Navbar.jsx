import { useAuth } from '../hooks/useAuth';
import { IconBed, IconCart, IconSearch, IconCalendar, IconLogout } from './Icons';
import { initials } from '../utils/format';
import styles from '../pages/catalog/Catalog.module.css';

// `hideSearch` oculta el buscador (home pública). Sin sesión se ofrecen entrar/registrarse;
// el admin ve un enlace al panel en lugar de las acciones del huésped.
export default function Navbar({ search = '', setSearch, cartCount = 0, setCartOpen, navigate, hideSearch = false }) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <nav className={styles['navbar']} aria-label="Principal">
      <div className={styles['brand']}>
        <IconBed size={22} /> {import.meta.env.VITE_APP_NAME || 'Aura Stay'}
      </div>
      {!hideSearch && (
        <div className={styles['navbar-search']}>
          <span className={styles['search-icon']}><IconSearch size={16} /></span>
          <input
            type="text"
            placeholder="Buscar habitaciones..."
            aria-label="Buscar habitaciones"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}
      <div className={styles['navbar-actions']}>
        {!user ? (
          <>
            <button type="button" className={styles['nav-link']} onClick={() => navigate('/login')}>Iniciar sesión</button>
            <button type="button" className={styles['nav-cta']} onClick={() => navigate('/register')}>Crear cuenta</button>
          </>
        ) : (
          <>
            {isAdmin ? (
              <button type="button" className={styles['nav-cta']} onClick={() => navigate('/admin')}>Panel</button>
            ) : (
              <>
                <button className={styles['orders-btn']} onClick={() => navigate('/reservas')} aria-label="Mis reservas">
                  <IconCalendar size={17} /> <span>Mis reservas</span>
                </button>
                {setCartOpen ? (
                  <button className={styles['cart-btn']} aria-label="Mi estadía" title="Mi estadía" onClick={() => setCartOpen(true)}>
                    <IconCart size={22} />
                    {cartCount > 0 && <span className={styles['cart-badge']}>{cartCount}</span>}
                  </button>
                ) : (
                  // Fuera del catálogo el drawer no existe: se va a donde está "Mi estadía"
                  <button className={styles['cart-btn']} aria-label="Mi estadía" title="Mi estadía" onClick={() => navigate('/habitaciones')}>
                    <IconCart size={22} />
                  </button>
                )}
                <button className={styles['user-btn']} onClick={() => navigate('/perfil')} title="Mi perfil" aria-label="Mi perfil">
                  <div className={styles['user-avatar']}>{initials(user?.name)}</div>
                  <span className={styles['user-name']}>{user?.name || 'Invitado'}</span>
                </button>
              </>
            )}
            <button className={styles['cart-btn']} onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión">
              <IconLogout size={20} />
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
