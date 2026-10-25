import { useState } from 'react';
import { IconHeart, IconArrowRight } from './Icons';
import { formatPrice } from '../utils/format';
import { amenityLabel } from '../utils/categories';
import styles from '../pages/catalog/Catalog.module.css';

// Chips visibles por tarjeta (el resto se ve en el detalle, S05)
const MAX_AMENITIES = 4;

export default function RoomCard({ room, favorites, toggleFav, onSelect }) {
  const [imgError, setImgError] = useState(false);
  const isFav = favorites.includes(room.id);
  const isPackage = room.category === 'paquete';
  const price = isPackage ? room.price : room.price_per_night;
  const cover = room.images?.[0];

  return (
    <div className={styles['product-card']}>
      <div className={styles['card-image-area']}>
        {room.tag && (
          <span className={[styles['card-tag'], room.old_price ? styles['tag-deal'] : ''].join(' ')}>
            {room.tag}
          </span>
        )}
        {cover && !imgError ? (
          <img
            src={cover}
            alt={room.name}
            className={styles['product-img']}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles['product-img-placeholder']}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14M8 10l2-2 4 4 2-2"/></svg>
          </div>
        )}
        <button
          className={[styles['card-fav'], isFav ? styles.active : ''].join(' ')}
          onClick={() => toggleFav(room.id)}
          aria-pressed={isFav}
          aria-label={`Guardar ${room.name} en favoritos`}
        >
          <IconHeart size={14} filled={isFav} />
        </button>
      </div>
      <div className={styles['card-body']}>
        <p className={styles['card-origin']}>
          <span>👤 {room.capacity}</span> · <span>{room.size_m2} m²</span>
        </p>
        <p className={styles['card-name']}>{room.name}</p>
        <p className={styles['card-unit']}>{room.beds}</p>
        <div className={styles['card-chips']}>
          {room.amenities.slice(0, MAX_AMENITIES).map(key => (
            <span key={key} className={styles['chip']}>{amenityLabel(key)}</span>
          ))}
        </div>
      </div>
      <div className={styles['card-footer']}>
        <div className={styles['card-price-group']}>
          <span className={styles['card-price-label']}>{isPackage ? `por ${room.nights} noches` : 'por noche'}</span>
          {room.old_price && <span className={styles['card-price-old']}>{formatPrice(room.old_price)}</span>}
          <span className={styles['card-price']}>{formatPrice(price)}</span>
        </div>
        {/* Sin onSelect no hay detalle todavía (S05) */}
        <button
          className={styles['btn-add']}
          onClick={() => onSelect?.(room)}
          disabled={!onSelect}
          title={onSelect ? undefined : 'Disponible pronto'}
        >
          Ver detalles <IconArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
