import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconCheck } from '../../components/Icons';
import StatusBadge from '../../components/StatusBadge';
import AdminLayout from './AdminLayout';
import RejectReservationModal from './RejectReservationModal';
import { formatPrice, initials } from '../../utils/format';
import { formatStayDate } from '../../utils/dates';
import { canTransition } from '../../utils/reservations';
import { adminService } from '../../services/admin.service';
import styles from './Admin.module.css';

const TABS = [
  { id: 'pendiente',  label: 'Pendientes',            statuses: ['pendiente'] },
  { id: 'confirmada', label: 'Confirmadas',           statuses: ['confirmada'] },
  { id: 'en_curso',   label: 'En curso',              statuses: ['en_curso'] },
  { id: 'finalizada', label: 'Finalizadas',           statuses: ['finalizada'] },
  { id: 'cerradas',   label: 'Canceladas/Rechazadas', statuses: ['cancelada', 'rechazada'] },
];

const ACTIONS = ['approve', 'reject', 'checkIn', 'checkOut'];

const SUCCESS_TEXT = {
  approve: (r) => `Reserva ${r.code} aprobada: el huésped ya la ve confirmada`,
  checkIn: (r) => `Check-in de ${r.code} registrado`,
  checkOut: (r) => `Check-out de ${r.code} registrado`,
};

export default function AdminDashboard() {
  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [tab, setTab] = useState('pendiente');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectError, setRejectError] = useState('');
  const [toast, setToast] = useState(null);

  // Recarga KPIs y tabla juntos; los setState ocurren al llegar la respuesta
  // Devuelve true/false; con `silent` no muestra toast (lo decide quien llama)
  const load = useCallback((silent = false) => Promise.all([adminService.stats(), adminService.listReservations()])
    .then(([summary, list]) => {
      setStats(summary);
      setReservations(list);
      setOnline(true);
      return true;
    })
    .catch((err) => {
      setOnline(false);
      if (!silent) setToast({ type: 'error', text: err.message });
      return false;
    })
    .finally(() => setLoading(false)), []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function run(reservation, action, ...args) {
    setBusyId(reservation.id);
    try {
      try {
        await adminService[action](reservation.id, ...args);
      } catch (err) {
        if (action === 'reject') {
          // Se conserva el motivo escrito: el error se muestra dentro del modal
          setRejectError(err.message);
        } else {
          // La tabla puede estar desactualizada (p. ej. otro cambio de estado): se recarga igual
          await load(true);
          setToast({ type: 'error', text: err.message });
        }
        return;
      }
      const refreshed = await load(true);
      setRejecting(null);
      setRejectError('');
      if (!refreshed) {
        setToast({ type: 'warning', text: 'La acción se guardó, pero no pudimos actualizar el panel' });
      } else {
        setToast(action === 'reject'
          ? { type: 'warning', text: `Reserva ${reservation.code} rechazada: el huésped verá el motivo` }
          : { type: 'success', text: SUCCESS_TEXT[action](reservation) });
      }
    } finally {
      setBusyId(null);
    }
  }

  const counts = useMemo(() => Object.fromEntries(
    TABS.map((t) => [t.id, reservations.filter((r) => t.statuses.includes(r.status)).length]),
  ), [reservations]);

  const term = search.trim().toLowerCase();
  const activeTab = TABS.find((t) => t.id === tab);
  const visible = reservations
    .filter((r) => activeTab.statuses.includes(r.status))
    .filter((r) => !term
      || r.code.toLowerCase().includes(term)
      || r.guest_display_name.toLowerCase().includes(term)
      || r.room_name.toLowerCase().includes(term))
    .sort((a, b) => a.check_in.localeCompare(b.check_in));

  const pending = counts.pendiente || 0;

  return (
    <AdminLayout
      active="panel"
      pendingCount={pending}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar por código, huésped o habitación…"
      online={online}
    >
      <div className={styles.content}>
        <div className={styles['page-head']}>
          <div>
            <h1><span className={styles['title-dot']} /> Panel del hotel</h1>
            <p>Revisa la ocupación, aprueba reservas y registra llegadas y salidas.</p>
          </div>
          <div className={styles['refresh-group']}>
            <button type="button" className={styles['btn-refresh']} onClick={() => { setLoading(true); load(); }} disabled={loading}>
              <span className={loading ? styles.spinning : ''}>⟳</span> Actualizar
            </button>
          </div>
        </div>

        {/* Indicadores (calculados en el servicio) */}
        <section className={styles.kpis}>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>Ocupación de hoy</span><i>🛏️</i></div>
            <p className={styles['kpi-value']}>{stats?.occupancy_pct ?? 0}%</p>
            <span className={styles['kpi-foot']}>{stats?.occupied_units ?? 0} de {stats?.total_units ?? 0} unidades ocupadas</span>
          </div>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>Ingresos del mes</span><i>💵</i></div>
            <p className={styles['kpi-value']}>{formatPrice(stats?.month_revenue ?? 0)}</p>
            <span className={styles['kpi-foot']}>{stats?.month_reservations ?? 0} reserva{stats?.month_reservations === 1 ? '' : 's'} · incluye extras e IVA</span>
          </div>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>ADR</span><i>📈</i></div>
            <p className={styles['kpi-value']}>{formatPrice(stats?.adr ?? 0)}<small> por noche</small></p>
            <span className={styles['kpi-foot']}>Ingreso medio por noche vendida</span>
          </div>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>Hoy</span><i>🛎️</i></div>
            <p className={styles['kpi-value']}>{stats?.arrivals_today ?? 0}<small> {stats?.arrivals_today === 1 ? 'llegada' : 'llegadas'} · {stats?.departures_today ?? 0} {stats?.departures_today === 1 ? 'salida' : 'salidas'}</small></p>
            {pending > 0
              ? <span className={[styles.chip, styles['chip-alert']].join(' ')}>● {pending} por aprobar</span>
              : <span className={styles.chip}>Todo al día</span>}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.tabs} role="tablist" aria-label="Estados de reserva">
            {TABS.map(t => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls="reservations-panel"
                aria-label={`${t.label}, ${counts[t.id] || 0}`}
                className={[styles.tab, tab === t.id ? styles.active : ''].join(' ')}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {t.id === 'pendiente' && counts.pendiente > 0
                  ? <b className={styles['tab-alert']}>{counts.pendiente}</b>
                  : <span className={styles['tab-count']}>({counts[t.id] || 0})</span>}
              </button>
            ))}
          </div>

          <div className={styles['table-wrap']} role="tabpanel" id="reservations-panel" aria-labelledby={`tab-${tab}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Huésped</th>
                  <th>Habitación</th>
                  <th>Fechas</th>
                  <th>Noches</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th className={styles['col-actions']}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading && reservations.length === 0 ? (
                  <tr><td colSpan={8} className={styles.empty}>Cargando reservas…</td></tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={styles.empty}>
                      {!online && reservations.length === 0
                        ? 'No pudimos cargar las reservas. Intenta actualizar.'
                        : tab === 'pendiente' && !term ? '🎉 No hay reservas pendientes por ahora.' : 'No hay reservas que coincidan.'}
                    </td>
                  </tr>
                ) : visible.map(res => {
                  const busy = busyId === res.id;
                  const can = (action) => canTransition(res, action);
                  return (
                    <tr key={res.id} className={busy ? styles.busy : ''}>
                      <td><strong className={styles['res-code']}>{res.code}</strong></td>
                      <td>
                        <div className={styles.client}>
                          <span className={styles['client-avatar']}>{initials(res.guest_display_name)}</span>
                          <div>
                            <strong>{res.guest_display_name}</strong>
                            <small className={styles.muted}>{res.guests} huésped{res.guests !== 1 ? 'es' : ''}</small>
                          </div>
                        </div>
                      </td>
                      <td className={styles['room-cell']}>{res.room_name}</td>
                      <td><span className={styles.date}>{formatStayDate(res.check_in)} →</span> <span className={styles.date}>{formatStayDate(res.check_out)}</span></td>
                      <td>{res.nights}</td>
                      <td className={styles.total}>{formatPrice(res.total)}</td>
                      <td>
                        <StatusBadge status={res.status} />
                        {res.status === 'rechazada' && res.rejection_reason && (
                          <small className={[styles.muted, styles['room-cell'], styles['reject-note']].join(' ')}>{res.rejection_reason}</small>
                        )}
                      </td>
                      <td className={styles['col-actions']}>
                        {!ACTIONS.some(can) ? <span className={styles.muted}>—</span> : (
                          <div className={styles.actions}>
                            {can('approve') && (
                              <button type="button" className={styles['btn-accept']} onClick={() => run(res, 'approve')} disabled={busyId !== null} aria-label={`Aprobar reserva ${res.code}`}>
                                <IconCheck size={13} /> Aprobar
                              </button>
                            )}
                            {can('reject') && (
                              <button type="button" className={styles['btn-reject']} onClick={() => { setRejectError(''); setRejecting(res); }} disabled={busyId !== null} aria-label={`Rechazar reserva ${res.code}`}>
                                ✕ Rechazar
                              </button>
                            )}
                            {can('checkIn') && (
                              <button type="button" className={styles['btn-accept']} onClick={() => run(res, 'checkIn')} disabled={busyId !== null} aria-label={`Hacer check-in de ${res.code}`}>
                                🛎️ Check-in
                              </button>
                            )}
                            {can('checkOut') && (
                              <button type="button" className={styles['btn-accept']} onClick={() => run(res, 'checkOut')} disabled={busyId !== null} aria-label={`Hacer check-out de ${res.code}`}>
                                🏁 Check-out
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {rejecting && (
        <RejectReservationModal
          reservation={rejecting}
          busy={busyId === rejecting.id}
          error={rejectError}
          onConfirm={(reason) => run(rejecting, 'reject', reason)}
          onClose={() => { setRejecting(null); setRejectError(''); }}
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
