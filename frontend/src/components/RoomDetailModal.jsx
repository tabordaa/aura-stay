import { useId, useRef, useState } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';
import { IconCheck, IconChevronLeft, IconChevronRight } from './Icons';
import AvailabilityCalendar from './AvailabilityCalendar';
import { formatPrice } from '../utils/format';
import { addDays, formatStayDate } from '../utils/dates';
import { amenityLabel, categoryLabel } from '../utils/categories';
import { stayQuote } from '../utils/pricing';
import styles from './RoomDetailModal.module.css';

const POLICIES = [
  'Check-in desde las 15:00',
  'Check-out hasta las 12:00',
  'Cancelación gratis hasta 48 h antes de la llegada',
];

const AVAILABILITY_REASONS = {
  capacity: (room) => `Esta opción admite hasta ${room.capacity} huéspedes.`,
  sold_out: () => 'No hay disponibilidad para esas fechas.',
};

// Desplazamiento horizontal mínimo (px) para cambiar de foto al deslizar en táctil
const SWIPE_THRESHOLD = 40;

// Se monta solo con `room` (el padre pasa key={room.id}), así la galería arranca siempre en la primera foto
export default function RoomDetailModal({ room, stay, availability, onClose, onAdd, onSelectDates }) {
  const [active, setActive] = useState(0);
  const [imgError, setImgError] = useState({});
  const closeRef = useRef(null);
  const swipeStartRef = useRef(null);
  const titleId = useId();
  const availabilityTitleId = useId();

  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, { initialFocusRef: closeRef, onEscape: onClose });

  const isPackage = room.category === 'paquete';
  const images = room.images ?? [];
  const hasMultiple = images.length > 1;
  const quote = stay ? stayQuote({ roomType: room, checkIn: stay.checkIn, checkOut: stay.checkOut, guests: stay.guests }) : null;
  const checkOut = stay ? (isPackage ? addDays(stay.checkIn, room.nights) : stay.checkOut) : null;
  const blocked = availability && !availability.available;
  const reasonText = blocked ? (AVAILABILITY_REASONS[availability.reason] ?? AVAILABILITY_REASONS.sold_out)(room) : '';
  const canAdd = Boolean(stay && !blocked);
  const hint = !stay ? 'Elige tus fechas para ver el total' : reasonText;

  const goPrev = () => {
    if (!hasMultiple) return;
    setActive((i) => (i - 1 + images.length) % images.length);
  };
  const goNext = () => {
    if (!hasMultiple) return;
    setActive((i) => (i + 1) % images.length);
  };

  // Las flechas solo actúan cuando el foco está dentro del carrusel
  const handleGalleryKeyDown = (e) => {
    if (!hasMultiple) return;
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    }
  };

  const handlePointerDown = (e) => {
    if (!hasMultiple) return;
    if (e.target.closest('button')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    swipeStartRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
  };

  const handlePointerUp = (e) => {
    const start = swipeStartRef.current;
    if (!start || start.pointerId !== e.pointerId) return;
    swipeStartRef.current = null;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  const handlePointerCancel = () => {
    swipeStartRef.current = null;
  };

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({ roomTypeId: room.id, checkIn: stay.checkIn, checkOut, guests: stay.guests });
  };

  return (
    // Cierra solo si el clic nace en el overlay (no al arrastrar para seleccionar texto del modal)
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className={styles.modal}
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.header}>
          <span className={styles.brand}>{categoryLabel(room.category)}</span>
          <button ref={closeRef} type="button" className={styles['close-btn']} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className={styles.content}>
          <section
            className={styles.gallery}
            aria-label="Galería de fotos"
            aria-roledescription={hasMultiple ? 'carrusel' : undefined}
            onKeyDown={handleGalleryKeyDown}
          >
            <div
              className={styles.main}
              tabIndex={hasMultiple ? 0 : undefined}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
              {images.length > 0 ? (
                images.map((src, i) => (
                  <div
                    key={`${src}-${i}`}
                    className={[styles.slide, i === active ? styles['slide-active'] : ''].join(' ')}
                    aria-hidden={i !== active}
                  >
                    {!imgError[i] ? (
                      <img
                        src={src}
                        alt={`${room.name}, foto ${i + 1} de ${images.length}`}
                        className={styles['main-img']}
                        draggable={false}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        onError={() => setImgError(e => ({ ...e, [i]: true }))}
                      />
                    ) : (
                      <div className={styles['img-placeholder']}>🛏️</div>
                    )}
                  </div>
                ))
              ) : (
                <div className={styles['img-placeholder']}>🛏️</div>
              )}

              {hasMultiple && (
                <>
                  <button
                    type="button"
                    className={[styles['carousel-btn'], styles['carousel-prev']].join(' ')}
                    onClick={goPrev}
                    aria-label="Foto anterior"
                  >
                    <IconChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    className={[styles['carousel-btn'], styles['carousel-next']].join(' ')}
                    onClick={goNext}
                    aria-label="Foto siguiente"
                  >
                    <IconChevronRight size={18} />
                  </button>
                  <span className={styles.counter} aria-live="polite">
                    {active + 1} / {images.length}
                  </span>
                </>
              )}
            </div>
            {hasMultiple && (
              <div className={styles.thumbs}>
                {images.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    className={[styles.thumb, i === active ? styles.active : ''].join(' ')}
                    onClick={() => setActive(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    aria-pressed={i === active}
                  >
                    {!imgError[i] && <img src={src} alt="" loading="lazy" onError={() => setImgError(e => ({ ...e, [i]: true }))} />}
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className={styles.info}>
            {room.tag && <span className={styles.tag}>{room.tag}</span>}
            <h2 id={titleId} className={styles.title}>{room.name}</h2>
            <p className={styles.meta}>
              <span>👤 {room.capacity} {room.capacity === 1 ? 'huésped' : 'huéspedes'}</span>
              <span>📐 {room.size_m2} m²</span>
              <span>🛏️ {room.beds}</span>
              {isPackage && <span>🎁 Paquete de {room.nights} noches</span>}
            </p>
            <p className={styles.description}>{room.description}</p>

            {isPackage && room.includes?.length > 0 && (
              <>
                <h3 className={styles.label}>Incluye</h3>
                <ul className={styles.list}>
                  {room.includes.map(item => (
                    <li key={item}><IconCheck size={13} /> {item}</li>
                  ))}
                </ul>
              </>
            )}

            <h3 className={styles.label}>Comodidades</h3>
            <div className={styles.amenities}>
              {room.amenities.map(key => <span key={key} className={styles.chip}>{amenityLabel(key)}</span>)}
            </div>

            <h3 className={styles.label}>Políticas</h3>
            <ul className={styles.list}>
              {POLICIES.map(p => <li key={p}><IconCheck size={13} /> {p}</li>)}
            </ul>
          </div>
        </div>

        <section className={styles['availability-section']} aria-labelledby={availabilityTitleId}>
          <h3 id={availabilityTitleId} className={styles.label}>Disponibilidad</h3>
          <AvailabilityCalendar
            roomTypeId={room.id}
            guests={stay?.guests ?? 1}
            isPackage={isPackage}
            packageNights={room.nights}
            selectedCheckIn={stay?.checkIn ?? null}
            selectedCheckOut={checkOut}
            onSelectDates={onSelectDates}
          />
        </section>

        <div className={styles.summary}>
          {quote ? (
            <div className={styles.breakdown}>
              <p className={styles.dates}>{formatStayDate(stay.checkIn)} → {formatStayDate(checkOut)} · {quote.nights} noche{quote.nights !== 1 ? 's' : ''} · {stay.guests} {stay.guests === 1 ? 'huésped' : 'huéspedes'}</p>
              <div className={styles.row}><span>{isPackage ? 'Paquete' : `${formatPrice(room.price_per_night)} × ${quote.nights}`}</span><span>{formatPrice(quote.subtotal)}</span></div>
              <div className={styles.row}><span>IVA 19 %</span><span>{formatPrice(quote.taxes)}</span></div>
              <div className={[styles.row, styles.total].join(' ')}><span>Total</span><span>{formatPrice(quote.total)}</span></div>
            </div>
          ) : (
            <div className={styles.breakdown}>
              <p className={styles['from-label']}>{isPackage ? `Paquete de ${room.nights} noches` : 'Desde, por noche'}</p>
              <p className={styles.price}>{formatPrice(isPackage ? room.price : room.price_per_night)}</p>
            </div>
          )}
          <div className={styles.action}>
            {hint && <p className={[styles.hint, blocked ? styles.error : ''].join(' ')} role={blocked ? 'alert' : undefined}>{hint}</p>}
            <button type="button" className={styles['btn-add']} onClick={handleAdd} disabled={!canAdd}>
              Agregar a mi estadía
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
