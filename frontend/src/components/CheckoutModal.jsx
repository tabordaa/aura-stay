import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { IconMapPin, IconLock, IconShield, IconCheck, IconArrowRight, IconPhone, IconTruck } from './Icons';
import PaymentCardForm from './PaymentCardForm';
import { BRAND_LABELS, detectBrand, onlyDigits, validateCard } from './cardUtils';
import { formatOrderId, formatPrice } from '../utils/format';
import { useAuth } from '../hooks/useAuth';
import { useStoreConfig } from '../hooks/useStoreConfig';
import { LocationPicker } from './maps/LazyMaps';
import { orderService } from '../services/order.service';
import styles from './CheckoutModal.module.css';

// Tiempo que dura la simulación de "aprobando pago con el banco"
const CARD_PROCESSING_MS = 1800;

const EMPTY_CARD = { number: '', name: '', expiry: '', cvv: '' };
const EMPTY_DELIVERY = { address: '', detail: '', phone: '', notes: '' };
const STEPS = ['Carrito', 'Entrega', 'Pago', 'Confirmación'];
const TRACKING = ['Recibido', 'Preparando', 'En camino', 'Entregado'];

function formatPhone(digits) {
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean).join(' ');
}

// Billetes sugeridos para pagar en efectivo, siempre por encima del total
function cashSuggestions(total) {
  const rounded = [10000, 20000, 50000, 100000].map(bill => Math.ceil(total / bill) * bill);
  return [...new Set(rounded)].filter(v => v > total).slice(0, 3);
}

function validateDelivery(delivery) {
  const errors = {};
  if (delivery.address.trim().length < 5) errors.address = 'Escribe la dirección completa';
  if (!/^3\d{9}$/.test(delivery.phone)) errors.phone = 'Celular de 10 dígitos que empiece por 3';
  return errors;
}

export default function CheckoutModal({
  open,
  onClose,
  cart,
  cartCount,
  cartSubtotal,
  deliveryCost,
  cartTotal,
  clearCart,
  onOrderPlaced,
}) {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  // Se precargan la dirección y el celular guardados en el perfil
  const [delivery, setDelivery] = useState(() => ({
    ...EMPTY_DELIVERY,
    address: user?.address ?? '',
    phone: onlyDigits(user?.phone ?? '').slice(0, 10),
  }));
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [location, setLocation] = useState(null);
  // El mapa arranca centrado en la tienda (o en Bogotá mientras llega la configuración)
  const mapCenter = useStoreConfig()?.store ?? { lat: 4.6486, lng: -74.0628 };
  const [payment, setPayment] = useState('card');
  const [card, setCard] = useState(EMPTY_CARD);
  const [cashWith, setCashWith] = useState('exact');
  const [cashOther, setCashOther] = useState('');
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [stage, setStage] = useState('form'); // form | processing | sending
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const busy = stage !== 'form';

  // Al cerrar se borran los datos de la tarjeta; la dirección se conserva
  const closeModal = useCallback(() => {
    setCard(EMPTY_CARD);
    setTouched({});
    setSubmitted(false);
    setError('');
    setReceipt(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open || busy) return;
    const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, closeModal]);

  if (!open) return null;

  const paysWith = cashWith === 'exact' ? cartTotal
    : cashWith === 'other' ? Number(cashOther || 0)
    : cashWith;
  const change = paysWith - cartTotal;

  const deliveryErrors = validateDelivery(delivery);
  const paymentErrors = payment === 'card'
    ? validateCard(card)
    : (change < 0 ? { cash: 'El monto debe cubrir el total del pedido' } : {});
  const errors = { ...deliveryErrors, ...paymentErrors };

  const fieldError = (name) => ((submitted || touched[name]) ? errors[name] : '');
  const touch = (name) => () => setTouched(t => ({ ...t, [name]: true }));
  const setField = (field) => (e) => setDelivery(d => ({ ...d, [field]: e.target.value }));

  const fullAddress = [delivery.address.trim(), delivery.detail.trim()].filter(Boolean).join(', ');
  const differsFromProfile = fullAddress !== (user?.address ?? '') || delivery.phone !== onlyDigits(user?.phone ?? '');

  const currentStep = receipt ? 3 : Object.keys(deliveryErrors).length === 0 ? 2 : 1;

  async function handleConfirm() {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      setError('Revisa los campos marcados en rojo.');
      return;
    }
    setError('');
    const address = fullAddress;

    try {
      if (payment === 'card') {
        setStage('processing');
        await new Promise(resolve => setTimeout(resolve, CARD_PROCESSING_MS));
      }
      setStage('sending');

      const resData = await orderService.createOrder({
        delivery_address: address,
        phone: delivery.phone,
        notes: delivery.notes.trim(),
        payment_method: payment,
        items: cart.map(item => ({ product_id: item.id, quantity: item.qty })),
        ...(location ? { delivery_lat: location.lat, delivery_lng: location.lng } : {}),
      });

      const brand = detectBrand(card.number);
      const newReceipt = {
        id: resData.id,
        createdAt: new Date().toISOString(),
        address,
        phone: formatPhone(delivery.phone),
        notes: delivery.notes.trim(),
        items: cart.map(item => ({ ...item })),
        subtotal: cartSubtotal,
        // Los montos finales son los que calculó el servidor
        deliveryCost: resData.delivery_fee,
        total: resData.total_price,
        paymentLabel: payment === 'card'
          ? `${BRAND_LABELS[brand]} •••• ${card.number.slice(-4)}`
          : 'Efectivo al recibir',
        change: payment === 'cash' ? change : 0,
      };
      setReceipt(newReceipt);
      onOrderPlaced?.(newReceipt);
      // Si el cliente lo pidió, la dirección queda guardada para el próximo pedido (si falla, el pedido ya está hecho)
      if (saveToProfile && differsFromProfile) {
        updateProfile({ address, phone: delivery.phone }).catch(() => {});
      }
      setCard(EMPTY_CARD);
      clearCart();
    } catch (err) {
      setError(err instanceof TypeError
        ? 'No pudimos conectar con el servidor. Intenta de nuevo en un momento.'
        : err.message);
    } finally {
      setStage('form');
    }
  }

  const confirmLabel = stage === 'processing' ? 'Procesando pago con tu banco…'
    : stage === 'sending' ? 'Creando tu pedido…'
    : payment === 'card' ? <>Pagar {formatPrice(cartTotal)} <IconLock size={15} /></>
    : <>Confirmar pedido <IconArrowRight size={16} /></>;

  return (
    <div className={styles.overlay} onClick={() => !busy && closeModal()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="checkout-title" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.brand}>🌿 Aura Food</span>
          <span className={styles['secure-badge']}><IconLock size={12} /> Pago seguro</span>
          <button className={styles['close-btn']} onClick={closeModal} disabled={busy} aria-label="Cerrar">✕</button>
        </div>

        {/* Pasos */}
        <ol className={styles.steps}>
          {STEPS.map((step, i) => (
            <li
              key={step}
              className={[styles.step, i < currentStep ? styles.done : '', i === currentStep ? styles.current : ''].join(' ')}
            >
              <span className={styles['step-dot']}>{i < currentStep ? <IconCheck size={11} /> : i + 1}</span>
              <span className={styles['step-label']}>{step}</span>
            </li>
          ))}
        </ol>

        {receipt ? (
          /* ---------- Pedido confirmado ---------- */
          <div className={styles.success}>
            <div className={styles['success-icon']}><IconCheck size={34} /></div>
            <h2>¡Tu pedido va en camino!</h2>
            <p className={styles['success-sub']}>
              Pedido <strong>{formatOrderId(receipt.id)}</strong> • Llega en <strong>35 - 45 min</strong>
            </p>

            <ol className={styles.tracking}>
              {TRACKING.map((t, i) => (
                <li key={t} className={i === 0 ? styles.active : ''}>
                  <span />
                  {t}
                </li>
              ))}
            </ol>

            <div className={styles.receipt}>
              {receipt.items.map(item => (
                <div key={item.id} className={styles['receipt-row']}>
                  <span>{item.name} <em>x{item.qty}</em></span>
                  <span>{formatPrice(item.price * item.qty)}</span>
                </div>
              ))}
              <div className={styles.divider} />
              <div className={styles['receipt-row']}><span>Subtotal</span><span>{formatPrice(receipt.subtotal)}</span></div>
              <div className={styles['receipt-row']}><span>Domicilio</span><span>{formatPrice(receipt.deliveryCost)}</span></div>
              <div className={[styles['receipt-row'], styles['receipt-total']].join(' ')}>
                <span>Total</span><span>{formatPrice(receipt.total)}</span>
              </div>
              <div className={styles.divider} />
              <div className={styles['receipt-row']}><span>Pago</span><span>{receipt.paymentLabel}</span></div>
              {receipt.change > 0 && (
                <div className={styles['receipt-row']}><span>Cambio a devolver</span><span>{formatPrice(receipt.change)}</span></div>
              )}
              <div className={styles['receipt-row']}><span>Entrega en</span><span>{receipt.address}</span></div>
              <div className={styles['receipt-row']}><span>Contacto</span><span>{receipt.phone}</span></div>
              {receipt.notes && (
                <div className={styles['receipt-row']}><span>Indicaciones</span><span>{receipt.notes}</span></div>
              )}
            </div>

            <div className={styles['success-actions']}>
              <button className={styles['btn-confirm']} onClick={() => { closeModal(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                Volver a la portada
              </button>
              <button className={styles['btn-ghost']} onClick={() => { const id = receipt.id; closeModal(); navigate(`/pedidos/${id}`); }}>
                Ver seguimiento del pedido <IconArrowRight size={15} />
              </button>
            </div>
          </div>
        ) : (
          /* ---------- Formulario ---------- */
          <div className={styles.body}>
            <div className={styles['title-row']}>
              <div className={styles['title-icon']}>🛍️</div>
              <div>
                <h2 id="checkout-title">Finalizar pedido</h2>
                <p>Selección fresca de cosechas directas</p>
              </div>
            </div>

            <div className={styles.columns}>
              <div className={styles.left}>
                {/* 1. Entrega */}
                <section className={styles.card}>
                  <h3><IconMapPin size={17} /> 1. Datos de entrega</h3>

                  <label className={styles.field}>
                    <span className={styles.label}>Dirección</span>
                    <span className={styles['input-wrap']}>
                      <span className={styles['input-icon']}><IconMapPin size={16} /></span>
                      <input
                        className={[styles.input, styles['with-icon'], fieldError('address') ? styles['input-error'] : ''].join(' ')}
                        placeholder="Ej. Carrera 23 # 98 - 45"
                        autoComplete="street-address"
                        value={delivery.address}
                        onChange={setField('address')}
                        onBlur={touch('address')}
                        disabled={busy}
                        autoFocus
                      />
                    </span>
                    {fieldError('address') && <span className={styles['field-error']}>{fieldError('address')}</span>}
                  </label>

                  <div className={styles['field-row']}>
                    <label className={styles.field}>
                      <span className={styles.label}>Apto, torre o barrio <em>(opcional)</em></span>
                      <input
                        className={styles.input}
                        placeholder="Ej. Torre 2, Apto 401"
                        value={delivery.detail}
                        onChange={setField('detail')}
                        disabled={busy}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>Celular</span>
                      <span className={styles['input-wrap']}>
                        <span className={styles['input-icon']}><IconPhone size={15} /></span>
                        <input
                          className={[styles.input, styles['with-icon'], fieldError('phone') ? styles['input-error'] : ''].join(' ')}
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="300 123 4567"
                          value={formatPhone(delivery.phone)}
                          onChange={e => setDelivery(d => ({ ...d, phone: onlyDigits(e.target.value).slice(0, 10) }))}
                          onBlur={touch('phone')}
                          disabled={busy}
                        />
                      </span>
                      {fieldError('phone') && <span className={styles['field-error']}>{fieldError('phone')}</span>}
                    </label>
                  </div>

                  <label className={styles.field}>
                    <span className={styles.label}>Indicaciones para el repartidor <em>(opcional)</em></span>
                    <textarea
                      className={[styles.input, styles.textarea].join(' ')}
                      placeholder="Ej. Dejar en portería, timbre dañado, llamar al llegar"
                      maxLength={160}
                      rows={2}
                      value={delivery.notes}
                      onChange={setField('notes')}
                      disabled={busy}
                    />
                  </label>

                  {showMap ? (
                    <LocationPicker value={location} onChange={setLocation} center={mapCenter} disabled={busy} />
                  ) : (
                    <button type="button" className={styles['map-toggle']} onClick={() => setShowMap(true)} disabled={busy}>
                      <IconMapPin size={14} /> Marcar el punto exacto en el mapa <em>(opcional, ayuda al domiciliario)</em>
                    </button>
                  )}

                  {differsFromProfile && (
                    <label className={styles['save-check']}>
                      <input type="checkbox" checked={saveToProfile} onChange={e => setSaveToProfile(e.target.checked)} disabled={busy} />
                      Guardar esta dirección y celular en mi perfil
                    </label>
                  )}

                  <p className={styles.hint}><IconTruck size={14} /> Entrega estimada: <strong>35 - 45 min</strong></p>
                </section>

                {/* 2. Pago */}
                <section className={styles.card}>
                  <h3><IconLock size={16} /> 2. Método de pago</h3>
                  <div className={styles['pay-grid']}>
                    {[
                      { id: 'card', icon: '💳', title: 'Tarjeta crédito / débito', desc: 'Visa, Mastercard, Amex' },
                      { id: 'cash', icon: '💵', title: 'Efectivo al recibir', desc: 'Pagas al repartidor' },
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        className={[styles['pay-option'], payment === m.id ? styles.selected : ''].join(' ')}
                        onClick={() => { setPayment(m.id); setError(''); }}
                        aria-pressed={payment === m.id}
                        disabled={busy}
                      >
                        <span className={styles['pay-icon']}>{m.icon}</span>
                        <span className={styles['pay-check']}>{payment === m.id && <IconCheck size={12} />}</span>
                        <strong>{m.title}</strong>
                        <span>{m.desc}</span>
                      </button>
                    ))}
                  </div>

                  {payment === 'card' ? (
                    <PaymentCardForm card={card} setCard={setCard} fieldError={fieldError} touch={touch} disabled={busy} />
                  ) : (
                    <div className={styles.cash}>
                      <span className={styles.label}>¿Con cuánto vas a pagar?</span>
                      <div className={styles['cash-options']}>
                        <button
                          type="button"
                          className={[styles['cash-chip'], cashWith === 'exact' ? styles.active : ''].join(' ')}
                          onClick={() => setCashWith('exact')}
                          disabled={busy}
                        >
                          Exacto
                        </button>
                        {cashSuggestions(cartTotal).map(v => (
                          <button
                            key={v}
                            type="button"
                            className={[styles['cash-chip'], cashWith === v ? styles.active : ''].join(' ')}
                            onClick={() => setCashWith(v)}
                            disabled={busy}
                          >
                            {formatPrice(v)}
                          </button>
                        ))}
                        <button
                          type="button"
                          className={[styles['cash-chip'], cashWith === 'other' ? styles.active : ''].join(' ')}
                          onClick={() => setCashWith('other')}
                          disabled={busy}
                        >
                          Otro
                        </button>
                      </div>
                      {cashWith === 'other' && (
                        <input
                          className={[styles.input, fieldError('cash') ? styles['input-error'] : ''].join(' ')}
                          inputMode="numeric"
                          placeholder="Monto con el que pagas"
                          value={cashOther ? formatPrice(Number(cashOther)) : ''}
                          onChange={e => setCashOther(onlyDigits(e.target.value).slice(0, 7))}
                          onBlur={touch('cash')}
                          disabled={busy}
                        />
                      )}
                      {fieldError('cash')
                        ? <span className={styles['field-error']}>{fieldError('cash')}</span>
                        : change > 0 && <p className={styles.change}>El repartidor te devolverá <strong>{formatPrice(change)}</strong></p>}
                    </div>
                  )}
                </section>
              </div>

              {/* Resumen */}
              <aside className={styles.summary}>
                <div className={styles['summary-head']}>
                  <h3>Resumen</h3>
                  <span className={styles.pill}>{cartCount} producto{cartCount !== 1 ? 's' : ''}</span>
                </div>

                <div className={styles.items}>
                  {cart.map(item => (
                    <div key={item.id} className={styles.item}>
                      <div className={styles['item-image']}>
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className={styles['item-img']} />
                        ) : (
                          <div className={[styles['item-img'], styles['item-img-placeholder']].join(' ')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14M8 10l2-2 4 4 2-2"/></svg>
                          </div>
                        )}
                      </div>
                      <div className={styles['item-info']}>
                        <p className={styles['item-name']}>{item.name}</p>
                        <p className={styles['item-unit']}>{item.unit} • x{item.qty}</p>
                      </div>
                      <span className={styles['item-price']}>{formatPrice(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.row}><span>Subtotal</span><span>{formatPrice(cartSubtotal)}</span></div>
                <div className={styles.row}><span>Domicilio</span><span>{deliveryCost == null ? 'Calculando…' : formatPrice(deliveryCost)}</span></div>
                <div className={styles.divider} />
                <div className={styles['total-row']}>
                  <span>Total a pagar</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <p className={styles.taxes}>Impuestos incluidos</p>

                {error && <p className={styles.error} role="alert">{error}</p>}

                <button className={styles['btn-confirm']} onClick={handleConfirm} disabled={busy || cart.length === 0}>
                  {busy && <span className={styles.spinner} />}
                  {confirmLabel}
                </button>
                <p className={styles.secure}><IconShield size={13} /> Compra protegida • Garantía de frescura Aura</p>
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
