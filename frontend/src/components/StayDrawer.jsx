import { useEffect, useRef } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';
import { MAX_EXTRA_QTY } from '../hooks/useStay';
import { formatPrice } from '../utils/format';
import { formatStayDate, todayISO } from '../utils/dates';
import { MAX_GUESTS } from '../utils/stay';
import styles from '../pages/catalog/Catalog.module.css';

const PER_LABEL = { noche: 'por noche', persona_noche: 'por persona y noche', estadia: 'por estadía' };

export default function StayDrawer({ open, onClose, stay, notice, onReserve }) {
  const { items, count, totals, canReserve, extrasCatalog, update, changeExtra, remove } = stay;

  const closeRef = useRef(null);
  const { recheck } = stay;

  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, { active: open, initialFocusRef: closeRef, onEscape: onClose });

  // Reintento de disponibilidad al abrir
  useEffect(() => {
    if (open) recheck();
  }, [open, recheck]);

  if (!open) return null;

  const today = todayISO();

  return (
    <div className={styles['cart-overlay']} onClick={onClose}>
      <div className={styles['cart-drawer']} ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Mi estadía" onClick={e => e.stopPropagation()}>

        <div className={styles['cart-drawer-header']}>
          <div>
            <h3>Mi estadía</h3>
            <span className={styles['cart-drawer-count']}>
              {count} habitaci{count !== 1 ? 'ones' : 'ón'}
            </span>
          </div>
          <button ref={closeRef} className={styles['cart-close-btn']} onClick={onClose} aria-label="Cerrar Mi estadía">✕</button>
        </div>

        {notice && <p className={styles['cart-notice']} role="status">{notice}</p>}

        <div className={styles['cart-drawer-items']}>
          {count === 0 ? (
            <div className={styles['cart-empty']}>
              <span className={styles['cart-empty-icon']}>🛏️</span>
              <p>Tu estadía está vacía</p>
              <span>Busca habitaciones, elige tus fechas y agrégalas aquí</span>
            </div>
          ) : (
            items.map(item => {
              const { roomType: room, uid } = item;
              if (item.gone) {
                // Tipo desactivado o eliminado: solo se puede quitar
                return (
                  <div key={uid} className={styles['stay-item']}>
                    <div className={styles['stay-item-top']}>
                      <div className={styles['cart-item-info']}>
                        <p className={styles['cart-item-name']}>Habitación no disponible</p>
                        <p className={styles['cart-item-unit']}>{formatStayDate(item.checkIn)} → {formatStayDate(item.checkOut)}</p>
                      </div>
                      <button className={styles['cart-remove-btn']} onClick={() => remove(uid)} aria-label="Quitar habitación no disponible de tu estadía">🗑</button>
                    </div>
                    <p className={styles['stay-problem']} role="alert">{item.error}</p>
                  </div>
                );
              }
              const isPackage = room.category === 'paquete';
              const maxGuests = Math.min(MAX_GUESTS, room.capacity);
              const problem = item.error
                || (item.status === 'unavailable' && 'Sin disponibilidad para estas fechas')
                || (item.status === 'error' && 'No pudimos verificar la disponibilidad');
              return (
                <div key={uid} className={styles['stay-item']}>
                  <div className={styles['stay-item-top']}>
                    {room.images?.[0] && <img src={room.images[0]} alt="" className={styles['cart-item-img']} />}
                    <div className={styles['cart-item-info']}>
                      <p className={styles['cart-item-name']}>{room.name}</p>
                      <p className={styles['cart-item-unit']}>
                        {item.quote
                          ? `${formatStayDate(item.checkIn)} → ${formatStayDate(item.checkOut)} · ${item.quote.nights} noche${item.quote.nights !== 1 ? 's' : ''}`
                          : 'Revisa tus fechas'}
                      </p>
                    </div>
                    <button className={styles['cart-remove-btn']} onClick={() => remove(uid)} aria-label={`Quitar ${room.name} de tu estadía`}>🗑</button>
                  </div>

                  <div className={styles['stay-fields']}>
                    <div className={styles['stay-field']}>
                      <label htmlFor={`in-${uid}`}>Llegada</label>
                      <input id={`in-${uid}`} type="date" min={today} value={item.checkIn}
                        aria-invalid={Boolean(problem)}
                        onChange={e => update(uid, { checkIn: e.target.value })} />
                    </div>
                    <div className={styles['stay-field']}>
                      <label htmlFor={`out-${uid}`}>Salida</label>
                      <input id={`out-${uid}`} type="date" min={item.checkIn || today} value={item.checkOut}
                        disabled={isPackage}
                        aria-invalid={Boolean(problem)}
                        onChange={e => update(uid, { checkOut: e.target.value })} />
                    </div>
                    <div className={styles['stay-field']}>
                      <label htmlFor={`guests-${uid}`}>Huéspedes</label>
                      <select id={`guests-${uid}`} value={item.guests} onChange={e => update(uid, { guests: e.target.value })}>
                        {Array.from({ length: maxGuests }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                        {item.guests > maxGuests && <option value={item.guests}>{item.guests}</option>}
                      </select>
                    </div>
                  </div>
                  {isPackage && <p className={styles['stay-hint']}>Paquete de {room.nights} noches: la salida se ajusta sola.</p>}
                  {problem && <p className={styles['stay-problem']} role="alert">{problem}</p>}

                  <div className={styles['stay-extras']}>
                    <p className={styles['stay-extras-title']}>Extras</p>
                    {extrasCatalog.map(extra => {
                      const qty = item.extras.find(x => x.extra.id === extra.id)?.qty ?? 0;
                      return (
                        <div key={extra.id} className={styles['stay-extra-row']}>
                          <div className={styles['cart-item-info']}>
                            <p className={styles['stay-extra-name']}>{extra.name}</p>
                            <p className={styles['cart-item-unit']}>{formatPrice(extra.price)} {PER_LABEL[extra.per]}</p>
                          </div>
                          <div className={styles['cart-item-controls']}>
                            <button className={styles['qty-btn']} onClick={() => changeExtra(uid, extra.id, -1)} disabled={qty === 0}
                              aria-label={`Quitar ${extra.name}`}>−</button>
                            <span className={styles['qty-value']}>{qty}</span>
                            <button className={styles['qty-btn']} onClick={() => changeExtra(uid, extra.id, +1)} disabled={qty >= MAX_EXTRA_QTY}
                              aria-label={`Agregar ${extra.name}`}>+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {item.quote && <p className={styles['cart-item-price']}>Total de esta habitación: {formatPrice(item.quote.total)}</p>}
                </div>
              );
            })
          )}
        </div>

        {count > 0 && (
          <div className={styles['cart-drawer-footer']}>
            <div className={styles['cart-summary-row']}>
              <span>Alojamiento ({totals.nights} noche{totals.nights !== 1 ? 's' : ''})</span>
              <span>{formatPrice(totals.subtotal)}</span>
            </div>
            <div className={styles['cart-summary-row']}>
              <span>Extras</span>
              <span>{formatPrice(totals.extras_total)}</span>
            </div>
            <div className={styles['cart-summary-row']}>
              <span>IVA (19 %)</span>
              <span>{formatPrice(totals.taxes)}</span>
            </div>
            <div className={styles['cart-summary-divider']} />
            <div className={[styles['cart-summary-row'], styles['cart-total-row']].join(' ')}>
              <span>Total</span>
              <span>{formatPrice(totals.total)}</span>
            </div>
            <button
              className={[styles['btn-primary'], styles['btn-checkout']].join(' ')}
              onClick={onReserve}
              disabled={!canReserve}
            >
              Reservar →
            </button>
            {!canReserve && items.some(i => i.status === 'invalid' || i.status === 'unavailable') && (
              <p className={styles['stay-footer-hint']}>Revisa las habitaciones marcadas para continuar. El total no las incluye.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
