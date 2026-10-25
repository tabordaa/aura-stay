import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconCheck, IconPlus } from '../../components/Icons';
import { productService } from '../../services/product.service';
import { categoryLabel } from '../../utils/categories';
import { formatPrice } from '../../utils/format';
import AdminLayout from './AdminLayout';
import ProductFormModal from './ProductFormModal';
import styles from './Admin.module.css';

// A partir de este número de unidades se avisa que hay que reponer
const LOW_STOCK = 10;

const TABS = [
  { id: 'todos',     label: 'Todos' },
  { id: 'activos',   label: 'Activos' },
  { id: 'bajo',      label: 'Stock bajo' },
  { id: 'inactivos', label: 'Inactivos' },
];

function matchesTab(product, tab) {
  if (tab === 'activos') return product.is_active;
  if (tab === 'bajo') return product.is_active && product.stock <= LOW_STOCK;
  if (tab === 'inactivos') return !product.is_active;
  return true;
}

function StockBadge({ stock }) {
  if (stock === 0) return <span className={[styles.status, styles['status-pending']].join(' ')}>Agotado</span>;
  if (stock <= LOW_STOCK) return <span className={[styles.status, styles['status-progress']].join(' ')}>{stock} · bajo</span>;
  return <span className={styles['stock-ok']}>{stock} uds</span>;
}

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('todos');
  const [editing, setEditing] = useState(null); // null: cerrado · 'new' · producto
  const [busyId, setBusyId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [toast, setToast] = useState(null);

  const loadProducts = useCallback(() => productService.getManagedProducts()
    .then(list => { setProducts(list); setOnline(true); })
    .catch(() => setOnline(false))
    .finally(() => setLoading(false)), []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const replaceProduct = (updated) => setProducts(list => {
    const exists = list.some(p => p.id === updated.id);
    return exists ? list.map(p => (p.id === updated.id ? updated : p)) : [...list, updated];
  });

  async function saveProduct(payload) {
    const isNew = editing === 'new';
    const saved = isNew
      ? await productService.createProduct(payload)
      : await productService.updateProduct(editing.id, payload);
    replaceProduct(saved);
    setEditing(null);
    setToast({ type: 'success', text: isNew ? `"${saved.name}" agregado al catálogo` : `"${saved.name}" actualizado` });
  }

  async function setActive(product, active) {
    setBusyId(product.id);
    setConfirmId(null);
    try {
      if (active) {
        replaceProduct(await productService.updateProduct(product.id, { ...product, is_active: true }));
      } else {
        await productService.deactivateProduct(product.id);
        replaceProduct({ ...product, is_active: false });
      }
      setToast({
        type: active ? 'success' : 'warning',
        text: active ? `"${product.name}" vuelve al catálogo` : `"${product.name}" ya no se muestra en el catálogo`,
      });
    } catch (err) {
      setToast({ type: 'error', text: err instanceof TypeError ? 'Sin conexión con el servidor. Intenta de nuevo.' : err.message });
    } finally {
      setBusyId(null);
    }
  }

  const stats = useMemo(() => {
    const active = products.filter(p => p.is_active);
    return {
      active: active.length,
      inactive: products.length - active.length,
      low: active.filter(p => p.stock > 0 && p.stock <= LOW_STOCK).length,
      out: active.filter(p => p.stock === 0).length,
      inventoryValue: active.reduce((acc, p) => acc + p.price * p.stock, 0),
      units: active.reduce((acc, p) => acc + p.stock, 0),
    };
  }, [products]);

  const counts = useMemo(() => Object.fromEntries(TABS.map(t => [t.id, products.filter(p => matchesTab(p, t.id)).length])), [products]);

  const term = search.trim().toLowerCase();
  const visible = products
    .filter(p => matchesTab(p, tab))
    .filter(p => !term || [p.name, categoryLabel(p.category), p.tag, p.origin].some(v => v?.toLowerCase().includes(term)));

  return (
    <AdminLayout
      active="products"
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Buscar producto por nombre, categoría o etiqueta…"
      online={online}
    >
      <div className={styles.content}>
        <div className={styles['page-head']}>
          <div>
            <h1><span className={styles['title-dot']} /> Catálogo de productos</h1>
            <p>Crea, edita y controla el stock de lo que ven tus clientes en la tienda.</p>
          </div>
          <div className={styles['refresh-group']}>
            <button type="button" className={styles['btn-refresh']} onClick={() => setEditing('new')}>
              <IconPlus size={14} /> Nuevo producto
            </button>
          </div>
        </div>

        {/* Indicadores */}
        <section className={styles.kpis}>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>En el catálogo</span><i>🛒</i></div>
            <p className={styles['kpi-value']}>{stats.active}<small> productos activos</small></p>
            <span className={styles['kpi-foot']}>{stats.inactive} desactivado{stats.inactive !== 1 ? 's' : ''}</span>
          </div>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>Stock bajo</span><i>📉</i></div>
            <p className={styles['kpi-value']}>{stats.low}<small> por reponer</small></p>
            {stats.low > 0
              ? <span className={[styles.chip, styles['chip-alert']].join(' ')}>● {LOW_STOCK} unidades o menos</span>
              : <span className={styles.chip}>Todo abastecido</span>}
          </div>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>Agotados</span><i>🚫</i></div>
            <p className={styles['kpi-value']}>{stats.out}<small> sin unidades</small></p>
            <span className={styles['kpi-foot']}>Los clientes no pueden pedirlos</span>
          </div>
          <div className={styles.kpi}>
            <div className={styles['kpi-head']}><span>Valor del inventario</span><i>📦</i></div>
            <p className={styles['kpi-value']}>{formatPrice(stats.inventoryValue)}</p>
            <span className={styles['kpi-foot']}>{stats.units} unidades en bodega</span>
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
                {t.id === 'bajo'
                  ? counts.bajo > 0 && <b className={styles['tab-alert']}>{counts.bajo}</b>
                  : <span className={styles['tab-count']}>({counts[t.id]})</span>}
              </button>
            ))}
          </div>

          <div className={styles['table-wrap']}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th className={styles['col-actions']}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading && products.length === 0 ? (
                  <tr><td colSpan={6} className={styles.empty}>Cargando productos…</td></tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.empty}>
                      {!online && products.length === 0
                        ? '📡 No pudimos conectar con el backend. Revisa que esté corriendo en el puerto 8000.'
                        : 'No hay productos que coincidan.'}
                    </td>
                  </tr>
                ) : visible.map(product => {
                  const busy = busyId === product.id;
                  return (
                    <tr key={product.id} className={[busy ? styles.busy : '', product.is_active ? '' : styles.inactive].join(' ')}>
                      <td>
                        <div className={styles['product-cell']}>
                          <span className={styles['product-thumb']}>
                            {product.image_url ? <img src={product.image_url} alt="" /> : '🛒'}
                          </span>
                          <div>
                            <strong>{product.name}</strong>
                            <small className={styles.muted}>{[product.unit, product.tag].filter(Boolean).join(' • ') || '—'}</small>
                          </div>
                        </div>
                      </td>
                      <td>{categoryLabel(product.category)}</td>
                      <td className={styles.total}>
                        {product.old_price && <s className={styles['price-old']}>{formatPrice(product.old_price)}</s>}
                        {formatPrice(product.price)}
                      </td>
                      <td><StockBadge stock={product.stock} /></td>
                      <td>
                        <span className={[styles.status, styles[product.is_active ? 'status-done' : 'status-rejected']].join(' ')}>
                          {product.is_active ? <IconCheck size={12} /> : <span className={styles['status-dot']} />}
                          {product.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className={styles['col-actions']}>
                        {confirmId === product.id ? (
                          <div className={styles.confirm}>
                            <span>¿Ocultar del catálogo?</span>
                            <button type="button" className={styles['btn-danger']} onClick={() => setActive(product, false)} disabled={busy}>Sí</button>
                            <button type="button" className={styles['btn-ghost']} onClick={() => setConfirmId(null)} disabled={busy}>No</button>
                          </div>
                        ) : (
                          <div className={styles.actions}>
                            <button type="button" className={styles['btn-ghost']} onClick={() => setEditing(product)} disabled={busy}>Editar</button>
                            {product.is_active
                              ? <button type="button" className={styles['btn-reject']} onClick={() => setConfirmId(product.id)} disabled={busy}>Desactivar</button>
                              : <button type="button" className={styles['btn-accept']} onClick={() => setActive(product, true)} disabled={busy}>Activar</button>}
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

      {editing && (
        <ProductFormModal
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={saveProduct}
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
