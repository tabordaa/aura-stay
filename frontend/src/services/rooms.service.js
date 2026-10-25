import { delay, loadDb } from './mockApi';

// Precio mostrado: por noche en habitaciones, total de la estadía en paquetes
export const displayPrice = (r) => (r.category === 'paquete' ? r.price : r.price_per_night);

// Sin tildes ni mayúsculas: "panoramica" encuentra "Panorámica"
const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const SORTERS = {
  recommended: null, // se conserva el orden del mock
  price_asc: (a, b) => displayPrice(a) - displayPrice(b),
  price_desc: (a, b) => displayPrice(b) - displayPrice(a),
  popular: (a, b) => (b.bookings_count || 0) - (a.bookings_count || 0),
};

export const roomsService = {
  // Filtros combinables; solo devuelve tipos activos
  async list({ category, q, minPrice, maxPrice, guests, sort = 'recommended' } = {}) {
    await delay();
    const term = normalize(String(q ?? '').trim());
    const min = Number(minPrice);
    const max = Number(maxPrice);
    const people = Number(guests);
    const result = loadDb().roomTypes.filter((r) => {
      if (!r.is_active) return false;
      if (category && r.category !== category) return false;
      if (term && !normalize(`${r.name} ${r.description}`).includes(term)) return false;
      if (minPrice !== '' && minPrice != null && min > 0 && displayPrice(r) < min) return false;
      if (maxPrice !== '' && maxPrice != null && max > 0 && displayPrice(r) > max) return false;
      if (guests !== '' && guests != null && people > 0 && r.capacity < people) return false;
      return true;
    });
    const sorter = SORTERS[sort];
    return sorter ? result.sort(sorter) : result;
  },

  async get(id) {
    await delay();
    const room = loadDb().roomTypes.find((r) => r.id === id && r.is_active);
    if (!room) throw new Error('Habitación no encontrada');
    return room;
  },
};
