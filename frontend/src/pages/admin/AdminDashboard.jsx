import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconCheck, IconMapPin } from '../../components/Icons';
import AdminLayout from './AdminLayout';

import { formatOrderId, formatPrice, initials, parseServerDate } from '../../utils/format';
import { adminService } from '../../services/admin.service';
import { orderService } from '../../services/order.service';
import styles from './Admin.module.css';

const REFRESH_MS = 15000;
const PAGE_SIZE = 8;

// Cómo ve el administrador cada estado del backend
const STATUS_META = {
  pendiente: { label: 'Pendiente',      tone: 'pending' },
  preparado: { label: 'En preparación', tone: 'progress' },
  asignado:  { label: 'En camino',      tone: 'progress' },
  entregado: { label: 'Entregado',      tone: 'done' },
  rechazado: { label: 'Rechazado',      tone: 'rejected' },
  cancelado: { label: 'Cancelado',      tone: 'rejected' },
};

const TABS = [
  { id: 'todos',     label: 'Todos' },
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'preparado', label: 'En preparación' },
  { id: 'asignado',  label: 'En camino' },
  { id: 'entregado', label: 'Entregados' },
  { id: 'rechazado', label: 'Rechazados' },
  { id: 'cancelado', label: 'Cancelados' },
];

function timeAgo(date, now) {
  const minutes = Math.max(0, Math.round((now - date) / 60000));
  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function describeItems(items) {
  const names = items.map(i => i.product_name || `Prod #${i.product_id}`);
  const units = items.reduce((acc, i) => acc + i.quantity, 0);
  return { names: names.join(', '), units };
}

// Quién lleva el pedido (o si todavía espera domiciliario)
function courierNote(order) {
  if (order.courier) return `🛵 ${order.courier.name}`;
  return order.status === 'preparado' ? 'Esperando domiciliario' : '—';
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tab, setTab] = useState('pendiente');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [confirmRejectId, setConfirmRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast] = useState(null);

  // Los setState ocurren en los callbacks de la promesa (cuando llega la respuesta), no al llamar la función
  const loadOrders = useCallback(() => Promise.all([orderService.getOrders(), adminService.getStats()])
    .then(([list, summary]) => {
      setOrders(list);
      setStats(summary);
      setOnline(true);
      setLastUpdate(new Date());
    })
    .catch(() => setOnline(false))
    .finally(() => setLoading(false)), []);

  // Carga inicial y refresco automático para ver los pedidos que van entrando
  useEffect(() => {
    loadOrders();
    const timer = setInterval(loadOrders, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadOrders]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function changeStatus(order, status) {
    const rejecting = status === 'rechazado';
    setBusyId(order.id);
    try {
      const updated = rejecting
        ? await orderService.rejectOrder(order.id, rejectReason.trim())
        : await orderService.updateStatus(order.id, status);
      setOrders(list => list.map(o => (o.id === updated.id ? updated : o)));
      adminService.getStats().then(setStats).catch(() => {});
      setConfirmRejectId(null);
      setRejectReason('');
      setToast({
        type: rejecting ? 'warning' : 'success',
        text: rejecting
          ? `Pedido ${formatOrderId(order.id)} rechazado: el cliente verá el motivo`
          : `Pedido ${formatOrderId(order.id)} aceptado: pasa a preparación`,
      });
    } catch (err) {
      setToast({
        type: 'error',
        text: err instanceof TypeError ? 'Sin conexión con el servidor. Intenta de nuevo.' : err.message,
      });
    } finally {
      setBusyId(null);
    }
  }

  const openReject = (orderId) => { setConfirmRejectId(orderId); setRejectReason(''); };

  const now = new Date();
  const counts = useMemo(() => {
    const c = { todos: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders]);

  // Los indicadores vienen del servidor (cubren todos los pedidos, no solo los cargados en la tabla)
  const byStatus = stats?.orders_by_status ?? counts;
  const totalOrders = stats?.total_orders ?? orders.length;
  const todayCount = stats?.today_orders ?? 0;
  const inProgress = (byStatus.preparado || 0) + (byStatus.asignado || 0);

  const term = search.trim().toLowerCase();
  const visible = orders.filter(o => {
    if (tab !== 'todos' && o.status !== tab) return false;
    if (!term) return true;
    return formatOrderId(o.id).includes(term)
      || String(o.id) === term
      || o.delivery_address.toLowerCase().includes(term)
      || (o.customer?.name ?? '').toLowerCase().includes(term)
      || describeItems(o.items).names.toLowerCase().includes(term);
  });
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageOrders = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selectTab = (id) => { setTab(id); setPage(1); };

  return (
    <AdminLayout
      active="pedidos"
      pendingCount={byStatus.pendiente || 0}
      search={search}
      onSearch={value => { setSearch(value); setPage(1); }}
      searchPlaceholder="Buscar por # de pedido, cliente, dirección o producto…"
      online={online}
    >
        <div className={styles.content}>
          <div className={styles['page-head']}>
            <div>
              <h1><span className={styles['title-dot']} /> Gestión de pedidos</h1>
              <p>Supervisa, acepta y gestiona los pedidos en tiempo real para despacho y entrega.</p>
            </div>
            <div className={styles['refresh-group']}>
              {lastUpdate && <small>Actualizado {lastUpdate.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</small>}
              <button type="button" className={styles['btn-refresh']} onClick={() => { setLoading(true); loadOrders(); }} disabled={loading}>
                <span className={loading ? styles.spinning : ''}>⟳</span> Actualizar lista
              </button>
            </div>
          </div>

          {/* Indicadores */}
          <section className={styles.kpis}>
            <div className={styles.kpi}>
              <div className={styles['kpi-head']}><span>Pedidos nuevos</span><i>🔔</i></div>
              <p className={styles['kpi-value']}>{byStatus.pendiente || 0}<small> por aceptar</small></p>
              {byStatus.pendiente > 0
                ? <span className={[styles.chip, styles['chip-alert']].join(' ')}>● Atención requerida</span>
                : <span className={styles.chip}>Todo al día</span>}
            </div>
            <div className={styles.kpi}>
              <div className={styles['kpi-head']}><span>Ingresos de hoy</span><i>💵</i></div>
              <p className={styles['kpi-value']}>{formatPrice(stats?.today_revenue ?? 0)}</p>
              <span className={styles['kpi-foot']}>{todayCount} pedido{todayCount !== 1 ? 's' : ''} hoy · incluye domicilio</span>
            </div>
            <div className={styles.kpi}>
              <div className={styles['kpi-head']}><span>En curso</span><i>🛵</i></div>
              <p className={styles['kpi-value']}>{inProgress}<small> en preparación o camino</small></p>
              <span className={styles['kpi-foot']}>{byStatus.preparado || 0} preparando • {byStatus.asignado || 0} en camino</span>
            </div>
            <div className={styles.kpi}>
              <div className={styles['kpi-head']}><span>Completados</span><i>✅</i></div>
              <p className={styles['kpi-value']}>{byStatus.entregado || 0}<small> de {totalOrders} totales</small></p>
              <span className={styles['kpi-foot']}>
                {totalOrders ? Math.round(((byStatus.entregado || 0) / totalOrders) * 100) : 0}% entregados
              </span>
            </div>
          </section>

          {/* Tabla */}
          <section className={styles.panel}>
            <div className={styles.tabs} role="tablist">
              {TABS.filter(t => !['rechazado', 'cancelado'].includes(t.id) || counts[t.id]).map(t => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={[styles.tab, tab === t.id ? styles.active : ''].join(' ')}
                  onClick={() => selectTab(t.id)}
                >
                  {t.label}
                  {t.id === 'pendiente'
                    ? counts.pendiente > 0 && <b className={styles['tab-alert']}>{counts.pendiente}</b>
                    : <span className={styles['tab-count']}>({counts[t.id] || 0})</span>}
                </button>
              ))}
            </div>

            <div className={styles['table-wrap']}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Productos</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th className={styles['col-actions']}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && orders.length === 0 ? (
                    <tr><td colSpan={6} className={styles.empty}>Cargando pedidos…</td></tr>
                  ) : pageOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={styles.empty}>
                        {!online && orders.length === 0
                          ? '📡 No pudimos conectar con el backend. Revisa que esté corriendo en el puerto 8000.'
                          : tab === 'pendiente' && !term ? '🎉 No hay pedidos pendientes por ahora.' : 'No hay pedidos que coincidan.'}
                      </td>
                    </tr>
                  ) : pageOrders.map(order => {
                    const meta = STATUS_META[order.status] ?? { label: order.status, tone: 'progress' };
                    const created = parseServerDate(order.created_at);
                    const { names, units } = describeItems(order.items);
                    const busy = busyId === order.id;
                    return (
                      <tr key={order.id} className={busy ? styles.busy : ''}>
                        <td>
                          <div className={styles['order-id']}>
                            <span className={[styles.dot, styles[`dot-${meta.tone}`]].join(' ')} />
                            <strong>{formatOrderId(order.id)}</strong>
                          </div>
                          <small className={styles.muted}>{timeAgo(created, now)}</small>
                        </td>
                        <td>
                          {/* La dirección va debajo del cliente para que la tabla quepa sin scroll en portátiles */}
                          <div className={styles.client}>
                            <span className={styles['client-avatar']}>{initials(order.customer?.name)}</span>
                            <div>
                              <strong>{order.customer?.name ?? `Cliente #${order.user_id}`}</strong>
                              <div className={[styles.address, styles.muted].join(' ')}>
                                <IconMapPin size={13} />
                                <span>{order.delivery_address}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p className={styles.products} title={names}>{names}</p>
                          <span className={styles['items-chip']}>{units} unidad{units !== 1 ? 'es' : ''}</span>
                        </td>
                        <td className={styles.total}>{formatPrice(order.total_price)}</td>
                        <td>
                          <span className={[styles.status, styles[`status-${meta.tone}`]].join(' ')}>
                            {meta.tone === 'done' ? <IconCheck size={12} /> : <span className={styles['status-dot']} />}
                            {meta.label}
                          </span>
                        </td>
                        <td className={styles['col-actions']}>
                          {order.status !== 'pendiente' ? (
                            <span className={styles.muted}>{courierNote(order)}</span>
                          ) : confirmRejectId === order.id ? (
                            <form
                              className={styles.confirm}
                              onSubmit={e => { e.preventDefault(); if (rejectReason.trim().length >= 3) changeStatus(order, 'rechazado'); }}
                            >
                              <input
                                className={styles['reason-input']}
                                placeholder="Motivo (lo verá el cliente)"
                                aria-label="Motivo del rechazo"
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                maxLength={300}
                                disabled={busy}
                                autoFocus
                              />
                              <button type="submit" className={styles['btn-danger']} disabled={busy || rejectReason.trim().length < 3}>
                                {busy ? '…' : 'Rechazar'}
                              </button>
                              <button type="button" className={styles['btn-ghost']} onClick={() => setConfirmRejectId(null)} disabled={busy}>No</button>
                            </form>
                          ) : (
                            <div className={styles.actions}>
                              <button type="button" className={styles['btn-accept']} onClick={() => changeStatus(order, 'preparado')} disabled={busy}>
                                {busy ? '…' : <><IconCheck size={13} /> Aceptar</>}
                              </button>
                              <button type="button" className={styles['btn-reject']} onClick={() => openReject(order.id)} disabled={busy}>
                                ✕ Rechazar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <span>
                Mostrando <strong>{visible.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, visible.length)}</strong> de <strong>{visible.length}</strong> pedidos
              </span>
              <div className={styles.pages}>
                <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>‹ Anterior</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    className={n === currentPage ? styles.active : ''}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages}>Siguiente ›</button>
              </div>
            </div>
          </section>
        </div>

      {toast && (
        <div className={[styles.toast, styles[`toast-${toast.type}`]].join(' ')} role="status">
          {toast.text}
        </div>
      )}
    </AdminLayout>
  );
}
