import { delay, loadDb, newId, saveDb } from './mockApi';
import { getSessionUserId } from './auth.service';
import { todayISO } from '../utils/dates';
import { validateRoomType } from '../utils/validation';
import { ADMIN_TRANSITIONS, REASON_MAX, REASON_MIN, transitionError } from '../utils/reservations';

const NO_PERMISSION = 'No tienes permisos para esta acción';
const OCCUPYING = ['confirmada', 'en_curso'];

// La autorización real vivirá en el backend; aquí se valida sesión y rol contra la BD
function requireAdmin(db) {
  const user = db.users.find((u) => u.id === getSessionUserId());
  if (!user || user.role !== 'admin') throw new Error(NO_PERMISSION);
  return user;
}

// Métricas de un huésped (única fuente: la usan la fila y el detalle).
// Regla: cuentan las reservas que NO están canceladas ni rechazadas.
// - stays = nº de esas reservas; nights = Σ nights; total_spent = Σ total.
// - last_stay = el check_in más reciente que sea <= hoy; next_stay = el check_in más cercano > hoy.
// - Las canceladas/rechazadas solo se cuentan aparte (cancelled_count), sin sumar importes.
function guestMetrics(reservations, today) {
  const counted = reservations.filter((r) => !['cancelada', 'rechazada'].includes(r.status));
  const past = counted.map((r) => r.check_in).filter((d) => d <= today).sort();
  const future = counted.map((r) => r.check_in).filter((d) => d > today).sort();
  return {
    stays: counted.length,
    nights: counted.reduce((n, r) => n + r.nights, 0),
    total_spent: counted.reduce((n, r) => n + r.total, 0),
    last_stay: past.length ? past[past.length - 1] : null,
    next_stay: future.length ? future[0] : null,
    cancelled_count: reservations.length - counted.length,
  };
}

// Nunca se expone `password`
function publicGuest(user, reservations, today) {
  const safe = { ...user };
  delete safe.password;
  return { ...safe, ...guestMetrics(reservations, today) };
}

const ROOM_STATUSES = ['disponible', 'ocupada', 'mantenimiento'];
const FLOOR_SIZE = 10;

// Número y piso libres: se llena el primer piso con hueco (101..110, 201..210…)
function nextFreeRoom(rooms) {
  const taken = new Set(rooms.map((r) => r.number));
  for (let floor = 1; ; floor++) {
    for (let i = 1; i <= FLOOR_SIZE; i++) {
      const number = String(floor * 100 + i);
      if (!taken.has(number)) return { number, floor };
    }
  }
}

// Habitaciones físicas de un tipo = su `units`. En la v1 el estado de la habitación física es
// informativo: no cambia la disponibilidad de reservas, que sigue calculándose con `units`.
// Valida antes de mutar: al reducir solo se quitan habitaciones 'disponible'.
function syncRooms(db, roomType) {
  const own = db.rooms.filter((r) => r.room_type_id === roomType.id);
  const diff = roomType.units - own.length;
  if (diff < 0) {
    const removable = own.filter((r) => r.status === 'disponible').sort((a, b) => b.number.localeCompare(a.number));
    if (removable.length < -diff) {
      const n = -diff;
      const k = removable.length;
      throw new Error(`No se pueden quitar ${n} ${n === 1 ? 'habitación' : 'habitaciones'}: solo ${k} ${k === 1 ? 'está disponible' : 'están disponibles'} (libera las ocupadas o en mantenimiento primero)`);
    }
    const drop = new Set(removable.slice(0, -diff).map((r) => r.id));
    db.rooms = db.rooms.filter((r) => !drop.has(r.id));
  }
  for (let i = 0; i < diff; i++) {
    const { number, floor } = nextFreeRoom(db.rooms);
    db.rooms.push({ id: `room_${number}`, number, floor, room_type_id: roomType.id, status: 'disponible' });
  }
}

// Solo campos permitidos, ya normalizados; en paquetes el precio es `price` (total), no por noche
function cleanRoomType(data, db) {
  const errors = validateRoomType(data);
  const [firstError] = Object.values(errors);
  if (firstError) throw new Error(firstError);
  const isPackage = data.category === 'paquete';
  const text = (v) => String(v ?? '').trim();
  const clean = {
    name: text(data.name),
    description: text(data.description),
    category: data.category,
    old_price: data.old_price === '' || data.old_price == null ? null : Number(data.old_price),
    capacity: Number(data.capacity),
    units: Number(data.units),
    size_m2: Number(data.size_m2),
    beds: text(data.beds),
    amenities: [...new Set(data.amenities ?? [])],
    images: data.images.map(text),
    tag: text(data.tag) || null,
  };
  if (isPackage) {
    clean.price = Number(data.price);
    clean.nights = Number(data.nights);
    clean.includes = data.includes.map(text).filter(Boolean);
    clean.room_type_id = data.room_type_id || null;
    if (clean.room_type_id && !db.roomTypes.some((r) => r.id === clean.room_type_id && r.category !== 'paquete')) {
      throw new Error('La habitación base del paquete no existe');
    }
  } else {
    clean.price_per_night = Number(data.price_per_night);
  }
  return clean;
}

const PACKAGE_ONLY = ['price', 'nights', 'includes', 'room_type_id'];

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

  // Incluye inactivos (borrado lógico); sin `category` devuelve todos
  async listRoomTypes({ category } = {}) {
    await delay();
    const db = loadDb();
    requireAdmin(db);
    return db.roomTypes.filter((r) => !category || r.category === category);
  },

  async createRoomType(data) {
    await delay();
    const db = loadDb();
    requireAdmin(db);
    const record = { id: newId('rt'), ...cleanRoomType(data, db), is_active: true, bookings_count: 0 };
    syncRooms(db, record);
    db.roomTypes.push(record);
    saveDb(db);
    return record;
  },

  async updateRoomType(id, data) {
    await delay();
    const db = loadDb();
    requireAdmin(db);
    const current = db.roomTypes.find((r) => r.id === id);
    if (!current) throw new Error('Habitación no encontrada');
    const next = { ...current, ...cleanRoomType(data, db) };
    if (next.category !== 'paquete') PACKAGE_ONLY.forEach((k) => delete next[k]);
    else delete next.price_per_night;
    syncRooms(db, next);
    Object.keys(current).forEach((k) => delete current[k]);
    Object.assign(current, next);
    saveDb(db);
    return current;
  },

  // Borrado lógico: nunca se elimina el registro (las reservas lo siguen referenciando)
  async setRoomTypeActive(id, active) {
    await delay();
    const db = loadDb();
    requireAdmin(db);
    const current = db.roomTypes.find((r) => r.id === id);
    if (!current) throw new Error('Habitación no encontrada');
    current.is_active = Boolean(active);
    saveDb(db);
    return current;
  },

  async listRooms() {
    await delay();
    const db = loadDb();
    requireAdmin(db);
    return db.rooms
      .map((r) => ({ ...r, room_type_name: db.roomTypes.find((t) => t.id === r.room_type_id)?.name ?? 'Tipo eliminado' }))
      .sort((a, b) => a.number.localeCompare(b.number));
  },

  async setRoomStatus(id, status) {
    await delay();
    const db = loadDb();
    requireAdmin(db);
    if (!ROOM_STATUSES.includes(status)) throw new Error('Estado de habitación no válido');
    const room = db.rooms.find((r) => r.id === id);
    if (!room) throw new Error('Habitación no encontrada');
    room.status = status;
    saveDb(db);
    return { ...room, room_type_name: db.roomTypes.find((t) => t.id === room.room_type_id)?.name ?? '' };
  },

  // Solo usuarios con rol huésped; más gasto primero y luego por nombre
  async listGuests() {
    await delay();
    const db = loadDb();
    requireAdmin(db);
    const today = todayISO();
    return db.users
      .filter((u) => u.role === 'huesped')
      .map((u) => publicGuest(u, db.reservations.filter((r) => r.user_id === u.id), today))
      .sort((a, b) => b.total_spent - a.total_spent || a.name.localeCompare(b.name));
  },

  // Detalle con historial completo (incluye canceladas/rechazadas), más reciente primero
  async getGuest(id) {
    await delay();
    const db = loadDb();
    requireAdmin(db);
    const user = db.users.find((u) => u.id === id && u.role === 'huesped');
    if (!user) throw new Error('Huésped no encontrado');
    const own = db.reservations.filter((r) => r.user_id === id);
    return {
      ...publicGuest(user, own, todayISO()),
      reservations: own
        .map((r) => withNames(db, r))
        .sort((a, b) => b.check_in.localeCompare(a.check_in) || b.created_at.localeCompare(a.created_at)),
    };
  },
};
