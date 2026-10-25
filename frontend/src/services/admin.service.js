import { delay, loadDb, saveDb } from './mockApi';
import { getSessionUserId } from './auth.service';
import { todayISO } from '../utils/dates';
import { ADMIN_TRANSITIONS, REASON_MAX, REASON_MIN, transitionError } from '../utils/reservations';

const NO_PERMISSION = 'No tienes permisos para esta acción';
const OCCUPYING = ['confirmada', 'en_curso'];

// La autorización real vivirá en el backend; aquí se valida sesión y rol contra la BD
function requireAdmin(db) {
  const user = db.users.find((u) => u.id === getSessionUserId());
  if (!user || user.role !== 'admin') throw new Error(NO_PERMISSION);
  return user;
}

function withNames(db, res) {
  const rt = db.roomTypes.find((r) => r.id === res.room_type_id);
  const guest = db.users.find((u) => u.id === res.user_id);
  return { ...res, room_name: rt?.name ?? 'Habitación', guest_display_name: res.guest_name || guest?.name || 'Huésped' };
}

// Aplica una transición validada con la máquina de estados compartida (no toca importes)
function transition(id, action, patch = () => ({})) {
  const db = loadDb();
  requireAdmin(db);
  const res = db.reservations.find((r) => r.id === id);
  const error = transitionError(res, action, todayISO());
  if (error) throw new Error(error);
  Object.assign(res, patch(), { status: ADMIN_TRANSITIONS[action].to });
  saveDb(db);
  return withNames(db, res);
}

export const adminService = {
  // Fórmulas (hoy = todayISO()):
  // - Ocupación = unidades ocupadas hoy / unidades de los room types activos (paquetes incluidos).
  //   Ocupada hoy = reserva confirmada o en curso con check_in <= hoy < check_out (una confirmada que
  //   llega hoy ya cuenta como ocupada, coherente con la disponibilidad) y de un room type activo.
  // - Ingresos del mes = suma de `total` de reservas no canceladas/rechazadas con check_in en el mes actual
  //   (los ingresos se imputan al mes del check_in).
  // - ADR = suma de `subtotal` (solo alojamiento) / suma de `nights` de esas mismas reservas; 0 si no hay.
  // - Llegadas = pendiente/confirmada con check_in = hoy; salidas = en curso con check_out = hoy.
  async stats() {
    await delay();
    const db = loadDb();
    requireAdmin(db);
    const today = todayISO();
    const month = today.slice(0, 7);
    const activeTypes = db.roomTypes.filter((r) => r.is_active !== false);
    const activeIds = new Set(activeTypes.map((r) => r.id));
    const totalUnits = activeTypes.reduce((n, r) => n + (r.units || 0), 0);
    // Solo room types activos, para que el porcentaje no pase de 100 %
    const occupied = db.reservations.filter((r) => activeIds.has(r.room_type_id)
      && OCCUPYING.includes(r.status) && r.check_in <= today && today < r.check_out).length;
    const billable = db.reservations.filter((r) => !['cancelada', 'rechazada'].includes(r.status) && r.check_in.startsWith(month));
    const revenue = billable.reduce((n, r) => n + r.total, 0);
    const soldNights = billable.reduce((n, r) => n + r.nights, 0);
    return {
      occupied_units: occupied,
      total_units: totalUnits,
      occupancy_pct: totalUnits ? Math.round((occupied / totalUnits) * 100) : 0,
      month_revenue: revenue,
      month_reservations: billable.length,
      adr: soldNights ? Math.round(billable.reduce((n, r) => n + r.subtotal, 0) / soldNights) : 0,
      arrivals_today: db.reservations.filter((r) => ['pendiente', 'confirmada'].includes(r.status) && r.check_in === today).length,
      departures_today: db.reservations.filter((r) => r.status === 'en_curso' && r.check_out === today).length,
    };
  },

  // Sin `status` devuelve todas; más recientes primero
  async listReservations({ status } = {}) {
    await delay();
    const db = loadDb();
    requireAdmin(db);
    return db.reservations
      .filter((r) => !status || r.status === status)
      .map((r) => withNames(db, r))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async approve(id) {
    await delay();
    return transition(id, 'approve');
  },

  async reject(id, reason) {
    await delay();
    const clean = String(reason ?? '').trim();
    if (clean.length < REASON_MIN || clean.length > REASON_MAX) {
      throw new Error(`El motivo debe tener entre ${REASON_MIN} y ${REASON_MAX} caracteres`);
    }
    return transition(id, 'reject', () => ({ rejection_reason: clean }));
  },

  async checkIn(id) {
    await delay();
    return transition(id, 'checkIn');
  },

  async checkOut(id) {
    await delay();
    return transition(id, 'checkOut');
  },

  // Heredado: S12 lo rehace
  async getClients() {
    await delay();
    return [];
  },
};
