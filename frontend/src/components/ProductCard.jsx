import { useState } from 'react';
import { IconHeart, IconPlus } from './Icons';
import { formatPrice } from '../utils/format';
import styles from '../pages/catalog/Catalog.module.css';

// Con pocas unidades se avisa para que el cliente no se lleve sorpresas en el checkout
const FEW_UNITS = 5;

export default function ProductCard({ product, inCart = 0, favorites, toggleFav, addToCart }) {
  const [imgError, setImgError] = useState(false);
  const isFav = favorites.includes(product.id);
  const soldOut = product.stock === 0;
  const maxedOut = !soldOut && inCart >= product.stock;
  const left = product.stock - inCart;

  return (
    <div className={[styles['product-card'], soldOut ? styles['sold-out'] : ''].join(' ')}>
      <div className={styles['card-image-area']}>
        {product.tag && (
          <span className={[styles['card-tag'], product.old_price ? styles['tag-deal'] : ''].join(' ')}>
            {product.tag}
          </span>
        )}
        {product.image_url && !imgError ? (
          <img
            src={product.image_url}
            alt={product.name}
            className={styles['product-img']}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles['product-img-placeholder']}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14M8 10l2-2 4 4 2-2"/></svg>
          </div>
        )}
        <button
          className={[styles['card-fav'], isFav ? styles.active : ''].join(' ')}
          onClick={() => toggleFav(product.id)}
          aria-label="Favorito"
        >
          <IconHeart size={14} filled={isFav} />
        </button>
      </div>
      <div className={styles['card-body']}>
        <p className={styles['card-origin']}>{product.origin}</p>
        <p className={styles['card-name']}>{product.name}</p>
        <p className={styles['card-unit']}>{product.unit}</p>
        {soldOut ? (
          <p className={[styles['card-stock'], styles['stock-out']].join(' ')}>Agotado por hoy</p>
        ) : left <= FEW_UNITS && (
          <p className={styles['card-stock']}>
            {left > 0 ? `¡Quedan ${left}${inCart ? ' más' : ''}!` : 'Ya tienes todas las unidades'}
          </p>
        )}
      </div>
      <div className={styles['card-footer']}>
        <div className={styles['card-price-group']}>
          <span className={styles['card-price-label']}>Precio</span>
          {product.old_price && <span className={styles['card-price-old']}>{formatPrice(product.old_price)}</span>}
          <span className={styles['card-price']}>{formatPrice(product.price)}</span>
        </div>
        <button
          className={styles['btn-add']}
          onClick={() => addToCart(product)}
          disabled={soldOut || maxedOut}
          title={maxedOut ? 'No hay más unidades disponibles' : undefined}
        >
          {soldOut ? 'Agotado' : inCart > 0 ? <>En carrito · {inCart}</> : <>Agregar <IconPlus size={13} /></>}
        </button>
      </div>
    </div>
  );
}
