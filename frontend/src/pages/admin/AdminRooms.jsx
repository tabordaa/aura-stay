import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { IconCheck, IconPlus } from '../../components/Icons';
import { adminService } from '../../services/admin.service';
import { categoryLabel } from '../../utils/categories';
import { formatPrice } from '../../utils/format';
import AdminLayout from './AdminLayout';
import RoomTypeFormModal from './RoomTypeFormModal';
import styles from './Admin.module.css';

const TABS = [
  { id: 'tipos',        label: 'Tipos' },
  { id: 'paquetes',     label: 'Paquetes' },
  { id: 'habitaciones', label: 'Habitaciones' },
];

const ROOM_STATUS = {
  disponible:    { label: 'Disponible',    tone: 'done' },
  ocupada:       { label: 'Ocupada',       tone: 'progress' },
  mantenimiento: { label: 'Mantenimiento', tone: 'rejected' },
};

// Coincidencia de búsqueda; fuera del componente para que los useMemo tengan deps completas
const matches = (term, values) => !term || values.some((v) => v?.toLowerCase().includes(term));

const priceOf = (r) => (r.category === 'paquete' ? r.price : r.price_per_night);

function RoomStatusBadge({ status }) {
  const meta = ROOM_STATUS[status] ?? { label: status, tone: 'progress' };
  return (
    <span className={[styles.status, styles[`status-${meta.tone}`]].join(' ')}>
      {meta.tone === 'done' ? <IconCheck size={12} /> : <span className={styles['status-dot']} />}
      {meta.label}
    </span>
  );
}

export default function AdminRooms() {
  const [types, setTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('tipos');
  const [editing, setEditing] = useState(null); // null: cerrado · 'new' · tipo/paquete
  const [busyIds, setBusyIds] = useState(() => new Set()); // ids con un cambio en curso
  const setBusy = (id, on) => setBusyIds((prev) => {
    const next = new Set(prev);
    if (on) next.add(id); else next.delete(id);
    return next;
  });
  const [confirmId, setConfirmId] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(() => Promise.all([adminService.listRoomTypes(), adminService.listRooms()])
    .then(([t, r]) => { setTypes(t); setRooms(r); setOnline(true); })
    .catch(() => setOnline(false))
    .finally(() => setLoading(false)), []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function saveRoomType(payload) {
    const isNew = editing === 'new';
    const saved = isNew
      ? await adminService.createRoomType(payload)
      : await adminService.updateRoomType(editing.id, payload);
    // Las habitaciones físicas pueden cambiar al ajustar `units`
    await load();
    setEditing(null);
    setToast({ type: 'success', text: isNew ? `"${saved.name}" agregado al catálogo` : `"${saved.name}" actualizado` });
  }

  async function setActive(item, active) {
    setBusy(item.id, true);
    setConfirmId(null);
    try {
      const updated = await adminService.setRoomTypeActive(item.id, active);
      setTypes((list) => list.map((t) => (t.id === updated.id ? updated : t)));
      setToast({
        type: active ? 'success' : 'warning',
        text: active ? `"${item.name}" vuelve al catálogo` : `"${item.name}" ya no se muestra en el catálogo`,
      });
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    } finally {
      setBusy(item.id, false);
    }
  }

  async function changeStatus(room, status) {
    setBusy(room.id, true);
    try {
      const updated = await adminService.setRoomStatus(room.id, status);
      setRooms((list) => list.map((r) => (r.id === updated.id ? updated : r)));
      setToast({ type: 'success', text: `Habitación ${room.number}: ${ROOM_STATUS[status].label.toLowerCase()}` });
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    } finally {
      setBusy(room.id, false);
    }
  }

  const term = search.trim().toLowerCase();

  const visibleTypes = useMemo(() => types
    .filter((t) => (tab === 'paquetes' ? t.category === 'paquete' : t.category !== 'paquete'))
    .filter((t) => matches(term, [t.name, categoryLabel(t.category), t.tag])),
  [types, tab, term]);

  const floors = useMemo(() => {
    const groups = new Map();
    rooms.filter((r) => matches(term, [r.number, r.room_type_name, ROOM_STATUS[r.status]?.label]))
      .forEach((r) => groups.set(r.floor, [...(groups.get(r.floor) ?? []), r]));
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [rooms, term]);

  const count = (fn) => types.filter(fn).length;
  const isPackageTab = tab === 'paquetes';
  // La base actual del paquete se conserva aunque esté inactiva, para no enviar un id oculto
  const currentBase = editing && editing !== 'new' ? editing.room_type_id : null;
  const baseTypes = types.filter((t) => t.category !== 'paquete' && (t.is_active || t.id === currentBase));
  const counts = {
    tipos: count((t) => t.category !== 'paquete'),
    paquetes: count((t) => t.category === 'paquete'),
    habitaciones: rooms.length,
  };

  return (
    <AdminLayout
      active="rooms"
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por nombre, categoría o número de habitación…"
      online={online}
    >
      <div className={styles.content}>
        <div className={styles['page-head']}>
          <div>
            <h1><span className={styles['title-dot']} /> Habitaciones</h1>
            <p>Crea y edita lo que ven los huéspedes y controla el estado de cada habitación.</p>
          </div>
          {tab !== 'habitaciones' && (
            <div className={styles['refresh-group']}>
              <button type="button" className={styles['btn-refresh']} onClick={() => setEditing('new')}>
                <IconPlus size={14} /> {isPackageTab ? 'Nuevo paquete' : 'Nuevo tipo'}
              </button>
            </div>
          )}
        </div>

        <section className={styles.kpis}>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>Tipos activos</span><i>🛏️</i></div>
            <p className={styles['kpi-value']}>{count((t) => t.category !== 'paquete' && t.is_active)}<small> en el catálogo</small></p>
            <span className={styles['kpi-foot']}>{count((t) => t.category !== 'paquete' && !t.is_active)} desactivados</span>
          </div>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>Paquetes activos</span><i>🎁</i></div>
            <p className={styles['kpi-value']}>{count((t) => t.category === 'paquete' && t.is_active)}<small> en el catálogo</small></p>
            <span className={styles['kpi-foot']}>{count((t) => t.category === 'paquete' && !t.is_active)} desactivados</span>
          </div>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>Habitaciones físicas</span><i>🔑</i></div>
            <p className={styles['kpi-value']}>{rooms.length}<small> en el hotel</small></p>
            <span className={styles['kpi-foot']}>{rooms.filter((r) => r.status === 'disponible').length} disponibles</span>
          </div>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>En mantenimiento</span><i>🛠️</i></div>
            <p className={styles['kpi-value']}>{rooms.filter((r) => r.status === 'mantenimiento').length}<small> habitaciones</small></p>
            <span className={styles['kpi-foot']}>{rooms.filter((r) => r.status === 'ocupada').length} ocupadas hoy</span>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.tabs} role="tablist" aria-label="Secciones de habitaciones">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-controls="rooms-panel"
                aria-selected={tab === t.id}
                className={[styles.tab, tab === t.id ? styles.active : ''].join(' ')}
                onClick={() => { setTab(t.id); setConfirmId(null); }}
              >
                {t.label}
                <span className={styles['tab-count']}>({counts[t.id]})</span>
              </button>
            ))}
          </div>

          <div role="tabpanel" id="rooms-panel" aria-labelledby={`tab-${tab}`}>
          {tab === 'habitaciones' ? (
            <>
              <p className={styles['sub-note']}>El estado de cada habitación es informativo: la disponibilidad de reservas se calcula con la cantidad de habitaciones de cada tipo.</p>
              <div className={styles['table-wrap']}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Tipo</th>
                      <th>Estado</th>
                      <th>Cambiar estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && rooms.length === 0 ? (
                      <tr><td colSpan={4} className={styles.empty}>Cargando habitaciones…</td></tr>
                    ) : floors.length === 0 ? (
                      <tr><td colSpan={4} className={styles.empty}>No hay habitaciones que coincidan.</td></tr>
                    ) : floors.map(([floor, list]) => (
                      <Fragment key={floor}>
                        <tr className={styles['floor-row']}><td colSpan={4}>Piso {floor}</td></tr>
                        {list.map((room) => (
                          <tr key={room.id} className={busyIds.has(room.id) ? styles.busy : ''}>
                            <td><strong>{room.number}</strong></td>
                            <td>{room.room_type_name}</td>
                            <td><RoomStatusBadge status={room.status} /></td>
                            <td>
                              <select
                                className={[styles.input, styles['select-sm']].join(' ')}
                                aria-label={`Estado de la habitación ${room.number}`}
                                value={room.status}
                                onChange={(e) => changeStatus(room, e.target.value)}
                                disabled={busyIds.has(room.id)}
                              >
                                {Object.entries(ROOM_STATUS).map(([id, m]) => <option key={id} value={id}>{m.label}</option>)}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className={styles['table-wrap']}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{isPackageTab ? 'Paquete' : 'Habitación'}</th>
                    <th>Categoría</th>
                    <th>{isPackageTab ? 'Precio total' : 'Precio por noche'}</th>
                    <th>Capacidad</th>
                    <th>Unidades</th>
                    <th>Estado</th>
                    <th className={styles['col-actions']}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && types.length === 0 ? (
                    <tr><td colSpan={7} className={styles.empty}>Cargando catálogo…</td></tr>
                  ) : visibleTypes.length === 0 ? (
                    <tr><td colSpan={7} className={styles.empty}>No hay resultados que coincidan.</td></tr>
                  ) : visibleTypes.map((item) => {
                    const busy = busyIds.has(item.id);
                    return (
                      <tr key={item.id} className={[busy ? styles.busy : '', item.is_active ? '' : styles.inactive].join(' ')}>
                        <td>
                          <div className={styles['product-cell']}>
                            <span className={styles['product-thumb']}>
                              {item.images?.[0] ? <img src={item.images[0]} alt="" /> : '🛏️'}
                            </span>
                            <div>
                              <strong>{item.name}</strong>
                              <small className={styles.muted}>
                                {[item.beds, item.category === 'paquete' ? `${item.nights} noches` : null, item.tag].filter(Boolean).join(' • ') || '—'}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>{categoryLabel(item.category)}</td>
                        <td className={styles.total}>
                          {item.old_price && <s className={styles['price-old']}>{formatPrice(item.old_price)}</s>}
                          {formatPrice(priceOf(item))}
                        </td>
                        <td>{item.capacity} huésp.</td>
                        <td>{item.units}</td>
                        <td>
                          <span className={[styles.status, styles[item.is_active ? 'status-done' : 'status-rejected']].join(' ')}>
                            {item.is_active ? <IconCheck size={12} /> : <span className={styles['status-dot']} />}
                            {item.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className={styles['col-actions']}>
                          {confirmId === item.id ? (
                            <div className={styles.confirm}>
                              <span>¿Ocultar del catálogo?</span>
                              <button type="button" className={styles['btn-danger']} onClick={() => setActive(item, false)} disabled={busy} aria-label={`Sí, ocultar ${item.name}`}>Sí</button>
                              <button type="button" className={styles['btn-ghost']} onClick={() => setConfirmId(null)} disabled={busy} aria-label={`No, mantener ${item.name}`}>No</button>
                            </div>
                          ) : (
                            <div className={[styles.actions, styles['actions-nowrap']].join(' ')}>
                              <button type="button" className={styles['btn-ghost']} onClick={() => setEditing(item)} disabled={busy} aria-label={`Editar ${item.name}`}>Editar</button>
                              {item.is_active
                                ? <button type="button" className={styles['btn-reject']} onClick={() => setConfirmId(item.id)} disabled={busy} aria-label={`Desactivar ${item.name}`}>Desactivar</button>
                                : <button type="button" className={styles['btn-accept']} onClick={() => setActive(item, true)} disabled={busy} aria-label={`Activar ${item.name}`}>Activar</button>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </section>
      </div>

      {editing && (
        <RoomTypeFormModal
          room={editing === 'new' ? null : editing}
          defaultCategory={isPackageTab ? 'paquete' : 'habitacion'}
          baseTypes={baseTypes}
          onClose={() => setEditing(null)}
          onSave={saveRoomType}
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
