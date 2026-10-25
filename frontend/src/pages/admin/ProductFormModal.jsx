import { useEffect, useState } from 'react';
import { CATEGORIES } from '../../utils/categories';
import styles from './Admin.module.css';

const EMPTY = {
  name: '', category: 'frutas', price: '', old_price: '', stock: '0',
  unit: '', tag: '', origin: '', image_url: '', description: '',
};

function toForm(product) {
  if (!product) return EMPTY;
  const text = (v) => (v === null || v === undefined ? '' : String(v));
  return {
    name: text(product.name), category: product.category || 'frutas', price: text(product.price),
    old_price: text(product.old_price), stock: text(product.stock), unit: text(product.unit), tag: text(product.tag),
    origin: text(product.origin), image_url: text(product.image_url), description: text(product.description),
  };
}

function validate(form) {
  if (form.name.trim().length < 2) return 'Escribe el nombre del producto';
  if (!(Number(form.price) > 0)) return 'El precio debe ser mayor que 0';
  if (form.old_price && Number(form.old_price) <= Number(form.price)) {
    return 'El precio anterior debe ser mayor que el precio actual para mostrarse como oferta';
  }
  if (!(Number(form.stock) >= 0)) return 'El stock no puede ser negativo';
  if (form.image_url && !/^https?:\/\/\S+$/.test(form.image_url.trim())) {
    return 'La imagen debe ser un enlace que empiece por http:// o https://';
  }
  return '';
}

// Formulario para crear (product = null) o editar un producto
export default function ProductFormModal({ product, onClose, onSave }) {
  const [form, setForm] = useState(() => toForm(product));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const editing = Boolean(product);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const setField = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    if (field === 'image_url') setImageFailed(false);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const problem = validate(form);
    if (problem) { setError(problem); return; }
    setError('');
    setSaving(true);
    try {
      await onSave({
        ...form,
        price: Number(form.price),
        old_price: form.old_price ? Number(form.old_price) : null,
        stock: Number(form.stock),
        is_active: product?.is_active ?? true,
      });
    } catch (err) {
      setError(err instanceof TypeError ? 'Sin conexión con el servidor. Intenta de nuevo.' : err.message);
      setSaving(false);
    }
  }

  const imageUrl = form.image_url.trim();

  return (
    <div className={styles['modal-overlay']} onClick={() => !saving && onClose()}>
      <form
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className={styles['modal-head']}>
          <div>
            <h2 id="product-form-title">{editing ? 'Editar producto' : 'Nuevo producto'}</h2>
            <p>{editing ? 'Los cambios se ven en el catálogo de inmediato.' : 'Aparecerá en el catálogo apenas lo guardes.'}</p>
          </div>
          <button type="button" className={styles['modal-close']} onClick={onClose} disabled={saving} aria-label="Cerrar">✕</button>
        </div>

        <div className={styles['modal-body']}>
          <div className={styles['image-row']}>
            <div className={styles.preview}>
              {imageUrl && !imageFailed
                ? <img src={imageUrl} alt="" onError={() => setImageFailed(true)} />
                : <span>{imageFailed ? 'Imagen no disponible' : 'Sin imagen'}</span>}
            </div>
            <label className={styles.field}>
              <span className={styles.label}>URL de la imagen <em>(opcional)</em></span>
              <input className={styles.input} value={form.image_url} onChange={setField('image_url')} placeholder="https://…" disabled={saving} />
            </label>
          </div>

          <div className={styles['form-grid']}>
            <label className={[styles.field, styles['field-wide']].join(' ')}>
              <span className={styles.label}>Nombre</span>
              <input className={styles.input} value={form.name} onChange={setField('name')} placeholder="Ej. Aguacate Hass Maduro" maxLength={120} disabled={saving} autoFocus />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Categoría</span>
              <select className={styles.input} value={form.category} onChange={setField('category')} disabled={saving}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Unidad <em>(opcional)</em></span>
              <input className={styles.input} value={form.unit} onChange={setField('unit')} placeholder="Ej. x 500g" maxLength={40} disabled={saving} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Precio (COP)</span>
              <input className={styles.input} type="number" min="1" step="1" value={form.price} onChange={setField('price')} placeholder="4500" disabled={saving} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Precio anterior <em>(para ofertas)</em></span>
              <input className={styles.input} type="number" min="1" step="1" value={form.old_price} onChange={setField('old_price')} placeholder="Vacío si no está en oferta" disabled={saving} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Stock disponible</span>
              <input className={styles.input} type="number" min="0" step="1" value={form.stock} onChange={setField('stock')} disabled={saving} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Etiqueta <em>(opcional)</em></span>
              <input className={styles.input} value={form.tag} onChange={setField('tag')} placeholder="Ej. Orgánico, Popular" maxLength={40} disabled={saving} />
            </label>
            <label className={[styles.field, styles['field-wide']].join(' ')}>
              <span className={styles.label}>Origen <em>(opcional)</em></span>
              <input className={styles.input} value={form.origin} onChange={setField('origin')} placeholder="Ej. 🌿 Cosecha Nacional" maxLength={60} disabled={saving} />
            </label>
            <label className={[styles.field, styles['field-wide']].join(' ')}>
              <span className={styles.label}>Descripción <em>(opcional)</em></span>
              <textarea className={[styles.input, styles.textarea].join(' ')} value={form.description} onChange={setField('description')} rows={2} maxLength={1000} disabled={saving} />
            </label>
          </div>

          {error && <p className={styles['form-error']} role="alert">{error}</p>}
        </div>

        <div className={styles['modal-foot']}>
          <button type="button" className={styles['btn-ghost']} onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className={styles['btn-refresh']} disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </form>
    </div>
  );
}
