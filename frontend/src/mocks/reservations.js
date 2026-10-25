// Reservas semilla generadas relativas a hoy, para que el panel y la disponibilidad
// tengan datos con sentido el día de la demo. Los totales salen de pricing.stayQuote.
import { addDays, todayISO } from '../utils/dates';
import { stayQuote } from '../utils/pricing';
import { roomTypes } from './roomTypes';
import { packages } from './packages';
import { extras } from './extras';

const GUEST = { user_id: 'u_huesped', guest_name: 'Camila Rojas', guest_phone: '3001234567', guest_email: 'huesped@aurastay.com' };

export function buildReservations(today = todayISO()) {
  const catalog = [...roomTypes, ...packages];
  // [code, room_type_id, offset llegada, offset salida, huéspedes, estado, pago, extras, campos extra]
  const rows = [
    ['AS-7F3K2Q', 'exc-penthouse', 3, 6, 2, 'confirmada', 'card', [['ex_transfer', 1]]],
    ['AS-K9M2XD', 'suite-jacuzzi', -2, 1, 2, 'en_curso', 'card', [['ex_breakfast', 1]]],
    ['AS-B4T8WN', 'hab-estandar', -1, 2, 2, 'en_curso', 'hotel', []],
    ['AS-H6P3RC', 'hab-superior', 1, 3, 2, 'pendiente', 'hotel', [], { special_requests: 'Llegamos tarde, después de las 10 p. m.' }],
    ['AS-D2V7JA', 'suite-junior', 1, 4, 2, 'confirmada', 'card', [['ex_spa', 1]]],
    ['AS-M5Y9LE', 'hab-familiar', 5, 8, 4, 'confirmada', 'card', []],
    ['AS-R8N4GZ', 'paq-escapada-romantica', 1, null, 2, 'confirmada', 'card', []],
    ['AS-T3C6QB', 'hab-doble', -9, -6, 3, 'finalizada', 'card', []],
    ['AS-W7S2FH', 'suite-ejecutiva', -7, -5, 1, 'finalizada', 'hotel', [['ex_late', 1]]],
    ['AS-Q4X8KP', 'paq-fin-semana-spa', -12, null, 2, 'finalizada', 'card', []],
    ['AS-L9E5UM', 'hab-balcon', 10, 12, 2, 'cancelada', 'card', []],
    ['AS-F2J6VT', 'exc-presidencial', 4, 6, 2, 'rechazada', 'hotel', [],
      { rejection_reason: 'La suite está reservada para un evento privado en esas fechas.' }],
    ['AS-C8A3ZD', 'exc-presidencial', 20, 23, 2, 'pendiente', 'hotel', []],
    ['AS-N6H4YS', 'hab-estandar', 3, 5, 1, 'confirmada', 'card', [['ex_breakfast', 1]]],
    // Llegadas de hoy: permiten demostrar aprobar y check-in sin esperar
    ['AS-Y5G8BR', 'hab-vista-ciudad', 0, 2, 2, 'confirmada', 'card', []],
    ['AS-E3U7PN', 'hab-superior', 0, 1, 2, 'pendiente', 'hotel', []],
  ];

  return rows.map(([code, roomTypeId, inOffset, outOffset, guests, status, payment, lines, extra = {}], i) => {
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
}
