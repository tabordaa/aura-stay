import { useEffect, useMemo, useState } from 'react';

// Cada usuario tiene su propio carrito en este navegador; se borra al cerrar sesión
export const cartStorageKey = (userId) => `aura_cart_${userId}`;

function readStoredCart(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(stored) ? stored.filter(e => Number.isInteger(e?.id) && e.qty > 0) : [];
  } catch {
    return [];
  }
}

/**
 * Carrito persistente. Solo se guardan { id, qty }: el nombre, el precio y el stock salen siempre del catálogo
 * actual, así un precio viejo guardado en el navegador nunca se muestra (el backend igual cobra el de la BD).
 */
export function useCart(userId, products) {
  const key = cartStorageKey(userId);
  const [entries, setEntries] = useState(() => readStoredCart(key));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(entries));
    } catch {
      // Sin almacenamiento (modo privado): el carrito funciona igual mientras la página esté abierta
    }
  }, [key, entries]);

  // Productos que ya no están en el catálogo o se agotaron desaparecen; la cantidad nunca supera el stock
  const cart = useMemo(() => {
    const byId = new Map(products.map(p => [p.id, p]));
    return entries
      .map(e => {
        const product = byId.get(e.id);
        return product && product.stock > 0 ? { ...product, qty: Math.min(e.qty, product.stock) } : null;
      })
      .filter(Boolean);
  }, [entries, products]);

  const stockOf = (id) => products.find(p => p.id === id)?.stock ?? 0;
  const qtyOf = (id) => cart.find(item => item.id === id)?.qty ?? 0;

  // Devuelve false si ya no quedan unidades para agregar
  const addToCart = (product) => {
    if (qtyOf(product.id) >= product.stock) return false;
    setEntries(list => (list.some(e => e.id === product.id)
      ? list.map(e => (e.id === product.id ? { ...e, qty: Math.min(e.qty + 1, product.stock) } : e))
      : [...list, { id: product.id, qty: 1 }]));
    return true;
  };

  const changeQty = (id, delta) => {
    const max = stockOf(id);
    setEntries(list => list
      .map(e => (e.id === id ? { ...e, qty: Math.min(Math.min(e.qty, max) + delta, max) } : e))
      .filter(e => e.qty > 0));
  };

  const removeFromCart = (id) => setEntries(list => list.filter(e => e.id !== id));
  const clearCart = () => setEntries([]);

  return { cart, qtyOf, addToCart, changeQty, removeFromCart, clearCart };
}
