import { delay } from './mockApi';
import { readSession } from './auth.service';

// Favoritos por usuario en este navegador; en la v2 vivirán en el backend (GET/POST /favorites)
const storageKey = (userId) => `aura_stay_favorites_${userId}`;

function readIds(userId) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) || '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeIds(userId, ids) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(ids));
  } catch {
    // Sin almacenamiento los favoritos solo duran mientras la página esté abierta
  }
}

export const favoritesService = {
  // Sin sesión no hay favoritos guardados
  async list() {
    await delay(80, 160);
    const userId = readSession();
    return userId ? readIds(userId) : [];
  },

  // Agrega o quita un tipo de habitación; devuelve la lista actualizada
  async toggle(roomTypeId) {
    await delay(80, 160);
    const userId = readSession();
    if (!userId) throw new Error('Inicia sesión para guardar tus favoritos');
    const ids = readIds(userId);
    const next = ids.includes(roomTypeId) ? ids.filter((id) => id !== roomTypeId) : [...ids, roomTypeId];
    writeIds(userId, next);
    return next;
  },
};
