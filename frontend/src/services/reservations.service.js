import { delay, loadDb, saveDb, newId, newReservationCode } from './mockApi';
import { checkRoomAvailability } from './rooms.service';
import { stayQuote } from '../utils/pricing';
import { formatStayDate } from '../utils/dates';
import { validateStay } from '../utils/stay';
import { validateHolder } from '../utils/validation';
import { getSessionUserId } from './auth.service';

function requireUser(db) {
  const user = db.users.find((u) => u.id === getSessionUserId());
  if (!user) throw new Error('Inicia sesión para reservar');
  return user;
}

function checkHolder(h = {}) {
  const [firstError] = Object.values(validateHolder({ ...h, requests: h.special_requests }));
  if (firstError) throw new Error(firstError);
  return {
    name: String(h.name).trim(),
    document: String(h.document).trim(),
    phone: String(h.phone).trim(),
    email: String(h.email).trim(),
    requests: String(h.special_requests ?? '').trim(),
  };
}

function validatePayment(p = {}) {
  if (p.method === 'hotel') return { method: 'hotel', last4: null };
  if (p.method === 'card') {
    // Solo se acepta y conserva el final de la tarjeta; nunca el número completo
    if (!/^\d{4}$/.test(String(p.card_last4 ?? ''))) throw new Error('Revisa los datos de la tarjeta');
    return { method: 'card', last4: String(p.card_last4) };
  }
  throw new Error('Elige un método de pago');
}

const sortNewest = (a, b) => b.created_at.localeCompare(a.created_at);

export const reservationsService = {
  /**
   * items: [{ roomTypeId, checkIn, checkOut, guests, extras: [{ extraId, qty }] }]
   * Todo se valida antes de guardar (todo o nada). Los precios que mande la página se ignoran.
   */
  async createMany({ items, holder, payment } = {}) {
    await delay();
    const db = loadDb();
    const user = requireUser(db);
    if (!Array.isArray(items) || items.length === 0) throw new Error('Tu estadía está vacía');
    const h = checkHolder(holder);
    const pay = validatePayment(payment);

    // Las del mismo lote cuentan entre sí para no vender dos veces la última unidad
    const created = [];
    const now = new Date().toISOString();
    const codes = new Set(db.reservations.map((r) => r.code));
    for (const item of items) {
      const roomType = db.roomTypes.find((r) => r.id === item.roomTypeId && r.is_active);
      if (!roomType) throw new Error('Una de las habitaciones ya no está disponible');
      const stay = { checkIn: item.checkIn, checkOut: item.checkOut, guests: Number(item.guests) || 1 };
      const [firstError] = Object.values(validateStay(stay));
      if (firstError || !stay.checkIn || !stay.checkOut) {
        throw new Error(`${roomType.name}: ${firstError ?? 'Elige las fechas de llegada y salida'}`);
      }
      if (stay.guests > roomType.capacity) {
        throw new Error(`${roomType.name}: máximo ${roomType.capacity} huéspedes`);
      }
      const check = checkRoomAvailability(roomType, stay, [...db.reservations, ...created]);
      if (!check.available) {
        throw new Error(`Ya no hay disponibilidad de ${roomType.name} del ${formatStayDate(stay.checkIn)} al ${formatStayDate(check.end)}. Cambia las fechas o elige otra habitación.`);
      }

      const lines = (item.extras ?? []).map((x) => ({
        extra: db.extras.find((e) => e.id === x.extraId),
        qty: Math.floor(Number(x.qty)),
      }));
      if (lines.some((l) => !l.extra || !(l.qty > 0))) throw new Error('Uno de los servicios adicionales ya no está disponible');
      const quote = stayQuote({ roomType, ...stay, extras: lines });

      let code = newReservationCode();
      while (codes.has(code)) code = newReservationCode();
      codes.add(code);

      created.push({
        id: newId('res'),
        code,
        user_id: user.id,
        room_type_id: roomType.id,
        check_in: stay.checkIn,
        check_out: check.end,
        guests: stay.guests,
        extras: lines.map((l) => ({ extra_id: l.extra.id, qty: l.qty })),
        ...quote,
        status: pay.method === 'card' ? 'confirmada' : 'pendiente',
        payment_method: pay.method,
        ...(pay.method === 'card' ? { card_last4: pay.last4 } : {}),
        guest_name: h.name,
        guest_document: h.document,
        guest_phone: h.phone,
        guest_email: h.email,
        special_requests: h.requests,
        rejection_reason: null,
        created_at: now,
      });
    }

    db.reservations.push(...created);
    saveDb(db);
    return created;
  },

  async listMine() {
    await delay();
    const db = loadDb();
    const user = requireUser(db);
    return db.reservations.filter((r) => r.user_id === user.id).sort(sortNewest);
  },

  async get(id) {
    await delay();
    const db = loadDb();
    const user = requireUser(db);
    const found = db.reservations.find((r) => r.id === id && r.user_id === user.id);
    if (!found) throw new Error('Reserva no encontrada');
    return found;
  },
};
