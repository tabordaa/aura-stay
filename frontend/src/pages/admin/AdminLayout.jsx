import { useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { IconSearch } from '../../components/Icons';
import styles from './Admin.module.css';

const NAV = [
  { id: 'pedidos',  icon: '🧾', label: 'Pedidos',   path: '/admin' },
  { id: 'products', icon: '🥑', label: 'Productos', path: '/admin/productos' },
  { id: 'clients',  icon: '👥', label: 'Clientes',  path: '/admin/clientes' },
  { id: 'settings', icon: '⚙️', label: 'Configuración' },
];

// Estructura común del panel: barra lateral, barra superior con buscador y contenido de la sección
export default function AdminLayout({ active, pendingCount = 0, search, onSearch, searchPlaceholder, online = true, children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const now = new Date();

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles['brand-logo']}>🌿</span>
          <div>
            <strong>Aura Food</strong>
            <span className={styles['brand-badge']}>Admin</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {NAV.map(item => (
            <button
              key={item.id}
              type="button"
              className={[styles['nav-item'], item.id === active ? styles.active : ''].join(' ')}
              disabled={!item.path}
              title={!item.path ? 'Próximamente' : undefined}
              onClick={() => item.path && navigate(item.path)}
            >
              <span>{item.icon}</span> {item.label}
              {!item.path && <em>Pronto</em>}
              {item.id === 'pedidos' && pendingCount > 0 && <b className={styles['nav-badge']}>{pendingCount}</b>}
            </button>
          ))}
        </nav>

        <div className={styles.profile}>
          <span className={styles.avatar}>A</span>
          <div>
            <strong>{user?.name || 'Administrador'}</strong>
            <small>Supermercado</small>
          </div>
          <button type="button" className={styles.logout} onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión">⎋</button>
        </div>
      </aside>

      {/* Contenido */}
      <main className={styles.main}>
        <header className={styles.topbar}>
          <label className={styles.search}>
            <IconSearch size={16} />
            <input placeholder={searchPlaceholder} value={search} onChange={e => onSearch(e.target.value)} />
          </label>
          <span className={[styles.connection, online ? '' : styles.offline].join(' ')}>
            <span className={styles['connection-dot']} />
            {online ? 'Tienda en línea' : 'Sin conexión con el servidor'}
          </span>
          <span className={styles.today}>
            📅 {now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </header>

        {children}
      </main>
    </div>
  );
}
