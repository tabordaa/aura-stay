import { useCallback, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { IconBed, IconBolt, IconCheck } from '../../components/Icons';
import Navbar from '../../components/Navbar';
import RoomCard from '../../components/RoomCard';
import StayDrawer from '../../components/StayDrawer';
import RoomDetailModal from '../../components/RoomDetailModal';
import StaySearchBar from '../../components/StaySearchBar';
import { activeStay, readStay } from '../../utils/stay';
import { CATEGORIES } from '../../utils/categories';
import { useAuth } from '../../hooks/useAuth';
import { useStay } from '../../hooks/useStay';
import { roomsService } from '../../services/rooms.service';
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
  const [rooms, setRooms] = useState([]);
  const [catalogState, setCatalogState] = useState('loading'); // loading | ready | error
  const [retryKey, setRetryKey] = useState(0);
  const [notice, setNotice] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [availability, setAvailability] = useState({ key: '', map: null });

  // La estadía vive en la URL (?in=&out=&guests=); si es inválida no se aplica la disponibilidad
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStay = readStay(searchParams);
  const stay = activeStay(rawStay);
  const stayKey = stay ? `${stay.checkIn}|${stay.checkOut}|${stay.guests}` : '';
  const availabilityMap = stayKey && availability.key === stayKey ? availability.map : null;

  const stayCart = useStay(user?.id);

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
    if (!stayKey) return undefined;
    let active = true;
    const [checkIn, checkOut, stayGuests] = stayKey.split('|');
    roomsService.availability({ checkIn, checkOut, guests: stayGuests })
      .then(map => { if (active) setAvailability({ key: stayKey, map }); })
      .catch(() => {
        if (!active) return;
        setAvailability({ key: stayKey, map: null });
        setNotice('No pudimos verificar la disponibilidad. Intenta de nuevo.');
      });
    return () => { active = false; };
  }, [stayKey, retryKey]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const retryCatalog = () => { setCatalogState('loading'); setRetryKey(k => k + 1); };

  const closeCart = useCallback(() => setCartOpen(false), []);
  const closeDetail = useCallback(() => setSelectedRoom(null), []);
  // Agrega a "Mi estadía" y abre el drawer; la misma habitación con las mismas fechas no se duplica
  const handleAddStay = (item) => {
    const result = stayCart.add(item);
    setSelectedRoom(null);
    setNotice(result === 'duplicate' ? 'Ya está en tu estadía' : 'Agregada a tu estadía');
    setCartOpen(true);
  };
  // TODO S07: abrir aquí el modal "Confirmar reserva" con los datos de la estadía
  const handleReserve = () => setNotice('Muy pronto podrás confirmar tu reserva.');

  const toggleFav = (id) => setFavorites(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
  const setFilter = (key) => (e) => setFilters(f => ({ ...f, [key]: e.target.value }));
  const hasFilters = searching || Object.keys(EMPTY_FILTERS).some(k => filters[k] !== EMPTY_FILTERS[k]);
  const clearFilters = () => { setSearch(''); setQuery(''); setFilters(EMPTY_FILTERS); };

  const sectionTitle = searching
    ? `Resultados para "${query.trim()}"`
    : CATEGORIES.find(c => c.id === activeCategory)?.label ?? '';
  const count = rooms.length;
  const unavailableCount = availabilityMap ? rooms.filter(r => availabilityMap[r.id]?.available === false).length : 0;
  const applyStay = ({ checkIn, checkOut, guests }) => setSearchParams({ in: checkIn, out: checkOut, guests: String(guests) });
  const clearStay = () => setSearchParams({});
  const priceRangeInvalid = minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice);

  return (
    <>
      <div className={styles['catalog-page']}>

        <Navbar
          search={search}
          setSearch={setSearch}
          cartCount={stayCart.count}
          setCartOpen={setCartOpen}
          navigate={navigate}
        />

        <div className={styles['catalog-body']}>
          <main className={styles['catalog-main']}>
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

            <StaySearchBar
              key={searchParams.toString()}
              initial={rawStay}
              onSearch={applyStay}
              onClear={clearStay}
            />
            {notice && !cartOpen && <p className={styles['cart-notice']} role="status">{notice}</p>}

            {/* Section header */}
            <div className={styles['section-header']}>
              <div>
                <div className={styles['section-meta']}>
                  <div className={styles['section-dot']} />
                  <span>Nuestras estancias</span>
                </div>
                <h2>{sectionTitle}</h2>
                <p className={styles['section-sub']}>
                  {catalogState === 'ready'
                    ? `${count} opci${count !== 1 ? 'ones' : 'ón'}${unavailableCount ? ` · ${unavailableCount} sin disponibilidad` : ''}`
                    : ' '}
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
              {hasFilters && !(catalogState === 'ready' && rooms.length === 0) && (
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
            ) : rooms.length === 0 ? (
              <div className={styles['catalog-state']}>
                <span className={styles['state-icon']}>🔎</span>
                <p>No encontramos habitaciones con esos filtros</p>
                <button type="button" className={styles['btn-secondary']} onClick={clearFilters}>Limpiar filtros</button>
              </div>
            ) : (
              <div className={styles['product-grid']}>
                {rooms.map(room => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    favorites={favorites}
                    toggleFav={toggleFav}
                    stay={availabilityMap ? stay : null}
                    availability={availabilityMap?.[room.id]}
                    onSelect={setSelectedRoom}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {selectedRoom && (
        <RoomDetailModal
          key={selectedRoom.id}
          room={selectedRoom}
          stay={stay}
          availability={availabilityMap?.[selectedRoom.id]}
          onClose={closeDetail}
          onAdd={handleAddStay}
        />
      )}

      <StayDrawer
        open={cartOpen}
        onClose={closeCart}
        stay={stayCart}
        notice={notice}
        onReserve={handleReserve}
      />
    </>
  );
}

