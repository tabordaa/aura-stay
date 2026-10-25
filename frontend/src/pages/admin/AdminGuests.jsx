import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { formatStayDate } from '../../utils/dates';
import { formatPrice, initials } from '../../utils/format';
import AdminLayout from './AdminLayout';
import GuestDetailModal from './GuestDetailModal';
import styles from './Admin.module.css';

const TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'con',   label: 'Con estadías' },
  { id: 'sin',   label: 'Sin estadías' },
];

function matchesTab(guest, tab) {
  if (tab === 'con') return guest.stays > 0;
  if (tab === 'sin') return guest.stays === 0;
  return true;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default function AdminGuests() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('todos');
  const [selected, setSelected] = useState(null);

  const loadGuests = useCallback(() => adminService.listGuests()
    .then(list => { setGuests(list); setOnline(true); })
    .catch(() => setOnline(false))
    .finally(() => setLoading(false)), []);

  useEffect(() => { loadGuests(); }, [loadGuests]);

  // Todo sale de las mismas cifras por huésped, así los KPIs cuadran con la tabla
  const stats = useMemo(() => {
    const top = guests.reduce((best, g) => (g.nights > (best?.nights ?? 0) ? g : best), null);
    return {
      total: guests.length,
      withStays: guests.filter(g => g.stays > 0).length,
      revenue: guests.reduce((n, g) => n + g.total_spent, 0),
      stays: guests.reduce((n, g) => n + g.stays, 0),
      top,
    };
  }, [guests]);

  const counts = useMemo(() => Object.fromEntries(TABS.map(t => [t.id, guests.filter(g => matchesTab(g, t.id)).length])), [guests]);

  const term = search.trim().toLowerCase();
  const visible = guests
    .filter(g => matchesTab(g, tab))
    .filter(g => !term || [g.name, g.email, g.phone, g.document, g.city].some(v => v?.toLowerCase().includes(term)));

  return (
    <AdminLayout
      active="guests"
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por nombre, correo o documento…"
      online={online}
    >
      <div className={styles.content}>
        <div className={styles['page-head']}>
          <div>
            <h1><span className={styles['title-dot']} /> Huéspedes</h1>
            <p>Conoce quién se hospeda en tu hotel, cuántas noches suma y cuánto ha gastado.</p>
          </div>
          <div className={styles['refresh-group']}>
            <button type="button" className={styles['btn-refresh']} onClick={() => { setLoading(true); loadGuests(); }} disabled={loading}>
              <span className={loading ? styles.spinning : ''}>⟳</span> Actualizar lista
            </button>
          </div>
        </div>

        {/* Indicadores */}
        <section className={styles.kpis}>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>Huéspedes registrados</span><i>👥</i></div>
            <p className={styles['kpi-value']}>{stats.total}<small> en total</small></p>
            <span className={styles['kpi-foot']}>{stats.withStays} con al menos una estadía</span>
          </div>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>Con estadías</span><i>🛏️</i></div>
            <p className={styles['kpi-value']}>{stats.withStays}<small> huéspedes</small></p>
            <span className={styles['kpi-foot']}>{plural(stats.stays, 'estadía', 'estadías')} (sin canceladas ni rechazadas)</span>
          </div>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>Ingresos totales</span><i>💵</i></div>
            <p className={styles['kpi-value']}>{formatPrice(stats.revenue)}</p>
            <span className={styles['kpi-foot']}>Suma del gasto de todos los huéspedes</span>
          </div>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>Más noches</span><i>⭐</i></div>
            <p className={[styles['kpi-value'], styles['kpi-name']].join(' ')}>{stats.top?.name ?? '—'}</p>
            <span className={styles['kpi-foot']}>
              {stats.top ? `${plural(stats.top.nights, 'noche', 'noches')} en ${plural(stats.top.stays, 'estadía', 'estadías')}` : 'Aún no hay estadías'}
            </span>
          </div>
        </section>

        {/* Tabla */}
        <section className={styles.panel}>
          <div className={styles.tabs} role="tablist">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={[styles.tab, tab === t.id ? styles.active : ''].join(' ')}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                <span className={styles['tab-count']}>({counts[t.id]})</span>
              </button>
            ))}
          </div>

          <div className={styles['table-wrap']}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Huésped</th>
                  <th>Contacto</th>
                  <th>Estadías</th>
                  <th>Noches</th>
                  <th>Gasto total</th>
                  <th>Última estadía</th>
                </tr>
              </thead>
              <tbody>
                {loading && guests.length === 0 ? (
                  <tr><td colSpan={6} className={styles.empty}>Cargando huéspedes…</td></tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.empty}>
                      {!online && guests.length === 0
                        ? '📡 No pudimos cargar los huéspedes. Intenta actualizar la lista.'
                        : 'No hay huéspedes que coincidan.'}
                    </td>
                  </tr>
                ) : visible.map(g => (
                  <tr key={g.id}>
                    <td>
                      <button
                        type="button"
                        className={styles['client-btn']}
                        onClick={() => setSelected(g)}
                        aria-label={`Ver detalle de ${g.name}`}
                      >
                        <span className={styles['client-avatar']} aria-hidden="true">{initials(g.name)}</span>
                        <span>
                          <strong className={styles.block}>{g.name}</strong>
                          <small className={[styles.muted, styles.block].join(' ')}>{g.city || '—'}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <span>{g.phone || '—'}</span>
                      <small className={[styles.muted, styles.block].join(' ')}>{g.email}</small>
                    </td>
                    <td><span className={styles['items-chip']}>{plural(g.stays, 'estadía', 'estadías')}</span></td>
                    <td>{g.nights}</td>
                    <td className={styles.total}>{formatPrice(g.total_spent)}</td>
                    <td>
                      {g.last_stay ? formatStayDate(g.last_stay) : '—'}
                      {!g.last_stay && g.next_stay && (
                        <small className={[styles.muted, styles.block].join(' ')}>Próxima: {formatStayDate(g.next_stay)}</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selected && <GuestDetailModal guest={selected} onClose={() => setSelected(null)} />}
    </AdminLayout>
  );
}
