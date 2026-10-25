import { useRef, useState } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import { AMENITIES, CATEGORIES } from '../../utils/categories';
import { ROOM_LIMITS, isHttps, validateRoomType } from '../../utils/validation';
import styles from './Admin.module.css';

const EMPTY = {
  name: '', category: 'habitacion', price: '', old_price: '', nights: '2', includes: '', capacity: '2', units: '1',
  size_m2: '', beds: '', amenities: [], images: [''], tag: '', description: '', room_type_id: '',
};

const text = (v) => (v === null || v === undefined ? '' : String(v));

function toForm(room, category) {
  if (!room) return { ...EMPTY, category: category || 'habitacion' };
  return {
    name: text(room.name), category: room.category,
    price: text(room.category === 'paquete' ? room.price : room.price_per_night),
    old_price: text(room.old_price), nights: text(room.nights ?? 2),
    includes: (room.includes ?? []).join('\n'),
    capacity: text(room.capacity), units: text(room.units), size_m2: text(room.size_m2), beds: text(room.beds),
    amenities: [...(room.amenities ?? [])], images: room.images?.length ? [...room.images] : [''],
    tag: text(room.tag), description: text(room.description), room_type_id: text(room.room_type_id),
  };
}

// Convierte el estado del formulario al payload del servicio (que vuelve a validar)
function toPayload(form) {
  const isPackage = form.category === 'paquete';
  const payload = {
    name: form.name, category: form.category, old_price: form.old_price, capacity: form.capacity, units: form.units,
    size_m2: form.size_m2, beds: form.beds, amenities: form.amenities, tag: form.tag, description: form.description,
    images: form.images.map((u) => u.trim()).filter(Boolean),
  };
  if (isPackage) {
    payload.price = form.price;
    payload.nights = form.nights;
    payload.includes = form.includes.split('\n').map((t) => t.trim()).filter(Boolean);
    payload.room_type_id = form.room_type_id;
  } else {
    payload.price_per_night = form.price;
  }
  return payload;
}

// Formulario para crear (room = null) o editar un tipo de habitación o paquete
export default function RoomTypeFormModal({ room, defaultCategory, baseTypes = [], onClose, onSave }) {
  const [form, setForm] = useState(() => toForm(room, defaultCategory));
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [failedImages, setFailedImages] = useState({});
  const editing = Boolean(room);
  const isPackage = form.category === 'paquete';
  // Tras el primer intento de guardar, los errores se actualizan mientras se escribe
  const errors = submitted ? validateRoomType(toPayload(form)) : {};

  const dialogRef = useRef(null);
  const nameRef = useRef(null);
  useFocusTrap(dialogRef, { initialFocusRef: nameRef, onEscape: saving ? undefined : onClose });

  const setField = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const toggleAmenity = (key) => setForm((f) => ({
    ...f,
    amenities: f.amenities.includes(key) ? f.amenities.filter((a) => a !== key) : [...f.amenities, key],
  }));
  const setImage = (i, value) => {
    setForm((f) => ({ ...f, images: f.images.map((u, j) => (j === i ? value : u)) }));
    setFailedImages((m) => ({ ...m, [i]: false }));
  };
  const removeImage = (i) => {
    setForm((f) => ({ ...f, images: f.images.length > 1 ? f.images.filter((_, j) => j !== i) : [''] }));
    setFailedImages({});
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setServerError('');
    if (Object.keys(validateRoomType(toPayload(form))).length > 0) return;
    setSaving(true);
    try {
      await onSave(toPayload(form));
    } catch (err) {
      setServerError(err.message);
      setSaving(false);
    }
  }

  // Props comunes de accesibilidad para un campo con posible error
  const a11y = (key) => ({
    'aria-invalid': errors[key] ? 'true' : undefined,
    'aria-describedby': errors[key] ? `rt-${key}-error` : undefined,
  });
  const fieldError = (key) => errors[key] && <span id={`rt-${key}-error`} className={styles['field-error']}>{errors[key]}</span>;
  const title = editing
    ? (isPackage ? 'Editar paquete' : 'Editar habitación')
    : (isPackage ? 'Nuevo paquete' : 'Nuevo tipo de habitación');

  return (
    <div className={styles['modal-overlay']} onClick={() => !saving && onClose()}>
      <form
        className={styles.modal}
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-form-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        noValidate
      >
        <div className={styles['modal-head']}>
          <div>
            <h2 id="room-form-title">{title}</h2>
            <p>{editing ? 'Los cambios se ven en el catálogo de inmediato.' : 'Aparecerá en el catálogo apenas lo guardes.'}</p>
          </div>
          <button type="button" className={styles['modal-close']} onClick={onClose} disabled={saving} aria-label="Cerrar">✕</button>
        </div>

        <div className={styles['modal-body']}>
          <div className={styles['form-grid']}>
            <div className={[styles.field, styles['field-wide']].join(' ')}>
              <label className={styles.label} htmlFor="rt-name">Nombre</label>
              <input id="rt-name" className={styles.input} value={form.name} onChange={setField('name')} placeholder="Ej. Suite con Jacuzzi" maxLength={ROOM_LIMITS.nameMax} disabled={saving} ref={nameRef} {...a11y('name')} />
              {fieldError('name')}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="rt-category">Categoría</label>
              <select id="rt-category" className={styles.input} value={form.category} onChange={setField('category')} disabled={saving} {...a11y('category')}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
              {fieldError('category')}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="rt-price">{isPackage ? 'Precio total del paquete (COP)' : 'Precio por noche (COP)'}</label>
              <input id="rt-price" className={styles.input} type="number" min="1" step="1" inputMode="numeric" value={form.price} onChange={setField('price')} placeholder="320000" disabled={saving} {...a11y('price')} />
              {fieldError('price')}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="rt-old_price">Precio anterior <em>(para ofertas)</em></label>
              <input id="rt-old_price" className={styles.input} type="number" min="1" step="1" inputMode="numeric" value={form.old_price} onChange={setField('old_price')} placeholder="Vacío si no hay oferta" disabled={saving} {...a11y('old_price')} />
              {fieldError('old_price')}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="rt-tag">Etiqueta <em>(opcional)</em></label>
              <input id="rt-tag" className={styles.input} value={form.tag} onChange={setField('tag')} placeholder="Ej. Nuevo, Más reservada" maxLength={ROOM_LIMITS.tagMax} disabled={saving} {...a11y('tag')} />
              {fieldError('tag')}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="rt-capacity">Capacidad (huéspedes)</label>
              <input id="rt-capacity" className={styles.input} type="number" min="1" max={ROOM_LIMITS.capacityMax} step="1" value={form.capacity} onChange={setField('capacity')} disabled={saving} {...a11y('capacity')} />
              {fieldError('capacity')}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="rt-units">Habitaciones de este tipo</label>
              <input id="rt-units" className={styles.input} type="number" min="1" max={ROOM_LIMITS.unitsMax} step="1" value={form.units} onChange={setField('units')} disabled={saving} {...a11y('units')} />
              {fieldError('units')}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="rt-size">Tamaño (m²)</label>
              <input id="rt-size" className={styles.input} type="number" min="1" step="1" value={form.size_m2} onChange={setField('size_m2')} disabled={saving} {...a11y('size_m2')} />
              {fieldError('size_m2')}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="rt-beds">Camas</label>
              <input id="rt-beds" className={styles.input} value={form.beds} onChange={setField('beds')} placeholder="Ej. 1 cama king" maxLength={60} disabled={saving} {...a11y('beds')} />
              {fieldError('beds')}
            </div>

            {isPackage && (
              <>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="rt-nights">Noches incluidas</label>
                  <input id="rt-nights" className={styles.input} type="number" min="1" max={ROOM_LIMITS.nightsMax} step="1" value={form.nights} onChange={setField('nights')} disabled={saving} {...a11y('nights')} />
                  {fieldError('nights')}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="rt-base">Habitación base <em>(opcional)</em></label>
                  <select id="rt-base" className={styles.input} value={form.room_type_id} onChange={setField('room_type_id')} disabled={saving}>
                    <option value="">Sin habitación base</option>
                    {baseTypes.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_active ? '' : ' (inactiva)'}</option>)}
                  </select>
                </div>
                <div className={[styles.field, styles['field-wide']].join(' ')}>
                  <label className={styles.label} htmlFor="rt-includes">Qué incluye <em>(un ítem por línea)</em></label>
                  <textarea id="rt-includes" className={[styles.input, styles.textarea].join(' ')} value={form.includes} onChange={setField('includes')} rows={3} placeholder={'Cena romántica\nMasaje en pareja'} disabled={saving} {...a11y('includes')} />
                  {fieldError('includes')}
                </div>
              </>
            )}

            <div className={[styles.field, styles['field-wide']].join(' ')}>
              <label className={styles.label} htmlFor="rt-description">Descripción <em>(opcional)</em></label>
              <textarea id="rt-description" className={[styles.input, styles.textarea].join(' ')} value={form.description} onChange={setField('description')} rows={2} maxLength={ROOM_LIMITS.descMax} disabled={saving} {...a11y('description')} />
              {fieldError('description')}
            </div>

            <fieldset className={[styles.field, styles['field-wide'], styles.fieldset].join(' ')} disabled={saving}>
              <legend className={styles.label}>Comodidades</legend>
              <div className={styles['check-grid']}>
                {Object.entries(AMENITIES).map(([key, label]) => (
                  <label key={key} className={styles.check}>
                    <input type="checkbox" checked={form.amenities.includes(key)} onChange={() => toggleAmenity(key)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              {fieldError('amenities')}
            </fieldset>

            <fieldset className={[styles.field, styles['field-wide'], styles.fieldset].join(' ')} disabled={saving}>
              <legend className={styles.label}>Imágenes <em>(enlaces https; la primera es la portada)</em></legend>
              <div className={styles['image-list']}>
                {form.images.map((url, i) => (
                  <div key={i} className={styles['image-item']}>
                    <span className={styles['preview-sm']}>
                      {/* Solo se previsualizan URLs https válidas: no se cargan enlaces que el formulario rechaza */}
                      {isHttps(url) && !failedImages[i]
                        ? <img src={url.trim()} alt="" onError={() => setFailedImages((m) => ({ ...m, [i]: true }))} />
                        : <span aria-hidden="true">🖼️</span>}
                    </span>
                    <input
                      className={styles.input}
                      aria-label={`URL de la imagen ${i + 1}`}
                      value={url}
                      onChange={(e) => setImage(i, e.target.value)}
                      placeholder="https://…"
                      {...a11y('images')}
                    />
                    <button type="button" className={styles['btn-ghost']} onClick={() => removeImage(i)} aria-label={`Quitar imagen ${i + 1}`}>Quitar</button>
                  </div>
                ))}
              </div>
              {fieldError('images')}
              <button type="button" className={[styles['btn-ghost'], styles['btn-add']].join(' ')} onClick={() => setForm((f) => ({ ...f, images: [...f.images, ''] }))}>
                + Agregar imagen
              </button>
            </fieldset>
          </div>

          {serverError && <p className={styles['form-error']} role="alert">{serverError}</p>}
        </div>

        <div className={styles['modal-foot']}>
          <button type="button" className={styles['btn-ghost']} onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className={styles['btn-refresh']} disabled={saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : isPackage ? 'Crear paquete' : 'Crear tipo'}
          </button>
        </div>
      </form>
    </div>
  );
}
