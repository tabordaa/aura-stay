import { useCallback, useEffect, useId, useRef, useState } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';
import { useNavigate } from 'react-router';
import { IconUser, IconMail, IconPhone, IconLock, IconShield, IconCheck, IconArrowRight } from './Icons';
import PaymentCardForm from './PaymentCardForm';
import { BRAND_LABELS, detectBrand, validateCard } from './cardUtils';
import { formatPrice } from '../utils/format';
import { formatStayDate } from '../utils/dates';
import { combineQuotes, TAX_RATE } from '../utils/pricing';
import { reservationsService } from '../services/reservations.service';
import { useAuth } from '../hooks/useAuth';
import { MAX_REQUESTS, normalizePhone, validateHolder } from '../utils/validation';
import styles from './CheckoutModal.module.css';

// Tiempo que dura la simulación de "aprobando pago con el banco"
const CARD_PROCESSING_MS = 1200;

const EMPTY_CARD = { number: '', name: '', expiry: '', cvv: '' };
const STEPS = ['Estadía', 'Titular', 'Pago', 'Confirmación'];
const TRACKING = ['Solicitud', 'Confirmación', 'Check-in', 'Check-out'];

/**
 * Modal "Confirmar reserva". Se monta solo cuando está abierto, así el titular se precarga
 * desde la sesión y los datos de la tarjeta viven únicamente mientras el modal existe.
 * Hacia el servicio solo viaja card_last4: número completo, vencimiento y CVV nunca salen de aquí.
 */
export default function CheckoutModal({ onClose, items, onReserved }) {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [holder, setHolder] = useState(() => ({
    name: user?.name ?? '',
    document: user?.document ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    requests: '',
  }));
  const [payment, setPayment] = useState('card');
  const [card, setCard] = useState(EMPTY_CARD);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [stage, setStage] = useState('form'); // form | processing | sending
  const [serviceError, setServiceError] = useState('');
  const [receipt, setReceipt] = useState(null);
  // null = automático (marcada solo si el titular difiere del perfil); true/false = elección del usuario
  const [saveChoice, setSaveChoice] = useState(null);
  const [profileWarning, setProfileWarning] = useState('');
  const differsFromProfile = ['name', 'document', 'phone'].some(k => holder[k].trim() !== (user?.[k] ?? '').trim());
  const saveToProfile = saveChoice ?? differsFromProfile;
  const busy = stage !== 'form';
  const uid = useId();
  const dialogRef = useRef(null);
  const mounted = useRef(true);
  const errId = (name) => `${uid}-${name}-error`;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const totals = combineQuotes(items.map(i => i.quote));

  const closeModal = useCallback(() => {
    setCard(EMPTY_CARD);
    onClose();
  }, [onClose]);

  // Foco atrapado en el diálogo; Escape cierra salvo mientras se procesa el pago
  useFocusTrap(dialogRef, { onEscape: busy ? undefined : closeModal });

  const holderErrors = validateHolder(holder);
  const paymentErrors = payment === 'card' ? validateCard(card) : {};
  const errors = { ...holderErrors, ...paymentErrors };

  const visibleErrors = Object.keys(errors).filter(k => submitted || touched[k]);
  // El aviso global se deriva: desaparece al corregir los campos
  const error = serviceError || (submitted && visibleErrors.length > 0 ? 'Revisa los campos marcados en rojo.' : '');

  const fieldError = (name) => ((submitted || touched[name]) ? errors[name] : '');
  const touch = (name) => () => setTouched(t => ({ ...t, [name]: true }));
  const setField = (field, clean = (v) => v) => (e) => setHolder(h => ({ ...h, [field]: clean(e.target.value) }));
  const inputClass = (name) => [styles.input, styles['with-icon'], fieldError(name) ? styles['input-error'] : ''].join(' ');

  const currentStep = receipt ? 3 : Object.keys(holderErrors).length === 0 ? 2 : 1;

  async function handleConfirm() {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      return;
    }
    setServiceError('');

    try {
      if (payment === 'card') {
        setStage('processing');
        await new Promise(resolve => setTimeout(resolve, CARD_PROCESSING_MS));
      }
      setStage('sending');
      const isCard = payment === 'card';
      const brand = isCard ? detectBrand(card.number) : null;
      const last4 = isCard ? card.number.slice(-4) : null;

      const created = await reservationsService.createMany({
        items: items.map(i => ({
          roomTypeId: i.roomTypeId,
          checkIn: i.checkIn,
          checkOut: i.checkOut,
          guests: i.guests,
          extras: i.extras.map(x => ({ extraId: x.extra.id, qty: x.qty })),
        })),
        holder: {
          name: holder.name,
          document: holder.document,
          phone: holder.phone,
          email: holder.email,
          special_requests: holder.requests,
        },
        payment: payment === 'card' ? { method: 'card', card_last4: last4 } : { method: 'hotel' },
      });

      setReceipt({
        reservations: created,
        total: created.reduce((sum, r) => sum + r.total, 0),
        method: payment,
        paymentLabel: payment === 'card' ? `${BRAND_LABELS[brand]} •••• ${last4}` : 'Pagar en el hotel',
        names: Object.fromEntries(items.map(i => [i.roomTypeId, i.roomType.name])),
      });
      setCard(EMPTY_CARD);
      onReserved?.(items.map(i => i.uid));

      // La reserva ya existe: si el perfil falla solo se avisa, no se deshace nada.
      // El correo del titular no toca el de la cuenta.
      // Se muestra el éxito primero y el perfil se guarda después, sin retrasar la pantalla.
      if (saveToProfile && differsFromProfile) {
        setStage('form');
        try {
          await updateProfile({ name: holder.name, phone: holder.phone, document: holder.document });
        } catch {
          if (mounted.current) setProfileWarning('No pudimos guardar tus datos en el perfil. Puedes actualizarlos desde Mi perfil.');
        }
      }
    } catch (err) {
      setServiceError(err.message || 'No pudimos confirmar tu reserva. Intenta de nuevo.');
    } finally {
      if (mounted.current) setStage('form');
    }
  }

  const confirmLabel = stage === 'processing' ? 'Procesando pago con tu banco…'
    : stage === 'sending' ? 'Confirmando…'
    : payment === 'card' ? <>Pagar {formatPrice(totals.total)} <IconLock size={15} /></>
    : <>Confirmar reserva <IconArrowRight size={16} /></>;

  const goToReservations = () => {
    const list = receipt.reservations;
    closeModal();
    navigate(list.length === 1 ? `/reservas/${list[0].id}` : '/reservas');
  };

  return (
    <div className={styles.overlay} onClick={() => !busy && closeModal()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="checkout-title" tabIndex={-1} ref={dialogRef} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.brand}>🛏️ Aura Stay</span>
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
          /* ---------- Reserva confirmada ---------- */
          <div className={styles.success}>
            <div className={styles['success-icon']}><IconCheck size={34} /></div>
            <h2 id="checkout-title">{receipt.method === 'card' ? 'Tu estadía está confirmada' : 'Recibimos tu solicitud'}</h2>
            <p className={styles['success-sub']}>
              {receipt.method === 'hotel' && 'El hotel la confirmará pronto. '}
              {receipt.reservations.length > 1 ? 'Códigos' : 'Código'} de reserva:{' '}
              <strong>{receipt.reservations.map(r => r.code).join(', ')}</strong>
            </p>

            <ol className={styles.tracking}>
              {TRACKING.map((t, i) => (
                <li key={t} className={i === (receipt.method === 'card' ? 1 : 0) ? styles.active : ''}>
                  <span />
                  {t}
                </li>
              ))}
            </ol>

            <div className={styles.receipt}>
              {receipt.reservations.map(r => (
                <div key={r.id} className={styles['receipt-row']}>
                  <span>{receipt.names[r.room_type_id]} <em>{formatStayDate(r.check_in)} → {formatStayDate(r.check_out)}</em></span>
                  <span>{formatPrice(r.total)}</span>
                </div>
              ))}
              <div className={styles.divider} />
              <div className={[styles['receipt-row'], styles['receipt-total']].join(' ')}>
                <span>Total</span><span>{formatPrice(receipt.total)}</span>
              </div>
              <div className={styles.divider} />
              <div className={styles['receipt-row']}><span>Pago</span><span>{receipt.paymentLabel}</span></div>
              <div className={styles['receipt-row']}><span>Titular</span><span>{receipt.reservations[0].guest_name}</span></div>
            </div>

            {profileWarning && <p className={styles.change} role="status">{profileWarning}</p>}

            <div className={styles['success-actions']}>
              <button className={styles['btn-confirm']} onClick={goToReservations} autoFocus>
                {receipt.reservations.length === 1 ? 'Ver mi reserva' : 'Ver mis reservas'}
              </button>
              <button className={styles['btn-ghost']} onClick={closeModal}>Seguir explorando</button>
            </div>
          </div>
        ) : (
          /* ---------- Formulario ---------- */
          <div className={styles.body}>
            <div className={styles['title-row']}>
              <div className={styles['title-icon']}>🛎️</div>
              <div>
                <h2 id="checkout-title">Confirmar reserva</h2>
                <p>Revisa tu estadía y completa los datos del titular</p>
              </div>
            </div>

            <div className={styles.columns}>
              <div className={styles.left}>
                {/* 1. Titular */}
                <section className={styles.card}>
                  <h3><IconUser size={17} /> 1. Datos del titular</h3>

                  <label className={styles.field}>
                    <span className={styles.label}>Nombre completo</span>
                    <span className={styles['input-wrap']}>
                      <span className={styles['input-icon']}><IconUser size={16} /></span>
                      <input
                        className={inputClass('name')}
                        aria-invalid={!!fieldError('name')}
                        aria-describedby={fieldError('name') ? errId('name') : undefined}
                        autoComplete="name"
                        placeholder="Como aparece en tu documento"
                        value={holder.name}
                        onChange={setField('name')}
                        onBlur={touch('name')}
                        disabled={busy}
                      />
                    </span>
                    {fieldError('name') && <span id={errId('name')} className={styles['field-error']}>{fieldError('name')}</span>}
                  </label>

                  <div className={styles['field-row']}>
                    <label className={styles.field}>
                      <span className={styles.label}>Documento</span>
                      <input
                        aria-invalid={!!fieldError('document')}
                        aria-describedby={fieldError('document') ? errId('document') : undefined}
                        className={[styles.input, fieldError('document') ? styles['input-error'] : ''].join(' ')}
                        placeholder="Cédula o pasaporte"
                        maxLength={15}
                        value={holder.document}
                        onChange={setField('document', v => v.replace(/[^A-Za-z0-9]/g, ''))}
                        onBlur={touch('document')}
                        disabled={busy}
                      />
                      {fieldError('document') && <span id={errId('document')} className={styles['field-error']}>{fieldError('document')}</span>}
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>Teléfono</span>
                      <span className={styles['input-wrap']}>
                        <span className={styles['input-icon']}><IconPhone size={15} /></span>
                        <input
                          className={inputClass('phone')}
                          aria-invalid={!!fieldError('phone')}
                          aria-describedby={fieldError('phone') ? errId('phone') : undefined}
                          type="tel"
                          autoComplete="tel"
                          placeholder="+57 300 123 4567"
                          value={holder.phone}
                          onChange={setField('phone', normalizePhone)}
                          onBlur={touch('phone')}
                          disabled={busy}
                        />
                      </span>
                      {fieldError('phone') && <span id={errId('phone')} className={styles['field-error']}>{fieldError('phone')}</span>}
                    </label>
                  </div>

                  <label className={styles['save-check']}>
                    <input
                      type="checkbox"
                      checked={saveToProfile}
                      onChange={e => setSaveChoice(e.target.checked)}
                      disabled={busy}
                    />
                    <span>Guardar en mi perfil</span>
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>Correo electrónico</span>
                    <span className={styles['input-wrap']}>
                      <span className={styles['input-icon']}><IconMail size={16} /></span>
                      <input
                        className={inputClass('email')}
                        aria-invalid={!!fieldError('email')}
                        aria-describedby={fieldError('email') ? errId('email') : undefined}
                        type="email"
                        autoComplete="email"
                        placeholder="tu@correo.com"
                        value={holder.email}
                        onChange={setField('email')}
                        onBlur={touch('email')}
                        disabled={busy}
                      />
                    </span>
                    {fieldError('email') && <span id={errId('email')} className={styles['field-error']}>{fieldError('email')}</span>}
                  </label>

                  <label className={styles.field}>
                    <span className={styles.label}>Solicitudes especiales <em>(opcional)</em></span>
                    <textarea
                      className={[styles.input, styles.textarea].join(' ')}
                      aria-invalid={!!fieldError('requests')}
                      aria-describedby={fieldError('requests') ? errId('requests') : undefined}
                      placeholder="Ej. Cama extra, llegada tarde, piso alto"
                      maxLength={MAX_REQUESTS}
                      rows={2}
                      value={holder.requests}
                      onChange={setField('requests')}
                      disabled={busy}
                    />
                    {fieldError('requests') && <span id={errId('requests')} className={styles['field-error']}>{fieldError('requests')}</span>}
                    <span className={styles.counter}>{holder.requests.length}/{MAX_REQUESTS}</span>
                  </label>
                </section>

                {/* 2. Pago */}
                <section className={styles.card}>
                  <h3><IconLock size={16} /> 2. Método de pago</h3>
                  <div className={styles['pay-grid']}>
                    {[
                      { id: 'card', icon: '💳', title: 'Tarjeta crédito / débito', desc: 'Visa, Mastercard, Amex' },
                      { id: 'hotel', icon: '🏨', title: 'Pagar en el hotel', desc: 'Pagas al llegar' },
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        className={[styles['pay-option'], payment === m.id ? styles.selected : ''].join(' ')}
                        onClick={() => { setPayment(m.id); setServiceError(''); }}
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
                    <p className={styles.change}>
                      Tu reserva quedará <strong>pendiente</strong> hasta que el hotel la confirme. Pagas al hacer el check-in.
                    </p>
                  )}
                </section>
              </div>

              {/* Resumen */}
              <aside className={styles.summary}>
                <div className={styles['summary-head']}>
                  <h3>Resumen</h3>
                  <span className={styles.pill}>{items.length} reserva{items.length !== 1 ? 's' : ''}</span>
                </div>

                <div className={styles.items}>
                  {items.map(item => (
                    <div key={item.uid} className={styles.item}>
                      <div className={styles['item-image']}>
                        <img src={item.roomType.images?.[0]} alt="" className={styles['item-img']} />
                      </div>
                      <div className={styles['item-info']}>
                        <p className={styles['item-name']}>{item.roomType.name}</p>
                        <p className={styles['item-unit']}>
                          {formatStayDate(item.checkIn)} → {formatStayDate(item.checkOut)} • {item.quote.nights} noche{item.quote.nights !== 1 ? 's' : ''} • {item.guests} huésped{item.guests !== 1 ? 'es' : ''}
                        </p>
                        {item.extras.length > 0 && (
                          <p className={styles['item-unit']}>
                            {item.extras.map(x => `${x.extra.name}${x.qty > 1 ? ` x${x.qty}` : ''}`).join(', ')}
                          </p>
                        )}
                      </div>
                      <span className={styles['item-price']}>{formatPrice(item.quote.subtotal + item.quote.extras_total)}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.row}><span>Alojamiento</span><span>{formatPrice(totals.subtotal)}</span></div>
                {totals.extras_total > 0 && (
                  <div className={styles.row}><span>Servicios adicionales</span><span>{formatPrice(totals.extras_total)}</span></div>
                )}
                <div className={styles.row}><span>IVA ({Math.round(TAX_RATE * 100)} %)</span><span>{formatPrice(totals.taxes)}</span></div>
                <div className={styles.divider} />
                <div className={styles['total-row']}>
                  <span>{payment === 'card' ? 'Total a pagar' : 'Total a pagar en el hotel'}</span>
                  <span>{formatPrice(totals.total)}</span>
                </div>

                {error && <p className={styles.error} role="alert">{error}</p>}

                <button className={styles['btn-confirm']} onClick={handleConfirm} disabled={busy || items.length === 0}>
                  {busy && <span className={styles.spinner} />}
                  {confirmLabel}
                </button>
                <p className={styles.secure}><IconShield size={13} /> Reserva protegida • Cancelación flexible</p>
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
