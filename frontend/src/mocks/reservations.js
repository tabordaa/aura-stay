// Reservas semilla generadas relativas a hoy, para que el panel y la disponibilidad
// tengan datos con sentido el día de la demo. Los totales salen de pricing.stayQuote.
import { addDays, parseISODate, todayISO } from '../utils/dates';
import { stayQuote } from '../utils/pricing';
import { roomTypes } from './roomTypes';
import { packages } from './packages';
import { extras } from './extras';
import { users } from './users';

const GUEST = { user_id: 'u_huesped', guest_name: 'Camila Rojas', guest_phone: '3001234567', guest_email: 'huesped@aurastay.com', guest_document: '1020304050' };

// Otros huéspedes semilla (coinciden con mocks/users.js)
const OTHERS = {
  andres: { user_id: 'u_andres', guest_name: 'Andrés Felipe Gómez', guest_phone: '3112345678', guest_email: 'andres.gomez@example.com', guest_document: '1017654321' },
  laura: { user_id: 'u_laura', guest_name: 'Laura Valentina Ortiz', guest_phone: '3205558899', guest_email: 'laura.ortiz@example.com', guest_document: '1098765432' },
  juan: { user_id: 'u_juan', guest_name: 'Juan David Martínez', guest_phone: '3153217788', guest_email: 'juan.martinez@example.com', guest_document: '79456123' },
};

// Generador determinista de reservas demo: complementa las filas base dentro de [hoy - 3, hoy + 21]
// para mostrar una curva realista de ocupación (~45 % hoy, picos los viernes/sábados y valles entre
// semana, bajando del día 15 al 21) y variedad en el calendario de disponibilidad sin superar `units`.
const DEMO_SEED = 20261120;
const MIN_OFFSET = -3;
const MAX_OFFSET = 21;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para evitar confusiones
const ACTIVE_STATUSES = ['pendiente', 'confirmada', 'en_curso'];
const OCCUPYING_STATUSES = ['confirmada', 'en_curso'];
const LIMITED_EXCLUSIVES = new Set(['exc-penthouse', 'exc-presidencial']);
// Mantiene libre la última unidad en curso hoy para conservar las habitaciones en mantenimiento
const MAINTENANCE_TYPES = new Set(['hab-superior', 'suite-junior']);

// Ocupación objetivo (unidades confirmadas + en curso sobre 57) por día de la semana (0=dom..6=sáb)
const BASE_TARGET_BY_DOW = [33, 24, 21, 24, 31, 44, 47];
const WEEK1_DELTA_BY_DOW = [0, 0, 0, -1, 0, 0, -2];
const WEEK2_DELTA_BY_DOW = [1, 1, 1, 2, 1, 1, 1];
const TAIL_DECAY = [0.74, 0.62, 0.50, 0.38, 0.28, 0.18]; // días 15..20

const DEMO_GUEST_IDS = [
  'u_mateo', 'u_valentina', 'u_santiago', 'u_daniela',
  'u_sebastian', 'u_paula', 'u_nicolas', 'u_mariana',
];

const DEMO_GUESTS = DEMO_GUEST_IDS
  .map((id) => users.find((u) => u.id === id))
  .filter(Boolean)
  .map((u) => ({
    user_id: u.id,
    guest_name: u.name,
    guest_phone: u.phone,
    guest_email: u.email,
    guest_document: u.document,
  }));

const CARD_LAST4_POOL = ['4242', '8819', '3054', '6721', '1948', '5503', '9182', '7460'];
const CREATED_TIMES = ['08:45:00', '10:15:00', '11:30:00', '14:20:00', '16:05:00', '18:40:00', '20:10:00'];
const EXTRA_PRESETS = [
  [],
  [],
  [],
  [],
  [['ex_breakfast', 1]],
  [['ex_breakfast', 1]],
  [['ex_spa', 1]],
  [['ex_transfer', 1]],
  [['ex_late', 1]],
  [['ex_breakfast', 1], ['ex_transfer', 1]],
  [['ex_spa', 1], ['ex_late', 1]],
];
const PACKAGE_EXTRA_PRESETS = [
  [],
  [],
  [],
  [['ex_transfer', 1]],
  [['ex_late', 1]],
];

// PRNG determinista (mulberry32) para no depender de Math.random
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nextCode(rand, usedCodes) {
  let code = '';
  do {
    let chars = '';
    for (let i = 0; i < 6; i += 1) {
      chars += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
    }
    code = `AS-${chars}`;
  } while (usedCodes.has(code));
  usedCodes.add(code);
  return code;
}

function pickGuests(roomType, rand) {
  if (roomType.capacity <= 1) return 1;
  if (roomType.capacity === 2) return rand() < 0.78 ? 2 : 1;
  if (roomType.capacity === 3) return rand() < 0.55 ? 2 : rand() < 0.8 ? 3 : 1;
  return 2 + Math.floor(rand() * (roomType.capacity - 1));
}

function buildOccupancyTargets(todayDow) {
  const targets = [];
  for (let d = 0; d <= 20; d += 1) {
    const dow = (todayDow + d) % 7;
    if (d === 0) {
      targets.push(26); // ~46 % hoy (objetivo ~45 %)
    } else if (d <= 6) {
      targets.push(BASE_TARGET_BY_DOW[dow] + WEEK1_DELTA_BY_DOW[dow]);
    } else if (d <= 13) {
      targets.push(BASE_TARGET_BY_DOW[dow] + WEEK2_DELTA_BY_DOW[dow]);
    } else if (d === 14) {
      targets.push(BASE_TARGET_BY_DOW[dow] - 1);
    } else {
      targets.push(Math.round(BASE_TARGET_BY_DOW[dow] * TAIL_DECAY[d - 15]));
    }
  }
  return targets;
}

function generateDemoReservations(today, catalog, seedReservations) {
  const rand = mulberry32(DEMO_SEED);
  const byId = Object.fromEntries(catalog.map((r) => [r.id, r]));
  const usedCodes = new Set(seedReservations.map((r) => r.code));
  const todayDate = parseISODate(today);
  const todayDow = todayDate.getDay();
  const nextFri = (5 - todayDow + 7) % 7;
  const nextSat = nextFri + 1;
  const secondFri = nextFri + 7;
  const secondSat = nextSat + 7;
  const targetByDay = buildOccupancyTargets(todayDow);

  // Conteo de unidades ocupadas por tipo y noche (incluye todas las activas existentes)
  const activeUsage = Object.fromEntries(catalog.map((r) => [r.id, {}]));
  const occupiedByDay = {};
  const enCursoToday = {};

  for (const res of seedReservations) {
    if (!ACTIVE_STATUSES.includes(res.status)) continue;
    const inOff = Math.round((parseISODate(res.check_in) - todayDate) / MS_PER_DAY);
    const outOff = Math.round((parseISODate(res.check_out) - todayDate) / MS_PER_DAY);
    for (let n = inOff; n < outOff; n += 1) {
      activeUsage[res.room_type_id][n] = (activeUsage[res.room_type_id][n] || 0) + 1;
      if (OCCUPYING_STATUSES.includes(res.status)) {
        occupiedByDay[n] = (occupiedByDay[n] || 0) + 1;
      }
    }
    if (res.status === 'en_curso' && inOff <= 0 && 0 < outOff) {
      enCursoToday[res.room_type_id] = (enCursoToday[res.room_type_id] || 0) + 1;
    }
  }

  const getUsed = (typeId, night) => activeUsage[typeId]?.[night] || 0;
  const getOccupied = (night) => occupiedByDay[night] || 0;
  const generated = [];
  let guestCursor = 0;

  function canBook(roomType, inOffset, outOffset, { enforceTarget = true, allowFullStandard = false } = {}) {
    const endOffset = roomType.category === 'paquete' ? inOffset + roomType.nights : outOffset;
    if (inOffset < MIN_OFFSET || endOffset > MAX_OFFSET || inOffset >= endOffset) return false;
    for (let n = inOffset; n < endOffset; n += 1) {
      const used = getUsed(roomType.id, n);
      if (used >= roomType.units) return false;
      // Evita agotar hab-estandar todos los días; solo puede llenarse en el pico del segundo sábado
      if (!allowFullStandard && roomType.id === 'hab-estandar' && n !== secondSat && used >= roomType.units - 1) {
        return false;
      }
      if (enforceTarget && n >= 0 && n <= 20 && getOccupied(n) >= targetByDay[n]) return false;
    }
    if (inOffset <= 0 && 0 < endOffset && MAINTENANCE_TYPES.has(roomType.id)) {
      if ((enCursoToday[roomType.id] || 0) >= roomType.units - 1) return false;
    }
    return true;
  }

  function addBooking(roomType, inOffset, outOffset, forcedStatus = null) {
    const endOffset = roomType.category === 'paquete' ? inOffset + roomType.nights : outOffset;
    const status = forcedStatus
      ?? (endOffset <= 0 ? 'finalizada' : inOffset <= 0 && 0 < endOffset ? 'en_curso' : 'confirmada');

    if (ACTIVE_STATUSES.includes(status)) {
      for (let n = inOffset; n < endOffset; n += 1) {
        activeUsage[roomType.id][n] = getUsed(roomType.id, n) + 1;
        if (OCCUPYING_STATUSES.includes(status)) {
          occupiedByDay[n] = getOccupied(n) + 1;
        }
      }
      if (status === 'en_curso' && inOffset <= 0 && 0 < endOffset) {
        enCursoToday[roomType.id] = (enCursoToday[roomType.id] || 0) + 1;
      }
    }

    const guest = DEMO_GUESTS[(guestCursor + Math.floor(rand() * 2)) % DEMO_GUESTS.length];
    guestCursor += 1;

    const checkIn = addDays(today, inOffset);
    const checkOut = roomType.category === 'paquete' ? addDays(checkIn, roomType.nights) : addDays(today, endOffset);
    const guests = pickGuests(roomType, rand);
    const presetPool = roomType.category === 'paquete' ? PACKAGE_EXTRA_PRESETS : EXTRA_PRESETS;
    const lines = presetPool[Math.floor(rand() * presetPool.length)];
    const resolved = lines.map(([id, qty]) => ({ extra: extras.find((e) => e.id === id), qty }));
    const quote = stayQuote({ roomType, checkIn, checkOut, guests, extras: resolved });
    const payment = status === 'pendiente' ? 'hotel' : rand() < 0.72 ? 'card' : 'hotel';
    const cardLast4 = payment === 'card' ? CARD_LAST4_POOL[Math.floor(rand() * CARD_LAST4_POOL.length)] : null;
    const daysBefore = 4 + Math.floor(rand() * 7);
    const createdTime = CREATED_TIMES[Math.floor(rand() * CREATED_TIMES.length)];

    generated.push({
      id: `res_seed_${seedReservations.length + generated.length + 1}`,
      code: nextCode(rand, usedCodes),
      ...guest,
      room_type_id: roomType.id,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      extras: lines.map(([extra_id, qty]) => ({ extra_id, qty })),
      ...quote,
      status,
      payment_method: payment,
      card_last4: cardLast4,
      special_requests: '',
      rejection_reason: null,
      created_at: `${addDays(today, Math.min(inOffset, 0) - daysBefore)}T${createdTime}`,
    });
  }

  // 1. Fin de semana más próximo: agotar suite-jacuzzi y hab-vista-ciudad (viernes y sábado)
  for (const typeId of ['suite-jacuzzi', 'hab-vista-ciudad']) {
    const rt = byId[typeId];
    while (getUsed(typeId, nextFri) < rt.units && getUsed(typeId, nextSat) < rt.units) {
      const start = nextFri === 0 && getUsed(typeId, -1) === 0 ? -1 : nextFri;
      if (canBook(rt, start, nextSat + 1)) {
        addBooking(rt, start, nextSat + 1);
      } else if (canBook(rt, nextFri, nextSat + 1)) {
        addBooking(rt, nextFri, nextSat + 1);
      } else {
        break;
      }
    }
    while (getUsed(typeId, nextFri) < rt.units && canBook(rt, nextFri, nextFri + 1)) {
      addBooking(rt, nextFri, nextFri + 1);
    }
    while (getUsed(typeId, nextSat) < rt.units) {
      if (canBook(rt, nextSat, nextSat + 2)) {
        addBooking(rt, nextSat, nextSat + 2);
      } else if (canBook(rt, nextSat, nextSat + 1)) {
        addBooking(rt, nextSat, nextSat + 1);
      } else {
        break;
      }
    }
  }

  // 2. Segundo fin de semana y exclusivas (se llenan algunos días, pero no todos)
  for (const typeId of ['suite-jacuzzi', 'hab-vista-ciudad']) {
    const rt = byId[typeId];
    while (canBook(rt, secondFri, secondSat + 1)) {
      addBooking(rt, secondFri, secondSat + 1);
    }
  }
  if (canBook(byId['exc-penthouse'], secondFri, secondSat + 1)) {
    addBooking(byId['exc-penthouse'], secondFri, secondSat + 1);
  }
  if (canBook(byId['exc-presidencial'], nextSat, nextSat + 2)) {
    addBooking(byId['exc-presidencial'], nextSat, nextSat + 2);
  }
  if (canBook(byId['exc-presidencial'], secondFri, secondSat + 1)) {
    addBooking(byId['exc-presidencial'], secondFri, secondSat + 1);
  }

  // Paquetes de fin de semana para dar variedad en el calendario y sostener los picos
  for (const pkgId of ['paq-escapada-romantica', 'paq-fin-semana-spa', 'paq-fin-semana-spa', 'paq-ejecutivo']) {
    const rt = byId[pkgId];
    if (canBook(rt, nextFri, nextFri + rt.nights)) addBooking(rt, nextFri, nextFri + rt.nights);
  }
  for (const pkgId of ['paq-escapada-romantica', 'paq-fin-semana-spa', 'paq-fin-semana-spa', 'paq-luna-de-miel', 'paq-familia']) {
    const rt = byId[pkgId];
    if (canBook(rt, secondFri, secondFri + rt.nights)) addBooking(rt, secondFri, secondFri + rt.nights);
  }

  // 3. Dos reservas pendientes futuras (se descuentan del cupo activo sin contar como ocupadas)
  for (const [typeId, inOff, outOff] of [['suite-ejecutiva', 4, 6], ['hab-balcon', 10, 12]]) {
    const rt = byId[typeId];
    if (canBook(rt, inOff, outOff, { enforceTarget: false })) {
      addBooking(rt, inOff, outOff, 'pendiente');
    }
  }

  // 4. Estadías pasadas recientes (salida <= hoy) para dar historial a los nuevos huéspedes
  for (const [typeId, inOff, outOff] of [
    ['hab-doble', -3, -1],
    ['suite-ejecutiva', -3, 0],
    ['paq-ejecutivo', -2, 0],
    ['hab-balcon', -2, 0],
  ]) {
    addBooking(byId[typeId], inOff, outOff, 'finalizada');
  }

  // 5. Relleno diario hasta la curva objetivo repartiendo entre todos los tipos y paquetes
  const pool = catalog.filter((rt) => !LIMITED_EXCLUSIVES.has(rt.id));
  const nonPackagePool = pool.filter((rt) => rt.category !== 'paquete');

  for (let d = 0; d <= 20; d += 1) {
    while (getOccupied(d) < targetByDay[d]) {
      const ranked = pool
        .map((rt) => ({ rt, score: getUsed(rt.id, d) / rt.units + rand() * 0.35 }))
        .sort((a, b) => a.score - b.score)
        .map((entry) => entry.rt);

      let placed = false;
      const roll = rand();
      const lengthOrder = roll < 0.42 ? [2, 3, 1] : roll < 0.72 ? [3, 2, 1] : [1, 2, 3];

      for (const rt of ranked) {
        if (rt.category === 'paquete') {
          const start = d === 0 && rand() < 0.4 ? -1 : d;
          const end = start + rt.nights;
          if (end > d && canBook(rt, start, end)) {
            addBooking(rt, start, end);
            placed = true;
            break;
          }
          if (start !== d && canBook(rt, d, d + rt.nights)) {
            addBooking(rt, d, d + rt.nights);
            placed = true;
            break;
          }
          continue;
        }

        if (d === 0) {
          const startChoices = rand() < 0.5 ? [-1, -2, 0] : [-2, -1, 0];
          const endChoices = rand() < 0.55 ? [2, 1, 3] : [1, 2, 3];
          for (const start of startChoices) {
            for (const end of endChoices) {
              if (canBook(rt, start, end)) {
                addBooking(rt, start, end);
                placed = true;
                break;
              }
            }
            if (placed) break;
          }
          if (placed) break;
        } else {
          for (const len of lengthOrder) {
            if (canBook(rt, d, d + len)) {
              addBooking(rt, d, d + len);
              placed = true;
              break;
            }
          }
          if (placed) break;
        }
      }

      if (placed) continue;

      // Respaldo de 1 noche para cerrar días previos a una caída de ocupación
      const fallback = nonPackagePool
        .map((rt) => ({ rt, score: getUsed(rt.id, d) / rt.units + rand() * 0.2 }))
        .sort((a, b) => a.score - b.score)
        .map((entry) => entry.rt);

      for (const allowFullStandard of [false, true]) {
        for (const rt of fallback) {
          const start = d === 0 && canBook(rt, -1, 1, { allowFullStandard }) ? -1 : d;
          if (canBook(rt, start, d + 1, { allowFullStandard })) {
            addBooking(rt, start, d + 1);
            placed = true;
            break;
          }
        }
        if (placed) break;
      }

      if (!placed) break;
    }
  }

  return generated;
}

export function buildReservations(today = todayISO()) {
  const catalog = [...roomTypes, ...packages];
  // [code, room_type_id, offset llegada, offset salida, huéspedes, estado, pago, extras, campos extra]
  const rows = [
    ['AS-7F3K2Q', 'exc-penthouse', 3, 6, 2, 'confirmada', 'card', [['ex_transfer', 1]]],
    ['AS-K9M2XD', 'suite-jacuzzi', -2, 1, 2, 'en_curso', 'card', [['ex_breakfast', 1]]],
    ['AS-B4T8WN', 'hab-estandar', -1, 2, 2, 'en_curso', 'hotel', []],
    ['AS-H6P3RC', 'hab-superior', 1, 3, 2, 'pendiente', 'hotel', [], { special_requests: 'Llegamos tarde, después de las 10 p. m.' }],
    ['AS-D2V7JA', 'suite-junior', 1, 4, 2, 'confirmada', 'card', [['ex_spa', 1]]],
    ['AS-M5Y9LE', 'hab-familiar', 5, 8, 4, 'confirmada', 'card', [], OTHERS.andres],
    ['AS-R8N4GZ', 'paq-escapada-romantica', 1, null, 2, 'confirmada', 'card', []],
    ['AS-T3C6QB', 'hab-doble', -9, -6, 3, 'finalizada', 'card', []],
    ['AS-W7S2FH', 'suite-ejecutiva', -7, -5, 1, 'finalizada', 'hotel', [['ex_late', 1]], OTHERS.laura],
    ['AS-Q4X8KP', 'paq-fin-semana-spa', -12, null, 2, 'finalizada', 'card', [], OTHERS.juan],
    ['AS-L9E5UM', 'hab-balcon', 10, 12, 2, 'cancelada', 'card', []],
    ['AS-F2J6VT', 'exc-presidencial', 4, 6, 2, 'rechazada', 'hotel', [],
      { rejection_reason: 'La suite está reservada para un evento privado en esas fechas.' }],
    ['AS-C8A3ZD', 'exc-presidencial', 20, 23, 2, 'pendiente', 'hotel', []],
    ['AS-N6H4YS', 'hab-estandar', 3, 5, 1, 'confirmada', 'card', [['ex_breakfast', 1]], OTHERS.laura],
    // Llegadas de hoy: permiten demostrar aprobar y check-in sin esperar
    ['AS-Y5G8BR', 'hab-vista-ciudad', 0, 2, 2, 'confirmada', 'card', []],
    ['AS-E3U7PN', 'hab-superior', 0, 1, 2, 'pendiente', 'hotel', []],
    // Historial de otros huéspedes (estadía pasada y cancelación)
    ['AS-P7D4KW', 'hab-doble', -10, -7, 2, 'finalizada', 'card', [], OTHERS.andres],
    ['AS-J2B9XC', 'hab-balcon', 10, 12, 2, 'cancelada', 'card', [], OTHERS.juan],
  ];

  const seedReservations = rows.map(([code, roomTypeId, inOffset, outOffset, guests, status, payment, lines, extra = {}], i) => {
    const roomType = catalog.find((r) => r.id === roomTypeId);
    const checkIn = addDays(today, inOffset);
    // Los paquetes duran siempre sus propias noches
    const checkOut = roomType.category === 'paquete' ? addDays(checkIn, roomType.nights) : addDays(today, outOffset);
    const resolved = lines.map(([id, qty]) => ({ extra: extras.find((e) => e.id === id), qty }));
    const quote = stayQuote({ roomType, checkIn, checkOut, guests, extras: resolved });
    return {
      id: `res_seed_${i + 1}`,
      code,
      ...GUEST,
      room_type_id: roomTypeId,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      extras: lines.map(([extra_id, qty]) => ({ extra_id, qty })),
      ...quote,
      status,
      payment_method: payment,
      card_last4: payment === 'card' ? '4242' : null,
      special_requests: '',
      rejection_reason: null,
      created_at: `${addDays(today, Math.min(inOffset, 0) - 3)}T10:00:00`,
      ...extra,
    };
  });

  return [...seedReservations, ...generateDemoReservations(today, catalog, seedReservations)];
}
