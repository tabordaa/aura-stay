import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Navbar from '../../components/Navbar';
import RoomCard from '../../components/RoomCard';
import StaySearchBar from '../../components/StaySearchBar';
import { IconBed, IconCheck, IconBolt, IconShield, IconCalendar } from '../../components/Icons';
import { CATEGORIES } from '../../utils/categories';
import { useAuth } from '../../hooks/useAuth';
import { roomsService } from '../../services/rooms.service';
import styles from './Home.module.css';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1600&q=80';
const FEATURED_COUNT = 4;

const CATEGORY_TEXT = {
  habitacion: 'Cómodas y listas para descansar',
  suite: 'Más espacio y vistas privilegiadas',
  exclusiva: 'Piezas únicas para ocasiones especiales',
  paquete: 'Estadías con experiencias incluidas',
};

const WHY = [
  { icon: <IconCalendar size={22} />, title: 'Cancelación flexible', text: 'Cancela sin costo hasta 48 horas antes de tu llegada.' },
  { icon: <IconShield size={22} />, title: 'Pago seguro', text: 'Paga con tarjeta o en el hotel. Tus datos de pago no se guardan.' },
  { icon: <IconBolt size={22} />, title: 'Confirmación inmediata', text: 'Reserva en minutos y recibe tu código al instante.' },
  { icon: <IconCheck size={22} />, title: 'Atención 24/7', text: 'Nuestro equipo te acompaña antes, durante y después de tu estadía.' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [retryKey, setRetryKey] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const toggleFav = (id) => setFavorites(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);

  useEffect(() => {
    let active = true;
    roomsService.list({ category: 'paquete' })
      .then(data => { if (active) { setPackages(data.slice(0, FEATURED_COUNT)); setStatus('ready'); } })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [retryKey]);

  const retry = () => { setStatus('loading'); setRetryKey(k => k + 1); };

  // El admin no tiene catálogo: va a su panel. El huésped va directo; sin sesión pasa por el login, que vuelve a esta ruta
  const goTo = (target) => {
    if (user?.role === 'admin') navigate('/admin');
    else if (user) navigate(target);
    else navigate('/login', { state: { from: target } });
  };

  const search = ({ checkIn, checkOut, guests }) => {
    const params = new URLSearchParams({ in: checkIn, out: checkOut, guests: String(guests) });
    goTo(`/habitaciones?${params}`);
  };

  return (
    <div className={styles['home']}>
      <Navbar navigate={navigate} hideSearch />

      <section className={styles['hero']} aria-label="Bienvenida">
        <img className={styles['hero-img']} src={HERO_IMAGE} alt="Piscina de un hotel al atardecer rodeada de palmeras" />
        <div className={styles['hero-overlay']} />
        <div className={styles['hero-content']}>
          <div className={styles['hero-badge']}><IconBed size={13} /> Reserva en minutos</div>
          <h1>Tu próxima escapada empieza aquí</h1>
          <p>Habitaciones, suites y paquetes pensados para descansar. Elige tus fechas y reserva sin filas ni llamadas.</p>
          <div className={styles['hero-search']}>
            {user?.role === 'admin'
              ? <button type="button" className={styles['hero-cta']} onClick={() => navigate('/admin')}>Ir al panel</button>
              : <StaySearchBar initial={{ checkIn: '', checkOut: '', guests: '' }} onSearch={search} onClear={() => {}} />}
          </div>
        </div>
      </section>

      <main className={styles['main']}>
        <section aria-labelledby="home-cats">
          <div className={styles['section-meta']}><span className={styles['section-dot']} /><span>Explora</span></div>
          <h2 id="home-cats" className={styles['section-title']}>Encuentra tu tipo de estadía</h2>
          <div className={styles['cat-grid']}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} type="button" className={styles['cat-card']} onClick={() => goTo(`/habitaciones?cat=${cat.id}`)}>
                <span className={styles['cat-icon']} aria-hidden="true">{cat.icon}</span>
                <span className={styles['cat-name']}>{cat.label}</span>
                <span className={styles['cat-text']}>{CATEGORY_TEXT[cat.id]}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="home-packages">
          <div className={styles['section-meta']}><span className={styles['section-dot']} /><span>Paquetes destacados</span></div>
          <h2 id="home-packages" className={styles['section-title']}>Escapadas con todo incluido</h2>
          {status === 'loading' && <div className={styles['state']} role="status">Cargando paquetes…</div>}
          {status === 'error' && (
            <div className={styles['state']} role="alert">
              <p>No pudimos cargar los paquetes. Intenta de nuevo.</p>
              <button type="button" className={styles['retry-btn']} onClick={retry}>Reintentar</button>
            </div>
          )}
          {status === 'ready' && packages.length === 0 && <div className={styles['state']}>Pronto tendremos nuevos paquetes para ti.</div>}
          {status === 'ready' && packages.length > 0 && (
            <div className={styles['package-grid']}>
              {packages.map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  favorites={favorites}
                  toggleFav={toggleFav}
                  onSelect={() => goTo('/habitaciones?cat=paquete')}
                  actionLabel="Ver paquete"
                />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="home-why">
          <div className={styles['section-meta']}><span className={styles['section-dot']} /><span>Por qué Aura Stay</span></div>
          <h2 id="home-why" className={styles['section-title']}>Reservar es fácil y sin sorpresas</h2>
          <div className={styles['why-grid']}>
            {WHY.map(item => (
              <div key={item.title} className={styles['why-card']}>
                <span className={styles['why-icon']}>{item.icon}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className={styles['footer']}>
        <div className={styles['footer-inner']}>
          <div className={styles['footer-brand']}><IconBed size={20} /> {import.meta.env.VITE_APP_NAME || 'Aura Stay'}</div>
          <nav className={styles['footer-links']} aria-label="Enlaces del pie de página">
            <button type="button" onClick={() => goTo('/habitaciones')}>Habitaciones</button>
            <button type="button" onClick={() => navigate('/login')}>Iniciar sesión</button>
            <button type="button" onClick={() => navigate('/register')}>Crear cuenta</button>
          </nav>
          <p className={styles['footer-copy']}>© {new Date().getFullYear()} Aura Stay. Tu estadía, reservada con confianza.</p>
        </div>
      </footer>
    </div>
  );
}
