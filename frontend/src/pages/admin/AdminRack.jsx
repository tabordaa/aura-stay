import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminService } from '../../services/admin.service';
import AdminLayout from './AdminLayout';
import RoomStatusModal from './RoomStatusModal';
import styles from './Admin.module.css';

const TABS = [
  { id: 'todas',         label: 'Todas' },
  { id: 'disponible',    label: 'Disponibles' },
  { id: 'ocupada',       label: 'Ocupadas' },
  { id: 'mantenimiento', label: 'Mantenimiento' },
];

const ROOM_STATUS = {
  disponible:    { label: 'Disponible',    plural: 'Disponibles',   tone: 'done',     icon: '✅' },
  ocupada:       { label: 'Ocupada',       plural: 'Ocupadas',      tone: 'progress', icon: '🛎️' },
  mantenimiento: { label: 'Mantenimiento', plural: 'Mantenimiento', tone: 'rejected', icon: '🛠️' },
};

const STATUS_KEYS = ['disponible', 'ocupada', 'mantenimiento'];

const matches = (term, values) => !term || values.some((v) => v?.toLowerCase().includes(term));

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default function AdminRack() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('todas');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [toast, setToast] = useState(null);

  const loadRooms = useCallback(() => adminService.listRooms()
    .then((list) => { setRooms(list); setOnline(true); })
    .catch(() => setOnline(false))
    .finally(() => setLoading(false)), []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const retryLoad = () => { setLoading(true); loadRooms(); };

  async function saveRoomStatus(room, nextStatus) {
    const updated = await adminService.setRoomStatus(room.id, nextStatus);
    setRooms((list) => list.map((r) => (r.id === updated.id ? updated : r)));
    setSelectedRoom(null);
    const label = ROOM_STATUS[nextStatus]?.label.toLowerCase() ?? nextStatus;
    setToast({ type: 'success', text: `Habitación ${room.number} marcada como ${label}` });
  }

  const counts = useMemo(() => ({
    todas: rooms.length,
    disponible: rooms.filter((r) => r.status === 'disponible').length,
    ocupada: rooms.filter((r) => r.status === 'ocupada').length,
    mantenimiento: rooms.filter((r) => r.status === 'mantenimiento').length,
  }), [rooms]);

  const term = search.trim().toLowerCase();

  // Agrupado de piso más alto a más bajo, como un rack de recepción
  const floors = useMemo(() => {
    const groups = new Map();
    rooms
      .filter((r) => tab === 'todas' || r.status === tab)
      .filter((r) => matches(term, [r.number, r.room_type_name]))
      .forEach((r) => groups.set(r.floor, [...(groups.get(r.floor) ?? []), r]));
    return [...groups.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([floor, list]) => [
        floor,
        list.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })),
      ]);
  }, [rooms, tab, term]);

  const pctOf = (n) => (rooms.length ? Math.round((n / rooms.length) * 100) : 0);

  return (
    <AdminLayout
      active="rack"
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por número o tipo de habitación…"
      online={online}
    >
      <div className={styles.content}>
        <div className={styles['page-head']}>
          <div>
            <h1><span className={styles['title-dot']} /> Mapa del hotel</h1>
            <p>Consulta el estado de cada habitación por piso y actualízalo con un clic.</p>
          </div>
          <div className={styles['refresh-group']}>
            <button type="button" className={styles['btn-refresh']} onClick={retryLoad} disabled={loading}>
              <span className={loading ? styles.spinning : ''}>⟳</span> Actualizar
            </button>
          </div>
        </div>

        {/* KPIs compactos por estado */}
        <section className={[styles.kpis, styles['rack-kpis']].join(' ')} aria-label="Resumen de habitaciones por estado">
          {STATUS_KEYS.map((key) => {
            const meta = ROOM_STATUS[key];
            const value = counts[key];
            return (
              <div key={key} className={[styles.kpi, styles['rack-kpi']].join(' ')}>
                <div className={styles['kpi-head']}>
                  <span>{meta.plural}</span>
                  <i className={styles[`rack-tone-${meta.tone}`]} aria-hidden="true">{meta.icon}</i>
                </div>
                <p className={styles['kpi-value']}>
                  {value}
                  <small> de {rooms.length}</small>
                </p>
                <span className={styles['kpi-foot']}>{pctOf(value)}% del hotel</span>
              </div>
            );
          })}
        </section>

        <section className={styles.panel}>
          <div className={styles['rack-toolbar']}>
            <div className={styles.tabs} role="tablist" aria-label="Filtrar habitaciones por estado">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  id={`rack-tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  aria-controls="rack-panel"
                  className={[styles.tab, tab === t.id ? styles.active : ''].join(' ')}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                  <span className={styles['tab-count']}>({counts[t.id]})</span>
                </button>
              ))}
            </div>

            <div className={styles['rack-legend']} aria-label="Leyenda de estados">
              {STATUS_KEYS.map((key) => {
                const meta = ROOM_STATUS[key];
                return (
                  <span key={key} className={styles['rack-legend-item']}>
                    <span className={[styles['rack-swatch'], styles[`rack-swatch-${meta.tone}`]].join(' ')} aria-hidden="true" />
                    {meta.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div role="tabpanel" id="rack-panel" aria-labelledby={`rack-tab-${tab}`}>
            {loading && rooms.length === 0 ? (
              <div className={styles.empty}>Cargando mapa del hotel…</div>
            ) : floors.length === 0 ? (
              <div className={styles.empty}>
                {!online && rooms.length === 0 ? (
                  <>
                    📡 No pudimos cargar las habitaciones.
                    <button type="button" className={styles['btn-ghost']} onClick={retryLoad}>Reintentar</button>
                  </>
                ) : 'No hay habitaciones que coincidan.'}
              </div>
            ) : (
              <div className={styles['rack-floors']}>
                {floors.map(([floor, floorRooms]) => (
                  <section key={floor} className={styles['rack-floor']} aria-label={`Piso ${floor}`}>
                    <header className={styles['rack-floor-head']}>
                      <h2>Piso {floor}</h2>
                      <span>{plural(floorRooms.length, 'habitación', 'habitaciones')}</span>
                    </header>

                    <div className={styles['rack-grid']}>
                      {floorRooms.map((room, idx) => {
                        const meta = ROOM_STATUS[room.status] ?? ROOM_STATUS.disponible;
                        return (
                          <button
                            key={room.id}
                            type="button"
                            className={[styles['rack-card'], styles[`rack-card-${meta.tone}`]].join(' ')}
                            style={{ '--rack-i': Math.min(idx, 12) }}
                            onClick={() => setSelectedRoom(room)}
                            aria-label={`Habitación ${room.number}, piso ${room.floor}, ${room.room_type_name}, ${meta.label}. Cambiar estado`}
                          >
                            <span className={styles['rack-card-dot']} aria-hidden="true" />
                            <strong className={styles['rack-card-number']}>{room.number}</strong>
                            <span className={styles['rack-card-type']}>{room.room_type_name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {selectedRoom && (
        <RoomStatusModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onSave={saveRoomStatus}
        />
      )}

      {toast && (
        <div className={[styles.toast, styles[`toast-${toast.type}`]].join(' ')} role="status">
          {toast.text}
        </div>
      )}
    </AdminLayout>
  );
}
